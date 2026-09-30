import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import ts from 'typescript';

export const root = fileURLToPath(new URL('../../', import.meta.url));

export const contracts = [
  {
    path: 'src/ege/scenes/four-slides/ProblemScene.tsx',
    component: 'FourSlidesProblemScene',
    variables: ['elapsedProgress', 'pauseWindowStartFrame'],
  },
  {
    path: 'src/ege/scenes/four-slides/AnswerScene.tsx',
    component: 'FourSlidesAnswerScene',
    variables: ['showIncorrectContext', 'sceneOpacity'],
  },
  {
    path: 'src/ege/scenes/four-slides/TitleScene.tsx',
    component: 'FourSlidesTitleScene',
    variables: [],
  },
  {
    path: 'src/ege/EgeVideo.tsx',
    component: 'EgeVideo',
    variables: [],
  },
];

/*
 * AST reads declarations, not words in comments.
 * This complements tsc; it does NOT replace type checking,
 * the Remotion bundle or a real render.
 */
export function validateSceneSource(text, contract) {
  const source = ts.createSourceFile(
    contract.path,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  for (const d of source.parseDiagnostics) {
    throw new Error(
      `${contract.path}: ${ts.flattenDiagnosticMessageText(
        d.messageText,
        '\n',
      )}`,
    );
  }

  const components = [];

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;

    const exported = statement.modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    );

    if (!exported) continue;

    for (const d of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(d.name) &&
        d.name.text === contract.component
      ) {
        components.push(d);
      }
    }
  }

  assert.equal(
    components.length,
    1,
    `${contract.path}: expected ONE export ${contract.component}, found ${components.length}`,
  );

  const initializer = components[0].initializer;

  assert.ok(
    initializer &&
      ts.isArrowFunction(initializer) &&
      ts.isBlock(initializer.body),
    `${contract.path}: expected an arrow component with a block body`,
  );

  for (const name of contract.variables) {
    const declarations = initializer.body.statements.flatMap((s) =>
      ts.isVariableStatement(s)
        ? [...s.declarationList.declarations]
        : [],
    );

    assert.equal(
      declarations.filter(
        (d) =>
          ts.isIdentifier(d.name) &&
          d.name.text === name,
      ).length,
      1,
      `${contract.path}: ${name} must be a real declaration, not a // comment`,
    );
  }
}

export function checkAllScenes() {
  for (const contract of contracts) {
    validateSceneSource(
      readFileSync(resolve(root, contract.path), 'utf8'),
      contract,
    );

    console.log(`OK: ${contract.path}`);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    checkAllScenes();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
