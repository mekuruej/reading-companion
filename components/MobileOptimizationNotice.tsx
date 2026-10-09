"use client";

import { useSyncExternalStore } from "react";

const DISMISSAL_KEY = "mekuru-mobile-optimization-notice-dismissed";
const CHANGE_EVENT = "mekuru-mobile-notice-changed";
let dismissedInMemory = false;

function isDismissed() {
  if (dismissedInMemory) return true;
  try { return window.sessionStorage.getItem(DISMISSAL_KEY) === "true"; }
  catch { return false; }
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

export default function MobileOptimizationNotice() {
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);
  if (dismissed) return null;

  function dismiss() {
    dismissedInMemory = true;
    try { window.sessionStorage.setItem(DISMISSAL_KEY, "true"); }
    catch { /* Keep dismissal working when browser storage is unavailable. */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <aside aria-label="Mobile experience notice" className="mx-4 my-3 flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600 md:hidden">
      <p className="min-w-0 flex-1">
        This app is still being optimized for mobile. Some pages may be difficult to view or use. For the best experience, please use a larger screen.
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss mobile experience notice"
        className="shrink-0 rounded-md px-2 py-1 font-semibold text-stone-700 hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400">
        Dismiss
      </button>
    </aside>
  );
}
