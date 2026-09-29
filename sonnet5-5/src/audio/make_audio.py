#!/usr/bin/env python3
"""
HOLD ON — 20 second techno rollercoaster, synthesised from scratch.

No samples, no plugins: every sound below is oscillators, noise and filters
written in numpy / numba.  The script also writes score.js, a "score" of every
hit (kick, clap, clack, bass note ...) plus band-energy envelopes measured from
the final mix.  The motion-graphics engine reads that file so the picture is
locked to the sound sample-for-sample.

    144 BPM  x  12 bars  =  exactly 20.000 s

    bars 0-1    THE CLIMB      chain-lift clacks, Shepard riser, heartbeat, snare roll, HANG
    bars 2-4    FIRST DROP     kick / rolling bass / arp / hats
    bar  5      AIRTIME        weightless calliope + pad (kick and bass drop out)
    bar  6      THE BUILD      rising arp, riser, roll, HANG
    bars 7-10   SECOND DROP    acid line, supersaw stabs, full drums, key lift
    bar  11     THE STATION    final hit, brake hiss, station bell
"""
import json
import math
import os
import wave

import numpy as np
from numba import njit
from scipy import signal
from scipy.signal import fftconvolve

SR = 48000
BPM = 144.0
BEAT = 60.0 / BPM            # 0.41667 s
STEP = BEAT / 4.0            # one 16th note
BAR = BEAT * 4.0             # 1.6667 s
DUR = 20.0
N = int(round(SR * DUR))
TWO_PI = 2.0 * math.pi
rng = np.random.default_rng(1972)          # 1972: the year the first steel loop opened

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.abspath(os.path.join(HERE, "..", ".."))
REEL_DIR = os.path.abspath(os.path.join(HERE, "..", "reel"))


def T(bar, step=0.0):
    return bar * BAR + step * STEP


def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69.0) / 12.0)


def tarr(n):
    return np.arange(n) / SR


def sos(kind, fc, order=2):
    return signal.butter(order, fc, kind, fs=SR, output="sos")


def filt(x, kind, fc, order=2):
    return signal.sosfilt(sos(kind, fc, order), x, axis=-1)


# ---------------------------------------------------------------------------
# DSP kernels
# ---------------------------------------------------------------------------
@njit(cache=False)
def polyblep(t, dt):
    if t < dt:
        t /= dt
        return t + t - t * t - 1.0
    elif t > 1.0 - dt:
        t = (t - 1.0) / dt
        return t * t + t + t + 1.0
    return 0.0


@njit(cache=False)
def saw_bl(freq, phase0):
    n = freq.shape[0]
    out = np.empty(n)
    ph = phase0
    for i in range(n):
        dt = freq[i] / SR
        v = 2.0 * ph - 1.0
        v -= polyblep(ph, dt)
        out[i] = v
        ph += dt
        if ph >= 1.0:
            ph -= 1.0
    return out


@njit(cache=False)
def pulse_bl(freq, width, phase0):
    n = freq.shape[0]
    out = np.empty(n)
    ph = phase0
    for i in range(n):
        dt = freq[i] / SR
        v = 1.0 if ph < width else -1.0
        v += polyblep(ph, dt)
        p2 = ph - width
        if p2 < 0.0:
            p2 += 1.0
        v -= polyblep(p2, dt)
        out[i] = v
        ph += dt
        if ph >= 1.0:
            ph -= 1.0
    return out


@njit(cache=False)
def ladder(x, cutoff, res, drive):
    """4-pole transistor-ladder low-pass with tanh stages (Huovilainen style), 2x oversampled."""
    n = x.shape[0]
    y = np.empty(n)
    s0 = 0.0
    s1 = 0.0
    s2 = 0.0
    s3 = 0.0
    for i in range(n):
        fc = min(cutoff[i], 0.42 * SR)
        g = 1.0 - math.exp(-TWO_PI * fc / (SR * 2.0))
        xin = x[i] * drive
        for _ in range(2):
            u = math.tanh(xin - 4.0 * res * s3)
            s0 += g * (u - math.tanh(s0))
            s1 += g * (math.tanh(s0) - math.tanh(s1))
            s2 += g * (math.tanh(s1) - math.tanh(s2))
            s3 += g * (math.tanh(s2) - math.tanh(s3))
        y[i] = s3
    return y


@njit(cache=False)
def svf(x, cutoff, q, mode):
    """TPT state-variable filter, per-sample cutoff.  mode 0 LP, 1 BP, 2 HP."""
    n = x.shape[0]
    y = np.empty(n)
    ic1 = 0.0
    ic2 = 0.0
    for i in range(n):
        g = math.tan(math.pi * min(cutoff[i], 0.45 * SR) / SR)
        k = 1.0 / q[i]
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            y[i] = v2
        elif mode == 1:
            y[i] = v1
        else:
            y[i] = x[i] - k * v1 - v2
    return y


def svf_c(x, fc, q, mode):
    x = np.asarray(x, float)
    fc = np.broadcast_to(np.asarray(fc, float), x.shape).copy()
    q = np.broadcast_to(np.asarray(q, float), x.shape).copy()
    return svf(x, fc, q, mode)


@njit(cache=False)
def acid_render(nsamp, on_idx, off_idx, hz, accent, slide, cut_base, cut_depth, res, decay, acc_decay, glide):
    """A whole 303-ish voice: saw -> ladder, with legato slides and accented filter envelopes."""
    out = np.zeros(nsamp)
    ph = 0.0
    f = hz[0]
    target = hz[0]
    env = 0.0
    gate = 0.0
    amp = 0.0
    k = 0
    cur_acc = 0.0
    s0 = 0.0
    s1 = 0.0
    s2 = 0.0
    s3 = 0.0
    nn = on_idx.shape[0]
    next_off = -1
    g_amp = 1.0 - math.exp(-1.0 / (0.004 * SR))
    g_rel = 1.0 - math.exp(-1.0 / (0.010 * SR))
    for i in range(nsamp):
        if k < nn and i == on_idx[k]:
            target = hz[k]
            if slide[k] < 0.5:
                f = target
                env = 1.0
                cur_acc = accent[k]
            gate = 1.0
            next_off = off_idx[k]
            k += 1
        if gate > 0.5 and i == next_off:
            gate = 0.0
        # glide
        f += (target - f) * (1.0 - math.exp(-1.0 / (glide * SR)))
        dt = f / SR
        v = 2.0 * ph - 1.0
        v -= polyblep(ph, dt)
        ph += dt
        if ph >= 1.0:
            ph -= 1.0
        dec = acc_decay if cur_acc > 0.5 else decay
        env *= math.exp(-1.0 / (dec * SR))
        amp += ((1.0 if gate > 0.5 else 0.0) - amp) * (g_amp if gate > 0.5 else g_rel)
        fc = cut_base[i] + cut_depth[i] * env * (1.0 + 0.7 * cur_acc)
        fc = min(fc, 0.42 * SR)
        g = 1.0 - math.exp(-TWO_PI * fc / (SR * 2.0))
        xin = v * 1.6
        for _ in range(2):
            u = math.tanh(xin - 4.0 * res * s3)
            s0 += g * (u - math.tanh(s0))
            s1 += g * (math.tanh(s0) - math.tanh(s1))
            s2 += g * (math.tanh(s1) - math.tanh(s2))
            s3 += g * (math.tanh(s2) - math.tanh(s3))
        out[i] = s3 * amp * (1.0 + 0.35 * cur_acc)
    return out


