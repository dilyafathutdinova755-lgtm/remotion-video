#!/usr/bin/env node
/**
 * Собирает public/audio/experiment-math-vessels.mp3 — черновую озвучку
 * этого ОДНОРАЗОВОГО локального эксперимента (НЕ часть контент-завода,
 * НЕ production-нормализатор n8n — тот отдельный узел этот скрипт не
 * трогает и не заменяет).
 *
 * Голос: espeak-ng (локальный, офлайн, бесплатный синтез — НЕ ElevenLabs,
 * НЕ платный внешний запрос). Качество голоса черновое/роботизированное —
 * это явно обозначенный аниматик-с-голосом, не финальная озвучка.
 *
 * Тайминг — НЕ оценка на глаз: каждая реплика синтезируется отдельным
 * файлом, его длительность измеряется реальным ffmpeg, мастер-трек
 * собирается конкатенацией этих же файлов + тишины точно заданной длины
 * (включая обязательные ровно 2.000с паузы после условия) — секунды в
 * timing.ts совпадают с тем, как построен сам файл, 1:1.
 *
 * Требует установленный espeak-ng (`apt-get install espeak-ng` или
 * аналог) — чисто локальная зависимость, без сети/оплаты.
 *
 * Использование:
 *   node src/experiments/math-vessels/generate-audio.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const FFMPEG = path.join(REPO_ROOT, "node_modules", "@remotion", "compositor-linux-x64-gnu", "ffmpeg");
const OUT_MP3 = path.join(REPO_ROOT, "public", "audio", "experiment-math-vessels.mp3");

if (!existsSync(FFMPEG)) {
  console.error(`ОШИБКА: ffmpeg не найден по пути ${FFMPEG} — запустите npm ci в корне репозитория.`);
  process.exit(1);
}
try {
  execFileSync("espeak-ng", ["--version"], { stdio: "ignore" });
} catch {
  console.error(
    "ОШИБКА: espeak-ng не найден в PATH. Установите локально (например, apt-get install espeak-ng) — " +
      "без сети/оплаты; это офлайн-синтезатор, используемый ТОЛЬКО для этого черновика.",
  );
  process.exit(1);
}

/**
 * Реплики ровно по сценарию из ТЗ эксперимента (см. CONDITION_TEXT в
 * MathVesselsMain.tsx — экранный текст условия совпадает дословно, здесь
 * же условие разбито на 4 клаузы по смысловым триггерам сосудов/подписей).
 */
const BEAT_TEXT = {
  intro: "Решаем задание десять по профильной математике из приложения ЕГЭ Тренажёр.",
  c1: "К восьми килограммам десятипроцентного раствора соли",
  c2: "добавили тридцатипроцентный раствор той же соли.",
  c3: "Сколько килограммов тридцатипроцентного раствора нужно добавить,",
  c4: "чтобы получить двадцатипроцентный раствор?",
  d1: "В первом растворе восемь десятых килограмма соли.",
  d2: "В добавленном — три десятых икс килограмма.",
  d3: "Масса смеси — восемь плюс икс.",
  d4: "Соль составляет двадцать процентов этой массы.",
  d5: "Составляем уравнение.",
  d6: "Раскрываем скобки и переносим слагаемые.",
  d7: "Одна десятая икс равна восьми десятым.",
  d8: "Значит, нужно добавить восемь килограммов.",
  cta: "Ссылка на ЕГЭ Тренажёр в шапке профиля.",
};

/** Порядок + зазор ПЕРЕД каждой репликой (сек) — должен совпадать с timing.ts. */
const TIMELINE = [
  { id: "intro", gapBefore: 0.0, kind: "intro" },
  { id: "c1", gapBefore: 0.45, kind: "condition" },
  { id: "c2", gapBefore: 0.3, kind: "condition" },
  { id: "c3", gapBefore: 0.35, kind: "condition" },
  { id: "c4", gapBefore: 0.25, kind: "condition" },
  { id: "__pause__", gapBefore: 0, kind: "pause", fixedDuration: 2.0 },
  { id: "d1", gapBefore: 0.45, kind: "step1" },
  { id: "d2", gapBefore: 0.3, kind: "step1" },
  { id: "d3", gapBefore: 0.45, kind: "step2" },
  { id: "d4", gapBefore: 0.3, kind: "step2" },
  { id: "d5", gapBefore: 0.3, kind: "step2" },
  { id: "d6", gapBefore: 0.45, kind: "step3" },
  { id: "d7", gapBefore: 0.3, kind: "step3" },
  { id: "d8", gapBefore: 0.35, kind: "step3" },
  { id: "cta", gapBefore: 0.65, kind: "cta" },
];

