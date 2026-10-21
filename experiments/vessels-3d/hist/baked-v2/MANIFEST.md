# История — актуальная версия с «запечёнными» героями (baked-v2)

Это **текущее состояние проекта по истории**: утверждённый ролик (v1) + две правки, о которых вы просили:
1. три героя запечены в постоянный набор слоёв (`hist/characters/`), рендер с ними идёт заметно быстрее;
2. убрана розовая полоска под «Раскройте смысл понятия» (кольца фона теперь рисуются на холсте).
Дизайн, герои, тексты, анимации и озвучка те же, что в утверждённой версии.

**Полный ролик с этим кодом ещё не рендерился.** Проверено: покадровое сравнение трёх кадров (4,3 с, 8,0 с, 36,6 с) с утверждённым видео и замер скорости (условие с героями 0,7–0,9 с на кадр вместо 2,0–2,2 с; итог 0,6 с вместо 1,8 с). Сравнение — `stills-comparison.jpg` в этом каталоге (слева старый кадр, справа новый).

## Как определить версию

- Репозиторий: `dilyafathutdinova755-lgtm/remotion-video`
- Ветка: `history-baked-v2`
- Коммит с кодом: `19f34f8` (полный хеш см. в `git log`; поверх него в ветке лежит только коммит с материалами и этим файлом)
- Утверждённый ролик v1 (без запекания, с полоской) — отдельно, не изменён: ветка `history-video-approved-v1`, коммит кода `b2215023b806269e3e7c052568227bb7a40a0e3e`, MP4 SHA-256 `6cc8ee0047606d0ea6141241d3c1a3b7b40e1053f7bbce0b24bce79cc15903de`.
- Утверждённая раскадровка: ветка `history-approved-v1`, холст https://claude.ai/artifact/8TzCDj7khxuAd4sscXY6p2.

## Что входит (пути от `experiments/vessels-3d/`)

Код: `hist/index.html`, `hist/scene.js`, `hist/timeline.json`, `make_audio_hist.py`, `make_mix_hist.py`, `render.mjs`, `ru/logo3d.js`, `ru/logo.png`, `package.json`.
Герои: `hist/characters/` — `source.html` (единственный исходник), `bake_trio.mjs` (запекание), `layers.json`, 13 слоёв PNG: у Екатерины II (`E_*`), Петра I (`P_*`, плюс `P_headB` — волосы сзади) и Александра I (`A_*`) по слоям `oBody`/`oHead` (белая обводка и тень), `body`, `head`. Глаза рисуются отдельно на холсте (моргание, взгляд).
Материалы (добавлены принудительно): `hist/fonts/*.ttf` (Ruslan Display, Manrope 600/700/800), `hist/assets/voice.wav`, `package-lock.json`, `hist/baked-v2/final.wav` (звук тот же, что в утверждённой версии: тайминг не менялся).

## Как пересобрать героев и ролик

    node hist/characters/bake_trio.mjs        # только если меняется source.html
    python3 make_audio_hist.py && python3 make_mix_hist.py
    PAGE=experiments/vessels-3d/hist/index.html OUT=hist/out node render.mjs video --workers 4 --fps 60
    ffmpeg -i hist/out/video-silent.mp4 -i hist/out/final.wav -c:v libx264 -crf 18 -preset slow \
           -pix_fmt yuv420p -c:a aac -b:a 192k -shortest hist-video.mp4

Окружение то же, что в манифесте v1 (Node 22.22.0, three 0.170.0, playwright 1.56.1, Chromium 141, ffmpeg 6.1.1, RHVoice 1.8.0, numpy 2.4.6).

## Где зашито тестовое задание «баскак»

Так же, как в v1 (смещения строк по сравнению с v1 небольшие, ищите по id):
`make_audio_hist.py` — `SCRIPT` (текст озвучки); `hist/index.html` — элементы `qst`, `word`, `h1`–`h3`, `orda`, `rus`, `baskak`, `nRep`, `cent`, `lab1`, `lab2`, `card1`–`card3`, `sumQ`, `sumW`, `dfn`; `hist/scene.js` — тайминги по меткам озвучки (`T.word`, `T.bas`, `T.rep`, `T.cent`, `T.y1257`, `T.xiv`, `T.tax`, `T.eye`, `T.army`, `T.sum`, `T.fin`) и траектория баскака `bez`; `make_mix_hist.py` — звуки по тем же меткам. Герои от задания не зависят.

## Контрольные суммы (SHA-256)

```
6a1f99852b52e778174d2ba7907279409b7f94d80817ad39f667eb1a71f973f0  hist/index.html
afdb38c1f1d231c975bb3e66dbe38e6d9538ff3cc4431b9f10722ad841221a3a  hist/scene.js
54fae00d1b7fcd57bce50ebc9bd448e207f7afaad60c86ed8a1fbd70f97990a8  hist/timeline.json
325ffaeb6aa3b36eae5d331e7e86dc4b7aa79101ef55bc1420f904bc672f9d8d  hist/characters/A_body.png
482f99a992541fb3d319188829042426ffd264b66bc04e4331c9539a92953895  hist/characters/A_head.png
59de8638c3a988c3093d813ced52fa8d4834ad88c581c4d653608b33ae3566c1  hist/characters/A_oBody.png
4796eb21c4e9669f221657d0fcca3446be69ba25c5be22140f0a694046bbe6d3  hist/characters/A_oHead.png
c431c4bd42939ffc7e5625eb57bca121528f5398555472e9b2f449c2df879e26  hist/characters/E_body.png
534d9ec84f5b1820d036e0ea1b1b2fa035c8d253b249cb104138e985508e8b88  hist/characters/E_head.png
68d3a275a659a4a6e6b205d208d782b60c97e7462489b245d26de261df7a54af  hist/characters/E_oBody.png
509b2c75261388917297f9ab3633f300aea9bf8659491f864f9d6aa47e2a2496  hist/characters/E_oHead.png
b74678e1e731d15d645f12c208dce3605b6fb2b31a1a6d76fdd5acbd5141f343  hist/characters/P_body.png
d70da6f8a86597283ee23ec307fe64be2489db234f048021644977a87e650fc1  hist/characters/P_head.png
9811f8376df4493b629661e4fa2d4718182c47b16554b0371459410f075aa9b1  hist/characters/P_headB.png
fe2dfb874d7a0e6760ad8506ca555e020bc4570b50ae1c319a632face6ee03a6  hist/characters/P_oBody.png
ad38d503fdc40294b67dffb7c76bd73d255b72b52db452f6c9e1948d1e062c64  hist/characters/P_oHead.png
f6834c3d19b50d5ff2a8a16e7f6115f57e3b692c196c8543976181878c50b2fe  hist/characters/bake_trio.mjs
82eb27e88ee05ce762d257a4e7ae764308d744c15111fb78c67a7d620e2f546a  hist/characters/layers.json
9a8dc7cf21bd7f896ee418edb729fc79da3c5b5be7dcbf90be9463ef42a45619  hist/characters/source.html
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
522518251453fa1146b5275cfd6d5b2c10c876f1aaf1eacd78f9efe64915a851  hist/baked-v2/final.wav
```
