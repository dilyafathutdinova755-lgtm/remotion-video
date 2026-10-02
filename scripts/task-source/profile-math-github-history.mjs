import { createHash } from 'node:crypto';

import {
  HISTORY_PATH,
  findReservation,
  parseHistory,
  reserveTask,
} from './profile-math-task-history.mjs';

export const HISTORY_BRANCH =
  'profile-math-10';

function stop(code, message) {
  const error = new Error(
    `${code}: ${message}`,
  );

  error.code = code;
  throw error;
}

function blobSha(bytes) {
  return createHash('sha1')
    .update(
      `blob ${bytes.length}\0`,
    )
    .update(bytes)
    .digest('hex');
}

export function reservationIdForRun(
  runId = process.env.GITHUB_RUN_ID,
) {
  if (
    !/^\d+$/.test(
      String(runId ?? ''),
    )
  ) {
    stop(
      'INVALID_RUN_ID',
      'Не получен GITHUB_RUN_ID.',
    );
  }

  return (
    `ege_profile_math_10:github-run:${runId}`
  );
}

export function createGithubHistoryStore({
  repository =
    process.env.GITHUB_REPOSITORY,

  token =
    process.env.GITHUB_TOKEN,

  fetchImpl =
    globalThis.fetch,
} = {}) {
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
      .test(repository ?? '')
  ) {
    stop(
      'INVALID_REPOSITORY',
      'Не получен корректный GITHUB_REPOSITORY.',
    );
  }

  if (
    typeof token !== 'string' ||
    !token.trim()
  ) {
    stop(
      'NO_GITHUB_TOKEN',
      'Не передан GITHUB_TOKEN для истории.',
    );
  }

  if (
    typeof fetchImpl !== 'function'
  ) {
    stop(
      'NO_FETCH',
      'Требуется Node.js 22.',
    );
  }

  const repoPath =
    repository
      .split('/')
      .map(encodeURIComponent)
      .join('/');

  const filePath =
    HISTORY_PATH
      .split('/')
      .map(encodeURIComponent)
      .join('/');

  const endpoint =
    `https://api.github.com/repos/${repoPath}/contents/${filePath}`;

  async function request(
    method,
    ref,
    payload,
  ) {
    const url =
      method === 'GET'
        ? `${endpoint}?ref=${encodeURIComponent(ref)}`
        : endpoint;

    let response;
    let data;

    try {
      response =
        await fetchImpl(url, {
          method,

          redirect: 'error',

          signal:
            AbortSignal.timeout(
              20_000,
            ),

          headers: {
            Accept:
              'application/vnd.github+json',

            Authorization:
              `Bearer ${token}`,

            'X-GitHub-Api-Version':
              '2026-03-10',

            'Content-Type':
              'application/json',

            'Cache-Control':
              'no-cache',
          },

          ...(payload
            ? {
                body:
                  JSON.stringify(
                    payload,
                  ),
              }
            : {}),
        });

      data =
        await response.json();
    } catch {
      stop(
        method === 'PUT'
          ? 'HISTORY_SAVE_UNCONFIRMED'
          : 'HISTORY_READ_FAILED',

        'Нет подтверждённого ответа GitHub. Задание дальше не отправляем.',
      );
    }

    return {
      status:
        response.status,

      data,
    };
  }

  async function readAt(ref) {
    const {
      status,
      data,
    } = await request(
      'GET',
      ref,
    );

    if (status !== 200) {
      stop(
        'HISTORY_READ_FAILED',
        `GitHub HTTP ${status}. Пустую историю не создаём.`,
      );
    }

    if (
      data?.type !== 'file' ||
      data.path !== HISTORY_PATH ||
      data.encoding !== 'base64' ||
      typeof data.content !==
        'string' ||
      !/^[a-f0-9]{40}$/.test(
        data.sha ?? '',
      )
    ) {
      stop(
        'INVALID_HISTORY_RESPONSE',
        'GitHub не вернул корректный файл истории.',
      );
    }

    const bytes =
      Buffer.from(
        data.content,
        'base64',
      );

    if (
      blobSha(bytes) !==
      data.sha
    ) {
      stop(
        'HISTORY_INTEGRITY_FAILED',
        'Содержимое истории не совпадает с её версией.',
      );
    }

    return {
      sha:
        data.sha,

      history:
        parseHistory(
          bytes.toString('utf8'),
        ),
    };
  }

  async function reserve(
    task,
    reservationId,
  ) {
    const candidate =
      structuredClone(task);

    let current =
      await readAt(
        HISTORY_BRANCH,
      );

    for (
      let attempt = 0;
      attempt < 4;
      attempt++
    ) {
      const next =
        reserveTask(
          current.history,
          candidate,
          reservationId,
        );

      const bytes =
        Buffer.from(
          `${JSON.stringify(
            next.history,
            null,
            2,
          )}\n`,
          'utf8',
        );

      const expectedSha =
        blobSha(bytes);

      const {
        status,
        data,
      } = await request(
        'PUT',
        undefined,
        {
          message:
            'Reserve unique profile math task',

          branch:
            HISTORY_BRANCH,

          sha:
            current.sha,

          content:
            bytes.toString(
              'base64',
            ),
        },
      );

      if (
        status === 409 ||
        status === 422
      ) {
        const latest =
          await readAt(
            HISTORY_BRANCH,
          );

        if (
          status === 422 &&
          latest.sha ===
            current.sha
        ) {
          stop(
            'HISTORY_WRITE_REJECTED',
            'GitHub отклонил запись истории.',
          );
        }

        current =
          latest;

        continue;
      }

      if (
        status !== 200 ||
        data?.content?.sha !==
          expectedSha ||
        !/^[a-f0-9]{40}$/.test(
          data?.commit?.sha ?? '',
        )
      ) {
        stop(
          'HISTORY_SAVE_UNCONFIRMED',
          `Запись истории не подтверждена. HTTP ${status}.`,
        );
      }

      const saved =
        await readAt(
          data.commit.sha,
        );

      const entry =
        findReservation(
          saved.history,
          reservationId,
        );

      if (
        saved.sha !==
          expectedSha ||
        !entry ||
        JSON.stringify(
          saved.history,
        ) !==
          JSON.stringify(
            next.history,
          )
      ) {
        stop(
          'HISTORY_VERIFY_FAILED',
          'Контрольное чтение не подтвердило резерв.',
        );
      }

      return {
        history:
          saved.history,

        entry,

        commitSha:
          data.commit.sha,
      };
    }

    stop(
      'HISTORY_BUSY',
      'История менялась одновременно. Задание не отправляем.',
    );
  }

  return Object.freeze({
    read:
      () =>
        readAt(
          HISTORY_BRANCH,
        ),

    reserve,
  });
}
