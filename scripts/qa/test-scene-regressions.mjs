/* Fast component-structure tests, NOT pixel/screenshot tests.
 * Remotion hooks and spring are mocked. tsc + bundle + preview remain
 * separate mandatory checks in the validation workflow. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { contracts, root, validateSceneSource } from './check-scenes.mjs';

const problemContract = contracts[0];
const answerContract = contracts[1];
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const problem = read(problemContract.path);
const answer = read(answerContract.path);

for (const c of contracts) {
  test(`${c.component}: one valid component export`, () =>
    validateSceneSource(read(c.path), c),
  );
}

test('Duplicating ProblemScene is rejected before production', () => {
  assert.throws(
    () => validateSceneSource(`${problem}\n${problem}`, problemContract),
    /ONE export/,
  );
});

for (const name of ['showIncorrectContext', 'sceneOpacity']) {
  test(`A // comment swallowing ${name} is rejected`, () => {
    const changed = answer.replace(
      new RegExp(`const ${name} =\\s*[\\s\\S]*?;`),
      (s) => `// ${s.replace(/\s+/g, ' ')}`,
    );

    assert.notEqual(changed, answer);

    assert.throws(
      () => validateSceneSource(changed, answerContract),
      /real declaration/,
    );
  });
}

function interpolate(value, inputs, outputs) {
  const p = Math.max(
    0,
    Math.min(
      1,
      (value - inputs[0]) /
        (inputs[1] - inputs[0]),
    ),
  );

  return outputs[0] + (outputs[1] - outputs[0]) * p;
}

function evaluate(text, dependencies) {
  const compiled = ts.transpileModule(text, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const exports = {};

  vm.runInNewContext(
    compiled,
    {
      exports,
      require: (name) => {
        assert.ok(
          Object.hasOwn(dependencies, name),
          `Unexpected dependency: ${name}`,
        );

        return dependencies[name];
      },
    },
    {
      timeout: 2000,
    },
  );

  return exports;
}

const theme = evaluate(
  read('src/ege/theme.ts'),
  {},
);

const highlight = evaluate(
  read('src/ege/scenes/four-slides/highlight.ts'),
  {},
);

const types = evaluate(
  read('src/ege/tasks/types.ts'),
  {},
);

const timing = evaluate(
  read('src/ege/timing.ts'),
  {
    './theme': theme,
    './tasks/types': types,
  },
);

const jsx = (type, props) => ({
  type,
  props,
});

const baseTask = {
  videoStructureVersion: 'four-slides-v1',
  subject: 'русский',
  number: 7,
  instruction: 'Исправьте ошибку и запишите слово правильно.',
  conditionLines: [
    'ПРОПОЛОЩИ бельё',
    'детские ДОКТОРА',
    'ШЕСТИСТАМИ солдатами',
    'у неё более ГРОМКИЙ голос',
    'СОЖЖЕТ письмо',
  ],
  answer: 'шестьюстами',
  incorrectContext: 'ШЕСТИСТАМИ солдатами',
  explanation: 'Объяснение должно быть только на слайде ответа.',
  pauseSeconds: 2,
  pausePrompt: 'Ставь на паузу',
};

function scene(
  source,
  name,
  task,
  frame,
  durationInFrames,
  fps = 60,
) {
  const deps = {
    'react/jsx-runtime': {
      jsx,
      jsxs: jsx,
    },
    remotion: {
      AbsoluteFill: 'AbsoluteFill',
      useCurrentFrame: () => frame,
      useVideoConfig: () => ({
        fps,
        durationInFrames,
      }),
      interpolate,
      spring: ({
        frame: local,
        durationInFrames: length,
      }) =>
        Math.max(
          0,
          Math.min(
            1,
            local / length,
          ),
        ),
    },
    '../../theme': theme,
    '../../timing': {
      f30: (n) =>
        Math.round(
          (n * fps) / 30,
        ),
    },
    '../../TaskContext': {
      useTask: () => task,
    },
    '../../tasks/types': types,
    '../../ProblemText': {
      ProblemCard: 'ProblemCard',
      Pill: 'Pill',
    },
    '../../FlowLines': {
      FlowLines: 'FlowLines',
    },
    './highlight': highlight,
  };

  return evaluate(
    source,
    deps,
  )[name]();
}

function all(node) {
  if (Array.isArray(node)) {
    return node.flatMap(all);
  }

  if (!node || typeof node !== 'object') {
    return [];
  }

  return [
    node,
    ...all(node.props?.children),
  ];
}

function text(node) {
  if (Array.isArray(node)) {
    return node.map(text).join('');
  }

  if (
    typeof node === 'string' ||
    typeof node === 'number'
  ) {
    return String(node);
  }

  return node && typeof node === 'object'
    ? text(node.props?.children)
    : '';
}

function problemAt(
  frame,
  length,
  task = baseTask,
  fps = 60,
) {
  return scene(
    problem,
    'FourSlidesProblemScene',
    task,
    frame,
    length,
    fps,
  );
}

test(
  'Instruction outside card; all material inside; explanation absent on Task',
  () => {
    const tree = problemAt(
      479,
      480,
    );

    const card = all(tree).find(
      (x) =>
        x.type === 'ProblemCard',
    );

    assert.ok(card);

    assert.ok(
      text(tree).includes(
        baseTask.instruction,
      ),
    );

    assert.ok(
      !text(card).includes(
        baseTask.instruction,
      ),
    );

    for (const line of baseTask.conditionLines) {
      assert.ok(
        text(card).includes(line),
      );
    }

    assert.ok(
      !text(tree).includes(
        baseTask.explanation,
      ),
    );
  },
);

test(
  'Every checked ALL CAPS word retains its exact text and accent styling',
  () => {
    const tree = problemAt(
      479,
      480,
    );

    const highlighted = all(tree).filter(
      (x) =>
        x.type === 'span' &&
        x.props.style?.color ===
          theme.COLORS.accent,
    );

    assert.deepEqual(
      highlighted.map(text),
      [
        'ПРОПОЛОЩИ',
        'ДОКТОРА',
        'ШЕСТИСТАМИ',
        'ГРОМКИЙ',
        'СОЖЖЕТ',
      ],
    );
  },
);

test(
  'Task rows are revealed progressively',
  () => {
    const tree = problemAt(
      50,
      480,
    );

    const card = all(tree).find(
      (x) =>
        x.type === 'ProblemCard',
    );

    const rows =
      card.props.children[0].props.children;

    assert.equal(
      rows[0].props.style.opacity,
      1,
    );

    assert.equal(
      rows[4].props.style.opacity,
      0,
    );
  },
);

for (const fps of [30, 60]) {
  for (const seconds of [6, 8, 13]) {
    test(
      `Dynamic bar and 2-second pause: ${seconds}s scene at ${fps}fps`,
      () => {
        const duration =
          seconds * fps;

        const start =
          duration - 2 * fps;

        const bar = (frame) =>
          all(
            problemAt(
              frame,
              duration,
              baseTask,
              fps,
            ),
          ).find((x) =>
            x.props.style?.transform?.startsWith(
              'scaleX(',
            ),
          );

        assert.equal(
          bar(0).props.style.transform,
          'scaleX(0)',
        );

        assert.equal(
          bar(duration - 1)
            .props.style.transform,
          'scaleX(1)',
        );

        assert.equal(
          bar(duration - 1)
            .props.style.transformOrigin,
          'left center',
        );

        const progress =
          Number(
            bar(
              Math.floor(
                duration / 2,
              ),
            ).props.style.transform.slice(
              7,
              -1,
            ),
          );

        assert.ok(
          progress > 0.49 &&
            progress < 0.52,
        );

        const prompt = (frame) =>
          all(
            problemAt(
              frame,
              duration,
              baseTask,
              fps,
            ),
          ).find(
            (x) =>
              x.props.style
                ?.marginTop ===
                34 &&
              x.props.style
                ?.textAlign ===
                'center',
          );

        assert.equal(
          prompt(start - 1)
            .props.style.opacity,
          0,
        );

        assert.ok(
          prompt(start + 1)
            .props.style.opacity >
            0,
        );

        assert.equal(
          prompt(duration - 1)
            .props.style.opacity,
          1,
        );
      },
    );
  }
}

for (const [
  subject,
  number,
  strike,
] of [
  ['русский', 6, false],
  ['русский', 7, true],
  ['физика', 7, false],
]) {
  test(
    `Strike-through: ${subject} #${number} = ${strike}`,
    () => {
      const tree = scene(
        answer,
        'FourSlidesAnswerScene',
        {
          ...baseTask,
          subject,
          number,
        },
        180,
        300,
      );

      const lines = all(tree).filter(
        (x) =>
          x.props.style
            ?.textDecoration ===
          'line-through',
      );

      assert.equal(
        lines.length,
        strike ? 1 : 0,
      );

      assert.ok(
        text(tree).includes(
          baseTask.answer,
        ),
      );

      assert.ok(
        text(tree).includes(
          baseTask.explanation,
        ),
      );
    },
  );
}

test(
  'Answer entrance starts invisible; established exit is retained',
  () => {
    const at = (f) =>
      scene(
        answer,
        'FourSlidesAnswerScene',
        baseTask,
        f,
        300,
      );

    assert.equal(
      at(0).props.style.opacity,
      0,
    );

    assert.equal(
      at(180).props.style.opacity,
      1,
    );

    assert.equal(
      at(299).props.style.opacity,
      1 / 16,
    );
  },
);

test(
  'Scene durations still come from audioSync; no added transition time',
  () => {
    const task = {
      ...baseTask,
      audioSync: {
        introSec: 3,
        answerSec: 11,
        outroSec: 15,
        totalSec: 18,
      },
    };

    const result =
      timing.buildFourSlidesScenes(
        task,
      );

    assert.equal(
      result.title,
      180,
    );

    assert.equal(
      result.problem,
      480,
    );

    assert.equal(
      result.answer,
      240,
    );

    assert.equal(
      result.outro,
      180,
    );

    assert.equal(
      timing.totalFourSlidesFrames(
        task,
      ),
      1080,
    );

    assert.ok(
      !read(
        'src/ege/EgeVideo.tsx',
      ).includes(
        'FourSlidesSceneFade',
      ),
    );
  },
);
