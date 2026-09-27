#!/usr/bin/env python3
"""
Regression-тесты align.py --mode four-slides-v1: реальный ffmpeg, реальные
синтетические аудио (тон + тишина), реальный запуск align.py subprocess'ом
— то же самое, чем сама разметка проверялась при разработке (см. отчёт по
video_structure_version=four-slides-v1). Никаких моков ffmpeg/align.py.

Проверяет:
  - read_task_aloud=false: границы найдены, тишина реально вставлена
    (silencedetect после сплайса), problem-длительность = reveal+pause;
  - read_task_aloud=true: то же самое, тишина = ровно pause_seconds;
  - когда в аудио нет пауз рядом с ожидаемой позицией — fail-fast
    (exit != 0), а не угадывание по проценту длины текста.

Использование:
    python3 scripts/dynamic-task/test_align_four_slides.py
Требует ffmpeg (см. FFMPEG ниже — путь как в render-on-demand.yml).
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(HERE))
ALIGN_PY = os.path.join(HERE, "align.py")
FFMPEG = os.path.join(
    REPO_ROOT, "node_modules", "@remotion", "compositor-linux-x64-gnu", "ffmpeg"
)

passed = 0
failed = 0


def check(name, fn):
    global passed, failed
    try:
        fn()
        passed += 1
        print(f"  OK  {name}")
    except Exception as e:  # noqa: BLE001 — тестовый раннер, любая ошибка = FAIL
        failed += 1
        print(f"  FAIL  {name}")
        print(f"        {e}")


def build_tone_audio(path, tone_durations, gap, lead):
    """Тон(ы) в mono 44100Hz с паузами между ними — синтетическая замена
    ElevenLabs-аудио: реальный ffmpeg генерирует реальный звук и реальные
    тишины, silencedetect в align.py работает с ним взаправду."""
    inputs = []
    filter_parts = []
    idx = 0

    def add_silence(d):
        nonlocal idx
        inputs.extend(["-f", "lavfi", "-i", f"anullsrc=r=44100:cl=mono:d={d}"])
        filter_parts.append(f"[{idx}:a]")
        idx += 1

    def add_tone(d):
        nonlocal idx
        inputs.extend(["-f", "lavfi", "-i", f"sine=frequency=440:r=44100:d={d}"])
        filter_parts.append(f"[{idx}:a]")
        idx += 1

    add_silence(lead)
    for i, d in enumerate(tone_durations):
        add_tone(d)
        if i < len(tone_durations) - 1:
            add_silence(gap)
    add_silence(gap)

    n = len(filter_parts)
    filter_complex = "".join(filter_parts) + f"concat=n={n}:v=0:a=1[out]"
    cmd = [FFMPEG, "-y"] + inputs + ["-filter_complex", filter_complex, "-map", "[out]", path]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def silence_intervals(path):
    out = subprocess.run(
        [FFMPEG, "-i", path, "-af", "silencedetect=noise=-20dB:d=0.3", "-f", "null", "-"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ).stderr.decode("utf-8", "ignore")
    import re

    starts = [float(x) for x in re.findall(r"silence_start:\s*([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end:\s*([\d.]+)", out)]
    return list(zip(starts, ends))


def run_align(args):
    cmd = [sys.executable, ALIGN_PY] + args
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return proc.returncode, proc.stdout.decode("utf-8", "ignore"), proc.stderr.decode("utf-8", "ignore")


def main():
    if not os.path.exists(FFMPEG):
        print(f"ПРОПУЩЕНО: ffmpeg не найден по пути {FFMPEG} — тесты требуют реальный ffmpeg.")
        sys.exit(0)

    with tempfile.TemporaryDirectory() as tmp:
        intro = "Решаем задание семь из приложения ЕГЭ Тренажёр"
        answer = "Правильно гетр у существительного гетры родительный падеж множественного числа нулевое окончание"
        cta = "Скачивай бесплатно ссылка в шапке профиля"
        task = "Скорость тела равна двадцать метров в секунду найдите путь за две секунды"
        answer_aloud = "Правильно сорок метров используем формулу путь равно скорость умножить на время"

        audio_false_in = os.path.join(tmp, "false_in.mp3")
        audio_false_out = os.path.join(tmp, "false_out.mp3")
        build_tone_audio(audio_false_in, [1.8, 2.5, 1.5], gap=0.5, lead=1.0)

        def t_false_happy_path():
            code, out, err = run_align(
                [
                    "--mode", "four-slides-v1",
                    "--intro-text", intro,
                    "--answer-text", answer,
                    "--cta-text", cta,
                    "--read-task-aloud", "false",
                    "--pause-seconds", "5",
                    "--reveal-seconds", "3.5",
                    "--audio-in", audio_false_in,
                    "--audio-out", audio_false_out,
                    "--ffmpeg", FFMPEG,
                ]
            )
            assert code == 0, f"align.py упал: {err}"
            data = json.loads(out)
            problem_duration = data["answerSec"] - data["introSec"]
            assert abs(problem_duration - 8.5) < 0.05, f"problem duration != reveal+pause: {problem_duration}"
            # Реальная тишина: после сплайса должен найтись один непрерывный
            # силентный интервал длиной не меньше вставленных 8.5с, начинающийся
            # не позже introSec и заканчивающийся не раньше answerSec.
            intervals = silence_intervals(audio_false_out)
            covering = [
                (s, e) for s, e in intervals
                if s <= data["introSec"] + 0.6 and e >= data["answerSec"] - 0.6 and (e - s) >= 8.0
            ]
            assert covering, f"не нашёл реальный силентный интервал ~8.5с в спличенном аудио: {intervals}"

        check("read_task_aloud=false: границы найдены, реальная тишина = reveal+pause", t_false_happy_path)

        audio_true_in = os.path.join(tmp, "true_in.mp3")
        audio_true_out = os.path.join(tmp, "true_out.mp3")
        build_tone_audio(audio_true_in, [1.5, 2.2, 2.0, 1.3], gap=0.5, lead=1.0)

        def t_true_happy_path():
            code, out, err = run_align(
                [
                    "--mode", "four-slides-v1",
                    "--intro-text", intro,
                    "--task-text", task,
                    "--answer-text", answer_aloud,
                    "--cta-text", cta,
                    "--read-task-aloud", "true",
                    "--pause-seconds", "5",
                    "--audio-in", audio_true_in,
                    "--audio-out", audio_true_out,
                    "--ffmpeg", FFMPEG,
                ]
            )
            assert code == 0, f"align.py упал: {err}"
            data = json.loads(out)
            gap_before_answer = data["answerSec"] - data["_debug"]["cutSec"]
            assert abs(gap_before_answer - 5.0) < 0.05, f"вставленная тишина != pause_seconds: {gap_before_answer}"
            intervals = silence_intervals(audio_true_out)
            covering = [
                (s, e) for s, e in intervals
                if s <= data["_debug"]["cutSec"] + 0.6 and e >= data["answerSec"] - 0.6 and (e - s) >= 4.5
            ]
            assert covering, f"не нашёл реальный силентный интервал ~5с в спличенном аудио: {intervals}"

        check("read_task_aloud=true: тишина после task_voiceover_text = ровно pause_seconds", t_true_happy_path)

        audio_bad_in = os.path.join(tmp, "bad_in.mp3")
        audio_bad_out = os.path.join(tmp, "bad_out.mp3")
        # gap=0.0 — сегменты идут вплотную, без пауз между ними: реальных
        # границ внутри файла просто нет, определить их надёжно нельзя.
        build_tone_audio(audio_bad_in, [1.8, 2.5, 1.5], gap=0.0, lead=1.0)

        def t_no_reliable_boundary():
            code, out, err = run_align(
                [
                    "--mode", "four-slides-v1",
                    "--intro-text", intro,
                    "--answer-text", answer,
                    "--cta-text", cta,
                    "--read-task-aloud", "false",
                    "--pause-seconds", "5",
                    "--reveal-seconds", "3.5",
                    "--audio-in", audio_bad_in,
                    "--audio-out", audio_bad_out,
                    "--ffmpeg", FFMPEG,
                ]
            )
            assert code != 0, "align.py должен был отказаться размечать (fail-fast), но завершился успешно"
            assert "надёжно определить границу" in err, f"ожидали сообщение про ненадёжную границу, получили: {err}"
            assert not os.path.exists(audio_bad_out), "audio_out не должен быть создан при fail-fast"

        check("невозможно надёжно определить границу → fail-fast, файл не создан", t_no_reliable_boundary)

    print(f"\n{'Все тесты пройдены' if failed == 0 else 'ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ'} ({passed}/{passed + failed}).")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
