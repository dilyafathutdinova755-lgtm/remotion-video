#!/usr/bin/env bash
# Рендерит перечисленные композиции из уже собранного build/ и печатает
# длительность каждого файла — без ffprobe, разбором заголовка mvhd.
#
# Использование:
#   npx remotion bundle src/index.ts --out-dir=build
#   scripts/render.sh Phys3Ball Phys3RollDown Phys3TruckCar
#
# Файлы уходят в out/<Id>.mp4. Готовый браузер экономит время: скачивать
# Chrome Headless Shell из сети нельзя, egress до remotion.media закрыт.
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Использование: $0 <CompositionId> [<CompositionId> ...]" >&2
  exit 1
fi

BROWSER=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
if [ ! -x "$BROWSER" ]; then
  # На случай другого окружения — берём любой headless_shell, что найдётся
  BROWSER=$(find /opt/pw-browsers -name headless_shell -type f 2>/dev/null | head -1)
fi
if [ -z "${BROWSER:-}" ]; then
  echo "Не нашёл headless_shell в /opt/pw-browsers — рендер пойдёт через обычный скачиваемый Chrome" >&2
  BROWSER=""
fi

mkdir -p out

for id in "$@"; do
  echo "=== $id"
  if [ -n "$BROWSER" ]; then
    npx remotion render build "$id" "out/$id.mp4" --browser-executable="$BROWSER" --concurrency=4
  else
    npx remotion render build "$id" "out/$id.mp4" --concurrency=4
  fi
done

python3 - "$@" <<'PY'
import struct, os, sys

for name in sys.argv[1:]:
    path = f"out/{name}.mp4"
    if not os.path.exists(path):
        print(f"{name:24} — файл не найден")
        continue
    head = open(path, "rb").read(4096)
    i = head.find(b"mvhd")
    if i < 0:
        print(f"{name:24} — не нашёл mvhd, длительность не определить")
        continue
    version = head[i + 4]
    if version == 0:
        timescale, duration = struct.unpack(">II", head[i + 16 : i + 24])
    else:
        timescale = struct.unpack(">I", head[i + 24 : i + 28])[0]
        duration = struct.unpack(">Q", head[i + 28 : i + 36])[0]
    seconds = duration / timescale
    size_mb = os.path.getsize(path) / 1024 / 1024
    print(f"{name:24} {seconds:6.2f} с  {size_mb:4.1f} МБ")
PY
