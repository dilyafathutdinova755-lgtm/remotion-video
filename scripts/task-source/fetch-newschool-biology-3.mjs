#!/usr/bin/env node

import { chromium } from 'playwright';

import {
  findDuplicate,
  parseHistory,
  HISTORY_PATH,
} from './biology-task-history.mjs';

import {
  createGithubHistoryStore,
  reservationIdForRun,
  HISTORY_BRANCH,
} from './biology-github-history.mjs';

import {
  readFileSync,
} from 'node:fs';

const LISTING_URL =
  'https://thenewschool.ru/trainer/biology/6?enableSolvedTasks=false&randomTask=true&taskNumbers=112';

const TASK_URL =
  'https://thenewschool.ru/trainer/task/';

const INSTRUCTION =
  '';

const DRY_RUN =
  process.argv.includes('--dry-run');

function stop(code, message) {
  const error =
    new Error(`${code}: ${message}`);

  error.code = code;

  throw error;
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function settle(page, url) {
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  });

  await page
    .waitForLoadState(
      'networkidle',
      {
        timeout: 15_000,
      },
    )
    .catch(() => {});

  await page.waitForTimeout(1500);
}

/*
 * На странице тренажёра ищем ID заданий,
 * возле которых реально написано «№3 по КИМ».
 *
 * Не доверяем просто номеру task ID.
 */
async function findTask3Ids(page) {
  const result =
    await page.evaluate(() => {
      const ids =
        new Set();

      /*
       * Сначала пробуем ссылки на отдельные задания.
       */
      for (
        const a of document.querySelectorAll(
          'a[href*="/trainer/task/"]',
        )
      ) {
        const href =
          a.getAttribute('href') || '';

        const match =
          href.match(
            /\/trainer\/task\/(\d+)/,
          );

        if (!match) {
          continue;
        }

        /*
         * Смотрим достаточно широкий контейнер вокруг ссылки.
         */
        const container =
          a.closest(
            'article, section, li, div',
          ) || a.parentElement;

        const text =
          String(
            container?.innerText || '',
          );

        if (
          /№\s*3\s+по\s+КИМ/i
            .test(text)
        ) {
          ids.add(match[1]);
        }
      }

      /*
       * Резерв: ищем по plain-text страницы.
       */
      const bodyText =
        String(
          document.body?.innerText || '',
        );

      const regex =
        /Задание\s*#(\d+)[\s\S]{0,120}?№\s*3\s+по\s+КИМ/gi;

      for (
        const match of bodyText.matchAll(
          regex,
        )
      ) {
        ids.add(match[1]);
      }

      return [...ids];
    });

  return result;
}

/*
 * Открываем отдельную страницу задания.
 *
 * Это гораздо надёжнее, чем брать огромный
 * текст всей страницы тренажёра.
 */
async function readTask3(
  page,
  taskId,
) {
  const url =
    `${TASK_URL}${taskId}`;

  await settle(
    page,
    url,
  );

  // Reject image-dependent conditions using rendered DOM, not only alt text.
  const hasTaskImage = await page.evaluate(() => {
    const label = [...document.querySelectorAll('a')].find(a => /№\s*3\s+по\s+КИМ/i.test(a.textContent || ''));
    if (!label) return true;
    let region = label.parentElement;
    while (region && !/Ответ/.test(region.innerText || '')) region = region.parentElement;
    if (!region || region === document.body) return true;
    return [...region.querySelectorAll('img,canvas,video,object,iframe')].some(el => {
      const box = el.getBoundingClientRect();
      return box.width > 40 && box.height > 40;
    });
  });
  if (hasTaskImage) return null;

  const text =
    cleanText(
      await page.evaluate(
        () =>
          document.body?.innerText ||
          '',
      ),
    );

  /*
   * Защита предмета.
   */
  if (
    !/ЕГЭ\s+[Бб]иологи/i
      .test(text)
  ) {
    return null;
  }

  /*
   * Защита номера.
   */
  const marker =
    text.match(
      /№\s*3\s+по\s+КИМ/i,
    );

  if (!marker) {
    return null;
  }

  const start =
    marker.index +
    marker[0].length;

  let rest =
    text.slice(start).trim();

  /*
   * Условие заканчивается перед блоком «Ответ».
   */
  const answerIndex =
    rest.search(
      /\n\s*Ответ\s*(?:\n|$)/i,
    );

  if (
    answerIndex !== -1
  ) {
    rest =
      rest
        .slice(
          0,
          answerIndex,
        )
        .trim();
  }

  /*
   * Убираем возможные служебные заголовки.
   */
  const condition =
    cleanText(
      rest
        .replace(
          /^Условие задания\s*#\d+\s*/i,
          '',
        )
        .replace(
          /^№\s*3\s+по\s+КИМ\s*/i,
          '',
        ),
    );

  /*
   * Нам сейчас нужны ТОЛЬКО текстовые №3.
   *
   * Если Новая школа отдаёт условие только картинкой —
   * такое задание пропускаем.
   */
  if (
    !condition ||
    condition.length < 30 ||
    /\bImage\b/i.test(
      condition,
    )
  ) {
    return null;
  }

  return {
    exam: 'ЕГЭ',

    subject:
      'биология',

    task_number: 3,

    instruction:
      INSTRUCTION,

    condition_text:
      condition,

    source_text:
      `${INSTRUCTION}\n\n${condition}`,

    source:
      'Новая школа',

    source_url:
      url,

    source_task_id:
      String(taskId),

    scraped_at:
      new Date()
        .toISOString(),
  };
}

