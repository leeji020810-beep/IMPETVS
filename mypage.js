/* IMPETVS 마이쇼핑: ONE shared script for every 마이쇼핑 page (mypage.html = menu / PC overview, mypage-orders.html, -claims, -address, -pay, -reviews, -inquiries, -profile).
   Each page only says which view it is (<main data-my-view="...">) and calls IMMy.init(root). All data goes through auth.js; the SERVER (row-level security + functions) decides what a member may read or change.
   Nothing here stores personal data in the browser. */
(function () {
  'use strict';
  var S = window.IMShop, A = window.IMAuth, esc = S.esc;
  var HOME = 'mypage.html';
  var P = {
    orders: ['mypage-orders.html', '주문 내역'], address: ['mypage-address.html', '배송지 관리'], pay: ['mypage-pay.html', '결제수단 관리'],
    reviews: ['mypage-reviews.html', '리뷰 관리'], inq: ['mypage-inquiries.html', '나의 문의 내역'], profile: ['mypage-profile.html', '회원 정보 수정']
  };
  var GROUPS = [['나의 쇼핑 정보', ['orders', 'address', 'pay']], ['나의 활동 정보', ['reviews', 'inq']], ['나의 정보', ['profile']]];
  var OFF = '회원 서비스 연결 전입니다. 서버(Supabase) 설정이 끝나면 이용할 수 있습니다.';
  // the statuses that really exist on the server (orders_status_check in schema.sql)
  var STATUS = { pending_payment: '결제 대기', confirming: '결제 확인 중', payment_failed: '결제 실패', paid: '결제 완료', shipped: '배송 중', delivered: '배송 완료', cancelled: '취소됨', refunded: '환불 완료' };
  var ORDER_FILTER = ['pending_payment', 'confirming', 'payment_failed', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
  var CLAIM_FILTER = ['cancelled', 'refunded'];
  var POSTCODE_SRC = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';   // Kakao (Daum) 우편번호 서비스: official script, no key
  var RANGES = [['오늘', 0], ['1주일', 7], ['1개월', 30], ['3개월', 90], ['6개월', 180]];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function day(s) { var d = new Date(s); return isNaN(d) ? '' : ymd(d); }
  function serverMissing(r) { return r && (r.status === 404 || r.status === 400 && /relation|function|schema cache|does not exist|Could not find/i.test(String(r.message || ''))); }
  function failText(r) { return serverMissing(r) ? '이 기능에 필요한 서버 설정(SQL)이 아직 적용되지 않았습니다. 적용 전에는 이용할 수 없습니다.' : (r && r.status === 401 ? '로그인이 만료되었습니다. 다시 로그인해 주세요.' : '내용을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
  function items(o) { return Array.isArray(o.items) ? o.items : []; }
  function summary(o) { var it = items(o), f = it[0]; if (!f) return '주문 상품'; return esc(f.name) + ' · ' + esc(f.option) + ' · ' + esc(f.qty) + '개' + (it.length > 1 ? ' 외 ' + (it.length - 1) + '건' : ''); }
  function thumb(i) { var p = S.imgFor(i.product_id, i.option); return p ? '<img src="' + esc(S.img(p)) + '" alt="" width="64" height="64" loading="lazy">' : '<span class="my-ph"></span>'; }
  function stLabel(o) { return o.status === 'refunded' ? '환불 완료' : (o.refunded_amount > 0 && o.status !== 'cancelled') ? '일부 환불' : (STATUS[o.status] || o.status); }
  function empty(t) { return '<p class="shp-empty my-empty">' + t + '</p>'; }
  function head(t, keep) { return '<h2 class="my-t' + (keep ? '' : ' my-t-main') + '">' + t + '</h2>'; }   // the main title is hidden on phones (the page header shows it); 'keep' titles (e.g. 주문 상세) stay
  function fmtMobile(v) { v = String(v || ''); return v.length === 11 ? v.slice(0, 3) + '-' + v.slice(3, 7) + '-' + v.slice(7) : v.length === 10 ? v.slice(0, 3) + '-' + v.slice(3, 6) + '-' + v.slice(6) : v; }
  function fmtHome(v) { v = String(v || ''); if (!v) return '-'; var a = v.indexOf('02') === 0 ? 2 : 3; return v.length > a + 4 ? v.slice(0, a) + '-' + v.slice(a, v.length - 4) + '-' + v.slice(-4) : v; }

  // a small accessible message box (same look as the 회원탈퇴 confirmation window)
  function modal(text, onOk) {
    var ov = document.createElement('div'); ov.className = 'shp-dlg-ov';
    ov.innerHTML = '<div class="shp-dlg my-dlg" role="alertdialog" aria-modal="true" aria-describedby="my-dlg-d" tabindex="-1"><p id="my-dlg-d" class="shp-dlg-d"></p><div class="shp-dlg-a"><button type="button" class="shp-btn main" data-ok>확인</button></div></div>';
    ov.querySelector('#my-dlg-d').textContent = text; document.body.appendChild(ov); document.documentElement.classList.add('shp-dlg-lock');
    var ok = ov.querySelector('[data-ok]'), done = false;
    function finish() { if (done) return; done = true; document.removeEventListener('keydown', key, true); ov.remove(); document.documentElement.classList.remove('shp-dlg-lock'); if (onOk) onOk(); }
    function key(e) { if (e.key === 'Tab') { e.preventDefault(); ok.focus(); } else if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); finish(); } }
    document.addEventListener('keydown', key, true); ok.addEventListener('click', finish); ok.focus();
  }

  function init(root) {
    var view = root.id.replace(/-root$/, '').replace(/^mypage-?/, '') || 'home'; if (view === 'inquiries') view = 'inq';
    var home = view === 'home', cv = home ? 'orders' : view;
    var $ = function (id) { return root.querySelector('#' + id); };
    var seq = 0, booted = false, me = null, mq = window.matchMedia('(max-width: 900px)');
    var rg = { days: 90, from: '', to: '', st: '' };
    function setDays(n) { var t = new Date(), f = new Date(); f.setDate(f.getDate() - n); rg.days = n; rg.from = ymd(f); rg.to = ymd(t); }
    setDays(90);
    function main() { return $('my-main'); }
    function paint(my, html) { if (my === seq) main().innerHTML = html; return my === seq; }

    /* ---- page skeleton (the same on every 마이쇼핑 page) ---- */
    var solo = cv === 'profile' && !home;       // 회원 정보 수정 has its own page without the 마이쇼핑 menu
    function skeleton() {
      var nav = GROUPS.map(function (g) {
        return '<div class="my-g"><h2>' + g[0] + '</h2>' + g[1].map(function (k) { return '<a href="' + P[k][0] + '"' + (k === cv ? ' aria-current="page"' : '') + '>' + P[k][1] + '</a>'; }).join('') + '</div>';
      }).join('');
      var CHEV = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
      root.innerHTML = '<div class="shp-doc shp-my ' + (home ? 'my-home' : 'my-page') + (solo ? ' my-solo' : '') + '"><p class="shp-note" id="my-gate" role="status" hidden></p><div id="my-app" hidden>' +
        '<h1 class="my-title" id="my-h">' + (solo ? P[cv][1] : '마이쇼핑') + '</h1>' +
        (home ? '' : '<div class="my-bar"><a class="my-back" href="' + HOME + '" aria-label="마이쇼핑으로 돌아가기">' + CHEV + '</a><p class="my-bt" role="heading" aria-level="1">' + P[cv][1] + '</p><span class="my-bs" aria-hidden="true"></span></div>') +
        '<div class="my-grid"><nav class="my-nav" aria-label="마이쇼핑 메뉴">' + nav + '<button type="button" class="my-logout" id="my-logout">로그아웃</button></nav><section class="my-main" id="my-main" tabindex="-1" aria-live="polite"></section></div></div></div>';
      $('my-logout').addEventListener('click', function () { A.signOut().then(function () { S.toast('로그아웃되었습니다.'); setTimeout(function () { location.href = S.links.home; }, 600); }); });
    }
    function gate() {
      var ok = A.backendReady() && A.loggedIn();
      $('my-app').hidden = !ok; $('my-gate').hidden = ok;
      if (ok) return true;
      $('my-gate').innerHTML = (A.backendReady() ? '로그인 후 이용할 수 있습니다. ' : OFF + ' ') + (A.backendReady() ? '<a href="' + esc(S.links.login) + '" style="text-decoration:underline" id="my-login">로그인하기</a>' : '');
      var l = $('my-login'); if (l) l.addEventListener('click', function () { A.needLogin(home ? HOME : P[cv][0]); });   // the return address is remembered only when the person really goes to log in
      return false;
    }
    function run() {
      var my = ++seq; main().innerHTML = '<p class="shp-note">불러오는 중…</p>';
      A.profile().then(function (p) {
        if (my !== seq) return; if (!p) { main().innerHTML = empty('로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.'); return; }
        me = p; VIEWS[cv](my, p);
      });
    }
    function boot() { if (!gate()) return; if (home && mq.matches) { main().innerHTML = ''; return; } run(); }   // the phone landing page is only the menu: no content is loaded there

    /* ---- 주문 내역: two wide buttons (주문내역조회 / 취소/교환/반품 내역), status filter, date range ---- */
    var claimsTab = !home && cv === 'orders' && /[?&]tab=claims(&|$)/.test(location.search);
    var SEARCH = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
    // period box (참고: 기간 버튼 / 전체 주문처리상태 / 시작일 ~ 종료일 / 조회). st = the state object (days, from, to, st); statuses = status filter options or null
    function periodBox(st, statuses) {
      var sel = statuses ? '<select id="rg-st" class="my-sel" aria-label="주문처리상태"><option value="">전체 주문처리상태</option>' + statuses.map(function (s) { return '<option value="' + s + '"' + (st.st === s ? ' selected' : '') + '>' + (STATUS[s] || s) + '</option>'; }).join('') + (claimsTab && cv === 'orders' ? '<option value="partial"' + (st.st === 'partial' ? ' selected' : '') + '>일부 환불</option>' : '') + '</select>' : '';
      return '<div class="pd-box"><div class="pd-chips" role="group" aria-label="조회 기간">' + RANGES.map(function (r) { return '<button type="button" data-days="' + r[1] + '" aria-pressed="' + (st.days === r[1] ? 'true' : 'false') + '">' + r[0] + '</button>'; }).join('') + '</div>' + sel +
        '<div class="pd-dates"><input type="date" id="rg-from" value="' + esc(st.from) + '" aria-label="시작일"><span aria-hidden="true">~</span><input type="date" id="rg-to" value="' + esc(st.to) + '" aria-label="종료일"></div>' +
        '<p class="shp-err" id="rg-err" role="alert" hidden></p><button type="button" class="pd-go" id="rg-go">조회</button></div>';
    }
    function bindPeriod(st, reload, setD) {
      [].forEach.call(main().querySelectorAll('[data-days]'), function (b) { b.addEventListener('click', function () { if ($('rg-st')) st.st = $('rg-st').value; setD(+b.getAttribute('data-days')); reload(); }); });
      if ($('rg-st')) $('rg-st').addEventListener('change', function () {
        st.st = this.value; var f = $('rg-from').value, t = $('rg-to').value;
        if (f && t && f <= t && (f !== st.from || t !== st.to)) { st.days = -1; st.from = f; st.to = t; }      // dates typed but not searched yet are kept, not thrown away
        reload();
      });
      $('rg-go').addEventListener('click', function () {
        var f = $('rg-from').value, t = $('rg-to').value, e = $('rg-err');
        if (!f || !t) { e.hidden = false; e.textContent = '시작일과 종료일을 선택해 주세요.'; return; }
        if (f > t) { e.hidden = false; e.textContent = '시작일이 종료일보다 늦을 수 없습니다.'; return; }
        st.days = -1; st.from = f; st.to = t; if ($('rg-st')) st.st = $('rg-st').value; reload();
      });
    }
    function rangeBox(statuses) {   // 주문 내역: underline tabs (same look as the product page tabs) + the period box
      var tabs = '<div class="ut-tabs" role="tablist" aria-label="주문 조회 구분"><button type="button" role="tab" class="ut-tab" data-tab="orders" aria-selected="' + (!claimsTab) + '"><span class="ot-l">주문내역조회</span><span class="ot-n" id="ot-n-orders"></span></button><button type="button" role="tab" class="ut-tab" data-tab="claims" aria-selected="' + claimsTab + '"><span class="ot-l">취소/교환/반품 내역</span><span class="ot-n" id="ot-n-claims"></span></button></div>';
      return tabs + periodBox(rg, statuses);
    }
    function bindRange(reload) {
      [].forEach.call(main().querySelectorAll('[data-tab]'), function (b) { b.addEventListener('click', function () {
        var c2 = b.getAttribute('data-tab') === 'claims'; if (c2 === claimsTab) return; claimsTab = c2; rg.st = '';
        try { if (!location.hash) history.replaceState(null, '', location.pathname + (c2 ? '?tab=claims' : '')); } catch (e) {}      // reload / back keep the chosen tab
        reload();
      }); });
      bindPeriod(rg, reload, setDays);
    }
    // claims = true: only cancelled / refunded / partly refunded orders. useStatus: the chosen status filter applies to the CURRENT button only.
    function fetchOrders(p, claims, useStatus) {
      var from = new Date(rg.from + 'T00:00:00'), to = new Date(rg.to + 'T23:59:59'), flt = '', st = useStatus ? rg.st : '';
      if (st === 'partial') flt = '&refunded_amount=gt.0&status=not.in.(refunded,cancelled)';
      else if (st) flt = '&status=eq.' + encodeURIComponent(st);
      else if (claims) flt = '&or=(status.in.(cancelled,refunded),refunded_amount.gt.0)';
      var q = 'select=order_no,created_at,status,items,subtotal,shipping_fee,total_amount,payment_method,refunded_amount&user_id=eq.' + encodeURIComponent(p.id) + '&created_at=gte.' + encodeURIComponent(from.toISOString()) + '&created_at=lte.' + encodeURIComponent(to.toISOString()) + flt + '&order=created_at.desc&limit=100';
      return A.rest.select('orders', q, true);
    }
    function orderRows(list, none) {
      if (!list.length) return empty(none);
      return '<div class="my-tbl" role="table"><div class="my-tr my-th" role="row"><span role="columnheader">주문일자</span><span role="columnheader">주문번호</span><span role="columnheader">상품정보</span><span role="columnheader">금액</span><span role="columnheader">상태</span></div>' +
        list.map(function (o) {
          var i0 = items(o)[0] || {};
          return '<div class="my-tr" role="row"><span role="cell" class="my-d">' + esc(day(o.created_at)) + '</span><span role="cell" class="my-no"><button type="button" class="shp-lk2" data-order="' + esc(o.order_no) + '">' + esc(o.order_no) + '</button></span>' +
            '<span role="cell" class="my-pi">' + thumb(i0) + '<span>' + summary(o) + '</span></span><span role="cell" class="my-am">' + esc(S.money(o.total_amount != null ? o.total_amount : o.subtotal + (o.shipping_fee || 0))) + '</span><span role="cell" class="my-st">' + esc(stLabel(o)) + '</span></div>';
        }).join('') + '</div>' + (list.length >= 100 ? '<p class="shp-note">최근 100건까지 표시됩니다. 기간을 좁혀 조회해 주세요.</p>' : '');
    }
    function listView(my, p) {
      function load() {
        var m2 = ++seq, claims = claimsTab;
        main().innerHTML = head('주문 내역') + rangeBox(claims ? CLAIM_FILTER : ORDER_FILTER) + '<div id="my-list"><p class="shp-note">불러오는 중…</p></div>' +
          (claims ? '<p class="shp-note my-nt">취소·환불 내역은 주문 정보에 실제로 기록된 처리 상태만 표시합니다. 교환·반품 요청을 접수하고 진행 상태를 저장하는 기능은 아직 연결되지 않았습니다. 교환·반품은 <a href="' + esc(S.links.contact) + '" style="text-decoration:underline">1:1 문의</a>로 접수해 주세요(문의를 보낸 것만으로 교환·반품이 완료되지는 않습니다).</p>' : '');
        bindRange(load);
        function count(id, n) { var el = $(id); if (el && n > 0) el.textContent = ' (' + (n >= 100 ? '100+' : n) + ')'; }     // a number only when there really are orders in the chosen period
        fetchOrders(p, claims, true).then(function (r) {
          if (m2 !== seq) return; var box = $('my-list'); if (!box) return;
          if (!r.ok) { box.innerHTML = empty(failText(r)); return; }
          var list = r.data || [];
          box.innerHTML = orderRows(list, claims ? '취소·교환·반품 내역이 없습니다.' : '주문 내역이 없습니다.');
          if (!rg.st) count(claims ? 'ot-n-claims' : 'ot-n-orders', list.length);
          [].forEach.call(box.querySelectorAll('[data-order]'), function (b) { b.addEventListener('click', function () { detail(b.getAttribute('data-order'), p, load); }); });
        });
        fetchOrders(p, !claims, false).then(function (r) { if (m2 === seq && r.ok) count(claims ? 'ot-n-orders' : 'ot-n-claims', (r.data || []).length); });
      }
      load();
    }
    function detail(no, p, back) {
      var m2 = ++seq; main().innerHTML = '<p class="shp-note">불러오는 중…</p>';
      // the member comes from the login token; the filter on user_id is a second line (row-level security on the server decides what is readable)
      A.rest.select('orders', 'select=order_no,created_at,status,items,subtotal,shipping_fee,total_amount,payment_method,refunded_amount,shipping&order_no=eq.' + encodeURIComponent(no) + '&user_id=eq.' + encodeURIComponent(p.id), true).then(function (r) {
        if (m2 !== seq) return;
        var o = r.ok && r.data && r.data[0];
        if (!o) { main().innerHTML = head('주문 상세', true) + empty(r.ok ? '주문을 찾을 수 없습니다.' : failText(r)) + '<button type="button" class="shp-btn line sm" id="my-bk" style="margin-top:16px">목록으로</button>'; $('my-bk').addEventListener('click', back); return; }
        var sh = o.shipping || {}, total = o.total_amount != null ? o.total_amount : o.subtotal + (o.shipping_fee || 0);
        main().innerHTML = head('주문 상세', true) + '<dl class="my-dl"><div><dt>주문번호</dt><dd>' + esc(o.order_no) + '</dd></div><div><dt>주문일자</dt><dd>' + esc(day(o.created_at)) + '</dd></div><div><dt>상태</dt><dd>' + esc(stLabel(o)) + '</dd></div></dl>' +
          '<h3 class="my-t3">주문 상품</h3><ul class="my-items">' + items(o).map(function (i) { return '<li>' + thumb(i) + '<span>' + esc(i.name) + ' · ' + esc(i.option) + ' · ' + esc(i.qty) + '개</span><b>' + esc(S.money(i.line_total)) + '</b></li>'; }).join('') + '</ul>' +
          '<dl class="my-dl"><div><dt>상품금액</dt><dd>' + esc(S.money(o.subtotal)) + '</dd></div><div><dt>배송비</dt><dd>' + (o.shipping_fee === 0 ? '무료' : esc(S.money(o.shipping_fee || 0))) + '</dd></div><div><dt>결제 금액</dt><dd><b>' + esc(S.money(total)) + '</b></dd></div>' + (o.payment_method ? '<div><dt>결제수단</dt><dd>' + esc(o.payment_method) + '</dd></div>' : '') + (o.refunded_amount > 0 ? '<div><dt>환불 금액</dt><dd>' + esc(S.money(o.refunded_amount)) + '</dd></div>' : '') + '</dl>' +
          '<h3 class="my-t3">받는 분</h3><dl class="my-dl"><div><dt>이름</dt><dd>' + esc(sh.name || '') + '</dd></div><div><dt>연락처</dt><dd>' + esc(sh.phone || '') + '</dd></div><div><dt>주소</dt><dd>' + esc(((sh.zip ? '(' + sh.zip + ') ' : '') + (sh.addr1 || '') + ' ' + (sh.addr2 || '')).trim()) + '</dd></div>' + (sh.memo ? '<div><dt>배송 메모</dt><dd>' + esc(sh.memo) + '</dd></div>' : '') + '</dl>' +
          '<button type="button" class="shp-btn line sm" id="my-bk" style="margin-top:20px">목록으로</button>';
        $('my-bk').addEventListener('click', back);
      });
    }

    var VIEWS = {};
    VIEWS.orders = listView;

    /* ---- 배송지 관리: the address book (max 10), everything stored on the SERVER ---- */
    var AB_COLS = 'id,label,recipient,phone_home,phone_mobile,zip,addr1,addr2,is_default,pinned,source';
    var AB_ERR = { ADDRESS_LIMIT: '배송지는 최대 10개까지 등록할 수 있습니다.', ADDRESS_DUPLICATE: '이미 등록된 주소입니다.', ADDRESS_INVALID: '입력한 내용을 확인해 주세요. (우편번호 숫자 5자리, 휴대전화 형식)', NOT_FOUND: '배송지를 찾을 수 없습니다.' };
    function abError(r) { var m = String(r.message || ''); for (var k in AB_ERR) if (m.indexOf(k) > -1) return AB_ERR[k]; return serverMissing(r) ? failText(r) : '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'; }
    VIEWS.address = function (my, p) {
      A.rest.select('address_book', 'select=' + AB_COLS + '&user_id=eq.' + encodeURIComponent(p.id) + '&order=is_default.desc,created_at.asc', true).then(function (r) {
        if (my !== seq) return;
        if (!r.ok) return paint(my, head('배송지 관리') + empty(failText(r)));
        abList(my, p, r.data || []);
      });
    };
    function abList(my, p, rows) {
      var full = rows.length >= 10;
      var html = head('배송지 관리') + '<p class="ab-count">등록된 배송지 <b>' + rows.length + '</b> / 10</p><p class="shp-err" id="ab-err" role="alert" hidden></p>';
      if (!rows.length) html += '<div class="ab-empty">등록된 주소가 없습니다.</div>';
      else html += '<div class="ab-tbl" role="table"><div class="ab-tr ab-th" role="row"><span role="columnheader">주소록 고정</span><span role="columnheader">배송지명</span><span role="columnheader">수령인</span><span role="columnheader">일반전화</span><span role="columnheader">휴대전화</span><span role="columnheader">주소</span><span role="columnheader">수정</span></div>' + rows.map(function (a) {
        return '<div class="ab-tr" role="row" data-id="' + esc(a.id) + '"><span role="cell" class="ab-pin" data-l="주소록 고정"><label class="ab-chk"><input type="checkbox" data-pin' + (a.pinned ? ' checked' : '') + ' aria-label="주소록 고정: ' + esc(a.label) + '"></label></span>' +
          '<span role="cell" class="ab-nm" data-l="배송지명"><label class="ab-sel"><input type="checkbox" data-sel aria-label="삭제할 배송지 선택: ' + esc(a.label) + '"><b>' + esc(a.label) + '</b></label></span>' +
          '<span role="cell" data-l="수령인">' + esc(a.recipient) + '</span><span role="cell" data-l="일반전화">' + esc(fmtHome(a.phone_home)) + '</span><span role="cell" data-l="휴대전화">' + esc(fmtMobile(a.phone_mobile)) + '</span>' +
          '<span role="cell" class="ab-ad" data-l="주소">(' + esc(a.zip) + ') ' + esc(a.addr1) + (a.addr2 ? ' ' + esc(a.addr2) : '') + '</span><span role="cell" class="ab-ed"><button type="button" class="shp-btn line sm" data-edit>수정</button></span></div>';
      }).join('') + '</div>';
      html += '<div class="ab-acts"><button type="button" class="shp-btn line" id="ab-delsel">선택 주소록 삭제</button><button type="button" class="shp-btn main" id="ab-new"' + (full ? ' disabled' : '') + '>배송지 등록</button></div><p class="shp-err ab-derr" id="ab-derr" role="alert" hidden></p>' + (full ? '<p class="shp-note ab-full">배송지는 최대 10개까지 등록할 수 있습니다. 삭제 후 등록해 주세요.</p>' : '') +
        '<section class="ab-notes" aria-labelledby="ab-nh"><h3 id="ab-nh">배송주소록 유의사항</h3><ul>' +
        '<li>배송 주소록은 최대 10개까지 등록할 수 있으며, 별도로 등록하지 않을 경우 최근 배송 주소록 기준으로 자동 업데이트됩니다.</li>' +
        '<li>자동 업데이트를 원하지 않을 경우 주소록 고정을 선택하시면 선택된 주소록은 업데이트 대상에서 제외됩니다.</li>' +
        '<li>기본 배송지는 1개만 저장됩니다. 다른 배송지를 기본 배송지로 설정하시면 기본 배송지가 변경됩니다.</li>' +
        '<li class="ab-state">자동 업데이트는 결제가 완료된 주문의 배송지를 기준으로 서버에서 처리합니다. 결제 서비스가 열리기 전에는 아직 반영될 주문이 없습니다.</li></ul></section>';
      if (!paint(my, html)) return;
      function fail(m) { var e = $('ab-err'); e.hidden = false; e.textContent = m; }
      $('ab-new').addEventListener('click', function () { abForm(my, p, rows, null); });
      // 선택 주소록 삭제: nothing selected -> a short notice and NO request; otherwise one more press confirms, then each selected address of the member is deleted on the server
      var ds = $('ab-delsel'), asked = 0;
      ds.addEventListener('click', function () {
        var d = $('ab-derr'); d.hidden = true;
        var ids = [].map.call(main().querySelectorAll('[data-sel]:checked'), function (c) { return c.closest('.ab-tr').getAttribute('data-id'); });
        if (!ids.length) { asked = 0; ds.textContent = '선택 주소록 삭제'; d.hidden = false; d.textContent = '삭제할 배송지를 선택해 주세요.'; return; }
        if (asked !== ids.length) { asked = ids.length; ds.textContent = '선택한 ' + ids.length + '개 삭제 (한 번 더 누르세요)'; return; }
        ds.disabled = true; var bad = 0;
        ids.reduce(function (pr, id) { return pr.then(function () { return A.rpc('delete_address', { p_id: id }).then(function (s) { if (!(s.ok && s.data && s.data.deleted === true)) bad++; }); }); }, Promise.resolve()).then(function () {
          if (!bad) { run(); return; }
          ds.disabled = false; asked = 0; ds.textContent = '선택 주소록 삭제'; d.hidden = false; d.textContent = bad + '개를 삭제하지 못했습니다. 목록을 새로 불러온 뒤 다시 시도해 주세요.'; run();
        });
      });
      [].forEach.call(main().querySelectorAll('[data-sel]'), function (c) { c.addEventListener('change', function () { asked = 0; ds.textContent = '선택 주소록 삭제'; $('ab-derr').hidden = true; }); });
      [].forEach.call(main().querySelectorAll('.ab-tr[data-id]'), function (tr) {
        var id = tr.getAttribute('data-id'), a = rows.filter(function (x) { return x.id === id; })[0];
        tr.querySelector('[data-edit]').addEventListener('click', function () { abForm(my, p, rows, a); });
        tr.querySelector('[data-pin]').addEventListener('change', function (e) {
          var box = e.target; box.disabled = true;
          A.rpc('set_address_pinned', { p_id: id, p_pinned: box.checked }).then(function (s) { if (s.ok && s.data && s.data.id === id) run(); else { box.disabled = false; box.checked = !box.checked; fail(abError(s)); } });
        });
      });
    }
    // 우편번호 검색: the official Kakao (Daum) postcode service. The script is loaded ONLY when 주소검색 is pressed. If it cannot be loaded (blocked / offline) the fields stay usable by hand.
    function loadPostcode() {
      return new Promise(function (res, rej) {
        if (window.daum && window.daum.Postcode) return res();
        var s = document.createElement('script'), t = setTimeout(function () { rej(new Error('timeout')); }, 10000);
        s.src = POSTCODE_SRC; s.async = true; s.onload = function () { clearTimeout(t); window.daum && window.daum.Postcode ? res() : rej(new Error('nopostcode')); }; s.onerror = function () { clearTimeout(t); rej(new Error('blocked')); };
        document.head.appendChild(s);
      });
    }
    function searchAddress(done, fail) {
      loadPostcode().then(function () {
        var ov = document.createElement('div'); ov.className = 'shp-dlg-ov ab-pc-ov';
        ov.innerHTML = '<div class="ab-pc" role="dialog" aria-modal="true" aria-label="주소 검색"><div class="ab-pc-h"><b>주소 검색</b><button type="button" class="ab-pc-x" aria-label="닫기">닫기</button></div><div class="ab-pc-b"></div></div>';
        document.body.appendChild(ov); document.documentElement.classList.add('shp-dlg-lock');
        function close() { document.removeEventListener('keydown', key, true); ov.remove(); document.documentElement.classList.remove('shp-dlg-lock'); }
        function key(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
        document.addEventListener('keydown', key, true); ov.querySelector('.ab-pc-x').addEventListener('click', close); ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
        try {
          new window.daum.Postcode({
            width: '100%', height: '100%',
            oncomplete: function (d) {
              var addr = d.userSelectedType === 'J' ? (d.jibunAddress || d.roadAddress) : (d.roadAddress || d.jibunAddress), extra = [];
              if (d.userSelectedType !== 'J') { if (d.bname && /[동로가]$/.test(d.bname)) extra.push(d.bname); if (d.buildingName && d.apartment === 'Y') extra.push(d.buildingName); }
              close(); done(String(d.zonecode || ''), addr + (extra.length ? ' (' + extra.join(', ') + ')' : ''));
            }
          }).embed(ov.querySelector('.ab-pc-b'));
          ov.querySelector('.ab-pc-x').focus();
        } catch (e) { close(); fail(); }
      }, fail);
    }
    function abForm(my, p, rows, a) {
      var v = a || { label: '', recipient: p.name || '', phone_home: '', phone_mobile: '', zip: '', addr1: '', addr2: '', is_default: !rows.length, pinned: false };
      function f(id, lab, val, attrs) { return '<label class="shp-field"><span>' + lab + '</span><input class="shp-in" id="' + id + '" value="' + esc(val || '') + '" ' + (attrs || '') + '></label>'; }
      paint(my, head(a ? '배송지 수정' : '배송지 등록') + '<form class="shp-form my-form" id="ab-form" novalidate>' +
        f('ab-label', '배송지명', v.label, 'maxlength="30"') + f('ab-rc', '수령인', v.recipient, 'maxlength="50" autocomplete="name"') +
        f('ab-hp', '일반전화 (선택)', fmtHome(v.phone_home) === '-' ? '' : fmtHome(v.phone_home), 'type="tel" inputmode="tel" maxlength="14" autocomplete="tel-national"') + f('ab-mp', '휴대전화', fmtMobile(v.phone_mobile), 'type="tel" inputmode="numeric" maxlength="13" autocomplete="tel"') +
        '<div class="shp-field ab-addr" role="group" aria-labelledby="ab-al"><span id="ab-al">주소</span>' +
          '<div class="ab-zr"><input class="shp-in" id="ab-zip" value="' + esc(v.zip) + '" placeholder="우편번호" aria-label="우편번호" inputmode="numeric" maxlength="5" autocomplete="postal-code"><button type="button" class="shp-btn line" id="ab-search">주소검색</button></div>' +
          '<input class="shp-in" id="ab-a1" value="' + esc(v.addr1) + '" placeholder="기본주소" aria-label="기본주소" maxlength="200" autocomplete="address-line1">' +
          '<input class="shp-in" id="ab-a2" value="' + esc(v.addr2) + '" placeholder="나머지 주소(선택 입력 가능)" aria-label="나머지 주소" maxlength="200" autocomplete="address-line2"></div>' +
        '<label class="shp-chk"><input type="checkbox" id="ab-def"' + (v.is_default ? ' checked' : '') + '><span>기본 배송지로 설정</span></label><label class="shp-chk"><input type="checkbox" id="ab-pin"' + (v.pinned ? ' checked' : '') + '><span>주소록 고정</span></label>' +
        '<p class="shp-err" id="ab-ferr" role="alert" hidden></p><div class="my-btns"><button type="button" class="shp-btn line" id="ab-cancel">취소</button><button type="submit" class="shp-btn main" id="ab-save">저장</button></div>' +
        (a ? '<div class="ab-del"><button type="button" class="shp-lk2" id="ab-del">이 배송지 삭제</button></div>' : '') + '</form>');
      $('ab-cancel').addEventListener('click', function () { run(); });
      $('ab-zip').addEventListener('input', function () { this.value = this.value.replace(/\D/g, ''); });
      $('ab-search').addEventListener('click', function () {
        var er = $('ab-ferr'); er.hidden = true;
        searchAddress(function (zip, addr) { $('ab-zip').value = zip; $('ab-a1').value = addr; $('ab-a2').focus(); }, function () { er.hidden = false; er.textContent = '주소검색을 불러오지 못했습니다. 우편번호와 주소를 직접 입력해 주세요.'; $('ab-zip').focus(); });
      });
      $('ab-form').addEventListener('submit', function (e) {
        e.preventDefault(); var er = $('ab-ferr'); er.hidden = true;
        var z = $('ab-zip').value.trim(), mp = A.normPhone($('ab-mp').value), hp = $('ab-hp').value.replace(/\D/g, '');
        if (!$('ab-label').value.trim() || !$('ab-rc').value.trim() || !$('ab-a1').value.trim()) { er.hidden = false; er.textContent = '배송지명, 수령인, 주소를 입력해 주세요.'; return; }
        if (!mp) { er.hidden = false; er.textContent = '휴대전화 번호를 정확히 입력해 주세요.'; return; }
        if (!/^\d{5}$/.test(z)) { er.hidden = false; er.textContent = '우편번호는 숫자 5자리로 입력해 주세요.'; return; }
        if (hp && !/^0\d{8,10}$/.test(hp)) { er.hidden = false; er.textContent = '일반전화 번호 형식이 올바르지 않습니다.'; return; }
        var b = $('ab-save'); b.disabled = true; b.textContent = '저장 중…';
        A.rpc('save_address', { p_id: a ? a.id : null, p_label: $('ab-label').value.trim(), p_recipient: $('ab-rc').value.trim(), p_phone_home: hp || null, p_phone_mobile: mp, p_zip: z, p_addr1: $('ab-a1').value.trim(), p_addr2: $('ab-a2').value.trim(), p_default: $('ab-def').checked, p_pinned: $('ab-pin').checked }).then(function (s) {
          if (s.ok && s.data && s.data.id) { run(); return; }
          b.disabled = false; b.textContent = '저장'; er.hidden = false; er.textContent = abError(s);
        });
      });
      var d = $('ab-del'); if (d) d.addEventListener('click', function () {
        if (d.getAttribute('data-ask') !== '1') { d.setAttribute('data-ask', '1'); d.textContent = '정말 삭제할까요? 한 번 더 누르면 삭제됩니다.'; return; }
        d.disabled = true; A.rpc('delete_address', { p_id: a.id }).then(function (s) { if (s.ok && s.data && s.data.deleted === true) run(); else { d.disabled = false; var er = $('ab-ferr'); er.hidden = false; er.textContent = '삭제하지 못했습니다.'; } });
      });
    }

    /* ---- 결제수단 관리: not available (payment is on hold); nothing is collected ---- */
    VIEWS.pay = function (my) {
      paint(my, head('결제수단 관리') + '<p class="my-soon"><b>준비 중입니다.</b><br>결제 서비스가 연결되면 이용할 수 있습니다. 카드번호·유효기간·CVC·계좌 정보는 이 사이트에서 입력받거나 저장하지 않으며, 저장된 결제수단도 없습니다.</p>');
    };
    /* ---- 리뷰 관리 ---- */
    VIEWS.reviews = function (my, p) {
      A.rest.select('reviews', 'select=id,product_id,rating,content,created_at,item_option,products(name)&user_id=eq.' + encodeURIComponent(p.id) + '&order=created_at.desc&limit=100', true).then(function (r) {
        if (my !== seq) return;
        if (!r.ok) return paint(my, head('리뷰 관리') + empty(failText(r)));
        var l = r.data || [];
        paint(my, head('리뷰 관리') + (l.length ? '<ul class="my-rv">' + l.map(function (v) {
          return '<li data-id="' + esc(v.id) + '"><div class="my-rvh"><b>' + esc((v.products && v.products.name) || '임페투스') + (v.item_option ? ' · ' + esc(v.item_option) : '') + '</b><span>' + esc(day(v.created_at)) + '</span></div><div class="my-star" aria-label="평점 ' + esc(v.rating) + '점">' + '★'.repeat(v.rating) + '<i>' + '★'.repeat(5 - v.rating) + '</i></div><p>' + esc(v.content) + '</p><div class="my-act"><button type="button" class="shp-lk2" data-del>삭제</button></div></li>';
        }).join('') + '</ul>' : empty('작성한 후기가 없습니다.')));
        [].forEach.call(main().querySelectorAll('[data-del]'), function (b) {
          b.addEventListener('click', function () {
            var li = b.closest('li'), act = li.querySelector('.my-act');
            act.innerHTML = '<span>이 후기를 삭제할까요?</span> <button type="button" class="shp-lk2" data-no>취소</button> <button type="button" class="shp-lk2" data-yes>삭제</button>';
            act.querySelector('[data-no]').addEventListener('click', function () { run(); });
            act.querySelector('[data-yes]').addEventListener('click', function () {
              var y = act.querySelector('[data-yes]'); y.disabled = true;
              A.rest.remove('reviews', 'id=eq.' + encodeURIComponent(li.getAttribute('data-id')) + '&user_id=eq.' + encodeURIComponent(p.id)).then(function (d) {
                if (d.ok && Array.isArray(d.data) && d.data.length === 1) run(); else act.innerHTML = '<span class="shp-err">삭제하지 못했습니다.</span>';
              });
            });
          });
        });
      });
    };
    /* ---- 나의 문의 내역: 1:1 + 상품문의 (private ones stay readable by their author only; the server enforces it) ---- */
    function inqList(l, kind, none) {
      return l.length ? '<ul class="my-iq">' + l.map(function (q) {
        var done = !!q.answer;
        return '<li><button type="button" class="my-iqh" aria-expanded="false"><span class="my-iqt">' + (kind === 'p' && q.is_public === false ? '<em>비공개</em> ' : '') + esc(q.title) + '</span><span class="my-iqm">' + esc(day(q.created_at)) + ' · ' + (done ? '답변 완료' : '답변 대기') + '</span></button>' +
          '<div class="my-iqb" hidden><p>' + esc(q.content).replace(/\n/g, '<br>') + '</p>' + (done ? '<div class="my-ans"><b>답변</b><p>' + esc(q.answer).replace(/\n/g, '<br>') + '</p></div>' : '') + '</div></li>';
      }).join('') + '</ul>' : '<p class="shp-empty my-empty my-empty-i">' + none + '</p>';
    }
    var iq = { tab: 's', days: 180, from: '', to: '', st: '' };
    (function () { var t = new Date(), f = new Date(); f.setDate(f.getDate() - 180); iq.from = ymd(f); iq.to = ymd(t); })();
    function setIqDays(n) { var t = new Date(), f = new Date(); f.setDate(f.getDate() - n); iq.days = n; iq.from = ymd(f); iq.to = ymd(t); }
    VIEWS.inq = function (my, p) {
      function load() {
        var m2 = ++seq, s = iq.tab === 's';
        // the write button belongs to the chosen tab: 1:1 문의 -> the 1:1 inquiry page, 상품문의 -> the 상품문의 section of the product page
        var href = s ? S.links.contact : (S.links.product + (String(S.links.product).charAt(0) === '#' ? '' : '#pd-qna'));
        main().innerHTML = head('나의 문의 내역') +
          '<div class="ut-tabs" role="tablist" aria-label="문의 구분"><button type="button" role="tab" class="ut-tab" data-iq="s" aria-selected="' + s + '">1:1 문의 내역</button><button type="button" role="tab" class="ut-tab" data-iq="p" aria-selected="' + (!s) + '">상품문의</button></div>' +
          '<a class="shp-btn main my-ask" href="' + esc(href) + '">문의하기</a>' + periodBox(iq, null) + '<div id="my-list"><p class="shp-note">불러오는 중…</p></div>';
        [].forEach.call(main().querySelectorAll('[data-iq]'), function (b) { b.addEventListener('click', function () { var t2 = b.getAttribute('data-iq'); if (t2 === iq.tab) return; iq.tab = t2; load(); }); });
        bindPeriod(iq, load, setIqDays);
        var from = new Date(iq.from + 'T00:00:00'), to = new Date(iq.to + 'T23:59:59');
        var win = '&created_at=gte.' + encodeURIComponent(from.toISOString()) + '&created_at=lte.' + encodeURIComponent(to.toISOString());      // the chosen period filters the member's OWN inquiries
        var req = s ? A.rest.select('service_inquiries', 'select=id,type,title,content,status,answer,answered_at,created_at&user_id=eq.' + encodeURIComponent(p.id) + win + '&order=created_at.desc&limit=100', true)
                    : A.rest.select('product_inquiries', 'select=id,title,content,is_public,answer,answered_at,created_at&user_id=eq.' + encodeURIComponent(p.id) + win + '&order=created_at.desc&limit=100', true);
        req.then(function (r) {
          if (m2 !== seq) return; var box = $('my-list'); if (!box) return;
          box.innerHTML = r.ok ? inqList(r.data || [], s ? 's' : 'p', s ? '작성하신 1:1 문의 내역이 없습니다.' : '작성하신 상품문의 내역이 없습니다.') : empty(failText(r));
          [].forEach.call(box.querySelectorAll('.my-iqh'), function (b) { b.addEventListener('click', function () { var o = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', o ? 'false' : 'true'); b.nextElementSibling.hidden = o; }); });
        });
      }
      load();
    };

    /* ---- 회원 정보 수정: 아이디 (= the log-in e-mail, read only), 이름, 휴대전화, 이메일 (+ optional new password). Only CHANGED items are processed, from ONE bottom button. ---- */
    VIEWS.profile = function (my, p) {
      A.rest.select('profiles', 'select=name,phone&id=eq.' + encodeURIComponent(p.id), true).then(function (r) {
        if (my !== seq) return;
        if (!r.ok || !r.data || !r.data[0]) return paint(my, empty(failText(r)));
        var f = r.data[0], ph = String(f.phone || ''), p1 = ph.slice(0, 3), p2 = ph.length === 11 ? ph.slice(3, 7) : ph.slice(3, 6), p3 = ph.slice(-4);
        var MOB = ['010', '011', '016', '017', '018', '019']; if (MOB.indexOf(p1) < 0) MOB.unshift(p1 || '010');
        function eye(id) { return '<div class="pf-eye"><input class="shp-in" id="' + id + '" type="password" autocomplete="new-password" maxlength="64"><button type="button" class="pf-eyeb" data-eye="' + id + '" aria-label="비밀번호 표시" aria-pressed="false"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div>'; }
        function row(lab, req, inner, id) { return '<div class="pf-row"><label class="pf-l"' + (id ? ' for="' + id + '"' : '') + '><span class="pf-d">' + (req ? '<i class="pf-req" aria-hidden="true">•</i>' : '') + '</span>' + lab + '</label><div class="pf-v">' + inner + '</div></div>'; }
        paint(my, '<div class="pf-head"><h3>기본정보</h3><span><i class="pf-req" aria-hidden="true">•</i> 필수입력사항</span></div><form id="pf-form" class="pf-form" novalidate>' +
          row('아이디', true, '<input class="shp-in" id="pf-id" value="' + esc(p.email || '') + '" readonly aria-readonly="true">', 'pf-id') +
          row('이름', true, '<input class="shp-in" id="pf-name" maxlength="50" autocomplete="name" value="' + esc(f.name || '') + '">', 'pf-name') +
          row('휴대전화', true, '<div class="pf-ph"><select class="shp-in" id="pf-p1" aria-label="휴대전화 앞자리">' + MOB.map(function (o) { return '<option' + (o === p1 ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select><span aria-hidden="true">-</span><input class="shp-in" id="pf-p2" inputmode="numeric" maxlength="4" aria-label="휴대전화 가운데 자리" value="' + esc(p2) + '"><span aria-hidden="true">-</span><input class="shp-in" id="pf-p3" inputmode="numeric" maxlength="4" aria-label="휴대전화 뒷자리" value="' + esc(p3) + '"></div>', 'pf-p1') +
          row('이메일', true, '<input class="shp-in" id="pf-email" type="email" autocomplete="email" value="' + esc(p.email || '') + '">', 'pf-email') +
          row('새 비밀번호', false, eye('pf-pw'), 'pf-pw') + row('새 비밀번호 확인', false, eye('pf-pw2'), 'pf-pw2') +
          '<div class="pf-row" id="pf-nrow" hidden><label class="pf-l" for="pf-nonce"><span class="pf-d"></span>확인 코드</label><div class="pf-v"><input class="shp-in" id="pf-nonce" inputmode="numeric" autocomplete="one-time-code" maxlength="12"></div></div>' +
          '<div id="pf-res" class="pf-res" role="status" aria-live="polite" hidden></div>' +
          '<p class="pf-out"><a href="' + esc(S.links.withdraw) + '" class="pf-outb">회원탈퇴</a></p>' +
          '<div class="pf-btns"><button type="button" class="shp-btn line" id="pf-cancel">취소</button><button type="submit" class="shp-btn main" id="pf-save">회원정보수정</button></div></form>');
        $('pf-cancel').addEventListener('click', function () { location.href = HOME; });     // nothing is saved; back to 마이쇼핑
        [].forEach.call(main().querySelectorAll('[data-eye]'), function (bt) { bt.addEventListener('click', function () { var i = $(bt.getAttribute('data-eye')), show = i.type === 'password'; i.type = show ? 'text' : 'password'; bt.setAttribute('aria-pressed', show ? 'true' : 'false'); bt.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 표시'); }); });
        ['pf-p2', 'pf-p3'].forEach(function (id) { $(id).addEventListener('input', function () { this.value = this.value.replace(/\D/g, ''); }); });
        var need = false, loginEmail = A.normEmail(p.email), pendingEmail = '', busy = false;     // what is already saved / already requested: a retry never repeats a finished item
        $('pf-form').addEventListener('submit', function (e) {
          e.preventDefault(); if (busy) return; var res = $('pf-res'); res.hidden = true; res.innerHTML = '';
          function line(kind, t) { res.hidden = false; res.insertAdjacentHTML('beforeend', '<p class="' + (kind === 'wait' ? 'pf-wait' : 'shp-err') + '">' + esc(t) + '</p>'); }
          var nm = $('pf-name').value.trim(), np = A.normPhone($('pf-p1').value + $('pf-p2').value + $('pf-p3').value), em = A.normEmail($('pf-email').value), pw = $('pf-pw').value, pw2 = $('pf-pw2').value, code = $('pf-nonce').value.trim();
          if (!nm) return line('err', '이름을 입력해 주세요.');
          if (!np) return line('err', '휴대전화 번호를 정확히 입력해 주세요.');
          if (!/^\S+@\S+\.\S+$/.test(em)) return line('err', '이메일 주소를 정확히 입력해 주세요.');
          if (pw || pw2) { if (pw.length < 8) return line('err', '새 비밀번호는 8자 이상으로 입력해 주세요.'); if (pw !== pw2) return line('err', '새 비밀번호 확인이 일치하지 않습니다.'); }
          var doProfile = nm !== (f.name || '') || np !== ph, doEmail = em !== loginEmail, doPw = !!pw;
          if (!doProfile && !doEmail && !doPw) return line('err', '변경된 내용이 없습니다.');
          // an e-mail change already requested and still waiting for the link is not sent again
          var sendEmail = doEmail && em !== pendingEmail, waitingOnly = doEmail && !sendEmail;
          if (!doProfile && !sendEmail && !doPw && waitingOnly) return line('wait', '이메일 변경은 새 주소의 인증 대기 중입니다. 메일의 링크를 열어 주세요.');
          busy = true; var b = $('pf-save'); b.disabled = true; b.textContent = '처리 중…';
          var jobs = [], bad = 0, wait = waitingOnly ? 1 : 0, okN = 0;
          if (waitingOnly) line('wait', '이메일: 인증 대기 중입니다. 메일의 링크를 열어 주세요.');
          if (doProfile) jobs.push(A.rest.update('profiles', 'id=eq.' + encodeURIComponent(p.id), (function () { var o = { name: nm }; if (np !== ph) o.phone = np; return o; })()).then(function (u) {
            if (u.ok && Array.isArray(u.data) && u.data.length === 1) { okN++; f.name = nm; ph = np; return; }
            bad++; var mm = String(u.message || '') + String(u.code || ''); line('err', /23505|duplicate|profiles_phone_uq/i.test(mm) ? '이미 사용 중인 휴대전화 번호입니다.' : mm.indexOf('PHONE_INVALID') > -1 ? '휴대전화 번호 형식이 올바르지 않습니다.' : '이름·휴대전화를 저장하지 못했습니다.');
          }));
          if (sendEmail) jobs.push(A.changeEmail(em).then(function (u) { if (u.ok) { wait++; pendingEmail = em; line('wait', '이메일: 새 주소로 확인 메일을 보냈습니다. 인증을 완료하면 변경됩니다.'); } else { bad++; line('err', '이메일: ' + u.message); } }));
          if (doPw) jobs.push(A.changePassword(pw, need ? code : '').then(function (u) {
            if (u.ok) { okN++; need = false; $('pf-nrow').hidden = true; $('pf-pw').value = ''; $('pf-pw2').value = ''; $('pf-nonce').value = ''; return; }
            if (u.reauth) return A.sendReauth().then(function (s) { bad++; if (s.ok) { need = true; $('pf-nrow').hidden = false; line('err', '비밀번호: 본인 확인 코드를 이메일로 보냈습니다. 코드를 입력하고 다시 눌러 주세요.'); } else line('err', '비밀번호: ' + s.message); });
            bad++; line('err', '비밀번호: ' + u.message);
          }));
          Promise.all(jobs).then(function () {
            busy = false; b.disabled = false; b.textContent = '회원정보수정';
            A.refreshProfile().then(function (np2) { if (np2) { p = np2; loginEmail = A.normEmail(np2.email); $('pf-id').value = np2.email || ''; if (pendingEmail && loginEmail === pendingEmail) { pendingEmail = ''; wait = 0; } } });
            // finished ONLY when every changed item was really saved and nothing waits for e-mail verification or a re-check code
            if (!bad && !wait) { res.hidden = true; modal('회원정보 수정이 완료되었습니다.', function () { location.href = HOME; }); return; }
            res.insertAdjacentHTML('afterbegin', '<p class="pf-sum ' + (okN ? 'is-part' : 'is-bad') + '">' + (bad && okN ? '일부 항목만 저장되었습니다. 실패한 항목을 확인한 뒤 다시 눌러 주세요.' : bad ? '저장하지 못했습니다. 입력한 내용은 그대로 유지됩니다.' : '아직 완료되지 않았습니다. 이메일 인증 후 완료됩니다.') + '</p>');
          });
        });
      });
    };

    /* ---- wiring ---- */
    skeleton();
    function visible() { return root.getClientRects().length > 0 && !(root.parentElement && root.parentElement.hidden); }
    function tryBoot() { if (!visible()) return; booted = true; boot(); }
    tryBoot();
    window.addEventListener('hashchange', function () { setTimeout(tryBoot, 0); });      // the merged single-file edition shows pages by #hash
    A.onChange(function () { if (!booted || !visible()) return; var on = A.backendReady() && A.loggedIn(); if (!on) gate(); else if ($('my-app').hidden) boot(); });   // logged out in another tab -> this page closes too
    if (home) (mq.addEventListener ? mq.addEventListener('change', function () { if (booted && !mq.matches && !$('my-app').hidden) run(); }) : mq.addListener(function () {}));
  }
  window.IMMy = { init: init };
})();
