/* ============================================================================
   LearnSphere — quiz.js
   Interactive quiz-taking experience (opened from the learning workspace):
   question stepper → submit → graded result with per-question review.
   Also exposes the assignment submission modal.
   ========================================================================== */
(function () {
  "use strict";
  const U = () => window.LS.utils;
  const api = () => window.LS.api;
  const ui = () => window.LS.ui;

  /* ================================================================ QUIZ */
  async function openQuiz(quizId, opts) {
    opts = opts || {};
    const res = await api().get("/quizzes/" + quizId);
    if (!res.success) { ui().toast("Quiz unavailable", res.message, "error"); return; }
    const { quiz, questions, best_attempt, is_owner } = res.data;

    if (!questions.length) {
      ui().toast("Quiz is empty", "This quiz has no questions yet.", "info");
      return;
    }

    // owners preview the answers instead of taking the quiz
    if (is_owner) {
      const m = ui().modal({
        title: quiz.title + " — instructor preview",
        size: "lg",
        body: questions.map((q, i) => `
          <div class="mb-3">
            <b>Q${i + 1}. ${U().esc(q.question)}</b>
            <div class="grid mt-1" style="gap:.5rem">
              ${["a","b","c","d"].map(k => `
                <div class="quiz-opt ${q.correct_option === k ? "correct" : ""}" style="cursor:default">
                  <span class="q-letter">${k.toUpperCase()}</span> ${U().esc(q["option_" + k] || "")}
                </div>`).join("")}
            </div>
          </div>`).join(""),
      });
      return;
    }

    const answers = {};
    let idx = 0;

    const m = ui().modal({ title: quiz.title, size: "lg", body: `<div id="quiz-stage"></div>` });
    const stage = m.el.querySelector("#quiz-stage");

    function paint() {
      const q = questions[idx];
      const letters = ["a", "b", "c", "d"];
      stage.innerHTML = `
        <div class="quiz-q-meta">
          <span>Question <b>${idx + 1}</b> / ${questions.length}</span>
          <span class="progress"><span class="progress-bar" style="display:block;height:100%;width:${(idx) / questions.length * 100}%"></span></span>
          <span class="pill pill-accent">Pass mark ${quiz.passing_score}%</span>
        </div>
        <h3 style="font-size:1.12rem;margin-bottom:1.1rem">${U().esc(q.question)}</h3>
        <div class="grid" style="gap:.6rem">
          ${letters.map(k => q["option_" + k] ? `
            <button class="quiz-opt ${answers[q.id] === k ? "selected" : ""}" data-k="${k}">
              <span class="q-letter">${k.toUpperCase()}</span><span>${U().esc(q["option_" + k])}</span>
            </button>` : "").join("")}
        </div>
        <div class="flex-between mt-3">
          <button class="btn btn-ghost btn-sm" id="q-prev" ${idx === 0 ? "disabled" : ""}>${ui().icon("arrowL")} Previous</button>
          <span class="text-dim" style="font-size:.78rem">${Object.keys(answers).length} of ${questions.length} answered</span>
          ${idx < questions.length - 1
            ? `<button class="btn btn-primary btn-sm" id="q-next">Next ${ui().icon("arrowR")}</button>`
            : `<button class="btn btn-primary" id="q-submit">${ui().icon("send")} Submit quiz</button>`}
        </div>`;
      U().$$(".quiz-opt", stage).forEach(btn => btn.addEventListener("click", () => {
        answers[q.id] = btn.dataset.k;
        U().$$(".quiz-opt", stage).forEach(b => b.classList.toggle("selected", b.dataset.k === answers[q.id]));
      }));
      const prev = stage.querySelector("#q-prev");
      const next = stage.querySelector("#q-next");
      const submit = stage.querySelector("#q-submit");
      if (prev) prev.addEventListener("click", () => { idx--; paint(); });
      if (next) next.addEventListener("click", () => { idx++; paint(); });
      if (submit) submit.addEventListener("click", submitQuiz);
    }

    async function submitQuiz() {
      const missing = questions.length - Object.keys(answers).length;
      if (missing > 0) {
        const go = await ui().confirmDialog("Unanswered questions",
          `You skipped ${missing} question${missing === 1 ? "" : "s"}. Submit anyway?`, "Submit anyway");
        if (!go) return;
      }
      const res = await api().post(`/quizzes/${quizId}/submit`, { answers });
      if (!res.success) { ui().toast("Could not submit", res.message, "error"); return; }
      const { score, passed, results } = res.data;
      stage.innerHTML = `
        <div class="quiz-result-score">
          <div class="big ${passed ? "pass" : "fail"}">${Math.round(score)}%</div>
          <p class="text-muted">${passed ? "You passed! 🎉" : "Not quite — you can retake anytime."} (pass mark ${quiz.passing_score}%)</p>
          <button class="btn btn-ghost btn-sm mt-2" id="q-review">${ui().icon("eye")} Review answers</button>
        </div>
        <div id="q-review-box" class="hidden">
          ${results.map((r, i) => {
            const q = questions.find(qx => qx.id === r.question_id) || {};
            return `
            <div class="mb-3" style="border-top:1px solid var(--line);padding-top:1rem">
              <b>Q${i + 1}. ${U().esc(q.question || "")}</b>
              <div class="grid mt-1" style="gap:.5rem">
                ${["a","b","c","d"].map(k => q["option_" + k] ? `
                  <div class="quiz-opt ${r.correct_option === k ? "correct" : r.given === k ? "wrong" : ""}" style="cursor:default">
                    <span class="q-letter">${k.toUpperCase()}</span><span>${U().esc(q["option_" + k])}</span>
                    ${r.correct_option === k ? ui().icon("check") : r.given === k ? ui().icon("x") : ""}
                  </div>` : "").join("")}
              </div>
            </div>`;
          }).join("")}
        </div>
        <div class="flex" style="justify-content:center;gap:.7rem;margin-top:1rem">
          <button class="btn btn-soft" id="q-retry">${ui().icon("zap")} Retake</button>
          <button class="btn btn-primary" id="q-done">Done</button>
        </div>`;
      stage.querySelector("#q-done").addEventListener("click", () => { m.close(); opts.onComplete && opts.onComplete(); });
      stage.querySelector("#q-retry").addEventListener("click", () => { Object.keys(answers).forEach(k => delete answers[k]); idx = 0; paint(); });
      const review = stage.querySelector("#q-review");
      review.addEventListener("click", () => stage.querySelector("#q-review-box").classList.toggle("hidden"));
      if (opts.onComplete) opts.onComplete({ passed, score });
    }

    paint();
  }

  /* =========================================================== ASSIGNMENT */
  async function openAssignment(assignment, mySubmission, opts) {
    opts = opts || {};
    const m = ui().modal({
      title: assignment.title,
      size: "lg",
      body: `
        ${assignment.description ? `<p class="text-muted mb-2" style="white-space:pre-line">${U().esc(assignment.description)}</p>` : ""}
        ${assignment.due_date ? `<p class="pill pill-amber mb-2">${ui().icon("clock")} Due ${U().fmtDate(assignment.due_date)}</p>` : ""}
        <div class="dropdown-divider"></div>
        <form id="assign-form" class="${mySubmission ? "hidden" : ""}">
          <div class="field">
            <label class="label">Your answer</label>
            <textarea class="textarea" id="a-text" placeholder="Write your submission here…"></textarea>
          </div>
          <div class="field">
            <label class="label">Attach a file (optional)</label>
            <div class="input-group">
              <input class="input" type="file" id="a-file" style="padding:.6rem 1rem">
            </div>
            <span class="hint">Uploaded securely to Supabase Storage · max 200 MB</span>
          </div>
          <button class="btn btn-primary" type="submit">${ui().icon("send")} Submit assignment</button>
        </form>
        <div id="assign-status" class="${mySubmission ? "" : "hidden"}"></div>`,
    });

    const status = m.el.querySelector("#assign-status");
    const form = m.el.querySelector("#assign-form");
    paintStatus(mySubmission);

    function paintStatus(sub) {
      if (!sub) return;
      status.classList.remove("hidden");
      status.innerHTML = `
        <div class="panel"><div class="panel-body">
          <div class="flex-between wrap">
            <b>${ui().icon("check", "icon")} Submitted ${U().timeAgo(sub.submitted_at)}</b>
            ${sub.score != null ? `<span class="pill pill-mint">Score ${sub.score}/100</span>` : `<span class="pill pill-amber">Awaiting grade</span>`}
          </div>
          ${sub.submission_text ? `<p class="text-muted mt-1" style="white-space:pre-line;font-size:.88rem">${U().esc(sub.submission_text)}</p>` : ""}
          ${sub.file_url ? `<a class="resource-card mt-2" href="${U().esc(sub.file_url)}" target="_blank" rel="noopener">${ui().icon("file")} <b>Your attached file</b> ${ui().icon("arrowR")}</a>` : ""}
          ${sub.feedback ? `<div class="mt-2" style="border-left:3px solid var(--accent);padding:.6rem 1rem;background:var(--accent-soft);border-radius:0 10px 10px 0"><b style="font-size:.82rem">Instructor feedback</b><p style="font-size:.88rem">${U().esc(sub.feedback)}</p></div>` : ""}
          <button class="btn btn-ghost btn-sm mt-2" id="a-resubmit">${ui().icon("edit")} Resubmit</button>
        </div></div>`;
      status.querySelector("#a-resubmit").addEventListener("click", () => {
        form.classList.remove("hidden");
        status.classList.add("hidden");
        form.querySelector("#a-text").value = sub.submission_text || "";
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = form.querySelector("#a-text").value.trim();
      const file = form.querySelector("#a-file").files[0];
      if (!text && !file) { ui().toast("Nothing to submit", "Write an answer or attach a file.", "info"); return; }
      const btn = form.querySelector("[type=submit]");
      btn.disabled = true; btn.textContent = "Submitting…";
      let file_url = null;
      if (file) {
        const up = await api().upload(file, "assignment-submissions");
        if (!up.success) { ui().toast("Upload failed", up.message, "error"); btn.disabled = false; btn.textContent = "Submit assignment"; return; }
        file_url = up.data.url;
      }
      const res = await api().post(`/assignments/${assignment.id}/submit`, { submission_text: text, file_url });
      btn.disabled = false; btn.textContent = "Submit assignment";
      if (!res.success) { ui().toast("Could not submit", res.message, "error"); return; }
      ui().toast("Submitted 🎉", "Your instructor will grade it soon.", "success");
      form.classList.add("hidden");
      paintStatus({ submitted_at: new Date().toISOString(), submission_text: text, file_url, score: null });
      if (opts.onComplete) opts.onComplete();
    });
  }

  window.LS = window.LS || {};
  window.LS.quiz = { open: openQuiz, openAssignment };
})();
