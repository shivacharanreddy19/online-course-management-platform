/* ============================================================================
   LearnSphere — instructor.js
   Instructor workspace: statistics, course CRUD, full course builder
   (sections → lessons / quizzes / assignments), students & grading, reviews.
   ========================================================================== */
(function () {
  "use strict";
  const U = () => window.LS.utils;
  const api = () => window.LS.api;
  const ui = () => window.LS.ui;

  let me = null;
  let state = { view: "overview", courseId: null };

  /* ------------------------------------------------------------ shell */
  function shell(active, title, crumb) {
    const el = document.getElementById("app-root");
    el.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="index.html">${ui().logoSVG(30)}<span>Learn<b>Sphere</b></span></a>
        <span class="side-label">Teach</span>
        <a class="side-link ${active === "overview" ? "active" : ""}" data-view="overview">${ui().icon("dashboard")} Overview</a>
        <a class="side-link ${active === "courses" ? "active" : ""}" data-view="courses">${ui().icon("book")} My courses</a>
        <a class="side-link ${active === "students" ? "active" : ""}" data-view="students">${ui().icon("users")} Students</a>
        <a class="side-link ${active === "submissions" ? "active" : ""}" data-view="submissions">${ui().icon("inbox")} Submissions</a>
        <a class="side-link ${active === "reviews" ? "active" : ""}" data-view="reviews">${ui().icon("star")} Reviews</a>
        <span class="side-label">Site</span>
        <a class="side-link" href="courses.html">${ui().icon("compass")} Public catalog</a>
        <a class="side-link" href="profile.html">${ui().icon("user")} Profile</a>
        <div class="side-user">
          ${U().avatarHTML(me.full_name, me.avatar_url, "nav-avatar")}
          <span class="su-body"><span class="su-name">${U().esc(me.full_name || "Instructor")}</span><span class="su-role">Instructor${me.is_approved ? "" : " · pending"}</span></span>
          <a href="#" id="side-logout" data-tip="Log out">${ui().icon("logout")}</a>
        </div>
      </aside>
      <div class="app-main">
        <div class="app-topbar">
          <button class="nav-ic-btn app-burger" id="app-burger" aria-label="Menu">${ui().icon("menu")}</button>
          <div><div class="page-title">${title}</div><div class="crumb">${crumb || "Instructor studio"}</div></div>
          <div class="nav-spacer"></div>
          <button class="btn btn-primary btn-sm" id="tb-new-course">${ui().icon("plus")} New course</button>
        </div>
        <div class="app-content" id="app-content"></div>
      </div>
    </div>`;
    document.getElementById("side-logout").addEventListener("click", (e) => { e.preventDefault(); api().session.clear(); location.href = "index.html"; });
    document.getElementById("app-burger").addEventListener("click", () => document.body.classList.toggle("side-open"));
    document.getElementById("tb-new-course").addEventListener("click", () => courseForm());
    U().$$("[data-view]", el).forEach(l => l.addEventListener("click", () => go(l.dataset.view)));
    document.body.classList.remove("side-open");
    return document.getElementById("app-content");
  }

  function go(view, courseId) {
    state.view = view;
    state.courseId = courseId || null;
    if (view === "overview") renderOverview();
    else if (view === "courses") renderCourses();
    else if (view === "students") renderStudents();
    else if (view === "submissions") renderSubmissions();
    else if (view === "reviews") renderReviews();
    else if (view === "builder") renderBuilder(courseId);
  }

  function needApproval(content) {
    if (me.is_approved || me.role === "admin") return false;
    content.innerHTML = ui().emptyState("Account pending approval ⏳",
      "An admin needs to approve your instructor account before you can create courses. Everything will unlock automatically once approved.",
      "shield");
    return true;
  }

  /* ------------------------------------------------------------ overview */
  async function renderOverview() {
    const content = shell("overview", "Overview");
    content.innerHTML = `<div class="kpi-grid">${Array.from({ length: 4 }).map(() => `<div class="skeleton" style="height:130px;border-radius:22px"></div>`).join("")}</div><div class="dash-cols"><div class="skeleton" style="height:320px;border-radius:22px"></div><div class="skeleton" style="height:320px;border-radius:22px"></div></div>`;
    const [stats, reviews] = await Promise.all([api().get("/instructor/statistics"), api().get("/instructor/reviews")]);
    if (!stats.success) { content.innerHTML = ui().errorState(stats.message); return; }
    const s = stats.data;

    const months = lastMonths(6);
    const series = months.map(m => s.enrollments_by_month[m.key] || 0);

    content.innerHTML = `
      <section class="welcome-band" data-reveal>
        <div>
          <span class="kicker"><span class="dot"></span> Instructor studio</span>
          <h1 class="mt-1">Teach the world, ${U().esc((me.full_name || "").split(" ")[0])} 🎥</h1>
          <p>${s.total_courses ? `You have ${s.total_courses} course${s.total_courses === 1 ? "" : "s"} — ${s.published_courses} live, ${s.pending_courses} awaiting review.` : "Create your first course and start building your audience today."}</p>
          ${!me.is_approved && me.role !== "admin" ? `<p class="pill pill-amber mt-1">${ui().icon("warn")} Account pending admin approval</p>` : ""}
        </div>
        <div class="wb-ring">${ui().ring(s.published_courses && s.total_courses ? (s.published_courses / s.total_courses) * 100 : 0, 118, 11, `<span><b>${s.published_courses}/${s.total_courses}</b><span>live</span></span>`)}</div>
      </section>

      <section class="kpi-grid">
        ${window.LS.dash.kpi("book", "Total courses", s.total_courses, "var(--accent-soft)", "#b9adff")}
        ${window.LS.dash.kpi("users", "Students taught", s.total_students, "var(--sky-soft)", "#8fd8ff")}
        ${window.LS.dash.kpi("wallet", "Revenue", "$" + U().fmtNum(s.revenue), "var(--mint-soft)", "#6fe8c4")}
        ${window.LS.dash.kpi("star", "Avg rating", s.average_rating || "—", "var(--amber-soft)", "#ffce94")}
      </section>

      <div class="dash-cols">
        <section class="panel" data-reveal>
          <div class="panel-head"><h3>${ui().icon("chart")} Enrollments</h3><span class="text-dim" style="font-size:.78rem">last 6 months</span></div>
          <div class="panel-body"><div id="inst-chart"></div></div>
        </section>
        <section class="panel" data-reveal>
          <div class="panel-head"><h3>${ui().icon("star")} Latest reviews</h3><button class="link btn-xs" id="see-reviews">View all</button></div>
          <div class="panel-body" id="latest-reviews">
            ${(reviews.success && reviews.data.items.length) ? reviews.data.items.slice(0, 4).map(reviewRow).join("") : `<p class="text-dim" style="text-align:center;padding:1.2rem">No reviews yet — publish a course to start collecting feedback.</p>`}
          </div>
        </section>
      </div>`;
    ui().autoBind(content);
    ui().lineChart(document.getElementById("inst-chart"), months.map(m => m.label), series);
    content.querySelector("#see-reviews")?.addEventListener("click", () => go("reviews"));
  }

  function reviewRow(r) {
    return `
    <div class="feed-item" style="border-bottom:1px solid var(--line)">
      ${U().avatarHTML(r.student && r.student.full_name, r.student && r.student.avatar_url, "cell-avatar")}
      <span class="feed-body">
        <b>${U().esc((r.course && r.course.title) || "Course")} <span class="cc-rating" style="font-size:.8rem">★ ${r.rating}</span></b>
        <p>${U().esc(r.review_text || "—")}</p>
        <small class="text-dim">${U().esc((r.student && r.student.full_name) || "Student")} · ${U().timeAgo(r.created_at)}</small>
      </span>
    </div>`;
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

  /* ------------------------------------------------------------ my courses */
  async function renderCourses() {
    const content = shell("courses", "My courses");
    content.innerHTML = `<div class="grid">${ui().skeletonRows(4)}</div>`;
    const res = await api().get("/courses/mine");
    if (!res.success) { content.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];

    content.innerHTML = `
      <div class="flex-between wrap" data-reveal>
        <div><h2 style="font-size:1.3rem">My courses</h2><p class="text-dim">${items.length} total</p></div>
        <button class="btn btn-primary" id="new-course">${ui().icon("plus")} Create course</button>
      </div>
      <div class="grid" id="mc-list">
        ${items.length ? items.map(courseRow).join("") : ui().emptyState("No courses yet", "Create your first course — build sections, lessons, quizzes and assignments, then submit it for review.", "video")}
      </div>`;
    ui().bindReveals(content);
    content.querySelector("#new-course").addEventListener("click", () => courseForm());

    content.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => courseForm(items.find(x => x.id === b.dataset.edit))));
    content.querySelectorAll("[data-build]").forEach(b => b.addEventListener("click", () => go("builder", b.dataset.build)));
    content.querySelectorAll("[data-submit-course]").forEach(b => b.addEventListener("click", async () => {
      const res2 = await api().post(`/courses/${b.dataset.submitCourse}/submit`);
      ui().toast(res2.success ? "Submitted for review 🚀" : "Cannot submit", res2.success ? "An admin will review your course shortly." : res2.message, res2.success ? "success" : "error");
      if (res2.success) renderCourses();
    }));
    content.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
      const c = items.find(x => x.id === b.dataset.del);
      const yes = await ui().confirmDialog("Delete course?", `“${c.title}” and all its content will be permanently removed.`, "Delete", true);
      if (!yes) return;
      const res2 = await api().del("/courses/" + c.id);
      ui().toast(res2.success ? "Deleted" : "Error", res2.success ? "" : res2.message, res2.success ? "success" : "error");
      if (res2.success) renderCourses();
    }));
  }

  function courseRow(c) {
    return `
    <div class="row-item" data-reveal>
      <span class="row-art">${U().thumbHTML(c)}</span>
      <div class="row-body">
        <div class="flex wrap" style="gap:.5rem">
          <span class="row-title">${U().esc(c.title)}</span>
          ${U().statusPill(c.status)}
        </div>
        <div class="row-sub">${U().fmtNum(c.students_count)} students · ★ ${c.rating_avg ? c.rating_avg.toFixed(1) : "—"} · ${U().fmtDuration(c.duration_minutes)} · updated ${U().timeAgo(c.updated_at)}</div>
        ${c.status === "rejected" && c.rejection_reason ? `<p class="pill pill-rose mt-1" style="font-size:.7rem">Rejected: ${U().esc(c.rejection_reason)}</p>` : ""}
      </div>
      <div class="flex wrap" style="gap:.45rem;justify-content:flex-end">
        <button class="btn btn-soft btn-sm" data-build="${c.id}">${ui().icon("layers")} Builder</button>
        <button class="btn btn-ghost btn-sm" data-edit="${c.id}">${ui().icon("edit")}</button>
        ${c.status === "draft" || c.status === "rejected" ? `<button class="btn btn-primary btn-sm" data-submit-course="${c.id}">${ui().icon("send")} Submit</button>` : ""}
        ${c.status === "draft" || c.status === "rejected" || me.role === "admin" ? `<button class="btn btn-danger btn-sm btn-icon" data-del="${c.id}">${ui().icon("trash")}</button>` : ""}
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------ course form (create/edit) */
  async function courseForm(existing) {
    if (needApprovalModal()) return;
    const cats = await api().get("/categories", { anon: true });
    const categories = cats.success ? cats.data.items : [];

    const m = ui().modal({
      title: existing ? "Edit course" : "Create course",
      size: "lg",
      body: `
      <form id="course-form">
        <div class="field"><label class="label">Title <b>*</b></label>
          <input class="input" name="title" maxlength="160" required value="${U().esc((existing && existing.title) || "")}" placeholder="e.g. Modern JavaScript: From Zero to Hero"></div>
        <div class="field"><label class="label">Short pitch</label>
          <input class="input" name="short_description" maxlength="200" value="${U().esc((existing && existing.short_description) || "")}" placeholder="One line that sells your course"></div>
        <div class="grid" style="grid-template-columns:1.2fr 1fr;gap:1rem">
          <div class="field"><label class="label">Category</label>
            <select class="select" name="category_id">
              <option value="">Choose…</option>
              ${categories.map(c => `<option value="${c.id}" ${existing && existing.category_id === c.id ? "selected" : ""}>${U().esc(c.name)}</option>`).join("")}
            </select></div>
          <div class="field"><label class="label">Level</label>
            <select class="select" name="level">
              ${[["beginner","Beginner"],["intermediate","Intermediate"],["advanced","Advanced"],["all","All levels"]].map(([v, l]) => `<option value="${v}" ${existing && existing.level === v ? "selected" : ""}>${l}</option>`).join("")}
            </select></div>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr 1fr;gap:1rem">
          <div class="field"><label class="label">Price (USD)</label><input class="input" name="price" type="number" min="0" step="0.01" value="${existing ? existing.price : 0}"></div>
          <div class="field"><label class="label">Discount price</label><input class="input" name="discount_price" type="number" min="0" step="0.01" value="${existing && existing.discount_price != null ? existing.discount_price : ""}" placeholder="optional"></div>
          <div class="field"><label class="label">Language</label><input class="input" name="language" value="${U().esc((existing && existing.language) || "English")}"></div>
        </div>
        <div class="field"><label class="label">Thumbnail</label>
          <div class="flex wrap">
            <span id="thumb-preview" style="width:96px;height:56px;border-radius:10px;overflow:hidden;display:block;border:1px solid var(--line)">${existing ? U().thumbHTML(existing) : ""}</span>
            <label class="btn btn-ghost btn-sm" style="cursor:pointer">${ui().icon("upload")} Upload image<input type="file" id="thumb-file" accept="image/*" class="hidden"></label>
          </div>
          <span class="hint">16:9 image works best · stored in Supabase Storage</span>
        </div>
        <div class="field"><label class="label">Description</label>
          <textarea class="textarea" name="description" placeholder="What is the course about, who is it for…">${U().esc((existing && existing.description) || "")}</textarea></div>
        <div class="field"><label class="label">What you'll learn <span class="hint">(separate points with |)</span></label>
          <textarea class="textarea" name="what_you_will_learn" style="min-height:70px" placeholder="Build real projects|Master the fundamentals|Debug like a pro">${U().esc((existing && existing.what_you_will_learn) || "")}</textarea></div>
        <div class="field"><label class="label">Requirements <span class="hint">(separate with |)</span></label>
          <textarea class="textarea" name="requirements" style="min-height:60px" placeholder="A computer|No prior experience needed">${U().esc((existing && existing.requirements) || "")}</textarea></div>
      </form>`,
      foot: `<button class="btn btn-ghost" id="cf-cancel">Cancel</button>
             <button class="btn btn-primary" id="cf-save">${ui().icon("check")} ${existing ? "Save changes" : "Create course"}</button>`,
    });

    let thumbnail_url = existing ? existing.thumbnail_url : null;
    m.el.querySelector("#thumb-file").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const prev = m.el.querySelector("#thumb-preview");
      prev.innerHTML = `<div class="skeleton" style="width:100%;height:100%"></div>`;
      const up = await api().upload(file, "course-thumbnails");
      if (up.success) {
        thumbnail_url = up.data.url;
        prev.innerHTML = `<img src="${U().esc(thumbnail_url)}" style="width:100%;height:100%;object-fit:cover">`;
      } else {
        prev.innerHTML = "";
        ui().toast("Upload failed", up.message, "error");
      }
    });

    m.el.querySelector("#cf-cancel").addEventListener("click", m.close);
    m.el.querySelector("#cf-save").addEventListener("click", async () => {
      const f = m.el.querySelector("#course-form");
      if (!f.title.value.trim() || f.title.value.trim().length < 3) { ui().toast("Title needed", "Give your course a name (3+ characters).", "error"); return; }
      const payload = {
        title: f.title.value.trim(),
        short_description: f.short_description.value.trim(),
        category_id: f.category_id.value || null,
        level: f.level.value,
        price: f.price.value === "" ? 0 : Number(f.price.value),
        discount_price: f.discount_price.value === "" ? null : Number(f.discount_price.value),
        language: f.language.value.trim() || "English",
        description: f.description.value.trim(),
        what_you_will_learn: f.what_you_will_learn.value.trim(),
        requirements: f.requirements.value.trim(),
        thumbnail_url,
      };
      const btn = m.el.querySelector("#cf-save");
      btn.disabled = true; btn.textContent = "Saving…";
      const res = existing
        ? await api().put("/courses/" + existing.id, payload)
        : await api().post("/courses", payload);
      btn.disabled = false; btn.innerHTML = `${ui().icon("check")} ${existing ? "Save changes" : "Create course"}`;
      if (!res.success) { ui().toast("Could not save", res.message, "error"); return; }
      m.close();
      ui().toast(existing ? "Saved ✅" : "Course created 🎬", existing ? "" : "Now build its curriculum.", "success");
      if (existing) renderCourses();
      else {
        const id = res.data.course && res.data.course.id;
        if (id) go("builder", id); else renderCourses();
      }
    });
  }

  function needApprovalModal() {
    if (me.is_approved || me.role === "admin") return false;
    ui().toast("Approval pending", "An admin must approve your instructor account first.", "error");
    return true;
  }

  /* ------------------------------------------------------------ builder */
  async function renderBuilder(courseId) {
    const content = shell("courses", "Course builder", "Structure · lessons · quizzes · assignments");
    content.innerHTML = `<div class="skeleton" style="height:120px;border-radius:22px"></div><div class="grid mt-2">${ui().skeletonRows(3)}</div>`;
    const [cRes, qRes, aRes] = await Promise.all([
      api().get("/courses/" + courseId),
      api().get(`/courses/${courseId}/quizzes`),
      api().get(`/courses/${courseId}/assignments`),
    ]);
    if (!cRes.success) { content.innerHTML = ui().errorState(cRes.message); return; }
    const course = cRes.data.course;
    const quizzes = qRes.success ? qRes.data.items : [];
    const assignments = aRes.success ? aRes.data.items : [];

    content.innerHTML = `
      <div class="panel" data-reveal>
        <div class="panel-body flex-between wrap" style="gap:1rem">
          <div class="flex" style="gap:1rem;min-width:0">
            <span class="row-art" style="width:76px;height:52px;border-radius:12px">${U().thumbHTML(course)}</span>
            <div style="min-width:0">
              <div class="flex wrap" style="gap:.5rem"><h3 style="font-size:1.1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U().esc(course.title)}</h3>${U().statusPill(course.status)}</div>
              <p class="text-dim" style="font-size:.8rem">${course.sections.length} sections · ${course.lesson_count} lessons · ${quizzes.length} quizzes · ${assignments.length} assignments</p>
            </div>
          </div>
          <div class="flex wrap">
            <button class="btn btn-ghost btn-sm" id="b-edit">${ui().icon("edit")} Details</button>
            ${course.status === "draft" || course.status === "rejected" ? `<button class="btn btn-primary btn-sm" id="b-submit">${ui().icon("send")} Submit for review</button>` : ""}
          </div>
        </div>
      </div>

      <div class="builder-tree" id="b-tree">
        ${course.sections.map((s, i) => sectionBlock(s, i, quizzes, assignments)).join("")}
      </div>

      <button class="btn btn-soft btn-block" data-reveal id="add-section">${ui().icon("plus")} Add section</button>
      <button class="btn btn-ghost btn-block btn-sm" id="back-courses">${ui().icon("arrowL")} Back to my courses</button>`;

    ui().bindReveals(content);
    content.querySelector("#b-edit").addEventListener("click", () => courseForm(course));
    content.querySelector("#b-submit")?.addEventListener("click", async () => {
      const res = await api().post(`/courses/${courseId}/submit`);
      ui().toast(res.success ? "Submitted 🚀" : "Cannot submit", res.success ? "The admin team will review it." : res.message, res.success ? "success" : "error");
      if (res.success) renderBuilder(courseId);
    });
    content.querySelector("#add-section").addEventListener("click", () => sectionForm(courseId));
    content.querySelector("#back-courses").addEventListener("click", () => go("courses"));

    // section actions
    content.querySelectorAll("[data-sec-edit]").forEach(b => b.addEventListener("click", () => sectionForm(courseId, course.sections.find(s => s.id === b.dataset.secEdit))));
    content.querySelectorAll("[data-sec-del]").forEach(b => b.addEventListener("click", async () => {
      const yes = await ui().confirmDialog("Delete section?", "All lessons in this section will be deleted too.", "Delete", true);
      if (!yes) return;
      const res = await api().del("/sections/" + b.dataset.secDel);
      if (res.success) renderBuilder(courseId); else ui().toast("Error", res.message, "error");
    }));
    // item creation
    content.querySelectorAll("[data-add-lesson]").forEach(b => b.addEventListener("click", () => lessonForm(courseId, b.dataset.addLesson)));
    content.querySelectorAll("[data-edit-lesson]").forEach(b => b.addEventListener("click", () => {
      const sec = course.sections.find(s => s.id === b.dataset.sec);
      lessonForm(courseId, sec.id, sec.lessons.find(l => l.id === b.dataset.editLesson));
    }));
    content.querySelectorAll("[data-del-lesson]").forEach(b => b.addEventListener("click", async () => {
      const yes = await ui().confirmDialog("Delete lesson?", "", "Delete", true);
      if (!yes) return;
      const res = await api().del("/lessons/" + b.dataset.delLesson);
      if (res.success) renderBuilder(courseId); else ui().toast("Error", res.message, "error");
    }));
    content.querySelectorAll("[data-add-quiz]").forEach(b => b.addEventListener("click", () => quizForm(courseId, b.dataset.addQuiz)));
    content.querySelectorAll("[data-edit-quiz]").forEach(b => b.addEventListener("click", () => quizForm(courseId, b.dataset.sec, quizzes.find(q => q.id === b.dataset.editQuiz))));
    content.querySelectorAll("[data-add-assign]").forEach(b => b.addEventListener("click", () => assignmentForm(courseId, b.dataset.addAssign)));
    content.querySelectorAll("[data-edit-assign]").forEach(b => b.addEventListener("click", () => assignmentForm(courseId, b.dataset.sec, assignments.find(a => a.id === b.dataset.editAssign))));
  }

  function sectionBlock(s, i, quizzes, assignments) {
    const quiz = quizzes.find(q => q.section_id === s.id);
    const assign = assignments.find(a => a.section_id === s.id);
    return `
    <div class="builder-section" data-reveal>
      <div class="builder-section-head">
        <span class="cs-n" style="width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--accent-soft);border:1px solid var(--accent-line);font-weight:800;font-size:.8rem;color:var(--accent-ink)">${String(i + 1).padStart(2, "0")}</span>
        <h4>${U().esc(s.title)}</h4>
        <span class="text-dim" style="font-size:.76rem">${s.lessons.length} lesson${s.lessons.length === 1 ? "" : "s"}</span>
        <button class="btn btn-ghost btn-icon btn-sm" data-sec-edit="${s.id}" aria-label="Edit section">${ui().icon("edit")}</button>
        <button class="btn btn-danger btn-icon btn-sm" data-sec-del="${s.id}" aria-label="Delete section">${ui().icon("trash")}</button>
      </div>
      <div class="builder-items">
        ${s.lessons.map(l => `
          <div class="builder-item">
            <span class="bi-ic">${ui().icon(l.video_url ? "video" : "note")}</span>
            <span class="bi-title">${U().esc(l.title)}</span>
            ${l.is_preview ? `<span class="pill pill-accent" style="font-size:.64rem">Preview</span>` : ""}
            <span class="bi-meta">${U().fmtDuration(l.duration_minutes)}</span>
            <button class="btn btn-ghost btn-icon btn-sm" data-edit-lesson="${l.id}" data-sec="${s.id}">${ui().icon("edit")}</button>
            <button class="btn btn-danger btn-icon btn-sm" data-del-lesson="${l.id}">${ui().icon("trash")}</button>
          </div>`).join("")}
        ${quiz ? `
          <div class="builder-item" style="border-style:dashed">
            <span class="bi-ic" style="background:var(--accent-soft);color:var(--accent-ink)">${ui().icon("zap")}</span>
            <span class="bi-title">Quiz: ${U().esc(quiz.title)}</span>
            <span class="bi-meta">pass ${quiz.passing_score}%</span>
            <button class="btn btn-ghost btn-icon btn-sm" data-edit-quiz="${quiz.id}" data-sec="${s.id}">${ui().icon("edit")}</button>
          </div>` : ""}
        ${assign ? `
          <div class="builder-item" style="border-style:dashed">
            <span class="bi-ic" style="background:var(--sky-soft);color:#8fd8ff">${ui().icon("note")}</span>
            <span class="bi-title">Assignment: ${U().esc(assign.title)}</span>
            <button class="btn btn-ghost btn-icon btn-sm" data-edit-assign="${assign.id}" data-sec="${s.id}">${ui().icon("edit")}</button>
          </div>` : ""}
      </div>
      <div class="builder-actions">
        <button class="btn btn-ghost btn-sm" data-add-lesson="${s.id}">${ui().icon("plus")} Lesson</button>
        <button class="btn btn-ghost btn-sm" data-add-quiz="${s.id}">${ui().icon("zap")} ${quiz ? "Replace quiz" : "Quiz"}</button>
        <button class="btn btn-ghost btn-sm" data-add-assign="${s.id}">${ui().icon("note")} ${assign ? "Replace assignment" : "Assignment"}</button>
      </div>
    </div>`;
  }

  function sectionForm(courseId, existing) {
    const m = ui().modal({
      title: existing ? "Edit section" : "New section",
      body: `<form id="sec-form">
        <div class="field"><label class="label">Title <b>*</b></label><input class="input" name="title" required value="${U().esc((existing && existing.title) || "")}" placeholder="e.g. Getting Started"></div>
        <div class="field"><label class="label">Description</label><textarea class="textarea" name="description" style="min-height:70px">${U().esc((existing && existing.description) || "")}</textarea></div>
      </form>`,
      foot: `<button class="btn btn-ghost" id="x">Cancel</button><button class="btn btn-primary" id="ok">${existing ? "Save" : "Add section"}</button>`,
    });
    m.el.querySelector("#x").addEventListener("click", m.close);
    m.el.querySelector("#ok").addEventListener("click", async () => {
      const f = m.el.querySelector("#sec-form");
      if (f.title.value.trim().length < 2) { ui().toast("Title needed", "", "error"); return; }
      const payload = { title: f.title.value.trim(), description: f.description.value.trim() };
      const res = existing
        ? await api().put("/sections/" + existing.id, payload)
        : await api().post(`/courses/${courseId}/sections`, payload);
      if (res.success) { m.close(); renderBuilder(courseId); }
      else ui().toast("Error", res.message, "error");
    });
  }

  function lessonForm(courseId, sectionId, existing) {
    const m = ui().modal({
      title: existing ? "Edit lesson" : "New lesson",
      size: "lg",
      body: `<form id="les-form">
        <div class="field"><label class="label">Title <b>*</b></label><input class="input" name="title" required value="${U().esc((existing && existing.title) || "")}"></div>
        <div class="field"><label class="label">Description</label><input class="input" name="description" value="${U().esc((existing && existing.description) || "")}"></div>
        <div class="grid" style="grid-template-columns:1fr auto;gap:.6rem;align-items:end">
          <div class="field" style="margin-bottom:.4rem"><label class="label">Video</label>
            <input class="input" name="video_url" value="${U().esc((existing && existing.video_url) || "")}" placeholder="YouTube / Vimeo / mp4 URL…"></div>
          <label class="btn btn-ghost btn-sm" style="cursor:pointer;margin-bottom:.4rem">${ui().icon("upload")} Upload<input type="file" id="les-video" accept="video/*" class="hidden"></label>
        </div>
        <div class="field"><label class="label">Text content <span class="hint">(optional — shown below the video)</span></label>
          <textarea class="textarea" name="content" placeholder="# Heading&#10;Write the lesson content here…">${U().esc((existing && existing.content) || "")}</textarea></div>
        <div class="grid" style="grid-template-columns:1fr auto;gap:.6rem;align-items:end">
          <div class="field" style="margin-bottom:.4rem"><label class="label">Resource file</label>
            <input class="input" name="resource_url" value="${U().esc((existing && existing.resource_url) || "")}" placeholder="File URL for downloads…"></div>
          <label class="btn btn-ghost btn-sm" style="cursor:pointer;margin-bottom:.4rem">${ui().icon("upload")} Upload<input type="file" id="les-resource" class="hidden"></label>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:1rem">
          <div class="field"><label class="label">Duration (minutes)</label><input class="input" name="duration_minutes" type="number" min="0" value="${existing ? existing.duration_minutes : 10}"></div>
          <div class="field"><label class="label">Preview</label>
            <label class="check" style="height:100%"><input type="checkbox" name="is_preview" ${existing && existing.is_preview ? "checked" : ""}><span class="box">${ui().icon("check")}</span> Free preview lesson</label></div>
        </div>
      </form>`,
      foot: `<button class="btn btn-ghost" id="x">Cancel</button><button class="btn btn-primary" id="ok">${existing ? "Save lesson" : "Add lesson"}</button>`,
    });
    m.el.querySelector("#x").addEventListener("click", m.close);

    const lesVid = m.el.querySelector("#les-video");
    const lesRes = m.el.querySelector("#les-resource");
    lesVid.addEventListener("change", async () => {
      const f = lesVid.files[0]; if (!f) return;
      ui().toast("Uploading video…", "This may take a moment.", "info", 2600);
      const up = await api().upload(f, "course-videos");
      if (up.success) { m.el.querySelector("[name=video_url]").value = up.data.url; ui().toast("Video uploaded ✅", "", "success"); }
      else ui().toast("Upload failed", up.message, "error");
    });
    lesRes.addEventListener("change", async () => {
      const f = lesRes.files[0]; if (!f) return;
      const up = await api().upload(f, "course-resources");
      if (up.success) { m.el.querySelector("[name=resource_url]").value = up.data.url; ui().toast("Resource uploaded ✅", "", "success"); }
      else ui().toast("Upload failed", up.message, "error");
    });

    m.el.querySelector("#ok").addEventListener("click", async () => {
      const f = m.el.querySelector("#les-form");
      if (f.title.value.trim().length < 2) { ui().toast("Title needed", "", "error"); return; }
      const payload = {
        title: f.title.value.trim(),
        description: f.description.value.trim(),
        video_url: f.video_url.value.trim() || null,
        content: f.content.value.trim(),
        resource_url: f.resource_url.value.trim() || null,
        duration_minutes: Number(f.duration_minutes.value) || 0,
        is_preview: f.is_preview.checked,
      };
      const res = existing
        ? await api().put("/lessons/" + existing.id, payload)
        : await api().post(`/sections/${sectionId}/lessons`, payload);
      if (res.success) { m.close(); renderBuilder(courseId); ui().toast("Lesson saved ✅", "", "success"); }
      else ui().toast("Error", res.message, "error");
    });
  }

  function quizForm(courseId, sectionId, existing) {
    let questions = [{ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", points: 1 }];

    const m = ui().modal({
      title: existing ? "Edit quiz" : "New quiz",
      size: "xl",
      body: `
      <div class="grid" style="grid-template-columns:2fr 1fr;gap:1rem">
        <div class="field"><label class="label">Quiz title <b>*</b></label><input class="input" id="qz-title" value="${U().esc((existing && existing.title) || "")}" placeholder="e.g. Core concepts check"></div>
        <div class="field"><label class="label">Pass mark (%)</label><input class="input" id="qz-pass" type="number" min="0" max="100" value="${existing ? existing.passing_score : 60}"></div>
      </div>
      <div class="field"><label class="label">Description</label><input class="input" id="qz-desc" value="${U().esc((existing && existing.description) || "")}"></div>
      <div class="dropdown-divider"></div>
      <div class="flex-between mb-1"><b>Questions</b><button class="btn btn-soft btn-sm" id="qz-add-q">${ui().icon("plus")} Add question</button></div>
      <div id="qz-questions" class="grid" style="gap:1rem"></div>`,
      foot: `<button class="btn btn-ghost" id="x">Cancel</button><button class="btn btn-primary" id="ok">${ui().icon("check")} Save quiz</button>`,
    });
    m.el.querySelector("#x").addEventListener("click", m.close);

    const list = m.el.querySelector("#qz-questions");
    const paint = () => {
      list.innerHTML = questions.map((q, i) => `
        <div class="panel"><div class="panel-body">
          <div class="flex-between mb-1"><b>Question ${i + 1}</b>
            ${questions.length > 1 ? `<button class="btn btn-danger btn-icon btn-xs" data-delq="${i}">${ui().icon("trash")}</button>` : ""}</div>
          <div class="field"><input class="input" data-q="question" data-i="${i}" value="${U().esc(q.question)}" placeholder="Type the question…"></div>
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:.6rem">
            ${["a","b","c","d"].map(k => `
              <div class="field" style="margin-bottom:.5rem;position:relative">
                <span class="pill" style="position:absolute;left:.55rem;top:.55rem;z-index:2;border-radius:8px;font-size:.7rem">${k.toUpperCase()}</span>
                <input class="input" style="padding-left:3.1rem" data-q="option_${k}" data-i="${i}" value="${U().esc(q["option_" + k])}" placeholder="Option ${k.toUpperCase()}">
              </div>`).join("")}
          </div>
          <div class="flex wrap" style="gap:1rem;align-items:center">
            <span class="flex" style="font-size:.82rem;color:var(--text-2)">Correct:
              <select class="select" style="width:auto;padding:.4rem 2rem .4rem .7rem" data-q="correct_option" data-i="${i}">
                ${["a","b","c","d"].map(k => `<option value="${k}" ${q.correct_option === k ? "selected" : ""}>${k.toUpperCase()}</option>`).join("")}
              </select></span>
            <span class="flex" style="font-size:.82rem;color:var(--text-2)">Points:
              <input class="input" style="width:76px;padding:.4rem .7rem" type="number" min="1" data-q="points" data-i="${i}" value="${q.points}"></span>
          </div>
        </div></div>`).join("");
      list.querySelectorAll("[data-q]").forEach(inp => inp.addEventListener("input", () => {
        questions[Number(inp.dataset.i)][inp.dataset.q] = inp.type === "number" ? Number(inp.value) : inp.value;
      }));
      list.querySelectorAll("[data-delq]").forEach(b => b.addEventListener("click", () => { questions.splice(Number(b.dataset.delq), 1); paint(); }));
    };
    paint();
    m.el.querySelector("#qz-add-q").addEventListener("click", () => {
      questions.push({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", points: 1 });
      paint();
    });

    // load existing questions
    if (existing) {
      api().get("/quizzes/" + existing.id).then(res => {
        if (res.success && res.data.questions.length) {
          questions = res.data.questions.map(q => ({
            question: q.question, option_a: q.option_a, option_b: q.option_b,
            option_c: q.option_c, option_d: q.option_d,
            correct_option: q.correct_option, points: q.points,
          }));
          paint();
        }
      });
    }

    m.el.querySelector("#ok").addEventListener("click", async () => {
      const title = m.el.querySelector("#qz-title").value.trim();
      if (title.length < 2) { ui().toast("Quiz title needed", "", "error"); return; }
      const payload = {
        title,
        description: m.el.querySelector("#qz-desc").value.trim(),
        passing_score: Number(m.el.querySelector("#qz-pass").value) || 60,
        section_id: sectionId,
        questions,
      };
      const res = existing
        ? await api().put("/quizzes/" + existing.id, payload)
        : await api().post(`/courses/${courseId}/quizzes`, payload);
      if (res.success) { m.close(); renderBuilder(courseId); ui().toast("Quiz saved ✅", "", "success"); }
      else ui().toast("Error", res.message, "error");
    });
  }

  function assignmentForm(courseId, sectionId, existing) {
    const m = ui().modal({
      title: existing ? "Edit assignment" : "New assignment",
      body: `<form id="as-form">
        <div class="field"><label class="label">Title <b>*</b></label><input class="input" name="title" required value="${U().esc((existing && existing.title) || "")}" placeholder="e.g. Build a landing page"></div>
        <div class="field"><label class="label">Brief</label><textarea class="textarea" name="description" placeholder="Describe what students should submit…">${U().esc((existing && existing.description) || "")}</textarea></div>
        <div class="field"><label class="label">Due date</label><input class="input" name="due_date" type="datetime-local" value="${existing && existing.due_date ? new Date(existing.due_date).toISOString().slice(0, 16) : ""}"></div>
      </form>`,
      foot: `<button class="btn btn-ghost" id="x">Cancel</button><button class="btn btn-primary" id="ok">${existing ? "Save" : "Add assignment"}</button>`,
    });
    m.el.querySelector("#x").addEventListener("click", m.close);
    m.el.querySelector("#ok").addEventListener("click", async () => {
      const f = m.el.querySelector("#as-form");
      if (f.title.value.trim().length < 2) { ui().toast("Title needed", "", "error"); return; }
      const payload = {
        title: f.title.value.trim(),
        description: f.description.value.trim(),
        section_id: sectionId,
        due_date: f.due_date.value ? new Date(f.due_date.value).toISOString() : null,
      };
      const res = existing
        ? await api().put("/assignments/" + existing.id, payload)
        : await api().post(`/courses/${courseId}/assignments`, payload);
      if (res.success) { m.close(); renderBuilder(courseId); ui().toast("Assignment saved ✅", "", "success"); }
      else ui().toast("Error", res.message, "error");
    });
  }

  /* ------------------------------------------------------------ students */
  async function renderStudents() {
    const content = shell("students", "Students");
    content.innerHTML = `<div class="grid">${ui().skeletonRows(5)}</div>`;
    const res = await api().get("/instructor/students");
    if (!res.success) { content.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];
    content.innerHTML = items.length ? `
      <div class="panel" data-reveal>
        <div class="panel-head"><h3>${ui().icon("users")} Enrolled students</h3><span class="text-dim">${new Set(items.map(i => i.student_id)).size} unique learners</span></div>
        <div class="table-wrap" style="border:none;border-radius:0">
          <table class="table">
            <thead><tr><th>Student</th><th>Course</th><th>Progress</th><th>Quiz avg</th><th>Enrolled</th></tr></thead>
            <tbody>
              ${items.map(e => `
                <tr>
                  <td><span class="cell-main">${U().avatarHTML(e.student && e.student.full_name, e.student && e.student.avatar_url, "cell-avatar")}<span><b>${U().esc((e.student && e.student.full_name) || "Student")}</b><br><small class="text-dim">${U().esc((e.student && e.student.email) || "")}</small></span></span></td>
                  <td>${U().esc((e.course && e.course.title) || "")}</td>
                  <td style="min-width:140px"><div class="flex"><span class="progress" style="flex:1"><span class="progress-bar" style="display:block;height:100%;width:${Math.round(e.completion_percentage)}%"></span></span><b style="font-size:.8rem">${Math.round(e.completion_percentage)}%</b></div></td>
                  <td>${e.quiz_avg != null ? e.quiz_avg + "%" : "—"}</td>
                  <td class="text-dim">${U().fmtDate(e.enrolled_at)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`
      : ui().emptyState("No students yet", "Students appear here as soon as they enroll in one of your published courses.", "users");
    ui().bindReveals(content);
  }

  /* ------------------------------------------------------------ submissions */
  async function renderSubmissions() {
    const content = shell("submissions", "Submissions");
    content.innerHTML = `<div class="grid">${ui().skeletonRows(4)}</div>`;
    const res = await api().get("/instructor/submissions");
    if (!res.success) { content.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];
    content.innerHTML = items.length ? `
      <div class="panel" data-reveal>
        <div class="panel-head"><h3>${ui().icon("inbox")} Assignment submissions</h3><span class="text-dim">${items.filter(i => i.score == null).length} awaiting grade</span></div>
        <div class="table-wrap" style="border:none;border-radius:0">
          <table class="table">
            <thead><tr><th>Student</th><th>Assignment</th><th>Submitted</th><th>Score</th><th></th></tr></thead>
            <tbody>
              ${items.map(s => `
                <tr>
                  <td><span class="cell-main">${U().avatarHTML(s.student && s.student.full_name, s.student && s.student.avatar_url, "cell-avatar")}<b>${U().esc((s.student && s.student.full_name) || "Student")}</b></span></td>
                  <td>${U().esc((s.assignment && s.assignment.title) || "")}</td>
                  <td class="text-dim">${U().timeAgo(s.submitted_at)}</td>
                  <td>${s.score != null ? `<span class="pill pill-mint">${s.score}/100</span>` : `<span class="pill pill-amber">Ungraded</span>`}</td>
                  <td><button class="btn btn-soft btn-sm" data-grade="${s.id}">${s.score != null ? "Review" : "Grade"}</button></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`
      : ui().emptyState("No submissions", "Student submissions will appear here once assignments start coming in.", "inbox");
    ui().bindReveals(content);

    content.querySelectorAll("[data-grade]").forEach(b => b.addEventListener("click", () => {
      const s = items.find(x => x.id === b.dataset.grade);
      const m = ui().modal({
        title: "Grade submission",
        size: "lg",
        body: `
          <p class="text-muted mb-1"><b>${U().esc((s.student && s.student.full_name) || "")}</b> → ${U().esc((s.assignment && s.assignment.title) || "")}</p>
          ${s.submission_text ? `<div class="panel mb-2"><div class="panel-body" style="white-space:pre-line;font-size:.9rem">${U().esc(s.submission_text)}</div></div>` : ""}
          ${s.file_url ? `<a class="resource-card mb-2" href="${U().esc(s.file_url)}" target="_blank" rel="noopener">${ui().icon("file")} <b>Attached file</b> ${ui().icon("arrowR")}</a>` : ""}
          <div class="grid" style="grid-template-columns:140px 1fr;gap:1rem;margin-top:1rem">
            <div class="field"><label class="label">Score /100</label><input class="input" id="g-score" type="number" min="0" max="100" value="${s.score != null ? s.score : ""}"></div>
            <div class="field"><label class="label">Feedback</label><input class="input" id="g-fb" value="${U().esc(s.feedback || "")}" placeholder="Great work on…"></div>
          </div>`,
        foot: `<button class="btn btn-ghost" id="x">Cancel</button><button class="btn btn-primary" id="ok">${ui().icon("check")} Save grade</button>`,
      });
      m.el.querySelector("#x").addEventListener("click", m.close);
      m.el.querySelector("#ok").addEventListener("click", async () => {
        const score = Number(m.el.querySelector("#g-score").value);
        if (isNaN(score) || score < 0 || score > 100) { ui().toast("Score 0–100", "", "error"); return; }
        const res2 = await api().put(`/assignment-submissions/${s.id}/grade`, {
          score, feedback: m.el.querySelector("#g-fb").value.trim(),
        });
        if (res2.success) { m.close(); renderSubmissions(); ui().toast("Graded ✅", "", "success"); }
        else ui().toast("Error", res2.message, "error");
      });
    }));
  }

  /* ------------------------------------------------------------ reviews */
  async function renderReviews() {
    const content = shell("reviews", "Reviews");
    content.innerHTML = `<div class="grid">${ui().skeletonRows(4)}</div>`;
    const res = await api().get("/instructor/reviews");
    if (!res.success) { content.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];
    content.innerHTML = items.length
      ? `<div class="panel" data-reveal><div class="panel-head"><h3>${ui().icon("star")} All reviews</h3></div><div class="panel-body">${items.map(reviewRow).join("")}</div></div>`
      : ui().emptyState("No reviews yet", "Reviews from students will appear here.", "star");
    ui().bindReveals(content);
  }

  /* ------------------------------------------------------------ boot */
  async function init() {
    me = await ui().guard(["instructor", "admin"]);
    if (!me) return;
    go("overview");
  }

  window.LS = window.LS || {};
  window.LS.pages = window.LS.pages || {};
  window.LS.pages.initInstructor = init;
})();