/*
 * Ищем несколько страниц тренажёра.
 *
 * randomTask=true позволяет сайту выдавать
 * разные подборки. Повтор уже использованного
 * материала всё равно отсекается историей.
 */
async function* candidates(
  page,
  history,
) {
  const seenIds =
    new Set();

  for (
    let round = 0;
    round < 20;
    round++
  ) {
    const url =
      `${LISTING_URL}&qa_round=${round}&t=${Date.now()}`;

    try {
      await settle(
        page,
        url,
      );
    } catch {
      continue;
    }

    const ids =
      await findTask3Ids(
        page,
      );

    for (
      const id of ids
    ) {
      if (
        seenIds.has(id)
      ) {
        continue;
      }

      seenIds.add(id);

      let task;

      try {
        task =
          await readTask3(
            page,
            id,
          );
      } catch {
        continue;
      }

      if (!task) {
        continue;
      }

      if (
        findDuplicate(
          history,
          task,
        )
      ) {
        console.log(
          `№3 task=${id}: уже использовался, пропускаем.`,
        );

        continue;
      }

      yield task;
    }
  }
}

function webhookSender(
  webhookUrl,
) {
  let parsed;

  try {
    parsed =
      new URL(
        webhookUrl,
      );
  } catch {
    stop(
      'INVALID_WEBHOOK',
      'Некорректный URL n8n.',
    );
  }

  if (
    parsed.protocol !==
    'https:'
  ) {
    stop(
      'INVALID_WEBHOOK',
      'Webhook n8n должен использовать HTTPS.',
    );
  }

  return async (
    payload,
  ) => {
    let response;

    try {
      response =
        await fetch(
          parsed.href,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                payload,
              ),

            signal:
              AbortSignal.timeout(
                30_000,
              ),
          },
        );
    } catch {
      stop(
        'WEBHOOK_UNCERTAIN',
        'Не получен подтверждённый ответ n8n.',
      );
    }

    if (
      !response.ok
    ) {
      stop(
        'WEBHOOK_FAILED',
        `n8n HTTP ${response.status}.`,
      );
    }
  };
}

async function main() {
  /*
   * Production разрешён только
   * из отдельной биологической ветки.
   */
  if (
    !DRY_RUN &&
    process.env
      .GITHUB_REF_NAME !==
      HISTORY_BRANCH
  ) {
    stop(
      'WRONG_BRANCH',
      'Источник биологии разрешён только из ветки biology-3.',
    );
  }

  let history;
  let store;
  let reservationId;

  if (DRY_RUN) {
    history =
      parseHistory(
        readFileSync(
          HISTORY_PATH,
          'utf8',
        ),
      );
  } else {
    store =
      createGithubHistoryStore();

    const current =
      await store.read();

    history =
      current.history;

    reservationId =
      reservationIdForRun();
  }

  const browser =
    await chromium.launch({
      headless: true,
    });

  const context =
    await browser
      .newContext({
        userAgent:
          'Mozilla/5.0 AppleWebKit/537.36 Chrome/129 Safari/537.36',
      });

  const page =
    await context.newPage();

  try {
    let selected =
      null;

    for await (
      const task
      of candidates(
        page,
        history,
      )
    ) {
      selected =
        task;

      break;
    }

    if (!selected) {
      stop(
        'NO_NEW_TASK',
        'Не найдено нового текстового задания №3. Старое задание повторно не используем.',
      );
    }

    if (DRY_RUN) {
      console.log(
        JSON.stringify(
          selected,
          null,
          2,
        ),
      );

      return selected;
    }

    /*
     * СНАЧАЛА резервируем.
     * Только ПОСЛЕ подтверждения GitHub
     * отправляем задание в n8n.
     */
    const saved =
      await store.reserve(
        selected,
        reservationId,
      );

    const payload = {
      ...selected,

      source_reservation_id:
        reservationId,

      source_history_commit:
        saved.commitSha,
    };

    const deliver =
      webhookSender(
        process.env
          .N8N_NEWSCHOOL_WEBHOOK_URL,
      );

    await deliver(
      payload,
    );

    console.log(
      `Новое задание №3 зарезервировано и отправлено. source_task_id=${selected.source_task_id}`,
    );

    return payload;
  } finally {
    await browser.close();
  }
}

main().catch(
  (error) => {
    console.error(
      error?.message ||
      'Ошибка источника биологии.',
    );

    process.exitCode = 1;
  },
);
