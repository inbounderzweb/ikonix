// src/components/toast/ToastCard.js
// Themed toast card rendered inside react-hot-toast's toast.custom().
import React from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

const ICONS = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
};

const STYLE_ID = "ikx-toast-card-styles";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .ikx-toast-item {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fdf8f5;
      color: #2A3443;
      border: 1px solid #eadcd5;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(42,52,67,0.15);
      padding: 12px 14px 14px;
      max-width: 320px;
      cursor: pointer;
    }
    @media (max-width: 767px) {
      .ikx-toast-item { max-width: 260px; padding: 8px 12px 10px; gap: 8px; }
    }
    .ikx-toast-bar {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 3px;
      background: #b49d91;
      animation-name: ikx-toast-shrink;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }
    @keyframes ikx-toast-shrink {
      from { width: 100%; }
      to { width: 0%; }
    }
  `;
  document.head.appendChild(style);
}

export default function ToastCard({ icon = "success", title, text, timer = 2500, visible = true, onDismiss }) {
  const Icon = ICONS[icon] || ICONS.success;

  return (
    <div
      role="status"
      className="ikx-toast-item"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-6px)",
        transition: "opacity 150ms ease, transform 150ms ease",
      }}
      onClick={onDismiss}
    >
      <Icon className="h-[22px] w-[22px] shrink-0 self-center text-[#b49d91]" />
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
        <p className="whitespace-nowrap overflow-hidden text-ellipsis text-[12.5px] sm:text-[13px] font-semibold leading-snug">
          {title}
        </p>
        {text && (
          <p className="whitespace-nowrap overflow-hidden text-ellipsis text-[11px] sm:text-xs text-[#2A3443]/70">
            {text}
          </p>
        )}
      </div>
      <span className="ikx-toast-bar" style={{ animationDuration: `${timer}ms` }} />
    </div>
  );
}
