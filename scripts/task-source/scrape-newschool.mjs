#!/usr/bin/env node
/**
 * Диагностический скрейпер: открывает страницу тренажёра «Новой школы»
 * настоящим headless-браузером (Playwright/Chromium — не fetch/curl, задания
 * дорисовываются JS-ом после загрузки) и пытается вытащить сырой текст
 * заданий №6 и №7 по русскому языку.
 *
 * Это ТОЛЬКО извлечение текста, как он есть на странице. Разбор на
 * instruction/condition_text, придумывание answer/explanation — не здесь,
 * сознательно не входит в задачу этого скрипта.
 *
 * ВАЖНО про структуру страницы: у меня нет доступа посмотреть реальный DOM
 * этого сайта (egress из этой sandbox-сессии заблокирован тем же прокси,
 * что и fipi.ru — см. PLAYBOOK.md §13), поэтому эвристики поиска заданий
 * ниже не проверены на живой странице. Скрипт пробует несколько разумных
 * стратегий по очереди и, если ни одна не сработала, всё равно сохраняет
 * ПОЛНЫЙ текст и HTML страницы в debug-файлы — по ним видно реальную
 * структуру и можно быстро поправить селектор/регулярку.
 *
 * Использование:
 *   node scrape-newschool.mjs [url] [--out tasks.json] [--debug-html debug.html] [--debug-text debug.txt]
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

// eslint-disable-next-line no-control-regex
const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, "");

/**
 * Обрезает мусор интерфейса тренажёра после текста самого задания: кнопки
 * и виджеты («Ответ», «Проверить ответ», «Показать ответ и решение»,
 * «Решения от учеников», счётчик и т. п.) идут отдельными строками сразу
 * после условия — реальный подтверждённый пример на живой странице
 * (задание №6 по КИМ). Режем по ПЕРВОЙ строке, которая целиком (без
 * остального текста на той же строке) равна «Ответ» — это заголовок
 * блока с кнопками, у настоящего текста условия такой отдельной строки
 * не бывает (маркер вида «Ответ:» с двоеточием, если он вообще есть в
 * тексте задания, сюда не попадает — regex требует конец строки сразу
 * после слова, без двоеточия/остального).
 */
function trimUiNoiseAfterAnswer(text) {
  const lines = String(text).split("\n");
  const idx = lines.findIndex((l) => /^\s*ответ\s*$/i.test(l));
  if (idx === -1) return text.trim();
  return lines
    .slice(0, idx)
    .join("\n")
    .trim();
}

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

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/**
 * Стратегия 1 (DOM): ищем элементы, чей СОБСТВЕННЫЙ текст (без детей)
 * похож на заголовок задания («Задание 6», «№6», просто «6.» в начале
 * блока с вопросом) и берём текст ближайшего осмысленного контейнера
 * вокруг — родителя разумного размера (не всей страницы, не пустышку).
 * Возвращает { [number]: { text, elementId } | null }.
 */
async function extractViaDom(page, numbers) {
  return page.evaluate((numbers) => {
    const headerRe = new RegExp(
      `(?:задание|вопрос|№)\\s*0*(${numbers.join("|")})\\b`,
      "i",
    );
    const bareNumberRe = new RegExp(`^\\s*0*(${numbers.join("|")})\\s*[.)]\\s*$`);

    const all = Array.from(document.querySelectorAll("body *"));
    const candidates = [];

    for (const el of all) {
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join(" ")
        .trim();
      if (!ownText) continue;

      let match = ownText.match(headerRe) || ownText.match(bareNumberRe);
      if (!match) continue;

      const num = Number(match[1]);
      if (!numbers.includes(num)) continue;

      // Контейнер задания — ближайший предок с достаточным объёмом текста
      // (сам заголовок обычно слишком короткий), но не весь документ.
      let container = el;
      for (let i = 0; i < 6 && container.parentElement; i++) {
        const len = container.innerText?.trim().length || 0;
        if (len > 40 && len < 6000) break;
        container = container.parentElement;
      }

      const text = container.innerText?.trim();
      if (!text) continue;

      candidates.push({
        num,
        text,
        elementId: el.id || container.id || null,
        dataId:
          el.getAttribute?.("data-id") ||
          el.getAttribute?.("data-task-id") ||
          container.getAttribute?.("data-id") ||
          container.getAttribute?.("data-task-id") ||
          null,
        textLength: text.length,
      });
    }

    // Для каждого номера берём самый короткий подходящий контейнер —
    // обычно это самый точный (широкий предок случайно тоже match'ится).
    const result = {};
    for (const num of numbers) {
      const forNum = candidates.filter((c) => c.num === num);
      forNum.sort((a, b) => a.textLength - b.textLength);
      result[num] = forNum[0] || null;
    }
    return result;
  }, numbers);
}

/**
 * Стратегия 2 (текст): у же на отрендеренном plain-тексте всей страницы —
 * ищем строки-заголовки вида «Задание N» и берём всё до следующего такого
 * заголовка (любого числа, не только целевого) или до конца текста.
 * Грубее стратегии 1 (не отличает реальный контейнер задания от лишнего
 * текста между заголовками), но не зависит от разметки вообще.
 */
function extractViaText(fullText, numbers) {
  const lines = fullText.split("\n");
  const headerRe = /^\s*(?:задание|вопрос|№)?\s*0*(\d{1,2})\s*[.)]?\s*$/i;
  const inlineHeaderRe = /(?:задание|вопрос|№)\s*0*(\d{1,2})\b/i;

  const markers = []; // { line index, num }
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const m = trimmed.match(headerRe) || trimmed.match(inlineHeaderRe);
    if (m) markers.push({ i, num: Number(m[1]) });
  });

  const result = {};
  for (const num of numbers) {
    const markerIdx = markers.findIndex((m) => m.num === num);
    if (markerIdx === -1) {
      result[num] = null;
      continue;
    }
    const start = markers[markerIdx].i + 1;
    const end = markerIdx + 1 < markers.length ? markers[markerIdx + 1].i : lines.length;
    const text = lines
      .slice(start, end)
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    result[num] = text ? { text, elementId: null, dataId: null } : null;
  }
  return result;
}

async function main() {
  console.log(`Открываю: ${TARGET_URL}`);
  // PLAYWRIGHT_EXECUTABLE_PATH — необязательный override на случай, если в
  // окружении уже стоит Chromium другой ревизии, чем ждёт установленный
  // playwright (например, свой образ/раннер с предустановленным браузером).
  // В GitHub Actions после `playwright install --with-deps chromium` эта
  // переменная не нужна — сработает обычный managed-браузер playwright.
  const launchOpts = { headless: true };
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  }
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({ userAgent: UA });
  const page = await context.newPage();

  let loadError = null;
  try {
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    // SPA обычно дорисовывают контент уже после domcontentloaded — ждём,
    // пока сеть успокоится, но не считаем это фатальным, если не дождались.
    await page
      .waitForLoadState("networkidle", { timeout: 20000 })
      .catch(() => console.log("Предупреждение: networkidle не наступил за 20с, продолжаю."));
    // Дополнительная страховка на дорисовку JS-ом уже после networkidle.
    await page.waitForTimeout(3000);
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
