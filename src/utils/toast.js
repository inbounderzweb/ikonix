// src/utils/toast.js
// Themed toast notifications, built on react-hot-toast for the plumbing
// (stacking, positioning, timers, enter/exit) with our own card design
// (see ToastCard.js) so it still matches the site's palette exactly.
import toast from "react-hot-toast";
import React from "react";
import ToastCard from "../components/toast/ToastCard";

const MOBILE_BREAKPOINT = 768;

// Large screens: top-center. Small screens: bottom-center.
const getPosition = () =>
  typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
    ? "bottom-center"
    : "top-center";

export function showToast({ icon = "success", title, text, timer = 2500 } = {}) {
  return toast.custom(
    (t) => (
      <ToastCard
        icon={icon}
        title={title}
        text={text}
        timer={timer}
        visible={t.visible}
        onDismiss={() => toast.dismiss(t.id)}
      />
    ),
    { duration: timer, position: getPosition() }
  );
}

export const toastSuccess = (title, text) => showToast({ icon: "success", title, text });
export const toastError = (title, text) => showToast({ icon: "error", title, text, timer: 3000 });
export const toastInfo = (title, text) => showToast({ icon: "info", title, text });
export const toastWarning = (title, text) => showToast({ icon: "warning", title, text, timer: 3000 });

// Keep just a short lead-in of a product name in toast copy so the whole
// message stays on a single line instead of wrapping the popup taller.
export const truncateName = (name, max = 22) => {
  if (!name) return name;
  return name.length > max ? `${name.slice(0, max).trimEnd()}…` : name;
};
