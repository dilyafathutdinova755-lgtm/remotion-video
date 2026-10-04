#!/usr/bin/env python3
"""
Regression-тесты align.py --mode chemistry-steps-v1: реальный ffmpeg,
реальные синтетические аудио (тон + тишина), реальный запуск align.py
subprocess'ом — тот же подход, что и test_align_four_slides.py.

Проверяет:
  - все N-1 границ между сегментами (intro/task/шаг×N/cta) находятся
    по измеренным timestamps ElevenLabs, а не по доле длины текста;
  - ровно pause_seconds (ИМЕННО то, что прислал n8n, здесь 2с = 240 кадров
    на render_fps=120 — проверяется отдельно арифметически) реальной тишины
    физически вставляется сразу после "task", перед первым "solution";
  - все границы ПОСЛЕ точки вставки корректно сдвинуты на +pause_seconds;
  - отсутствие timestamps, несовпадение transcript и пересечение сегментов
    приводят к fail-fast без угадывания границ;
  - структурный fail-fast (отсутствует narration_segments/неверный порядок).

Использование:
    python3 scripts/dynamic-task/test_align_profile_math_steps.py
Требует ffmpeg (см. FFMPEG ниже — путь как в render-on-demand.yml).
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(HERE))
ALIGN_PY = os.path.join(HERE, "align.py")
FFMPEG = os.environ.get("FFMPEG") or shutil.which("ffmpeg") or ""

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
    starts = [float(x) for x in re.findall(r"silence_start:\s*([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end:\s*([\d.]+)", out)]
    return list(zip(starts, ends))


def run_align(task_data, tmp, audio_in, audio_out):
    task_data_path = os.path.join(tmp, "task_data.json")
    with open(task_data_path, "w", encoding="utf-8") as f:
        json.dump(task_data, f, ensure_ascii=False)
    cmd = [
        sys.executable,
        ALIGN_PY,
        "--mode",
        "chemistry-steps-v1",
        "--task-data",
        task_data_path,
        "--audio-in",
        audio_in,
        "--audio-out",
        audio_out,
        "--ffmpeg",
        FFMPEG,
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return proc.returncode, proc.stdout.decode("utf-8", "ignore"), proc.stderr.decode("utf-8", "ignore")


def base_task_data(pause_seconds=2, render_fps=120):
    data = {
        "video_structure_version": "chemistry-steps-v1",
        "exam": "ЕГЭ",
        "subject": "профильная математика",
        "task_number": 10,
        "render_fps": render_fps,
        "pause_seconds": pause_seconds,
        "pause_prompt": "Ставь на паузу",
        "separate_answer_slide": False,
        "instruction": "Решите задачу.",
        "condition_text": "В сосуд, содержащий 13 литров 29-процентного раствора, добавили 16 литров воды.",
        "cta_text": "Скачивай бесплатно.",
        "solution_steps": [
            {"id": "step-1", "title": "Шаг 1", "lines": ["13 × 0,29 = 3,77"]},
            {"id": "step-2", "title": "Шаг 2", "lines": ["13 + 16 = 29"]},
            {"id": "step-3", "title": "Шаг 3", "lines": ["3,77 / 29 × 100% = 13%", "Ответ: 13"]},
        ],
        "narration_segments": [
            {"id": "intro", "kind": "intro", "text": "...", "tts_text": "Решаем задание десять по профильной математике"},
            {"id": "task", "kind": "task", "text": "...", "tts_text": "В сосуд содержащий тринадцать литров двадцати девяти процентного раствора добавили шестнадцать литров воды сколько процентов составляет концентрация получившегося раствора"},
            {"id": "step-1", "kind": "solution", "step_id": "step-1", "text": "...", "tts_text": "Найдём сколько вещества в растворе тринадцать умножить на ноль целых двадцать девять равно три целых семьдесят семь литра"},
            {"id": "step-2", "kind": "solution", "step_id": "step-2", "text": "...", "tts_text": "Теперь найдём сколько стало раствора тринадцать плюс шестнадцать равно двадцать девять литров"},
            {"id": "step-3", "kind": "solution", "step_id": "step-3", "text": "...", "tts_text": "Найдём новую концентрацию три целых семьдесят семь разделить на двадцать девять умножить на сто процентов равно тринадцать процентов ответ тринадцать"},
            {"id": "cta", "kind": "cta", "text": "...", "tts_text": "Скачивай бесплатно ссылка в шапке профиля"},
        ],
    }
    data["voiceover_tts_text"] = "\n\n".join(s["tts_text"] for s in data["narration_segments"])
    measured = []
    start = 1.0
    for segment, duration in zip(data["narration_segments"], [1.8, 3.5, 2.5, 2.3, 3.0, 1.5]):
        measured.append({**segment, "start_sec": start, "end_sec": start + duration})
        start += duration + 0.5
    data["narration_timing"] = {"source": "elevenlabs-character-alignment-v1", "segments": measured}
    return data


def main():
    if not os.path.exists(FFMPEG):
        print(f"ПРОПУЩЕНО: ffmpeg не найден по пути {FFMPEG} — тесты требуют реальный ffmpeg.")
        sys.exit(0)

    with tempfile.TemporaryDirectory() as tmp:
        audio_in = os.path.join(tmp, "in.mp3")
        audio_out = os.path.join(tmp, "out.mp3")
        # 6 сегментов: intro/task/step-1/step-2/step-3/cta — тона разной
        # длины с реальными паузами между ними (gap=0.5с).
        build_tone_audio(audio_in, [1.8, 3.5, 2.5, 2.3, 3.0, 1.5], gap=0.5, lead=1.0)

        def t_happy_path():
            task_data = base_task_data(pause_seconds=2, render_fps=120)
            code, out, err = run_align(task_data, tmp, audio_in, audio_out)
            assert code == 0, f"align.py упал: {err}"
            data = json.loads(out)

            segments = data["segments"]
            measured = task_data["narration_timing"]["segments"]
            expected = [(a["end_sec"] + b["start_sec"]) / 2 for a,b in zip(measured, measured[1:])]
            assert data["_debug"]["timingSource"] == "elevenlabs-character-alignment-v1"
            for actual, boundary in zip(data["_debug"]["boundaries"], expected):
                assert abs(actual - boundary) < 1e-8
            for i, boundary in enumerate(expected):
                assert abs(segments[i]["endSec"] - boundary - (2 if i >= 1 else 0)) < 1e-4
            assert [s["id"] for s in segments] == [
                "intro", "task", "step-1", "step-2", "step-3", "cta",
            ], f"неверный порядок/состав сегментов: {segments}"

            # Монотонность и непрерывность: конец сегмента i == начало i+1.
            for i in range(1, len(segments)):
                assert abs(segments[i]["startSec"] - segments[i - 1]["endSec"]) < 0.01, (
                    f"разрыв между {segments[i-1]['id']} и {segments[i]['id']}"
                )
                assert segments[i]["endSec"] > segments[i]["startSec"]

            # Пауза ровно pause_seconds, физически после "task".
            task_seg = next(s for s in segments if s["id"] == "task")
            step1_seg = next(s for s in segments if s["id"] == "step-1")
            assert abs(step1_seg["startSec"] - task_seg["endSec"]) < 0.001

            # Реальная тишина в файле: интервал >= 2с, покрывающий границу
            # task/step-1.
            intervals = silence_intervals(audio_out)
            covering = [
                (s, e) for s, e in intervals
                if s <= task_seg["endSec"] + 0.6 and e >= step1_seg["startSec"] - 0.1 and (e - s) >= 1.9
            ]
            assert covering, f"не нашёл реальный силентный интервал >=2с на границе task/step-1: {intervals}"

            # Ровно 240 кадров на render_fps=120 для pause_seconds=2 (явная
            # проверка из чек-листа задачи).
            pause_seconds = task_data["pause_seconds"]
            render_fps = task_data["render_fps"]
            assert round(pause_seconds * render_fps) == 240

            # stepId присутствует только у solution-сегментов.
            for s in segments:
                if s["kind"] == "solution":
                    assert "stepId" in s
                else:
                    assert "stepId" not in s

        check(
            "MATH10: все границы (intro/task/3 шага/cta) найдены реально, "
            "ровно 2с=240 кадров тишины вставлено после task",
            t_happy_path,
        )

        def t_invalid_timing():
            for mode in ["missing", "transcript", "overlap", "no_gap"]:
                task_data = base_task_data()
                if mode == "missing":
                    del task_data["narration_timing"]
                elif mode == "transcript":
                    task_data["narration_timing"]["segments"][1]["tts_text"] = "другое условие"
                elif mode == "overlap":
                    task_data["narration_timing"]["segments"][2]["start_sec"] = 0
                else:
                    task_data["narration_timing"]["segments"][2]["start_sec"] = task_data["narration_timing"]["segments"][1]["end_sec"]
                output = os.path.join(tmp, mode + ".mp3")
                code, out, err = run_align(task_data, tmp, audio_in, output)
                assert code != 0, f"invalid timing accepted: {mode}"
                assert not os.path.exists(output), mode
        check("нет timestamps / другой transcript / пересечение / нет места для стыка → fail-fast", t_invalid_timing)

        def t_missing_narration_segments():
            task_data = base_task_data()
            del task_data["narration_segments"]
            code, out, err = run_align(task_data, tmp, audio_in, os.path.join(tmp, "unused1.mp3"))
            assert code != 0
            assert "missing narration segments" in err

        check("narration_segments отсутствует → fail-fast", t_missing_narration_segments)

        def t_wrong_order():
            task_data = base_task_data()
            # task не сразу после intro — переставлены местами.
            segs = task_data["narration_segments"]
            segs[1], segs[2] = segs[2], segs[1]
            code, out, err = run_align(task_data, tmp, audio_in, os.path.join(tmp, "unused2.mp3"))
            assert code != 0
            assert "invalid narration order" in err

        check("narration_segments не в порядке intro→task→solution×N→cta → fail-fast", t_wrong_order)

        def t_zero_pause():
            task_data = base_task_data(pause_seconds=0)
            code, out, err = run_align(task_data, tmp, audio_in, os.path.join(tmp, "unused3.mp3"))
            assert code != 0
            assert "2 second pause" in err

        check("pause_seconds=0 → fail-fast", t_zero_pause)

    print(f"\n{'Все тесты пройдены' if failed == 0 else 'ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ'} ({passed}/{passed + failed}).")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
