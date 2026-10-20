"""
Generates the café sounds (assets/sounds/cafe-*.m4a) from code: no recordings, nothing to license.

  python -I scripts/make-cafe-sounds.py

Needs numpy and ffmpeg on PATH. cafe-tap (a soft wooden tap with a bell), cafe-boing (the companion's springy hop),
cafe-enter (a rising chime with a whoosh, for Slide to enter) and cafe-music (a 20-second music-box loop in C major,
96 bpm, rendered with its tails wrapped to the start so it loops without a seam).
"""
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

RATE = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sounds")


def env(n, attack, decay):
    t = np.arange(n) / RATE
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def bell(freq, dur, decay, gain=1.0):
    n = int(dur * RATE)
    t = np.arange(n) / RATE
    tone = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t / (decay * 0.4)) \
        + 0.12 * np.sin(2 * np.pi * freq * 3.01 * t) * np.exp(-t / (decay * 0.25))
    return gain * tone * env(n, 0.004, decay)


def noise(dur, decay, gain, smooth=6):
    n = int(dur * RATE)
    x = np.random.default_rng(7).standard_normal(n)
    x = np.convolve(x, np.ones(smooth) / smooth, mode="same")
    return gain * x * env(n, 0.002, decay)


def place(buf, sig, at):
    i = int(at * RATE)
    end = min(len(buf), i + len(sig))
    buf[i:end] += sig[: end - i]


def write(name, sig, peak=0.8):
    sig = sig / max(1e-9, np.max(np.abs(sig))) * peak
    pcm = (np.clip(sig, -1, 1) * 32767).astype("<i2")
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, name + ".wav")
        with wave.open(wav, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(RATE)
            w.writeframes(pcm.tobytes())
        dest = os.path.join(OUT, name + ".m4a")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "aac", "-b:a", "96k", dest], check=True)
    print("wrote", os.path.relpath(dest))


def tap():
    buf = np.zeros(int(0.4 * RATE))
    place(buf, noise(0.05, 0.012, 0.5, smooth=18), 0)
    place(buf, bell(196, 0.12, 0.03, 0.7), 0)
    place(buf, bell(1568, 0.35, 0.12, 0.22), 0.012)
    return buf


def boing():
    n = int(0.45 * RATE)
    t = np.arange(n) / RATE
    f = 300 + 520 * (1 - np.exp(-t / 0.06)) + 25 * np.sin(2 * np.pi * 18 * t)
    phase = 2 * np.pi * np.cumsum(f) / RATE
    return (np.sin(phase) + 0.2 * np.sin(2 * phase)) * env(n, 0.005, 0.14)


def enter():
    buf = np.zeros(int(1.3 * RATE))
    whoosh = noise(0.7, 0.25, 0.35, smooth=40)
    whoosh *= np.linspace(0.2, 1, len(whoosh))
    place(buf, whoosh, 0)
    for i, f in enumerate([784, 988, 1175, 1568]):
        place(buf, bell(f, 0.9, 0.35, 0.5), 0.12 + i * 0.09)
    return buf


def music():
    bpm, bars = 96, 8
    beat = 60 / bpm
    length = bars * 4 * beat
    buf = np.zeros(int((length + 3) * RATE))
    notes = {"C": 261.63, "D": 293.66, "E": 329.63, "F": 349.23, "G": 392.0, "A": 440.0, "B": 493.88}
    hz = lambda name, octave: notes[name] * 2 ** (octave - 4)
    chords = [("C", ["C", "E", "G", "B"]), ("A", ["A", "C", "E", "G"]), ("F", ["F", "A", "C", "E"]), ("G", ["G", "B", "D", "E"])]
    melody = ["E", "G", "A", "G", "E", "D", "C", "D", "E", "G", "C", "B", "A", "G", "E", "G"]
    for bar in range(bars):
        root, tones = chords[(bar // 2) % 4]
        start = bar * 4 * beat
        place(buf, bell(hz(root, 3), 2.4, 0.9, 0.55), start)
        for step in range(8):
            tone = tones[(step * 2 + bar) % 4] if step % 2 == 0 else tones[(step + 1) % 4]
            place(buf, bell(hz(tone, 5), 1.0, 0.35, 0.22 if step % 2 else 0.3), start + step * beat / 2)
        if bar % 2 == 0:
            for k in range(2):
                m = melody[(bar // 2 * 4 + k * 2) % len(melody)]
                place(buf, bell(hz(m, 6), 1.6, 0.6, 0.28), start + k * 2 * beat + beat / 2)
    n = int(length * RATE)
    loop = buf[:n].copy()
    loop[: len(buf) - n] += buf[n:]
    return loop


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    try:
        write("cafe-tap", tap(), 0.55)
        write("cafe-boing", boing(), 0.5)
        write("cafe-enter", enter(), 0.6)
        write("cafe-music", music(), 0.45)
    except (OSError, subprocess.CalledProcessError) as error:
        sys.exit("Could not write the café sounds (is ffmpeg on PATH?): " + str(error))
