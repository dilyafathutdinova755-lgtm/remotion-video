# Физика v1 — утверждённое видео (заморожено)

Ровно та версия, из которой получился утверждённый ролик `phys-video-v1-cut.mp4`
(48,44 с, 1080×1920, 60 к/с, второй закон Ньютона: одна сила — два тела, цвет A «Космос»,
временная озвучка RHVoice). Начинается сразу со стола и условия, без вращения иконки.
Дальнейшие эксперименты идут в `experiment/math-vessels-visual` и сюда не попадают.
Ничего не подключено к автоматизации.

## Как однозначно определить версию

- Репозиторий: `dilyafathutdinova755-lgtm/remotion-video`
- Ветка: `physics-approved-v1`
- Коммит с кодом, из которого рендерился ролик: `d1df9d6` (полный хеш — в `git log` этой ветки).
  Код поверх него не менялся; добавлен только коммит с материалами и этим файлом.
- SHA-256 утверждённого MP4: `9ffd815272ed8e1a3b4f68c342a3004b0070ad4219d1ef7f7f1dc664424bcd6a`
- Раскадровка: https://claude.ai/artifact/3jAtyDk52vd9V6cgcTrKpu

## Как получен утверждённый MP4 (два шага)

1. Полный рендер кода `d1df9d6` → `phys-video-v1.mp4` (50,93 с; в начале 2 с вращения иконки).
2. Обрезка первых 2,5 с (вращение иконки убрано по просьбе), без перерендера:

       ffmpeg -ss 2.5 -i phys-video-v1.mp4 -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p \
              -c:a aac -b:a 192k -af "afade=t=in:d=0.15" phys-video-v1-cut.mp4

Сохранены оба файла: `phys-video-v1.mp4` (исходник до обрезки) и `phys-video-v1-cut.mp4` (утверждённый).

## Чего в этом ролике НЕТ (сделано позже, только в экспериментальной ветке, не рендерилось)

- Плашка «ОГЭ · физика · задание 6» под точками шагов.
- Плашка «ОГЭ ТРЕНАЖЁР» и иконка ОГЭ — в ролике «ЕГЭ ТРЕНАЖЁР» и иконка ЕГЭ; голос в финале тоже говорит «ЕГЭ Тренажёр».
- Новое начало в коде (голос с 0,2 с) — в ролике то же достигнуто обрезкой.
Это коммиты `e96e89d`, `ba2568d`, `ff4046b`, `c521b9b` в `experiment/math-vessels-visual`.
Текущая версия раскадровки уже показывает эти изменения (плашку ОГЭ, подпись задания, начало без заставки).

## Что входит (пути от `experiments/vessels-3d/`)

Код: `phys/index.html` (оверлей, стили), `phys/scene.js` (стеклянный стол, кубы, стрелка силы,
копии-«стробоскоп», логика кадра), `phys/timeline.json`, `make_audio_phys.py`, `make_mix_phys.py`,
`render.mjs`, `ru/logo3d.js` + `ru/logo.png` (3D-иконка), `package.json`.
Материалы (добавлены принудительно): `phys/fonts/*.ttf` (Exo 2 700/800/800 italic, Golos Text 500/600/700,
JetBrains Mono 600 — Google Fonts, OFL), `phys/assets/voice.wav`, `package-lock.json`, а также
`phys/approved-v1/`: `phys-video-v1-cut.mp4`, `phys-video-v1.mp4`, `final.wav`.

Про звук: исходные `voice.wav` и `final.wav` в рабочей папке были перезаписаны следующим экспериментом,
поэтому они пересобраны из кода `d1df9d6` теми же скриптами. Проверка: `timeline.json` вышел байт в байт
как в коммите, а `final.wav` совпадает со звуковой дорожкой `phys-video-v1.mp4` (корреляция 0,999, сдвиг 0;
остаток — сжатие AAC). Беззвучный промежуточный `video-silent.mp4` и лог рендера не сохранились:
их удалил запуск следующего рендера. Звук и картинку утверждённого ролика это не меняет — они внутри MP4.

## Окружение и команды

Node 22.22.0, three 0.170.0, playwright 1.56.1, Chromium headless shell 141.0.7390.37 (SwiftShader),
ffmpeg 6.1.1, RHVoice 1.8.0 («tatiana»), Python 3 + numpy 2.4.6.

    python3 make_audio_phys.py && python3 make_mix_phys.py
    PAGE=experiments/vessels-3d/phys/index.html OUT=phys/out node render.mjs video --workers 4 --fps 60
    ffmpeg -i phys/out/video-silent.mp4 -i phys/out/final.wav -c:v libx264 -crf 18 -preset slow \
           -pix_fmt yuv420p -c:a aac -b:a 192k -shortest phys-video-v1.mp4
    # затем обрезка из шага 2 выше

Рендер — около 26 минут на 4 ядрах.

## Где зашито тестовое задание (ОГЭ, физика, задание 6: сила F, тела 0,5 кг и 3 кг, a₁ = 1,8 м/с² → a₂ = 0,3 м/с²)

