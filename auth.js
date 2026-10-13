/* IMPETVS account + data client (talks to Supabase over plain fetch, no SDK, no secrets).
   - Passwords are only ever sent to the server (HTTPS) and are never stored in the browser.
   - The browser keeps the login TOKENS (not the password) under "impetvs-session": in localStorage when 자동 로그인 was ticked (stays after the browser closes),
     otherwise in sessionStorage (this tab / window only, gone when it is closed). The default is NOT remembered (shared computers).
   - Every permission check (who may write a review, who may read a private inquiry, which prices are valid) is done by the server:
     row-level-security + Edge Functions in backend/supabase/. This file only calls them and reports their real answer. */
(function () {
  'use strict';
  var C = window.IMPETVS_CONFIG || {}, SB = C.supabase || {};
  var SKEY = 'impetvs-session', NKEY = 'impetvs-next', OKEY = 'impetvs-oauth-state';
  var mem = {};
  function lget(k) { try { return window.localStorage.getItem(k); } catch (e) { return mem[k] || null; } }
  function lset(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
  function ldel(k) { try { window.localStorage.removeItem(k); } catch (e) {} delete mem[k]; }
  function sget(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return mem['s' + k] || null; } }
  function sset(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { mem['s' + k] = v; } }
  function sdel(k) { try { window.sessionStorage.removeItem(k); } catch (e) {} delete mem['s' + k]; }

  function backendReady() { return !!(SB.url && SB.anonKey); }
  // sign-up, social login, 1:1 inquiries and orders collect personal data: they also wait for the approved 약관 / 개인정보처리방침
  function legalReady() { return backendReady() && C.legalReady === true; }
  // e-mail sign-up has its own switch: opening it must not open inquiries, orders or social login (those keep using legalReady)
  function signupReady() { return backendReady() && C.signupReady === true; }
  // 1:1 inquiries have their own switch too (they never open orders, social login or payment)
  function inquiryReady() { return backendReady() && C.inquiryReady === true; }
  // the guest order look-up has its own switch too: it never opens orders, payment or social login
  function guestLookupReady() { return backendReady() && C.guestLookupReady === true; }
  function siteBase() {
    if (C.siteUrl) return String(C.siteUrl).replace(/\/$/, '');
    return location.origin + location.pathname.replace(/[^/]*$/, '').replace(/\/$/, '');
  }
  var NOT_READY = '서비스 연결 전입니다. 연결에 필요한 설정이 끝나면 이용할 수 있습니다.';

  /* ---------------------------------------------------------------- session */
  var me = null, listeners = [];
  function parseSession(v) { try { var s = JSON.parse(v); if (s && s.access_token && s.refresh_token) return s; } catch (e) {} return null; }
  function readSession() { return parseSession(lget(SKEY)) || parseSession(sget(SKEY)); }
  function remembered() { return !!parseSession(lget(SKEY)); }
  // remember === true  -> localStorage (자동 로그인); false -> sessionStorage; undefined -> keep where the current session already lives (a token refresh must not change it), else session only
  function writeSession(d, remember) {
    var keep = remember === undefined ? remembered() : remember === true;
    var v = JSON.stringify({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 3600) });
    if (keep) { lset(SKEY, v); sdel(SKEY); } else { sset(SKEY, v); ldel(SKEY); }
    me = null; notify();
  }
  function clearSession() { ldel(SKEY); sdel(SKEY); sdel(NKEY); sdel(OKEY); me = null; notify(); }   // tokens (both places) + the remembered return address / login-state value; the cart is not login data and stays   // tokens + the remembered return address / login-state value; the cart is not login data and stays
  function loggedIn() { return !!readSession(); }
  function notify() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); paintHeader(); }

  /* ---------------------------------------------------------------- request */
  function errorText(res) {
    var c = String(res.code || '').toLowerCase(), m = String(res.message || '').toLowerCase();
    if (res.status === 0 || c === 'network') return '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    if (c === 'not_configured') return NOT_READY;
    if (c === 'invalid_credentials' || m.indexOf('invalid login') > -1) return '이메일 또는 비밀번호가 올바르지 않습니다.';
    if (c === 'email_not_confirmed' || m.indexOf('not confirmed') > -1) return '이메일 인증 후 로그인해 주세요. 가입 시 받은 인증 메일을 확인해 주세요.';
    if (c === 'user_already_exists' || m.indexOf('already registered') > -1) return '이미 가입된 이메일입니다.';
    if (c === 'weak_password' || m.indexOf('password should') > -1) return '비밀번호가 조건을 만족하지 않습니다. 더 길고 복잡하게 설정해 주세요.';
    if (c === 'email_address_invalid' || (m.indexOf('email address') > -1 && m.indexOf('is invalid') > -1)) return '사용할 수 없는 이메일 주소입니다. 주소를 확인해 주세요.';
    if (c === 'validation_failed' && m.indexOf('email') > -1) return '이메일 주소 형식이 올바르지 않습니다.';
    if (m.indexOf('not authorized') > -1 || m.indexOf('error sending') > -1 || c === 'unexpected_failure' && m.indexOf('mail') > -1) return '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도하거나 고객센터(otu_company@naver.com)로 문의해 주세요.';
    if (c === 'signup_disabled' || m.indexOf('signups not allowed') > -1) return '지금은 회원가입을 받지 않습니다.';
    if (c === 'otp_expired' || m.indexOf('expired') > -1) return '인증 링크가 만료되었거나 이미 사용되었습니다. 로그인해 보시고, 안 되면 다시 가입하거나 비밀번호를 재설정해 주세요.';
    if (res.status === 429 || c === 'over_request_rate_limit' || c === 'over_email_send_rate_limit') return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    if (res.status === 401 || res.status === 403) return '권한이 없습니다. 로그인 후 다시 시도해 주세요.';
    if (res.message && /[가-힣]/.test(res.message)) return res.message; // messages written by our own Edge Functions are already Korean
    return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
  function raw(path, o) {
    o = o || {};
    if (!backendReady()) return Promise.resolve({ ok: false, status: 0, code: 'not_configured' });
    var h = { apikey: SB.anonKey, 'Content-Type': 'application/json' };
    // new-style "sb_publishable_…" keys are not JWTs: they go in the apikey header only, never as a Bearer token
    if (o.token) h.Authorization = 'Bearer ' + o.token;
    else if (/^eyJ/.test(SB.anonKey)) h.Authorization = 'Bearer ' + SB.anonKey; // legacy JWT-style anon key
    for (var k in (o.headers || {})) h[k] = o.headers[k];
    return fetch(String(SB.url).replace(/\/$/, '') + path, { method: o.method || 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined })
      .then(function (r) {
        return r.text().then(function (t) {
          var d = null; try { d = t ? JSON.parse(t) : null; } catch (e) {}
          if (r.ok) return { ok: true, status: r.status, data: d };
          return { ok: false, status: r.status, data: d, code: (d && (d.error_code || d.code || d.error)) || '', message: (d && (d.msg || d.message || d.error_description || d.error)) || '' };
        });
      }, function () { return { ok: false, status: 0, code: 'network' }; });
  }
  // refreshes the access token a minute before it expires; resolves with a usable token or null
  function token() {
    var s = readSession(); if (!s) return Promise.resolve(null);
    if (s.expires_at - 60 > Math.floor(Date.now() / 1000)) return Promise.resolve(s.access_token);
    return raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token } }).then(function (r) {
      if (r.ok && r.data && r.data.access_token) { writeSession(r.data); return r.data.access_token; }
      if (r.status === 400 || r.status === 401) clearSession();
      return null;
    });
  }
  function req(path, o) {
    o = o || {};
    if (!o.auth) return raw(path, o);
    return token().then(function (t) {
      if (!t) return { ok: false, status: 401, code: 'not_logged_in' };
      o.token = t; return raw(path, o);
    });
  }

  /* ----------------------------------------------------------------- account */
  // The same rules the database applies. E-mail: trimmed + lower-cased (Supabase Auth stores it that way). Phone: hyphens / spaces / +82 / 82 / 0082 / (0) removed -> 01XXXXXXXXX, else null.
  function normEmail(s) { return String(s || '').trim().toLowerCase(); }
  function normPhone(s) {
    var d = String(s || '').replace(/\D/g, ''), n;
    if (d.indexOf('0082') === 0) n = d.slice(4); else if (d.indexOf('82') === 0) n = d.slice(2); else if (d.charAt(0) === '0') n = d.slice(1); else n = d;
    if (n.charAt(0) === '0') n = n.slice(1);
    return /^1[016789][0-9]{7,8}$/.test(n) ? '0' + n : null;
  }
  // Asks the SERVER whether this e-mail / phone is already registered. One address per call, rate limited on the server, no list is ever returned.
  // -> { ok:true, email:'available|taken|invalid', phone:'available|taken|invalid|none' } | { ok:false, limited:true|false }
  function checkSignup(email, phone) {
    return raw('/rest/v1/rpc/check_signup_available', { method: 'POST', body: { p_email: normEmail(email), p_phone: phone ? String(phone) : null } }).then(function (r) {
      if (r.ok && r.data && r.data.email) return { ok: true, email: r.data.email, phone: r.data.phone };
      return { ok: false, limited: String(r.message || '').indexOf('RATE_LIMITED') > -1 || r.status === 429 };
    });
  }
  // 비회원 주문 조회: ONE server function (guest_order_lookup) checks name + order number + guest password. Nothing is stored in the browser; the password is only sent, never kept.
  function guestLookup(name, orderNo, password) {
    return raw('/rest/v1/rpc/guest_order_lookup', { method: 'POST', body: { p_name: String(name), p_order_no: String(orderNo), p_password: String(password) } }).then(function (r) {
      if (r.ok && r.data && r.data.found === true) return { ok: true, found: true, order: r.data };
      if (r.ok && r.data && r.data.found === false) return { ok: true, found: false };
      var m = String(r.message || '');
      return { ok: false, limited: m.indexOf('RATE_LIMITED') > -1 || r.status === 429, badInput: m.indexOf('BAD_INPUT') > -1, status: r.status, code: r.code };
    });
  }
  function signUp(f) {
    return raw('/auth/v1/signup?redirect_to=' + encodeURIComponent(siteBase() + '/auth-callback.html'), { method: 'POST', body: { email: normEmail(f.email), password: f.password, data: { name: f.name, phone: normPhone(f.phone) || '', consent_terms: true, consent_privacy: true, consent_age14: f.age14 === true, consent_at: new Date().toISOString() } } })
      .then(function (r) {
        if (!r.ok) return { ok: false, message: errorText(r) };
        if (r.data && r.data.access_token) { writeSession(r.data); return { ok: true, loggedIn: true }; }
        return { ok: true, loggedIn: false }; // e-mail confirmation is on: the server sent a confirmation mail
      });
  }
  // remember = the 자동 로그인 box (default off). Only the tokens are kept, never the password.
  function signIn(email, password, remember) {
    return raw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email, password: password } }).then(function (r) {
      if (r.ok && r.data && r.data.access_token) { writeSession(r.data, remember === true); return { ok: true }; }
      return { ok: false, message: errorText(r) };
    });
  }
  function signOut() {
    var s = readSession(); clearSession();
    if (s && backendReady()) return raw('/auth/v1/logout', { method: 'POST', token: s.access_token }).then(function () { return { ok: true }; });
    return Promise.resolve({ ok: true });
  }
  // never reveals whether the address has an account
  function resetRequest(email) {
    return raw('/auth/v1/recover?redirect_to=' + encodeURIComponent(siteBase() + '/reset-password.html'), { method: 'POST', body: { email: email } }).then(function (r) {
      if (r.ok) return { ok: true };
      return { ok: false, message: errorText(r) };
    });
  }
  // e-mail change: the OFFICIAL Supabase procedure (a confirmation mail goes to the new address; the e-mail only changes after that link is used)
  function changeEmail(newEmail) {
    return req('/auth/v1/user?redirect_to=' + encodeURIComponent(siteBase() + '/auth-callback.html'), { auth: true, method: 'PUT', body: { email: normEmail(newEmail) } }).then(function (r) { return r.ok ? { ok: true } : { ok: false, message: errorText(r) }; });
  }
  function updatePassword(accessToken, password) {
    return raw('/auth/v1/user', { method: 'PUT', token: accessToken, body: { password: password } }).then(function (r) { return r.ok ? { ok: true } : { ok: false, message: errorText(r) }; });
  }
  function startKakao() {
    if (!(C.kakao && C.kakao.enabled && legalReady())) return false;
    location.href = String(SB.url).replace(/\/$/, '') + '/auth/v1/authorize?provider=kakao&redirect_to=' + encodeURIComponent(siteBase() + '/auth-callback.html');
    return true;
  }
  function startNaver() {
    if (!(C.naver && C.naver.enabled && C.naver.clientId && legalReady())) return false;
    var st = Math.random().toString(36).slice(2) + Date.now().toString(36); sset(OKEY, st);
    location.href = 'https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=' + encodeURIComponent(C.naver.clientId) + '&redirect_uri=' + encodeURIComponent(siteBase() + '/auth-callback.html') + '&state=' + encodeURIComponent(st);
    return true;
  }
  function parseHash(h) { var o = {}; String(h || '').replace(/^#/, '').split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); }); return o; }
  // Kakao comes back through Supabase with the tokens in the URL fragment
  function finishFromHash(hash) {
    var p = parseHash(hash);
    if (p.error) return { ok: false, message: p.error_description || '소셜 로그인이 취소되었거나 실패했습니다.' };
    if (p.access_token && p.refresh_token) { writeSession({ access_token: p.access_token, refresh_token: p.refresh_token, expires_in: +p.expires_in || 3600 }); return { ok: true }; }
    return { ok: false, message: '로그인 정보를 받지 못했습니다.' };
  }
  // Naver comes back with ?code&state: the Edge Function (which holds the Naver secret) exchanges it
  function finishNaver(code, state) {
    var saved = sget(OKEY); sdel(OKEY);
    if (!code || !state || state !== saved) return Promise.resolve({ ok: false, message: '로그인 요청을 확인하지 못했습니다. 처음부터 다시 시도해 주세요.' });
    return raw('/functions/v1/naver-login', { method: 'POST', body: { code: code, state: state, redirect_uri: siteBase() + '/auth-callback.html' } }).then(function (r) {
      if (!r.ok || !r.data || !r.data.token_hash) return { ok: false, message: errorText(r) };
      return raw('/auth/v1/verify', { method: 'POST', body: { type: 'magiclink', token_hash: r.data.token_hash } }).then(function (v) {
        if (v.ok && v.data && v.data.access_token) { writeSession(v.data); return { ok: true }; }
        return { ok: false, message: errorText(v) };
      });
    });
  }
  // 아이디 찾기: the server checks name + phone and an SMS code, and only then answers with a masked address (never the full one)
  function findIdSend(name, phone) { return raw('/functions/v1/find-id', { method: 'POST', body: { action: 'send', name: name, phone: phone } }).then(function (r) { return r.ok ? { ok: true } : { ok: false, message: errorText(r) }; }); }
  function findIdVerify(name, phone, code) {
    return raw('/functions/v1/find-id', { method: 'POST', body: { action: 'verify', name: name, phone: phone, code: code } }).then(function (r) {
      if (r.ok && r.data && r.data.masked_email) return { ok: true, masked: r.data.masked_email };
      return { ok: false, message: errorText(r) };
    });
  }

  /* ----------------------------------------------------------- profile / role */
  function profile() {
    if (me) return Promise.resolve(me);
    if (!loggedIn()) return Promise.resolve(null);
    return req('/auth/v1/user', { auth: true }).then(function (u) {
      if (!u.ok || !u.data) return null;
      var base = { id: u.data.id, email: u.data.email, name: (u.data.user_metadata && u.data.user_metadata.name) || '', role: 'user' };
      return req('/rest/v1/profiles?select=name,role&id=eq.' + encodeURIComponent(base.id), { auth: true }).then(function (p) {
        if (p.ok && p.data && p.data[0]) { base.name = p.data[0].name || base.name; base.role = p.data[0].role || 'user'; }
        base.isAdmin = base.role === 'admin'; me = base; return me;
      });
    });
  }
  // the server is what really enforces "admin only"; this only decides whether to show the admin controls
  function refreshProfile() { me = null; return profile(); }
  function isAdmin() { return profile().then(function (p) { return !!(p && p.isAdmin); }); }

  /* -------------------------------------------------------------- data (REST) */
  var rest = {
    select: function (table, query, auth) { return req('/rest/v1/' + table + '?' + query, { auth: !!auth && loggedIn() }); },
    insert: function (table, row) { return req('/rest/v1/' + table, { auth: true, method: 'POST', body: row, headers: { Prefer: 'return=representation' } }); },
    update: function (table, query, row) { return req('/rest/v1/' + table + '?' + query, { auth: true, method: 'PATCH', body: row, headers: { Prefer: 'return=representation' } }); },
    remove: function (table, query) { return req('/rest/v1/' + table + '?' + query, { auth: true, method: 'DELETE', headers: { Prefer: 'return=representation' } }); }
  };
  // database functions (the server decides; e.g. submit_review checks the purchase). Always signed in: the member comes from the token, never from the body.
  function rpc(name, body) { return req('/rest/v1/rpc/' + name, { auth: true, method: 'POST', body: body || {} }); }
  function fn(name, body, auth) { return req('/functions/v1/' + name, { auth: !!auth, method: 'POST', body: body }); }

  /* ------------------------------------------------------------------ header */
  function esc(s) { return window.IMShop ? window.IMShop.esc(s) : String(s); }
  document.addEventListener('click', function (e) {
    // the home page draws its header icon AFTER this file ran: do not rely on the painted address, decide at click time (logged in -> 마이쇼핑)
    var ic = e.target.closest && e.target.closest('[data-user-icon]');
    if (ic && loggedIn()) { e.preventDefault(); location.href = (window.IMShop && window.IMShop.links && window.IMShop.links.mypage) || 'mypage.html'; return; }
    var lo = e.target.closest && e.target.closest('[data-logout]');
    if (lo) { signOut().then(function () { if (window.IMShop) window.IMShop.toast('로그아웃되었습니다.'); }); }
  });
  function paintHeader() {
    var on = loggedIn();
    [].forEach.call(document.querySelectorAll('[data-user-icon]'), function (a) {
      var L = (window.IMShop && window.IMShop.links) || {};
      a.setAttribute('aria-label', on ? '마이쇼핑' : '로그인'); a.setAttribute('data-tip', on ? '마이쇼핑' : '로그인'); a.setAttribute('href', on ? (L.mypage || 'mypage.html') : (L.login || 'login.html'));   // logged out: login page; logged in: 마이쇼핑
      if (on) a.setAttribute('data-on', ''); else a.removeAttribute('data-on');
    });
  }
  // icons that appear later (the home page is drawn by React) get their label / address as soon as they exist
  if (window.MutationObserver) { var pend = false; new MutationObserver(function () { if (pend) return; pend = true; setTimeout(function () { pend = false; paintHeader(); }, 50); }).observe(document.documentElement, { childList: true, subtree: true }); }
  window.addEventListener('storage', function (e) { if (e.key === SKEY) { me = null; notify(); } });   // login / logout in another tab with 자동 로그인 shows here too

  /* ------------------------------------------------------------ misc helpers */
  function setNext(href) { sset(NKEY, href); }
  function takeNext() { var v = sget(NKEY); sdel(NKEY); return v; }
  // login required -> remember where to come back to
  function needLogin(next) { setNext(next || (location.hash || (location.pathname.split('/').pop() || ''))); }

  window.IMAuth = {
    cfg: C, backendReady: backendReady, legalReady: legalReady, guestLookupReady: guestLookupReady, guestLookup: guestLookup, signupReady: signupReady, inquiryReady: inquiryReady, loggedIn: loggedIn, profile: profile, isAdmin: isAdmin, onChange: function (f) { listeners.push(f); },
    signUp: signUp, signIn: signIn, changeEmail: changeEmail, refreshProfile: refreshProfile, remembered: remembered, signOut: signOut, resetRequest: resetRequest, updatePassword: updatePassword,
    startKakao: startKakao, startNaver: startNaver, finishFromHash: finishFromHash, finishNaver: finishNaver, parseHash: parseHash,
    clearSession: clearSession, checkSignup: checkSignup, normEmail: normEmail, normPhone: normPhone, findIdSend: findIdSend, findIdVerify: findIdVerify, rest: rest, rpc: rpc, fn: fn, errorText: errorText, NOT_READY: NOT_READY,
    setNext: setNext, takeNext: takeNext, needLogin: needLogin, paintHeader: paintHeader, siteBase: siteBase
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintHeader); else paintHeader();
})();
