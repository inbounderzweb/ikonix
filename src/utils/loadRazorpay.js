// src/utils/loadRazorpay.js
let _rzpPromise;

/**
 * Dynamically loads the Razorpay Checkout SDK and resolves to window.Razorpay.
 * Usage:
 *   import loadRazorpay from '@/utils/loadRazorpay'
 *   await loadRazorpay();
 *   const rzp = new window.Razorpay(options);
 *
 * @param {Object} opts
 * @param {string} [opts.src]       Custom script URL (defaults to official CDN)
 * @param {number} [opts.timeoutMs] Abort load if it takes longer (default 15000ms)
 * @returns {Promise<typeof window.Razorpay>}
 */

export default function loadRazorpay({ src, timeoutMs = 15000 } = {}) {
  const SDK_SRC = src || 'https://checkout.razorpay.com/v1/checkout.js';

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only be loaded in the browser'));
  }
  // Already present
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  // Already loading
  if (_rzpPromise) return _rzpPromise;

  _rzpPromise = new Promise((resolve, reject) => {
    // If a script tag already exists, reuse it
    const existingByAttr = document.querySelector('script[data-razorpay-sdk="true"]');
    const existingBySrc = Array.from(document.getElementsByTagName('script')).find(
      (s) => s.src && s.src.includes('/checkout.razorpay.com/v1/checkout.js')
    );
    const existing = existingByAttr || existingBySrc;

    const done = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        _rzpPromise = undefined;
        reject(new Error('Razorpay SDK loaded but window.Razorpay not found'));
      }
    };
    const fail = (msg = 'Failed to load Razorpay SDK') => {
      _rzpPromise = undefined;
      reject(new Error(msg));
    };

    if (existing) {
      // If it already finished loading, resolve immediately
      if (window.Razorpay) return resolve(window.Razorpay);
      existing.addEventListener('load', done, { once: true });
      existing.addEventListener('error', () => fail(), { once: true });
      return;
    }

    // Freshly inject the script
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.defer = true;
    script.type = 'text/javascript';
    script.dataset.razorpaySdk = 'true'; // marker to find later

    const timeoutId = setTimeout(() => {
      script.remove();
      fail('Loading Razorpay SDK timed out');
    }, timeoutMs);

    script.onload = () => {
      clearTimeout(timeoutId);
      done();
    };
    script.onerror = () => {
      clearTimeout(timeoutId);
      fail();
    };

    document.head.appendChild(script);
  });

  return _rzpPromise;
}

/** True if the SDK is already available on window. */
export function isRazorpayLoaded() {
  return typeof window !== 'undefined' && !!window.Razorpay;
}

/** Removes the SDK script and clears cached state (rarely needed). */
export function unloadRazorpay() {
  if (typeof window === 'undefined') return;
  const tag = document.querySelector('script[data-razorpay-sdk="true"]');
  if (tag) tag.remove();
  try { delete window.Razorpay; } catch { /* ignore */ }
  _rzpPromise = undefined;
}

