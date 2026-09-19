/* ============================================================================
   LearnSphere — learning.js
   The immersive learning workspace: sticky topbar with live progress,
   curriculum rail, video/content stage, prev/next, mark-complete flow,
   quizzes & assignments, certificate celebration.
   ========================================================================== */
(function () {
  "use strict";
  const U = () => window.LS.utils;
  const api = () => window.LS.api;
  const ui = () => window.LS.ui;

  let course = null;          // course details (sections + lessons)
  let progressMap = {};       // lesson_id -> {completed, watched_seconds}
  let flatLessons = [];       // ordered lesson list
  let currentIdx = 0;
  let enrolled = false;
  let isOwner = false;

  /* ------------------------------------------------------------ boot */
  async function init() {
    const courseId = U().param("course");
    const shell = document.getElementById("learn-shell");
    if (!courseId) { location.href = "courses.html"; return; }

    const profile = await ui().guard(null);
    if (!profile) return;

    const res = await api().get("/courses/" + courseId);
    if (!res.success) {
      shell.innerHTML = `<div class="state" style="margin-top:20vh"><div class="state-icon">${ui().icon("warn")}</div><h3>Can't open this course</h3><p>${U().esc(res.message)}</p><a class="btn btn-primary" href="courses.html">Browse courses</a></div>`;
      return;
    }
    course = res.data.course;
    enrolled = !!course.viewer.enrolled;
    isOwner = !!course.viewer.is_owner || profile.role === "admin";

    flatLessons = course.sections.flatMap(s => s.lessons.map(l => ({ ...l, sectionTitle: s.title })));
    if (!flatLessons.length) {
      shell.innerHTML = `<div class="state" style="margin-top:20vh"><div class="state-icon">${ui().icon("video")}</div><h3>No lessons yet</h3><p>The instructor hasn't published any lessons for this course.</p><a class="btn btn-primary" href="course-details.html?id=${course.id}">Back to course</a></div>`;
      return;
    }

    // find requested lesson, else first incomplete, else first allowed
    const wantedId = U().param("lesson");
    let startIdx = wantedId ? flatLessons.findIndex(l => l.id === wantedId) : -1;

    if (enrolled) {
      const pr = await api().get("/progress/" + courseId);
      if (pr.success) progressMap = pr.data.lessons || {};
      if (startIdx < 0) {
        startIdx = flatLessons.findIndex(l => !(progressMap[l.id] && progressMap[l.id].completed));
        if (startIdx < 0) startIdx = 0;
      }
    } else if (startIdx < 0) {
      startIdx = flatLessons.findIndex(l => l.is_preview);
      if (startIdx < 0) startIdx = 0;
    }

    renderShell();
    await loadAux();
    goTo(startIdx);
    bindKeys();
  }

  /* ------------------------------------------------------------ shell */
  function renderShell() {
    const shell = document.getElementById("learn-shell");
    shell.innerHTML = `
    <div class="learn-topbar">
      <a class="lt-back" href="${isOwner ? "instructor-dashboard.html" : enrolled ? "student-dashboard.html" : "course-details.html?id=" + course.id}">
        ${ui().icon("arrowL")} <span class="hide-sm">Back</span>
      </a>
      <div class="lt-progress">
        <div class="progress"><div class="progress-bar" id="lt-bar" style="width:0%"></div></div>
        <b id="lt-pct">0%</b>
      </div>
      <div class="lt-title">${U().esc(course.title)}</div>
      <button class="btn btn-ghost btn-sm ls-toggle" id="ls-toggle">${ui().icon("menu")} <span class="hide-sm">Curriculum</span></button>
      <button class="btn btn-ghost btn-sm" id="focus-toggle" data-tip="Focus mode">${ui().icon("eye")} <span class="hide-sm">Focus</span></button>
    </div>
    <div class="learn-body">
      <main class="learn-stage" id="learn-stage"></main>
      <aside class="learn-side" id="learn-side">
        <div class="ls-head">
          <h3>Curriculum</h3>
          <p>${flatLessons.length} lessons · ${U().fmtDuration(course.duration_minutes)}</p>
        </div>
        <div class="ls-scroll" id="ls-scroll"></div>
      </aside>
    </div>`;

    document.getElementById("ls-toggle").addEventListener("click", () =>
      document.body.classList.toggle("learn-side-open"));
    document.getElementById("focus-toggle").addEventListener("click", () =>
      document.body.classList.toggle("learn-focus"));

    renderCurriculum();
  }

  function renderCurriculum() {
    const box = document.getElementById("ls-scroll");
    const canOpen = (l) => enrolled || isOwner || l.is_preview;
    box.innerHTML = course.sections.map((s, i) => {
      const done = s.lessons.filter(l => progressMap[l.id] && progressMap[l.id].completed).length;
      return `
      <div class="ls-section ${i === sectionOf(flatLessons[currentIdx]) ? "open" : ""}" data-sec="${i}">
        <button class="ls-section-head" data-acc="${i}">
          <span>${String(i + 1).padStart(2, "0")}</span>
          <span style="flex:1;min-width:0">${U().esc(s.title)}<small>${done}/${s.lessons.length} complete</small></span>
          <span class="acc-chev">${ui().icon("chevD")}</span>
        </button>
        <div class="ls-lessons">
          ${s.lessons.map(l => {
            const idx = flatLessons.indexOf(flatLessons.find(fl => fl.id === l.id));
            const st = progressMap[l.id];
            return `
            <button class="ls-lesson ${st && st.completed ? "done" : ""} ${idx === currentIdx ? "current" : ""} ${canOpen(l) ? "" : "locked"}" data-go="${idx}">
              <span class="ls-check">${ui().icon("check")}</span>
              <span class="ls-lt"><span class="t">${U().esc(l.title)}</span><span class="d">${ui().icon("video", "icon")} ${U().fmtDuration(l.duration_minutes)}${l.is_preview ? " · preview" : ""}</span></span>
            </button>`;
          }).join("")}
        </div>
      </div>`;
    }).join("");

    U().$$("[data-acc]", box).forEach(h => h.addEventListener("click", () =>
      h.closest(".ls-section").classList.toggle("open")));
    U().$$("[data-go]", box).forEach(b => b.addEventListener("click", () => {
      const idx = Number(b.dataset.go);
      const l = flatLessons[idx];
      if (!(enrolled || isOwner || l.is_preview)) {
        ui().toast("Lesson locked 🔒", `Enroll in “${course.title}” to unlock all lessons.`, "info");
        if (!api().session.token()) location.href = "login.html";
        else location.href = "course-details.html?id=" + course.id;
        return;
      }
      document.body.classList.remove("learn-side-open");
      goTo(idx);
    }));
  }

  function sectionOf(lesson) {
    return course.sections.findIndex(s => s.id === (lesson && lesson.section_id));
  }

  /* ------------------------------------------------------------ stage */
  function goTo(idx, opts) {
    currentIdx = idx;
    const l = flatLessons[idx];
    const stage = document.getElementById("learn-stage");
    const media = U().embedUrl(l.video_url);
    const isDone = progressMap[l.id] && progressMap[l.id].completed;
    const gated = !(enrolled || isOwner) && !l.is_preview;

    stage.innerHTML = `
      <div class="player-wrap">
        ${gated
          ? `<div class="player-empty"><div>${ui().icon("lock")}<h3>This lesson is locked</h3><p>Enroll in the course to unlock the full curriculum.</p><a class="btn btn-primary mt-2" href="course-details.html?id=${course.id}">View course</a></div></div>`
          : media.type === "iframe"
            ? `<iframe src="${U().esc(media.src)}" title="${U().esc(l.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
            : media.type === "video"
              ? `<video src="${U().esc(media.src)}" controls playsinline controlsList="nodownload"></video>`
              : `<div class="player-empty"><div>${ui().icon("note")}<h3>Reading lesson</h3><p>This lesson is text-based — dive into the content below.</p></div></div>`}
      </div>

      <div class="stage-below">
        <div class="stage-title-row">
          <div>
            <p class="text-dim" style="font-size:.78rem">${U().esc(l.sectionTitle || "")} · Lesson ${idx + 1} of ${flatLessons.length}</p>
            <h1>${U().esc(l.title)}</h1>
          </div>
          ${enrolled || isOwner ? `
            <button class="btn ${isDone ? "mark-done-btn completed" : "btn-primary"} mark-done-btn" id="mark-done">
              ${isDone ? `${ui().icon("check")} Completed` : `${ui().icon("check")} Mark as complete`}
            </button>` : ""}
        </div>

        ${l.content && !gated ? `<article class="lesson-content-doc" style="padding:1.4rem 0 0">${linkify(l.content)}</article>` : ""}
        ${l.description && !gated ? `<p class="text-muted mt-2">${U().esc(l.description)}</p>` : ""}

        <div class="stage-nav">
          <button class="btn btn-ghost" id="prev-lesson" ${idx === 0 ? "disabled" : ""}>${ui().icon("arrowL")} Previous lesson</button>
          ${l.resource_url && !gated ? `<a class="resource-card" href="${U().esc(l.resource_url)}" target="_blank" rel="noopener">${ui().icon("download")} <span><b>Lesson resources</b><br><small class="text-dim">Download materials</small></span></a>` : ""}
          <button class="btn btn-soft" id="next-lesson" ${idx === flatLessons.length - 1 ? "disabled" : ""}>Next lesson ${ui().icon("arrowR")}</button>
        </div>

        <div class="lesson-tabs" data-tab-scope>
          <div class="tabs" data-tabs>
            <button class="tab-btn active" data-tab="lt-quizzes">${ui().icon("zap")} Quizzes</button>
            <button class="tab-btn" data-tab="lt-assign">${ui().icon("note")} Assignments</button>
          </div>
          <div id="lt-quizzes" class="tab-panel active"><div id="quiz-list"><div class="skeleton" style="height:70px;border-radius:14px"></div></div></div>
          <div id="lt-assign" class="tab-panel"><div id="assign-list"><div class="skeleton" style="height:70px;border-radius:14px"></div></div></div>
        </div>
      </div>`;

    // lesson handlers
    const done = document.getElementById("mark-done");
    if (done) done.addEventListener("click", () => toggleComplete(l));
    document.getElementById("prev-lesson")?.addEventListener("click", () => goTo(idx - 1));
    document.getElementById("next-lesson")?.addEventListener("click", () => goTo(idx + 1));

    ui().bindTabs(stage);
    renderCurriculum();
    updateTopProgress();
    renderQuizList();
    renderAssignmentList();
    stage.scrollTo({ top: 0, behavior: "smooth" });

    // remember position for direct links
    history.replaceState(null, "", `learning.html?course=${course.id}&lesson=${l.id}`);
  }

  function linkify(text) {
    // ultra-light markdown: ###, ##, #, **bold**, `code`, paragraphs
    const esc = U().esc(text);
    return esc
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .split(/\n{2,}/).map(p => /^<h/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  }

  /* ------------------------------------------------------------ completion */
  async function toggleComplete(lesson) {
    const btn = document.getElementById("mark-done");
    const target = !(progressMap[lesson.id] && progressMap[lesson.id].completed);
    btn.disabled = true;
    const res = await api().post("/progress", { lesson_id: lesson.id, completed: target });
    btn.disabled = false;
    if (!res.success) { ui().toast("Couldn't save progress", res.message, "error"); return; }
    progressMap[lesson.id] = { ...(progressMap[lesson.id] || {}), completed: target };
    updateTopProgress(res.data.completion_percentage);
    renderCurriculum();

    if (target) {
      btn.className = "btn mark-done-btn completed";
      btn.innerHTML = `${ui().icon("check")} Completed`;
      if (res.data.certificate) celebrate(res.data.certificate);
      else if (currentIdx < flatLessons.length - 1) setTimeout(() => goTo(currentIdx + 1), 650);
    } else {
      btn.className = "btn btn-primary mark-done-btn";
      btn.innerHTML = `${ui().icon("check")} Mark as complete`;
    }
  }

  function updateTopProgress(serverPct) {
    let pct = serverPct;
    if (pct == null) {
      const doneN = flatLessons.filter(l => progressMap[l.id] && progressMap[l.id].completed).length;
      pct = flatLessons.length ? Math.round(doneN * 100 / flatLessons.length) : 0;
    }
    const bar = document.getElementById("lt-bar");
    const lbl = document.getElementById("lt-pct");
    if (bar) bar.style.width = pct + "%";
    if (lbl) lbl.textContent = Math.round(pct) + "%";
  }

  /* ------------------------------------------------------------ celebration */
  function celebrate(cert) {
    const wrap = U().el("div", "celebrate");
    wrap.innerHTML = `
      <div class="celebrate-card card">
        <div class="trophy">${ui().icon("trophy")}</div>
        <h2>Course complete! 🎓</h2>
        <p>You finished <b>“${U().esc(course.title)}”</b>.<br>Certificate <b class="mono">${U().esc(cert.certificate_number)}</b> is now in your wallet.</p>
        <div class="flex" style="justify-content:center;gap:.7rem;flex-wrap:wrap">
          <a class="btn btn-primary" href="certificates.html">${ui().icon("cert")} View certificate</a>
          <button class="btn btn-ghost" id="cel-close">Keep learning</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("show"));
    // confetti
    const colors = ["#6e5bff", "#4cd4ff", "#38d9a9", "#ffb45c", "#ff6b8d"];
    for (let i = 0; i < 60; i++) {
      const p = U().el("span", "confetti-piece");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 1.4 + "s";
      p.style.animationDuration = 2.6 + Math.random() * 2 + "s";
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      wrap.appendChild(p);
    }
    const close = () => { wrap.classList.remove("show"); setTimeout(() => wrap.remove(), 500); };
    wrap.querySelector("#cel-close").addEventListener("click", close);
    setTimeout(close, 9000);
  }

  /* ------------------------------------------------------------ quizzes & assignments */
  async function loadAux() {
    // loaded per-lesson render (cheap enough to call on each lesson switch)
  }

  async function renderQuizList() {
    const box = document.getElementById("quiz-list");
    if (!box) return;
    if (!enrolled && !isOwner) { box.innerHTML = ui().emptyState("Locked", "Enroll to take this course's quizzes.", "lock"); return; }
    const res = await api().get(`/courses/${course.id}/quizzes`);
    if (!res.success) { box.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];
    box.innerHTML = items.length ? items.map(q => `
      <div class="quiz-item">
        <span class="qi-ic">${ui().icon("zap")}</span>
        <span class="qi-body">
          <b>${U().esc(q.title)}</b>
          <small>${U().esc(q.description || "")} · pass at ${q.passing_score}%</small>
        </span>
        <button class="btn btn-primary btn-sm" data-quiz="${q.id}">${isOwner ? "Preview" : "Start"} ${ui().icon("arrowR")}</button>
      </div>`).join("")
      : ui().emptyState("No quizzes", "This course has no quizzes yet.", "zap");
    U().$$("[data-quiz]", box).forEach(b => b.addEventListener("click", () =>
      window.LS.quiz.open(b.dataset.quiz)));
  }

  async function renderAssignmentList() {
    const box = document.getElementById("assign-list");
    if (!box) return;
    if (!enrolled && !isOwner) { box.innerHTML = ui().emptyState("Locked", "Enroll to view this course's assignments.", "lock"); return; }
    const res = await api().get(`/courses/${course.id}/assignments`);
    if (!res.success) { box.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];
    box.innerHTML = items.length ? items.map(a => `
      <div class="quiz-item">
        <span class="qi-ic" style="background:var(--sky-soft);color:#8fd8ff">${ui().icon("note")}</span>
        <span class="qi-body">
          <b>${U().esc(a.title)}</b>
          <small>${a.due_date ? "Due " + U().fmtDate(a.due_date) + " · " : ""}${a.my_submission ? (a.my_submission.score != null ? "Graded: " + a.my_submission.score + "/100" : "Submitted") : "Not submitted"}</small>
        </span>
        <button class="btn ${a.my_submission ? "btn-ghost" : "btn-primary"} btn-sm" data-assign="${a.id}">
          ${a.my_submission ? "View" : "Submit"} ${ui().icon("arrowR")}
        </button>
      </div>`).join("")
      : ui().emptyState("No assignments", "This course has no assignments yet.", "note");
    U().$$("[data-assign]", box).forEach(b => b.addEventListener("click", () => {
      const a = items.find(x => x.id === b.dataset.assign);
      window.LS.quiz.openAssignment(a, a.my_submission, { onComplete: renderAssignmentList });
    }));
  }

  /* ------------------------------------------------------------ keyboard nav */
  function bindKeys() {
    document.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea, select")) return;
      if (e.key === "ArrowRight" && currentIdx < flatLessons.length - 1) goTo(currentIdx + 1);
      if (e.key === "ArrowLeft" && currentIdx > 0) goTo(currentIdx - 1);
      if (e.key.toLowerCase() === "f") document.body.classList.toggle("learn-focus");
    });
  }

  window.LS = window.LS || {};
  window.LS.pages = window.LS.pages || {};
  window.LS.pages.initLearning = init;
})();
