#!/usr/bin/env node
/**
 * Печатает в stdout текст, который реально соответствует звучащему аудио —
 * именно ЕГО (а не сырой voiceover_text) должен получать align.py для
 * тайминга, раз в аудио звучат слова («шесть»), а не цифры («6»).
 *
 * Источник истины (см. PLAYBOOK.md §11c, «одна логика для n8n и GitHub»):
 *   - если task_data.voiceover_tts_text уже есть — это ТОТ САМЫЙ текст,
 *     что n8n отправил в ElevenLabs (сгенерирован той же
 *     normalize-for-voiceover.mjs через generated/n8n-normalize-for-
 *     elevenlabs.js). Печатаем его как есть, БЕЗ повторной нормализации —
 *     повторный прогон через чуть другую версию правил не гарантированно
 *     даст побайтово ту же строку, что реально ушла в TTS.
 *   - если поля нет (n8n ещё не обновлён / ручной тест без него) —
 *     считаем сами, как раньше, по task_data.voiceover_text + subject.
 *
 * Использование: node print-normalized-voiceover.mjs task_data.json
 */
import { readFileSync } from "node:fs";
import { normalizeForVoiceover } from "./normalize-for-voiceover.mjs";

const path = process.argv[2];
if (!path) {
  console.error("ОШИБКА: укажите путь к task_data.json первым аргументом");
  process.exit(1);
}

const taskData = JSON.parse(readFileSync(path, "utf8"));

if (taskData.voiceover_tts_text) {
  process.stdout.write(taskData.voiceover_tts_text);
} else {
  if (!taskData.voiceover_text) {
    console.error('ОШИБКА: в task_data нет ни "voiceover_tts_text", ни "voiceover_text"');
    process.exit(1);
  }
  console.error(
    'Предупреждение: в task_data нет "voiceover_tts_text" — считаю сама по voiceover_text/subject ' +
      "(n8n ещё не прислал готовый TTS-текст; результат может чуть отличаться от того, что реально ушло в ElevenLabs).",
  );
  process.stdout.write(normalizeForVoiceover(taskData.voiceover_text, taskData.subject));
}
