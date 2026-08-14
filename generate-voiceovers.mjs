/**
 * Озвучка ответов из tasks.csv через ElevenLabs.
 *
 * Читает tasks.csv (колонки id, answer), прогоняет каждый answer через
 * text-to-speech и складывает результат в audio/{id}.mp3.
 *
 *   node generate-voiceovers.mjs                # все строки
 *   node generate-voiceovers.mjs --limit 2      # только первые две
 *   node generate-voiceovers.mjs --dry-run      # без обращений к API
 *   node generate-voiceovers.mjs --force        # перезаписать готовые файлы
 *
 * Ключ берётся из ELEVENLABS_API_KEY (переменная окружения или .env).
 *
 * Если сеть за прокси, Node-овский fetch сам его не читает — запускайте с
 * NODE_USE_ENV_PROXY=1 (Node >= 22.21).
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const ROOT = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(ROOT, "tasks.csv");
const AUDIO_DIR = join(ROOT, "audio");

const VOICE_ID = "HLXBCncM2sIxwTmiIZg8";
const MODEL_ID = "eleven_v3";
const ENDPOINT = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

/** Пауза между запросами, чтобы не упереться в лимиты. */
const DELAY_MS = 600;
const MAX_ATTEMPTS = 3;

// --- аргументы -------------------------------------------------------------

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(name);
const flagValue = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};

const DRY_RUN = hasFlag("--dry-run");
const FORCE = hasFlag("--force");
const LIMIT = flagValue("--limit") === undefined ? Infinity : Number(flagValue("--limit"));

if (!Number.isFinite(LIMIT) && LIMIT !== Infinity) {
  console.error("--limit ожидает число");
  process.exit(1);
}

// --- разбор CSV ------------------------------------------------------------

/**
 * Разбор CSV по RFC 4180: кавычки, запятые и переводы строк внутри полей,
 * удвоенная кавычка как экранированная. Наивный split(",") здесь ломается —
 * в ответах встречаются и запятые, и кавычки.
 */
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
};

const readTasks = async () => {
  const rows = parseCsv(await readFile(CSV_PATH, "utf8"));
  if (!rows.length) throw new Error(`${CSV_PATH}: файл пуст`);

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idAt = header.indexOf("id");
  const answerAt = header.indexOf("answer");

  if (idAt === -1 || answerAt === -1) {
    throw new Error(`${CSV_PATH}: нужны колонки "id" и "answer", а есть: ${header.join(", ")}`);
  }

  return rows.slice(1).map((cells, n) => ({
    line: n + 2, // +1 за заголовок, +1 за нумерацию с единицы
    id: (cells[idAt] ?? "").trim(),
    answer: (cells[answerAt] ?? "").trim(),
  }));
};

/** id уезжает в имя файла — не пускаем в него слеши и прочее. */
const isSafeId = (id) => /^[A-Za-z0-9._-]+$/.test(id);

// --- ElevenLabs ------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const synthesize = async (text, apiKey) => {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({ text, model_id: MODEL_ID }),
      });
    } catch (cause) {
      // Сеть не ответила — есть смысл повторить
      lastError = new Error(`сеть недоступна: ${cause.message}`);
      if (attempt < MAX_ATTEMPTS) await sleep(DELAY_MS * 2 ** attempt);
      continue;
    }

    if (res.ok) return Buffer.from(await res.arrayBuffer());

    const body = await res.text().catch(() => "");
    const detail = body.slice(0, 300);

    // 4xx (кроме 429) повторять бессмысленно — ключ или текст не те
    if (res.status !== 429 && res.status < 500) {
      throw new Error(`HTTP ${res.status}: ${detail}`);
    }

    lastError = new Error(`HTTP ${res.status}: ${detail}`);
    if (attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : DELAY_MS * 2 ** attempt);
    }
  }

  throw lastError;
};

// --- основной проход -------------------------------------------------------

const main = async () => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey && !DRY_RUN) {
    console.error(
      "ELEVENLABS_API_KEY не задан.\n" +
        "Положите ключ в .env рядом со скриптом:\n" +
        "  ELEVENLABS_API_KEY=ваш_ключ\n" +
        "или запустите с --dry-run, чтобы проверить разбор CSV без обращений к API.",
    );
    process.exit(1);
  }

  const all = await readTasks();
  const tasks = all.slice(0, LIMIT);

  console.log(
    `${CSV_PATH}: строк ${all.length}` +
      (tasks.length < all.length ? `, берём первые ${tasks.length}` : "") +
      (DRY_RUN ? "  [dry-run, запросов не будет]" : ""),
  );

  await mkdir(AUDIO_DIR, { recursive: true });

  let done = 0;
  let skipped = 0;
  const failures = [];

  for (const task of tasks) {
    const label = task.id || `строка ${task.line}`;

    if (!task.id || !task.answer) {
      failures.push({ label, reason: "пустой id или answer" });
      console.log(`  ✗ ${label}: пустой id или answer`);
      continue;
    }
    if (!isSafeId(task.id)) {
      failures.push({ label, reason: "id содержит недопустимые для имени файла символы" });
      console.log(`  ✗ ${label}: недопустимый id`);
      continue;
    }

    const out = join(AUDIO_DIR, `${task.id}.mp3`);

    if (!FORCE) {
      const exists = await access(out).then(
        () => true,
        () => false,
      );
      if (exists) {
        skipped++;
        console.log(`  → ${task.id}: уже есть, пропускаю (--force чтобы перезаписать)`);
        continue;
      }
    }

    if (DRY_RUN) {
      console.log(`  · ${task.id}: ${task.answer.length} симв. → audio/${task.id}.mp3`);
      done++;
      continue;
    }

    try {
      const audio = await synthesize(task.answer, apiKey);
      await writeFile(out, audio);
      console.log(`  ✓ ${task.id}: ${(audio.length / 1024).toFixed(1)} КБ → audio/${task.id}.mp3`);
      done++;
    } catch (err) {
      failures.push({ label, reason: err.message });
      console.log(`  ✗ ${task.id}: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(
    `\nГотово: ${done}` +
      (skipped ? `, пропущено: ${skipped}` : "") +
      (failures.length ? `, с ошибками: ${failures.length}` : ""),
  );

  if (failures.length) process.exitCode = 1;
};

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
