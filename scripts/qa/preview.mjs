/* CI-only smoke preview. Never calls n8n, Claude, ElevenLabs or Postmypost.
 * Uses two fixed TEST tasks, synthetic timing and a silent WAV.
 * Restores _dynamic.generated.tsx byte-for-byte even if rendering fails. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const remotion = resolve(root, 'node_modules/.bin/remotion');
const tsc = resolve(root, 'node_modules/.bin/tsc');

if (!existsSync(remotion) || !existsSync(tsc)) {
  throw new Error('Install locked dependencies with npm ci before the preview.');
}

const theme = readFileSync(resolve(root, 'src/ege/theme.ts'), 'utf8');
const match = theme.match(/export const VIDEO\s*=\s*\{[\s\S]*?fps:\s*(\d+)/);

if (!match) {
  throw new Error('Cannot read VIDEO.fps: update the QA fixture explicitly.');
}

const fps = Number(match[1]);
const generated = resolve(root, 'src/ege/tasks/_dynamic.generated.tsx');
const original = readFileSync(generated);
const work = mkdtempSync(join(tmpdir(), 'remotion-qa-'));
const audioRelative = `qa/silence-${process.pid}-${Date.now()}.wav`;
const audioPath = resolve(root, 'public', audioRelative);
const outputDir = resolve(root, 'out/qa/preview');

mkdirSync(resolve(root, 'public/qa'), { recursive: true });
mkdirSync(outputDir, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    timeout: 300_000,
  });

  if (result.error) throw result.error;

  if (result.status !== 0) {
    throw new Error(`${command} failed with exit ${result.status}`);
  }
}

function silentWav(seconds) {
  const sampleRate = 48_000;
  const dataSize = seconds * sampleRate * 2;
  const wav = Buffer.alloc(44 + dataSize);

  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);

  return wav;
}

const instruction6 =
  'Отредактируйте предложение: исправьте лексическую ошибку, исключив лишнее слово. Выпишите это слово.';

const instruction7 =
  'В одном из выделенных ниже слов допущена ошибка в образовании формы слова. Исправьте ошибку и запишите слово правильно.';

const fixtures = [
  {
    task_number: 6,
    instruction: instruction6,
    condition_text:
      'Этот исключительно эксклюзивный автомобиль, вид которого отсылает к 1930-м годам, был изготовлен в 2008 году по заказу коллекционера Ролланда Холла.',
    incorrect_fragment: 'исключительно',
    answer: 'исключительно',
    explanation:
      'Слово «исключительно» лишнее, так как его значение уже выражено словом «эксклюзивный».',
  },
  {
    task_number: 7,
    instruction: instruction7,
    condition_text:
      'ПРОПОЛОЩИ бельё\nдетские ДОКТОРА\nШЕСТИСТАМИ солдатами\nу неё более ГРОМКИЙ голос\nСОЖЖЕТ письмо',
    incorrect_fragment: 'ШЕСТИСТАМИ',
    answer: 'шестьюстами',
    explanation:
      'Правильно — шестьюстами: в творительном падеже изменяются обе части числительного.',
  },
];

const sync = {
  introSec: 3,
  answerSec: 11,
  outroSec: 15,
  totalSec: 18,
};

try {
  writeFileSync(audioPath, silentWav(sync.totalSec));

  for (const fixture of fixtures) {
    const task = {
      ...fixture,
      exam: 'ЕГЭ',
      subject: 'русский',
      account: 'ege_russian',
      video_structure_version: 'four-slides-v1',
      intro_text: `Решаем задание ${fixture.task_number} из приложения «ЕГЭ Тренажёр».`,
      task_voiceover_text: fixture.instruction,
      answer_voiceover_text: fixture.explanation,
      cta_text: 'Скачивай бесплатно. Ссылка в шапке профиля.',
      pause_seconds: 2,
      pause_prompt: 'Ставь на паузу',
      read_task_aloud: true,
    };

    const dataPath = join(work, 'task.json');
    const syncPath = join(work, 'align.json');
    const idPath = join(work, 'id.txt');

    writeFileSync(dataPath, JSON.stringify(task));
    writeFileSync(syncPath, JSON.stringify(sync));

    run(process.execPath, [
      'scripts/dynamic-task/build-dynamic-task.mjs',
      '--task-id',
      `qa-russian-${fixture.task_number}`,
      '--task-data',
      dataPath,
      '--align',
      syncPath,
      '--audio-src',
      audioRelative,
      '--out',
      generated,
      '--id-out',
      idPath,
    ]);

    run(tsc, ['--noEmit']);

    const id = readFileSync(idPath, 'utf8').trim();

    for (const [name, second] of [
      ['title', 1.5],
      ['problem', 10],
      ['answer', 14],
      ['cta', 17],
    ]) {
      run(remotion, [
        'still',
        'src/index.ts',
        id,
        join(outputDir, `russian-${fixture.task_number}-${name}.png`),
        `--frame=${Math.round(second * fps)}`,
        '--scale=0.5',
      ]);
    }

    if (fixture.task_number === 7) {
      run(remotion, [
        'render',
        'src/index.ts',
        id,
        join(outputDir, 'russian-7-transition.mp4'),
        `--frames=${Math.round(10 * fps)}-${Math.round(13 * fps) - 1}`,
        '--muted',
        '--scale=0.5',
      ]);
    }
  }

  writeFileSync(
    join(outputDir, 'README.txt'),
    'QA only: 2 fixed test tasks; silent audio and synthetic timing.\n' +
      'Eight frames plus a muted 3-second Problem-to-Answer clip.\n' +
      'Not a live TTS/alignment test and not an Instagram publication.\n' +
      'Review these images visually; no golden-pixel comparison is claimed.\n',
  );
} finally {
  writeFileSync(generated, original);
  rmSync(audioPath, { force: true });
  rmSync(work, { recursive: true, force: true });
}
