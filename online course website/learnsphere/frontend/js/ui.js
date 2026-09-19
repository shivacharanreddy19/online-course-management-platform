/* ============================================================================
   LearnSphere — ui.js
   The shared component engine: icons, navbar, footer, toasts, modals,
   skeletons, course cards, pagination, SVG charts, scroll reveals, guards.
   ========================================================================== */
(function () {
  "use strict";
  const U = () => window.LS.utils;
  const api = () => window.LS.api;

  /* =====================================================================
     ICON SET (inline SVG, 24×24 stroke style)
     ===================================================================== */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    play: '<path d="M7 5.5v13l11-6.5z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M8 16v-5m4 5V8m4 8v-3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 15.3c2.4.4 4.2 2 4.9 4.7"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
    bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>',
    cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/><path d="M2.5 3.5h2.6l2.5 12h10.4l2-8H6"/>',
    heart: '<path d="M12 20.7C7 16.9 3.5 13.6 3.5 9.9 3.5 7.2 5.6 5 8.3 5c1.5 0 3 .7 3.7 1.9C12.7 5.7 14.2 5 15.7 5c2.7 0 4.8 2.2 4.8 4.9 0 3.7-3.5 7-8.5 10.8z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.8-4.8"/>',
    star: '<path d="M12 2.6l2.9 6.2 6.6 1-4.7 4.8 1 6.7L12 18.2 6.2 21.3l1-6.7L2.5 9.8l6.6-1z"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    x: '<path d="M5 5l14 14M19 5 5 19"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M14.5 5.5 18.5 9.5 8 20H4v-4z"/><path d="m12.5 7.5 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3m-8.5 0 .8 13h9.4l.8-13"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    logout: '<path d="M14 4h-8v16h8"/><path d="M14 12h7m0 0-3-3m3 3-3 3"/>',
    cert: '<circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-1.8 7 5.3-2.8 5.3 2.8-1.8-7"/>',
    award: '<circle cx="12" cy="9" r="5.5"/><path d="M9.5 8.5l1.7 1.7 3-3.2"/><path d="m8.5 13.5-1.8 7 5.3-2.8 5.3 2.8-1.8-7"/>',
    upload: '<path d="M12 16V4m0 0 4.5 4.5M12 4 7.5 8.5"/><path d="M4 16v4h16v-4"/>',
    download: '<path d="M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5"/><path d="M4 16v4h16v-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.7 2.6 4 5.7 4 9s-1.3 6.4-4 9c-2.7-2.6-4-5.7-4-9s1.3-6.4 4-9z"/>',
    signal: '<path d="M4 20v-6M9.3 20v-9M14.7 20V7M20 20V4"/>',
    arrowR: '<path d="M4 12h15m0 0-6-6m6 6-6 6"/>',
    arrowL: '<path d="M20 12H5m0 0 6-6m-6 6 6 6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>',
    lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    filter: '<path d="M3 5h18l-7 8v5.5L10 21v-8z"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    spark: '<path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.8 5.8l2.4 2.4M15.8 15.8l2.4 2.4M18.2 5.8l-2.4 2.4M8.2 15.8l-2.4 2.4"/><circle cx="12" cy="12" r="2.6"/>',
    trophy: '<path d="M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5"/>',
    shield: '<path d="M12 2.5 4.5 5.5v6c0 5 3.2 8.4 7.5 10 4.3-1.6 7.5-5 7.5-10v-6z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
    zap: '<path d="M13 2 4 13.5h6L11 22l9-11.5h-6z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 17.5l9 5 9-5"/>',
    video: '<rect x="2.5" y="6" width="14" height="12" rx="2.5"/><path d="m16.5 10.5 5-3v9l-5-3"/>',
    file: '<path d="M13 2.5H6v19h12v-14z"/><path d="M13 2.5v5h5"/>',
    note: '<path d="M5 3.5h14v17H5z"/><path d="M8.5 8h7m-7 4h7m-7 4h4"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M4 4.5 20 19.5M9.9 6c.7-.1 1.4-.2 2.1-.2 6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-2.7 3.6M6.2 7.8A16.8 16.8 0 0 0 2.5 12S6 18.2 12 18.2c1 0 2-.2 2.9-.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11.5V16"/>',
    warn: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 9.5V14m0 3h.01"/>',
    send: '<path d="m21 3.5-9.5 9.5M21 3.5 14 21l-2.5-8L3 10.5z"/>',
    wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M4 5v14a2 2 0 0 0 2 2h14V7"/><circle cx="16.5" cy="14" r="1.4"/>',
    tag: '<path d="m3 12 9-9h9v9l-9 9z"/><circle cx="16.5" cy="7.5" r="1.4"/>',
    quote: '<path d="M9.5 6C6.5 7.5 5 9.9 5 13.9V18h5.5v-5.5H7.3c.1-2.1 1-3.5 2.9-4.6zM19 6c-3 1.5-4.5 3.9-4.5 7.9V18H20v-5.5h-3.2c.1-2.1 1-3.5 2.9-4.6z"/>',
    grad: '<path d="m2.5 9.5 9.5-5 9.5 5-9.5 5z"/><path d="M6.5 12v5c3 2.6 8 2.6 11 0v-5"/><path d="M21.5 9.5V15"/>',
    keynote: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4m-4 0h8"/>',
    dashboard: '<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/>',
    inbox: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
    message: '<path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.4 0-2.8-.3-4-.9L3 21l1.4-4.5A8.5 8.5 0 1 1 21 12z"/>',
  };
  function icon(name, cls) {
    return `<svg class="${cls || "icon"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.info}</svg>`;
  }

  function logoSVG(size) {
    return `<svg class="brand-mark" style="width:${size || 34}px;height:${size || 34}px" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs><linearGradient id="lg-br" x1="0" y1="0" x2="48" y2="48"><stop stop-color="#6e5bff"/><stop offset="1" stop-color="#4cd4ff"/></linearGradient></defs>
      <circle cx="24" cy="24" r="20" stroke="url(#lg-br)" stroke-width="2.6"/>
      <ellipse cx="24" cy="24" rx="20" ry="8" stroke="url(#lg-br)" stroke-width="1.6" opacity=".65" transform="rotate(-24 24 24)"/>
      <circle cx="24" cy="24" r="7" fill="url(#lg-br)"/>
      <circle cx="40.5" cy="14" r="3" fill="#4cd4ff"/>
    </svg>`;
  }

  /* =====================================================================
     NAVBAR
     ===================================================================== */
  async function initNav(opts) {
    opts = opts || {};
    const root = document.getElementById("nav-root");
    if (!root) return;

    const links = [
      { href: "index.html", label: "Home", key: "home" },
      { href: "courses.html", label: "Courses", key: "courses" },
    ];

    const session = api().session.get();
    let profile = U().store.get("profile", null);

    root.innerHTML = `
      <header class="nav" id="topnav">
        <div class="nav-inner">
          <a class="brand" href="index.html">${logoSVG()}<span>Learn<b>Sphere</b></span></a>
          <nav class="nav-links" aria-label="Primary">
            ${links.map(l => `<a href="${l.href}" class="${opts.active === l.key ? "active" : ""}">${l.label}</a>`).join("")}
            ${profile ? `<a href="${dashHref(profile)}" class="${opts.active === "dashboard" ? "active" : ""}">Dashboard</a>` : ""}
          </nav>
          <div class="nav-spacer"></div>
          <div class="nav-actions" id="nav-actions"></div>
          <button class="nav-ic-btn nav-burger" id="nav-burger" aria-label="Open menu">${icon("menu")}</button>
        </div>
      </header>
      <div class="drawer-backdrop" id="drawer-backdrop"></div>
      <aside class="drawer" id="nav-drawer" aria-label="Menu">
        <div class="flex-between mb-2">
          <a class="brand" href="index.html">${logoSVG(28)}<span>Learn<b>Sphere</b></span></a>
          <button class="nav-ic-btn" id="drawer-close" aria-label="Close menu">${icon("x")}</button>
        </div>
        ${links.map(l => `<a class="drawer-link ${opts.active === l.key ? "active" : ""}" href="${l.href}">${icon(l.key === "home" ? "home" : "compass")} ${l.label}</a>`).join("")}
      </aside>`;

    const actions = document.getElementById("nav-actions");
    const drawer = document.getElementById("nav-drawer");

    if (!session || !profile) {
      actions.innerHTML = `
        <a href="courses.html" class="nav-ic-btn" data-tip="Browse courses" aria-label="Courses">${icon("compass")}</a>
        <a href="login.html" class="btn btn-ghost btn-sm">Log in</a>
        <a href="register.html" class="btn btn-primary btn-sm">Get started ${icon("arrowR")}</a>`;
      drawer.insertAdjacentHTML("beforeend", `
        <div class="mt-3 grid" style="gap:.6rem">
          <a href="login.html" class="btn btn-ghost btn-block">Log in</a>
          <a href="register.html" class="btn btn-primary btn-block">Create free account</a>
        </div>`);
    } else {
      actions.innerHTML = `
        <a href="cart.html" class="nav-ic-btn" data-tip="Cart" aria-label="Cart">${icon("cart")}<span class="badge-n hidden" id="cart-badge"></span></a>
        <div class="dropdown" id="notif-dd">
          <button class="nav-ic-btn" aria-label="Notifications">${icon("bell")}<span class="badge-n hidden" id="notif-badge"></span></button>
          <div class="dropdown-menu" style="min-width:320px">
            <div class="dropdown-head"><h4>Notifications</h4><button class="link btn-xs" id="notif-read-all">Mark all read</button></div>
            <div class="notif-list" id="notif-list"><div class="state" style="padding:1.4rem"><p class="text-dim">Loading…</p></div></div>
          </div>
        </div>
        <div class="dropdown" id="user-dd">
          <button class="nav-avatar" style="background:${gradCss(profile.full_name)}" aria-label="Account">
            ${profile.avatar_url ? `<img src="${U().esc(profile.avatar_url)}" alt="">` : U().initials(profile.full_name)}
          </button>
          <div class="dropdown-menu">
            <div class="dropdown-head" style="display:block">
              <b style="font-family:var(--font-display)">${U().esc(profile.full_name || "Account")}</b>
              <p class="text-dim" style="font-size:.76rem;text-transform:capitalize">${U().esc(profile.role || "")} · ${U().esc(profile.email || "")}</p>
            </div>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" href="${dashHref(profile)}">${icon("dashboard")} Dashboard</a>
            <a class="dropdown-item" href="student-dashboard.html#courses">${icon("book")} My courses</a>
            <a class="dropdown-item" href="wishlist.html">${icon("heart")} Wishlist</a>
            <a class="dropdown-item" href="certificates.html">${icon("cert")} Certificates</a>
            <a class="dropdown-item" href="profile.html">${icon("user")} Profile</a>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" id="nav-logout" style="color:#ff9db4">${icon("logout")} Log out</button>
          </div>
        </div>`;
      drawer.insertAdjacentHTML("beforeend", `
        <a class="drawer-link" href="${dashHref(profile)}">${icon("dashboard")} Dashboard</a>
        <a class="drawer-link" href="student-dashboard.html#courses">${icon("book")} My courses</a>
        <a class="drawer-link" href="cart.html">${icon("cart")} Cart</a>
        <a class="drawer-link" href="wishlist.html">${icon("heart")} Wishlist</a>
        <a class="drawer-link" href="certificates.html">${icon("cert")} Certificates</a>
        <a class="drawer-link" href="profile.html">${icon("user")} Profile</a>
        <button class="drawer-link" id="drawer-logout" style="color:#ff9db4;margin-top:auto">${icon("logout")} Log out</button>`);

      bindDropdown("notif-dd");
      bindDropdown("user-dd");
      bindNavBadges();
      const lo = document.getElementById("nav-logout");
      const dlo = document.getElementById("drawer-logout");
      [lo, dlo].filter(Boolean).forEach(b => b.addEventListener("click", logout));
      const readAll = document.getElementById("notif-read-all");
      if (readAll) readAll.addEventListener("click", async () => {
        await api().put("/notifications/read-all");
        bindNavBadges(); loadNotifs();
      });
      const dd = document.getElementById("notif-dd");
      dd.querySelector("button").addEventListener("click", loadNotifs);
    }

    // scroll style
    const nav = document.getElementById("topnav");
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 14);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // drawer
    const burger = document.getElementById("nav-burger");
    const close = document.getElementById("drawer-close");
    const backdrop = document.getElementById("drawer-backdrop");
    const setOpen = (v) => document.body.classList.toggle("drawer-open", v);
    burger.addEventListener("click", () => setOpen(true));
    close.addEventListener("click", () => setOpen(false));
    backdrop.addEventListener("click", () => setOpen(false));
  }

  function gradCss(name) {
    const [a, b] = U().gradFor(name || "?");
    return `linear-gradient(135deg,${a},${b})`;
  }
  function dashHref(profile) {
    if (!profile) return "login.html";
    if (profile.role === "admin") return "admin-dashboard.html";
    if (profile.role === "instructor") return "instructor-dashboard.html";
    return "student-dashboard.html";
  }

  function bindDropdown(id) {
    const dd = document.getElementById(id);
    if (!dd) return;
    dd.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      const was = dd.classList.contains("open");
      U().$$(".dropdown.open").forEach(d => d.classList.remove("open"));
      dd.classList.toggle("open", !was);
    });
    dd.addEventListener("click", (e) => e.stopPropagation());
  }
  document.addEventListener("click", () => {
    U && U().$$(".dropdown.open").forEach(d => d.classList.remove("open"));
  });

  async function bindNavBadges() {
    if (!api().session.token()) return;
    const [cart, notif] = await Promise.all([
      api().get("/cart"), api().get("/notifications"),
    ]);
    if (cart.success) {
      const n = cart.data.summary.count;
      const b = document.getElementById("cart-badge");
      if (b && n > 0) { b.textContent = n; b.classList.remove("hidden"); }
    }
    if (notif.success) {
      const n = notif.data.unread_count;
      const b = document.getElementById("notif-badge");
      if (b && n > 0) { b.textContent = n > 9 ? "9+" : n; b.classList.remove("hidden"); }
    }
  }

  async function loadNotifs() {
    const list = document.getElementById("notif-list");
    if (!list) return;
    const res = await api().get("/notifications");
    if (!res.success) { list.innerHTML = `<div class="state" style="padding:1.2rem"><p class="text-dim">${U().esc(res.message)}</p></div>`; return; }
    const items = res.data.items.slice(0, 12);
    list.innerHTML = items.length ? items.map(n => `
      <button class="dropdown-item notif-item ${n.is_read ? "read" : ""}" data-id="${n.id}">
        <span class="n-dot"></span>
        <span class="n-body">
          <span class="n-title">${U().esc(n.title || "")}</span>
          <span class="n-msg">${U().esc(n.message || "")}</span>
          <span class="n-time">${U().timeAgo(n.created_at)}</span>
        </span>
      </button>`).join("")
      : `<div class="state" style="padding:1.4rem"><div class="state-icon">${icon("bell")}</div><p class="text-dim">No notifications yet</p></div>`;
    U().$$(".notif-item", list).forEach(el => el.addEventListener("click", async () => {
      if (!el.classList.contains("read")) {
        await api().put(`/notifications/${el.dataset.id}/read`);
        el.classList.add("read");
        bindNavBadges();
      }
    }));
  }

  function logout() {
    api().session.clear();
    location.href = "index.html";
  }

  /* =====================================================================
     FOOTER
     ===================================================================== */
  function initFooter() {
    const root = document.getElementById("footer-root");
    if (!root) return;
    root.innerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <a class="brand" href="index.html">${logoSVG()}<span>Learn<b>Sphere</b></span></a>
            <p class="blurb">A premium learning platform where ambitious people master tomorrow's skills — taught by industry experts.</p>
          </div>
          <div>
            <h4>Platform</h4>
            <ul><li><a href="courses.html">Browse courses</a></li><li><a href="register.html">Become an instructor</a></li><li><a href="cart.html">Cart</a></li><li><a href="wishlist.html">Wishlist</a></li></ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul><li><a href="login.html">Log in</a></li><li><a href="register.html">Register</a></li><li><a href="student-dashboard.html">Dashboard</a></li><li><a href="certificates.html">Certificates</a></li></ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul><li><a href="#">Help center</a></li><li><a href="#">Terms of use</a></li><li><a href="#">Privacy policy</a></li><li><a href="#">Contact</a></li></ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} LearnSphere. Crafted for learners.</span>
          <span>Made with ${icon("heart", "icon")} for education</span>
        </div>
      </div>
    </footer>`;
  }

  /* =====================================================================
     TOASTS
     ===================================================================== */
  function toast(title, msg, type, ms) {
    let stack = document.querySelector(".toast-stack");
    if (!stack) { stack = U().el("div", "toast-stack"); document.body.appendChild(stack); }
    const icons = { success: "check", error: "warn", info: "info" };
    const t = U().el("div", `toast toast-${type || "info"}`, `
      <span class="t-ic">${icon(icons[type] || "info")}</span>
      <span><b>${U().esc(title)}</b>${msg ? `<span>${U().esc(msg)}</span>` : ""}</span>`);
    stack.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 380); }, ms || 3800);
  }

  /* =====================================================================
     MODALS
     ===================================================================== */
  function modal(opts) {
    const backdrop = U().el("div", "modal-backdrop");
    backdrop.innerHTML = `
      <div class="modal ${opts.size === "lg" ? "modal-lg" : opts.size === "xl" ? "modal-xl" : ""}" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3>${U().esc(opts.title || "")}</h3>
          <button class="modal-close" aria-label="Close">${icon("x")}</button>
        </div>
        <div class="modal-body"></div>
        ${opts.foot ? `<div class="modal-foot"></div>` : ""}
      </div>`;
    const bodyEl = backdrop.querySelector(".modal-body");
    if (typeof opts.body === "string") bodyEl.innerHTML = opts.body; else if (opts.body) bodyEl.appendChild(opts.body);
    if (opts.foot) {
      const foot = backdrop.querySelector(".modal-foot");
      if (typeof opts.foot === "string") foot.innerHTML = opts.foot; else foot.appendChild(opts.foot);
    }
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => backdrop.classList.add("open"));

    const close = () => {
      backdrop.classList.remove("open");
      document.body.style.overflow = "";
      setTimeout(() => backdrop.remove(), 320);
    };
    backdrop.querySelector(".modal-close").addEventListener("click", close);
    backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) close(); });
    const escFn = (e) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", escFn); } };
    document.addEventListener("keydown", escFn);
    return { el: backdrop, body: bodyEl, close };
  }

  function confirmDialog(title, msg, confirmLabel, danger) {
    return new Promise((resolve) => {
      const m = modal({
        title,
        body: `<p class="text-muted">${U().esc(msg)}</p>`,
        foot: `<button class="btn btn-ghost" data-x="0">Cancel</button>
               <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-x="1">${U().esc(confirmLabel || "Confirm")}</button>`,
      });
      m.el.querySelectorAll("[data-x]").forEach((b) =>
        b.addEventListener("click", () => { m.close(); resolve(b.dataset.x === "1"); }));
    });
  }

  /* =====================================================================
     SKELETONS * STATES
     ===================================================================== */
  const skeletonCards = (n) =>
    Array.from({ length: n || 6 }).map(() => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-thumb"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line" style="margin-bottom:1.2rem"></div>
      </div>`).join("");

  const skeletonRows = (n) =>
    Array.from({ length: n || 5 }).map(() =>
      `<div class="skeleton" style="height:64px;border-radius:14px"></div>`).join("");

  const emptyState = (title, msg, ic, actionHTML) => `
    <div class="state">
      <div class="state-icon">${icon(ic || "inbox")}</div>
      <h3>${U().esc(title)}</h3><p>${U().esc(msg || "")}</p>
      ${actionHTML || ""}
    </div>`;

  const errorState = (msg, retryAttr) => `
    <div class="state">
      <div class="state-icon" style="color:#ff9db4">${icon("warn")}</div>
      <h3>Something went wrong</h3><p>${U().esc(msg)}</p>
      ${retryAttr ? `<button class="btn btn-ghost btn-sm" ${retryAttr}>${icon("arrowR")} Try again</button>` : ""}
    </div>`;

  /* =====================================================================
     COURSE CARD (shared by home, catalog, wishlist...)
     ===================================================================== */
  function courseCard(c, opts) {
    opts = opts || {};
    const price = Number(c.effective_price ?? U().effectivePrice(c));
    const was = Number(c.price || 0);
    const levelMap = { beginner: ["pill-mint", "Beginner"], intermediate: ["pill-amber", "Intermediate"], advanced: ["pill-rose", "Advanced"], all: ["pill-sky", "All levels"] };
    const [lvCls, lvName] = levelMap[c.level] || levelMap.all;
    return `
    <article class="course-card" data-reveal>
      <a class="cc-thumb" href="course-details.html?id=${c.id}">
        ${U().thumbHTML(c)}
        <span class="cc-badges">${c.rating_avg >= 4.5 ? `<span class="pill pill-amber">${icon("star")} Top rated</span>` : ""}</span>
        <span class="cc-level"><span class="pill ${lvCls}" style="backdrop-filter:blur(8px)">${lvName}</span></span>
      </a>
      ${opts.wishBtn ? `<button class="cc-fav ${opts.inWishlist ? "active" : ""}" data-wish="${c.id}" aria-label="Wishlist">${icon("heart")}</button>` : ""}
      <div class="cc-body">
        <span class="cc-cat">${U().esc((c.category && c.category.name) || "Course")}</span>
        <h3 class="cc-title"><a href="course-details.html?id=${c.id}">${U().esc(c.title)}</a></h3>
        <div class="cc-instructor">
          ${U().avatarHTML(c.instructor && c.instructor.full_name, c.instructor && c.instructor.avatar_url, "cc-avatar")}
          <span>${U().esc((c.instructor && c.instructor.full_name) || "Instructor")}</span>
        </div>
        <div class="cc-meta">
          <span class="m cc-rating">${icon("star")} ${c.rating_avg ? c.rating_avg.toFixed(1) : "New"}</span>
          <span class="m">${icon("users")} ${U().fmtNum(c.students_count)}</span>
          <span class="m">${icon("clock")} ${U().fmtDuration(c.duration_minutes)}</span>
        </div>
        <div class="cc-foot">
          <span class="cc-price ${price === 0 ? "free" : ""}">
            ${price === 0 ? "Free" : U().fmtPrice(price)}
            ${price < was ? `<span class="was">${U().fmtPrice(was)}</span>` : ""}
          </span>
          <a class="btn btn-soft btn-sm" href="course-details.html?id=${c.id}">View ${icon("arrowR")}</a>
        </div>
      </div>
    </article>`;
  }

  /* wishlist heart handler (event-delegated; call once per page) */
  function bindWishlistButtons(root, onChange) {
    (root || document).addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-wish]");
      if (!btn) return;
      e.preventDefault();
      if (!api().session.token()) { toast("Log in required", "Sign in to save courses to your wishlist.", "info"); location.href = "login.html"; return; }
      const id = btn.dataset.wish;
      const active = btn.classList.contains("active");
      btn.disabled = true;
      const res = active ? await api().del("/wishlist/" + id) : await api().post("/wishlist", { course_id: id });
      btn.disabled = false;
      if (res.success) {
        btn.classList.toggle("active", !active);
        toast(active ? "Removed" : "Saved", active ? "Removed from your wishlist." : "Added to your wishlist.", "success");
        if (onChange) onChange(id, !active);
      } else {
        toast("Wishlist", res.message, "error");
      }
    });
  }

  /* =====================================================================
     PAGINATION
     ===================================================================== */
  function renderPagination(container, data, onPage) {
    const { page, pages } = data;
    if (pages <= 1) { container.innerHTML = ""; return; }
    const btn = (p, label, cls, dis) =>
      `<button class="page-btn ${cls || ""}" data-page="${p}" ${dis ? "disabled" : ""}>${label}</button>`;
    let html = btn(page - 1, "‹", "", page <= 1);
    const around = new Set([1, pages, page, page - 1, page + 1, page - 2, page + 2]);
    let last = 0;
    for (let p = 1; p <= pages; p++) {
      if (!around.has(p) || p < 1) continue;
      if (p - last > 1) html += `<span class="page-btn" style="border:none;background:none">…</span>`;
      html += btn(p, p, p === page ? "active" : "", false);
      last = p;
    }
    html += btn(page + 1, "›", "", page >= pages);
    container.innerHTML = html;
    U().$$(".page-btn[data-page]", container).forEach(b =>
      b.addEventListener("click", () => onPage(Number(b.dataset.page))));
  }

  /* =====================================================================
     SCROLL REVEALS + COUNTERS
     ===================================================================== */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("revealed"); revealObserver.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  function bindReveals(root) {
    U().$$("[data-reveal]:not(.revealed)", root).forEach(el => revealObserver.observe(el));
  }

  function animateCounters(root) {
    const counters = U().$$("[data-count]", root);
    const io = new IntersectionObserver((ents) => {
      ents.forEach(en => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const target = parseFloat(en.target.dataset.count);
        const suffix = en.target.dataset.suffix || "";
        const dur = 1400, t0 = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = target * eased;
          en.target.textContent = (target % 1 ? val.toFixed(1) : Math.round(val).toLocaleString()) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    counters.forEach(c => io.observe(c));
  }

  /* bind generic behaviours added dynamically: accordion, tabs */
  function bindAccordions(root) {
    U().$$("[data-accordion]", root).forEach(acc => {
      U().$$(".acc-head", acc).forEach(head => {
        if (head.dataset.bound) return;
        head.dataset.bound = "1";
        head.addEventListener("click", () => {
          const item = head.closest(".acc-item");
          const bodyEl = item.querySelector(".acc-body");
          const open = item.classList.toggle("open");
          bodyEl.style.maxHeight = open ? bodyEl.scrollHeight + "px" : "0px";
          if (open && acc.dataset.single) {
            U().$$(".acc-item.open", acc).forEach(o => {
              if (o !== item) { o.classList.remove("open"); o.querySelector(".acc-body").style.maxHeight = "0px"; }
            });
          }
        });
      });
    });
  }

  function bindTabs(root) {
    U().$$("[data-tabs]", root).forEach(tabs => {
      U().$$(".tab-btn", tabs).forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = "1";
        btn.addEventListener("click", () => {
          U().$$(".tab-btn", tabs).forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const scope = tabs.closest("[data-tab-scope]") || document;
          U().$$(".tab-panel", scope).forEach(p => p.classList.toggle("active", p.id === btn.dataset.tab));
        });
      });
    });
  }

  function autoBind(root) {
    bindReveals(root); animateCounters(root); bindAccordions(root); bindTabs(root);
  }

  /* =====================================================================
     RING PROGRESS + CHARTS (hand-rolled SVG — no chart library)
     ===================================================================== */
  function ring(pct, size, stroke, label) {
    pct = Math.max(0, Math.min(100, Number(pct) || 0));
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    return `
    <span class="ring" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}">
        <defs><linearGradient id="rg${size}${Math.round(pct)}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6e5bff"/><stop offset="1" stop-color="#4cd4ff"/></linearGradient></defs>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="rgba(148,163,255,.14)" stroke-width="${stroke}" fill="none"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="url(#rg${size}${Math.round(pct)})" stroke-width="${stroke}" fill="none"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" style="transition:stroke-dashoffset 1.2s var(--ease)"/>
      </svg>
      <span class="ring-label" style="font-size:${Math.max(10, size * 0.18)}px">${label != null ? label : Math.round(pct) + "%"}</span>
    </span>`;
  }

  function sparkline(values, w, h, color) {
    if (!values || !values.length) values = [0, 0, 0, 0, 0, 0];
    w = w || 96; h = h || 30;
    const max = Math.max(...values, 1), min = Math.min(...values, 0);
    const pts = values.map((v, i) => [
      (i / (values.length - 1 || 1)) * w,
      h - 3 - ((v - min) / (max - min || 1)) * (h - 6),
    ]);
    const line = pts.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ");
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="spark" aria-hidden="true">
      <polyline points="${line}" fill="none" stroke="${color || "#6e5bff"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
    </svg>`;
  }

  function lineChart(el, labels, values, opts) {
    opts = opts || {};
    const W = 640, H = 230, padX = 14, padT = 18, padB = 26;
    const max = Math.max(...values, 1);
    const innerW = W - padX * 2, innerH = H - padT - padB;
    const pts = values.map((v, i) => [
      padX + (i / (values.length - 1 || 1)) * innerW,
      padT + innerH - (v / max) * innerH,
    ]);
    const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = path + ` L${pts[pts.length - 1][0].toFixed(1)} ${H - padB} L${pts[0][0].toFixed(1)} ${H - padB} Z`;
    el.classList.add("chart-box");
    el.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="min-height:180px">
        <defs>
          <linearGradient id="lc-a" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${opts.color || "#6e5bff"}" stop-opacity=".35"/><stop offset="1" stop-color="${opts.color || "#6e5bff"}" stop-opacity="0"/></linearGradient>
          <linearGradient id="lc-l" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#6e5bff"/><stop offset="1" stop-color="#4cd4ff"/></linearGradient>
        </defs>
        ${[0.25, 0.5, 0.75].map(f => `<line x1="${padX}" x2="${W - padX}" y1="${padT + innerH * f}" y2="${padT + innerH * f}" stroke="rgba(148,163,255,.08)"/>`).join("")}
        <path d="${area}" fill="url(#lc-a)"/>
        <path d="${path}" fill="none" stroke="url(#lc-l)" stroke-width="2.5" stroke-linecap="round"/>
        ${pts.map((p, i) => `<circle class="chart-pt" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="9" fill="transparent"/><circle cx="${p[0]}" cy="${p[1]}" r="3.4" fill="#0a0e1a" stroke="${opts.color || "#6e5bff"}" stroke-width="2"/>`).join("")}
        ${labels.map((l, i) => values.length <= 8 || i % 2 === 0 ? `<text x="${pts[i][0]}" y="${H - 8}" font-size="10.5" fill="#67719a" text-anchor="middle">${U().esc(l)}</text>` : "").join("")}
      </svg>
      <div class="chart-tip" id="${el.id}-tip"></div>`;
    const tip = document.getElementById(el.id + "-tip");
    U().$$(".chart-pt", el).forEach(pt => {
      pt.addEventListener("mouseenter", () => {
        const i = Number(pt.dataset.i);
        tip.textContent = `${labels[i]} — ${U().fmtNum(values[i])}`;
        tip.style.left = pt.getAttribute("cx") / 640 * 100 + "%";
        tip.style.top = pt.getAttribute("cy") / 230 * 100 + "%";
        tip.style.opacity = 1;
      });
      pt.addEventListener("mouseleave", () => (tip.style.opacity = 0));
    });
  }

  function barChart(el, labels, values, opts) {
    opts = opts || {};
    const max = Math.max(...values, 1);
    el.innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:10px;height:200px;padding-top:8px">
        ${values.map((v, i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;justify-content:flex-end">
            <div data-tip="${U().esc(labels[i])}: ${opts.prefix || ""}${U().fmtNum(v)}" style="width:100%;max-width:44px;height:${Math.max(3, (v / max) * 100)}%;border-radius:8px 8px 4px 4px;background:var(--grad);box-shadow:0 0 18px -4px rgba(110,91,255,.5);transition:filter .2s"></div>
            <span style="font-size:.68rem;color:var(--text-3)">${U().esc(labels[i])}</span>
          </div>`).join("")}
      </div>`;
  }

  function donut(el, pct, opts) {
    el.innerHTML = ring(pct, (opts && opts.size) || 150, (opts && opts.stroke) || 13,
      `<span><b style="font-size:1.5rem">${Math.round(pct)}%</b></span>`);
  }

  /* =====================================================================
     AUTH GUARD — used by every protected page
     ===================================================================== */
  async function guard(allowedRoles, opts) {
    opts = opts || {};
    const here = location.pathname.split("/").pop() + location.search;
    if (!api().session.token()) {
      if (!opts.silent) location.href = "login.html?next=" + encodeURIComponent(here);
      return null;
    }
    const res = await api().get("/auth/me");
    if (!res.success) {
      api().session.clear();
      if (!opts.silent) location.href = "login.html?next=" + encodeURIComponent(here);
      return null;
    }
    const profile = res.data.profile;
    U().store.set("profile", profile);
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      toast("Access restricted", "This page isn't available for your role.", "error");
      setTimeout(() => (location.href = dashHref(profile)), 700);
      return null;
    }
    return profile;
  }

  /* page loader */
  function pageLoader(hide) {
    let l = document.querySelector(".page-loader");
    if (hide) { if (l) l.classList.add("hide"); return; }
    if (!l) {
      l = U().el("div", "page-loader", `<div class="loader-orb"></div>`);
      document.body.appendChild(l);
    }
  }

  /* setup banner helper */
  function setupBannerIfNeeded() {
    // purely informational; shown when the backend responds supabase_configured=false
  }

  /* keyboard-friendly magnetic buttons (subtle) */
  function bindMagnetics() {
    if (matchMedia("(hover: none)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    U().$$(".btn-primary[data-magnet]").forEach(btn => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width;
        const y = (e.clientY - r.top - r.height / 2) / r.height;
        btn.style.transform = `translate(${x * 6}px, ${y * 5 - 2}px)`;
      });
      btn.addEventListener("pointerleave", () => (btn.style.transform = ""));
    });
  }

  window.LS = window.LS || {};
  window.LS.ui = {
    icon, logoSVG, initNav, initFooter, toast, modal, confirmDialog,
    skeletonCards, skeletonRows, emptyState, errorState, courseCard,
    bindWishlistButtons, renderPagination, bindReveals, animateCounters,
    bindAccordions, bindTabs, autoBind, ring, sparkline, lineChart, barChart,
    donut, guard, dashHref, pageLoader, bindMagnetics, gradCss,
  };
})();
