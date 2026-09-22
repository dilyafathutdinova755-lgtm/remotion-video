#!/usr/bin/env node
/**
 * Тесты для scripts/task-source/newschool-lib.mjs — прежде всего защита от
 * регресса «чужое задание под правильным task_number» (реальный случай:
 * production-скрейпер отправил литературное задание с заполнением
 * пропусков как русское №6). Покрывает и содержательную валидацию
 * (matchesTaskSignature), и структурную (extractViaDom игнорирует
 * скрытые/унесённые за пределы экрана дубликаты).
 *
 * Использование: node scripts/task-source/test-newschool-lib.mjs
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import {
  extractViaDom,
  matchesTaskSignature,
  trimUiNoiseAfterAnswer,
} from "./newschool-lib.mjs";

let passed = 0;
let failed = 0;

function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  OK  ${name}`);
    })
    .catch((e) => {
      failed++;
      console.error(`  FAIL  ${name}`);
      console.error(`        ${e.message}`);
    });
}

async function main() {
  console.log("--- matchesTaskSignature ---");

  await check("русский №6 REMOVE («исключив лишнее слово») → accepted", () => {
    const text =
      "Задание 6\n\nОтредактируйте предложение: исправьте лексическую ошибку, исключив лишнее слово. Выпишите это слово.\n\nЭтот исключительно эксклюзивный автомобиль был изготовлен в 2008 году.";
    assert.equal(matchesTaskSignature(6, text), true);
  });

  await check("русский №6 REPLACE («заменив неверно употреблённое слово») → accepted", () => {
    const text =
      "Задание 6\n\nОтредактируйте предложение: исправьте лексическую ошибку, заменив неверно употреблённое слово. Выпишите это слово.\n\nМама испекла вкусный пирог.";
    assert.equal(matchesTaskSignature(6, text), true);
  });

  await check("русский №6 REPLACE, вариант написания «ё»→«е» в источнике → accepted", () => {
    // На случай, если сайт пишет "употребленное" без ё — normalizeForSignatureMatch
    // приводит обе стороны к одному виду, поэтому написание источника не важно.
    const text =
      "Отредактируйте предложение: исправьте лексическую ошибку, заменив неверно употребленное слово. Выпишите это слово. Пример предложения.";
    assert.equal(matchesTaskSignature(6, text), true);
  });

  await check("русский №7 («допущена ошибка в образовании формы слова») → accepted", () => {
    const text =
      "Задание 7\n\nВ одном из выделенных ниже слов допущена ошибка в образовании формы слова. Исправьте ошибку.\n\nПЯТЬЮСТАМИ рублями было решено оплатить проезд.";
    assert.equal(matchesTaskSignature(7, text), true);
  });

  await check("литературное задание с task_number=6 → rejected", () => {
    const text =
      "№6 по КИМ\n\nЗаполните пропуски в следующем предложении. В ответе запишите два литературных термина, пропущенных в приведённом ниже фрагменте.\n\nВ этом фрагменте ветер печёт, моя грудь наполняется запахами хвои.";
    assert.equal(matchesTaskSignature(6, text), false);
  });

  await check("литературное задание с task_number=7 → rejected", () => {
    const text =
      "№7 по КИМ\n\nОпределите размер, которым написано стихотворение.";
    assert.equal(matchesTaskSignature(7, text), false);
  });

  await check("пустой контейнер → rejected", () => {
    assert.equal(matchesTaskSignature(6, ""), false);
    assert.equal(matchesTaskSignature(6, "   \n  "), false);
  });

  await check("повреждённый/мусорный контейнер без сигнатуры → rejected", () => {
    const garbled = "печёт,м о ягрудь о тзапахов илихвои";
    assert.equal(matchesTaskSignature(6, garbled), false);
    assert.equal(matchesTaskSignature(7, garbled), false);
  });

  await check("неизвестный task_number → всегда rejected", () => {
    assert.equal(
      matchesTaskSignature(
        9,
        "Отредактируйте предложение: исправьте лексическую ошибку, исключив лишнее слово.",
      ),
      false,
    );
  });

  console.log("\n--- trimUiNoiseAfterAnswer ---");

  await check("UI-мусор после «Ответ» удаляется", () => {
    const raw =
      "Отредактируйте предложение: исправьте лексическую ошибку, исключив лишнее слово. Выпишите это слово.\n\nЭтот исключительно эксклюзивный автомобиль был изготовлен в 2008 году.\n\nОтвет\nПроверить ответ\nПоказать ответ и решение\nРешения от учеников\n4";
    const cleaned = trimUiNoiseAfterAnswer(raw);
    assert.ok(!/Проверить ответ/.test(cleaned));
    assert.ok(!/Решения от учеников/.test(cleaned));
    assert.ok(/автомобиль был изготовлен в 2008 году\.$/.test(cleaned));
  });

  await check("trimUiNoiseAfterAnswer оставляет текст как есть, если «Ответ» нет", () => {
    const raw = "Просто текст задания без блока ответа в конце.";
    assert.equal(trimUiNoiseAfterAnswer(raw), raw);
  });

  console.log("\n--- extractViaDom: видимость ---");

  const { browser, page } = await (async () => {
    const launchOpts = { headless: true };
    if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
      launchOpts.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
    }
    const b = await chromium.launch(launchOpts);
    const p = await b.newPage();
    return { browser: b, page: p };
  })();

  try {
    await check("hidden №6 (display:none) + visible правильный №6 → выбирает visible", async () => {
      await page.setContent(`<!doctype html><html><body>
        <div style="display:none">
          <h3>Задание 6</h3>
          <p>Это скрытый чужой блок, который никогда не должен попасть в источник.</p>
        </div>
        <div>
          <h3>Задание 6</h3>
          <p>Отредактируйте предложение: исправьте лексическую ошибку, исключив лишнее слово. Выпишите это слово.</p>
          <p>Видимый настоящий текст задания шесть.</p>
        </div>
      </body></html>`);
      const result = await extractViaDom(page, [6, 7]);
      assert.ok(result[6], "ожидался найденный контейнер для №6");
      assert.ok(
        /Видимый настоящий текст/.test(result[6].text),
        `выбран не тот контейнер: ${JSON.stringify(result[6].text)}`,
      );
      assert.ok(
        !/скрытый чужой блок/.test(result[6].text),
        "скрытый блок не должен попадать в текст видимого контейнера",
      );
    });

    await check("№6, унесённый far off-screen (translateX), не выбирается вместо видимого", async () => {
      await page.setContent(`<!doctype html><html><body>
        <div style="position:absolute; transform: translateX(-99999px);">
          <h3>Задание 6</h3>
          <p>Карусель: невидимый в данный момент слайд с чужим текстом задания шесть.</p>
        </div>
        <div>
          <h3>Задание 6</h3>
          <p>Отредактируйте предложение: исправьте лексическую ошибку, заменив неверно употреблённое слово. Выпишите это слово.</p>
          <p>Активный слайд карусели с настоящим текстом.</p>
        </div>
      </body></html>`);
      const result = await extractViaDom(page, [6, 7]);
      assert.ok(result[6], "ожидался найденный контейнер для №6");
      assert.ok(
        /Активный слайд карусели/.test(result[6].text),
        `выбран не тот контейнер: ${JSON.stringify(result[6].text)}`,
      );
    });

    await check("visibility:hidden блок игнорируется", async () => {
      await page.setContent(`<!doctype html><html><body>
        <div style="visibility:hidden">
          <h3>Задание 7</h3>
          <p>Спрятанный через visibility:hidden чужой блок.</p>
        </div>
        <div>
          <h3>Задание 7</h3>
          <p>В одном из выделенных ниже слов допущена ошибка в образовании формы слова.</p>
          <p>ПЯТЬЮСТАМИ рублями было решено оплатить проезд.</p>
        </div>
      </body></html>`);
      const result = await extractViaDom(page, [6, 7]);
      assert.ok(result[7], "ожидался найденный контейнер для №7");
      assert.ok(!/Спрятанный через/.test(result[7].text));
    });
  } finally {
    await browser.close();
  }

  console.log(`\n${failed === 0 ? "Все тесты пройдены" : "ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ"} (${passed}/${passed + failed}).`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("ОШИБКА:", e);
  process.exit(1);
});
