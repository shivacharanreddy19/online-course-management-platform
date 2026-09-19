/* ============================================================================
   LearnSphere — courses.js
   • Home page dynamic strips (trending, categories, instructors)
   • Course catalog (search / filters / sort / pagination)
   • Course details page (hero, buy panel, curriculum, reviews, enroll)
   ========================================================================== */
(function () {
  "use strict";
  const U = () => window.LS.utils;
  const api = () => window.LS.api;
  const ui = () => window.LS.ui;

  /* =====================================================================
     HOME — trending courses
     ===================================================================== */
  async function homeCourses() {
    const grid = document.getElementById("home-courses");
    if (!grid) return;
    grid.innerHTML = ui().skeletonCards(4);
    const res = await api().get("/courses?sort=popular&per_page=4", { anon: true });
    if (!res.success) { grid.innerHTML = ui().errorState(res.message, "data-retry"); return; }
    if (!res.data.items.length) {
      grid.innerHTML = ui().emptyState("No courses yet", "Published courses will appear here. Seed some content or publish your first course!", "book");
      return;
    }
    grid.innerHTML = res.data.items.map(c => ui().courseCard(c, { wishBtn: true })).join("");
    ui().bindReveals(grid);
  }

  async function homeCategories() {
    const grid = document.getElementById("home-categories");
    if (!grid) return;
    const icons = { "Programming": "keynote", "Web Development": "globe", "Data Science": "chart", "Artificial Intelligence": "spark", "Database": "layers", "Cloud Computing": "globe", "Cyber Security": "shield", "Business": "wallet", "Design": "edit" };
    const tints = [
      ["rgba(110,91,255,.16)", "#b9adff"], ["rgba(76,212,255,.13)", "#8fd8ff"],
      ["rgba(56,217,169,.13)", "#6fe8c4"], ["rgba(255,180,92,.13)", "#ffce94"],
      ["rgba(255,107,141,.13)", "#ff9db4"],
    ];
    grid.innerHTML = Array.from({ length: 5 }).map(() => `<div class="skeleton" style="height:150px;border-radius:22px"></div>`).join("");
    const res = await api().get("/categories", { anon: true });
    if (!res.success) { grid.innerHTML = ui().errorState(res.message, "data-retry"); return; }
    const cats = (res.data.items || []).slice(0, 8);
    grid.innerHTML = cats.map((c, i) => {
      const [bg, fg] = tints[i % tints.length];
      return `
      <a class="cat-card" data-reveal style="--reveal-delay:${i * 0.05}s;--cat-glow:${bg};--cat-bg:${bg};--cat-fg:${fg}" href="courses.html?category=${c.id}">
        <span class="cat-icon">${ui().icon(icons[c.name] || "book")}</span>
        <span><h3>${U().esc(c.name)}</h3><p>${c.course_count} course${c.course_count === 1 ? "" : "s"}</p></span>
      </a>`;
    }).join("");
    ui().bindReveals(grid);
  }

  async function homeInstructors() {
    const grid = document.getElementById("home-instructors");
    if (!grid) return;
    const res = await api().get("/instructors/featured", { anon: true });
    if (!res.success) { grid.innerHTML = ""; return; }
    const items = res.data.items || [];
    if (!items.length) { document.getElementById("instructors-section")?.classList.add("hidden"); return; }
    grid.innerHTML = items.map((t, i) => `
      <div class="card card-hover instr-card" data-reveal style="--reveal-delay:${i * 0.06}s">
        <div class="instr-avatar" style="background:${ui().gradCss(t.full_name)}">
          ${t.avatar_url ? `<img src="${U().esc(t.avatar_url)}" alt="">` : U().initials(t.full_name)}
        </div>
        <h3>${U().esc(t.full_name || "Instructor")}</h3>
        <p class="role-line">LearnSphere Instructor</p>
        <div class="instr-stats">
          <span><b>${U().fmtNum(t.students_count)}</b>students</span>
          <span><b>${t.courses_count}</b>courses</span>
        </div>
      </div>`).join("");
    ui().bindReveals(grid);
  }

  function bindHomeSearch() {
    const form = document.getElementById("hero-search");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = form.querySelector("input").value.trim();
      location.href = "courses.html" + (q ? "?q=" + encodeURIComponent(q) : "");
    });
  }

  async function initHome() {
    bindHomeSearch();
    await Promise.all([homeCourses(), homeCategories(), homeInstructors()]);
    ui().bindWishlistButtons(document);
  }

  /* =====================================================================
     CATALOG PAGE
     ===================================================================== */
  const cat = {
    page: 1, q: "", category: "", level: "", price: "", min_rating: "", sort: "popular",
  };

  function readCatalogParams() {
    cat.q = U().param("q", "");
    cat.category = U().param("category", "");
    cat.level = U().param("level", "");
    cat.price = U().param("price", "");
    cat.sort = U().param("sort", "popular");
    cat.page = Number(U().param("page", 1)) || 1;
  }

  function catalogQuery() {
    const p = new URLSearchParams({ page: cat.page, per_page: 9, sort: cat.sort });
    if (cat.q) p.set("q", cat.q);
    if (cat.category) p.set("category", cat.category);
    if (cat.level) p.set("level", cat.level);
    if (cat.price) p.set("price", cat.price);
    if (cat.min_rating) p.set("min_rating", cat.min_rating);
    history.replaceState(null, "", "courses.html?" + p.toString());
    return p.toString();
  }

  async function loadCatalog() {
    const grid = document.getElementById("catalog-grid");
    const countEl = document.getElementById("catalog-count");
    grid.innerHTML = ui().skeletonCards(9);
    const res = await api().get("/courses?" + catalogQuery(), { anon: true });
    if (!res.success) {
      grid.innerHTML = ui().errorState(res.message, "data-retry");
      const b = grid.querySelector("[data-retry]");
      if (b) b.addEventListener("click", loadCatalog);
      return;
    }
    const items = res.data.items;
    countEl.textContent = `${res.data.total} course${res.data.total === 1 ? "" : "s"} found`;
    grid.innerHTML = items.length
      ? items.map(c => ui().courseCard(c, { wishBtn: true })).join("")
      : ui().emptyState("No courses match", "Try a different search term or clear the filters.", "search",
          `<button class="btn btn-ghost btn-sm" id="clear-filters">Clear all filters</button>`);
    ui().bindReveals(grid);
    const clear = document.getElementById("clear-filters");
    if (clear) clear.addEventListener("click", resetFilters);
    ui().renderPagination(document.getElementById("catalog-pagination"), res.data, (p) => {
      cat.page = p; loadCatalog(); window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function resetFilters() {
    cat.q = ""; cat.category = ""; cat.level = ""; cat.price = ""; cat.min_rating = ""; cat.page = 1;
    syncFilterUI();
    loadCatalog();
  }

  function syncFilterUI() {
    const si = document.getElementById("filter-search");
    if (si) si.value = cat.q;
    U().$$("#filter-categories .filter-chip").forEach(ch =>
      ch.classList.toggle("active", ch.dataset.value === cat.category || (ch.dataset.value === "" && !cat.category)));
    U().$$("#filter-level .filter-chip, #filter-price .filter-chip").forEach(ch => {
      const group = ch.closest("#filter-level") ? "level" : "price";
      ch.classList.toggle("active", cat[group] === ch.dataset.value || (!cat[group] && ch.dataset.value === ""));
    });
    const sort = document.getElementById("filter-sort");
    if (sort) sort.value = cat.sort;
  }

  async function buildFilterBar() {
    // categories
    const wrap = document.getElementById("filter-categories");
    const res = await api().get("/categories", { anon: true });
    const cats = res.success ? res.data.items : [];
    wrap.innerHTML = `<button class="filter-chip active" data-value="">All</button>` +
      cats.map(c => `<button class="filter-chip" data-value="${c.id}">${U().esc(c.name)}</button>`).join("");
    wrap.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip"); if (!chip) return;
      cat.category = chip.dataset.value; cat.page = 1; syncFilterUI(); loadCatalog();
    });

    // level + price groups
    U().$$("#filter-level, #filter-price").forEach(group => {
      group.addEventListener("click", (e) => {
        const chip = e.target.closest(".filter-chip"); if (!chip) return;
        const key = group.id === "filter-level" ? "level" : "price";
        cat[key] = chip.dataset.value; cat.page = 1; syncFilterUI(); loadCatalog();
      });
    });

    // search (debounced)
    const si = document.getElementById("filter-search");
    si.addEventListener("input", U().debounce(() => { cat.q = si.value.trim(); cat.page = 1; loadCatalog(); }, 420));

    // sort
    document.getElementById("filter-sort").addEventListener("change", (e) => {
      cat.sort = e.target.value; cat.page = 1; loadCatalog();
    });

    // mobile filter drawer
    const drawerBtn = document.getElementById("open-filters");
    if (drawerBtn) drawerBtn.addEventListener("click", () => document.body.classList.add("filters-open"));
  }

  async function initCatalog() {
    readCatalogParams();
    await buildFilterBar();
    syncFilterUI();
    await loadCatalog();
    ui().bindWishlistButtons(document);
  }

  /* =====================================================================
     COURSE DETAILS PAGE
     ===================================================================== */
  let currentCourse = null;

  async function initDetails() {
    const id = U().param("id");
    const root = document.getElementById("details-root");
    if (!id) { root.innerHTML = ui().errorState("Missing course id"); return; }
    root.innerHTML = `<div class="container"><div class="skeleton" style="height:120px;border-radius:22px;margin:2rem 0 1rem"></div><div class="skeleton" style="height:60px;border-radius:18px;width:60%"></div><div class="grid mt-3" style="grid-template-columns:1.5fr 1fr;gap:2rem"><div class="skeleton" style="height:380px;border-radius:22px"></div><div class="skeleton" style="height:380px;border-radius:22px"></div></div></div>`;

    const res = await api().get("/courses/" + id, { anon: true });
    if (!res.success) {
      root.innerHTML = `<div class="container section">${ui().errorState(res.message)}</div>`;
      return;
    }
    currentCourse = res.data.course;
    renderDetails(currentCourse);
  }

  function priceBits(c) {
    const price = U().effectivePrice(c);
    const was = Number(c.price || 0);
    const off = price > 0 && was > price ? Math.round((1 - price / was) * 100) : 0;
    return { price, was, off, free: price === 0 };
  }

  function renderDetails(c) {
    const root = document.getElementById("details-root");
    const v = c.viewer || {};
    const bits = priceBits(c);
    const totalLessons = c.lesson_count || 0;
    const learnOut = (c.what_you_will_learn || "").split("|").map(s => s.trim()).filter(Boolean);
    const reqs = (c.requirements || "").split("|").map(s => s.trim()).filter(Boolean);

    root.innerHTML = `
    <!-- ======================= HERO ======================= -->
    <section class="course-hero">
      <div class="orb orb-1"></div>
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="index.html">Home</a>${ui().icon("chevR")}<a href="courses.html">Courses</a>${ui().icon("chevR")}
          <span class="text-dim">${U().esc(c.title)}</span>
        </nav>
        <div class="course-hero-grid">
          <div data-reveal>
            <div class="ch-badges">
              <span class="pill pill-accent">${U().esc((c.category && c.category.name) || "Course")}</span>
              <span class="pill pill-sky">${({beginner:"Beginner",intermediate:"Intermediate",advanced:"Advanced",all:"All levels"})[c.level] || "All levels"}</span>
              ${c.rating_avg >= 4.5 ? `<span class="pill pill-amber">${ui().icon("star")} Top rated</span>` : ""}
            </div>
            <h1>${U().esc(c.title)}</h1>
            <p class="lead">${U().esc(c.short_description || "")}</p>
            <div class="ch-meta">
              <span class="m cc-rating">${ui().icon("star")} ${c.rating_avg ? c.rating_avg.toFixed(1) + " (" + c.rating_count + " ratings)" : "No ratings yet"}</span>
              <span class="m">${ui().icon("users")} ${U().fmtNum(c.students_count)} students</span>
              <span class="m">${ui().icon("clock")} ${U().fmtDuration(c.duration_minutes)}</span>
              <span class="m">${ui().icon("globe")} ${U().esc(c.language || "English")}</span>
              <span class="m">${ui().icon("play")} ${totalLessons} lessons</span>
            </div>
            <div class="ch-instructor">
              ${U().avatarHTML(c.instructor && c.instructor.full_name, c.instructor && c.instructor.avatar_url, "cc-avatar")}
              <span><b>${U().esc((c.instructor && c.instructor.full_name) || "Instructor")}</b><span>Course instructor</span></span>
            </div>
          </div>

          <!-- pricing / enroll panel -->
          <aside class="card buy-card" data-reveal>
            <div class="buy-thumb">${U().thumbHTML(c)}</div>
            <div class="buy-body">
              <div class="buy-price">
                <span class="now ${bits.free ? "free" : ""}">${bits.free ? "Free" : U().fmtPrice(bits.price)}</span>
                ${bits.off ? `<span class="was">${U().fmtPrice(bits.was)}</span><span class="off">–${bits.off}%</span>` : ""}
              </div>
              <div id="buy-actions"></div>
              <ul class="buy-includes">
                <li>${ui().icon("video")} ${U().fmtDuration(c.duration_minutes)} of content</li>
                <li>${ui().icon("layers")} ${c.sections.length} sections · ${totalLessons} lessons</li>
                <li>${ui().icon("cert")} Certificate of completion</li>
                <li>${ui().icon("zap")} Full lifetime access</li>
                <li>${ui().icon("note")} Quizzes & assignments</li>
              </ul>
              <p class="buy-note">30-day satisfaction guarantee · mock checkout in dev mode</p>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <!-- ======================= BODY ======================= -->
    <section class="section-sm">
      <div class="container" style="max-width:880px">
        <div data-tab-scope>
          <div class="tabs" data-tabs role="tablist">
            <button class="tab-btn active" data-tab="tab-overview">Overview</button>
            <button class="tab-btn" data-tab="tab-curriculum">Curriculum</button>
            <button class="tab-btn" data-tab="tab-reviews">Reviews ${c.rating_count ? `(${c.rating_count})` : ""}</button>
          </div>

          <div id="tab-overview" class="tab-panel active">
            ${learnOut.length ? `
              <h2 class="mb-2" style="font-size:1.3rem">What you'll learn</h2>
              <div class="learn-list mb-3">${learnOut.map(x => `<div class="learn-item">${ui().icon("check")}<span>${U().esc(x)}</span></div>`).join("")}</div>` : ""}
            <h2 class="mb-2" style="font-size:1.3rem">About this course</h2>
            <p class="text-muted" style="white-space:pre-line">${U().esc(c.description || "No description provided.")}</p>
            ${reqs.length ? `
              <h2 class="mb-2 mt-4" style="font-size:1.3rem">Requirements</h2>
              <div class="learn-list">${reqs.map(x => `<div class="learn-item">${ui().icon("arrowR")}<span>${U().esc(x)}</span></div>`).join("")}</div>` : ""}
          </div>

          <div id="tab-curriculum" class="tab-panel">
            <div class="flex-between mb-2 wrap">
              <h2 style="font-size:1.3rem">Course content</h2>
              <span class="text-dim">${c.sections.length} sections · ${totalLessons} lessons · ${U().fmtDuration(c.duration_minutes)}</span>
            </div>
            <div class="accordion" data-accordion>
              ${c.sections.map((s, i) => `
                <div class="acc-item ${i === 0 ? "open" : ""}">
                  <button class="acc-head">
                    <span class="cur-section-head">
                      <span class="cs-n">${String(i + 1).padStart(2, "0")}</span>
                      <span>${U().esc(s.title)}<small>${s.lessons.length} lesson${s.lessons.length === 1 ? "" : "s"}</small></span>
                    </span>
                    <span class="acc-chev">${ui().icon("chevD")}</span>
                  </button>
                  <div class="acc-body" ${i === 0 ? 'style="max-height:600px"' : ""}>
                    <div class="acc-inner" style="padding-left:.4rem;padding-right:.4rem">
                      ${s.lessons.map(l => `
                        <div class="lesson-row ${l.locked ? "locked" : ""} ${l.is_preview ? "preview" : ""}">
                          <span class="l-ic">${ui().icon(l.is_preview ? "play" : l.locked ? "lock" : "video")}</span>
                          <span class="l-title">${U().esc(l.title)}</span>
                          ${l.is_preview ? `<span class="pill pill-accent" style="font-size:.66rem">Preview</span>` : ""}
                          <span class="l-dur">${U().fmtDuration(l.duration_minutes)}</span>
                        </div>`).join("") || `<p class="text-dim" style="padding:.6rem">No lessons yet.</p>`}
                    </div>
                  </div>
                </div>`).join("")}
            </div>
          </div>

          <div id="tab-reviews" class="tab-panel">
            <div id="review-summary"></div>
            ${v.enrolled ? `
              <div class="panel mb-3"><div class="panel-body">
                <h3 class="mb-2">Share your experience</h3>
                <div class="star-input mb-2" id="star-input">
                  ${[1,2,3,4,5].map(n => `<button type="button" data-star="${n}" aria-label="${n} stars">${ui().icon("star")}</button>`).join("")}
                </div>
                <textarea class="textarea mb-2" id="review-text" placeholder="What did you love, and what could be better? (optional)"></textarea>
                <button class="btn btn-primary" id="review-submit">${ui().icon("send")} Publish review</button>
              </div></div>` : ""}
            <div id="reviews-list">${ui().skeletonRows(3)}</div>
            <div class="pagination" id="reviews-pagination"></div>
          </div>
        </div>
      </div>
    </section>`;

    ui().autoBind(root);
    renderBuyActions(c);
    if (c.viewer.enrolled) bindReviewForm(c);
    loadReviews(c, 1);
  }

  /* ---------------- buy / enroll actions ---------------- */
  function renderBuyActions(c) {
    const box = document.getElementById("buy-actions");
    const bits = priceBits(c);
    const v = c.viewer || {};

    if (v.enrolled) {
      box.innerHTML = `
        <a class="btn btn-primary btn-lg btn-block" href="learning.html?course=${c.id}">${ui().icon("play")} Continue learning</a>
        <p class="text-dim" style="text-align:center;font-size:.8rem">${ui().icon("check", "icon")} You're enrolled in this course</p>`;
      return;
    }
    if (v.is_owner) {
      box.innerHTML = `<a class="btn btn-soft btn-block" href="instructor-dashboard.html">Manage this course ${ui().icon("arrowR")}</a>`;
      return;
    }
    box.innerHTML = bits.free
      ? `<button class="btn btn-primary btn-lg btn-block" id="enroll-btn">${ui().icon("grad")} Enroll now — it's free</button>
         <button class="btn btn-ghost btn-block" id="wish-btn">${ui().icon("heart")} Save for later</button>`
      : `<button class="btn btn-primary btn-lg btn-block" id="cart-btn">${ui().icon("cart")} Add to cart · ${U().fmtPrice(bits.price)}</button>
         <button class="btn btn-soft btn-block" id="buy-now-btn">Buy now ${ui().icon("arrowR")}</button>
         <button class="btn btn-ghost btn-block" id="wish-btn">${ui().icon("heart")} Save for later</button>`;

    const needLogin = () => {
      ui().toast("Log in required", "Create a free account to continue.", "info");
      location.href = "login.html?next=" + encodeURIComponent("course-details.html?id=" + c.id);
      return true;
    };

    const enrollBtn = document.getElementById("enroll-btn");
    if (enrollBtn) enrollBtn.addEventListener("click", async () => {
      if (!api().session.token()) return needLogin();
      enrollBtn.disabled = true; enrollBtn.textContent = "Enrolling…";
      const res = await api().post("/enrollments", { course_id: c.id });
      if (res.success) {
        ui().toast("You're in! 🎉", res.data.message || "Enrollment confirmed.", "success");
        c.viewer.enrolled = true;
        renderBuyActions(c);
        setTimeout(() => (location.href = "learning.html?course=" + c.id), 900);
      } else {
        enrollBtn.disabled = false; enrollBtn.textContent = "Enroll now — it's free";
        ui().toast("Could not enroll", res.message, "error");
      }
    });

    const cartBtn = document.getElementById("cart-btn");
    if (cartBtn) cartBtn.addEventListener("click", async () => {
      if (!api().session.token()) return needLogin();
      const res = await api().post("/cart", { course_id: c.id });
      if (res.success) {
        ui().toast("Added to cart 🛒", "Head to checkout when you're ready.", "success");
        cartBtn.innerHTML = `${ui().icon("check")} In your cart`;
        cartBtn.disabled = true;
        ui().initNav && false; // badge refreshes on next page load
      } else if (res.status === 409) {
        cartBtn.innerHTML = `${ui().icon("check")} Already in cart`;
      } else {
        ui().toast("Cart", res.message, "error");
      }
    });

    const buyNow = document.getElementById("buy-now-btn");
    if (buyNow) buyNow.addEventListener("click", async () => {
      if (!api().session.token()) return needLogin();
      const res = await api().post("/cart", { course_id: c.id });
      if (res.success || res.status === 409) location.href = "checkout.html";
      else ui().toast("Checkout", res.message, "error");
    });

    const wishBtn = document.getElementById("wish-btn");
    if (wishBtn) wishBtn.addEventListener("click", async () => {
      if (!api().session.token()) return needLogin();
      const res = await api().post("/wishlist", { course_id: c.id });
      ui().toast(res.success ? "Saved ❤" : "Wishlist", res.success ? "Added to your wishlist." : res.message, res.success ? "success" : "error");
      if (res.success) wishBtn.innerHTML = `${ui().icon("check")} Saved`;
    });
  }

  /* ---------------- reviews ---------------- */
  function bindReviewForm(c) {
    let rating = 0;
    const starBox = document.getElementById("star-input");
    const paint = (n) => U().$$("button", starBox).forEach(b => b.classList.toggle("on", Number(b.dataset.star) <= n));
    U().$$("button", starBox).forEach(b => b.addEventListener("click", () => { rating = Number(b.dataset.star); paint(rating); }));

    document.getElementById("review-submit").addEventListener("click", async () => {
      if (!rating) { ui().toast("Rating needed", "Pick a star rating first.", "info"); return; }
      const text = document.getElementById("review-text").value.trim();
      const res = await api().post(`/courses/${c.id}/reviews`, { rating, review_text: text });
      if (res.success) {
        ui().toast("Review published ⭐", "Thanks for sharing your experience.", "success");
        document.getElementById("review-submit").disabled = true;
        loadReviews(c, 1);
      } else {
        ui().toast("Could not publish", res.message, "error");
      }
    });
  }

  async function loadReviews(c, page) {
    const list = document.getElementById("reviews-list");
    const sum = document.getElementById("review-summary");
    const res = await api().get(`/courses/${c.id}/reviews?page=${page || 1}&per_page=5`, { anon: true });
    if (!res.success) { list.innerHTML = ui().errorState(res.message); return; }
    const s = res.data.summary;
    const total = Object.values(s.distribution).reduce((a, b) => a + b, 0) || 1;
    sum.innerHTML = `
      <div class="review-summary">
        <div class="rs-score">
          <b>${s.avg ? s.avg.toFixed(1) : "—"}</b>
          <div class="stars-row">${U().starsHTML(s.avg, 15)}</div>
          <span class="text-dim" style="font-size:.78rem">${s.count} review${s.count === 1 ? "" : "s"}</span>
        </div>
        <div class="rs-bars">
          ${[5,4,3,2,1].map(n => `
            <div class="rs-bar">
              <span>${n} ★</span>
              <span class="progress"><span class="progress-bar" style="width:${Math.round(100 * (s.distribution[n] || 0) / total)}%;display:block;height:100%"></span></span>
              <span>${s.distribution[n] || 0}</span>
            </div>`).join("")}
        </div>
      </div>`;
    const items = res.data.items;
    list.innerHTML = items.length ? items.map(r => `
      <div class="review-card" data-reveal>
        <div class="review-head">
          ${U().avatarHTML(r.student && r.student.full_name, r.student && r.student.avatar_url, "cell-avatar")}
          <span><b>${U().esc((r.student && r.student.full_name) || "Student")}</b><br><time>${U().timeAgo(r.created_at)}</time></span>
          <span class="stars-row" style="margin-left:auto">${U().starsHTML(r.rating, 13)}</span>
        </div>
        ${r.review_text ? `<p>${U().esc(r.review_text)}</p>` : ""}
      </div>`).join("")
      : ui().emptyState("No reviews yet", "Be the first to share your experience with this course.", "star");
    ui().bindReveals(list);
    ui().renderPagination(document.getElementById("reviews-pagination"), res.data, (p) => loadReviews(c, p));
  }

  /* ===================================================================== */
  window.LS = window.LS || {};
  window.LS.pages = window.LS.pages || {};
  Object.assign(window.LS.pages, { initHome, initCatalog, initDetails });
})();
