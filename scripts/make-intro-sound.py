"""Synthesise the Mochi Chef bounce sound, timed to src/components/splash/motion.ts (ms from intro start).
Each landing is a soft thud as it squashes, then a springy cartoon "boing" as it launches back up."""
import math, random, struct, sys, wave
RATE, LENGTH = 24000, 2.0
# landing ms, launch ms, base Hz, gain, decay s, wobble depth (motion.ts LANDINGS; launch = landing + time squashed)
LANDINGS = [(520, 610, 165, 0.95, 0.20, 0.10), (1050, 1120, 215, 0.6, 0.13, 0.08), (1360, 1365, 270, 0.3, 0.07, 0.05)]
buf = [0.0] * int(RATE * LENGTH)
random.seed(3)

def add(start_ms, fn, dur):
    i0 = int(start_ms / 1000 * RATE)
    for n in range(int(dur * RATE)):
        if i0 + n < len(buf):
            buf[i0 + n] += fn(n / RATE)

for ms, launch, base, gain, decay, wobble in LANDINGS:
    phase = [0.0]
    def boing(t, base=base, gain=gain, decay=decay, wobble=wobble, phase=phase):
        rise = 1 + 0.9 * (1 - math.exp(-t / 0.03))                      # twang up as the spring releases
        wob = 1 + wobble * math.exp(-t / 0.16) * math.sin(2 * math.pi * 16 * t)  # spring wobble
        phase[0] += 2 * math.pi * base * rise * wob / RATE
        p = phase[0]
        tone = math.sin(p) + 0.32 * math.sin(2 * p) + 0.12 * math.sin(3 * p)
        env = min(1, t / 0.003) * math.exp(-t / decay)
        return gain * env * tone
    def thud(t, gain=gain):
        return gain * 0.8 * math.sin(2 * math.pi * (95 - 40 * t / 0.06) * t) * math.exp(-t / 0.025)
    add(launch, boing, decay * 5)
    add(ms, thud, 0.08)

peak = max(abs(x) for x in buf)
scale = 0.7 / peak
tail = int(0.05 * RATE)
for i in range(tail):
    buf[-tail + i] *= 1 - i / tail
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
    w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, x * scale)) * 32767)) for x in buf))
print("ok")
