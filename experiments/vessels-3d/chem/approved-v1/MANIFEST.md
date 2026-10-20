# Химия v1 — утверждённое видео (заморожено)

Ровно та версия, из которой получился утверждённый ролик `chem-video-v1.mp4`
(48,53 с, 1080×1920, 60 к/с, вариант A «Лаборатория», цвет «Глубина», временная озвучка RHVoice).
Дальнейшие эксперименты идут в `experiment/math-vessels-visual` и сюда не попадают. Ничего не подключено к автоматизации.

## Как однозначно определить версию

- Репозиторий: `dilyafathutdinova755-lgtm/remotion-video`
- Ветка: `chemistry-approved-v1`
- Коммит с кодом, из которого рендерился ролик: `f0dc7ce6e27037deda017e4c988f3210510a12f0`
  (исходный код не менялся: файлы последний раз правились до этого коммита, рендер запущен после; поверх добавлен только коммит с материалами и этим файлом)
- SHA-256 итогового MP4: `c0810b3f4b0a95553277cd484d467d8a10a4ab1edda5ebc2617e56a46d5ca328`
- Раскадровка (холст, вариант A, цвет «Глубина»): https://claude.ai/artifact/DUReb2YCxjsrnWjXnCFjbe (версия на момент утверждения — `1792486685-7e2a`; на ней остались и не выбранные варианты B–D)

## Что входит (пути от `experiments/vessels-3d/`)

Код: `chem/index.html` (оверлей, стили), `chem/scene.js` (3D-стекло, чашка, кристаллы, анимация), `chem/timeline.json`,
`make_audio_chem.py`, `make_mix_chem.py`, `render.mjs`, `src/world3d.js` + `src/lib.js` + `src/choreo.js` (стакан из ролика по математике),
`ru/logo3d.js` + `ru/logo.png` (3D-иконка), `package.json`.
Материалы (добавлены принудительно): `chem/fonts/*.ttf` (Geologica 700/800, Golos Text 500/600/700, JetBrains Mono 600 — Google Fonts, OFL),
`chem/assets/voice.wav`, `package-lock.json`, а также `chem/approved-v1/`: `final.wav`, `video-silent.mp4`, `chem-video-v1.mp4`, `render.log`.

## Окружение и команды

Node 22.22.0, three 0.170.0, playwright 1.56.1, Chromium headless shell 141.0.7390.37 (SwiftShader), ffmpeg 6.1.1,
RHVoice 1.8.0 («tatiana»), Python 3 + numpy 2.4.6.

    python3 make_audio_chem.py && python3 make_mix_chem.py
    PAGE=experiments/vessels-3d/chem/index.html OUT=chem/out node render.mjs video --workers 4 --fps 60
    ffmpeg -i chem/out/video-silent.mp4 -i chem/out/final.wav -c:v libx264 -crf 18 -preset slow \
           -pix_fmt yuv420p -c:a aac -b:a 192k -shortest chem-video-v1.mp4

Для точной копии используйте сохранённые `voice.wav`, `timeline.json`, `final.wav` (повторный синтез голоса может отличаться).
Рендер занял около часа на 4 ядрах.

## Где зашито тестовое задание (мой пример: 20 г NaOH + избыток HCl → масса NaCl, ответ 29,3 г)

Задание не вынесено в данные — оно вписано прямо в код:
- `make_audio_chem.py`, строки 14–19 (`SCRIPT`) — весь текст озвучки (условие, три шага с числами 40 / 0,5 моль / 58,5 / 29,25 / 29,3); `chem/timeline.json` — он же с метками слов.
- `chem/index.html`: ярлыки «NaOH · 20 г», «HCl · избыток», «NaCl · ? г» (строки 78–80), карточка условия (81), заголовки шагов «Моли / Уравнение / Масса» (85–87), шаг 1 (91–94: «M(NaOH) = 23 + 16 + 1 = 40 г/моль», «20 : 40 =», «0,5 моль»), шаг 2 (97–103: уравнение NaOH + HCl → NaCl + H₂O, коэффициенты «1», ярлыки «0,5 моль», «1 : 1 — соли столько же»), шаг 3 (106–109: «M(NaCl) = 23 + 35,5 = 58,5 г/моль», «0,5 · 58,5», «= 29,25», «29,25 ≈ 29,3 — до десятых»).
- `chem/scene.js`: ответ в ярлыке — строка 278 («NaCl · 29,3 г»); ярлык шага 1 — строка 302 («NaOH · 20 г» → «NaOH · 0,5 моль»); тайминги привязаны к меткам озвучки этого текста (`T.naoh`, `T.hcl`, `T.salt`, `T.mm`, `T.div`, `T.mol`, `T.eq`, `T.r11`, `T.same`, `T.mm2`, `T.mul`, `T.res`, `T.rnd`, `T.ans`); цвета жидкости и кислоты — строка 30 (`LIQ`, `ACID`), заполнение стаканов (0,55 → 0,82 → 0,06), форма и число кристаллов (16 штук), положения — внутри `updateWorld`.
- `make_mix_chem.py` — звуки привязаны к тем же меткам.
Стакан, лаборатория и иконка от задания не зависят.

