# Биология v1 — утверждённая версия (заморожено)

Этот каталог и ветка `bio-approved-v1` хранят ровно ту версию, из которой получился утверждённый ролик
`bio-video-v1.mp4` (43,07 с, 1080×1920, 60 к/с, временная озвучка RHVoice). Дальнейшие эксперименты
идут в ветке `experiment/math-vessels-visual` и сюда не попадают. Ничего не подключено к автоматизации.

## Как однозначно определить версию

- Репозиторий: `dilyafathutdinova755-lgtm/remotion-video`
- Ветка: `bio-approved-v1`, тег: `bio-v1-approved`
- Коммит с кодом, из которого рендерился ролик: `f5daec24845d6d2e6745ae6b04b0e11ee8361352`
  (исходный код в этой ветке не менялся; поверх добавлен только коммит с материалами и этим файлом)
- SHA-256 итогового MP4: `1cccfd6351963b001ce31ddd65b4d0411b0c552a767b9f0a30b66f5a37045a0c`

## Что входит

Код (из коммита f5daec2, пути от `experiments/vessels-3d/`):
`bio/index.html`, `bio/scene.js`, `bio/timeline.json`, `make_audio_bio.py`, `make_mix_bio.py`,
`render.mjs`, `ru/logo3d.js` (3D-иконка), `ru/logo.png` (настоящая иконка приложения), `package.json`.

Материалы, которые раньше были только локально (здесь добавлены принудительно):
- `bio/fonts/*.ttf` — Unbounded 700/800, Onest 500/700/800, JetBrains Mono 600 (Google Fonts, лицензия OFL);
- `bio/assets/voice.wav` — синтезированный голос;
- `package-lock.json` — точные версии npm-зависимостей;
- `bio/approved-v1/final.wav` — сведённый звук (голос + эффекты + эмбиент);
- `bio/approved-v1/video-silent.mp4` — картинка без звука прямо из рендера;
- `bio/approved-v1/bio-video-v1.mp4` — утверждённый ролик;
- `bio/approved-v1/render.log` — лог рендера;
- `bio/approved-v1/storyboard/` — исходники раскадровки (холст https://claude.ai/artifact/ELfFXySNh7b2UhoTgzx14p, версия 11).

## Окружение рендера

Node 22.22.0, three 0.170.0, playwright 1.56.1, Chromium headless shell 141.0.7390.37
(`/opt/pw-browsers/chromium_headless_shell-1194`, SwiftShader), ffmpeg 6.1.1, RHVoice 1.8.0 (голос «tatiana»),
Python 3 + numpy 2.4.6.

## Как получен MP4 (команды из `experiments/vessels-3d/`)

    python3 make_audio_bio.py        # bio/assets/voice.wav + bio/timeline.json
    python3 make_mix_bio.py          # bio/out/final.wav
    PAGE=experiments/vessels-3d/bio/index.html OUT=bio/out node render.mjs video --workers 4 --fps 60
    ffmpeg -i bio/out/video-silent.mp4 -i bio/out/final.wav -c:v libx264 -crf 18 -preset slow \
           -pix_fmt yuv420p -c:a aac -b:a 192k -shortest bio-video-v1.mp4

Повторный запуск `make_audio_bio.py` пересинтезирует голос — для точной копии используйте сохранённые
`bio/assets/voice.wav`, `bio/timeline.json` и `bio/approved-v1/final.wav`, не перегенерируя их.

## Где зашито тестовое задание («белок из 120 аминокислот → 360 нуклеотидов»)

Задание не вынесено в данные — оно вшито в код в нескольких местах:
- `make_audio_bio.py`, строки 14–20 (`SCRIPT`) — весь текст озвучки: условие, три шага, призыв;
- `bio/timeline.json` — тот же текст и замеренные метки слов (генерируется из `make_audio_bio.py`);
- `bio/index.html`, строки 68–96 — все подписи на экране: «белок · 120», «матричная цепь», «ДНК», «белок»,
  «аминокислот», «кодирует», «? нуклеотидов», карточка условия (строка 78), заголовки шагов «Триплет» /
  «Умножаем» / «Одна цепь» (81–83), «1 аминокислота = 3 нуклеотида» (88), «120 аминокислот» (89),
  «120 × 3» и «= 360» (90–91), «матричная», «вторая цепь» (93–94), ярлык ответа (96);
- `bio/scene.js` — число бусин 120 (строки 50, 52, 125, 138, 146, 154), 360 мини-капсул (75, 162),
  буквы триплета «Т», «А», «Ц» (65), счётчик до 120 (286), текст заметки «120 × 3 …» (322),
  ответ «360 нуклеотидов» (336); раскладки сетки 12 × 10 (функции `grid1`, `grid2`, `strip`);
- `make_mix_bio.py`, строки 131–136 — звуки, привязанные к 120 бусинам и счётчику.

## Контрольные суммы (SHA-256)

```
bfcee0bd031630870a22c0439560e37b4ad6605f4431fd9a4ed0ca0e1f00c5d7  bio/index.html
f1e95663316fb03ff989aa8a4a27917c6c15f530db008c85546d09ce1c9773e9  bio/scene.js
a41185423741a10230a649e0f0413b106f03867a33c052d82e3502c8d3de5ec7  bio/timeline.json
df54dbfafba61d4911eb3dab9bba2d20531fb009f01d64dd42fa96ab862584d8  bio/fonts/JBMono-600.ttf
24744bba5ddd417b44ab201a5eae234ba3f1bacfc56d552e51799e5e3eec26c4  bio/fonts/Onest-500.ttf
bee38f5b47923dbb2f9d6856de95ed107d277e4568e42836dbe3e665c73bc468  bio/fonts/Onest-700.ttf
4cf0e47ff070235a29cb76c3f218f04c8d95302017c6480b4980d7f51b76e2a6  bio/fonts/Onest-800.ttf
0587b7ea8407976e5feda03dcba410dde297fa203ae115eb1098d64186efef5c  bio/fonts/Unbounded-700.ttf
2f1f467b85c320c52e054b6d937fc98b0b2e8319bd181f3857e3ab844255bf42  bio/fonts/Unbounded-800.ttf
4ee2b07786eb394719a841a69f78aa8a049560e46a895da9100b2c21c682ebed  bio/assets/voice.wav
2b8d495430d8a4707c7fa871639dab38247b11263c0eabb5354bd9fc3cc712b9  ru/logo3d.js
a0c0ffb6f6cfa6393aba5e5318f20a62b43fd755e6878f5cac68f7bb8a108da3  ru/logo.png
721d71f07b5bda41909c398de7a5bb8409333f57da16c5dc2fbfaf553759d6a9  render.mjs
d68faf7399c6005cf2e5189d4f51bcb930cdb6601e0a001369ee08c1bb3ffeaf  make_audio_bio.py
9d21b79921f97a87ec291521052587e5adbc86371e1baf0ed2914644dd7789e3  make_mix_bio.py
73fb65f84b3571fee43a67e1d333512f82ab5e90ba4ee26cc6ac84ea002d81ba  package.json
b5238e423a555de81b8d076dd77bf65e9e7920bbe2ca406a65cdb70e59c9bc9d  package-lock.json
1cccfd6351963b001ce31ddd65b4d0411b0c552a767b9f0a30b66f5a37045a0c  bio/approved-v1/bio-video-v1.mp4
9aea4c4f6862c6bf79814cdb6b63ad1a40d8b40de751a34d779cae783cdb9b84  bio/approved-v1/video-silent.mp4
7a996b50c52c81a0c85a464f9c77d8474822b51ce2468e46e6f954b6813ca338  bio/approved-v1/final.wav
```
