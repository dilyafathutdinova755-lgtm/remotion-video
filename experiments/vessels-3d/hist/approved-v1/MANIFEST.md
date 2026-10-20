# История v1 — утверждённое видео (заморожено)

Ровно та версия, из которой получился утверждённый ролик `hist-video-v1.mp4`
(44,62 с, 1080×1920, 60 к/с, временная озвучка RHVoice). Дальнейшие эксперименты идут в
`experiment/math-vessels-visual` и сюда не попадают. Ничего не подключено к автоматизации.

## Как однозначно определить версию

- Репозиторий: `dilyafathutdinova755-lgtm/remotion-video`
- Ветка: `history-video-approved-v1`
- Коммит с кодом, из которого рендерился ролик: `b2215023b806269e3e7c052568227bb7a40a0e3e`
  (исходный код не менялся; поверх добавлен только коммит с материалами и этим файлом)
- SHA-256 итогового MP4: `6cc8ee0047606d0ea6141241d3c1a3b7b40e1053f7bbce0b24bce79cc15903de`
- Утверждённая раскадровка лежит отдельно: ветка `history-approved-v1`, холст https://claude.ai/artifact/8TzCDj7khxuAd4sscXY6p2 (версия `1792474848-d0c9`).

## Известный дефект этой версии (оставлен как есть)

Около 8-й секунды под строкой «Раскройте смысл понятия» мелькает тонкая розовая полоса — артефакт
фоновых колец (CSS `repeating-radial-gradient` при масштабировании). Исправляется в следующих версиях,
в утверждённой не трогается.

## Что входит (пути от `experiments/vessels-3d/`)

Код: `hist/index.html` (сцена, персонажи — SVG внутри), `hist/scene.js` (анимация), `hist/timeline.json`,
`make_audio_hist.py`, `make_mix_hist.py`, `render.mjs`, `ru/logo3d.js`, `ru/logo.png`, `package.json`.
Материалы (добавлены принудительно): `hist/fonts/*.ttf` (Ruslan Display, Manrope 600/700/800 — Google Fonts, OFL),
`hist/assets/voice.wav`, `package-lock.json`, а также `hist/approved-v1/`: `final.wav`, `video-silent.mp4`,
`hist-video-v1.mp4`, `render.log`.

## Окружение и команды

Node 22.22.0, three 0.170.0, playwright 1.56.1, Chromium headless shell 141.0.7390.37 (SwiftShader), ffmpeg 6.1.1,
RHVoice 1.8.0 («tatiana»), Python 3 + numpy 2.4.6.

    python3 make_audio_hist.py && python3 make_mix_hist.py
    PAGE=experiments/vessels-3d/hist/index.html OUT=hist/out node render.mjs video --workers 4 --fps 60
    ffmpeg -i hist/out/video-silent.mp4 -i hist/out/final.wav -c:v libx264 -crf 18 -preset slow \
           -pix_fmt yuv420p -c:a aac -b:a 192k -shortest hist-video-v1.mp4

Для точной копии используйте сохранённые `voice.wav`, `timeline.json`, `final.wav` (повторный синтез голоса может отличаться).

## Где зашито тестовое задание («баскак»)

- `make_audio_hist.py`, строки 14–20 (`SCRIPT`) — весь текст озвучки; `hist/timeline.json` — он же с метками слов.
- `hist/index.html`: «Раскройте смысл понятия» и «Баскак» (строки 74–75), заголовки «Кто / Когда / Что делал» (79–81),
  «Золотая Орда», «Русь», шатёр, храм, фигурка баскака и ярлык (строки 85–122), плашка «представитель хана» (123),
  «XIII–XIV», лента 1200–1400, «1257», «нач. XIV» и подписи (126–136), три карточки (139–163),
  итог «так и пишем в ответе», «Баскак», определение (166–168).
- `hist/scene.js` — тайминги привязаны к меткам озвучки этого текста (`T.word`, `T.bas`, `T.rep`, `T.cent`,
  `T.y1257`, `T.xiv`, `T.tax`, `T.eye`, `T.army`, `T.sum`, `T.fin`) и к id элементов выше; траектория баскака
  между шатром и храмом — функция `bez(...)` в шаге «Кто».
- `make_mix_hist.py` — звуки привязаны к тем же меткам.
- Три героя (`#trio` в `hist/index.html`, строки 171 и далее) от задания не зависят.

## Контрольные суммы (SHA-256)

```
b00631284d95c4291b98e8c3f9a371f62f1a4d56e53481e9653a83100428d910  hist/index.html
a29951d4f9708519c24a74dc62f98073299496ea75945c3c721fb034cb0d08bc  hist/scene.js
54fae00d1b7fcd57bce50ebc9bd448e207f7afaad60c86ed8a1fbd70f97990a8  hist/timeline.json
6bad1a774228464cc88b8b0271555b266f7a3c64a7bedf15e165fdab4f6ac0ce  hist/fonts/Manrope-600.ttf
b9584e099e0e7f1e1e914c3037aabb9010c50346a3ce8df5eeeeecc0563044d8  hist/fonts/Manrope-700.ttf
b8f802f05b322a7345805f5b89f8bb976604cc719a91530918d5ce3c47160950  hist/fonts/Manrope-800.ttf
8ee0119d7d9bf671dff3b5cf14181f3b997c0a22faa76a125f1c44bf28d3d3ca  hist/fonts/RuslanDisplay.ttf
753baa846a2df54c339c44a299db86a7410542978d147f27104d4056b488c07b  hist/assets/voice.wav
2b8d495430d8a4707c7fa871639dab38247b11263c0eabb5354bd9fc3cc712b9  ru/logo3d.js
a0c0ffb6f6cfa6393aba5e5318f20a62b43fd755e6878f5cac68f7bb8a108da3  ru/logo.png
721d71f07b5bda41909c398de7a5bb8409333f57da16c5dc2fbfaf553759d6a9  render.mjs
311d34230d5b3742e3409300497d292e1764047f1541f4fc4666c533779481a5  make_audio_hist.py
8f6a0286ef89488fa6aac767ecea2cf98d373d487b245be5941e7baea8676178  make_mix_hist.py
73fb65f84b3571fee43a67e1d333512f82ab5e90ba4ee26cc6ac84ea002d81ba  package.json
b5238e423a555de81b8d076dd77bf65e9e7920bbe2ca406a65cdb70e59c9bc9d  package-lock.json
6cc8ee0047606d0ea6141241d3c1a3b7b40e1053f7bbce0b24bce79cc15903de  hist/approved-v1/hist-video-v1.mp4
2540768921588d8e8d61c586091ef5679da9335515d77fd30732869b9a3e0d43  hist/approved-v1/video-silent.mp4
522518251453fa1146b5275cfd6d5b2c10c876f1aaf1eacd78f9efe64915a851  hist/approved-v1/final.wav
```
