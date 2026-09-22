#!/usr/bin/env node
/**
 * Production-источник заданий для n8n: открывает тренажёр «Новой школы»
 * настоящим Playwright/Chromium-браузером, выбирает ОДИН доступный variant
 * (по возможности — из реально найденного на странице списка, иначе из
 * небольшого резервного пула — см. discoverVariant ниже), извлекает из него
 * задание №6 ИЛИ №7 по русскому языку (реальный текст, без придуманных
 * answer/explanation — их дальше делает n8n/Claude) и отправляет ОДНИМ
 * POST-запросом в n8n webhook.
 *
 * Claude в GitHub здесь не участвует: это чистое извлечение + пересылка
 * сырого текста задания. Вся логика поиска заданий и очистки UI-мусора —
 * общая с диагностическим scrape-newschool.mjs, см. newschool-lib.mjs
 * (единственный источник правды, чтобы два скрипта не разъехались).
 *
 * Переменные окружения:
 *   N8N_NEWSCHOOL_WEBHOOK_URL — обязательный, URL n8n-вебхука. Значение
 *     НИКОГДА не печатается в лог (ни само, ни в текстах ошибок — см.
 *     redactSecret ниже); GitHub Actions дополнительно маскирует secrets
 *     в логах автоматически, но скрипт на это не полагается как на
 *     единственную защиту.
 *   PLAYWRIGHT_EXECUTABLE_PATH — необязательный override браузера.
 *
 * Использование:
 *   N8N_NEWSCHOOL_WEBHOOK_URL="https://..." node fetch-newschool-task.mjs
 *
 * Опциональные флаги (для локальной проверки без реальной отправки):
 *   --listing-url <url>   страница со списком вариантов (по умолчанию —
 *                         тренажёр ru_lang/2/probniki без variant)
 *   --dry-run              не отправлять POST, только напечатать payload
 */
import { chromium } from "playwright";
import {
  discoverVariants,
  extractViaDom,
  extractViaText,
  gotoAndSettle,
  launchNewSchoolPage,
  matchesTaskSignature,
  stripAnsi,
  trimUiNoiseAfterAnswer,
} from "./newschool-lib.mjs";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : def;
};
const hasFlag = (name) => args.includes(`--${name}`);

// --trainer-base — только для локальной проверки против фикстуры вместо
// реального сайта (production-запуск его не передаёт и получает реальный
// адрес). listing-url по умолчанию совпадает с trainer-base, потому что на
// живом сайте страница со списком вариантов — это тот же тренажёр без
// ?variant вовсе.
const TRAINER_BASE = flag(
  "trainer-base",
  "https://thenewschool.ru/trainer/ru_lang/2/probniki",
);
const LISTING_URL = flag("listing-url", TRAINER_BASE);
const DRY_RUN = hasFlag("dry-run");
const TASK_NUMBERS = [6, 7];
const MIN_SOURCE_TEXT_LEN = 20;

/**
 * Резервный пул variant-id, если discoverVariants() не нашёл на странице
 * ничего надёжного (сайт мог поменять разметку списка, или список вообще
 * не выводится отдельной страницей). Это НЕ гарантированно рабочие id —
 * только окрестность единственного подтверждённого вручную variant=275
 * (см. PLAYBOOK.md §13 и test-newschool-scrape.yml) на случай, если
 * соседние номера тоже существуют на сайте (типичная нумерация пробников).
 * Каждый кандидат всё равно реально открывается и проверяется на наличие
 * задания №6/№7 в main() ниже — если конкретный id не существует, его
 * просто пропускают и пробуют следующий, а не считают успехом вслепую.
 */
const FALLBACK_VARIANT_POOL = [275, 276, 277, 278, 279, 280, 281, 282, 283, 284];

function variantUrl(variant) {
  return `${TRAINER_BASE}?variant=${variant}`;
}

/** Стабильный (не крипто-) хэш строки в неотрицательное целое — только для
 * детерминированного, но каждый день разного выбора variant/задания. */
