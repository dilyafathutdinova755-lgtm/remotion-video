#!/usr/bin/env node
/**
 * Печатает в stdout voiceover_text из task_data.json, пропущенный через
 * normalizeForVoiceover() — именно этот текст (а не сырой task_data) должен
 * идти и в TTS, и в align.py: раз в аудио звучат слова («шесть»), а не
 * цифры («6»), то и подсчёт слов для тайминга должен опираться на тот же
 * текст, который реально произнесён, иначе ожидаемые позиции границ (см.
 * align.py) немного разъедутся на текстах с длинными числами.
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
if (!taskData.voiceover_text) {
  console.error('ОШИБКА: в task_data нет поля "voiceover_text"');
  process.exit(1);
}

process.stdout.write(normalizeForVoiceover(taskData.voiceover_text));
