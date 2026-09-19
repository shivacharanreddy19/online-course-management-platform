/* ============================================================================
   LearnSphere — certificate.js
   Certificate wallet page + the printable certificate document.
   ========================================================================== */
(function () {
  "use strict";
  const U = () => window.LS.utils;
  const api = () => window.LS.api;
  const ui = () => window.LS.ui;

  function certDocHTML(cert) {
    return `
    <div class="certificate-doc print-area" id="cert-doc">
      <div class="cert-top">
        <span class="cert-brand">${ui().logoSVG(26)} Learn<b>Sphere</b></span>
        <span class="cert-meta-line">№ ${U().esc(cert.certificate_number)}</span>
      </div>
      <div class="cert-mid">
        <div class="c-kicker">Certificate of Completion</div>
        <p class="c-line" style="margin-top:.6rem">This is proudly presented to</p>
        <div class="c-name">${U().esc(cert.student_name || "Student")}</div>
        <p class="c-line">for successfully completing the course</p>
        <div class="c-course">${U().esc((cert.course && cert.course.title) || "Course")}</div>
      </div>
      <div class="cert-bottom">
        <div class="cert-sign"><div class="sig-line">${U().esc(cert.instructor_name || "Instructor")}<br>Instructor</div></div>
        <div class="cert-sign" style="flex:none">
          ${ui().icon("award", "icon")}
        </div>
        <div class="cert-sign"><div class="sig-line">Issued ${U().fmtDate(cert.issued_at)}<br>LearnSphere</div></div>
      </div>
    </div>`;
  }

  function openCert(cert) {
    const m = ui().modal({
      title: "Certificate of completion",
      size: "xl",
      body: `
        ${certDocHTML(cert)}
        <div class="flex mt-2 wrap" style="justify-content:space-between">
          <span class="hint">Verify at any time with the certificate number.</span>
          <span class="flex">
            <button class="btn btn-ghost btn-sm" id="cert-copy">${ui().icon("file")} Copy number</button>
            <button class="btn btn-primary btn-sm" id="cert-print">${ui().icon("download")} Download / Print</button>
          </span>
        </div>`,
    });
    m.el.querySelector("#cert-print").addEventListener("click", () => window.print());
    m.el.querySelector("#cert-copy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(cert.certificate_number);
        ui().toast("Copied", cert.certificate_number, "success");
      } catch {
        ui().toast("Certificate number", cert.certificate_number, "info", 5000);
      }
    });
  }

  async function initCertificates() {
    const profile = await ui().guard(null);
    if (!profile) return;
    const root = document.getElementById("cert-root");
    root.innerHTML = `<div class="course-grid">${ui().skeletonCards(4)}</div>`;

    const res = await api().get("/certificates");
    if (!res.success) { root.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];

    root.innerHTML = items.length ? `
      <div class="flex-between wrap mb-3" data-reveal>
        <div>
          <h1 style="font-size:1.6rem">Your certificates 🎓</h1>
          <p class="text-dim">${items.length} earned — each one verifiable by its unique number.</p>
        </div>
        <a class="btn btn-soft" href="courses.html">${ui().icon("compass")} Earn another</a>
      </div>
      <div class="course-grid">
        ${items.map(c => `
          <article class="card cert-card" data-reveal>
            <div class="cc-doc-mini">
              <div>
                <div class="mini-kicker">Certificate of Completion</div>
                <div class="mini-name mt-1">${U().esc(c.student_name || profile.full_name || "")}</div>
                <p class="text-dim" style="font-size:.68rem;margin-top:.3rem">${U().esc((c.course && c.course.title) || "")}</p>
              </div>
            </div>
            <div>
              <b style="font-family:var(--font-display);font-size:.95rem">${U().esc((c.course && c.course.title) || "Course")}</b>
              <p class="text-dim" style="font-size:.78rem;margin-top:.2rem">№ <span class="mono">${U().esc(c.certificate_number)}</span><br>Issued ${U().fmtDate(c.issued_at)} · by ${U().esc(c.instructor_name || "Instructor")}</p>
            </div>
            <div class="flex" style="gap:.6rem">
              <button class="btn btn-primary btn-sm w-full" data-view="${c.id}">${ui().icon("eye")} View</button>
              <button class="btn btn-ghost btn-sm w-full" data-print="${c.id}">${ui().icon("download")} Download</button>
            </div>
          </article>`).join("")}
      </div>`
      : ui().emptyState(
          "No certificates yet",
          "Complete a course to 100% and your certificate appears here instantly.",
          "cert",
          `<a class="btn btn-primary btn-sm" href="student-dashboard.html#courses">Resume a course</a>`);

    ui().bindReveals(root);
    root.addEventListener("click", (e) => {
      const v = e.target.closest("[data-view]");
      const p = e.target.closest("[data-print]");
      const id = (v || p) && (v || p).dataset.view || (p && p.dataset.print);
      if (!id) return;
      const cert = items.find(x => x.id === id);
      if (v) openCert(cert);
      else {
        openCert(cert);
        setTimeout(() => window.print(), 700);
      }
    });
  }

  window.LS = window.LS || {};
  window.LS.pages = window.LS.pages || {};
  window.LS.cert = { open: openCert, docHTML: certDocHTML };
  window.LS.pages.initCertificates = initCertificates;
})();
