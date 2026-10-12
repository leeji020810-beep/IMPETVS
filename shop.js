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
    defaultOption: '30ml',
    options: {
      '30ml': { key: '30ml', price: 59000, img: 'opt/product-main.webp', alt: '임페투스 리치맨 30ml 향수 병' },
      '50ml': { key: '50ml', price: 99000, img: 'opt/product-main-50ml.webp', alt: '임페투스 리치맨 50ml 향수 병' }
    }
  };
  // IMPETVS operating standard for shipping (owner decision, 2026-10-12) — an internal operating policy, NOT a contract rate and not a guarantee.
  // The fee is based on the subtotal AFTER discounts (there are no discounts yet, so it is the product subtotal). Mirrored on the server in
  // backend/supabase/functions/_shared/util.ts (the server computes the real amount; this copy only displays it).
  // Never promise same-day shipping or a delivery date. Remote areas / islands: no surcharge for the customer (the seller bears it).
  var SHIPPING = {
    carrier: '우체국택배', fee: 3000, freeFrom: 50000, returnAddress: '서울 강남구 압구정로10길 30-12 2F',
    lines: [
      ['택배사', '우체국택배'],
      ['배송비', '일반 배송비 3,000원 · 할인 적용 후 상품금액 합계가 50,000원 이상이면 무료'],
      ['발송', '결제 완료 다음 영업일부터 1~2영업일 이내 발송을 목표로 합니다.'],
      ['예상 수령', '결제 완료 다음 영업일부터 3~5영업일 (토요일·일요일·공휴일 제외)'],
      ['제주·도서산간', '추가 배송비는 받지 않습니다. 배송이 어려운 지역으로 확인되면 결제 전에 안내해 드립니다.'],
      ['지연 안내', '물량 증가, 기상 상황, 도서 지역 등으로 배송이 지연될 수 있으며, 지연이 확인되면 안내해 드립니다.'],
      ['별도 일정', '예약판매 등 별도 일정이 있는 상품은 구매 전에 해당 일정을 안내합니다.']
    ],
    note: '우체국택배 · 일반 배송비 3,000원 (할인 적용 후 상품금액 50,000원 이상 무료, 제주·도서산간 추가 배송비 없음) · 결제 완료 다음 영업일부터 1~2영업일 이내 발송 목표 · 예상 수령 3~5영업일 (토·일·공휴일 제외)',
    calc: function (subtotal) { return typeof subtotal !== 'number' || subtotal <= 0 ? null : (subtotal >= SHIPPING.freeFrom ? 0 : SHIPPING.fee); }
  };
  var LEGACY_IDS ={ 'impetvs-rich-man-30ml': PRODUCT_ID }; // ids written by earlier versions of the cart

  var LINKS = {
    home: 'index.html', login: 'login.html', signup: 'signup.html', cart: 'cart.html', product: 'product.html', order: 'order.html',
    guestOrder: 'guest-order.html', returns: 'returns.html', faq: 'faq.html', contact: 'contact.html', notices: 'notices.html', terms: 'terms.html', privacy: 'privacy.html', withdraw: 'withdraw.html'
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
    add: function (id, option, qty) {
      var list = items(), hit = null;
      list.forEach(function (i) { if (i.id === id && i.option === option) hit = i; });
      var want = (hit ? hit.qty : 0) + qty, cap = limit(id);
      if (want > cap) want = cap;
      if (hit) hit.qty = want; else list.push({ id: id, option: option, qty: want });
      save(list); return want;
    },
    setQty: function (idx, qty) {
      var list = items(); if (!list[idx]) return;
      list[idx].qty = Math.max(1, Math.min(limit(list[idx].id), Math.floor(qty) || 1)); save(list);
    },
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
  window.addEventListener('storage', function (e) { if (e.key === CART_KEY) emit(); });

  /* ------------------------------------------------------------ order hand-off */
  // What goes to the order page: product / capacity / quantity only (kept in sessionStorage for this tab).
  // Addresses, names, phone numbers and e-mail addresses are never written to any browser storage.
  var order = {
    fromCart: function () { try { sessionStorage.setItem(ORDER_KEY, JSON.stringify({ mode: 'cart' })); } catch (e) { mem[ORDER_KEY] = JSON.stringify({ mode: 'cart' }); } },
    buyNow: function (id, option, qty) { var v = JSON.stringify({ mode: 'buy', items: [{ id: id, option: option, qty: qty }] }); try { sessionStorage.setItem(ORDER_KEY, v); } catch (e) { mem[ORDER_KEY] = v; } },
    // -> {mode, items} ; the cart is read live, "buy now" uses only the single selection that was passed
    source: function () {
      var raw = null; try { raw = sessionStorage.getItem(ORDER_KEY); } catch (e) { raw = mem[ORDER_KEY] || null; }
      var s = null; try { s = JSON.parse(raw); } catch (e) {}
      if (!s) return { mode: 'cart', items: items() };
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
  // device share sheet when the browser has one, otherwise copy the page address; the toast only says "copied" if it really was
  function share(title) {
    var url = location.href.split('#')[0] + (location.hash && /^#[a-z-]+-page$/.test(location.hash) ? location.hash : '');
    if (navigator.share) {
      return navigator.share({ title: title, url: url }).catch(function (e) { if (e && e.name !== 'AbortError') return fallback(); });
    }
    return fallback();
    function fallback() {
      return copyText(url).then(function () { toast('상품 페이지 주소를 복사했습니다.'); }, function () { toast('주소를 복사하지 못했습니다. 주소창의 주소를 직접 복사해 주세요.'); });
    }
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
    // 확정(2026-10-15, 운영자): 법적 상호, 사업자 주소, 사업자 연락처.
    name: '주식회사 열정의사람들', address: '강원특별자치도 원주시 입춘로 4, 비동 10층 06호, 07호, 08호 디154(반곡동, 엔터비즈타워)', bizPhone: '010-5208-9152',
    // 고객센터는 따로 유지: 고객센터 번호와 이메일.
    tel: '0507-1372-9152', email: 'otu_company@naver.com',
    // 확정(2026-10-15, 운영자 확인): 사업자등록번호, 통신판매업신고번호, 대표자 — 모두 '주식회사 열정의사람들'의 정보.
    ceo: '한동남', biz: '822-27-01430', mailOrder: '2026-강원원주-01929',
    // 실제 호스팅 제공자 기준으로 확인 전(현재 사이트는 GitHub Pages / Supabase 사용).
    hosting: 'Hosting by (주)열정의시간'
  };
  // seller information shown where the customer buys (order page, product page): the same data as the footer
  function sellerHTML() {
    return ['상호 ' + COMPANY.name, '대표자 ' + COMPANY.ceo, '사업자 주소 ' + COMPANY.address, '고객센터 ' + COMPANY.tel, '사업자 연락처 ' + COMPANY.bizPhone, '이메일 ' + COMPANY.email,
      '사업자등록번호 ' + COMPANY.biz, '통신판매업신고번호 ' + COMPANY.mailOrder].map(esc).join('<br>');
  }
  var FOOT_SERVICE = [['비회원 주문 조회', LINKS.guestOrder], ['교환 및 반품', LINKS.returns], ['자주 묻는 질문', LINKS.faq], ['1:1 문의하기', LINKS.contact]];
  var FOOT_LEGAL = [['공지사항', LINKS.notices], ['이용약관', LINKS.terms], ['개인정보처리방침', LINKS.privacy]];
  function footerHTML() {
    var li = function (a) { return a.map(function (x) { return '<li><a href="' + x[1] + '">' + x[0] + '</a></li>'; }).join(''); };
    return '<footer class="shp-ft"><div class="shp-ft-top">' +
      '<div><span class="shp-ft-l">Company</span>' + [COMPANY.name, COMPANY.hosting, COMPANY.address, '대표자 ' + COMPANY.ceo, '사업자등록번호 ' + COMPANY.biz, '통신판매업신고번호 ' + COMPANY.mailOrder].map(esc).join('<br>') + '</div>' +
      '<div><span class="shp-ft-l">Contact</span>고객센터 ' + esc(COMPANY.tel) + '<br><a href="mailto:' + COMPANY.email + '">' + esc(COMPANY.email) + '</a><br>사업자 연락처 ' + esc(COMPANY.bizPhone) + '</div>' +
      '<div><span class="shp-ft-l">고객 서비스</span><ul>' + li(FOOT_SERVICE) + '</ul></div>' +
      '<div><span class="shp-ft-l">법적 고지</span><ul>' + li(FOOT_LEGAL) + '</ul></div>' +
      '<div><span class="shp-ft-l">SNS</span><a href="https://www.instagram.com/impetvs.official/" target="_blank" rel="noopener noreferrer">Instagram</a></div>' +
      '</div><div class="shp-ft-bot"><span>IMPETVS RICH MAN</span><span>Eau De Perfume | 30ml</span></div></footer>';
  }
  function mountHeaders() {
    [].forEach.call(document.querySelectorAll('[data-shp-header]'), function (el) { if (!el.firstChild) el.innerHTML = headerHTML(); });
    // the footer goes right after each page's <main>; the home page has its own copy of the same footer (premium.jsx), fed by the same COMPANY data
    [].forEach.call(document.querySelectorAll('main[id$="-root"]'), function (m) { var n = m.nextElementSibling; if (!(n && n.classList.contains('shp-ft'))) m.insertAdjacentHTML('afterend', footerHTML()); });
    [].forEach.call(document.querySelectorAll('[data-seller]'), function (el) { el.innerHTML = sellerHTML(); });
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
    PRODUCT_ID: PRODUCT_ID, products: PRODUCTS, payments: {}, links: LINKS, cart: cart, order: order, company: COMPANY, shipping: SHIPPING, paymentReady: paymentReady, PAY_NOT_READY: PAY_NOT_READY,
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
