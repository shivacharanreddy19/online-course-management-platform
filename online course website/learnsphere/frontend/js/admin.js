/* ============================================================================
   LearnSphere — admin.js
   Admin control room: platform KPIs + charts, user & instructor management,
   course moderation (approve / reject), categories, reviews, orders,
   certificates, announcements.
   ========================================================================== */
(function () {
  "use strict";
  const U = () => window.LS.utils;
  const api = () => window.LS.api;
  const ui = () => window.LS.ui;

  let me = null;
  let badgeState = null;

  function shell(active, title, crumb, badge) {
    if (badge === undefined) badge = badgeState;
    const el = document.getElementById("app-root");
    el.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="index.html">${ui().logoSVG(30)}<span>Learn<b>Sphere</b></span></a>
        <span class="side-label">Control room</span>
        <a class="side-link ${active === "overview" ? "active" : ""}" data-view="overview">${ui().icon("dashboard")} Overview</a>
        <a class="side-link ${active === "courses" ? "active" : ""}" data-view="courses">${ui().icon("book")} Courses${badge && badge.pending_courses ? `<span class="side-badge">${badge.pending_courses}</span>` : ""}</a>
        <a class="side-link ${active === "instructors" ? "active" : ""}" data-view="instructors">${ui().icon("grad")} Instructors${badge && badge.pending_instructors ? `<span class="side-badge">${badge.pending_instructors}</span>` : ""}</a>
        <a class="side-link ${active === "users" ? "active" : ""}" data-view="users">${ui().icon("users")} Users</a>
        <a class="side-link ${active === "categories" ? "active" : ""}" data-view="categories">${ui().icon("layers")} Categories</a>
        <span class="side-label">Operations</span>
        <a class="side-link ${active === "reviews" ? "active" : ""}" data-view="reviews">${ui().icon("star")} Reviews</a>
        <a class="side-link ${active === "orders" ? "active" : ""}" data-view="orders">${ui().icon("wallet")} Orders</a>
        <a class="side-link ${active === "certificates" ? "active" : ""}" data-view="certificates">${ui().icon("cert")} Certificates</a>
        <a class="side-link ${active === "announcements" ? "active" : ""}" data-view="announcements">${ui().icon("bell")} Announcements</a>
        <span class="side-label">Site</span>
        <a class="side-link" href="index.html">${ui().icon("home")} View site</a>
        <a class="side-link" href="profile.html">${ui().icon("user")} Profile</a>
        <div class="side-user">
          ${U().avatarHTML(me.full_name, me.avatar_url, "nav-avatar")}
          <span class="su-body"><span class="su-name">${U().esc(me.full_name || "Admin")}</span><span class="su-role">Administrator</span></span>
          <a href="#" id="side-logout" data-tip="Log out">${ui().icon("logout")}</a>
        </div>
      </aside>
      <div class="app-main">
        <div class="app-topbar">
          <button class="nav-ic-btn app-burger" id="app-burger" aria-label="Menu">${ui().icon("menu")}</button>
          <div><div class="page-title">${title}</div><div class="crumb">${crumb || "Platform administration"}</div></div>
          <div class="nav-spacer"></div>
          <span class="pill pill-rose">${ui().icon("shield")} Admin</span>
        </div>
        <div class="app-content" id="app-content"></div>
      </div>
    </div>`;
    document.getElementById("side-logout").addEventListener("click", (e) => { e.preventDefault(); api().session.clear(); location.href = "index.html"; });
    document.getElementById("app-burger").addEventListener("click", () => document.body.classList.toggle("side-open"));
    U().$$("[data-view]", el).forEach(l => l.addEventListener("click", () => go(l.dataset.view)));
    document.body.classList.remove("side-open");
    return document.getElementById("app-content");
  }

  function go(view) {
    ({
      overview: renderOverview, courses: renderCourses, instructors: renderInstructors,
      users: renderUsers, categories: renderCategories, reviews: renderReviews,
      orders: renderOrders, certificates: renderCertificates, announcements: renderAnnouncements,
    })[view]();
  }

  function lastMonths(n) {
    const out = [];
    const d = new Date(); d.setDate(1);
    for (let i = n - 1; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push({ key: m.toISOString().slice(0, 7), label: m.toLocaleDateString("en-US", { month: "short" }) });
    }
    return out;
  }

  /* ------------------------------------------------------------ overview */
  async function renderOverview() {
    const content = shell("overview", "Overview");
    content.innerHTML = `<div class="kpi-grid">${Array.from({ length: 8 }).map(() => `<div class="skeleton" style="height:110px;border-radius:22px"></div>`).join("")}</div><div class="dash-cols"><div class="skeleton" style="height:300px;border-radius:22px"></div><div class="skeleton" style="height:300px;border-radius:22px"></div></div>`;
    const res = await api().get("/admin/statistics");
    if (!res.success) { content.innerHTML = ui().errorState(res.message); return; }
    const s = res.data;
    const months = lastMonths(6);

    const kpiRow = [
      ["users", "Total users", s.total_users, "var(--accent-soft)", "#b9adff"],
      ["user", "Students", s.students, "var(--sky-soft)", "#8fd8ff"],
      ["grad", "Instructors", s.instructors, "var(--mint-soft)", "#6fe8c4"],
      ["book", "Courses", s.total_courses, "var(--amber-soft)", "#ffce94"],
      ["play", "Published", s.published_courses, "var(--mint-soft)", "#6fe8c4"],
      ["zap", "Enrollments", s.total_enrollments, "var(--accent-soft)", "#b9adff"],
      ["wallet", "Revenue", "$" + U().fmtNum(s.revenue), "var(--mint-soft)", "#6fe8c4"],
      ["cert", "Certificates", s.certificates_issued, "var(--sky-soft)", "#8fd8ff"],
    ];

    content.innerHTML = `
      <div class="kpi-grid">
        ${kpiRow.map(([ic, label, val, bg, fg], i) => `
          <div class="kpi" data-reveal style="--reveal-delay:${i * 0.04}s">
            <div class="kpi-top"><span class="kpi-ic" style="--kpi-c:${bg};--kpi-t:${fg}">${ui().icon(ic)}</span></div>
            <div class="kpi-val">${typeof val === "number" ? `<span class="stat-num" data-count="${val}">0</span>` : val}</div>
            <div class="kpi-label">${label}</div>
          </div>`).join("")}
      </div>

      <div class="dash-cols">
        <section class="panel" data-reveal>
          <div class="panel-head"><h3>${ui().icon("chart")} User growth</h3><span class="text-dim" style="font-size:.78rem">new signups · 6 months</span></div>
          <div class="panel-body"><div id="chart-users"></div></div>
        </section>
        <section class="panel" data-reveal>
          <div class="panel-head"><h3>${ui().icon("wallet")} Revenue</h3><span class="text-dim" style="font-size:.78rem">6 months</span></div>
          <div class="panel-body"><div id="chart-rev"></div></div>
        </section>
      </div>

      <div class="dash-cols-even">
        <section class="panel" data-reveal>
          <div class="panel-head"><h3>${ui().icon("trophy")} Top courses</h3><span class="text-dim">by enrollments</span></div>
          <div class="panel-body grid" style="gap:.6rem">
            ${s.top_courses.length ? s.top_courses.map((c, i) => `
              <div class="flex" style="justify-content:space-between;gap:.8rem">
                <span class="flex" style="min-width:0"><b style="color:var(--accent-ink);font-family:var(--font-display);width:22px">${i + 1}</b><span class="text-muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U().esc(c.title)}</span></span>
                <span class="pill pill-accent">${U().fmtNum(c.students_count)} students</span>
              </div>`).join("") : `<p class="text-dim" style="text-align:center">No enrollments yet.</p>`}
          </div>
        </section>
        <section class="panel" data-reveal>
          <div class="panel-head"><h3>${ui().icon("bell")} Needs attention</h3></div>
          <div class="panel-body grid" style="gap:.7rem">
            <button class="row-item" data-goto="courses" style="width:100%;text-align:left">
              <span class="row-art" style="display:grid;place-items:center;background:var(--amber-soft);color:#ffce94">${ui().icon("clock")}</span>
              <span class="row-body"><span class="row-title">${s.pending_courses} course${s.pending_courses === 1 ? "" : "s"} awaiting review</span><span class="row-sub">Approve or reject submissions</span></span>
              ${ui().icon("chevR")}
            </button>
            <button class="row-item" data-goto="instructors" style="width:100%;text-align:left">
              <span class="row-art" style="display:grid;place-items:center;background:var(--accent-soft);color:#b9adff">${ui().icon("grad")}</span>
              <span class="row-body"><span class="row-title">${s.pending_instructors} instructor application${s.pending_instructors === 1 ? "" : "s"}</span><span class="row-sub">Review teaching requests</span></span>
              ${ui().icon("chevR")}
            </button>
            <div class="row-item">
              <span class="row-art" style="display:grid;place-items:center;background:var(--mint-soft);color:#6fe8c4">${ui().icon("check")}</span>
              <span class="row-body"><span class="row-title">${s.completion_rate}% completion rate</span><span class="row-sub">${s.total_reviews} reviews across the platform</span></span>
            </div>
          </div>
        </section>
      </div>`;

    ui().autoBind(content);
    ui().lineChart(document.getElementById("chart-users"), months.map(m => m.label), months.map(m => s.users_by_month[m.key] || 0));
    ui().barChart(document.getElementById("chart-rev"), months.map(m => m.label), months.map(m => s.revenue_by_month[m.key] || 0), { prefix: "$" });
    content.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => go(b.dataset.goto)));
  }

  /* ------------------------------------------------------------ courses moderation */
  async function renderCourses(params) {
    params = params || { page: 1, status: "", q: "" };
    const content = shell("courses", "Courses");
    content.innerHTML = `
      <div class="panel" data-reveal>
        <div class="panel-head">
          <div class="toolbar w-full">
            <div class="input-group">${ui().icon("search", "icon")}<input class="input" id="cq" placeholder="Search courses…" value="${U().esc(params.q)}"></div>
            <div class="seg" id="cstatus">
              ${[["", "All"], ["pending", "Pending"], ["published", "Published"], ["draft", "Draft"], ["rejected", "Rejected"]].map(([v, l]) => `<button data-v="${v}" class="${params.status === v ? "active" : ""}">${l}</button>`).join("")}
            </div>
          </div>
        </div>
        <div id="clist">${ui().skeletonRows(5)}</div>
      </div>`;
    ui().bindReveals(content);

    const load = async () => {
      const box = document.getElementById("clist");
      box.innerHTML = ui().skeletonRows(5);
      const p = new URLSearchParams({ page: params.page, per_page: 8 });
      if (params.status) p.set("status", params.status);
      if (params.q) p.set("q", params.q);
      const res = await api().get("/admin/courses?" + p);
      if (!res.success) { box.innerHTML = ui().errorState(res.message); return; }
      const items = res.data.items || [];
      box.innerHTML = items.length ? `
        <div class="table-wrap" style="border:none;border-radius:0">
          <table class="table">
            <thead><tr><th>Course</th><th>Instructor</th><th>Price</th><th>Students</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
              ${items.map(c => `
                <tr>
                  <td><span class="cell-main"><span class="row-art" style="width:48px;height:36px;border-radius:8px">${U().thumbHTML(c)}</span><span style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${U().esc(c.title)}</b><br><small class="text-dim">${U().esc((c.category && c.category.name) || "—")}</small></span></span></td>
                  <td>${U().esc((c.instructor && c.instructor.full_name) || "—")}</td>
                  <td>${Number(c.price) ? U().fmtPrice(U().effectivePrice(c)) : "Free"}</td>
                  <td>${U().fmtNum(c.students_count)}</td>
                  <td>${U().statusPill(c.status)}</td>
                  <td style="text-align:right;white-space:nowrap">
                    <a class="btn btn-ghost btn-icon btn-sm" href="course-details.html?id=${c.id}" data-tip="View">${ui().icon("eye")}</a>
                    ${c.status !== "published" ? `<button class="btn btn-mint btn-sm" data-approve="${c.id}">${ui().icon("check")} Approve</button>` : ""}
                    ${c.status !== "rejected" ? `<button class="btn btn-danger btn-sm" data-reject="${c.id}">${ui().icon("x")} Reject</button>` : ""}
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="panel-foot"><div class="pagination" style="margin:0" id="cpages"></div></div>`
        : ui().emptyState("No courses", "Try another filter.", "book");

      ui().renderPagination(document.getElementById("cpages"), res.data, (p) => { params.page = p; load(); });

      box.querySelectorAll("[data-approve]").forEach(b => b.addEventListener("click", async () => {
        const res2 = await api().put(`/admin/courses/${b.dataset.approve}/approve`);
        ui().toast(res2.success ? "Published 🎉" : "Error", res2.success ? "The course is now live." : res2.message, res2.success ? "success" : "error");
        load();
      }));
      box.querySelectorAll("[data-reject]").forEach(b => b.addEventListener("click", () => {
        const m = ui().modal({
          title: "Reject course",
          body: `<div class="field"><label class="label">Reason (sent to instructor)</label><textarea class="textarea" id="rej-reason" placeholder="e.g. Video quality is too low, please re-record sections 2–3."></textarea></div>`,
          foot: `<button class="btn btn-ghost" id="x">Cancel</button><button class="btn btn-danger" id="ok">Reject course</button>`,
        });
        m.el.querySelector("#x").addEventListener("click", m.close);
        m.el.querySelector("#ok").addEventListener("click", async () => {
          const res2 = await api().put(`/admin/courses/${b.dataset.reject}/reject`, { reason: m.el.querySelector("#rej-reason").value.trim() });
          ui().toast(res2.success ? "Rejected" : "Error", "", res2.success ? "info" : "error");
          m.close(); load();
        });
      }));
    };
    load();

    document.getElementById("cstatus").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      params.status = b.dataset.v; params.page = 1;
      U().$$("#cstatus button").forEach(x => x.classList.toggle("active", x === b));
      load();
    });
    document.getElementById("cq").addEventListener("input", U().debounce((e) => {
      params.q = e.target.value.trim(); params.page = 1; load();
    }, 400));
  }

  /* ------------------------------------------------------------ instructors */
  async function renderInstructors() {
    const content = shell("instructors", "Instructors");
    content.innerHTML = `<div class="grid">${ui().skeletonRows(4)}</div>`;
    const res = await api().get("/admin/instructors");
    if (!res.success) { content.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];
    const pending = items.filter(i => !i.is_approved);

    content.innerHTML = `
      ${pending.length ? `
      <div class="panel" data-reveal>
        <div class="panel-head"><h3>${ui().icon("clock")} Pending applications</h3><span class="pill pill-amber">${pending.length}</span></div>
        <div class="panel-body grid">
          ${pending.map(i => `
            <div class="row-item">
              ${U().avatarHTML(i.full_name, i.avatar_url, "cell-avatar")}
              <span class="row-body"><span class="row-title">${U().esc(i.full_name || "")}</span><span class="row-sub">${U().esc(i.email || "")} · joined ${U().fmtDate(i.created_at)}</span></span>
              <button class="btn btn-primary btn-sm" data-approve-inst="${i.id}">${ui().icon("check")} Approve</button>
            </div>`).join("")}
        </div>
      </div>` : ""}
      <div class="panel" data-reveal>
        <div class="panel-head"><h3>${ui().icon("grad")} All instructors</h3><span class="text-dim">${items.length} total</span></div>
        ${items.length ? `<div class="table-wrap" style="border:none;border-radius:0">
          <table class="table">
            <thead><tr><th>Instructor</th><th>Email</th><th>Status</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td><span class="cell-main">${U().avatarHTML(i.full_name, i.avatar_url, "cell-avatar")}<b>${U().esc(i.full_name || "")}</b></span></td>
                  <td class="text-dim">${U().esc(i.email || "")}</td>
                  <td>${i.is_approved ? `<span class="pill pill-mint">Approved</span>` : `<span class="pill pill-amber">Pending</span>`}</td>
                  <td class="text-dim">${U().fmtDate(i.created_at)}</td>
                  <td style="text-align:right">${i.is_approved ? `<button class="btn btn-ghost btn-sm" data-revoke="${i.id}">Revoke</button>` : `<button class="btn btn-primary btn-sm" data-approve-inst="${i.id}">Approve</button>`}</td>
                </tr>`).join("")}
            </tbody>
          </table></div>` : `<div class="panel-body">${ui().emptyState("No instructors", "Instructor registrations appear here.", "grad")}</div>`}
      </div>`;
    ui().bindReveals(content);

    content.querySelectorAll("[data-approve-inst]").forEach(b => b.addEventListener("click", async () => {
      const res2 = await api().put(`/admin/instructors/${b.dataset.approveInst}/approve`);
      ui().toast(res2.success ? "Approved ✅" : "Error", res2.message || "", res2.success ? "success" : "error");
      renderInstructors();
    }));
    content.querySelectorAll("[data-revoke]").forEach(b => b.addEventListener("click", async () => {
      const yes = await ui().confirmDialog("Revoke instructor?", "They will no longer be able to create or edit courses until re-approved.", "Revoke", true);
      if (!yes) return;
      const res2 = await api().put(`/admin/users/${b.dataset.revoke}`, { is_approved: false });
      if (res2.success) renderInstructors(); else ui().toast("Error", res2.message, "error");
    }));
  }

  /* ------------------------------------------------------------ users */
  async function renderUsers(params) {
    params = params || { page: 1, role: "", q: "" };
    const content = shell("users", "Users");
    content.innerHTML = `
      <div class="panel" data-reveal>
        <div class="panel-head">
          <div class="toolbar w-full">
            <div class="input-group">${ui().icon("search", "icon")}<input class="input" id="uq" placeholder="Search name or email…" value="${U().esc(params.q)}"></div>
            <select class="select" id="urole" style="width:auto">
              <option value="">All roles</option>
              ${["student", "instructor", "admin"].map(r => `<option ${params.role === r ? "selected" : ""}>${r}</option>`).join("")}
            </select>
          </div>
        </div>
        <div id="ulist">${ui().skeletonRows(6)}</div>
      </div>`;
    ui().bindReveals(content);

    const load = async () => {
      const box = document.getElementById("ulist");
      box.innerHTML = ui().skeletonRows(6);
      const p = new URLSearchParams({ page: params.page, per_page: 10 });
      if (params.role) p.set("role", params.role);
      if (params.q) p.set("q", params.q);
      const res = await api().get("/admin/users?" + p);
      if (!res.success) { box.innerHTML = ui().errorState(res.message); return; }
      const items = res.data.items || [];
      box.innerHTML = items.length ? `
        <div class="table-wrap" style="border:none;border-radius:0">
          <table class="table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
              ${items.map(u => `
                <tr>
                  <td><span class="cell-main">${U().avatarHTML(u.full_name, u.avatar_url, "cell-avatar")}<span><b>${U().esc(u.full_name || "—")}</b><br><small class="text-dim">${U().esc(u.email || "")}</small></span></span></td>
                  <td><span class="pill ${u.role === "admin" ? "pill-rose" : u.role === "instructor" ? "pill-accent" : "pill-sky"}" style="text-transform:capitalize">${u.role}</span></td>
                  <td>${u.role === "instructor" ? (u.is_approved ? `<span class="pill pill-mint">Approved</span>` : `<span class="pill pill-amber">Pending</span>`) : `<span class="pill pill-mint">Active</span>`}</td>
                  <td class="text-dim">${U().fmtDate(u.created_at)}</td>
                  <td style="text-align:right;white-space:nowrap">
                    ${u.id !== me.id ? `
                    <button class="btn btn-ghost btn-sm" data-role-edit="${u.id}" data-role="${u.role}">${ui().icon("shield")} Role</button>
                    <button class="btn btn-danger btn-icon btn-sm" data-del-user="${u.id}">${ui().icon("trash")}</button>` : `<span class="pill pill-accent">You</span>`}
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="panel-foot"><div class="pagination" style="margin:0" id="upages"></div></div>`
        : ui().emptyState("No users", "Adjust your search.", "users");
      ui().renderPagination(document.getElementById("upages"), res.data, (p) => { params.page = p; load(); });

      box.querySelectorAll("[data-role-edit]").forEach(b => b.addEventListener("click", async () => {
        const u = items.find(x => x.id === b.dataset.roleEdit);
        const m = ui().modal({
          title: "Change role",
          body: `
            <p class="text-muted mb-2">${U().esc(u.full_name || u.email)}</p>
            <div class="field"><label class="label">Role</label>
              <select class="select" id="role-sel">
                ${["student", "instructor", "admin"].map(r => `<option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>`).join("")}
              </select></div>`,
          foot: `<button class="btn btn-ghost" id="x">Cancel</button><button class="btn btn-primary" id="ok">Save role</button>`,
        });
        m.el.querySelector("#x").addEventListener("click", m.close);
        m.el.querySelector("#ok").addEventListener("click", async () => {
          const role = m.el.querySelector("#role-sel").value;
          const res2 = await api().put(`/admin/users/${u.id}`, { role, is_approved: role !== "instructor" ? true : u.is_approved });
          ui().toast(res2.success ? "Role updated" : "Error", res2.message || "", res2.success ? "success" : "error");
          m.close(); load();
        });
      }));
      box.querySelectorAll("[data-del-user]").forEach(b => b.addEventListener("click", async () => {
        const u = items.find(x => x.id === b.dataset.delUser);
        const yes = await ui().confirmDialog("Delete user?", `“${u.full_name || u.email}” and all their data will be removed. This cannot be undone.`, "Delete user", true);
        if (!yes) return;
        const res2 = await api().del("/admin/users/" + u.id);
        ui().toast(res2.success ? "Deleted" : "Error", res2.message || "", res2.success ? "success" : "error");
        load();
      }));
    };
    load();

    document.getElementById("urole").addEventListener("change", (e) => { params.role = e.target.value; params.page = 1; load(); });
    document.getElementById("uq").addEventListener("input", U().debounce((e) => { params.q = e.target.value.trim(); params.page = 1; load(); }, 400));
  }

  /* ------------------------------------------------------------ categories */
  async function renderCategories() {
    const content = shell("categories", "Categories");
    content.innerHTML = `<div class="grid">${ui().skeletonRows(5)}</div>`;
    const res = await api().get("/admin/categories");
    if (!res.success) { content.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];

    content.innerHTML = `
      <div class="flex-between wrap" data-reveal>
        <div><h2 style="font-size:1.3rem">Categories</h2><p class="text-dim">${items.length} total</p></div>
        <button class="btn btn-primary" id="cat-new">${ui().icon("plus")} New category</button>
      </div>
      <div class="cat-grid" id="cat-list">
        ${items.map((c, i) => `
          <div class="cat-card" data-reveal style="--reveal-delay:${i * 0.04}s">
            <span class="cat-icon">${ui().icon("layers")}</span>
            <span><h3>${U().esc(c.name)}</h3><p>${U().esc(c.description || "")}</p></span>
            <span class="flex mt-1" style="gap:.4rem">
              <button class="btn btn-ghost btn-xs" data-cat-edit="${c.id}">${ui().icon("edit")} Edit</button>
              <button class="btn btn-danger btn-xs" data-cat-del="${c.id}">${ui().icon("trash")} Delete</button>
            </span>
          </div>`).join("")}
      </div>`;
    ui().bindReveals(content);

    const form = (existing) => {
      const m = ui().modal({
        title: existing ? "Edit category" : "New category",
        body: `<div class="field"><label class="label">Name <b>*</b></label><input class="input" id="cat-name" value="${U().esc((existing && existing.name) || "")}"></div>
               <div class="field"><label class="label">Description</label><textarea class="textarea" id="cat-desc" style="min-height:70px">${U().esc((existing && existing.description) || "")}</textarea></div>`,
        foot: `<button class="btn btn-ghost" id="x">Cancel</button><button class="btn btn-primary" id="ok">${existing ? "Save" : "Create"}</button>`,
      });
      m.el.querySelector("#x").addEventListener("click", m.close);
      m.el.querySelector("#ok").addEventListener("click", async () => {
        const name = m.el.querySelector("#cat-name").value.trim();
        if (name.length < 2) { ui().toast("Name needed", "", "error"); return; }
        const payload = { name, description: m.el.querySelector("#cat-desc").value.trim() };
        const res2 = existing ? await api().put("/admin/categories/" + existing.id, payload) : await api().post("/admin/categories", payload);
        ui().toast(res2.success ? "Saved ✅" : "Error", res2.success ? "" : res2.message, res2.success ? "success" : "error");
        if (res2.success) { m.close(); renderCategories(); }
      });
    };

    content.querySelector("#cat-new").addEventListener("click", () => form());
    content.querySelectorAll("[data-cat-edit]").forEach(b => b.addEventListener("click", () => form(items.find(c => c.id === b.dataset.catEdit))));
    content.querySelectorAll("[data-cat-del]").forEach(b => b.addEventListener("click", async () => {
      const c = items.find(x => x.id === b.dataset.catDel);
      const yes = await ui().confirmDialog("Delete category?", `“${c.name}” will be removed (only possible when unused).`, "Delete", true);
      if (!yes) return;
      const res2 = await api().del("/admin/categories/" + c.id);
      ui().toast(res2.success ? "Deleted" : "Cannot delete", res2.success ? "" : res2.message, res2.success ? "success" : "error");
      if (res2.success) renderCategories();
    }));
  }

  /* ------------------------------------------------------------ reviews */
  async function renderReviews(params) {
    params = params || { page: 1 };
    const content = shell("reviews", "Reviews");
    const box = content;
    box.innerHTML = `<div class="grid">${ui().skeletonRows(5)}</div>`;
    const res = await api().get(`/admin/reviews?page=${params.page}&per_page=10`);
    if (!res.success) { box.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];
    box.innerHTML = items.length ? `
      <div class="panel" data-reveal>
        <div class="panel-head"><h3>${ui().icon("star")} All reviews</h3><span class="text-dim">${res.data.total} total</span></div>
        <div class="table-wrap" style="border:none;border-radius:0">
          <table class="table">
            <thead><tr><th>Student</th><th>Course</th><th>Rating</th><th>Review</th><th></th></tr></thead>
            <tbody>
              ${items.map(r => `
                <tr>
                  <td>${U().esc((r.student && r.student.full_name) || "—")}</td>
                  <td>${U().esc((r.course && r.course.title) || "—")}</td>
                  <td><span class="cc-rating">${ui().icon("star")} ${r.rating}</span></td>
                  <td class="text-dim" style="max-width:320px">${U().esc(r.review_text || "—")}</td>
                  <td><button class="btn btn-danger btn-icon btn-sm" data-del-rev="${r.id}">${ui().icon("trash")}</button></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="panel-foot"><div class="pagination" style="margin:0" id="rpages"></div></div>
      </div>` : ui().emptyState("No reviews", "Reviews appear here once students publish them.", "star");
    ui().bindReveals(box);
    ui().renderPagination(document.getElementById("rpages"), res.data, (p) => renderReviews({ page: p }));
    box.querySelectorAll("[data-del-rev]").forEach(b => b.addEventListener("click", async () => {
      const yes = await ui().confirmDialog("Remove review?", "It will be permanently deleted.", "Remove", true);
      if (!yes) return;
      const res2 = await api().del("/admin/reviews/" + b.dataset.delRev);
      if (res2.success) renderReviews(params); else ui().toast("Error", res2.message, "error");
    }));
  }

  /* ------------------------------------------------------------ orders / certificates */
  async function renderOrders(params) {
    params = params || { page: 1 };
    const content = shell("orders", "Orders");
    content.innerHTML = `<div class="grid">${ui().skeletonRows(5)}</div>`;
    const res = await api().get(`/admin/orders?page=${params.page}&per_page=10`);
    if (!res.success) { content.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];
    content.innerHTML = items.length ? `
      <div class="panel" data-reveal>
        <div class="panel-head"><h3>${ui().icon("wallet")} Orders</h3><span class="text-dim">${res.data.total} total</span></div>
        <div class="table-wrap" style="border:none;border-radius:0">
          <table class="table">
            <thead><tr><th>Order</th><th>Student</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              ${items.map(o => `
                <tr>
                  <td><span class="mono" style="font-size:.8rem">${U().esc((o.transaction_id || o.id).slice(0, 18))}</span><br><small class="text-dim">${U().esc(o.payment_method || "")}</small></td>
                  <td><span class="cell-main">${U().avatarHTML(o.student && o.student.full_name, null, "cell-avatar")}<span><b>${U().esc((o.student && o.student.full_name) || "—")}</b><br><small class="text-dim">${U().esc((o.student && o.student.email) || "")}</small></span></span></td>
                  <td>${o.item_count}</td>
                  <td><b>${U().fmtPrice(o.total_amount)}</b></td>
                  <td>${U().statusPill(o.payment_status)}</td>
                  <td class="text-dim">${U().fmtDateTime(o.created_at)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="panel-foot"><div class="pagination" style="margin:0" id="opages"></div></div>
      </div>` : ui().emptyState("No orders yet", "Purchases will show up here.", "wallet");
    ui().bindReveals(content);
    ui().renderPagination(document.getElementById("opages"), res.data, (p) => renderOrders({ page: p }));
  }

  async function renderCertificates(params) {
    params = params || { page: 1 };
    const content = shell("certificates", "Certificates");
    content.innerHTML = `<div class="grid">${ui().skeletonRows(5)}</div>`;
    const res = await api().get(`/admin/certificates?page=${params.page}&per_page=10`);
    if (!res.success) { content.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];
    content.innerHTML = items.length ? `
      <div class="panel" data-reveal>
        <div class="panel-head"><h3>${ui().icon("cert")} Certificates issued</h3><span class="text-dim">${res.data.total} total</span></div>
        <div class="table-wrap" style="border:none;border-radius:0">
          <table class="table">
            <thead><tr><th>Number</th><th>Student</th><th>Course</th><th>Issued</th></tr></thead>
            <tbody>
              ${items.map(c => `
                <tr>
                  <td><span class="pill pill-accent mono" style="font-size:.72rem">${U().esc(c.certificate_number)}</span></td>
                  <td>${U().esc((c.student && c.student.full_name) || "—")}</td>
                  <td>${U().esc((c.course && c.course.title) || "—")}</td>
                  <td class="text-dim">${U().fmtDate(c.issued_at)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="panel-foot"><div class="pagination" style="margin:0" id="certpages"></div></div>
      </div>` : ui().emptyState("None issued", "Certificates appear here upon course completion.", "cert");
    ui().bindReveals(content);
    ui().renderPagination(document.getElementById("certpages"), res.data, (p) => renderCertificates({ page: p }));
  }

  /* ------------------------------------------------------------ announcements */
  async function renderAnnouncements() {
    const content = shell("announcements", "Announcements");
    content.innerHTML = `<div class="grid">${ui().skeletonRows(4)}</div>`;
    const res = await api().get("/admin/announcements");
    if (!res.success) { content.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];

    content.innerHTML = `
      <div class="panel" data-reveal>
        <div class="panel-head"><h3>${ui().icon("send")} Broadcast</h3></div>
        <div class="panel-body">
          <form id="ann-form">
            <div class="field"><label class="label">Title <b>*</b></label><input class="input" name="title" placeholder="e.g. New AI courses just landed" required></div>
            <div class="field"><label class="label">Message <b>*</b></label><textarea class="textarea" name="message" placeholder="Sent as a notification to every user…" required></textarea></div>
            <button class="btn btn-primary">${ui().icon("send")} Send to all users</button>
          </form>
        </div>
      </div>
      <div class="grid" id="ann-list">
        ${items.length ? items.map(a => `
          <div class="panel" data-reveal>
            <div class="panel-body">
              <div class="flex-between wrap">
                <b style="font-family:var(--font-display)">${U().esc(a.title)}</b>
                <span class="flex" style="gap:.6rem;align-items:center">
                  <span class="text-dim" style="font-size:.76rem">${U().timeAgo(a.created_at)}</span>
                  <button class="btn btn-danger btn-icon btn-sm" data-del-ann="${a.id}">${ui().icon("trash")}</button>
                </span>
              </div>
              <p class="text-muted mt-1" style="font-size:.9rem">${U().esc(a.message || "")}</p>
            </div>
          </div>`).join("") : ui().emptyState("No announcements", "Broadcast your first platform-wide message.", "bell")}
      </div>`;
    ui().bindReveals(content);

    document.getElementById("ann-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      if (!f.title.value.trim() || !f.message.value.trim()) return;
      const yes = await ui().confirmDialog("Send announcement?", "Every registered user will receive this as a notification.", "Send to everyone");
      if (!yes) return;
      const res2 = await api().post("/admin/announcements", { title: f.title.value.trim(), message: f.message.value.trim() });
      ui().toast(res2.success ? "Broadcast sent 📢" : "Error", res2.success ? "" : res2.message, res2.success ? "success" : "error");
      if (res2.success) renderAnnouncements();
    });

    content.querySelectorAll("[data-del-ann]").forEach(b => b.addEventListener("click", async () => {
      const yes = await ui().confirmDialog("Delete announcement?", "", "Delete", true);
      if (!yes) return;
      const res2 = await api().del("/admin/announcements/" + b.dataset.delAnn);
      if (res2.success) renderAnnouncements();
    }));
  }

  /* ------------------------------------------------------------ boot */
  async function init() {
    me = await ui().guard(["admin"]);
    if (!me) return;
    // grab pending counts for sidebar badges
    const s = await api().get("/admin/statistics");
    badgeState = s.success
      ? { pending_courses: s.data.pending_courses, pending_instructors: s.data.pending_instructors }
      : null;
    renderOverview();
  }

  window.LS = window.LS || {};
  window.LS.pages = window.LS.pages || {};
  window.LS.pages.initAdmin = init;
})();
