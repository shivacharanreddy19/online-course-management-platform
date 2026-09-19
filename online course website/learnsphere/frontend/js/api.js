/* ============================================================================
   LearnSphere — api.js  (central API helper)

   Every frontend request flows through LS.api so auth, error-shape and the
   backend URL live in exactly one place.
   ========================================================================== */
(function () {
  "use strict";

  // ===========================================
  // CHANGE THIS WHEN DEPLOYING THE BACKEND
  // ===========================================
  const API_BASE_URL = "http://localhost:5000/api";
  // ===========================================

  const U = () => window.LS.utils;

  /* ------------------------------------------------ session storage
     Tokens come from POST /api/auth/login|register and are persisted for
     "remember me" style persistent login. The access token (JWT) is sent as
     a Bearer header; on 401 we try the refresh token once. */
  const session = {
    get() { return U().store.get("session", null); },
    set(s) { U().store.set("session", s); },
    clear() { U().store.del("session"); U().store.del("profile"); },
    token() { const s = session.get(); return s && s.access_token; },
    refreshToken() { const s = session.get(); return s && s.refresh_token; },
  };

  let refreshing = null;
  async function tryRefresh() {
    if (!session.refreshToken()) return false;
    if (!refreshing) {
      refreshing = rawRequest("POST", "/auth/refresh", { refresh_token: session.refreshToken() })
        .then((res) => {
          if (res.success && res.data.session) { session.set(res.data.session); return true; }
          session.clear(); return false;
        })
        .catch(() => { session.clear(); return false; })
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  }

  async function rawRequest(method, path, body, opts) {
    opts = opts || {};
    const headers = {};
    if (!(body instanceof FormData)) headers["Content-Type"] = "application/json";
    if (!opts.anon && session.token()) headers["Authorization"] = "Bearer " + session.token();

    let res;
    try {
      res = await fetch(API_BASE_URL + path, {
        method,
        headers,
        body: body == null ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      });
    } catch (e) {
      throw { network: true, message: "Network error — is the backend running on " + API_BASE_URL + "?" };
    }
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    return {
      ok: res.ok,
      status: res.status,
      success: !!(json && json.success),
      message: (json && (json.message || json.error)) || `Request failed (${res.status})`,
      data: json ? json.data : null,
    };
  }

  async function request(method, path, body, opts) {
    const out = await rawRequest(method, path, body, opts);
    if (out.status === 401 && (!opts || !opts.anon)) {
      const refreshed = await tryRefresh();
      if (refreshed) return rawRequest(method, path, body, opts);
    }
    return out;
  }

  const api = {
    base: API_BASE_URL,
    session,
    get: (path, opts) => request("GET", path, null, opts),
    post: (path, body, opts) => request("POST", path, body, opts),
    put: (path, body, opts) => request("PUT", path, body, opts),
    del: (path, opts) => request("DELETE", path, null, opts),
    upload: (file, bucket) => {
      const fd = new FormData();
      fd.append("file", file);
      return request("POST", "/uploads?bucket=" + encodeURIComponent(bucket), fd);
    },
    /** Throws a readable error instead of returning {success:false} — handy in loaders */
    must(res) {
      if (!res.success) {
        const err = new Error(res.message || "Request failed");
        err.status = res.status;
        throw err;
      }
      return res.data;
    },
  };

  window.LS = window.LS || {};
  window.LS.api = api;
})();
