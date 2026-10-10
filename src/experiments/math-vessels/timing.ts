/**
 * ИЗМЕРЕННЫЙ тайминг чернового озвучивания (espeak-ng, локальный офлайн
 * синтез — см. отчёт по эксперименту). Эти секунды — не оценка на глаз:
 * каждая реплика синтезирована отдельным файлом, её длительность измерена
 * реальным ffmpeg (`ffmpeg -i`), и мастер-трек (public/audio/experiment-
 * math-vessels.mp3) собран конкатенацией этих же файлов + тишины заданной
 * длины (включая обязательные ровно 2.000с паузы) — никакого forced
 * alignment здесь не нужно: тайминг сцены просто совпадает с тем, как
 * построен сам аудиофайл.
 *
 * ВАЖНО: голос — черновой (espeak-ng, не ElevenLabs, не production-голос).
 * Это намеренно обозначенный черновик для оценки визуала/синхронизации, а
 * не финальная озвучка.
 */
export type BeatId =
  | "intro"
  | "c1"
  | "c2"
  | "c3"
  | "c4"
  | "pause"
  | "d1"
  | "d2"
  | "d3"
  | "d4"
  | "d5"
  | "d6"
  | "d7"
  | "d8"
  | "cta";

export type Beat = {
  id: BeatId;
  kind: "intro" | "condition" | "pause" | "step1" | "step2" | "step3" | "cta";
  startSec: number;
  endSec: number;
};

export const TOTAL_SEC = 58.70999999999999;

export const BEATS: Beat[] = [
  { id: "intro", kind: "intro", startSec: 0, endSec: 5.79 },
  { id: "c1", kind: "condition", startSec: 6.24, endSec: 10.43 },
  { id: "c2", kind: "condition", startSec: 10.73, endSec: 14.74 },
  { id: "c3", kind: "condition", startSec: 15.09, endSec: 19.7 },
  { id: "c4", kind: "condition", startSec: 19.95, endSec: 23.3 },
  { id: "pause", kind: "pause", startSec: 23.3, endSec: 25.3 },
  { id: "d1", kind: "step1", startSec: 25.75, endSec: 29.62 },
  { id: "d2", kind: "step1", startSec: 29.92, endSec: 33.64 },
  { id: "d3", kind: "step2", startSec: 34.09, endSec: 37.07 },
  { id: "d4", kind: "step2", startSec: 37.37, endSec: 41.239999999999995 },
  { id: "d5", kind: "step2", startSec: 41.53999999999999, endSec: 43.43999999999999 },
  { id: "d6", kind: "step3", startSec: 43.88999999999999, endSec: 47.10999999999999 },
  { id: "d7", kind: "step3", startSec: 47.40999999999999, endSec: 50.65999999999999 },
  { id: "d8", kind: "step3", startSec: 51.00999999999999, endSec: 54.47999999999999 },
  { id: "cta", kind: "cta", startSec: 55.12999999999999, endSec: 58.70999999999999 },
];

export const beat = (id: BeatId): Beat => {
  const b = BEATS.find((x) => x.id === id);
  if (!b) throw new Error(`timing.ts: неизвестный beat id "${id}"`);
  return b;
};

/** Условие читается c1..c4 — ровно то, от чего зависит полоска прогресса (НЕ intro). */
export const CONDITION_START_SEC = beat("c1").startSec;
export const CONDITION_END_SEC = beat("c4").endSec;

/** Кадр (на заданном fps) для абсолютной секунды мастер-трека. */
export const secToFrame = (fps: number, sec: number): number => Math.round(sec * fps);
