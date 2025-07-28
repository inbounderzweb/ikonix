// src/pages/OrderConfirmation.js
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useCart } from '../context/CartContext';


export default function OrderConfirmation() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const {clear} = useCart()
  const order     = state?.order;
  const addressId = state?.address_id;
  const orderId =
    order?.data?.order_id ||
    order?.data?.id ||
    order?.order_id ||
    order?.id ||
    '—';



useEffect(()=>{
if(addressId){
  clear()
}

},[])




  // Simple confetti with canvas (no external package)
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);

    const colors = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6'];
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * -H,
      r: Math.random() * 6 + 4,
      d: Math.random() * 2 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngleIncremental: Math.random() * 0.07 + 0.05,
      tiltAngle: 0
    }));

    let animationId;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pieces.forEach(p => {
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
      });
      update();
      animationId = requestAnimationFrame(draw);
    };

    const update = () => {
      pieces.forEach((p, i) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) * 0.8;
        p.tilt = Math.sin(p.tiltAngle - i / 3) * 15;

        if (p.y > H) {
          p.y = -20;
          p.x = Math.random() * W;
        }
      });
    };

    draw();
    // cleanup
    return () => cancelAnimationFrame(animationId);
  }, []);

  // balloons (dom elements)
  const [balloons] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: 5 + i * 12 + Math.random() * 5, // %
      delay: Math.random() * 3,
      size: Math.random() * 30 + 40 // px
    }))
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#faf7f4] overflow-hidden">
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-10"
      />

      {/* Floating balloons */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {balloons.map(b => (
          <div
            key={b.id}
            className="absolute bottom-[-120px] animate-float"
            style={{
              left: `${b.left}%`,
              animationDelay: `${b.delay}s`
            }}
          >
            <div
              className="rounded-full bg-[#FDE68A] flex items-center justify-center shadow-md"
              style={{ width: b.size, height: b.size }}
            >
              🎈
            </div>
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="relative z-30 max-w-lg w-full mx-auto bg-white/90 backdrop-blur rounded-2xl shadow-xl p-10 text-center">
        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Thank you!</h1>
        <p className="text-gray-600 mb-6">
          Your order has been placed successfully.
        </p>

        <div className="bg-gray-50 border rounded-lg p-4 text-left text-sm mb-6">
          <p><span className="font-medium">Order ID:</span> {orderId}</p>
          {addressId && (
            <p><span className="font-medium">Shipping Address ID:</span> {addressId}</p>
          )}
          {/* Show more order data if you want */}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/shop')}
            className="px-5 py-2.5 rounded-md border border-[#b49d91] text-[#b49d91] hover:bg-[#b49d91]/10 transition"
          >
            Continue Shopping
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-md bg-[#b49d91] text-white hover:opacity-90 transition"
          >
            Go Home
          </button>
        </div>
      </div>

      {/* Tailwind keyframes for balloon float */}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(-110vh) rotate(20deg); opacity: 0; }
        }
        .animate-float {
          animation: floatUp 9s linear infinite;
        }
      `}</style>
    </div>
  );
}