function probe(file) {
  try {
    execFileSync(FFMPEG, ["-i", file], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    const out = e.stderr.toString();
    const dm = out.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    const am = out.match(/Audio:.*?(\d+)\s*Hz,\s*(mono|stereo)/);
    if (!dm || !am) throw new Error(`probe failed for ${file}\n${out}`);
    const [, h, mnt, s] = dm;
    return {
      durationSec: Number(h) * 3600 + Number(mnt) * 60 + Number(s),
      rate: Number(am[1]),
      channels: am[2] === "mono" ? 1 : 2,
    };
  }
  throw new Error(`ffmpeg unexpectedly produced no stderr for ${file}`);
}

const workDir = mkdtempSync(path.join(tmpdir(), "math-vessels-audio-"));

for (const [id, text] of Object.entries(BEAT_TEXT)) {
  execFileSync("espeak-ng", ["-v", "ru", "-s", "158", "-p", "42", "-g", "8", "-w", path.join(workDir, `${id}.wav`), text]);
}

// Формат бит-файлов задаёт espeak-ng (НЕ предполагаем 44100 — именно это
// расхождение однажды уже испортило длительность мастер-трека, см. отчёт).
const introProbe = probe(path.join(workDir, "intro.wav"));
const RATE = introProbe.rate;
const CHANNELS = introProbe.channels;
const CL = CHANNELS === 1 ? "mono" : "stereo";

let cursor = 0;
const events = [];
const concatParts = [];
let gapIdx = 0;

const silenceFile = (sec, tag) => {
  const p = path.join(workDir, `silence-${tag}.wav`);
  execFileSync(FFMPEG, ["-y", "-f", "lavfi", "-i", `anullsrc=r=${RATE}:cl=${CL}:d=${sec.toFixed(3)}`, p]);
  return p;
};

for (const item of TIMELINE) {
  if (item.kind === "pause") {
    concatParts.push(silenceFile(item.fixedDuration, "pause"));
    events.push({ id: "pause", kind: "pause", startSec: cursor, endSec: cursor + item.fixedDuration });
    cursor += item.fixedDuration;
    continue;
  }
  if (item.gapBefore > 0) {
    concatParts.push(silenceFile(item.gapBefore, `gap${gapIdx++}`));
    cursor += item.gapBefore;
  }
  const beatFile = path.join(workDir, `${item.id}.wav`);
  const p = probe(beatFile);
  if (p.rate !== RATE || p.channels !== CHANNELS) {
    throw new Error(`${item.id}.wav: ${p.rate}Hz/${p.channels}ch, ожидали ${RATE}Hz/${CHANNELS}ch — espeak-ng формат разъехался между репликами.`);
  }
  concatParts.push(beatFile);
  events.push({ id: item.id, kind: item.kind, startSec: cursor, endSec: cursor + p.durationSec, durationSec: p.durationSec });
  cursor += p.durationSec;
}

const totalSec = cursor;
const listPath = path.join(workDir, "concat_list.txt");
writeFileSync(listPath, concatParts.map((p) => `file '${p}'`).join("\n"), "utf8");

const masterWav = path.join(workDir, "master.wav");
execFileSync(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", masterWav]);
execFileSync(FFMPEG, ["-y", "-i", masterWav, "-ar", "44100", "-ac", "2", "-b:a", "160k", OUT_MP3]);

console.log(`Готово: ${OUT_MP3}`);
console.log(`totalSec = ${totalSec}`);
console.log("Сверьте events[] ниже с BEATS в timing.ts, если меняли TIMELINE/BEAT_TEXT:");
console.log(JSON.stringify(events, null, 2));
