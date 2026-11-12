/* Tidara tide engine — harmonic tide prediction (Schureman arguments, Foreman/Schureman nodal factors).
   h(t) = Σ f·H·cos(V0(t) + u − g)   [metres relative to MSL, t in UTC]
   Written as a factory so the same code runs on the page and inside a Web Worker. */
function tidaraEngineFactory() {
  "use strict";
  const RAD = Math.PI / 180;
  const CONST = {
    Sa: [0, 0, 1, 0, 0, 0, 0, "1"], Ssa: [0, 0, 2, 0, 0, 0, 0, "1"], Mm: [0, 1, 0, -1, 0, 0, 0, "Mm"],
    MSf: [0, 2, -2, 0, 0, 0, 0, [["M2", -1]]], Mf: [0, 2, 0, 0, 0, 0, 0, "Mf"],
    "2Q1": [1, -4, 1, 2, 0, 0, 90, "O1"], sigma1: [1, -4, 3, 0, 0, 0, 90, "O1"], Q1: [1, -3, 1, 1, 0, 0, 90, "O1"],
    rho1: [1, -3, 3, -1, 0, 0, 90, "O1"], O1: [1, -2, 1, 0, 0, 0, 90, "O1"], M1: [1, -1, 1, 1, 0, 0, -90, "M1"],
    pi1: [1, 0, -2, 0, 0, 1, 90, "1"], P1: [1, 0, -1, 0, 0, 0, 90, "1"], S1: [1, 0, 0, 0, 0, 0, 180, "1"],
    K1: [1, 0, 1, 0, 0, 0, -90, "K1"], psi1: [1, 0, 2, 0, 0, -1, -90, "1"], phi1: [1, 0, 3, 0, 0, 0, -90, "1"],
    theta1: [1, 1, -1, 1, 0, 0, -90, "J1"], J1: [1, 1, 1, -1, 0, 0, -90, "J1"], SO1: [1, 2, -1, 0, 0, 0, -90, "OO1"],
    OO1: [1, 2, 1, 0, 0, 0, -90, "OO1"], "2N2": [2, -4, 2, 2, 0, 0, 0, "M2"], mu2: [2, -4, 4, 0, 0, 0, 0, "M2"],
    N2: [2, -3, 2, 1, 0, 0, 0, "M2"], nu2: [2, -3, 4, -1, 0, 0, 0, "M2"], M2: [2, -2, 2, 0, 0, 0, 0, "M2"],
    lambda2: [2, -1, 0, 1, 0, 0, 180, "M2"], L2: [2, -1, 2, -1, 0, 0, 180, "L2"], T2: [2, 0, -1, 0, 0, 1, 0, "1"],
    S2: [2, 0, 0, 0, 0, 0, 0, "1"], R2: [2, 0, 1, 0, 0, -1, 180, "1"], K2: [2, 0, 2, 0, 0, 0, 0, "K2"],
    "2SM2": [2, 2, -2, 0, 0, 0, 0, [["M2", -1]]], MO3: [3, -4, 3, 0, 0, 0, 90, [["M2", 1], ["O1", 1]]],
    M3: [3, -3, 3, 0, 0, 0, 180, "M3"], SO3: [3, -2, 1, 0, 0, 0, 90, [["O1", 1]]],
    MK3: [3, -2, 3, 0, 0, 0, -90, [["M2", 1], ["K1", 1]]], SK3: [3, 0, 1, 0, 0, 0, -90, [["K1", 1]]],
    MN4: [4, -5, 4, 1, 0, 0, 0, [["M2", 2]]], M4: [4, -4, 4, 0, 0, 0, 0, [["M2", 2]]], MS4: [4, -2, 2, 0, 0, 0, 0, [["M2", 1]]],
    MK4: [4, -2, 4, 0, 0, 0, 0, [["M2", 1], ["K2", 1]]], S4: [4, 0, 0, 0, 0, 0, 0, "1"],
    "2MN6": [6, -7, 6, 1, 0, 0, 0, [["M2", 3]]], M6: [6, -6, 6, 0, 0, 0, 0, [["M2", 3]]],
    "2MS6": [6, -4, 4, 0, 0, 0, 0, [["M2", 2]]], "2SM6": [6, -2, 2, 0, 0, 0, 0, [["M2", 1]]], M8: [8, -8, 8, 0, 0, 0, 0, [["M2", 4]]],
  };
  const RATE = [15.0, 0.54901652, 0.04106864, 0.00464181, -0.00220641, 0.00000196]; // deg/hour of T,s,h,p,N,p1
  const speed = (n) => CONST[n].slice(0, 6).reduce((a, k, i) => a + k * RATE[i], 0);

  function astro(ms) {
    const jd = ms / 86400000 + 2440587.5, T = (jd - 2451545.0) / 36525.0;
    const ut = ((((jd - 0.5) % 1) + 1) % 1) * 24;
    return [180 + 15 * ut, 218.3164477 + 481267.88123421 * T, 280.4664567 + 36000.76983 * T,
      83.3532465 + 4069.0137287 * T, 125.0445479 - 1934.1362891 * T, 282.9373 + 1.71946 * T];
  }
  function baseFU(rule, N, p) {
    const n = N * RAD, pr = p * RAD, c = Math.cos, s = Math.sin;
    switch (rule) {
      case "1": return [1, 0];
      case "Mm": return [1.0 - 0.130 * c(n), 0];
      case "Mf": return [1.043 + 0.414 * c(n), -23.7 * s(n) + 2.7 * s(2 * n) - 0.4 * s(3 * n)];
      case "O1": return [1.009 + 0.187 * c(n) - 0.015 * c(2 * n), 10.8 * s(n) - 1.3 * s(2 * n) + 0.2 * s(3 * n)];
      case "K1": return [1.006 + 0.115 * c(n) - 0.009 * c(2 * n), -8.9 * s(n) + 0.7 * s(2 * n)];
      case "J1": return [1.013 + 0.168 * c(n) - 0.017 * c(2 * n), -12.9 * s(n) + 1.3 * s(2 * n)];
      case "OO1": return [1.160 + 0.664 * c(n) + 0.134 * c(2 * n), -36.7 * s(n) + 4.0 * s(2 * n)];
      case "M2": return [1.0 - 0.037 * c(n), -2.1 * s(n)];
      case "K2": return [1.024 + 0.286 * c(n) + 0.008 * c(2 * n), -17.7 * s(n) + 0.7 * s(2 * n)];
      case "M3": { const [f, u] = baseFU("M2", N, p); return [Math.pow(f, 1.5), 1.5 * u]; }
      case "L2": {
        const cc = 1 - 0.2505 * c(2 * pr) - 0.1102 * c(2 * pr - n) - 0.0156 * c(2 * pr - 2 * n) - 0.037 * c(n);
        const ss = -0.2505 * s(2 * pr) - 0.1102 * s(2 * pr - n) - 0.0156 * s(2 * pr - 2 * n) - 0.037 * s(n);
        return [Math.hypot(cc, ss), Math.atan2(ss, cc) / RAD];
      }
      case "M1": {
        const cc = 2 * c(pr) + 0.4 * c(pr - n), ss = s(pr) + 0.2 * s(pr - n);
        return [Math.hypot(cc, ss) / 2.1, Math.atan2(ss, cc) / RAD - p];
      }
    }
    return [1, 0];
  }
  function nodal(name, N, p, cache) {
    const rule = CONST[name][7], get = (r) => { if (!cache) return baseFU(r, N, p); return cache[r] || (cache[r] = baseFU(r, N, p)); };
    if (typeof rule === "string") return get(rule);
    let f = 1, u = 0;
    for (const [b, pw] of rule) { const [fb, ub] = get(CONST[b][7]); f *= Math.pow(fb, Math.abs(pw)); u += pw * ub; }
    return [f, u];
  }
  /* Pre-compute, for a station and a reference instant, amplitude f·H, phase (rad) at that instant and speed (rad/ms). */
  function terms(st, ms) {
    const a = astro(ms), out = [], cache = {};
    for (const name in st.c) {
      const k = CONST[name]; if (!k) continue;
      const [H, g] = st.c[name], [f, u] = nodal(name, a[4], a[3], cache);
      const V = k[0] * a[0] + k[1] * a[1] + k[2] * a[2] + k[3] * a[3] + k[4] * a[4] + k[5] * a[5] + k[6];
      out.push(f * H, (V + u - g) * RAD, speed(name) * RAD / 3600000);
    }
    return out;
  }
  function height(st, ms) {
    const t = terms(st, ms); let z = 0;
    for (let i = 0; i < t.length; i += 3) z += t[i] * Math.cos(t[i + 1]);
    return z;
  }
  /* Regular series: n values from startMs every stepMs. Nodal terms refreshed every 3 days; within a day each
     constituent is advanced by rotating its phasor (no trig per sample), which keeps long runs fast. */
  function series(st, startMs, stepMs, n, onProgress) {
    const out = new Float32Array(n), DAY = 86400000;
    let i = 0, lastReport = 0;
    while (i < n) {
      const tr = terms(st, startMs + i * stepMs), K = tr.length / 3;
      const A = new Float64Array(K), C = new Float64Array(K), S = new Float64Array(K), RC = new Float64Array(K), RS = new Float64Array(K);
      for (let k = 0; k < K; k++) {
        A[k] = tr[3 * k]; C[k] = Math.cos(tr[3 * k + 1]); S[k] = Math.sin(tr[3 * k + 1]);
        const w = tr[3 * k + 2] * stepMs; RC[k] = Math.cos(w); RS[k] = Math.sin(w);
      }
      const m = Math.min(n - i, Math.max(1, Math.floor(3 * DAY / stepMs)));
      for (let j = 0; j < m; j++) {
        let z = 0;
        for (let k = 0; k < K; k++) {
          z += A[k] * C[k];
          const c = C[k] * RC[k] - S[k] * RS[k]; S[k] = S[k] * RC[k] + C[k] * RS[k]; C[k] = c;
        }
        out[i + j] = z;
      }
      i += m;
      if (onProgress && i - lastReport > n / 50) { lastReport = i; onProgress(i / n); }
    }
    return out;
  }
  /* High and low waters between startMs and endMs: coarse 20-min scan, then golden-section refinement. */
  function extremes(st, startMs, endMs, onProgress) {
    const step = 20 * 60000, n = Math.max(3, Math.ceil((endMs - startMs) / step) + 3);
    const s = series(st, startMs - step, step, n, onProgress ? (p) => onProgress(p * 0.85) : null);
    const T = [], H = [], K = [];
    let tr = null, trT = -1e18;
    const h = (t) => { let z = 0; const dt = t - trT; for (let k = 0; k < tr.length; k += 3) z += tr[k] * Math.cos(tr[k + 1] + tr[k + 2] * dt); return z; };
    for (let i = 1; i < n - 1; i++) {
      const hi = s[i] > s[i - 1] && s[i] >= s[i + 1], lo = s[i] < s[i - 1] && s[i] <= s[i + 1];
      if (!hi && !lo) continue;
      const tc = startMs - step + i * step, sg = hi ? 1 : -1;
      if (tc - trT > 3 * 86400000) { trT = tc; tr = terms(st, tc); }
      // parabolic first guess, then Newton iterations on dh/dt = 0
      const den = s[i - 1] - 2 * s[i] + s[i + 1];
      let t = tc + (den !== 0 ? 0.5 * (s[i - 1] - s[i + 1]) / den : 0) * step;
      for (let it = 0; it < 3; it++) {
        let d1 = 0, d2 = 0; const dt = t - trT;
        for (let k = 0; k < tr.length; k += 3) {
          const w = tr[k + 2], ph = tr[k + 1] + w * dt;
          d1 -= tr[k] * w * Math.sin(ph); d2 -= tr[k] * w * w * Math.cos(ph);
        }
        if (d2 === 0) break;
        const nt = t - d1 / d2;
        if (Math.abs(nt - tc) > step) break;
        t = nt;
      }
      if (t < startMs || t > endMs) continue;
      T.push(t); H.push(h(t)); K.push(hi ? 1 : 0);
      if (onProgress && i % 20000 === 0) onProgress(0.85 + 0.15 * i / n);
    }
    return { t: Float64Array.from(T), h: Float32Array.from(H), hw: Uint8Array.from(K) };
  }
  return { CONST, speed, astro, nodal, terms, height, series, extremes };
}
if (typeof window !== "undefined") window.TidaraEngine = tidaraEngineFactory();
