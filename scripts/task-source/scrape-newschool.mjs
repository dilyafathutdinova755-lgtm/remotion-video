#!/usr/bin/env node
/**
 * Диагностический скрейпер: открывает страницу тренажёра «Новой школы»
 * настоящим headless-браузером (Playwright/Chromium — не fetch/curl, задания
 * дорисовываются JS-ом после загрузки) и пытается вытащить сырой текст
 * заданий №6 и №7 по русскому языку с ОДНОГО зафиксированного variant.
 *
 * Это ТОЛЬКО извлечение текста, как он есть на странице. Разбор на
 * instruction/condition_text, придумывание answer/explanation — не здесь,
 * сознательно не входит в задачу этого скрипта.
 *
 * Production-источник заданий для n8n (динамический выбор variant, ОДНО
 * задание за прогон, отправка в webhook) — отдельный скрипт
 * fetch-newschool-task.mjs; оба используют общую логику извлечения из
 * newschool-lib.mjs, чтобы очистка UI-мусора и стратегии поиска заданий не
 * разъезжались между ними.
 *
 * Использование:
 *   node scrape-newschool.mjs [url] [--out tasks.json] [--debug-html debug.html] [--debug-text debug.txt]
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import {
  extractViaDom,
  extractViaText,
  gotoAndSettle,
  launchNewSchoolPage,
  stripAnsi,
  trimUiNoiseAfterAnswer,
} from "./newschool-lib.mjs";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : def;
};

const TARGET_URL =
  args.find((a) => a.startsWith("http")) ||
  "https://thenewschool.ru/trainer/ru_lang/2/probniki?variant=275";
const OUT_JSON = flag("out", "newschool-tasks.json");
const OUT_DEBUG_HTML = flag("debug-html", "newschool-debug.html");
const OUT_DEBUG_TEXT = flag("debug-text", "newschool-debug.txt");
const TASK_NUMBERS = [6, 7];

async function main() {
  console.log(`Открываю: ${TARGET_URL}`);
  const { browser, page } = await launchNewSchoolPage(chromium);

  let loadError = null;
  try {
    await gotoAndSettle(page, TARGET_URL);
  } catch (e) {
    loadError = e;
    console.error(`ОШИБКА при открытии страницы: ${stripAnsi(e.message)}`);
  }

  const fullText = await page.evaluate(() => document.body?.innerText || "").catch(() => "");
  const fullHtml = await page.content().catch(() => "");

  writeFileSync(OUT_DEBUG_HTML, fullHtml, "utf8");
  writeFileSync(OUT_DEBUG_TEXT, fullText, "utf8");
  console.log(
    `Debug-файлы сохранены: ${OUT_DEBUG_HTML} (${fullHtml.length} симв.), ${OUT_DEBUG_TEXT} (${fullText.length} симв.)`,
  );

  if (loadError) {
    await browser.close();
    const result = { source: "Новая школа", source_url: TARGET_URL, tasks: [], error: stripAnsi(loadError.message) };
    writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), "utf8");
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  // DOM-стратегия — пока страница ещё открыта, до закрытия браузера.
  const domResults = await extractViaDom(page, TASK_NUMBERS).catch((e) => {
    console.error(`Стратегия DOM не сработала: ${e.message}`);
    return {};
  });

  await browser.close();

  const textResults = extractViaText(fullText, TASK_NUMBERS);

  const tasks = [];
  for (const num of TASK_NUMBERS) {
    const fromDom = domResults[num];
    const fromText = textResults[num];
    // DOM-стратегия точнее (уважает реальные границы контейнера) — берём
    // её результат, если есть; иначе fallback на грубую текстовую.
    const chosen = fromDom || fromText;
    if (!chosen) {
      console.error(`НЕ НАЙДЕНО: задание №${num} — ни одна стратегия не сработала.`);
      continue;
    }
    tasks.push({
      task_number: num,
      source_text: trimUiNoiseAfterAnswer(chosen.text),
      source: "Новая школа",
      source_url: TARGET_URL,
      ...(chosen.elementId ? { internal_id: chosen.elementId } : {}),
      ...(chosen.dataId ? { internal_data_id: chosen.dataId } : {}),
    });
  }

  const result = { source: "Новая школа", source_url: TARGET_URL, tasks };
  writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), "utf8");
  console.log("\n--- Результат ---");
  console.log(JSON.stringify(result, null, 2));

  if (tasks.length < TASK_NUMBERS.length) {
    console.error(
      `\nПРЕДУПРЕЖДЕНИЕ: нашли ${tasks.length} из ${TASK_NUMBERS.length} заданий. ` +
        `Смотрите ${OUT_DEBUG_HTML}/${OUT_DEBUG_TEXT} для ручного разбора реальной структуры страницы.`,
    );
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("ОШИБКА:", e);
  process.exit(1);
});
