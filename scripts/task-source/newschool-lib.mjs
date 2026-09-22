/**
 * Общая логика извлечения заданий с тренажёра «Новой школы» —
 * используется и диагностическим scrape-newschool.mjs (оба задания №6/№7 с
 * одного зафиксированного variant, для ручной проверки структуры сайта), и
 * production fetch-newschool-task.mjs (динамический variant + один webhook
 * в n8n). Держать в одном месте, чтобы очистка UI-мусора и стратегии
 * поиска заданий не разъезжались между двумя скриптами — тот же принцип
 * единственного источника правды, что и у normalize-for-voiceover.mjs.
 *
 * ВАЖНО: у меня нет доступа посмотреть реальный DOM этого сайта (egress из
 * этой sandbox-сессии заблокирован — см. PLAYBOOK.md §13), поэтому все
 * эвристики ниже не проверены на живой странице напрямую. Они пробуют
 * несколько разумных стратегий по очереди и никогда не считают отсутствие
 * результата фатальной ошибкой самой функции — решение, что делать при
 * пустом результате, принимает вызывающий код.
 */

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// eslint-disable-next-line no-control-regex
export const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, "");

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
export function trimUiNoiseAfterAnswer(text) {
  const lines = String(text).split("\n");
  const idx = lines.findIndex((l) => /^\s*ответ\s*$/i.test(l));
  if (idx === -1) return text.trim();
  return lines.slice(0, idx).join("\n").trim();
}

/**
 * Стратегия 1 (DOM): ищем элементы, чей СОБСТВЕННЫЙ текст (без детей)
 * похож на заголовок задания («Задание 6», «№6», просто «6.» в начале
 * блока с вопросом) и берём текст ближайшего осмысленного контейнера
 * вокруг — родителя разумного размера (не всей страницы, не пустышку).
 * Возвращает { [number]: { text, elementId, dataId } | null }.
 */
export async function extractViaDom(page, numbers) {
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
 * Стратегия 2 (текст): на уже отрендеренном plain-тексте всей страницы —
 * ищем строки-заголовки вида «Задание N» и берём всё до следующего такого
 * заголовка (любого числа, не только целевого) или до конца текста.
 * Грубее стратегии 1 (не отличает реальный контейнер задания от лишнего
 * текста между заголовками), но не зависит от разметки вообще.
 */
export function extractViaText(fullText, numbers) {
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

/**
 * Открывает headless Chromium с тем же UA и (опционально)
 * PLAYWRIGHT_EXECUTABLE_PATH, что и раньше — вынесено в одно место, чтобы
 * оба скрипта запускали браузер одинаково.
 */
export async function launchNewSchoolPage(chromium) {
  const launchOpts = { headless: true };
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  }
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({ userAgent: UA });
  const page = await context.newPage();
  return { browser, context, page };
}

/**
 * Открывает URL и даёт SPA время дорисовать контент JS-ом: домождается
 * domcontentloaded, затем пробует дождаться networkidle (не фатально, если
 * не дождались за таймаут — просто предупреждение), плюс небольшая
 * фиксированная страховка сверху.
 */
export async function gotoAndSettle(
  page,
  url,
  { timeout = 45000, settleTimeout = 20000, extraWaitMs = 3000 } = {},
) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout });
  await page
    .waitForLoadState("networkidle", { timeout: settleTimeout })
    .catch(() =>
      console.log("Предупреждение: networkidle не наступил вовремя, продолжаю."),
    );
  if (extraWaitMs) await page.waitForTimeout(extraWaitMs);
}

/**
 * Ищет на странице-листинге пробников ссылки/атрибуты, упоминающие
 * ?variant=NNN (или data-variant="NNN", или числовые <option value="NNN">
 * внутри <select>) — три независимых эвристики сразу, потому что неизвестно
 * заранее, как именно сайт рисует список вариантов. Возвращает
 * отсортированный массив уникальных числовых id или [] (пустой массив —
 * НЕ ошибка, вызывающий код сам решает, использовать ли fallback-пул).
 */
export async function discoverVariants(page) {
  const found = await page.evaluate(() => {
    const set = new Set();
    document.querySelectorAll("a[href*='variant=']").forEach((a) => {
      const m = (a.getAttribute("href") || "").match(/variant=(\d+)/);
      if (m) set.add(Number(m[1]));
    });
    document.querySelectorAll("[data-variant]").forEach((el) => {
      const v = el.getAttribute("data-variant");
      if (v && /^\d+$/.test(v)) set.add(Number(v));
    });
    document.querySelectorAll("select option[value]").forEach((o) => {
      const v = o.getAttribute("value");
      if (v && /^\d+$/.test(v) && Number(v) > 0) set.add(Number(v));
    });
    return Array.from(set);
  });

  if (found.length > 0) return found.sort((a, b) => a - b);

  // Резерв той же эвристики, но по сырому HTML — на случай, если ссылки
  // собираются в разметку без атрибута href (например, через onclick с
  // template-строкой) и evaluate() выше ничего не увидел.
  const html = await page.content().catch(() => "");
  const fromHtml = new Set();
  for (const m of html.matchAll(/variant["'=:\s]{1,4}(\d{1,6})/gi)) {
    fromHtml.add(Number(m[1]));
  }
  return Array.from(fromHtml).sort((a, b) => a - b);
}
