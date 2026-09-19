/* ============================================================================
   LearnSphere — payment.js
   Cart, mock checkout and wishlist controllers.

   ⚠ The mock payment form never transmits card data to the server — only the
   chosen payment *method label* is sent, and the backend's payment service
   simulates a successful charge (PAYMENT_MODE=mock).
   ========================================================================== */
(function () {
  "use strict";
  const U = () => window.LS.utils;
  const api = () => window.LS.api;
  const ui = () => window.LS.ui;

  /* ================================================================ CART */
  async function initCart() {
    const profile = await ui().guard(null);
    if (!profile) return;
    const root = document.getElementById("cart-root");
    await paint();

    async function paint() {
      root.innerHTML = `<div class="grid" style="grid-template-columns:1.6fr 1fr;gap:1.4rem;align-items:start">
        <div class="grid">${ui().skeletonRows(3)}</div>
        <div class="skeleton" style="height:260px;border-radius:22px"></div></div>`;
      const res = await api().get("/cart");
      if (!res.success) { root.innerHTML = ui().errorState(res.message); return; }
      const items = res.data.items || [];
      const s = res.data.summary;

      if (!items.length) {
        root.innerHTML = ui().emptyState("Your cart is empty",
          "Courses you add will sit here until checkout.", "cart",
          `<a class="btn btn-primary" href="courses.html">${ui().icon("compass")} Discover courses</a>`);
        return;
      }

      root.innerHTML = `
      <div class="grid" style="grid-template-columns:1.6fr 1fr;gap:1.4rem;align-items:start">
        <div class="grid">
          <h1 data-reveal style="font-size:1.5rem">Your cart <span class="text-dim" style="font-size:1rem;font-weight:500">(${items.length})</span></h1>
          ${items.map(it => {
            const c = it.course || {};
            const price = U().effectivePrice(c);
            return `
            <div class="row-item" data-reveal>
              <a class="row-art" href="course-details.html?id=${c.id}">${U().thumbHTML(c)}</a>
              <div class="row-body">
                <div class="row-title"><a href="course-details.html?id=${c.id}">${U().esc(c.title || "Course")}</a></div>
                <div class="row-sub">${U().esc((c.instructor && c.instructor.full_name) || "")} · ${U().fmtDuration(c.duration_minutes)}</div>
                <div class="flex mt-1">
                  <b style="font-family:var(--font-display)">${price === 0 ? "Free" : U().fmtPrice(price)}</b>
                  ${Number(c.price) > price ? `<s class="text-dim" style="font-size:.8rem">${U().fmtPrice(c.price)}</s>` : ""}
                </div>
              </div>
              <button class="btn btn-danger btn-icon btn-sm" data-remove="${c.id}" aria-label="Remove">${ui().icon("trash")}</button>
            </div>`;
          }).join("")}
        </div>
        <aside class="card summary-card" data-reveal>
          <h3 style="font-size:1.1rem">Order summary</h3>
          <div class="summary-line"><span>Subtotal</span><b>${U().fmtPrice(s.subtotal)}</b></div>
          <div class="summary-line"><span>Discounts</span><span class="save">–${U().fmtPrice(s.discount)}</span></div>
          <div class="summary-line total"><span>Total</span><span>${U().fmtPrice(s.total)}</span></div>
          <a class="btn btn-primary btn-lg btn-block mt-1" href="checkout.html">${ui().icon("lock")} Secure checkout</a>
          <a class="btn btn-ghost btn-block btn-sm" href="courses.html">Keep browsing</a>
          <p class="hint" style="text-align:center">${ui().icon("shield", "icon")} Mock payment mode — no real charge.</p>
        </aside>
      </div>`;

      ui().bindReveals(root);
      U().$$("[data-remove]", root).forEach(btn => btn.addEventListener("click", async () => {
        const res2 = await api().del("/cart/" + btn.dataset.remove);
        if (res2.success) { ui().toast("Removed", "Course removed from cart.", "success"); paint(); }
        else ui().toast("Cart", res2.message, "error");
      }));
    }
  }

  /* ============================================================ CHECKOUT */
  async function initCheckout() {
    const profile = await ui().guard(null);
    if (!profile) return;
    const root = document.getElementById("checkout-root");

    const res = await api().get("/cart");
    if (!res.success) { root.innerHTML = ui().errorState(res.message); return; }
    const items = res.data.items || [];
    const s = res.data.summary;

    if (!items.length) {
      root.innerHTML = ui().emptyState("Nothing to check out",
        "Your cart is empty — add a course first.", "cart",
        `<a class="btn btn-primary" href="courses.html">Browse courses</a>`);
      return;
    }

    root.innerHTML = `
    <div class="grid" style="grid-template-columns:1.5fr 1fr;gap:1.6rem;align-items:start">
      <div>
        <h1 data-reveal style="font-size:1.6rem;margin-bottom:1.2rem">Checkout</h1>
        <div class="panel" data-reveal>
          <div class="panel-head"><h3>${ui().icon("wallet")} Payment method</h3><span class="pill pill-amber">MOCK MODE</span></div>
          <div class="panel-body">
            <form id="pay-form">
              <div class="grid" style="gap:.6rem;margin-bottom:1.2rem">
                <label class="check pay-method"><input type="radio" name="method" value="mock_card" checked><span class="box">${ui().icon("check")}</span> Card (mock)</label>
                <label class="check pay-method"><input type="radio" name="method" value="mock_upi"><span class="box">${ui().icon("check")}</span> UPI (mock)</label>
                <label class="check pay-method"><input type="radio" name="method" value="mock_wallet"><span class="box">${ui().icon("check")}</span> Wallet (mock)</label>
              </div>

              <div id="card-fields">
                <div class="field"><label class="label">Name on card</label><input class="input" id="card-name" placeholder="Demo User" autocomplete="off"></div>
                <div class="field"><label class="label">Card number</label>
                  <div class="input-group">${ui().icon("lock", "icon")}<input class="input" id="card-num" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19" autocomplete="off"></div>
                  <span class="hint">Demo only — the number never leaves your browser and is never stored.</span>
                </div>
                <div class="grid" style="grid-template-columns:1fr 1fr;gap:1rem">
                  <div class="field"><label class="label">Expiry</label><input class="input" id="card-exp" placeholder="12/28" maxlength="5" autocomplete="off"></div>
                  <div class="field"><label class="label">CVV</label><input class="input" id="card-cvv" type="password" inputmode="numeric" placeholder="•••" maxlength="4" autocomplete="off"></div>
                </div>
              </div>

              <button class="btn btn-primary btn-lg btn-block" type="submit" id="pay-btn">
                ${ui().icon("lock")} Pay ${U().fmtPrice(s.total)}
              </button>
              <p class="hint mt-1" style="text-align:center">🔒 Simulated payment — Razorpay can be enabled later via <code>services/payment_service.py</code>.</p>
            </form>
          </div>
        </div>
      </div>

      <aside class="grid">
        <div class="card summary-card" data-reveal>
          <h3 style="font-size:1.1rem">Order summary</h3>
          <div class="grid" style="gap:.6rem;max-height:260px;overflow-y:auto">
            ${items.map(it => {
              const c = it.course || {};
              return `<div class="flex" style="justify-content:space-between;gap:.8rem">
                <span class="text-muted" style="font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U().esc(c.title || "Course")}</span>
                <b style="white-space:nowrap;font-size:.88rem">${U().fmtPrice(U().effectivePrice(c))}</b>
              </div>`;
            }).join("")}
          </div>
          <div class="summary-line"><span>Subtotal</span><b>${U().fmtPrice(s.subtotal)}</b></div>
          <div class="summary-line"><span>Discounts</span><span class="save">–${U().fmtPrice(s.discount)}</span></div>
          <div class="summary-line total"><span>Total</span><span>${U().fmtPrice(s.total)}</span></div>
        </div>
      </aside>
    </div>`;

    ui().bindReveals(root);

    // toggle card fields by method
    U().$$("input[name=method]", root).forEach(r => r.addEventListener("change", () => {
      document.getElementById("card-fields").style.display =
        document.querySelector("input[name=method]:checked").value === "mock_card" ? "" : "none";
    }));

    // cosmetic card formatting (never transmitted)
    const num = document.getElementById("card-num");
    num.addEventListener("input", () => {
      num.value = num.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
    });
    const exp = document.getElementById("card-exp");
    exp.addEventListener("input", () => {
      let v = exp.value.replace(/\D/g, "").slice(0, 4);
      exp.value = v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v;
    });

    document.getElementById("pay-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const method = document.querySelector("input[name=method]:checked").value;
      const btn = document.getElementById("pay-btn");
      btn.disabled = true;
      btn.innerHTML = `<span class="skeleton" style="width:16px;height:16px;border-radius:50%"></span> Processing payment…`;
      // tiny delay so the (simulated) payment feels real
      await new Promise(r => setTimeout(r, 900));
      const res = await api().post("/orders", { payment_method: method });
      if (!res.success) {
        btn.disabled = false;
        btn.innerHTML = `${ui().icon("lock")} Pay ${U().fmtPrice(s.total)}`;
        ui().toast("Payment failed", res.message, "error");
        return;
      }
      const order = res.data.order;
      root.innerHTML = `
        <div class="state" style="padding-top:5rem" data-reveal>
          <div class="state-icon" style="width:88px;height:88px;border-radius:28px;background:var(--mint-soft);color:var(--mint);box-shadow:0 0 60px rgba(56,217,169,.35)">${ui().icon("check")}</div>
          <h1 style="font-size:1.8rem">Payment successful 🎉</h1>
          <p style="max-width:52ch">You're enrolled in <b>${order.courses.length}</b> course${order.courses.length === 1 ? "" : "s"}.
             Order <span class="mono">${order.transaction_id}</span> · total <b>${U().fmtPrice(order.total_amount)}</b>.</p>
          <div class="flex mt-2 wrap" style="justify-content:center">
            <a class="btn btn-primary btn-lg" href="student-dashboard.html">${ui().icon("play")} Start learning</a>
            <a class="btn btn-ghost btn-lg" href="courses.html">Keep exploring</a>
          </div>
        </div>`;
      ui().bindReveals(root);
      ui().toast("Enrollment confirmed 🎓", "Welcome aboard!", "success", 5000);
    });
  }

  /* ============================================================ WISHLIST */
  async function initWishlist() {
    const profile = await ui().guard(null);
    if (!profile) return;
    const root = document.getElementById("wishlist-root");
    await paint();

    async function paint() {
      root.innerHTML = `<div class="course-grid">${ui().skeletonCards(4)}</div>`;
      const res = await api().get("/wishlist");
      if (!res.success) { root.innerHTML = ui().errorState(res.message); return; }
      const items = res.data.items || [];
      if (!items.length) {
        root.innerHTML = ui().emptyState("Your wishlist is empty",
          "Tap the ♥ on any course to save it here for later.", "heart",
          `<a class="btn btn-primary" href="courses.html">Find something to learn</a>`);
        return;
      }
      root.innerHTML = `
        <h1 data-reveal style="font-size:1.5rem;margin-bottom:1.2rem">Wishlist <span class="text-dim" style="font-size:1rem;font-weight:500">(${items.length})</span></h1>
        <div class="course-grid">
          ${items.map(it => {
            const c = it.course || {};
            const price = U().effectivePrice(c);
            return `
            <article class="course-card" data-reveal>
              <a class="cc-thumb" href="course-details.html?id=${c.id}">${U().thumbHTML(c)}</a>
              <button class="cc-fav active" data-remove="${c.id}" aria-label="Remove from wishlist">${ui().icon("heart")}</button>
              <div class="cc-body">
                <span class="cc-cat">${U().esc((c.category && c.category.name) || "Course")}</span>
                <h3 class="cc-title"><a href="course-details.html?id=${c.id}">${U().esc(c.title)}</a></h3>
                <div class="cc-meta">
                  <span class="m cc-rating">${ui().icon("star")} ${c.rating_avg ? c.rating_avg.toFixed(1) : "New"}</span>
                  <span class="m">${ui().icon("users")} ${U().fmtNum(c.students_count)}</span>
                  <span class="m">${ui().icon("clock")} ${U().fmtDuration(c.duration_minutes)}</span>
                </div>
                <div class="cc-foot">
                  <span class="cc-price ${price === 0 ? "free" : ""}">${price === 0 ? "Free" : U().fmtPrice(price)}</span>
                  <button class="btn btn-primary btn-sm" data-move="${c.id}" data-price="${price}">${price === 0 ? "Enroll" : "Add to cart"}</button>
                </div>
              </div>
            </article>`;
          }).join("")}
        </div>`;
      ui().bindReveals(root);

      U().$$("[data-remove]", root).forEach(btn => btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const res2 = await api().del("/wishlist/" + btn.dataset.remove);
        if (res2.success) { ui().toast("Removed", "", "success"); paint(); }
      }));

      U().$$("[data-move]", root).forEach(btn => btn.addEventListener("click", async () => {
        const id = btn.dataset.move;
        btn.disabled = true;
        if (Number(btn.dataset.price) === 0) {
          const res2 = await api().post("/enrollments", { course_id: id });
          if (res2.success) {
            ui().toast("Enrolled 🎉", "See you in the classroom.", "success");
            await api().del("/wishlist/" + id);
            paint();
          } else { ui().toast("Enroll", res2.message, "error"); btn.disabled = false; }
        } else {
          const res2 = await api().post("/cart", { course_id: id });
          if (res2.success || res2.status === 409) {
            if (res2.success) {
              await api().del("/wishlist/" + id);
              ui().toast("Moved to cart 🛒", "", "success");
              paint();
            } else {
              ui().toast("Already in cart", "This course is waiting in your cart.", "info");
              btn.disabled = false;
            }
          } else { ui().toast("Cart", res2.message, "error"); btn.disabled = false; }
        }
      }));
    }
  }

  window.LS = window.LS || {};
  window.LS.pages = window.LS.pages || {};
  Object.assign(window.LS.pages, { initCart, initCheckout, initWishlist });
})();
