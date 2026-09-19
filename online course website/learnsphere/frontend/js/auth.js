/* ============================================================================
   LearnSphere — auth.js
   Login / register / forgot-password / reset-password page controllers.
   Auth is proxied through the Flask backend (LS.api), which owns the Supabase
   service-role key. Sessions persist in localStorage ("remember me" for free).
   ========================================================================== */
(function () {
  "use strict";
  const U = () => window.LS.utils;
  const api = () => window.LS.api;
  const ui = () => window.LS.ui;

  /* ---------------------------------------------------------------- helpers */
  function showAlert(kind, msg) {
    const box = document.getElementById("auth-alert");
    if (!box) return;
    box.className = "auth-alert show " + kind;
    box.innerHTML = `${ui().icon(kind === "error" ? "warn" : "check")}<div>${U().esc(msg)}</div>`;
  }
  function hideAlert() {
    const box = document.getElementById("auth-alert");
    if (box) box.className = "auth-alert";
  }
  function fieldError(input, msg) {
    const field = input.closest(".field");
    if (!field) return;
    field.classList.toggle("invalid", !!msg);
    const err = field.querySelector(".field-error");
    if (err && msg) err.textContent = msg;
  }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) {
      btn.dataset.label = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="skeleton" style="width:16px;height:16px;border-radius:50%;display:inline-block"></span> ${label || "Please wait…"}`;
    } else {
      btn.disabled = false;
      if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
  }
  function afterLogin(profile) {
    U().store.set("profile", profile);
    const next = U().param("next");
    if (next) { location.href = next; return; }
    if (profile.role === "instructor" && !profile.is_approved) {
      ui().toast("Account pending", "Your instructor account awaits admin approval.", "info", 6000);
    }
    location.href = ui().dashHref(profile);
  }
  function bindPwToggles() {
    U().$$(".pw-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const input = btn.parentElement.querySelector("input");
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.innerHTML = ui().icon(show ? "eye" : "eyeOff");
      });
    });
  }

  /* ---------------------------------------------------------------- LOGIN */
  async function initLoginPage() {
    /* --- recovery landing? Supabase reset links arrive either as
           ?code=...(PKCE) or #access_token=...&type=recovery (implicit). --- */
    const params = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    if (params.get("code") || hash.get("type") === "recovery") {
      await showResetForm(params.get("code"), hash.get("access_token"));
      return;
    }

    bindPwToggles();
    const form = document.getElementById("login-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      const email = form.email.value.trim();
      const password = form.password.value;
      let okAll = true;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { fieldError(form.email, "Enter a valid email address"); okAll = false; } else fieldError(form.email);
      if (!password) { fieldError(form.password, "Enter your password"); okAll = false; } else fieldError(form.password);
      if (!okAll) return;

      const btn = form.querySelector("[type=submit]");
      busy(btn, true, "Signing in…");
      const res = await api().post("/auth/login", { email, password }, { anon: true });
      busy(btn, false);
      if (!res.success) {
        showAlert("error", res.message || "Login failed — check your credentials.");
        return;
      }
      api().session.set(res.data.session);
      ui().toast("Welcome back 👋", "Signed in as " + (res.data.profile.full_name || email), "success");
      afterLogin(res.data.profile);
    });

    /* forgot password modal */
    const forgot = document.getElementById("forgot-link");
    forgot.addEventListener("click", (e) => {
      e.preventDefault();
      const m = ui().modal({
        title: "Reset your password",
        body: `
          <p class="text-muted mb-2">Enter the email you registered with — we'll send you a secure reset link.</p>
          <form id="forgot-form">
            <div class="field">
              <label class="label" for="f-email">Email</label>
              <input class="input" id="f-email" type="email" placeholder="you@example.com" required>
            </div>
            <div class="auth-alert" id="f-alert"></div>
            <button class="btn btn-primary btn-block" type="submit">${ui().icon("send")} Send reset link</button>
          </form>`,
      });
      const f = m.el.querySelector("#forgot-form");
      f.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const alert = m.el.querySelector("#f-alert");
        const email = f.querySelector("#f-email").value.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          alert.className = "auth-alert show error";
          alert.textContent = "Enter a valid email address.";
          return;
        }
        const btn = f.querySelector("button");
        busy(btn, true, "Sending…");
        const res = await api().post("/auth/forgot-password", { email }, { anon: true });
        busy(btn, false);
        alert.className = "auth-alert show " + (res.success ? "success" : "error");
        alert.textContent = res.success
          ? res.data.message || "If that email is registered, a reset link is on its way."
          : res.message;
        if (res.success) f.reset();
      });
    });
  }

  /* ------------------------------------------------------- RESET PASSWORD */
  async function showResetForm(code, accessToken) {
    let token = accessToken || null;

    // PKCE flow: swap the emailed code for a recovery session first
    if (code && !token) {
      const res = await api().post("/auth/exchange", { code }, { anon: true });
      if (!res.success) {
        showAlert("error", res.message + " — request a new reset link.");
      } else {
        token = res.data.session.access_token;
      }
    }

    // hide the login view entirely (it also holds a duplicate #auth-alert node)
    const loginView = document.getElementById("login-view");
    if (loginView) loginView.remove();
    const view = document.getElementById("reset-view");
    view.classList.remove("hidden");
    bindPwToggles();

    const form = document.getElementById("reset-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      const p1 = form.password.value, p2 = form.password2.value;
      if (p1.length < 6) { fieldError(form.password, "At least 6 characters"); return; }
      fieldError(form.password);
      if (p1 !== p2) { fieldError(form.password2, "Passwords don't match"); return; }
      fieldError(form.password2);
      if (!token) { showAlert("error", "Reset link is invalid or expired — request a new one."); return; }

      const btn = form.querySelector("[type=submit]");
      busy(btn, true, "Updating…");
      const res = await api().put("/auth/reset-password", { access_token: token, password: p1 }, { anon: true });
      busy(btn, false);
      if (!res.success) { showAlert("error", res.message); return; }
      showAlert("success", "Password updated! Redirecting to login…");
      setTimeout(() => (location.href = "login.html"), 1600);
    });
  }

  /* ---------------------------------------------------------------- REGISTER */
  function initRegisterPage() {
    bindPwToggles();
    let role = "student";

    U().$$(".role-card").forEach(card => {
      card.addEventListener("click", () => {
        U().$$(".role-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        role = card.dataset.role;
        document.getElementById("instructor-note").classList.toggle("hidden", role !== "instructor");
      });
    });

    // live password strength meter
    const pw = document.getElementById("r-password");
    const meter = document.getElementById("pw-meter");
    pw.addEventListener("input", () => {
      const v = pw.value;
      let score = 0;
      if (v.length >= 6) score++;
      if (v.length >= 10) score++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
      if (/\d/.test(v) || /[^\w]/.test(v)) score++;
      meter.className = "pw-meter" + (score ? " m" + score : "");
    });

    const form = document.getElementById("register-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      const name = form.full_name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      let okAll = true;
      if (name.length < 2) { fieldError(form.full_name, "Enter your full name"); okAll = false; } else fieldError(form.full_name);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { fieldError(form.email, "Enter a valid email"); okAll = false; } else fieldError(form.email);
      if (password.length < 6) { fieldError(form.password, "At least 6 characters"); okAll = false; } else fieldError(form.password);
      if (!okAll) return;

      const btn = form.querySelector("[type=submit]");
      busy(btn, true, "Creating your account…");
      const res = await api().post("/auth/register", { full_name: name, email, password, role }, { anon: true });
      busy(btn, false);
      if (!res.success) { showAlert("error", res.message || "Registration failed."); return; }
      api().session.set(res.data.session);
      ui().toast("Welcome to LearnSphere 🎉", "Your account is ready.", "success");
      afterLogin(res.data.profile);
    });
  }

  window.LS = window.LS || {};
  window.LS.auth = { initLoginPage, initRegisterPage, showAlert: (k, m) => showAlert(k, m) };
})();
