/**
 * Payoni Embed Widget Loader
 * Merchant web sitelerine eklenir: <script src="https://payoni.com/embed.js"></script>
 *
 * Kullanım:
 *   <div data-payoni-widget="wgt_abc123" data-payoni-amount="150.00"></div>
 *
 * Callback:
 *   window.Payoni.onSuccess(function(txId) { ... })
 *   window.Payoni.onError(function(message) { ... })
 */
(function () {
  'use strict';

  var PAYONI_BASE = 'https://payoni.com';
  var successCallbacks = [];
  var errorCallbacks = [];

  // postMessage dinleyicisi
  window.addEventListener('message', function (event) {
    if (event.origin !== PAYONI_BASE) return;
    var data = event.data;
    if (!data || !data.type) return;

    if (data.type === 'payoni:success') {
      successCallbacks.forEach(function (cb) { cb(data.txId); });
    } else if (data.type === 'payoni:error') {
      errorCallbacks.forEach(function (cb) { cb(data.message); });
    }
  });

  // Widget mount
  function mountWidget(container) {
    var widgetId = container.getAttribute('data-payoni-widget');
    var amount = container.getAttribute('data-payoni-amount') || '';

    if (!widgetId) return;

    var iframe = document.createElement('iframe');
    var src = PAYONI_BASE + '/embed/' + widgetId;
    if (amount) src += '?amount=' + encodeURIComponent(amount);

    iframe.src = src;
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.minHeight = '520px';
    iframe.style.borderRadius = '12px';
    iframe.allow = 'payment';
    iframe.setAttribute('title', 'Payoni Ödeme Formu');

    container.appendChild(iframe);
  }

  // DOM hazır olunca mount et
  function init() {
    var containers = document.querySelectorAll('[data-payoni-widget]');
    containers.forEach(mountWidget);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  window.Payoni = {
    onSuccess: function (cb) { successCallbacks.push(cb); },
    onError: function (cb) { errorCallbacks.push(cb); },
    mount: mountWidget,
  };
})();
