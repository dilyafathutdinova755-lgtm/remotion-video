/**
 * Скачивает подмножества шрифтов (кириллица + латиница) из Google Fonts
 * в public/fonts и генерирует src/ege/fontFaces.ts.
 *
 *   node scripts/fetch-fonts.mjs
 *
 * Локальные копии нужны, чтобы рендер не ходил в сеть: во время рендера
 * страницу открывает headless-браузер, которому внешние хосты могут быть
 * недоступны.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = join(ROOT, "public", "fonts");

const CSS_URL =
  "https://fonts.googleapis.com/css2" +
  "?family=Montserrat:wght@300;600;700;800" +
  "&family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600" +
  "&display=swap";

// Только эти подмножества: greek/vietnamese/*-ext ролику не нужны
const SUBSETS = ["cyrillic", "latin"];

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const curl = (args) => execFileSync("curl", ["-sS", "-f", ...args], { encoding: "buffer" });

rmSync(FONT_DIR, { recursive: true, force: true });
mkdirSync(FONT_DIR, { recursive: true });

const css = curl(["-A", UA, CSS_URL]).toString("utf8");
const faces = [];

for (const chunk of css.split("/*").slice(1)) {
  const subset = chunk.slice(0, chunk.indexOf("*/")).trim();
  if (!SUBSETS.includes(subset)) continue;

  const body = chunk.slice(chunk.indexOf("*/") + 2);
  const family = /font-family:\s*'([^']+)'/.exec(body)[1];
  const style = /font-style:\s*(\w+)/.exec(body)[1];
  const weight = /font-weight:\s*(\d+)/.exec(body)[1];
  const url = /src:\s*url\(([^)]+)\)/.exec(body)[1];
  const range = /unicode-range:\s*([^;]+);/.exec(body)[1].trim();

  const file = `${family}-${weight}${style === "italic" ? "-italic" : ""}-${subset}.woff2`;
  curl([url, "-o", join(FONT_DIR, file)]);

  faces.push({ family, style, weight: Number(weight), file, range });
  console.log(`  ${file}`);
}

const ts = `import { staticFile } from "remotion";

/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ — правится через \`node scripts/fetch-fonts.mjs\`.
 *
 * Подмножества Montserrat (только логотип) и Inter лежат в public/fonts. Правила
 * собираются в рантайме через staticFile(): сборщик пытается резолвить
 * url() из обычного CSS сам и падает на несуществующем пути.
 */
type FontFace = {
  family: string;
  style: string;
  weight: number;
  file: string;
  range: string;
};

const FACES: FontFace[] = ${JSON.stringify(faces, null, 2)};

export const fontFaceCss = (): string =>
  FACES.map(
    (f) => \`@font-face {
  font-family: "\${f.family}";
  font-style: \${f.style};
  font-weight: \${f.weight};
  font-display: block;
  src: url("\${staticFile(\`fonts/\${f.file}\`)}") format("woff2");
  unicode-range: \${f.range};
}\`,
  ).join("\\n");

/** Пары «начертание — семейство» для предзагрузки в FontGate. */
export const FONT_PROBES: string[] = ${JSON.stringify(
  [...new Set(faces.map((f) => `${f.style === "italic" ? "italic " : ""}${f.weight} 100px "${f.family}"`))],
  null,
  2,
)};
`;

writeFileSync(join(ROOT, "src", "ege", "fontFaces.ts"), ts);
console.log(`\n${faces.length} начертаний -> src/ege/fontFaces.ts`);
