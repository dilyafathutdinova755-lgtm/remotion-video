import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkSplitUsable, extractViaDom, gotoAndSettle,
  launchNewSchoolPage, matchesTaskSignature, splitInstructionAndCondition,
  trimUiNoiseAfterAnswer,
} from './newschool-lib.mjs';
import {
  HISTORY_PATH, findDuplicate, findReservation, parseHistory, taskFingerprints,
} from './russian-task-history.mjs';
import {
  HISTORY_BRANCH, createGithubHistoryStore, reservationIdForRun,
} from './github-task-history.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ORIGIN = 'https://thenewschool.ru';
const CATALOGS = [
  `${ORIGIN}/trainer/ru_lang/probniki`,
  `${ORIGIN}/trainer/ru_lang/2/probniki`,
];
const NAVIGATION = { timeout: 30_000, settleTimeout: 5_000, extraWaitMs: 2_000 };

function stop(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

/* Только реальные ссылки русского тренажёра. Не угадываем variant ID. */
export function variantUrl(href, base = CATALOGS[0]) {
  try {
    const url = new URL(href, base);
    if (url.origin !== ORIGIN || url.username || url.password ||
        !/^\/trainer\/ru_lang\/(?:\d+\/)?probniki\/?$/.test(url.pathname)) return null;
    const ids = url.searchParams.getAll('variant');
    if (ids.length !== 1 || !/^[1-9]\d{0,8}$/.test(ids[0])) return null;
    return `${ORIGIN}${url.pathname.replace(/\/$/, '')}?variant=${ids[0]}`;
  } catch {
    return null;
  }
}

export async function discoverVariantUrls(page, log = console.log) {
  const found = new Set();
  for (const catalog of CATALOGS) {
    try {
      await gotoAndSettle(page, catalog, NAVIGATION);
      if (new URL(page.url()).origin !== ORIGIN) continue;
      for (let round = 0; round <= 12; round++) {
        const links = await page.evaluate(() =>
          Array.from(document.querySelectorAll('a[href]'), (a) => a.href),
        );
        for (const link of links) {
          const url = variantUrl(link, page.url());
          if (url) found.add(url);
        }
        if (round === 12) break;
        const buttons = page.getByRole('button', {
          name: /^Показать\s+ещ[её].*вариант/iu,
        });
        let clicked = false;
        for (let i = 0; i < await buttons.count(); i++) {
          const button = buttons.nth(i);
          if (!await button.isVisible() || !await button.isEnabled()) continue;
          await button.click({ timeout: 5_000 });
          await page.waitForTimeout(1_000);
          clicked = true;
          break;
        }
        if (!clicked) break;
      }
    } catch {
      log('Не удалось полностью прочитать один каталог; проверяем найденные ссылки.');
    }
  }
  if (!found.size) stop('NO_VARIANTS', 'Каталог не дал ссылок. Старые варианты не подставляем.');
  return [...found];
}

/* Запасной путь сохраняет пустые строки и читает все блоки №6/№7.
   Не склеиваем абзацы: они нужны прежней функции разделения текста. */
function textBlocks(fullText) {
  const lines = fullText.split('\n');
  const markers = [];
  const heading = /^\s*(?:№|задание|вопрос)\s*0*(\d{1,2})(?:\s*по\s*КИМ)?\s*[.:]?\s*$/i;
  lines.forEach((line, index) => {
    const match = line.match(heading);
    if (match) markers.push({ index, number: Number(match[1]) });
  });
  return markers.map((marker, i) => ({
    number: marker.number,
    text: lines.slice(marker.index + 1, markers[i + 1]?.index).join('\n'),
  }));
}

/* Разделение instruction / condition_text остаётся в прежней библиотеке. */
export function extractCandidates(fullText, dom, url, order = [7, 6]) {
  if (!variantUrl(url)) stop('INVALID_SOURCE', 'Ссылка не относится к русскому тренажёру.');
  const fromText = textBlocks(fullText);
  const result = [];
  const seen = new Set();
  for (const number of order) {
    const blocks = [dom?.[number], ...fromText.filter((block) => block.number === number)];
    for (const picked of blocks) {
      if (typeof picked?.text !== 'string') continue;
      const sourceText = trimUiNoiseAfterAnswer(picked.text);
      if (sourceText.length < 20 || !matchesTaskSignature(number, sourceText)) continue;
      const split = splitInstructionAndCondition(number, sourceText);
      if (checkSplitUsable(split) !== true) continue;
      const payload = {
        exam: 'ЕГЭ',
        subject: 'русский',
        task_number: number,
        instruction: split.instruction,
        condition_text: split.condition_text,
        source_text: sourceText,
        source: 'Новая школа',
        source_url: url,
        scraped_at: new Date().toISOString(),
      };
      const sourceId = picked.dataId || picked.elementId;
      if (sourceId) payload.source_task_id = String(sourceId);
      const keys = taskFingerprints(payload);
      if (keys.some((key) => seen.has(key))) continue;
      keys.forEach((key) => seen.add(key));
      result.push(payload);
    }
  }
  return result;
}

/* Читаем историю ДО сайта. Подтверждаем резерв ДО единственного POST.
   После неопределённого результата отправки ни повторов, ни нового задания
   в этом запуске нет. Резерв остаётся занятым, даже если производство упало. */
export async function selectAndSend({
  store, reservationId, candidates, deliver, dryRun = false, log = console.log,
}) {
  let { history } = await store.read();
  if (!dryRun && findReservation(history, reservationId)) {
    stop('RUN_ALREADY_RESERVED', 'Этот GitHub-запуск уже занимал задание. Повтор не отправляем.');
  }
  let skipped = 0;
  for await (const payload of candidates(history)) {
    if (findDuplicate(history, payload)) {
      skipped++;
      continue;
    }
    if (dryRun) {
      log('--dry-run: новое задание найдено; запись истории и отправка отключены.');
      return { sent: false, payload };
    }
    let saved;
    try {
      saved = await store.reserve(payload, reservationId);
    } catch (error) {
      if (error.code !== 'TASK_ALREADY_USED') throw error;
      history = (await store.read()).history;
      if (findReservation(history, reservationId)) {
        stop('RUN_ALREADY_RESERVED', 'Параллельный процесс уже занял задание для этого запуска.');
      }
      skipped++;
      continue;
    }
    log(`Резерв сохранён. Пропущено повторов: ${skipped}. Отправляем одно задание №${payload.task_number}.`);
    await deliver({
      ...payload,
      source_reservation_id: reservationId,
      source_history_commit: saved.commitSha,
    });
    return { sent: true, payload };
  }
  stop('NO_NEW_TASK', `Среди прочитанных заданий нового нет. Пропущено повторов: ${skipped}. Старое не отправляем.`);
}

export function webhookSender(webhookUrl, fetchImpl = globalThis.fetch) {
  let url;
  try { url = new URL(webhookUrl); } catch {
    stop('INVALID_WEBHOOK', 'Не задан корректный адрес n8n.');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    stop('INVALID_WEBHOOK', 'Для n8n требуется HTTPS без пароля в URL.');
  }
  return async (payload) => {
    let response;
    try {
      response = await fetchImpl(url.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      stop('WEBHOOK_UNCERTAIN', 'Ответ n8n не получен. Резерв сохраняем; POST не повторяем.');
    }
    if (!response.ok) {
      stop('WEBHOOK_FAILED', `n8n HTTP ${response.status}. Резерв сохраняем; POST не повторяем.`);
    }
  };
}

export async function main(args = process.argv.slice(2)) {
  if (args.some((arg) => arg !== '--dry-run')) stop('INVALID_ARGUMENT', 'Поддерживается только --dry-run.');
  const dryRun = args.includes('--dry-run');
  if (!dryRun && process.env.GITHUB_REF_NAME !== HISTORY_BRANCH) {
    stop('WRONG_BRANCH', 'Производство разрешено только из рабочей ветки.');
  }
  const reservationId = dryRun ? null : reservationIdForRun();
  const store = dryRun ? {
    read: async () => ({ history: parseHistory(readFileSync(resolve(ROOT, HISTORY_PATH), 'utf8')) }),
  } : createGithubHistoryStore();
  const deliver = dryRun ? null : webhookSender(process.env.N8N_NEWSCHOOL_WEBHOOK_URL);
  let browser;
  try {
    const result = await selectAndSend({
      store, reservationId, deliver, dryRun,
      candidates: async function* (history) {
        const { chromium } = await import('playwright');
        const session = await launchNewSchoolPage(chromium);
        browser = session.browser;
        const page = session.page;
        const urls = await discoverVariantUrls(page);
        console.log(`Реальных ссылок на варианты: ${urls.length}.`);
        const last = history.entries.at(-1);
        const order = Number(last?.task_number) === 7 ? [6, 7] : [7, 6];
        const deadline = Date.now() + 7 * 60_000;
        for (const url of urls) {
          if (Date.now() >= deadline) stop('SEARCH_LIMIT', 'Истекло время поиска. Повтор не подставляем.');
          let tasks;
          try {
            await gotoAndSettle(page, url, NAVIGATION);
            if (variantUrl(page.url()) !== url) continue;
            const fullText = await page.evaluate(() => document.body?.innerText || '');
            const dom = await extractViaDom(page, [6, 7]).catch(() => ({}));
            tasks = extractCandidates(fullText, dom, url, order);
          } catch {
            console.log(`Вариант ${new URL(url).searchParams.get('variant')} не извлечён; пробуем следующий.`);
            continue;
          }
          for (const task of tasks) yield task;
        }
      },
    });
    if (dryRun) console.log(JSON.stringify(result.payload, null, 2));
    else console.log('Одно новое задание принято n8n. Это ещё не подтверждение публикации.');
    return result;
  } finally {
    if (browser) await browser.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const known = typeof error.code === 'string' && /^[A-Z_]+$/.test(error.code);
    let message = known ? error.message : 'Ошибка выполнения источника. Отправка не подтверждена.';
    for (const secret of [process.env.GITHUB_TOKEN, process.env.N8N_NEWSCHOOL_WEBHOOK_URL]) {
      if (secret) message = message.split(secret).join('[скрыто]');
    }
    console.error(message);
    process.exitCode = 1;
  });
}
