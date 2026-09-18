#!/usr/bin/env node
/**
 * Загружает готовый .mp4 в ту же папку Google Drive, которой пользуется
 * n8n, через сервис-аккаунт — без googleapis в зависимостях проекта: JWT
 * подписывается стандартным node:crypto, всё остальное — обычный fetch.
 *
 * Нужны переменные окружения:
 *   GDRIVE_SERVICE_ACCOUNT_JSON — содержимое JSON-ключа сервис-аккаунта
 *     целиком (не путь к файлу — секрет GitHub хранится как строка).
 *   GDRIVE_FOLDER_ID — id папки на Drive, куда класть видео (та же, что
 *     читает n8n). Папка должна быть расшарена на email сервис-аккаунта
 *     (Editor) — сервис-аккаунты не имеют своего Drive со свободным местом.
 *
 * Использование:
 *   node gdrive-upload.mjs --file out/dynamic.mp4 --name "Dyn-xyz.mp4"
 * Печатает в stdout JSON { id, webViewLink } готового файла.
 */
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

const filePath = flag("file");
const fileName = flag("name");
if (!filePath || !fileName) {
  console.error("ОШИБКА: нужны --file и --name");
  process.exit(1);
}

const saJsonRaw = process.env.GDRIVE_SERVICE_ACCOUNT_JSON;
const folderId = process.env.GDRIVE_FOLDER_ID;
if (!saJsonRaw || !folderId) {
  console.error(
    "ОШИБКА: не заданы GDRIVE_SERVICE_ACCOUNT_JSON и/или GDRIVE_FOLDER_ID",
  );
  process.exit(1);
}

const sa = JSON.parse(saJsonRaw);

const base64url = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const getAccessToken = async () => {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(sa.private_key)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Не удалось получить access token: ${JSON.stringify(body)}`);
  }
  return body.access_token;
};

const uploadFile = async (accessToken) => {
  const metadata = { name: fileName, parents: [folderId] };
  const boundary = "gdrive-upload-boundary";
  const fileBytes = readFileSync(filePath);

  const preamble = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: video/mp4\r\n\r\n`,
    "utf8",
  );
  const epilogue = Buffer.from(`\r\n--${boundary}--`, "utf8");
  const body = Buffer.concat([preamble, fileBytes, epilogue]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Загрузка на Drive не удалась: ${JSON.stringify(json)}`);
  }
  return json;
};

const makePublic = async (accessToken, fileId) => {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    },
  );
  if (!res.ok) {
    const json = await res.json();
    console.error(
      `ПРЕДУПРЕЖДЕНИЕ: не удалось открыть доступ по ссылке: ${JSON.stringify(json)}`,
    );
  }
};

const token = await getAccessToken();
const uploaded = await uploadFile(token);
await makePublic(token, uploaded.id);
console.log(JSON.stringify(uploaded));
