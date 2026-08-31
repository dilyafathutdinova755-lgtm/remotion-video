#!/usr/bin/env bash
# Ускоряет готовые ролики из out/ в 1.2 раза, видео и звук вместе, с
# синхроном без дрейфа. Причины именно такого набора флагов — в
# PLAYBOOK.md §11a:
#
#  - setpts не собран в бандле ffmpeg у Remotion, поэтому видео ускоряем
#    через -itsscale на отдельном (продублированном) входе, а не фильтром;
#  - звук ускоряем отдельным входом через atempo — тоже без setpts;
#  - выходной fps должен быть явно задан (60*1.2=72), иначе ffmpeg
#    остаётся на исходных 60 cfr и роняет ~1 кадр из 6.
#
# Использование:
#   scripts/speedup.sh Hist19Bulygin Hist19Oprichnina ...
# Берёт out/<Id>.mp4, кладёт out/<Id>-1.2x.mp4.
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Использование: $0 <CompositionId> [<CompositionId> ...]" >&2
  exit 1
fi

# Системного ffmpeg в PATH нет — берём собранный вместе с Remotion
# (у него есть silencedetect/atempo, но нет setpts, см. комментарий выше).
FFMPEG=/home/user/remotion-video/node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg
if [ ! -x "$FFMPEG" ]; then
  FFMPEG=$(find /home/user/remotion-video/node_modules/@remotion -name ffmpeg -type f 2>/dev/null | head -1)
fi

for id in "$@"; do
  in="out/$id.mp4"
  out="out/${id}-1.2x.mp4"
  if [ ! -f "$in" ]; then
    echo "Нет файла $in, пропускаю" >&2
    continue
  fi
  echo "=== $id"
  "$FFMPEG" -y -itsscale 0.833333 -i "$in" -i "$in" \
    -map 0:v -map 1:a \
    -af atempo=1.2 \
    -r 72 -vsync cfr \
    -c:v libx264 -pix_fmt yuv420p -crf 18 -preset medium \
    -c:a aac -b:a 192k \
    "$out"
done