## Контрольные суммы (SHA-256)

```
bd80ce039afbe9c4127f9febe9fd2a7d142444634f12ca25e6967547700c3355  chem/index.html
c544b0b5209a0c18cc8c7f57f10153caffc48e0bebf954517a05fbb3d4c38fed  chem/scene.js
adba481971ff6554d5c3a5efea3209506dd188f54fba7995e88ef0ad0afebced  chem/timeline.json
42b1e96bc88107a25a8de8573a44ea7780b40b1db7cb8fc7f379d590d7437d46  chem/fonts/Geologica-700.ttf
6602a52e03f3ab8b75b2187995225bb62ab2aa1b07ad04181e471d3845110aaf  chem/fonts/Geologica-800.ttf
6dd89b893d2534ebb655520f2a1ac9258007af1a0daf4b8a32763f13b47fad4a  chem/fonts/Golos-500.ttf
1d38fc3b3f03e9f22003bbf360e4cd58e8890f81e65f9a98b3773a0199ba4354  chem/fonts/Golos-600.ttf
8b9ab44deba060e3f7a1a60bd2d8b19c4bab581e85c2e1f150a1e73a4f6aa8b4  chem/fonts/Golos-700.ttf
df54dbfafba61d4911eb3dab9bba2d20531fb009f01d64dd42fa96ab862584d8  chem/fonts/JBMono-600.ttf
a9bfdeb59bebcaeaf272b5c32f75fc083f7aa6c5d64a64353e2adc0e18beae43  chem/assets/voice.wav
6aeab5545a241ea5caac73701bed6072c02cccfb9010af52a1c31b5914f4532a  src/world3d.js
d0d4c2a9198504d557a58018a5659aacf6fc3e15dd35aea8495190c6927bda3d  src/lib.js
0686ddb479ca56a06a5e88be5f8ff4a23c8694fdbbe1c6897b8d81eb1649e974  src/choreo.js
2b8d495430d8a4707c7fa871639dab38247b11263c0eabb5354bd9fc3cc712b9  ru/logo3d.js
a0c0ffb6f6cfa6393aba5e5318f20a62b43fd755e6878f5cac68f7bb8a108da3  ru/logo.png
721d71f07b5bda41909c398de7a5bb8409333f57da16c5dc2fbfaf553759d6a9  render.mjs
4aa12745b7ac5b40080c32a370acadc48d01c2a7802edfa00b2289078bffdb6b  make_audio_chem.py
79bec609f569cda18479595361842b79a424d0899077e3a755feaa6ac12dc18a  make_mix_chem.py
73fb65f84b3571fee43a67e1d333512f82ab5e90ba4ee26cc6ac84ea002d81ba  package.json
b5238e423a555de81b8d076dd77bf65e9e7920bbe2ca406a65cdb70e59c9bc9d  package-lock.json
c0810b3f4b0a95553277cd484d467d8a10a4ab1edda5ebc2617e56a46d5ca328  chem/approved-v1/chem-video-v1.mp4
76de9b990b434a86eab694a7cfec0ce81f93e56b8fc3aaf4b647d47b3c975b42  chem/approved-v1/video-silent.mp4
d4958681ceb6172bfbb61bd0c83c37d1313bb96a9228291e0ee58b8ab76c918f  chem/approved-v1/final.wav
```