Задание не вынесено в данные — оно вписано прямо в код:
- `make_audio_phys.py`, строки 13–21 (`SCRIPT`) — весь текст озвучки: условие (строки 14–15),
  три шага с числами 0,5 · 1,8 = 0,9 Н и 0,9 : 3 = 0,3 (17–19), финал (20, «в приложении ЕГЭ Тренажёр»);
  `phys/timeline.json` — тот же текст с метками слов.
- `phys/index.html`: ярлыки «покоится · v = 0», «a₁ = 1,8 м/с²», «a₂ = ?», «F = 0,9 Н» (строки 80–83);
  заметки «кадры через 1 с», «стол гладкий — трения нет» (86–87); карточка полного условия (88);
  заголовки шагов «Закон Ньютона / Сила / Ускорение» (92–94); шаг 1: «F = m · a» и подписи (98–100);
  шаг 2: «F = m₁ · a₁», «0,5 · 1,8 =», «0,9 Н» (103–105); шаг 3: «a₂ = F : m₂», «3 кг = 6 × 0,5 кг»,
  «0,9 : 3 =», «0,3 м/с²» (108–111); сравнение: «масса × 6 → ускорение : 6», «1,8 : 6 = 0,3» (112–113).
- `phys/scene.js`: размеры кубов (строка 30) и путь разгона с отношением 1 : 6 (31, `L2 = L1 / 6`),
  эпизоды толчков (32–35); надписи на гранях «0,5 кг» и «3 кг» (119–120) и шесть клеток «0,5» (102);
  «та же F» (370); ответ в ярлыке «a₂ = 0,3 м/с²» (396); все тайминги — по меткам озвучки этого текста
  (`T.f1`, `T.b1`, `T.a1`, `T.b2`, `T.m2`, `T.sm`, `T.q`, `T.law`, `T.fr`, `T.mul`, `T.res`, `T.div`,
  `T.ans`, `T.six`, `T.slow`).
- `make_mix_phys.py` — звуки привязаны к тем же меткам.
Стол, кубы, стрелка, «стробоскоп» и иконка от конкретных чисел не зависят.

## Контрольные суммы (SHA-256)

```
9c59b0d48a47a92a0494cc232e5f42d91669dd9bb992b53a9978178fe30e9f5f  phys/index.html
3a56e72fb6f3dffb72c41868aa4589384390fd943a60aea339a5090d7eb73841  phys/scene.js
12f55238b858ad732bebf5988720467610b0267bfd8d09b3f8140abc59b602cc  phys/timeline.json
d29a80ec96f88b2ea92ad574b7ddf53044e77e7ee3498668a930a55add9efcb0  phys/fonts/Exo2-700.ttf
eeeedd2d4d5643c3b5b28d8e09f35a010e1a2382eedd35b366c367ff74ba1fc6  phys/fonts/Exo2-800.ttf
6771d51b7de2fa4b43dc7653f14bfa2b26a068c8c85b77c3b2cf3a403c697766  phys/fonts/Exo2-800i.ttf
6dd89b893d2534ebb655520f2a1ac9258007af1a0daf4b8a32763f13b47fad4a  phys/fonts/Golos-500.ttf
1d38fc3b3f03e9f22003bbf360e4cd58e8890f81e65f9a98b3773a0199ba4354  phys/fonts/Golos-600.ttf
8b9ab44deba060e3f7a1a60bd2d8b19c4bab581e85c2e1f150a1e73a4f6aa8b4  phys/fonts/Golos-700.ttf
df54dbfafba61d4911eb3dab9bba2d20531fb009f01d64dd42fa96ab862584d8  phys/fonts/JBMono-600.ttf
aa92ee21eefb2cc30fb9f6ba214392605717eb6d46015e946aca7bf0653f9715  phys/assets/voice.wav
e3b30786f6b4fb69d5a277ad74daf14d21efaec97e5b5d939bbab427339e36f3  ru/logo3d.js
a0c0ffb6f6cfa6393aba5e5318f20a62b43fd755e6878f5cac68f7bb8a108da3  ru/logo.png
721d71f07b5bda41909c398de7a5bb8409333f57da16c5dc2fbfaf553759d6a9  render.mjs
91b7cfe4f634f97b5f5b3958b190b1bf75ede6b1d6233c71e00a4e463de09371  make_audio_phys.py
9f167feb269985749d3522938b95b7617a54624ccf6d3d989b52c7f63ccae60d  make_mix_phys.py
73fb65f84b3571fee43a67e1d333512f82ab5e90ba4ee26cc6ac84ea002d81ba  package.json
b5238e423a555de81b8d076dd77bf65e9e7920bbe2ca406a65cdb70e59c9bc9d  package-lock.json
9ffd815272ed8e1a3b4f68c342a3004b0070ad4219d1ef7f7f1dc664424bcd6a  phys/approved-v1/phys-video-v1-cut.mp4
f2bd8c0a6f2f5d35ee5121cd6f34782e64399adb5fa89384f5bdac417c5808e2  phys/approved-v1/phys-video-v1.mp4
33ef3f98befb0ba59447f77cc133c366f5fc09a480d9145f5ca7bcf365380cb8  phys/approved-v1/final.wav
```
