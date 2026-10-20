# История v1 — утверждённая раскадровка (заморожено)

**Важно: видео (MP4) по истории не создавалось.** Утверждена раскадровка — холст в Claude Design.
Кода рендера и аудио для истории нет; здесь сохранена ровно та версия раскадровки, которую утвердили.

## Как однозначно определить версию

- Репозиторий: `dilyafathutdinova755-lgtm/remotion-video`, ветка `history-approved-v1`, каталог `experiments/history/approved-v1/`
- Холст: https://claude.ai/artifact/8TzCDj7khxuAd4sscXY6p2, версия 12, id версии `1792474848-d0c9`
  (файлы ниже побайтно совпадают с опубликованными в этой версии: размеры сверены со списком файлов холста).
- Иконка приложения на холсте загружена как ассет `/_blob/5a4fd2f8a03dc0a59ab16167dc4b496b`;
  её копия — `storyboard/logo-asset.png` (тот же SHA-256, что у загруженного файла).

## Состав

`storyboard/canvas.json` — индекс холста; `Main.dc.html` — обзор; `Trio.dc.html` — три персонажа (векторные SVG);
`looks.dc.html` — 4 варианта розового; `s1-intro … s8-cta.dc.html` — сцены; `hist.css` — общие стили.
Шрифты Ruslan Display и Manrope подключаются с Google Fonts по ссылке (локальных файлов нет).

## Где зашито тестовое задание («баскак»)

Задание не вынесено в данные — оно вписано прямо в разметку:
- `Main.dc.html`, строки 19–39 — заголовок, задание, ответ, предупреждение о датах, весь текст озвучки;
- `looks.dc.html` строка 25, `s2-cond.dc.html` строки 34 и 46, `s3-pause.dc.html` строки 24 и 37, `s7-sum.dc.html` строки 24 и 36 — слово «Баскак» на кадрах;
- `s4-who.dc.html` — шатёр «Золотая Орда», храм «Русь», фигурка баскака (SVG, строки 26–66), плашка «представитель хана Золотой Орды на Руси» (строка 70);
- `s5-when.dc.html` — «XIII–XIV» (строка 26), «1257 · перепись» (строка 36), «нач. XIV · дань собирают князья» (строка 40);
- `s6-what.dc.html` строки 35, 45, 54 — три карточки «что делал»;
- `s7-sum.dc.html` строки 25 и 37 — итоговое определение;
- голос в колонках «Голос» каждой сцены (s2 стр. 57, s4 стр. 82, s5 стр. 52, s6 стр. 67, s7 стр. 47).
Персонажи (`Trio.dc.html`) от задания не зависят.

## Контрольные суммы (SHA-256)

```
bd1b63ec821515f6a148fe926ece306044485a43cd70aac55814f884167bc091  storyboard/Main.dc.html
7a1241f09781afc94098e07964888c066f8a838e804932d0826e54a532237f78  storyboard/Trio.dc.html
9c2e5bc77f076d2f868a2532b2fc6971f3cb17728bb3bea61590097c02971fcb  storyboard/canvas.json
c5ccddf413680a796bdf6e2c730ab3d9976ba2332f75efd36feda498a004beb1  storyboard/hist.css
6fccf7334986a1baa0c33bf52f5aa7a131d4d7547402ae13dfef0f52a1ae7f62  storyboard/logo-asset.png
baff33cd7973ec5fe9da9c99ea5652a1359a8f19b11191d15a36ef1552030cf2  storyboard/looks.dc.html
71e786453cbf7592e5542a75bf222224314d51012e8dfafe47a862fbda00e41c  storyboard/s1-intro.dc.html
77d73ee8f0a2ac5bad42fc92785a923c89215dab42751e4ac95e7b5f1b7e2ce8  storyboard/s2-cond.dc.html
8682a103a071d5f1a1ddf5ea69db27a87d9be057ddd8cdc1f789cc39ca9847d4  storyboard/s3-pause.dc.html
83aa3e202799237ac26a62e64cd09e52e96933e7b5a60419f37e57b1b39fab85  storyboard/s4-who.dc.html
ea33b300b3733242bb81476e2877e4a61c3f2bbcd5f0e80d6467a12eaf453250  storyboard/s5-when.dc.html
d1485f7f14a61bf66545706b04b341e8347edb02f720166ec8083fadc8d5dfa9  storyboard/s6-what.dc.html
78d04d4f023f1084cba80bf68aa7b8e9cbed470f0c17e98427c0503253db176c  storyboard/s7-sum.dc.html
79bc9434ab2ed6cf51404a1a799a03ad2fab9bb398a0d4a8866dd08a68503d13  storyboard/s8-cta.dc.html
```
