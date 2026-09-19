/* ============================================================================
   LearnSphere — config.js

   =================================================
   USER MUST ADD SUPABASE FRONTEND CREDENTIALS HERE
   SUPABASE URL:
   SUPABASE ANON/PUBLISHABLE KEY:
   NEVER ADD SERVICE ROLE KEY HERE
   =================================================

   NOTE: LearnSphere proxies ALL authentication + database traffic through the
   Flask backend, so the app works fully WITHOUT these keys. They are provided
   here (clearly marked) for any future direct-to-Supabase browser features.
   ========================================================================== */

// =================================================
// ADD YOUR SUPABASE DETAILS HERE  (OPTIONAL — see note above)
// =================================================
const SUPABASE_URL = "https://ftaigddexautgaxvhwhq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lIq6Z2ppHbWYpoOtkz0WXg_Zx0OHSS6";
// =================================================

window.LS = window.LS || {};
window.LS.config = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  /** true only when the user actually pasted real values */
  supabaseClientReady:
    typeof SUPABASE_URL === "string" &&
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("PASTE") &&
    typeof SUPABASE_ANON_KEY === "string" &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_ANON_KEY.includes("PASTE"),
};
