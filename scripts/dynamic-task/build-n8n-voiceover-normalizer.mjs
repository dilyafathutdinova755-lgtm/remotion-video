#!/usr/bin/env node
/**
 * Собирает self-contained JS для n8n Code node из ЕДИНСТВЕННОГО источника
 * правды — normalize-for-voiceover.mjs. Никогда не редактируйте
 * generated/n8n-normalize-for-elevenlabs.js руками: он перезаписывается
 * этим скриптом и должен оставаться байт-в-байт тем же алгоритмом, что
 * считает тайминг в GitHub Actions (см. PLAYBOOK.md §11c) — иначе n8n и
 * рендер разойдутся в том, что именно услышал ElevenLabs.
 *
 * Делает простую текстовую трансформацию: убирает ключевые слова ESM
 * export/import (в исходнике их и так нет — модуль ничего не импортирует),
 * добавляет в конец готовый обработчик для n8n Code node ("Run Once for
 * All Items" — самый частый режим; если у вас "Run Once for Each Item",
 * замените последний блок на использование $json вместо $input.all()).
 *
 * Использование:
 *   node build-n8n-voiceover-normalizer.mjs \
 *     --source normalize-for-voiceover.mjs \
 *     --out ../../generated/n8n-normalize-for-elevenlabs.js
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : def;
};

const sourcePath = flag("source", new URL("./normalize-for-voiceover.mjs", import.meta.url).pathname);
const outPath = flag("out", new URL("../../generated/n8n-normalize-for-elevenlabs.js", import.meta.url).pathname);

const source = readFileSync(sourcePath, "utf8");

// Убираем ESM export-ключевые слова, оставляя сами объявления — при таком
// как в этом файле составе (только export const / export function, без
// import) это безопасная чисто текстовая замена. Шебанг ("#!/usr/bin/env
// node") тоже убираем — валиден только первой строкой файла, а здесь он
// окажется в середине после баннера и сломает синтаксис.
const stripped = source
  .replace(/^#!.*\n/, "")
  .replace(/^export const /gm, "const ")
  .replace(/^export function /gm, "function ");

const DRIVER = `
// ---------------------------------------------------------------------------
// n8n Code node driver — добавлено генератором, не часть исходного модуля.
// Режим "Run Once for All Items" (самый частый выбор для Code node в n8n).
// Если ваша нода настроена на "Run Once for Each Item" — замените блок ниже
// на:
//   const item = $input.item;
//   const subject = item.json.subject;
//   const ttsText = normalizeForVoiceover(item.json.voiceover_text, subject);
//   return { json: { ...item.json, voiceover_tts_text: ttsText,
//     tts_normalization_warnings: findUnsafeTtsTokens(ttsText),
//     tts_normalizer_version: TTS_NORMALIZER_VERSION } };
// ---------------------------------------------------------------------------
return $input.all().map((item) => {
  const subject = item.json.subject;
  const voiceoverText = item.json.voiceover_text;
  const ttsText = normalizeForVoiceover(voiceoverText, subject);
  return {
    json: {
      ...item.json,
      // voiceover_text (и все остальные поля item.json) остаются исходными —
      // эта функция ничего не меняет на видео, только добавляет копию для TTS.
      voiceover_tts_text: ttsText,
      tts_normalization_warnings: findUnsafeTtsTokens(ttsText),
      tts_normalizer_version: TTS_NORMALIZER_VERSION,
    },
  };
});
`;

const banner = `// АВТОГЕНЕРИРОВАНО build-n8n-voiceover-normalizer.mjs из
// scripts/dynamic-task/normalize-for-voiceover.mjs — НЕ РЕДАКТИРОВАТЬ РУКАМИ.
// Скопируйте это целиком в n8n Code node (JavaScript) перед узлом ElevenLabs.
// Источник: ${sourcePath.split("/").pop()}, версия нормализатора см. ниже
// (TTS_NORMALIZER_VERSION). Пере-сгенерировать после правок исходника:
//   node scripts/dynamic-task/build-n8n-voiceover-normalizer.mjs
`;

const finalSource = `${banner}\n${stripped}\n${DRIVER}`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, finalSource, "utf8");
console.log(`Сгенерирован ${outPath} (${finalSource.length} символов)`);