@njit(cache=False)
def limiter_gain(peak, ceiling, look, rel_coef):
    n = peak.shape[0]
    gr = np.empty(n)
    for i in range(n):
        gr[i] = min(1.0, ceiling / (peak[i] + 1e-9))
    gmin = np.empty(n)
    for i in range(n):
        m = gr[i]
        for j in range(1, look):
            if i + j < n and gr[i + j] < m:
                m = gr[i + j]
        gmin[i] = m
    e = np.empty(n)
    e[0] = gmin[0]
    for i in range(1, n):
        up = e[i - 1] + (1.0 - e[i - 1]) * rel_coef
        e[i] = min(gmin[i], up)
    g = np.empty(n)
    acc = 0.0
    for i in range(n):
        acc += e[i]
        if i >= look:
            acc -= e[i - look]
        g[i] = acc / min(i + 1, look)
    return g


# ---------------------------------------------------------------------------
# Buses and helpers
# ---------------------------------------------------------------------------
class Bus:
    def __init__(self):
        self.a = np.zeros((2, N))

    def put(self, x, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        x = np.asarray(x, float)
        if x.ndim == 1:
            gl = math.cos((pan + 1.0) * math.pi / 4.0) * math.sqrt(2.0)
            gr = math.sin((pan + 1.0) * math.pi / 4.0) * math.sqrt(2.0)
            x = np.stack([x * gl, x * gr])
        n = x.shape[1]
        i0 = max(i, 0)
        j0 = i0 - i
        i1 = min(i + n, N)
        if i1 <= i0:
            return
        self.a[:, i0:i1] += x[:, j0:j0 + (i1 - i0)] * gain


drums, bass, music, fx, verb_in, dly_in, fx_late = (Bus() for _ in range(7))
EV = {k: [] for k in ("kick", "clap", "snare", "hat", "ohat", "tom", "rim", "bass", "acid", "stab",
                      "arp", "clack", "bell", "calliope", "crash", "impact", "whoosh", "sparkle", "beat")}
duck_kicks = []          # (time, depth) — feeds the sidechain


def ev(name, t, *vals):
    EV[name].append([round(float(t), 5)] + [round(float(v), 4) for v in vals])


def fade(x, a=0.0015, b=0.004):
    x = np.array(x, float)
    na, nb = int(a * SR), int(b * SR)
    if na > 1 and len(x) > na:
        x[:na] *= np.linspace(0, 1, na)
    if nb > 1 and len(x) > nb:
        x[-nb:] *= np.linspace(1, 0, nb)
    return x


def send(x, t, gain=1.0, pan=0.0, verb=0.0, dly=0.0):
    if verb > 0:
        verb_in.put(x, t, gain * verb, pan)
    if dly > 0:
        dly_in.put(x, t, gain * dly, pan)


# ---------------------------------------------------------------------------
# Instruments
# ---------------------------------------------------------------------------
def make_kick(f_end=53.0, f_start=215.0, pdec=0.028, adec=0.13, drive=1.9, dur=0.46, click=0.30):
    n = int(dur * SR)
    t = tarr(n)
    f = f_end + (f_start - f_end) * np.exp(-t / pdec)
    ph = TWO_PI * np.cumsum(f) / SR
    body = np.cos(ph) * np.exp(-t / adec)
    body = np.tanh(body * drive) / math.tanh(drive)
    nc = int(0.004 * SR)
    c = rng.standard_normal(nc) * np.exp(-np.arange(nc) / (0.0008 * SR))
    body[:nc] += filt(c, "hp", 2200) * click
    body *= np.minimum(1.0, tarr(n) / 0.0004)
    body *= np.minimum(1.0, (n - np.arange(n)) / (0.03 * SR))
    return body


_KICK = make_kick()


def play_kick(t, vel=1.0, lp=None, duck=0.9):
    k = _KICK if lp is None else filt(_KICK, "lp", lp)
    drums.put(k, t, vel)
    duck_kicks.append((t, duck * min(1.0, 0.35 + vel)))
    ev("kick", t, vel)


def make_bass_note(freq, dur, c0=1100.0, c1=170.0, tau=0.055, res=0.5, sub=0.9):
    n = int(dur * SR)
    t = tarr(n)
    s = saw_bl(np.full(n, freq), 0.0)
    cut = c1 + (c0 - c1) * np.exp(-t / tau)
    y = ladder(s, cut, res, 1.5)
    subw = np.sin(TWO_PI * freq * t)
    amp = np.minimum(1.0, t / 0.003) * np.exp(-t / (dur * 1.1)) * np.minimum(1.0, (dur - t) / 0.012)
    return (y * 0.85 + subw * sub) * amp


_bass_cache = {}


def play_bass(t, midi, dur, vel=1.0, bright=1.0):
    key = (midi, round(dur, 4), round(bright, 2))
    if key not in _bass_cache:
        _bass_cache[key] = make_bass_note(float(mtof(midi)), dur, c0=1100 * bright, c1=170 + 40 * bright)
    bass.put(_bass_cache[key], t, vel)
    ev("bass", t, midi, vel)


def noise(n):
    return rng.standard_normal(n)


_HAT_C = None
_HAT_O = None
_METAL = None


def metal_partials(n):
    t = tarr(n)
    y = np.zeros(n)
    for f in (263.0, 400.0, 421.0, 474.0, 587.0, 845.0):
        y += np.sign(np.sin(TWO_PI * f * 2.6 * t + f))
    return y / 6.0


def make_hat(dur, tau, hp=7500.0, metal=0.35):
    n = int(dur * SR)
    t = tarr(n)
    y = noise(n) * (1 - metal) + metal_partials(n) * metal
    y = filt(y, "hp", hp, 4)
    return fade(y * np.exp(-t / tau), 0.0005, 0.006)


def hat_closed(t, vel):
    global _HAT_C
    if _HAT_C is None:
        _HAT_C = make_hat(0.07, 0.011)
    drums.put(_HAT_C, t, vel * 0.42, pan=0.1)
    ev("hat", t, vel)


def hat_open(t, vel):
    global _HAT_O
    if _HAT_O is None:
        _HAT_O = make_hat(0.30, 0.075, hp=6800.0)
    drums.put(_HAT_O, t, vel * 0.42, pan=-0.12)
    ev("ohat", t, vel)


def make_clap():
    n = int(0.36 * SR)
    t = tarr(n)
    y = np.zeros(n)
    for i, off in enumerate((0.0, 0.010, 0.020, 0.031)):
        m = int(off * SR)
        k = int(0.014 * SR) if i < 3 else n - m
        seg = noise(k) * (np.exp(-np.arange(k) / (0.004 * SR)) if i < 3 else np.exp(-np.arange(k) / (0.060 * SR)))
        y[m:m + k] += seg * (0.75 if i < 3 else 1.0)
    y = signal.sosfilt(signal.butter(2, [850, 3800], "bp", fs=SR, output="sos"), y)
    return fade(y * 1.6, 0.0005, 0.01)


_CLAP = None


def play_clap(t, vel=1.0):
    global _CLAP
    if _CLAP is None:
        _CLAP = make_clap()
    drums.put(_CLAP, t, vel * 0.55)
    send(_CLAP, t, vel * 0.55, verb=0.55)
    ev("clap", t, vel)


def make_snare(pitch=185.0, dur=0.22):
    n = int(dur * SR)
    t = tarr(n)
    f = pitch * (1.0 + 0.6 * np.exp(-t / 0.012))
    tone = np.sin(TWO_PI * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    nz = filt(noise(n), "hp", 1400) * np.exp(-t / 0.06)
    y = tone * 0.6 + nz * 0.9
    return fade(y, 0.0004, 0.01)


def play_snare(t, vel=1.0, pitch=185.0, gain=0.5):
    s = make_snare(pitch)
    drums.put(s, t, vel * gain)
    send(s, t, vel * gain, verb=0.5)
    ev("snare", t, vel)


def play_tom(t, f, vel=1.0, pan=0.0):
    n = int(0.28 * SR)
    tt = tarr(n)
    fr = f * (1.0 + 1.1 * np.exp(-tt / 0.02))
    y = np.sin(TWO_PI * np.cumsum(fr) / SR) * np.exp(-tt / 0.10)
    y = np.tanh(y * 1.4)
    drums.put(fade(y), t, vel * 0.55, pan)
    send(fade(y), t, vel * 0.55, pan, verb=0.35)
    ev("tom", t, vel, f)


def play_rim(t, vel=1.0):
    n = int(0.05 * SR)
    tt = tarr(n)
    y = np.sin(TWO_PI * 1650 * tt) * np.exp(-tt / 0.006) + np.sin(TWO_PI * 830 * tt) * np.exp(-tt / 0.01) * 0.6
    y += filt(noise(n), "hp", 3000) * np.exp(-tt / 0.004) * 0.4
    drums.put(fade(y), t, vel * 0.32, pan=0.25)
    send(fade(y), t, vel * 0.32, pan=0.25, verb=0.25)
    ev("rim", t, vel)


def make_crash(dur=1.6, tau=0.55):
    n = int(dur * SR)
    tt = tarr(n)
    y = filt(noise(n), "hp", 3200, 4) * 0.8 + filt(metal_partials(n), "hp", 4500, 2) * 0.35
    y *= np.exp(-tt / tau) * np.minimum(1.0, tt / 0.002)
    return fade(y, 0.0005, 0.05)


_CRASH = None


def play_crash(t, gain=1.0):
    global _CRASH
    if _CRASH is None:
        _CRASH = make_crash()
    stereo = np.stack([_CRASH, np.roll(_CRASH, 37) * 0.9])
    fx.put(stereo, t, gain * 0.42)
    send(stereo, t, gain * 0.42, verb=0.35)
    ev("crash", t, gain)


def reverse_crash(t_end, dur=0.9, gain=1.0):
    y = make_crash(dur, 0.35)[::-1]
    y = fade(y, 0.02, 0.0005)
    stereo = np.stack([y, np.roll(y, 41)])
    fx_late.put(stereo, t_end - dur, gain * 0.38)


def make_clack(seed=0, base=1.0):
    n = int(0.11 * SR)
    tt = tarr(n)
    y = np.zeros(n)
    for f, tau, a in ((1210, 0.030, 0.55), (1830, 0.022, 0.4), (2950, 0.016, 0.28), (4410, 0.010, 0.2), (6230, 0.006, 0.12)):
        y += np.sin(TWO_PI * f * base * tt + seed) * np.exp(-tt / tau) * a
    z = signal.sosfilt(signal.butter(2, [2200 * base, 5200 * base], "bp", fs=SR, output="sos"), noise(n)) * np.exp(-tt / 0.005)
    y += z * 0.9
    thunk_f = 130.0 * np.exp(-tt / 0.03) + 62.0
    y += np.sin(TWO_PI * np.cumsum(thunk_f) / SR) * np.exp(-tt / 0.028) * 0.9
    return fade(y, 0.0002, 0.01)


_CLACKS = [make_clack(0.0, 1.0), make_clack(1.3, 1.18)]


def play_clack(t, vel, idx):
    c = _CLACKS[idx % 2]
    fx.put(c, t, 0.85 * vel, pan=(-0.15 if idx % 2 == 0 else 0.15))
    send(c, t, 0.85 * vel, verb=0.12)
    ev("clack", t, vel)


def play_bell(t, midi, vel=1.0, pan=0.0, dur=1.6, verb=0.6, gain=0.3):
    n = int(dur * SR)
    tt = tarr(n)
    fc = float(mtof(midi))
    idx = 2.4 * np.exp(-tt / 0.25)
    y = np.sin(TWO_PI * fc * tt + idx * np.sin(TWO_PI * fc * 3.5 * tt)) * np.exp(-tt / 0.55)
    y += 0.4 * np.sin(TWO_PI * fc * 2.0 * tt) * np.exp(-tt / 0.25)
    y = fade(y, 0.0004, 0.05)
    music.put(y, t, gain * vel, pan)
    send(y, t, gain * vel, pan, verb=verb, dly=0.25)
    ev("bell", t, midi, vel)


def make_pluck(freq, dur=0.22, c0=6000.0, c1=700.0, tau=0.05, detune=0.004):
    n = int(dur * SR)
    tt = tarr(n)
    s = saw_bl(np.full(n, freq), 0.13) + saw_bl(np.full(n, freq * (1 + detune)), 0.61) + 0.6 * pulse_bl(np.full(n, freq * 2.0), 0.3, 0.0)
    cut = c1 + (c0 - c1) * np.exp(-tt / tau)
    y = svf(s, cut, np.full(n, 1.6), 0)
    amp = np.exp(-tt / (dur * 0.42)) * np.minimum(1.0, tt / 0.0015)
    return fade(y * amp / 2.2, 0.0005, 0.02)


_pluck_cache = {}


def play_arp(t, midi, vel=1.0, pan=0.0, gain=0.3, dly=0.55, verb=0.2):
    if midi not in _pluck_cache:
        _pluck_cache[midi] = make_pluck(float(mtof(midi)))
    p = _pluck_cache[midi]
    music.put(p, t, gain * vel, pan)
    send(p, t, gain * vel, pan, verb=verb, dly=dly)
    ev("arp", t, midi, vel)


def make_supersaw(midis, dur, c0=7500.0, c1=1100.0, tau=0.16, amp_tau=0.2, hold=0.0, attack=0.002):
    n = int(dur * SR)
    tt = tarr(n)
    L = np.zeros(n)
    R = np.zeros(n)
    dets = (-19, -11, -5, 0, 5, 11, 19)
    for mi, m in enumerate(midis):
        f0 = float(mtof(m))
        for vi, d in enumerate(dets):
            f = f0 * 2.0 ** (d / 1200.0)
            s = saw_bl(np.full(n, f), (vi * 0.137 + mi * 0.29) % 1.0)
            p = (vi / (len(dets) - 1)) * 2.0 - 1.0
            L += s * math.cos((p + 1) * math.pi / 4) * 1.4
            R += s * math.sin((p + 1) * math.pi / 4) * 1.4
    cut = c1 + (c0 - c1) * np.exp(-tt / tau)
    amp = np.minimum(1.0, tt / attack) * np.where(tt < hold, 1.0, np.exp(-(tt - hold) / amp_tau)) * np.minimum(1.0, (dur - tt) / 0.03)
    L = svf(L, cut, np.full(n, 0.9), 0) * amp
    R = svf(R, cut, np.full(n, 0.9), 0) * amp
    st = np.stack([L, R]) / (len(midis) * 3.2)
    return signal.sosfilt(sos("hp", 140.0), st, axis=-1)


def play_stab(t, midis, dur=0.32, vel=1.0, gain=0.4, verb=0.3, dly=0.3, **kw):
    s = make_supersaw(midis, dur, **kw)
    music.put(s, t, gain * vel)
    send(s, t, gain * vel, verb=verb, dly=dly)
    ev("stab", t, vel)


def calliope_note(midi, dur, vib=5.4):
    n = int(dur * SR)
    tt = tarr(n)
    f0 = float(mtof(midi))
    y = np.zeros(n)
    for det in (-0.0035, 0.0035):
        vibr = 1.0 + 0.006 * np.sin(TWO_PI * vib * tt + det * 900)
        ph = TWO_PI * np.cumsum(f0 * (1 + det) * vibr) / SR
        for h in (1, 3, 5, 7, 9):
            y += np.sin(ph * h) / h
    amp = np.minimum(1.0, tt / 0.006) * np.exp(-tt / (dur * 0.9)) * np.minimum(1.0, (dur - tt) / 0.05)
    return fade(y * amp * 0.28, 0.001, 0.02)


def play_calliope(t, midi, dur, vel=1.0, pan=0.0):
    y = calliope_note(midi, dur)
    music.put(y, t, 0.55 * vel, pan)
    send(y, t, 0.55 * vel, pan, verb=0.5, dly=0.35)
    ev("calliope", t, midi, vel)


def pad_chord(t, dur, midis, cut_a, cut_b, gain=0.2, atk=0.4, rel=0.4):
    n = int(dur * SR)
    tt = tarr(n)
    L = np.zeros(n)
    R = np.zeros(n)
    for mi, m in enumerate(midis):
        f0 = float(mtof(m))
        for vi, d in enumerate((-13, -4, 5, 14)):
            f = f0 * 2.0 ** (d / 1200.0)
            s = saw_bl(np.full(n, f), (vi * 0.21 + mi * 0.37) % 1.0)
            p = ((vi + mi) % 4) / 3.0 * 2 - 1
            L += s * math.cos((p + 1) * math.pi / 4)
            R += s * math.sin((p + 1) * math.pi / 4)
    cut = np.linspace(cut_a, cut_b, n)
    L = svf(L, cut, np.full(n, 0.8), 0)
    R = svf(R, cut, np.full(n, 0.8), 0)
    env = np.minimum(1.0, tt / atk) * np.minimum(1.0, (dur - tt) / rel)
    st = np.stack([L * env, R * env]) / (len(midis) * 2.2)
    st = signal.sosfilt(sos("hp", 130.0), st, axis=-1)
    music.put(st, t, gain)
    send(st, t, gain, verb=0.25)


# ---------------------------------------------------------------------------
# FX
# ---------------------------------------------------------------------------
def shepard(dur, t_oct, f_lo=32.0, n_oct=7, direction=1.0):
    n = int(dur * SR)
    tt = tarr(n)
    y = np.zeros(n)
    for k in range(n_oct):
        x = (k + direction * tt / t_oct) % n_oct
        f = f_lo * 2.0 ** x
        w = np.sin(np.pi * x / n_oct) ** 2
        ph = TWO_PI * np.cumsum(f) / SR
        y += w * (np.sin(ph) + 0.35 * np.sin(2 * ph))
    return y / n_oct * 2.0


def noise_riser(dur, f0=250.0, f1=11000.0, q=1.2, power=2.0):
    n = int(dur * SR)
    tt = tarr(n) / dur
    fc = f0 * (f1 / f0) ** (tt ** 1.3)
    a = svf(noise(n), fc, np.full(n, q), 1)
    b = svf(noise(n), fc * 1.07, np.full(n, q), 1)
    amp = tt ** power
    return np.stack([a * amp, b * amp]) * 2.2


def whoosh(t, dur=0.5, f_from=6000.0, f_to=400.0, pan_from=-0.9, pan_to=0.9, gain=0.5, q=2.0):
    n = int(dur * SR)
    tt = tarr(n) / dur
    fc = f_from * (f_to / f_from) ** tt
    y = svf(noise(n), fc, np.full(n, q), 1)
    amp = np.sin(np.pi * np.clip(tt, 0, 1)) ** 1.5
    pan = np.linspace(pan_from, pan_to, n)
    gl = np.cos((pan + 1) * math.pi / 4) * math.sqrt(2)
    gr = np.sin((pan + 1) * math.pi / 4) * math.sqrt(2)
    st = np.stack([y * amp * gl, y * amp * gr]) * 2.0
    fx.put(st, t, gain)
    send(st, t, gain, verb=0.2)
    ev("whoosh", t, dur)


def impact(t, gain=1.0, dur=1.6):
    n = int(dur * SR)
    tt = tarr(n)
    f = 28.0 + 70.0 * np.exp(-tt / 0.12)
    boom = np.sin(TWO_PI * np.cumsum(f) / SR) * np.exp(-tt / 0.55)
    boom = np.tanh(boom * 1.5)
    nz = filt(noise(n), "lp", 4500) * np.exp(-tt / 0.12) * 0.7
    body = boom + nz
    fx.put(fade(body, 0.0003, 0.05), t, gain * 0.65)
    send(nz, t, gain * 0.5, verb=0.6)
    ev("impact", t, gain)


def pitch_riser(dur, f0, f1, gain=0.25):
    n = int(dur * SR)
    tt = tarr(n) / dur
    f = f0 * (f1 / f0) ** (tt ** 1.5)
    ph = np.cumsum(f) / SR
    s = 2 * (ph % 1.0) - 1.0
    cut = f * 3.0
    y = svf(s, cut, np.full(n, 1.2), 0)
    trem = 0.75 + 0.25 * np.sin(TWO_PI * np.cumsum(4 + 26 * tt ** 2) / SR)
    return y * tt ** 1.7 * trem * gain


def wind(dur, gain=0.3, f0=500.0, f1=3500.0, lfo=0.35):
    n = int(dur * SR)
    tt = tarr(n)
    pink = signal.lfilter([0.049922035, -0.095993537, 0.050612699, -0.004408786],
                          [1, -2.494956002, 2.017265875, -0.522189400], noise(n))
    fc = f0 + (f1 - f0) * (tt / dur) + 400 * np.sin(TWO_PI * lfo * tt)
    y = svf(pink, fc, np.full(n, 0.9), 1)
    return y * 3.0 * gain


def rumble(dur, gain=0.3):
    n = int(dur * SR)
    tt = tarr(n)
    br = np.cumsum(noise(n))
    br = filt(br, "hp", 40.0)
    br = filt(br, "lp", 240.0)
    br /= np.max(np.abs(br)) + 1e-9
    return br * gain


def brake_hiss(t, dur=1.1, gain=0.6):
    n = int(dur * SR)
    tt = tarr(n)
    y = signal.sosfilt(signal.butter(2, [3200, 10500], "bp", fs=SR, output="sos"), noise(n))
    amp = np.minimum(1.0, tt / 0.01) * np.exp(-tt / 0.32)
    y = y * amp * 1.8
    thunk_n = int(0.25 * SR)
    ttn = tarr(thunk_n)
    th = np.sin(TWO_PI * np.cumsum(90 * np.exp(-ttn / 0.06) + 45) / SR) * np.exp(-ttn / 0.06)
    fx.put(np.stack([y, np.roll(y, 53)]), t, gain)
    fx.put(th, t, gain * 0.7)
    send(y, t, gain * 0.3, verb=0.4)


def screech(t, dur=0.6, gain=0.28):
    n = int(dur * SR)
    tt = tarr(n) / dur
    f = 2600.0 * (0.35 + 0.65 * (1 - tt) ** 1.2)
    ph = np.cumsum(f) / SR
    s = (2 * (ph % 1.0) - 1.0) * 0.6 + np.sin(TWO_PI * ph * 1.5) * 0.4
    s = svf(s, f * 2.0, np.full(n, 3.0), 1)
    amp = np.sin(np.pi * np.clip(tt, 0, 1)) ** 2 * np.exp(-tt * 1.4)
    fx.put(fade(s * amp * 1.4), t, gain)
    send(s * amp, t, gain * 0.25, verb=0.3)


# ---------------------------------------------------------------------------
# Reverb / delay
# ---------------------------------------------------------------------------
def make_ir(rt60, predelay=0.012, lp=6500.0, hp=220.0, seed=7):
    r = np.random.default_rng(seed)
    n = int(rt60 * 1.15 * SR)
    tt = tarr(n)
    ir = np.zeros((2, n))
    for c in range(2):
        z = r.standard_normal(n) * np.exp(-6.9 * tt / rt60)
        dark = filt(z, "lp", 1400.0, 2)
        w = np.clip(tt / rt60, 0, 1)
        z = z * (1 - w) + dark * w
        z = filt(z, "lp", lp, 2)
        z = filt(z, "hp", hp, 2)
        ir[c] = z
    pd = int(predelay * SR)
    ir = np.concatenate([np.zeros((2, pd)), ir], axis=1)
    ir *= 1.0 / math.sqrt(np.sum(ir ** 2) / 2.0) * 0.16
    return ir


def apply_reverb(x, rt60=1.6, **kw):
    ir = make_ir(rt60, **kw)
    out = np.stack([fftconvolve(x[0], ir[0])[:N], fftconvolve(x[1], ir[1])[:N]])
    return out


def apply_pingpong(x, delay=STEP * 3, fb=0.42, taps=6, lp=3800.0):
    """dotted-8th ping-pong echo built from filtered, shifted copies."""
    mono = x.sum(axis=0) * 0.5
    out = np.zeros_like(x)
    cur = mono
    d = int(delay * SR)
    for k in range(1, taps + 1):
        cur = filt(cur, "lp", lp, 1)
        sh = np.zeros(N)
        sh[d * k:] = cur[:N - d * k] * (fb ** k) if d * k < N else 0
        ch = k % 2
        out[ch] += sh
        out[1 - ch] += sh * 0.25
    return out


# ---------------------------------------------------------------------------
# COMPOSITION
# ---------------------------------------------------------------------------
A1, F1, C2, G1, E2 = 33, 29, 36, 31, 40
CHORD = {
    "Am": [57, 60, 64], "F": [53, 57, 60], "C": [60, 64, 67], "G": [55, 59, 62], "E": [52, 56, 59],
}
BAR_CHORD = ["Am", "Am", "Am", "F", "G", "Am", "E", "Am", "F", "C", "G", "Am"]
BAR_ROOT = [A1, A1, A1, F1, G1, A1, E2, A1, F1, C2, G1, A1]

HANG = [(T(1, 14), T(2)), (T(6, 14), T(7))]           # the two "top of the hill" silences
DROP_BARS = (2, 7)
FINAL = T(11)

# ---- BARS 0-1: the climb -------------------------------------------------
# chain-lift clacks: quarter notes, then eighths, then sixteenths
clack_steps = [0, 4, 8, 12] + [16, 18, 20, 22, 24, 25, 26, 27, 28, 29]
for i, s in enumerate(clack_steps):
    play_clack(T(0, s), 0.75 + 0.25 * (i / len(clack_steps)), i)

# heartbeat: soft, low-passed kicks through bar 1
for j, s in enumerate((16, 20, 24, 28)):
    play_kick(T(0, s), 0.38 + 0.12 * j, lp=140, duck=0.35)

# shepard-risset endless climb + wind + drone
sh = shepard(T(1, 14), t_oct=BAR * 0.9)
sh_env = np.linspace(0, 1, len(sh)) ** 1.6
fx.put(np.stack([sh * sh_env, np.roll(sh, 61) * sh_env]), 0.0, 0.32)
fx.put(np.stack([wind(T(1, 14), 0.30), wind(T(1, 14), 0.30)]) * np.linspace(0.15, 1.0, int(T(1, 14) * SR)) ** 1.5, 0.0, 1.0)
drone_n = int(T(2) * SR)
dt_ = tarr(drone_n)
drone = (np.sin(TWO_PI * 55.0 * dt_) + 0.45 * np.sin(TWO_PI * 110.0 * dt_ + 0.3) + 0.25 * np.sin(TWO_PI * 82.41 * dt_)) * (np.linspace(0, 1, drone_n) ** 1.4)
drone[int(T(1, 14) * SR):] *= np.linspace(1, 0, drone_n - int(T(1, 14) * SR)) ** 0.5
bass.put(drone, 0.0, 0.30)
pad_chord(T(0, 8), T(2) - T(0, 8), [45, 57, 60, 64, 69], 350, 4200, gain=0.14, atk=1.2, rel=0.05)

# riser + snare roll
fx.put(noise_riser(T(1, 14) - T(0, 8)), T(0, 8), 0.34)
fx.put(np.stack([pitch_riser(T(1, 14) - T(1), 200, 1800)] * 2), T(1), 0.5)
roll1 = [(8, 0.42), (10, 0.5), (12, 0.6), (13, 0.7), (13.5, 0.8), (14 - 0.5, 0.9)]
for s, v in roll1:
    play_snare(T(1, s), v, pitch=175 + 40 * (s / 14), gain=0.55)
reverse_crash(T(2), dur=0.9)

# ---- generic drum grooves -----------------------------------------------
def groove(bar, kick=True, clap=True, hats=True, ohat=True, hat16=True, rim=False, accent=1.0, skip_last_beat=False):
    last = 3 if skip_last_beat else 4
    for b in range(last):
        if kick:
            play_kick(T(bar, b * 4), 1.0)
        if ohat:
            hat_open(T(bar, b * 4 + 2), 0.9 * accent)
        if hats and hat16:
            for s, v in ((0, 0.5), (1, 0.28), (3, 0.36)):
                hat_closed(T(bar, b * 4 + s), v * accent)
    if clap:
        for s in (4, 12):
            if not (skip_last_beat and s >= 12):
                play_clap(T(bar, s), 1.0)
    if rim:
        for s in (7, 11):
            play_rim(T(bar, s), 0.9)


def rolling_bass(bar, root, vel=1.0, skip_last_beat=False, bright=1.0):
    for b in range(3 if skip_last_beat else 4):
        for k, (s, v) in enumerate(((1, 0.85), (2, 1.0), (3, 0.92))):
            play_bass(T(bar, b * 4 + s), root, STEP * 0.92, vel * v, bright=bright)


def arp_bar(bar, chord, pattern, vel=1.0, gain=0.30, skip_from=99):
    tones = CHORD[chord]
    pool = [tones[0], tones[1], tones[2], tones[0] + 12, tones[1] + 12, tones[2] + 12, tones[0] + 24]
    for s, idx in enumerate(pattern):
        if idx is None or s >= skip_from:
            continue
        v = (1.0 if s % 4 == 0 else 0.72 if s % 2 == 0 else 0.5) * vel
        play_arp(T(bar, s), pool[idx], v, pan=((s % 4) - 1.5) * 0.28, gain=gain)


ARP_UP = [0, 2, 4, 5, 4, 2, 3, 1, 0, 2, 4, 5, 6, 5, 4, 2]
ARP_ALT = [0, 4, 2, 5, 1, 4, 3, 5, 0, 4, 2, 6, 5, 3, 4, 2]

# ---- BARS 2-4: first drop -----------------------------------------------
impact(T(2), 1.0)
play_crash(T(2), 1.0)
whoosh(T(2), 0.9, 9000, 300, -0.9, 0.9, 0.35)
fx.put(rumble(T(5) - T(2), 0.55), T(2), 0.5)
fx.put(np.stack([wind(T(5) - T(2), 0.22, 900, 2600)] * 2), T(2), 0.6)

# bar 2: drop — kick, bass, open hats, clap
groove(2, hat16=False)
rolling_bass(2, BAR_ROOT[2], 1.0)
# bar 3: adds 16ths hats + arp
groove(3)
rolling_bass(3, BAR_ROOT[3], 1.0)
arp_bar(3, BAR_CHORD[3], ARP_UP, 0.9)
# bar 4: everything, fill on the last beat
groove(4, skip_last_beat=True, rim=True)
rolling_bass(4, BAR_ROOT[4], 1.0, skip_last_beat=True)
arp_bar(4, BAR_CHORD[4], ARP_ALT, 1.0, skip_from=12)
# fill: descending toms + snare into the airtime
for s, f, v in ((12, 210, 0.95), (13, 185, 0.9), (14, 160, 0.9), (15, 135, 1.0)):
    play_tom(T(4, s), f, v, pan=-0.4 + 0.27 * (s - 12))
for s in (12, 14):
    hat_closed(T(4, s), 0.8)
play_snare(T(4, 15.5), 0.9, pitch=210, gain=0.5)
reverse_crash(T(5), dur=0.7, gain=0.9)
whoosh(T(4, 11), 0.55, 500, 8000, 0.9, -0.9, 0.3)

# ---- BAR 5: airtime -------------------------------------------------------
sub_n = int(BAR * SR)
sub_t = tarr(sub_n)
sub = np.sin(TWO_PI * 55.0 * sub_t) * np.minimum(1.0, sub_t / 0.2) * np.minimum(1.0, (BAR - sub_t) / 0.05)
bass.put(sub, T(5), 0.28)
pad_chord(T(5), BAR / 2, [57, 60, 64, 69], 900, 6500, gain=0.30, atk=0.15, rel=0.25)
pad_chord(T(5, 8), BAR / 2, [53, 57, 60, 65], 900, 7500, gain=0.30, atk=0.10, rel=0.25)
MEL = [(0, 76), (2, 81), (3, 76), (4, 72), (6, 76), (7, 72), (8, 77), (10, 81), (11, 77), (12, 72), (14, 77), (15, 81)]
for s, m in MEL:
    play_calliope(T(5, s), m, STEP * 1.7, 0.9 if s % 4 == 0 else 0.7, pan=-0.3 + 0.6 * (s / 15))
# sparkles: bells at deterministic random steps
sp_rng = np.random.default_rng(31)
for s in (1, 5, 9, 13):
    play_bell(T(5, s + 0.0), [88, 93, 96, 100][s // 4], 0.6, pan=float(sp_rng.uniform(-0.8, 0.8)), dur=1.2, gain=0.16)
for s in range(0, 16, 2):
    hat_closed(T(5, s), 0.35)
fx.put(np.stack([wind(BAR, 0.2, 1500, 5000, 0.5)] * 2), T(5), 0.7)
whoosh(T(5), 0.7, 3000, 12000, -0.8, 0.8, 0.22, q=1.4)
# a lone kick ramps back in on beat 4 of the breakdown
play_kick(T(5, 12), 0.5, lp=160, duck=0.4)
play_kick(T(5, 14), 0.35, lp=160, duck=0.3)

# ---- BAR 6: build --------------------------------------------------------
for b, v in enumerate((0.55, 0.7, 0.85, 1.0)):
    play_kick(T(6, b * 4), v)
# rising E-major arp
rise = [52, 56, 59, 64, 68, 71, 76, 80, 83, 88, 92, 95, 100, 104]
for s, m in enumerate(rise):
    play_arp(T(6, s), m, 0.4 + 0.6 * s / 13, pan=((s % 4) - 1.5) * 0.3, gain=0.34, dly=0.4)
pad_chord(T(6), T(6, 14) - T(6), CHORD["E"] + [64], 500, 7500, gain=0.28, atk=0.3, rel=0.02)
fx.put(noise_riser(T(6, 14) - T(6), 400, 14000, 1.6, 2.0), T(6), 0.36)
sh2 = shepard(T(6, 14) - T(6), t_oct=BAR * 0.45)
env2 = np.linspace(0.3, 1, len(sh2)) ** 1.4
fx.put(np.stack([sh2 * env2, np.roll(sh2, 47) * env2]), T(6), 0.30)
fx.put(np.stack([pitch_riser(T(6, 14) - T(6), 260, 3200)] * 2), T(6), 0.5)
roll2 = [(0, 0.5), (4, 0.55), (8, 0.62), (10, 0.7), (12, 0.8), (13, 0.9), (13.5, 1.0)]
for s, v in roll2:
    play_snare(T(6, s), v, pitch=190 + 60 * (s / 14), gain=0.55)
play_crash(T(6), 0.55)
reverse_crash(T(7), dur=0.8)

# ---- BARS 7-10: second drop ----------------------------------------------
impact(T(7), 1.15)
play_crash(T(7), 1.1)
whoosh(T(7), 0.8, 10000, 250, -0.9, 0.9, 0.4)
fx.put(rumble(T(11) - T(7), 0.6), T(7), 0.55)
fx.put(np.stack([wind(T(11) - T(7), 0.22, 1200, 3800)] * 2), T(7), 0.55)

ACID = [
    # (midi, accent, slide) per 16th, None = rest
    (45, 0, 0), None, (57, 1, 0), (45, 0, 0), (48, 0, 0), None, (52, 1, 1), (45, 0, 0),
    (43, 0, 0), (55, 1, 0), None, (43, 0, 0), (50, 0, 0), (52, 0, 1), (57, 1, 0), None,
]
TRANS = {7: 0, 8: -4, 9: 3, 10: -2}
on_idx, off_idx, hz, accs, slides = [], [], [], [], []
for bar in (7, 8, 9, 10):
    for s, nv in enumerate(ACID):
        if nv is None:
            continue
        midi, acc, sl = nv
        if bar == 10 and s >= 12:
            continue
        midi = midi + TRANS[bar] + (12 if (bar >= 9 and s in (2, 9, 14)) else 0)
        t0 = T(bar, s)
        on_idx.append(int(round(t0 * SR)))
        off_idx.append(int(round((t0 + STEP * 0.62) * SR)))
        hz.append(float(mtof(midi)))
        accs.append(float(acc))
        slides.append(float(sl))
        ev("acid", t0, midi, acc)
tt_all = tarr(N)
cut_base = np.interp(tt_all, [T(7), T(8), T(9), T(10), T(11)], [420, 520, 700, 900, 1200])
cut_depth = np.interp(tt_all, [T(7), T(8), T(9), T(10), T(11)], [2600, 3200, 3800, 4600, 5200])
acid = acid_render(N, np.array(on_idx, np.int64), np.array(off_idx, np.int64), np.array(hz), np.array(accs), np.array(slides),
                   cut_base, cut_depth, 0.72, 0.16, 0.07, 0.035)
acid = filt(acid, "hp", 90.0)
music.put(np.stack([acid, np.roll(acid, 29)]) * 0.5, 0.0, 0.85)
send(np.stack([acid, np.roll(acid, 29)]), 0.0, 0.25, verb=0.15, dly=0.25)

for bar in (7, 8, 9, 10):
    last = bar == 10
    groove(bar, skip_last_beat=last, rim=True, accent=1.1)
    rolling_bass(bar, BAR_ROOT[bar], 1.0, skip_last_beat=last, bright=1.25)
    chord = BAR_CHORD[bar]
    tones = CHORD[chord]
    # 3-3-2 supersaw stabs
    for s in (0, 3, 6, 8, 11, 14):
        if last and s >= 12:
            continue
        v = 1.0 if s in (0, 8) else 0.8
        play_stab(T(bar, s), tones + [tones[0] + 12], dur=0.30 if s in (0, 8) else 0.20, vel=v, gain=0.36)
    # sparkle arp joins for the key lift
    if bar >= 9:
        arp_bar(bar, chord, ARP_ALT, 0.65, gain=0.22, skip_from=12 if last else 99)
    if bar in (8, 9):
        for s in (12, 14):
            play_tom(T(bar, s), 150 + 40 * (s == 12), 0.6)
        whoosh(T(bar, 13), 0.4, 800, 7000, 0.7, -0.7, 0.18)
# 16th-note kick roll + tom/snare fill into the final hit
for s, v in ((12, 0.95), (13, 0.85), (14, 0.9), (15, 1.0)):
    play_kick(T(10, s), v, duck=0.7)
for s, f in ((12, 240), (13, 210), (14, 180), (15, 150)):
    play_tom(T(10, s + 0.5) if s < 15 else T(10, 15.5), f, 0.8, pan=-0.5 + 0.33 * (s - 12))
for s, v in ((12, 0.6), (13, 0.7), (14, 0.8), (14.5, 0.9), (15, 1.0)):
    play_snare(T(10, s), v, pitch=200 + 50 * (s - 12) / 3, gain=0.55)
reverse_crash(FINAL, dur=0.5, gain=0.9)

# ---- punctuation: a sound for every cut in the edit (times match reel/timeline.js) ----
def glitch_burst(t, seed=3):
    r = np.random.default_rng(seed)
    for k in range(7):
        n = int(r.uniform(.012, .034) * SR)
        y = signal.sosfilt(signal.butter(2, [float(r.uniform(900, 2500)), float(r.uniform(3500, 9000))], "bp", fs=SR, output="sos"), r.standard_normal(n))
        y = np.sign(y) * np.round(np.abs(y) * 4) / 4                      # bit-crush
        fx.put(fade(y * 1.8, 0.0003, 0.002), t + k * float(r.uniform(.018, .034)), 0.34, pan=float(r.uniform(-.8, .8)))
    ev("whoosh", t, .2)


def ui_blip(t, midi, pan=0.0):
    n = int(.07 * SR)
    tt = tarr(n)
    y = np.sin(TWO_PI * float(mtof(midi)) * tt) * np.exp(-tt / .018) + .3 * np.sin(TWO_PI * float(mtof(midi + 12)) * tt) * np.exp(-tt / .01)
    fx.put(fade(y, 0.0004, 0.006), t, 0.3, pan=pan)
    send(y, t, 0.3, pan=pan, verb=0.25)


whoosh(4.92, .34, 7000, 500, -.9, .9, .34)            # fpv  <- whip down
whoosh(6.60, .26, 900, 9000, -.6, .6, .26)            # type <- slats
whoosh(9.92, .32, 6500, 700, .9, -.9, .34)            # build <- whip left
whoosh(12.46, .24, 500, 9000, -.5, .5, .26)           # kaleido <- iris
whoosh(13.26, .28, 700, 7000, -.9, .9, .3)            # voxel <- whip right
whoosh(14.10, .26, 400, 8000, -.4, .4, .3)            # corkscrew <- zoom
glitch_burst(15.0)                                   # panels <- glitch
for i, m in enumerate((84, 88, 91, 96)):              # panels slide in
    ui_blip(15.0 + .22 + i * .045, m, pan=(-.5 if i % 2 == 0 else .5))
whoosh(15.80, .18, 800, 7500, -.6, .6, .22)           # faces <- slats
whoosh(16.60, .3, 600, 8000, .7, -.7, .3)             # map <- whip up

# ---- BAR 11: the station -------------------------------------------------
impact(FINAL, 1.3, dur=1.6)
play_crash(FINAL, 1.3)
play_kick(FINAL, 1.0, duck=1.0)
play_stab(FINAL, [45, 52, 57, 60, 64, 69], dur=1.55, vel=1.0, gain=0.5, verb=0.5, dly=0.3, c0=6500, c1=900, tau=0.5, amp_tau=0.55, hold=0.05)
bass.put(make_bass_note(float(mtof(A1)), 1.2, c0=600, c1=140, tau=0.2), FINAL, 0.9)
ev("bass", FINAL, A1, 1.0)
whoosh(FINAL, 0.5, 8000, 300, -0.9, 0.9, 0.3)
brake_hiss(T(11, 5), 1.15, 0.55)
screech(T(11, 4), 0.55, 0.25)
# station bell: ding-ding!
play_bell(T(11, 9), 81, 1.0, pan=-0.15, dur=1.5, gain=0.34)
play_bell(T(11, 11), 88, 1.0, pan=0.15, dur=1.5, gain=0.34)
play_bell(T(11, 13), 93, 0.7, pan=0.0, dur=1.2, gain=0.2)
ev("beat", 0)

# hats keep the pulse alive for the first half-bar after the hit
for s in (4, 6, 8, 10):
    hat_closed(T(11, s), 0.45 - 0.05 * (s - 4) / 2)

# ---------------------------------------------------------------------------
# Sidechain, sends, master
# ---------------------------------------------------------------------------
duck = np.ones(N)
for tk, depth in duck_kicks:
    i0 = int(tk * SR)
    m = int(0.30 * SR)
    seg = np.arange(m) / SR
    g = 1.0 - depth * np.exp(-seg / 0.085)
    g[:int(0.002 * SR)] = np.minimum(g[:int(0.002 * SR)], 1.0 - depth * np.linspace(0.0, 1.0, int(0.002 * SR)))
    hi = min(N, i0 + m)
    duck[i0:hi] = np.minimum(duck[i0:hi], g[:hi - i0])

bass_bus = bass.a * duck
music_bus = music.a * (0.30 + 0.70 * duck)     # lighter pump on the music
fx_bus = fx.a
drum_bus = drums.a

verb_out = apply_reverb(verb_in.a, 1.9, predelay=0.014)
dly_out = apply_pingpong(dly_in.a)
dly_out = apply_reverb(dly_out, 0.9, predelay=0.02) * 0.35 + dly_out

dry = drum_bus + bass_bus + music_bus + fx_bus
wet = verb_out * 0.9 + dly_out * 0.8
mix = dry + wet

# the two hangs: gate the "engine" but keep the reverse swell (fx_late) and a whisper of tail
gate = np.ones(N)
for a, b in HANG:
    i0, i1 = int(a * SR), int(b * SR)
    ramp = int(0.004 * SR)
    gate[i0:i1] = 0.02
    gate[i0 - ramp:i0] = np.linspace(1, 0.02, ramp)
    gate[i1 - ramp:i1] = 0.02
mix = mix * gate + fx_late.a

# mono-compatible low end
mix = signal.sosfilt(sos("hp", 24.0, 2), mix, axis=-1)
lo = signal.sosfilt(sos("lp", 110.0, 2), mix, axis=-1)
mono_lo = lo.mean(axis=0, keepdims=True)
mix = mix - lo + mono_lo

# glue: gentle bus soft-clip then look-ahead limiter
pre = np.tanh(mix * 0.9) / np.tanh(0.9)
peak = np.max(np.abs(pre), axis=0)


def loudness(x):
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    return meter.integrated_loudness(x.T)


# drive into the limiter for club-level loudness
target_lufs = -9.5
gain_db = 0.0
for _ in range(3):
    g = 10 ** (gain_db / 20.0)
    y = pre * g
    pk = np.max(np.abs(y), axis=0)
    lg = limiter_gain(pk, 0.891, int(0.004 * SR), 1.0 - math.exp(-1.0 / (0.09 * SR)))
    y = y * lg
    y = np.clip(y, -0.891, 0.891)
    L = loudness(y)
    gain_db += (target_lufs - L)
    gain_db = min(gain_db, 14.0)
final = y
# tiny fade so the very last samples are click-free (natural decay already covers it)
fo = int(0.42 * SR)
final[:, -fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, math.pi, fo)))
final[:, :int(0.0005 * SR)] *= np.linspace(0, 1, int(0.0005 * SR))

# ---------------------------------------------------------------------------
# Write WAV (16-bit, TPDF dither)
# ---------------------------------------------------------------------------
os.makedirs(OUT_DIR, exist_ok=True)
dith = (rng.random((2, N)) - rng.random((2, N))) / 32768.0
pcm = np.clip((final + dith) * 32767.0, -32768, 32767).astype("<i2")
wav_path = os.path.join(OUT_DIR, "soundtrack.wav")
with wave.open(wav_path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.T.tobytes())

# ---------------------------------------------------------------------------
# Score + measured envelopes for the visuals
# ---------------------------------------------------------------------------
HOP = 200                      # 240 Hz envelope rate
WIN = 480


def band_env(x, kind, fc):
    y = filt(x, kind, fc, 2) if not isinstance(fc, (list, tuple)) else signal.sosfilt(signal.butter(2, fc, "bp", fs=SR, output="sos"), x)
    p = y * y
    c = np.cumsum(np.concatenate([[0], p]))
    idx = np.arange(0, N - WIN, HOP)
    e = np.sqrt((c[idx + WIN] - c[idx]) / WIN)
    return e


mono_final = final.mean(axis=0)
envs = {
    "low": band_env(mono_final, "lp", 140.0),
    "mid": band_env(mono_final, "bp", [250, 3500]),
    "high": band_env(mono_final, "hp", 6500.0),
    "all": band_env(mono_final, "hp", 20.0),
}
for k, v in envs.items():
    v = v / (np.percentile(v, 99.0) + 1e-9)
    envs[k] = np.round(np.clip(v, 0, 1.6), 3).tolist()

score = {
    "bpm": BPM, "beat": BEAT, "bar": BAR, "duration": DUR, "sr": SR,
    "sections": [
        {"name": "climb", "t0": T(0), "t1": T(2)},
        {"name": "drop1", "t0": T(2), "t1": T(5)},
        {"name": "airtime", "t0": T(5), "t1": T(6)},
        {"name": "build", "t0": T(6), "t1": T(7)},
        {"name": "drop2", "t0": T(7), "t1": T(11)},
        {"name": "station", "t0": T(11), "t1": DUR},
    ],
    "hang": [[a, b] for a, b in HANG],
    "chords": BAR_CHORD,
    "events": EV,
    "env": {"rate": SR / HOP, "hop": HOP / SR, "bands": envs},
}
with open(os.path.join(REEL_DIR, "score.js"), "w") as f:
    f.write("// generated by ../audio/make_audio.py — do not edit\nwindow.SCORE = ")
    json.dump(score, f, separators=(",", ":"))
    f.write(";\n")

pk = float(np.max(np.abs(final)))
print(f"wrote {wav_path}   duration {N / SR:.3f}s   peak {20 * math.log10(pk):.2f} dBFS   LUFS {loudness(final):.2f}")
print({k: len(v) for k, v in EV.items() if v})
