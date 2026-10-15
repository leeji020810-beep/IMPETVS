/* IMPETVS shop helpers: product data, cart (localStorage), order hand-off, shared header, toast, share.
   Nothing here logs anyone in, takes orders or processes payments by itself:
   accounts, reviews, inquiries and orders go through auth.js -> the server (Supabase), and stay disabled until config.js is filled in. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ config */
  // One product, two capacities. Prices are per capacity (KRW). stock: null = no stock data (no upper limit).
  // The server keeps its own price table (backend/supabase/schema.sql) and re-checks every order against it.
  var PRODUCT_ID = 'impetvs-rich-man';
  var PRODUCTS = {};
  PRODUCTS[PRODUCT_ID] = {
    id: PRODUCT_ID,
    name: '임페투스 리치맨',
    sub: '섬유향수 · Eau De Perfume',
    stock: null,
    maxQty: 30,            // per PRODUCT, 30ml + 50ml together (the server enforces the same limit: backend/supabase/functions/_shared/orders.ts)
    defaultOption: '30ml',
    options: {
      '30ml': { key: '30ml', price: 59000, img: 'opt/product-main.webp', alt: '임페투스 리치맨 30ml 향수 병' },
      '50ml': { key: '50ml', price: 99000, img: 'opt/product-main-50ml.webp', alt: '임페투스 리치맨 50ml 향수 병' }
    }
  };
  // IMPETVS shipping fee (owner decision, FINAL 2026-10-15) - an internal operating standard, NOT a contract rate. It applies to every new order, whatever the amount.
  //   일반 지역 0원(무료) | 제주 3,000원 | 제주 외 도서산간 5,000원 = the TOTAL fee of the region (never added together or to anything else).
  // The region is decided from the 5-digit 우편번호 only. Mirrored on the server (backend/supabase/functions/_shared/shipping.ts), which recomputes the real amount:
  // this copy only DISPLAYS it (backend/tests/payments.test.ts checks that both tables are identical).
  // DATA STATUS: 제주 = 63000-63644 (all of 제주특별자치도). 도서산간 = compiled from public 택배 도서산간 lists, NOT verified against the official 우체국 list (see drafts/needed-info.md).
  var ZONES = {"jeju":[[63000,63644]],"remote":[[22386,22388],[23004,23010],[23100,23116],[23124,23136],[31708,31708],[32133,32133],[33411,33411],[40200,40240],[52570,52571],[53031,53033],[53089,53104],[54000,54003],[56347,56349],[57068,57069],[58760,58762],[58800,58810],[58816,58818],[58953,58958],[59102,59103],[59106,59106],[59127,59127],[59129,59129],[59137,59166]]};
  function inRanges(n, rs) { for (var i = 0; i < rs.length; i++) if (n >= rs[i][0] && n <= rs[i][1]) return true; return false; }
  var SHIPPING = {
    carrier: '우체국택배', feeBase: 0, feeJeju: 3000, feeRemote: 5000, returnAddress: '서울 강남구 압구정로10길 30-12 2F',
    dispatch: '결제 완료 후 영업일 기준 1~3일 이내 출고 예정', slow: '제주 및 도서산간 지역은 배송 일정이 추가 소요될 수 있습니다.',
    zone: function (zip) { var z = String(zip == null ? '' : zip).trim(); if (!/^[0-9]{5}$/.test(z)) return 'base'; var n = +z; return inRanges(n, ZONES.jeju) ? 'jeju' : inRanges(n, ZONES.remote) ? 'remote' : 'base'; },
    // the TOTAL shipping fee of the zone (never added to anything): 일반 0 / 제주 3,000 / 제주 외 도서산간 5,000, whatever the purchase amount
    feeFor: function (zip) { var z = SHIPPING.zone(zip); return z === 'jeju' ? SHIPPING.feeJeju : z === 'remote' ? SHIPPING.feeRemote : SHIPPING.feeBase; },
    // no zip (cart): 일반 지역 0원; the regional fee is only a possibility there
    calc: function (subtotal, zip) { return typeof subtotal !== 'number' || subtotal <= 0 ? null : SHIPPING.feeFor(zip); }
  };
  // Every shipping text on every page is built from the values above (product accordion, shopping guide, returns page, FAQ, cart, order, event).
  // Pages only carry an empty [data-ship="..."] / [data-return-addr] slot, so the wording can never drift apart again.
  (function () {
    var f = function (n) { return n.toLocaleString('ko-KR') + '원'; };
    var FEES = '일반 지역 무료, 제주 ' + f(SHIPPING.feeJeju) + ', 제주 외 도서산간 ' + f(SHIPPING.feeRemote);
    SHIPPING.surcharge = '제주 지역은 총 ' + f(SHIPPING.feeJeju) + ', 제주 외 도서산간 지역은 총 ' + f(SHIPPING.feeRemote) + '입니다(일반 지역은 무료).';
    SHIPPING.items = [   // [item name, text]: the parenthesis follows the sentence directly (no space, no second line)
      ['배송업체', SHIPPING.carrier, ''],
      ['배송비', FEES + '(구매금액과 관계없이 적용되며 지역 요금은 중복 부과되지 않습니다.)', ''],
      ['출고 일정', SHIPPING.dispatch + '(' + SHIPPING.slow + ')', '']
    ];
    SHIPPING.lines = SHIPPING.items.map(function (i) { return [i[0], i[1]]; });
    SHIPPING.cartNote = ['제주 ' + f(SHIPPING.feeJeju) + ', 제주 외 도서산간 ' + f(SHIPPING.feeRemote) + '은 배송지에 따라 적용됩니다.', SHIPPING.dispatch + '(' + SHIPPING.slow + ')'];
    SHIPPING.note = SHIPPING.lines.map(function (l) { return l[0] + ': ' + l[1]; }).join(' · ');
    SHIPPING.text = {
      order: SHIPPING.surcharge,
      returns: SHIPPING.lines.map(function (l) { return l[0] + ': ' + l[1]; }).join(' · '),
      guide: SHIPPING.lines.map(function (l) { return l[0] + ': ' + l[1]; }).join('\n'),
      acc: SHIPPING.lines.map(function (l) { return l[0] + ': ' + l[1]; }).join('\n'),
      // 체험단 (event page): the SAME shipping standard as the regular product
      'event-period': '배송기간: ' + SHIPPING.dispatch,
      'event-dispatch': SHIPPING.slow,
      'faq-carrier': SHIPPING.carrier + '로 발송합니다.',
      'faq-fee': '배송업체는 ' + SHIPPING.carrier + '입니다. 배송비는 구매금액과 관계없이 일반 지역 무료, 제주 ' + f(SHIPPING.feeJeju) + ', 제주 외 도서산간 ' + f(SHIPPING.feeRemote) + '입니다. 지역은 배송지 우편번호로 판정하며 지역 요금은 중복 부과되지 않습니다.',
      'faq-surcharge': '제주 지역은 총 ' + f(SHIPPING.feeJeju) + ', 제주 외 도서산간 지역은 총 ' + f(SHIPPING.feeRemote) + '입니다.',
      'faq-when': SHIPPING.dispatch + '(' + SHIPPING.slow + ') 출고일과 도착일은 다를 수 있습니다.'
    };
  })();
  var LEGACY_IDS ={ 'impetvs-rich-man-30ml': PRODUCT_ID }; // ids written by earlier versions of the cart

  var LINKS = {
    home: 'index.html', login: 'login.html', signup: 'signup.html', cart: 'cart.html', product: 'product.html', order: 'order.html',
    mypage: 'mypage.html', guestOrder: 'guest-order.html', returns: 'returns.html', faq: 'faq.html', contact: 'contact.html', notices: 'notices.html', terms: 'terms.html', privacy: 'privacy.html', withdraw: 'withdraw.html'
  };

  /* ----------------------------------------------------------------- storage */
  var mem = {};
  function sget(k) { try { return window.localStorage.getItem(k); } catch (e) { return mem[k] || null; } }
  function sset(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
  var CART_KEY = 'impetvs-cart-v1', ORDER_KEY = 'impetvs-order-src';
  function readJSON(k) { try { var v = JSON.parse(sget(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }

  function img(path) { return (window.__A && window.__A[path]) || path; }
  function money(n) { return typeof n === 'number' ? n.toLocaleString('ko-KR') + '원' : '가격 정보 준비 중'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fixId(id) { return LEGACY_IDS[id] || id; }
  function optOf(p, key) { return p.options[key] || null; }
  function unit(id, option) { var p = PRODUCTS[id], o = p && optOf(p, option); return o ? o.price : null; }
  function imgFor(id, option) { var p = PRODUCTS[id], o = (p && optOf(p, option)) || (p && p.options[p.defaultOption]); return o ? o.img : ''; }

  /* -------------------------------------------------------------------- cart */
  var subs = [];
  // a line = product + capacity; anything unknown (old product / capacity that no longer exists) is dropped
  function normalize(list) {
    return list.map(function (i) {
      return i && { id: fixId(i.id), option: i.option || '', qty: Math.floor(i.qty) };
    }).filter(function (i) { return i && PRODUCTS[i.id] && optOf(PRODUCTS[i.id], i.option) && i.qty >= 1; });
  }
  function items() { return normalize(readJSON(CART_KEY)); }
  function count() { return items().reduce(function (s, i) { return s + i.qty; }, 0); }
  function limit(id) { var s = PRODUCTS[id] && PRODUCTS[id].stock; return typeof s === 'number' ? s : Infinity; }
  // ----- quantity limit: the same product may be bought up to maxQty in TOTAL, whatever the capacities (30ml + 50ml are added together)
  var MAX_MSG = '동일 상품은 최대 30개까지 구매할 수 있습니다.';
  function maxQty(id) { var p = PRODUCTS[id]; return Math.min(p && typeof p.maxQty === 'number' ? p.maxQty : Infinity, limit(id)); }
  function totalOf(list, id, exceptIdx) { var t = 0; list.forEach(function (i, k) { if (i.id === id && k !== exceptIdx) t += i.qty; }); return t; }
  // products whose total in `list` is above the limit -> [{id, total, max}]
  function overLimit(list) {
    var seen = {}, out = [];
    (list || items()).forEach(function (i) { if (seen[i.id]) return; seen[i.id] = 1; var t = totalOf(list || items(), i.id, -1), m = maxQty(i.id); if (t > m) out.push({ id: i.id, total: t, max: m }); });
    return out;
  }
  function save(list) { sset(CART_KEY, JSON.stringify(list)); emit(); }
  function emit() {
    var n = count();
    [].forEach.call(document.querySelectorAll('[data-cart-count]'), function (el) { el.textContent = n; });
    [].forEach.call(document.querySelectorAll('.hd-cart'), function (a) { a.setAttribute('aria-label', '장바구니, 총 ' + n + '개'); });
    subs.forEach(function (f) { f(n); });
  }
  var cart = {
    items: items,
    count: count,
    // same product + same capacity -> quantities are merged; a different capacity is a separate line
    // -> { qty: this line's quantity now, added: how many were really added, capped: true if the product limit stopped it, total: product total in the cart now }
    add: function (id, option, qty) {
      var list = items(), hit = null, idx = -1;
      list.forEach(function (i, k) { if (i.id === id && i.option === option) { hit = i; idx = k; } });
      qty = Math.max(1, Math.floor(qty) || 1);
      var others = totalOf(list, id, idx), have = hit ? hit.qty : 0, room = Math.max(0, maxQty(id) - others - have), add = Math.min(qty, room);
      if (add > 0) { if (hit) hit.qty = have + add; else list.push({ id: id, option: option, qty: add }); save(list); }
      return { qty: have + add, added: add, capped: add < qty, total: others + have + add };
    },
    // never above the product limit (the other capacities of the same product count too); lowering is always allowed
    setQty: function (idx, qty) {
      var list = items(); if (!list[idx]) return;
      var room = Math.max(1, maxQty(list[idx].id) - totalOf(list, list[idx].id, idx));
      list[idx].qty = Math.max(1, Math.min(room, Math.floor(qty) || 1)); save(list);
    },
    maxQty: maxQty, totalOf: function (id) { return totalOf(items(), id, -1); }, overLimit: overLimit, MAX_MSG: MAX_MSG,
    remove: function (idx) { var list = items(); list.splice(idx, 1); save(list); },
    // after a payment the SERVER confirmed: take exactly the paid quantities out of the cart (never anything else)
    removePaid: function (paid) {
      var list = items();
      (paid || []).forEach(function (p) { list.forEach(function (i) { if (i.id === (p.product_id || p.id) && i.option === p.option) i.qty -= Math.floor(p.qty) || 0; }); });
      save(list.filter(function (i) { return i.qty > 0; }));
    },
    unit: function (i) { return unit(i.id, i.option); },
    line: function (i) { var u = unit(i.id, i.option); return typeof u === 'number' ? u * i.qty : null; },
    total: function () {
      var t = 0, ok = true;
      items().forEach(function (i) { var l = cart.line(i); if (l === null) ok = false; else t += l; });
      return ok && items().length ? t : null;
    }
  };
  // ---- no per-line selection any more: every line of the cart is part of the order. (An older "unticked" list from a previous version is deleted so that no line is silently left out.)
  try { localStorage.removeItem('impetvs-cart-unsel'); } catch (e) {}
  function keyOf(i) { return i.id + '|' + i.option; }
  cart.keyOf = keyOf;
  cart.selected = function () { return items(); };
  cart.selCount = function () { return items().reduce(function (s, i) { return s + i.qty; }, 0); };
  cart.selTotal = function () { return cart.total(); };
  window.addEventListener('storage', function (e) { if (e.key === CART_KEY) emit(); });

  /* ------------------------------------------------------------ order hand-off */
  // What goes to the order page: product / capacity / quantity only (kept in sessionStorage for this tab).
  // Addresses, names, phone numbers and e-mail addresses are never written to any browser storage.
  var order = {
    fromCart: function () { var v = JSON.stringify({ mode: 'cart' }); try { sessionStorage.setItem(ORDER_KEY, v); } catch (e) { mem[ORDER_KEY] = v; } },   // the whole cart goes to the order page
    buyNow: function (id, option, qty) { qty = Math.max(1, Math.min(maxQty(id), Math.floor(qty) || 1)); var v = JSON.stringify({ mode: 'buy', items: [{ id: id, option: option, qty: qty }] }); try { sessionStorage.setItem(ORDER_KEY, v); } catch (e) { mem[ORDER_KEY] = v; } },
    // -> {mode, items} ; the cart is read live, "buy now" uses only the single selection that was passed
    source: function () {
      var raw = null; try { raw = sessionStorage.getItem(ORDER_KEY); } catch (e) { raw = mem[ORDER_KEY] || null; }
      var s = null; try { s = JSON.parse(raw); } catch (e) {}
      if (!s) return { mode: 'cart', items: cart.selected() };
      if (s.mode === 'buy') return { mode: 'buy', items: normalize(s.items || []) };
      return { mode: 'cart', items: items() };
    }
  };

  /* ------------------------------------------------------------------- toast */
  var toastEl, toastTimer;
  function toast(msg, action) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'shp-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<a href="' + esc(action.href) + '">' + esc(action.label) + '</a>' : '');
    toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 3600);
  }

  /* ------------------------------------------------------------------- share */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext !== false) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    return new Promise(function (res, rej) {
      var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0;left:-9999px';
      document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      t.remove(); ok ? res() : rej(new Error('copy failed'));
    });
  }
  // ----- share menu (Facebook / X / LINE / copy the address) -----
  // The address that is shared is ALWAYS built from the public site address in config.js (siteUrl) plus a fixed page path:
  // never from location.href, so a file:// address (merged HTML), a login token (#access_token), a ?code= / paymentKey / orderId / amount query or any
  // other parameter of the current page can never end up in a shared link.
  var SHARE_PAGES = { product: 'product.html' };   // the share menu exists on the product page only
  function publicUrl(page) {
    var base = String((window.IMPETVS_CONFIG && window.IMPETVS_CONFIG.siteUrl) || '').replace(/\/+$/, '');
    if (!base && /^https?:$/.test(location.protocol)) base = location.origin + location.pathname.replace(/\/[^\/]*$/, '');
    if (!/^https?:\/\/[^\s?#]+$/.test(base)) return null;
    return base + '/' + (SHARE_PAGES[page] || '');
  }
  var shareState = null;
  // 카카오톡 needs a Kakao app: it is offered only when config.js has the public JavaScript key; otherwise the entry is visibly disabled ("준비 중") and never claims to work
  function kakaoReady() { var k = window.IMPETVS_CONFIG && window.IMPETVS_CONFIG.kakaoShare; return !!(k && k.jsKey); }
  // The Kakao JavaScript SDK is loaded as soon as the share menu opens (when the JavaScript key is set), so that the click itself can open Kakao's share window
  // (browsers block a pop-up that is opened after a download has finished). The key is the PUBLIC "JavaScript key" of the Kakao app, NOT the REST API key / Client Secret used for login.
  var kakaoSdk = null;
  function loadKakao() {
    if (window.Kakao) return Promise.resolve();
    if (kakaoSdk) return kakaoSdk;
    kakaoSdk = new Promise(function (res, rej) {
      var sc = document.createElement('script'); sc.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js'; sc.async = true;
      sc.onload = function () { window.Kakao ? res() : rej(new Error('sdk')); }; sc.onerror = function () { kakaoSdk = null; sc.remove(); rej(new Error('sdk')); };
      document.head.appendChild(sc);
    });
    return kakaoSdk;
  }
  // what the Kakao message says: the real product name, its price line, the product picture (absolute address, JPG) and the product page. Built from the product data + siteUrl only.
  function kakaoPayload(url) {
    var P = PRODUCTS[PRODUCT_ID], base = url.replace(/[^\/]*$/, ''), ks = Object.keys(P.options);
    var desc = P.sub + ' · ' + ks.map(function (k) { return k + ' ' + money(P.options[k].price); }).join(' / ');
    var link = { mobileWebUrl: url, webUrl: url };
    return { objectType: 'feed', content: { title: P.name, description: desc, imageUrl: base + 'opt/og-product.jpg', link: link }, buttons: [{ title: '상품 보기', link: link }] };
  }
  // -> resolves when Kakao's share window / app was OPENED (that is not "shared": the person sends it inside KakaoTalk, and Kakao reports nothing back); rejects when it could not be opened
  function kakaoShare(url) {
    return loadKakao().then(function () {
      if (!window.Kakao.isInitialized()) window.Kakao.init(window.IMPETVS_CONFIG.kakaoShare.jsKey);
      if (!window.Kakao.Share || typeof window.Kakao.Share.sendDefault !== 'function') throw new Error('share');
      window.Kakao.Share.sendDefault(kakaoPayload(url));
    });
  }
  function closeShare(returnFocus) {
    if (!shareState) return;
    var st = shareState; shareState = null;
    document.removeEventListener('keydown', st.onKey, true); window.removeEventListener('resize', st.onResize); window.removeEventListener('scroll', st.onScroll, true);
    st.ov.remove(); document.documentElement.classList.remove('shp-sh-lock');
    if (st.trigger) { st.trigger.setAttribute('aria-expanded', 'false'); if (returnFocus !== false && st.trigger.focus) st.trigger.focus(); }
  }
  var SH_ICON = {
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3l-6.6 7.5L22 21h-6l-4.7-6.1L5.9 21h-3l7-8L2.4 3h6.2l4.2 5.6L17.8 3zm-1 16.2h1.7L7.7 4.7H5.9l10.9 14.5z"/></svg>',
    kakao: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.3 4.6 6.7l-1 3.6c-.1.3.2.5.5.4l4.2-2.8c.5.1 1.1.1 1.7.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"/></svg>',
    line: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6s5.9-3.5 8-6C21.4 14.5 22 12.8 22 11c0-4.4-4.5-8-10-8zM8.3 13.3H6.2c-.3 0-.5-.2-.5-.5V9.2c0-.3.2-.5.5-.5s.5.2.5.5v3.1h1.6c.3 0 .5.2.5.5s-.2.5-.5.5zm2.1-.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5V9.2c0-.3.2-.5.5-.5s.5.2.5.5v3.6zm5 0c0 .2-.1.4-.3.5h-.2c-.2 0-.3-.1-.4-.2l-2-2.8v2.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5V9.2c0-.2.1-.4.3-.5h.2c.2 0 .3.1.4.2l2 2.8V9.2c0-.3.2-.5.5-.5s.5.2.5.5v3.6zm3.1-2.3c.3 0 .5.2.5.5s-.2.5-.5.5H17v.8h1.5c.3 0 .5.2.5.5s-.2.5-.5.5h-2c-.3 0-.5-.2-.5-.5V9.2c0-.3.2-.5.5-.5h2c.3 0 .5.2.5.5s-.2.5-.5.5H17v.8h1.5z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>'
  };
  // share(title, { page: 'home' | 'product', trigger: <the button that opened it> })
  function share(title, opts) {
    opts = opts || {}; closeShare(false);
    var url = publicUrl(opts.page || 'product'), trigger = opts.trigger || null, enc = encodeURIComponent;
    var ov = document.createElement('div'); ov.className = 'shp-sh-ov';
    var links = url ? [
      ['facebook', '페이스북', 'https://www.facebook.com/sharer/sharer.php?u=' + enc(url)],
      ['x', 'X (트위터)', 'https://twitter.com/intent/tweet?url=' + enc(url) + '&text=' + enc(title || '')],
      ['line', 'LINE', 'https://social-plugins.line.me/lineit/share?url=' + enc(url)]
    ] : [];
    ov.innerHTML = '<div class="shp-sh" role="dialog" aria-modal="true" aria-labelledby="shp-sh-t" tabindex="-1">' +
      '<div class="shp-sh-h"><h2 id="shp-sh-t">공유하기</h2><button type="button" class="shp-sh-x" aria-label="닫기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
      '<ul class="shp-sh-l">' + (url ? (kakaoReady() ? '<li><button type="button" class="shp-sh-i" data-kakao>' + SH_ICON.kakao + '<span>카카오톡</span></button></li>' : '<li><button type="button" class="shp-sh-i" disabled aria-disabled="true" title="카카오톡 공유는 아직 연결되지 않았습니다">' + SH_ICON.kakao + '<span>카카오톡<small>준비 중</small></span></button></li>') : '') + links.map(function (l) { return '<li><a class="shp-sh-i" href="' + esc(l[2]) + '" target="_blank" rel="noopener noreferrer">' + SH_ICON[l[0]] + '<span>' + esc(l[1]) + '</span></a></li>'; }).join('') +
      '<li><button type="button" class="shp-sh-i" data-copy' + (url ? '' : ' disabled') + '>' + SH_ICON.link + '<span>URL 복사</span></button></li></ul>' +
      (url ? '' : '<p class="shp-sh-m">공개 사이트 주소가 설정되지 않아 공유할 수 없습니다.</p>') +
      '<p class="shp-sh-m" role="status" aria-live="polite"></p></div>';
    document.body.appendChild(ov);
    var box = ov.querySelector('.shp-sh'), msg = ov.querySelector('.shp-sh-m'), copyBtn = ov.querySelector('[data-copy]');
    function items() { return [].slice.call(box.querySelectorAll('a[href],button:not([disabled])')); }
    function choices() { return [].slice.call(box.querySelectorAll('.shp-sh-i:not([disabled])')); }   // arrow keys move between the four share choices; Tab also reaches the close button
    var phone = function () { return window.matchMedia('(max-width: 640px)').matches; };
    function place() {                                  // PC: a small popup under the icon, kept inside the screen. Phones: a bottom sheet (CSS).
      box.style.top = box.style.left = box.style.right = ''; if (phone() || !trigger) { box.classList.remove('pop'); return; }
      box.classList.add('pop'); var r = trigger.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
      var left = Math.min(Math.max(12, r.right - w), window.innerWidth - w - 12), top = r.bottom + 8; if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 8);
      box.style.left = left + 'px'; box.style.top = top + 'px';
    }
    var st = shareState = { ov: ov, trigger: trigger };
    st.onKey = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeShare(); return; }
      var it = items(), i = it.indexOf(document.activeElement);
      if (e.key === 'Tab') { if (!it.length) return; if (e.shiftKey && (i <= 0)) { e.preventDefault(); it[it.length - 1].focus(); } else if (!e.shiftKey && (i === it.length - 1 || i < 0)) { e.preventDefault(); it[0].focus(); } return; }
      var ch = choices(), k = ch.indexOf(document.activeElement); if (!ch.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); ch[(k + 1) % ch.length].focus(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); ch[(k - 1 + ch.length) % ch.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); ch[0].focus(); } else if (e.key === 'End') { e.preventDefault(); ch[ch.length - 1].focus(); }
    };
    st.onResize = place; st.onScroll = function (e) { if (!phone() && !box.contains(e.target)) closeShare(false); };
    document.addEventListener('keydown', st.onKey, true); window.addEventListener('resize', st.onResize); window.addEventListener('scroll', st.onScroll, true);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) closeShare(); });       // click outside
    ov.querySelector('.shp-sh-x').addEventListener('click', function () { closeShare(); });
    // nothing here says "shared": opening a platform's page is only the START of sharing, which the platform completes. Copy reports success only if it really worked.
    copyBtn.addEventListener('click', function () {
      msg.textContent = '';
      copyText(url).then(function () { msg.textContent = '주소를 복사했습니다.'; toast('주소를 복사했습니다.'); },
        function () {   // only now the address is shown, so it can be copied by hand
        msg.textContent = '주소를 복사하지 못했습니다. 아래 주소를 길게 눌러(또는 드래그해서) 직접 복사해 주세요.';
        var u = ov.querySelector('#shp-sh-u'); if (!u) { u = document.createElement('p'); u.className = 'shp-sh-u'; u.id = 'shp-sh-u'; u.textContent = url; msg.parentNode.insertBefore(u, msg.nextSibling); }
        var r = document.createRange(); r.selectNodeContents(u); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); });
    });
    var kb = ov.querySelector('[data-kakao]');
    if (kb) {
      loadKakao().catch(function () {});   // preload: the SDK is ready when the button is pressed
      kb.addEventListener('click', function () {
        msg.textContent = '';
        kakaoShare(url).then(function () { msg.textContent = '카카오톡 공유 창을 열었습니다. 전송은 카카오톡에서 완료해 주세요.'; },   // opening Kakao's own share screen is NOT "shared": no success toast
          function () { msg.textContent = '카카오톡 공유를 시작하지 못했습니다. 잠시 후 다시 시도하거나 다른 방법을 이용해 주세요.'; });
      });
    }
    if (phone()) document.documentElement.classList.add('shp-sh-lock');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    place(); var f = choices()[0] || items()[0]; (f || box).focus();
    return Promise.resolve();
  }

  /* ------------------------------------------------------------------ header */
  // 24px grid, 1.8 stroke, round caps: the same set is used by the home page header (premium.jsx)
  var SVG = function (d) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var ICONS = {
    home: SVG('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/>'),
    user: SVG('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>'),
    bag: SVG('<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
    share: SVG('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/>')
  };
  function headerHTML() {
    return '<header class="shp-hd"><div class="shp-hd-in">' +
      '<a class="shp-logo" href="' + LINKS.home + '">IMPETVS</a>' +
      '<nav class="shp-nav" aria-label="바로가기">' +
      '<div class="hd-ics">' +
      '<a class="hd-ic" href="' + LINKS.home + '" aria-label="홈으로" data-tip="홈으로">' + ICONS.home + '</a>' +
      '<a class="hd-ic" href="' + LINKS.login + '" aria-label="로그인" data-tip="로그인" data-user-icon>' + ICONS.user + '</a>' +
      '<a class="hd-ic hd-cart" href="' + LINKS.cart + '" aria-label="장바구니, 총 0개" data-tip="장바구니">' + ICONS.bag + '<b data-cart-count>0</b></a>' +
      '</div></nav></div></header>';
  }
  /* ------------------------------------------------------------------ business info + footer (single source for every page, home included) */
  // Public business details. Wording follows the owner's instruction; the exact legal company name is still to be confirmed (see drafts/needed-info.md).
  var COMPANY = {
    // 확정(2026-10-15, 운영자): 법적 상호, 사업자등록번호, 통신판매업신고번호, 대표자, 사업자 주소.
    // (사업자 연락처는 공개 화면에 표시하지 않습니다. 내부 기록: backend/BUSINESS-INTERNAL.md)
    name: '주식회사 열정의사람들', ceo: '한동남', address: '강원특별자치도 원주시 입춘로 4, 비동 10층 06호, 07호, 08호 디154(반곡동, 엔터비즈타워)',
    biz: '822-27-01430', mailOrder: '2026-강원원주-01929',
    // 고객센터(전화·이메일)는 별도로 유지.
    tel: '0507-1372-9152', email: 'otu_company@naver.com',
    // 정적 파일 호스팅: GitHub Pages (배포 주소 https://<id>.github.io/IMPETVS). 회원·인증 데이터는 Supabase(호스팅 표기가 아님).
    hostedBy: 'GitHub Pages'
  };
  // seller information shown where the customer buys (order page, product page): the same data as the footer
  function sellerHTML() {
    return ['상호: ' + COMPANY.name, '대표자: ' + COMPANY.ceo, '사업자 주소: ' + COMPANY.address, '고객센터: ' + COMPANY.tel, '이메일: ' + COMPANY.email,
      '사업자등록번호: ' + COMPANY.biz, '통신판매업신고번호: ' + COMPANY.mailOrder].map(esc);
  }
  var FOOT_SERVICE = [['비회원 주문 조회', LINKS.guestOrder], ['교환 및 반품', LINKS.returns], ['자주 묻는 질문', LINKS.faq], ['1:1 문의하기', LINKS.contact]];
  var FOOT_LEGAL = [['공지사항', LINKS.notices], ['이용약관', LINKS.terms], ['개인정보처리방침', LINKS.privacy]];
  function footerHTML() {
    var li = function (a) { return a.map(function (x) { return '<li><a href="' + x[1] + '">' + x[0] + '</a></li>'; }).join(''); };
    return '<footer class="shp-ft"><div class="shp-ft-top">' +
      '<div class="shp-ft-co"><span class="shp-ft-l">Company</span>' +
        '<p>' + esc(COMPANY.name) + '</p><p>대표자 ' + esc(COMPANY.ceo) + ' / ' + esc(COMPANY.address) + '</p><p>사업자등록번호 ' + esc(COMPANY.biz) + '</p><p>통신판매업신고번호 ' + esc(COMPANY.mailOrder) + '</p>' +
        '<p class="shp-ft-legal">© IMPETVS. All rights reserved.<br>Hosted by ' + esc(COMPANY.hostedBy) + '</p></div>' +
      '<div><span class="shp-ft-l">Contact</span>고객센터 ' + esc(COMPANY.tel) + '<br><a href="mailto:' + COMPANY.email + '">' + esc(COMPANY.email) + '</a></div>' +
      '<div><span class="shp-ft-l">고객 서비스</span><ul>' + li(FOOT_SERVICE) + '</ul></div>' +
      '<div><span class="shp-ft-l">법적 고지</span><ul>' + li(FOOT_LEGAL) + '</ul></div>' +
      '<div><span class="shp-ft-l">SNS</span><a href="https://www.instagram.com/impetvs.official/" target="_blank" rel="noopener noreferrer">Instagram</a></div>' +
      '</div><div class="shp-ft-bot"><span>IMPETVS RICH MAN</span><span>Eau De Perfume | 30ml</span></div></footer>';
  }
  function mountHeaders() {
    [].forEach.call(document.querySelectorAll('[data-shp-header]'), function (el) { if (!el.firstChild) el.innerHTML = headerHTML(); });
    // the footer goes right after each page's <main>; the home page has its own copy of the same footer (premium.jsx), fed by the same COMPANY data
    [].forEach.call(document.querySelectorAll('main[id$="-root"]'), function (m) { var n = m.nextElementSibling; if (!(n && n.classList.contains('shp-ft'))) m.insertAdjacentHTML('afterend', footerHTML()); });
    [].forEach.call(document.querySelectorAll('[data-seller]'), function (el) { var L = sellerHTML(); el.innerHTML = el.hasAttribute('data-dots') ? '<ul class="shp-dots">' + L.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : L.join('<br>'); });
    [].forEach.call(document.querySelectorAll('[data-ship]'), function (el) {
      if (el.hasAttribute('data-ship-ul')) {   // a real list: every item is a <li>, a second line (the parenthesis) stays under the text, not under the dot
        el.innerHTML = SHIPPING.items.map(function (i) { return '<li><b class="shp-k">' + esc(i[0]) + '</b>: ' + esc(i[1]) + '</li>'; }).join(''); return;
      }
      var s = SHIPPING.text[el.getAttribute('data-ship')]; if (s == null) return;
      var nb = function (x) { return esc(x).replace(/(이상 구매 시 무료\))/g, '<span class="shp-nb">$1</span>').replace(/(^|\n| · )(배송업체|배송비|출고 일정): /g, '$1<b class="shp-k">$2</b>: '); };   // keep the short ending together; item names are bold
      el.innerHTML = el.hasAttribute('data-dots') ? '<ul class="shp-dots">' + s.split('\n').map(function (x) { return '<li>' + nb(x) + '</li>'; }).join('') + '</ul>'
        : el.hasAttribute('data-ship-p') ? s.split('\n').map(function (x) { return '<p>' + nb(x) + '</p>'; }).join('') : nb(s).replace(/\n/g, '<br>');
    });
    [].forEach.call(document.querySelectorAll('[data-return-addr]'), function (el) { el.innerHTML = String(SHIPPING.returnAddress).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/(\d+-\d+(?: \d+F)?)/, '<span class="shp-nb">$1</span>'); });
    emit();
    if (window.IMAuth) window.IMAuth.paintHeader();
  }

  /* ------------------------------------------------------------ payment switch */
  // Buying is open ONLY when a payment service is really connected (config.js payment.clientKey set; a live key additionally needs payment.live === true).
  // While it is not, every buy / order button says so and nothing is started, nothing is shown as ordered or paid. (Toss integration is on hold: see backend/TOSS-RESUME.md)
  var PAY_NOT_READY = '결제 서비스 준비 중입니다.';
  function paymentReady() {
    var P = ((window.IMPETVS_CONFIG || {}).payment) || {}, k = String(P.clientKey || '');
    return P.provider === 'toss' && /^(test|live)_gck_[A-Za-z0-9_-]+$/.test(k) && (!/^live_/.test(k) || P.live === true);
  }

  /* ----------------------------------------------------------------- exports */
  window.IMShop = {
    PRODUCT_ID: PRODUCT_ID, products: PRODUCTS, payments: {}, links: LINKS, cart: cart, order: order, company: COMPANY, shipping: SHIPPING, paymentReady: paymentReady, PAY_NOT_READY: PAY_NOT_READY, QTY_MSG: MAX_MSG,
    unit: unit, imgFor: imgFor, img: img, money: money, esc: esc, toast: toast, share: share, emit: emit, mountHeaders: mountHeaders, icons: ICONS,
    subscribe: function (f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
    // accordion: <button data-acc aria-expanded aria-controls=id> + <div id hidden>
    accordion: function (root) {
      [].forEach.call(root.querySelectorAll('[data-acc]'), function (b) {
        b.addEventListener('click', function () {
          var open = b.getAttribute('aria-expanded') === 'true';
          b.setAttribute('aria-expanded', open ? 'false' : 'true');
          document.getElementById(b.getAttribute('aria-controls')).hidden = open;
        });
      });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountHeaders); else mountHeaders();
})();
