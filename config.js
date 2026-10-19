/* IMPETVS public settings.
   Everything in this file is PUBLIC (it ships to every visitor and to GitHub). Only put values here that are meant to be public:
   the Supabase project URL, the Supabase "anon" key (protected by the row-level-security rules in backend/supabase/schema.sql),
   (the Naver Client ID is a function secret now). NEVER put a service_role key, a Kakao/Naver client secret, a payment secret key or an SMS key here:
   those live in the Supabase dashboard / Edge Function secrets (see backend/SETUP.md).

   While supabase.url / anonKey are empty, accounts, reviews, inquiries, notices and orders stay switched off
   and each screen says "준비 중" instead of pretending to work. */
window.IMPETVS_CONFIG = {
  supabase: { url: 'https://bjxxilrwbydpcdemrnon.supabase.co', anonKey: 'sb_publishable_m9QpzhyAfdMCaNKKq41S5w_4bM4gPEQ' }, // public project URL + publishable key (anonKey = the publishable key)
  siteUrl: 'https://leeji020810-beep.github.io/IMPETVS',                            // public address of the site, e.g. 'https://<id>.github.io/<repo>' (empty = same folder as the current page)
  kakao: { enabled: true },                // Kakao login is open to everyone (tested 2026-10-16). Needs socialLoginReady: true.
  naver: { enabled: true },                // Naver login is open to everyone (Naver approved the app on 2026-10-19). Needs socialLoginReady: true.
  socialLoginReady: true,                  // Kakao login (and, later, Naver) are open. SEPARATE from legalReady and from payment: it opens NOTHING else (no orders, no payment).
  sms: { enabled: false },                 // true after an SMS provider is connected to the find-id Edge Function
  payment: { provider: 'toss', clientKey: '', live: false }, // Toss Payments. clientKey = the PUBLIC client key (test_gck_… for tests). live: true ONLY after contract, review and live keys are done (see backend/TOSS-SETUP.md). The SECRET key never goes here.
  signupReady: true,                       // e-mail sign-up (회원가입). SEPARATE from legalReady: 이용약관 / 개인정보처리방침 are published and the server is verified. Set false to close sign-up again.
  kakaoChat: { url: 'https://pf.kakao.com/_xdxjeFX/chat' },   // IMPETVS official Kakao channel, 1:1 chat link (given by the owner; the http:// form redirects to this https:// address). Empty = no button.
  kakaoShare: { jsKey: 'a7e68dd38edffeb642ae15db51a8b6f3', ready: true },   // Kakao JavaScript key (PUBLIC key from developers.kakao.com -> 앱 -> 플랫폼 키 -> JavaScript 키; the site address must be registered as its JavaScript SDK domain). ready: true = the 카카오톡 share entry is open to every visitor (the privacy policy naming the Kakao SDK is published); false closes it again. NOT the REST API key / Client Secret used for login.
  inquiryReady: true,                      // 1:1 문의 (members write, members + admin read). SEPARATE from legalReady. Set false to close it again.
  guestLookupReady: true,                  // 비회원 주문 조회 (server function guest_order_lookup, see backend/supabase/schema.sql). SEPARATE from legalReady: it opens NOTHING else (no orders, no payment, no social login). Set false to close it.
  legalReady: false                        // still false on purpose: it opens 주문 입력 (the order form), which waits for the payment service
};
