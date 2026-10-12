/* Toss Payments (토스페이먼츠) 결제위젯(주문서형), browser side. Registers IMShop.payments.toss for order.html.
   What lives here is PUBLIC only: the widget client key (test_gck_… / live_gck_…) from config.js. The SECRET key (test_gsk_… / live_gsk_…) never reaches the browser:
   approval, refunds and price checks happen in the Supabase Edge Functions (backend/supabase/functions: payment-confirm, order-refund, payment-webhook).
   The page Toss sends the customer back to (payment-success.html) proves nothing by itself: an order is "paid" only after the server says so.
   Docs: https://docs.tosspayments.com/guides/v2/payment-widget/integration  (SDK v2 "standard": widgets() -> setAmount -> renderPaymentMethods / renderAgreement -> requestPayment).
   The payment methods offered in the widget are set in the Toss developer center (결제위젯 어드민): enable ONLY 카드 / 간편결제 (and 계좌이체 if wanted) — see backend/TOSS-SETUP.md. */
(function () {
  'use strict';
  var S = window.IMShop, A = window.IMAuth, P = ((window.IMPETVS_CONFIG || {}).payment) || {};
  var SDK = 'https://js.tosspayments.com/v2/standard';
  var key = function () { return String(P.clientKey || ''); };
  var isTest = function () { return /^test_/.test(key()); };
  var isLive = function () { return /^live_/.test(key()); };
  // a live key does nothing until the operator also sets payment.live = true (contract, review and live settings finished)
  function ready() { return P.provider === 'toss' && /^(test|live)_gck_[A-Za-z0-9_-]+$/.test(key()) && (!isLive() || P.live === true); }
  function why() {
    if (P.provider !== 'toss' || !key()) return '토스페이먼츠 결제 설정(결제위젯 클라이언트 키)';
    if (!/^(test|live)_gck_/.test(key())) return '결제위젯 클라이언트 키(test_gck_… / live_gck_…) 형식 확인';
    if (isLive() && P.live !== true) return '실제 결제 개시(계약·심사·라이브 설정 완료 후)';
    return '';
  }
  var widgets = null, mounted = null;
  function loadSdk() {
    return new Promise(function (resolve, reject) {
      if (window.TossPayments) return resolve(window.TossPayments);
      var s = document.createElement('script'); s.src = SDK; s.async = true;
      s.onload = function () { window.TossPayments ? resolve(window.TossPayments) : reject({ code: 'SDK_UNAVAILABLE' }); };
      s.onerror = function () { reject({ code: 'SDK_UNAVAILABLE' }); };
      document.head.appendChild(s);
    });
  }
  // shows the payment methods + Toss' payment terms inside the page. o = { total, methodsSel, agreeSel }. Loads the Toss script only when the customer is on the order page and payment is ready.
  function mount(o) {
    if (!ready()) return Promise.reject({ code: 'NOT_READY' });
    if (mounted) return mounted.then(function () { return update(o.total); });
    mounted = loadSdk().then(function (TossPayments) {
      // guests and members alike pay anonymously: no customer key, no stored payment method, no personal data sent to Toss from this page
      widgets = TossPayments(key()).widgets({ customerKey: TossPayments.ANONYMOUS || '@@ANONYMOUS' });
      return widgets.setAmount({ currency: 'KRW', value: o.total });
    }).then(function () {
      return Promise.all([widgets.renderPaymentMethods({ selector: o.methodsSel, variantKey: 'DEFAULT' }), widgets.renderAgreement({ selector: o.agreeSel, variantKey: 'AGREEMENT' })]);
    }).catch(function (e) { mounted = null; widgets = null; throw (e && e.code ? e : { code: 'SDK_UNAVAILABLE' }); });
    return mounted;
  }
  function update(total) { return widgets ? widgets.setAmount({ currency: 'KRW', value: total }) : Promise.resolve(); }
  // o = { orderNo, total, orderName } -> opens the payment (the browser leaves this page; it returns to successUrl / failUrl). total = the amount the SERVER computed.
  function start(o) {
    if (!ready()) return Promise.reject({ code: 'NOT_READY' });
    if (!widgets) return Promise.reject({ code: 'SDK_UNAVAILABLE' });
    var base = A.siteBase();
    return update(o.total).then(function () {
      return widgets.requestPayment({ orderId: o.orderNo, orderName: o.orderName, successUrl: base + '/payment-success.html', failUrl: base + '/payment-fail.html' });
    });
  }
  S.payments.toss = { ready: ready, why: why, isTest: isTest, mount: mount, update: update, start: start };
})();
