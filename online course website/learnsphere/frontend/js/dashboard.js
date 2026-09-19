/* ============================================================================
   LearnSphere — dashboard.js
   Student dashboard: welcome band, KPIs, continue learning, activity feed,
   "My courses" with progress, and the profile page controller.
   ========================================================================== */
(function () {
  "use strict";
  const U = () => window.LS.utils;
  const api = () => window.LS.api;
  const ui = () => window.LS.ui;

  /* =========================================================== helpers */
  function shell(profile, opts) {
    opts = opts || {};
    const el = document.getElementById("app-root");
    el.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="index.html">${ui().logoSVG(30)}<span>Learn<b>Sphere</b></span></a>
        <span class="side-label">Learn</span>
        <a class="side-link ${opts.active === "overview" ? "active" : ""}" href="student-dashboard.html">${ui().icon("dashboard")} Overview</a>
        <a class="side-link ${opts.active === "courses" ? "active" : ""}" href="student-dashboard.html#courses" data-navlink="courses">${ui().icon("book")} My courses</a>
        <a class="side-link ${opts.active === "certificates" ? "active" : ""}" href="certificates.html">${ui().icon("cert")} Certificates</a>
        <a class="side-link ${opts.active === "wishlist" ? "active" : ""}" href="wishlist.html">${ui().icon("heart")} Wishlist</a>
        <span class="side-label">Shop</span>
        <a class="side-link" href="cart.html">${ui().icon("cart")} Cart</a>
        <a class="side-link" href="courses.html">${ui().icon("compass")} Discover courses</a>
        <span class="side-label">Account</span>
        <a class="side-link ${opts.active === "profile" ? "active" : ""}" href="profile.html">${ui().icon("user")} Profile</a>
        <div class="side-user">
          ${U().avatarHTML(profile.full_name, profile.avatar_url, "nav-avatar")}
          <span class="su-body">
            <span class="su-name">${U().esc(profile.full_name || "Student")}</span>
            <span class="su-role">${U().esc(profile.role)}</span>
          </span>
          <a href="#" id="side-logout" data-tip="Log out">${ui().icon("logout")}</a>
        </div>
      </aside>
      <div class="app-main">
        <div class="app-topbar">
          <button class="nav-ic-btn app-burger" id="app-burger" aria-label="Menu">${ui().icon("menu")}</button>
          <div>
            <div class="page-title">${opts.title || "Dashboard"}</div>
            <div class="crumb">${opts.crumb || "Student workspace"}</div>
          </div>
          <div class="nav-spacer"></div>
          <a class="btn btn-primary btn-sm" href="courses.html">${ui().icon("compass")} Explore courses</a>
        </div>
        <div class="app-content" id="app-content"></div>
      </div>
    </div>`;
    document.getElementById("side-logout").addEventListener("click", (e) => {
      e.preventDefault(); api().session.clear(); location.href = "index.html";
    });
    document.getElementById("app-burger").addEventListener("click", () =>
      document.body.classList.toggle("side-open"));
    return document.getElementById("app-content");
  }

  /* ============================================== STUDENT — OVERVIEW */
  async function initStudentDashboard() {
    const profile = await ui().guard(["student", "instructor", "admin"]);
    if (!profile) return;

    const isStudent = profile.role === "student";
    if (!isStudent) { location.href = ui().dashHref(profile); return; }

    const view = U().param("view") || (location.hash || "").replace("#", "") || "overview";
    if (view === "courses") return initMyCourses(profile);

    const content = shell(profile, { active: "overview", title: "Overview" });
    content.innerHTML = `
      <div class="skeleton" style="height:170px;border-radius:30px"></div>
      <div class="kpi-grid">${Array.from({length:4}).map(() => `<div class="skeleton" style="height:130px;border-radius:22px"></div>`).join("")}</div>
      <div class="dash-cols"><div class="skeleton" style="height:340px;border-radius:22px"></div><div class="skeleton" style="height:340px;border-radius:22px"></div></div>`;

    const [enr, certs, notifs] = await Promise.all([
      api().get("/enrollments"), api().get("/certificates"), api().get("/notifications"),
    ]);
    if (!enr.success) { content.innerHTML = ui().errorState(enr.message); return; }

    const items = enr.data.items || [];
    const inProgress = items.filter(e => !e.completed && Number(e.completion_percentage) > 0);
    const doneCourses = items.filter(e => e.completed);
    const avgPct = items.length ? Math.round(items.reduce((a, e) => a + Number(e.completion_percentage || 0), 0) / items.length) : 0;

    const continueItems = items
      .filter(e => e.course && !e.completed)
      .sort((a, b) => Number(b.completion_percentage) - Number(a.completion_percentage))
      .slice(0, 4);

    const feedItems = (notifs.success ? notifs.data.items : []).slice(0, 7);

    content.innerHTML = `
      <section class="welcome-band" data-reveal>
        <div>
          <span class="kicker"><span class="dot"></span> ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
          <h1 class="mt-1">Welcome back, ${U().esc((profile.full_name || "learner").split(" ")[0])} 👋</h1>
          <p>${inProgress.length ? `You're making great progress — ${inProgress.length} course${inProgress.length === 1 ? "" : "s"} in motion. Keep the streak alive!` : "Ready to start something new? Your next skill is one course away."}</p>
          <div class="flex mt-2 wrap">
            ${continueItems[0] ? `<a class="btn btn-primary" data-magnet href="learning.html?course=${continueItems[0].course_id}">${ui().icon("play")} Resume learning</a>` : `<a class="btn btn-primary" data-magnet href="courses.html">${ui().icon("compass")} Find a course</a>`}
            <a class="btn btn-ghost" href="certificates.html">${ui().icon("cert")} My certificates</a>
          </div>
        </div>
        <div class="wb-ring">${ui().ring(avgPct, 118, 11, `<span><b>${avgPct}%</b><span>avg progress</span></span>`)}</div>
      </section>

      <section class="kpi-grid">
        ${kpi("book", "Enrolled courses", items.length, "var(--accent-soft)", "#b9adff")}
        ${kpi("zap", "In progress", inProgress.length, "var(--sky-soft)", "#8fd8ff")}
        ${kpi("check", "Completed", doneCourses.length, "var(--mint-soft)", "#6fe8c4")}
        ${kpi("cert", "Certificates", (certs.success ? certs.data.items.length : 0), "var(--amber-soft)", "#ffce94")}
      </section>

      <div class="dash-cols">
        <section class="panel" data-reveal>
          <div class="panel-head"><h3>${ui().icon("play")} Continue learning</h3><a class="link btn-xs" href="student-dashboard.html#courses">View all</a></div>
          <div class="panel-body grid" id="continue-list">
            ${continueItems.length ? continueItems.map(continueCard).join("")
              : ui().emptyState("Nothing in motion", "Enroll in a course and it will appear here, ready to resume.", "book", `<a class="btn btn-primary btn-sm" href="courses.html">Browse courses</a>`)}
          </div>
        </section>
        <section class="panel" data-reveal>
          <div class="panel-head"><h3>${ui().icon("bell")} Recent activity</h3></div>
          <div class="panel-body">
            <div class="feed">
              ${feedItems.length ? feedItems.map(n => `
                <div class="feed-item">
                  <span class="feed-dot">${ui().icon(feedIcon(n.title))}</span>
                  <span class="feed-body"><b>${U().esc(n.title || "Update")}</b><p>${U().esc(n.message || "")}</p></span>
                  <span class="feed-time">${U().timeAgo(n.created_at)}</span>
                </div>`).join("")
              : `<p class="text-dim" style="text-align:center;padding:1.4rem 0">No activity yet — your learning timeline starts with your first course.</p>`}
            </div>
          </div>
        </section>
      </div>`;

    ui().autoBind(content);
    ui().bindMagnetics();

    const hashLink = content.closest("#app-root").querySelector('[data-navlink="courses"]');
    if (hashLink) hashLink.addEventListener("click", (e) => { e.preventDefault(); initMyCourses(profile); });
  }

  function kpi(ic, label, val, bg, fg) {
    return `
    <div class="kpi" data-reveal>
      <div class="kpi-top"><span class="kpi-ic" style="--kpi-c:${bg};--kpi-t:${fg}">${ui().icon(ic)}</span></div>
      <div class="kpi-val stat-num" data-count="${val}">0</div>
      <div class="kpi-label">${label}</div>
    </div>`;
  }

  function feedIcon(title) {
    const t = (title || "").toLowerCase();
    if (t.includes("certificate")) return "cert";
    if (t.includes("purchase") || t.includes("enroll")) return "cart";
    if (t.includes("quiz")) return "zap";
    if (t.includes("assignment")) return "note";
    if (t.includes("announce") || t.includes("📢")) return "bell";
    if (t.includes("complete")) return "trophy";
    return "spark";
  }

  function continueCard(e) {
    const c = e.course || {};
    const pct = Math.round(Number(e.completion_percentage || 0));
    return `
    <div class="continue-card">
      <a class="row-art" href="learning.html?course=${c.id}">${U().thumbHTML(c)}</a>
      <div style="min-width:0">
        <div class="flex-between wrap" style="gap:.4rem">
          <span class="cc-cat">${U().esc((c.category && c.category.name) || "Course")}</span>
          <span class="pill ${e.completed ? "pill-mint" : "pill-accent"}" style="font-size:.68rem">${e.completed ? "Completed" : pct + "%"}</span>
        </div>
        <div class="row-title">${U().esc(c.title || "Course")}</div>
        <div class="progress progress-lg" style="margin:.45rem 0 .55rem"><div class="progress-bar" style="width:${pct}%"></div></div>
        <div class="flex wrap" style="gap:.6rem">
          <a class="btn btn-primary btn-sm" href="learning.html?course=${c.id}">${ui().icon("play")} ${e.completed ? "Revisit" : pct > 0 ? "Continue" : "Start"}</a>
          <a class="link" style="font-size:.82rem" href="course-details.html?id=${c.id}">Details</a>
        </div>
      </div>
    </div>`;
  }

  /* ============================================== STUDENT — MY COURSES */
  async function initMyCourses(profileArg) {
    const profile = profileArg || await ui().guard(["student"]);
    if (!profile) return;
    const content = document.getElementById("app-content") && document.getElementById("sidebar")
      ? document.getElementById("app-content")
      : shell(profile, { active: "courses", title: "My courses" });
    history.replaceState(null, "", "student-dashboard.html#courses");
    content.innerHTML = `<div class="course-grid">${ui().skeletonCards(6)}</div>`;

    const res = await api().get("/enrollments");
    if (!res.success) { content.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];

    content.innerHTML = `
      <div class="flex-between wrap" data-reveal>
        <div>
          <h2 style="font-size:1.3rem">My courses</h2>
          <p class="text-dim">${items.length} enrollment${items.length === 1 ? "" : "s"} · ${items.filter(e => e.completed).length} completed</p>
        </div>
        <div class="seg" id="course-filter">
          <button class="active" data-f="all">All</button>
          <button data-f="progress">In progress</button>
          <button data-f="done">Completed</button>
        </div>
      </div>
      <div class="course-grid" id="mc-grid"></div>`;

    const render = (f) => {
      const filtered = items.filter(e =>
        f === "all" ? true : f === "done" ? e.completed : !e.completed);
      document.getElementById("mc-grid").innerHTML = filtered.length
        ? filtered.map(e => {
            const c = e.course || { title: "Course", id: e.course_id };
            const pct = Math.round(Number(e.completion_percentage || 0));
            return `
            <article class="course-card" data-reveal>
              <a class="cc-thumb" href="learning.html?course=${c.id}">
                ${U().thumbHTML(c)}
                <span class="cc-badges">${e.completed ? `<span class="pill pill-mint">${ui().icon("check")} Completed</span>` : ""}</span>
              </a>
              <div class="cc-body">
                <span class="cc-cat">${U().esc((c.category && c.category.name) || "Course")}</span>
                <h3 class="cc-title"><a href="learning.html?course=${c.id}">${U().esc(c.title)}</a></h3>
                <div class="cc-progress">
                  <div class="flex-between" style="font-size:.74rem;color:var(--text-3);margin-bottom:.3rem">
                    <span>Progress</span><b style="color:var(--text-1)">${pct}%</b>
                  </div>
                  <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
                </div>
                <div class="cc-foot">
                  <span class="text-dim" style="font-size:.76rem">Enrolled ${U().fmtDate(e.enrolled_at)}</span>
                  <a class="btn ${e.completed ? "btn-soft" : "btn-primary"} btn-sm" href="learning.html?course=${c.id}">${e.completed ? "Review" : "Continue"} ${ui().icon("arrowR")}</a>
                </div>
              </div>
            </article>`;
          }).join("")
        : ui().emptyState("No courses here", "Courses you enroll in will appear here with live progress tracking.", "book", `<a class="btn btn-primary btn-sm" href="courses.html">Discover courses</a>`);
      ui().bindReveals(document.getElementById("mc-grid"));
    };
    render("all");
    U().$$("#course-filter button", content).forEach(b => b.addEventListener("click", () => {
      U().$$("#course-filter button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      render(b.dataset.f);
    }));
    ui().bindReveals(content);
  }

  /* ==================================================== PROFILE PAGE */
  function initProfile() {
    return (async () => {
      const profile = await ui().guard(null);
      if (!profile) return;
      const content = document.getElementById("profile-root");

      content.innerHTML = `
      <div class="dash-cols" style="grid-template-columns:360px 1fr">
        <div class="card" data-reveal style="text-align:center;padding:2rem 1.4rem">
          <div class="avatar-edit" style="margin-inline:auto">
            <span class="av" id="pf-avatar" style="background:${ui().gradCss(profile.full_name)}">
              ${profile.avatar_url ? `<img src="${U().esc(profile.avatar_url)}">` : U().initials(profile.full_name)}
            </span>
            <label for="pf-upload" data-tip="Change photo">${ui().icon("upload")}</label>
            <input type="file" id="pf-upload" accept="image/*" class="hidden">
          </div>
          <h2 class="mt-2" style="font-size:1.3rem">${U().esc(profile.full_name || "")}</h2>
          <p class="pill pill-accent mt-1" style="text-transform:capitalize">${U().esc(profile.role)}${profile.role === "instructor" ? (profile.is_approved ? " · approved" : " · pending") : ""}</p>
          <p class="text-dim mt-1" style="font-size:.82rem">${U().esc(profile.email || "")}</p>
          <p class="text-dim" style="font-size:.76rem">Member since ${U().fmtDate(profile.created_at)}</p>
        </div>

        <div class="grid">
          <div class="panel" data-reveal>
            <div class="panel-head"><h3>${ui().icon("user")} Profile details</h3></div>
            <div class="panel-body">
              <form id="pf-form">
                <div class="grid" style="grid-template-columns:1fr 1fr;gap:1rem">
                  <div class="field"><label class="label">Full name</label><input class="input" name="full_name" value="${U().esc(profile.full_name || "")}" required></div>
                  <div class="field"><label class="label">Phone</label><input class="input" name="phone" value="${U().esc(profile.phone || "")}" placeholder="+91 …"></div>
                </div>
                <div class="field"><label class="label">Bio</label><textarea class="textarea" name="bio" placeholder="Tell learners a bit about yourself…">${U().esc(profile.bio || "")}</textarea></div>
                <button class="btn btn-primary">${ui().icon("check")} Save changes</button>
              </form>
            </div>
          </div>

          <div class="panel" data-reveal>
            <div class="panel-head"><h3>${ui().icon("lock")} Security</h3></div>
            <div class="panel-body">
              <form id="pw-form" class="grid" style="grid-template-columns:1fr 1fr;gap:1rem;align-items:end">
                <div class="field"><label class="label">New password</label><input class="input" type="password" name="password" minlength="6" required placeholder="At least 6 characters"></div>
                <div class="field"><button class="btn btn-soft">${ui().icon("shield")} Update password</button></div>
              </form>
              <p class="hint">Signed in via Supabase Auth · your session stays active on this device until you log out.</p>
            </div>
          </div>
        </div>
      </div>`;

      // avatar upload
      document.getElementById("pf-upload").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        ui().toast("Uploading…", file.name, "info", 2000);
        const up = await api().upload(file, "avatars");
        if (!up.success) { ui().toast("Upload failed", up.message, "error"); return; }
        const res = await api().put("/auth/profile", { avatar_url: up.data.url });
        if (res.success) {
          document.getElementById("pf-avatar").innerHTML = `<img src="${U().esc(up.data.url)}">`;
          U().store.set("profile", res.data.profile);
          ui().toast("Photo updated 📸", "", "success");
        } else ui().toast("Save failed", res.message, "error");
      });

      // profile form
      document.getElementById("pf-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target;
        const res = await api().put("/auth/profile", {
          full_name: f.full_name.value.trim(),
          phone: f.phone.value.trim(),
          bio: f.bio.value.trim(),
        });
        if (res.success) {
          U().store.set("profile", res.data.profile);
          ui().toast("Profile saved ✅", "", "success");
        } else ui().toast("Save failed", res.message, "error");
      });

      // password form
      document.getElementById("pw-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const password = e.target.password.value;
        if (password.length < 6) { ui().toast("Too short", "Password needs at least 6 characters.", "error"); return; }
        const res = await api().put("/auth/password", { password });
        ui().toast(res.success ? "Password updated 🔒" : "Failed", res.success ? "" : res.message, res.success ? "success" : "error");
        if (res.success) e.target.reset();
      });

      ui().bindReveals(content);
    })();
  }

  window.LS = window.LS || {};
  window.LS.pages = window.LS.pages || {};
  Object.assign(window.LS.pages, { initStudentDashboard, initMyCourses, initProfile });
  // expose shell for instructor/admin modules
  window.LS.dash = { shell, kpi };
})();