function stableHash(str) {
  let hash = 0;
  for (const ch of String(str)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function isUsableSourceText(text) {
  return typeof text === "string" && text.trim().length >= MIN_SOURCE_TEXT_LEN;
}

function redactSecret(str, secret) {
  if (!secret) return str;
  return String(str).split(secret).join("<webhook-url-redacted>");
}

async function main() {
  const webhookUrl = process.env.N8N_NEWSCHOOL_WEBHOOK_URL;
  if (!DRY_RUN && !webhookUrl) {
    console.error(
      "ОШИБКА: переменная окружения N8N_NEWSCHOOL_WEBHOOK_URL не задана — отправлять некуда.",
    );
    process.exit(1);
  }

  const { browser, page } = await launchNewSchoolPage(chromium);

  console.log(`Открываю список вариантов: ${LISTING_URL}`);
  let discovered = [];
  try {
    await gotoAndSettle(page, LISTING_URL);
    discovered = await discoverVariants(page);
  } catch (e) {
    console.error(
      `Предупреждение: не удалось получить список вариантов (${stripAnsi(e.message)}) — использую резервный пул.`,
    );
  }

  const pool = discovered.length > 0 ? discovered : FALLBACK_VARIANT_POOL;
  const poolSource = discovered.length > 0 ? "найден на странице" : "резервный пул";
  console.log(`Вариантов в пуле: ${pool.length} (источник: ${poolSource}).`);

  const today = todayUtc();
  const startIdx = pool.length > 0 ? stableHash(today) % pool.length : 0;

  let chosen = null; // { variant, url, taskNumber, sourceText, internalId, internalDataId }
  for (let attempt = 0; attempt < pool.length && !chosen; attempt++) {
    const variant = pool[(startIdx + attempt) % pool.length];
    const url = variantUrl(variant);
    console.log(`Пробую variant=${variant}...`);

    try {
      await gotoAndSettle(page, url);
    } catch (e) {
      console.error(`  variant=${variant}: страница не открылась (${stripAnsi(e.message)}), пропускаю.`);
      continue;
    }

    const fullText = await page.evaluate(() => document.body?.innerText || "").catch(() => "");
    const domResults = await extractViaDom(page, TASK_NUMBERS).catch(() => ({}));
    const textResults = extractViaText(fullText, TASK_NUMBERS);

    // Порядок проверки №6/№7 тоже детерминированно меняется день ото дня
    // (и зависит от variant, чтобы не совпадать с выбором variant) —
    // предпочтительный номер пробуем первым, но если на этой странице его
    // не нашли, берём тот, что реально есть.
    const preferFirst = stableHash(`${variant}:${today}`) % TASK_NUMBERS.length;
    const order =
      preferFirst === 0 ? TASK_NUMBERS : [...TASK_NUMBERS].slice().reverse();

    for (const num of order) {
      const picked = domResults[num] || textResults[num];
      if (!picked) continue;
      const sourceText = trimUiNoiseAfterAnswer(picked.text);
      if (!isUsableSourceText(sourceText)) {
        console.error(
          `  variant=${variant}, №${num}: source_text слишком короткий/пустой (${sourceText.trim().length} симв.), пропускаю.`,
        );
        continue;
      }
      // Строгая валидация ПОСЛЕ extraction и ДО webhook POST: заголовок
      // «№6»/«№7» на странице сам по себе не гарантия — рядом в DOM может
      // быть чужой блок с тем же номером (см. случай с литературным
      // заданием, принятым за русское №6). Здесь проверяется реальное
      // содержимое, а не структура/заголовок.
      if (!matchesTaskSignature(num, sourceText)) {
        console.error(
          `variant ${variant} rejected: task ${num} does not match Russian EGE task ${num} signature`,
        );
        continue;
      }
      chosen = {
        variant,
        url,
        taskNumber: num,
        sourceText,
        internalId: picked.elementId || null,
        internalDataId: picked.dataId || null,
      };
      break;
    }
  }

  await browser.close();

  if (!chosen) {
    console.error(
      `ОШИБКА: ни один вариант из пула (${pool.length} шт.) не дал пригодное задание №6/№7. Новая школа недоступна или изменила разметку — рендер запускать не с чем.`,
    );
    process.exit(1);
  }

  const payload = {
    exam: "ЕГЭ",
    subject: "русский",
    task_number: chosen.taskNumber,
    source_text: chosen.sourceText,
    source: "Новая школа",
    source_url: chosen.url,
    ...(chosen.internalDataId || chosen.internalId
      ? { source_task_id: String(chosen.internalDataId || chosen.internalId) }
      : {}),
    scraped_at: new Date().toISOString(),
  };

  console.log("--- Выбрано (безопасный лог) ---");
  console.log(`variant: ${chosen.variant} (source_url: ${chosen.url})`);
  console.log(`task_number: ${payload.task_number}`);
  console.log(`source_text: ${payload.source_text.length} символов`);
  if (payload.source_task_id) console.log(`source_task_id: ${payload.source_task_id}`);
  console.log("--- source_text (полностью, для диагностики) ---");
  console.log(payload.source_text);
  console.log("--- конец source_text ---");

  if (DRY_RUN) {
    console.log("\n--dry-run: payload не отправлен, только напечатан.");
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  let response;
  try {
    response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error(
      `ОШИБКА при отправке в n8n webhook: ${redactSecret(stripAnsi(e.message), webhookUrl)}`,
    );
    process.exit(1);
  }

  console.log(`Webhook HTTP status: ${response.status}`);

  if (!response.ok) {
    let bodySnippet = "";
    try {
      bodySnippet = redactSecret((await response.text()).slice(0, 500), webhookUrl);
    } catch {
      // тело не прочиталось — не критично, статус уже залогирован выше
    }
    console.error(
      `ОШИБКА: n8n webhook вернул ${response.status} ${response.statusText}.` +
        (bodySnippet ? ` Ответ: ${bodySnippet}` : ""),
    );
    process.exit(1);
  }

  console.log("Задание успешно отправлено в n8n.");
}

main().catch((e) => {
  // Последняя страховка: даже здесь не печатаем secret как есть, если он
  // случайно попал в текст непойманной ошибки где-то внутри main().
  const safe = redactSecret(
    stripAnsi(String(e?.stack || e)),
    process.env.N8N_NEWSCHOOL_WEBHOOK_URL,
  );
  console.error("ОШИБКА:", safe);
  process.exit(1);
});
