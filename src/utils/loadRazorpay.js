// src/utils/loadRazorpay.js
export function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const scriptId = 'razorpay-checkout-js';
    if (document.getElementById(scriptId)) return resolve(true);

    const s = document.createElement('script');
    s.id = scriptId;
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(s);
  });
}
