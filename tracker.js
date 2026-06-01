(function () {
  'use strict';

  var CFG = window.FUNNEL_CONFIG || {};
  var funnelId = CFG.funnelId || 'advertorial';
  var visitorId = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  var supabaseClient = null;
  var scrollMilestones = { 25: false, 50: false, 75: false, 100: false };

  /* ── SUPABASE INIT ── */
  if (CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    } catch (e) {}
  }

  /* ── META PIXEL ── */
  function initMetaPixel(pixelId) {
    if (!pixelId) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }

  /* ── GA INIT ── */
  function initGA(gaId) {
    if (!gaId) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaId);
  }

  /* ── SEND EVENT ── */
  function sendEvent(eventType, eventData) {
    var payload = {
      funnel_id: funnelId,
      visitor_id: visitorId,
      event_type: eventType,
      event_data: eventData || {},
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      referrer: document.referrer,
      created_at: new Date().toISOString()
    };

    // Supabase
    if (supabaseClient) {
      supabaseClient.from('funnel_events').insert(payload).then(function () {}).catch(function () {});
    }

    // Meta Pixel
    if (window.fbq) {
      if (eventType === 'cta_click' || eventType === 'conversion') {
        window.fbq('track', 'InitiateCheckout', eventData || {});
      } else if (eventType === 'page_view') {
        window.fbq('track', 'PageView');
      }
    }

    // GA
    if (window.gtag) {
      window.gtag('event', eventType, eventData || {});
    }
  }

  /* ── SCROLL TRACKING ── */
  function getScrollPercent() {
    var docH = Math.max(
      document.body.scrollHeight, document.documentElement.scrollHeight,
      document.body.offsetHeight, document.documentElement.offsetHeight
    );
    var winH = window.innerHeight;
    var scrolled = window.scrollY || window.pageYOffset;
    return Math.round((scrolled / (docH - winH)) * 100);
  }

  var scrollTicking = false;
  window.addEventListener('scroll', function () {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () {
      var pct = getScrollPercent();
      [25, 50, 75, 100].forEach(function (milestone) {
        if (pct >= milestone && !scrollMilestones[milestone]) {
          scrollMilestones[milestone] = true;
          sendEvent('scroll_' + milestone, { percent: milestone });
        }
      });
      scrollTicking = false;
    });
  }, { passive: true });

  /* ── CTA CLICK TRACKING ── */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-cta]');
    if (!el) return;
    var ctaId = el.getAttribute('data-cta');
    sendEvent('cta_click', { cta_id: ctaId, href: el.href || '' });
    sendEvent('conversion', { cta_id: ctaId });
  });

  /* ── PAGE VIEW ── */
  function init() {
    initMetaPixel(CFG.metaPixelId);
    initGA(CFG.gaId);
    sendEvent('page_view', {
      title: document.title,
      funnel_type: funnelId
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
