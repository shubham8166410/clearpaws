"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Shown once after a new user signs in via Google OAuth.
 * Reads ?welcome=1 from the URL, shows a toast, then removes the param.
 */
export function WelcomeToast() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Show the toast
    setVisible(true);

    // Remove ?welcome=1 from the URL without a full navigation
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    router.replace(url.pathname + (url.search || ""), { scroll: false });

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]",
        "bg-brand-600 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg",
        "flex items-center gap-2.5",
        "transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
      ].join(" ")}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      Welcome to PetBorder!
    </div>
  );
}
