import { staticFile } from "remotion";

/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ — правится через `node scripts/fetch-fonts.mjs`.
 *
 * Подмножества Montserrat / Inter / Oswald лежат в public/fonts. Правила
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

const FACES: FontFace[] = [
  {
    family: "Inter",
    style: "italic",
    weight: 400,
    file: "Inter-400-italic-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Inter",
    style: "italic",
    weight: 400,
    file: "Inter-400-italic-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Inter",
    style: "italic",
    weight: 600,
    file: "Inter-600-italic-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Inter",
    style: "italic",
    weight: 600,
    file: "Inter-600-italic-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Inter",
    style: "normal",
    weight: 300,
    file: "Inter-300-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Inter",
    style: "normal",
    weight: 300,
    file: "Inter-300-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Inter",
    style: "normal",
    weight: 400,
    file: "Inter-400-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Inter",
    style: "normal",
    weight: 400,
    file: "Inter-400-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Inter",
    style: "normal",
    weight: 500,
    file: "Inter-500-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Inter",
    style: "normal",
    weight: 500,
    file: "Inter-500-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Inter",
    style: "normal",
    weight: 600,
    file: "Inter-600-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Inter",
    style: "normal",
    weight: 600,
    file: "Inter-600-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Inter",
    style: "normal",
    weight: 700,
    file: "Inter-700-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Inter",
    style: "normal",
    weight: 700,
    file: "Inter-700-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Montserrat",
    style: "normal",
    weight: 300,
    file: "Montserrat-300-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Montserrat",
    style: "normal",
    weight: 300,
    file: "Montserrat-300-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Montserrat",
    style: "normal",
    weight: 600,
    file: "Montserrat-600-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Montserrat",
    style: "normal",
    weight: 600,
    file: "Montserrat-600-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Montserrat",
    style: "normal",
    weight: 700,
    file: "Montserrat-700-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Montserrat",
    style: "normal",
    weight: 700,
    file: "Montserrat-700-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Montserrat",
    style: "normal",
    weight: 800,
    file: "Montserrat-800-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Montserrat",
    style: "normal",
    weight: 800,
    file: "Montserrat-800-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Oswald",
    style: "normal",
    weight: 300,
    file: "Oswald-300-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Oswald",
    style: "normal",
    weight: 300,
    file: "Oswald-300-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Oswald",
    style: "normal",
    weight: 400,
    file: "Oswald-400-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Oswald",
    style: "normal",
    weight: 400,
    file: "Oswald-400-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
  {
    family: "Oswald",
    style: "normal",
    weight: 500,
    file: "Oswald-500-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    family: "Oswald",
    style: "normal",
    weight: 500,
    file: "Oswald-500-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
];

export const fontFaceCss = (): string =>
  FACES.map(
    (f) => `@font-face {
  font-family: "${f.family}";
  font-style: ${f.style};
  font-weight: ${f.weight};
  font-display: block;
  src: url("${staticFile(`fonts/${f.file}`)}") format("woff2");
  unicode-range: ${f.range};
}`,
  ).join("\n");

/** Пары «начертание — семейство» для предзагрузки в FontGate. */
export const FONT_PROBES: string[] = [
  'italic 400 100px "Inter"',
  'italic 600 100px "Inter"',
  '300 100px "Inter"',
  '400 100px "Inter"',
  '500 100px "Inter"',
  '600 100px "Inter"',
  '700 100px "Inter"',
  '300 100px "Montserrat"',
  '600 100px "Montserrat"',
  '700 100px "Montserrat"',
  '800 100px "Montserrat"',
  '300 100px "Oswald"',
  '400 100px "Oswald"',
  '500 100px "Oswald"',
];
