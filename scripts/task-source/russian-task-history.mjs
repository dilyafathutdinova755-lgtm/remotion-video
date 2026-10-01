import { createHash } from 'node:crypto';

export const HISTORY_PATH = 'data/russian-task-history.json';
export const HISTORY_SCOPE = 'ege_russian';

const BLOCKED_STATES = new Set([
  'historical',
  'reserved',
  'dispatched',
  'published',
  'failed',
  'uncertain',
]);

function stop(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    stop('INVALID_DATA', `${label} должен быть непустой строкой.`);
  }
  return value.trim();
}

/* Нормализуем только копию для сравнения. Текст ролика не меняем. */
export function taskFingerprints(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    stop('INVALID_TASK', 'Задание должно быть объектом.');
  }

  const number = Number(task.task_number);
  if (![6, 7].includes(number)) {
    stop('INVALID_TASK', 'Эта история предназначена только для ЕГЭ русский №6/№7.');
  }

  if (task.exam !== undefined &&
      String(task.exam).trim().toUpperCase() !== 'ЕГЭ') {
    stop('WRONG_SCOPE', 'В русскую историю ЕГЭ передан другой экзамен.');
  }

  if (task.subject !== undefined &&
      !['русский', 'русский язык', 'russian'].includes(
        String(task.subject).trim().toLowerCase().replace(/\s+/g, ' '),
      )) {
    stop('WRONG_SCOPE', 'В русскую историю передан другой предмет.');
  }

  const raw = requiredText(task.condition_text, 'condition_text');
  const normalized = raw
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/\p{Cf}/gu, '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\u0300\u0301]/g, '');

  const lines = normalized.split('\n').map((line) =>
    number === 7
      ? line.replace(/^\s*(?:[1-9][.)]|[•●▪])\s*/u, '')
      : line,
  );

  const words = lines.join(' ').match(/[\p{L}\p{N}]+/gu) || [];
  if (words.length === 0) {
    stop('INVALID_TASK', 'В condition_text нет материала для сравнения.');
  }

  const hash = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
  const fingerprints = [`ru-text-v1:${hash(words.join(' '))}`];

  /* Для №7 одинаковый набор слов считается повтором даже после
     перестановки строк. Это намеренно консервативная проверка.
     Повторяющиеся слова учитываются с их количеством. */
  if (number === 7) {
    fingerprints.push(`ru-7-words-v1:${hash([...words].sort().join(' '))}`);
  }

  return fingerprints;
}

export function validateHistory(history) {
  if (!history || typeof history !== 'object' || Array.isArray(history) ||
      history.schema_version !== 1 || history.scope !== HISTORY_SCOPE) {
    stop('INVALID_HISTORY', 'Неверная версия или область истории заданий.');
  }

  if (!Array.isArray(history.entries) || history.entries.length === 0) {
    stop('INVALID_HISTORY', 'История отсутствует или пуста. Продолжать нельзя.');
  }

  const reservations = new Set();
  for (const [index, entry] of history.entries.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
        !BLOCKED_STATES.has(entry.state)) {
      stop('INVALID_HISTORY', `Повреждена запись истории №${index + 1}.`);
    }

    taskFingerprints(entry);

    if (entry.state !== 'historical' || entry.reservation_id !== undefined) {
      const id = requiredText(entry.reservation_id, 'reservation_id');
      if (reservations.has(id)) {
        stop('INVALID_HISTORY', 'Один reservation_id записан несколько раз.');
      }
      reservations.add(id);
    }
  }

  return history;
}

export function parseHistory(jsonText) {
  let history;
  try {
    history = JSON.parse(requiredText(jsonText, 'Файл истории'));
  } catch {
    stop('INVALID_HISTORY', 'Файл истории не является корректным JSON.');
  }
  return validateHistory(history);
}

export function findReservation(history, reservationId) {
  validateHistory(history);
  const id = requiredText(reservationId, 'reservation_id');
  return history.entries.find((entry) => entry.reservation_id === id) || null;
}

export function findDuplicate(history, task) {
  validateHistory(history);
  const candidate = new Set(taskFingerprints(task));
  return history.entries.find((entry) =>
    taskFingerprints(entry).some((key) => candidate.has(key)),
  ) || null;
}

/* Готовит обновлённую историю, но НЕ записывает её и НЕ отправляет webhook.
   Подключающий скрипт обязан сначала сохранить резерв в GitHub с проверкой
   версии файла, и только после подтверждённого сохранения вызвать n8n. */
export function reserveTask(history, task, reservationId, now = new Date()) {
  validateHistory(history);
  const id = requiredText(reservationId, 'reservation_id');

  if (findReservation(history, id)) {
    stop('RUN_ALREADY_RESERVED', 'Этот запуск уже резервировал задание.');
  }

  if (findDuplicate(history, task)) {
    stop('TASK_ALREADY_USED', 'Этот материал уже есть в истории.');
  }

  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) {
    stop('INVALID_DATA', 'Некорректное время резервирования.');
  }

  const entry = {
    state: 'reserved',
    reservation_id: id,
    reserved_at: date.toISOString(),
    task_number: Number(task.task_number),
    condition_text: task.condition_text,
  };

  for (const key of ['source', 'source_url', 'source_task_id']) {
    if (task[key] !== undefined && task[key] !== null) {
      entry[key] = String(task[key]);
    }
  }

  const updated = structuredClone(history);
  updated.entries.push(entry);
  validateHistory(updated);
  return { history: updated, entry };
}
