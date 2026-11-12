/* Tidara preferences: language (en default, id) and theme (auto / light / dark).
   Loaded in <head> so the page renders in the right language and theme without a flash. */
(function () {
  "use strict";
  const KEY_L = "tidara.lang", KEY_T = "tidara.theme";
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const root = document.documentElement;
  const hostTheme = root.getAttribute("data-theme");        // a host (e.g. an embedding app) may set this
  const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const P = {
    lang: get(KEY_L) === "id" ? "id" : "en",
    themePref: get(KEY_T) || "auto",
    listeners: [],
    theme() {
      if (this.themePref === "light" || this.themePref === "dark") return this.themePref;
      if (hostTheme === "light" || hostTheme === "dark") return hostTheme;
      return mq && mq.matches ? "dark" : "light";
    },
    apply() {
      root.setAttribute("data-lang", this.lang);
      root.setAttribute("lang", this.lang);
      root.setAttribute("data-theme", this.theme());
      document.querySelectorAll(".js-lang").forEach((b) => {
        b.textContent = this.lang === "en" ? "ID" : "EN";
        b.setAttribute("aria-label", this.lang === "en" ? "Ganti ke Bahasa Indonesia" : "Switch to English");
        b.title = b.getAttribute("aria-label");
      });
      document.querySelectorAll(".js-theme").forEach((b) => {
        const dark = this.theme() === "dark";
        b.innerHTML = dark
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>';
        const lbl = this.lang === "id" ? (dark ? "Mode siang" : "Mode malam") : (dark ? "Day mode" : "Night mode");
        b.setAttribute("aria-label", lbl); b.title = lbl;
      });
      this.listeners.forEach((f) => f());
    },
    setLang(l) { this.lang = l; set(KEY_L, l); this.apply(); },
    toggleTheme() { this.themePref = this.theme() === "dark" ? "light" : "dark"; set(KEY_T, this.themePref); this.apply(); },
    onChange(f) { this.listeners.push(f); },
  };
  if (mq && mq.addEventListener) mq.addEventListener("change", () => { if (P.themePref === "auto") P.apply(); });
  root.setAttribute("data-lang", P.lang); root.setAttribute("lang", P.lang); root.setAttribute("data-theme", P.theme());
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".js-lang").forEach((b) => b.addEventListener("click", () => P.setLang(P.lang === "en" ? "id" : "en")));
    document.querySelectorAll(".js-theme").forEach((b) => b.addEventListener("click", () => P.toggleTheme()));
    P.apply();
  });
  window.TidaraPrefs = P;
})();
