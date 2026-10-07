/* IMPETVS public settings.
   Everything in this file is PUBLIC (it ships to every visitor and to GitHub). Only put values here that are meant to be public:
   the Supabase project URL, the Supabase "anon" key (protected by the row-level-security rules in backend/supabase/schema.sql),
   and the Naver Client ID. NEVER put a service_role key, a Kakao/Naver client secret, a payment secret key or an SMS key here:
   those live in the Supabase dashboard / Edge Function secrets (see backend/SETUP.md).

   While supabase.url / anonKey are empty, accounts, reviews, inquiries, notices and orders stay switched off
   and each screen says "준비 중" instead of pretending to work. */
window.IMPETVS_CONFIG = {
  supabase: { url: 'https://bjxxilrwbydpcdemrnon.supabase.co', anonKey: 'sb_publishable_m9QpzhyAfdMCaNKKq41S5w_4bM4gPEQ' }, // public project URL + publishable key (anonKey = the publishable key)
  siteUrl: 'https://leeji020810-beep.github.io/IMPETVS',                            // public address of the site, e.g. 'https://<id>.github.io/<repo>' (empty = same folder as the current page)
  kakao: { enabled: false },               // true after the Kakao provider is switched on in Supabase Auth
  naver: { enabled: false, clientId: '' }, // true + Naver Client ID after the naver-login Edge Function is deployed
  sms: { enabled: false },                 // true after an SMS provider is connected to the find-id Edge Function
  payment: { provider: '' },               // 'toss' | 'portone' ... once a payment module is connected (see order.html)
  legalReady: false                        // true ONLY after 이용약관 / 개인정보처리방침 are approved and published
};
