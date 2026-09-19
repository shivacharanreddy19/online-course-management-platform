/* ============================================================================
   LearnSphere — utils.js
   Tiny vanilla helpers shared by every page.
   ========================================================================== */
(function () {
  "use strict";
  const U = {};

  /* ------------------------------------------------ DOM */
  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  U.el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  U.esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  /* ------------------------------------------------ formatting */
  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  U.fmtPrice = (n) => usd.format(Number(n || 0));
  U.fmtNum = (n) =>
    new Intl.NumberFormat("en-US", { notation: n >= 10000 ? "compact" : "standard" }).format(n || 0);
  U.fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };
  U.fmtDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d) ? "—" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  U.timeAgo = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60); if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60); if (h < 24) return h + "h ago";
    const days = Math.floor(h / 24); if (days < 30) return days + "d ago";
    const mo = Math.floor(days / 30); if (mo < 12) return mo + "mo ago";
    return Math.floor(mo / 12) + "y ago";
  };
  U.fmtDuration = (mins) => {
    mins = Number(mins || 0);
    if (!mins) return "0m";
    if (mins < 60) return mins + "m";
    const h = Math.floor(mins / 60), m = mins % 60;
    return h + "h" + (m ? " " + m + "m" : "");
  };
  U.effectivePrice = (course) => {
    const p = Number(course.price || 0);
    const dp = course.discount_price != null ? Number(course.discount_price) : null;
    return dp != null && dp < p ? dp : p;
  };

  /* ------------------------------------------------ visuals */
  const GRADS = [
    ["#6e5bff", "#4cd4ff"], ["#845ef7", "#f783ac"], ["#4c6ef5", "#38d9a9"],
    ["#f76707", "#ffd43b"], ["#12b886", "#4cd4ff"], ["#e64980", "#845ef7"],
    ["#0ca678", "#fab005"], ["#364fc7", "#91a7ff"], ["#c2255c", "#ff8787"],
  ];
  U.hashStr = (s) => {
    let h = 0;
    for (let i = 0; i < String(s).length; i++) h = (h << 5) - h + String(s).charCodeAt(i) | 0;
    return Math.abs(h);
  };
  U.gradFor = (seed) => GRADS[U.hashStr(seed) % GRADS.length];
  U.initials = (name) =>
    String(name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  U.avatarHTML = (name, url, cls) => {
    if (url) return `<span class="${cls || "cell-avatar"}"><img src="${U.esc(url)}" alt="" loading="lazy"></span>`;
    const [a, b] = U.gradFor(name || "?");
    return `<span class="${cls || "cell-avatar"}" style="background:linear-gradient(135deg,${a},${b})">${U.initials(name)}</span>`;
  };
  U.thumbHTML = (course, cls) => {
    if (course.thumbnail_url)
      return `<img src="${U.esc(course.thumbnail_url)}" alt="${U.esc(course.title)}" loading="lazy">`;
    const [a, b] = U.gradFor(course.id || course.title);
    return `<div class="thumb-art ${cls || ""}" style="background:linear-gradient(130deg,${a},${b})"><span class="ta-letter">${U.esc(U.initials(course.title)[0])}</span></div>`;
  };
  U.starsHTML = (rating, size) => {
    rating = Math.round(Number(rating || 0) * 2) / 2;
    let out = "";
    for (let i = 1; i <= 5; i++) {
      const fill = rating >= i ? 1 : rating >= i - 0.5 ? 0.5 : 0;
      out += `<svg viewBox="0 0 24 24" style="${size ? `width:${size}px;height:${size}px;` : ""}">
        <defs><linearGradient id="sg${i}${Math.round(rating * 10)}"><stop offset="${fill * 100}%" stop-color="currentColor"/><stop offset="${fill * 100}%" stop-color="rgba(148,163,255,.25)"/></linearGradient></defs>
        <path fill="url(#sg${i}${Math.round(rating * 10)})" d="M12 2l2.9 6.26L21.5 9.3l-4.75 4.87L17.8 21 12 17.77 6.2 21l1.05-6.83L2.5 9.3l6.6-1.04z"/>
      </svg>`;
    }
    return out;
  };

  /* ------------------------------------------------ url & misc */
  U.param = (name, fallback) => new URLSearchParams(location.search).get(name) ?? fallback ?? null;
  U.debounce = (fn, ms) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms || 350); };
  };
  U.store = {
    get(k, fb) { try { const v = localStorage.getItem("ls_" + k); return v == null ? fb : JSON.parse(v); } catch { return fb; } },
    set(k, v) { try { localStorage.setItem("ls_" + k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem("ls_" + k); } catch {} },
  };
  U.embedUrl = (url) => {
    if (!url) return { type: "none" };
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
    if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1` };
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return { type: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes("supabase")) return { type: "video", src: url };
    return { type: "iframe", src: url };
  };
  U.statusPill = (status) => {
    const map = {
      published: ["pill-mint", "Published"], draft: ["pill", "Draft"],
      pending: ["pill-amber", "Pending review"], rejected: ["pill-rose", "Rejected"],
      paid: ["pill-mint", "Paid"], failed: ["pill-rose", "Failed"], refunded: ["pill-sky", "Refunded"],
    };
    const [cls, label] = map[status] || ["pill", status];
    return `<span class="pill status-pill ${cls}">${label}</span>`;
  };

  window.LS = window.LS || {};
  window.LS.utils = U;
})();
