// Thank-you page (gracias.html): Google Customer Reviews opt-in (Merchant Center 5901112580). When the payment is
// confirmed (js/pages/gracias.js shows #thanks-ok) this asks the Worker for the order once more — the buyer's email
// travels only in that answer (`mail`) — and lets Google offer the buyer its survey: order reference, email, country and
// the date the order should have arrived (today + 14 days = the 10 business days of legal.html §6). Google asks the
// buyer for consent in its own dialog and nothing is sent to anyone if the buyer says no. Once per payment session.
// A new file, not js/pages/gracias.js. A failure here never touches the page.
(() => {
  'use strict';
  const ok = document.getElementById('thanks-ok');
  const C = window.hoeCart;
  const sid = new URLSearchParams(location.search).get('s') || '';
  if (!ok || !C || typeof C.order !== 'function' || !/^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(sid)) return;
  const KEY = 'hoe-gcr-' + sid;
  let done = false;
  function offer() {
    if (done || ok.hidden) return;
    done = true;
    try { if (sessionStorage.getItem(KEY)) return; } catch (e) { /* private mode: offer it anyway */ }
    C.order(sid).then(r => {
      if (!r || r.estado !== 'pagado' || !r.mail) return;
      const eta = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
      window.___gcfg = { lang: window.hoeLang && window.hoeLang() === 'es' ? 'es' : 'en_US' };
      window.renderOptIn = function () {
        window.gapi.load('surveyoptin', function () {
          window.gapi.surveyoptin.render({ merchant_id: 5901112580, order_id: String((r.pedidos && r.pedidos[0]) || r.ref || sid),
            email: r.mail, delivery_country: 'US', estimated_delivery_date: eta });
          try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* private mode */ }
        });
      };
      const s = document.createElement('script');
      s.src = 'https://apis.google.com/js/platform.js?onload=renderOptIn'; s.async = true; s.defer = true;
      document.head.appendChild(s);
    }).catch(() => { /* the page already shows the order */ });
  }
  new MutationObserver(offer).observe(ok, { attributes: true, attributeFilter: ['hidden'] });
  offer();
})();
