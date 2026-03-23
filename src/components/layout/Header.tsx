"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PawPrint } from "@/components/icons/PawPrint";
import type { User } from "@supabase/supabase-js";

// Animated logo paw — SSR-safe via dynamic import
const LogoPaw = dynamic(
  () =>
    import("@/components/icons/LottiePawSpinner").then(
      (m) => m.LottiePawSpinner
    ),
  {
    ssr: false,
    loading: () => (
      <PawPrint className="w-7 h-7 text-accent-500" aria-hidden="true" />
    ),
  }
);

// ── Icons ──────────────────────────────────────────────────────────────────

function LogOutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  visible: boolean;
}

function Toast({ message, visible }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]",
        "bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg",
        "transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
      ].join(" ")}
    >
      {message}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [signOutPending, setSignOutPending] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const signOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();

  // ── Auth state ────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") {
        router.push("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // ── Toast helper ──────────────────────────────────────────────────────────

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 3000);
  }, []);

  // ── Sign out (double-tap confirm) ─────────────────────────────────────────

  const handleSignOut = useCallback(async () => {
    if (!signOutPending) {
      // First tap — arm the confirm state, auto-reset after 3s
      setSignOutPending(true);
      if (signOutTimerRef.current) clearTimeout(signOutTimerRef.current);
      signOutTimerRef.current = setTimeout(() => setSignOutPending(false), 3000);
      return;
    }

    // Second tap — execute sign out
    if (signOutTimerRef.current) clearTimeout(signOutTimerRef.current);
    setSignOutPending(false);
    setUserMenuOpen(false);
    setMenuOpen(false);

    const supabase = createClient();
    await supabase.auth.signOut();
    showToast("You have been signed out");
    router.push("/");
    router.refresh();
  }, [signOutPending, router, showToast]);

  // Reset pending state if user menu closes
  useEffect(() => {
    if (!userMenuOpen && !menuOpen) {
      if (signOutTimerRef.current) clearTimeout(signOutTimerRef.current);
      setSignOutPending(false);
    }
  }, [userMenuOpen, menuOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (signOutTimerRef.current) clearTimeout(signOutTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── Scroll effect ─────────────────────────────────────────────────────────

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Body scroll lock (mobile menu) ───────────────────────────────────────

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // ── Close user menu on outside click ─────────────────────────────────────

  useEffect(() => {
    if (!userMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [userMenuOpen]);

  // ── Focus trap for mobile menu ────────────────────────────────────────────

  useEffect(() => {
    if (!menuOpen || !menuRef.current) return;
    const focusable = menuRef.current.querySelectorAll<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setMenuOpen(false); hamburgerRef.current?.focus(); }
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // ── Derived display values ────────────────────────────────────────────────

  const displayName = user?.user_metadata?.full_name?.split(" ")[0]
    ?? user?.email?.split("@")[0]
    ?? "Account";

  const avatarInitial = (user?.user_metadata?.full_name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  return (
    <>
      <header
        className={[
          "fixed top-0 inset-x-0 z-50 transition-all duration-200",
          scrolled
            ? "bg-white/95 backdrop-blur-sm border-b border-card-border shadow-sm"
            : "bg-transparent border-b border-transparent",
        ].join(" ")}
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-1 group"
            aria-label="PetBorder — Home"
          >
            <LogoPaw size={36} />
            <span className="font-extrabold text-xl text-brand-600 tracking-tight">
              PetBorder
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-6" aria-label="Main navigation">
            <a href="/#how-it-works" className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors">
              How it works
            </a>
            <a href="/#faq" className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors">
              FAQ
            </a>

            {user ? (
              /* User menu dropdown */
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label={`Account menu for ${displayName}`}
                  className="flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-gray-100 transition-colors"
                >
                  {/* Avatar circle */}
                  <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {avatarInitial}
                  </span>
                  <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-gray-400 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-lg border border-card-border py-1.5 animate-fade-up"
                  >
                    {/* Email label */}
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/dashboard"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <UserIcon />
                      My Dashboard
                    </Link>
                    <Link
                      href="/dashboard/timelines"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                      My Timelines
                    </Link>

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className={[
                          "flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors",
                          signOutPending
                            ? "text-red-600 bg-red-50 font-medium"
                            : "text-gray-600 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <LogOutIcon />
                        {signOutPending ? "Tap again to sign out" : "Sign out"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors">
                  Sign in
                </Link>
                <Link
                  href="/generate"
                  className="inline-flex items-center gap-1.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors min-h-[44px]"
                >
                  Start Free →
                </Link>
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="sm:hidden flex flex-col justify-center gap-1.5 w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors p-2"
          >
            <span
              className={`block h-0.5 bg-gray-700 rounded transition-all duration-200 ${
                menuOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`block h-0.5 bg-gray-700 rounded transition-all duration-200 ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 bg-gray-700 rounded transition-all duration-200 ${
                menuOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>
      </header>

      {/* Mobile full-screen overlay menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          id="mobile-menu"
          className="fixed inset-0 z-40 bg-white flex flex-col pt-20 px-6 gap-1 sm:hidden animate-fade-up"
          role="dialog"
          aria-label="Navigation menu"
          aria-modal="true"
        >
          <a href="/#how-it-works" onClick={() => setMenuOpen(false)} className="py-4 text-lg font-semibold text-gray-800 border-b border-gray-100 hover:text-brand-600 transition-colors">
            How it works
          </a>
          <a href="/#faq" onClick={() => setMenuOpen(false)} className="py-4 text-lg font-semibold text-gray-800 border-b border-gray-100 hover:text-brand-600 transition-colors">
            FAQ
          </a>

          {user ? (
            <>
              {/* User info */}
              <div className="flex items-center gap-3 py-4 border-b border-gray-100">
                <span className="w-9 h-9 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {avatarInitial}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>

              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="py-4 text-lg font-semibold text-gray-800 border-b border-gray-100 hover:text-brand-600 transition-colors">
                My Dashboard
              </Link>
              <Link href="/dashboard/timelines" onClick={() => setMenuOpen(false)} className="py-4 text-lg font-semibold text-gray-800 border-b border-gray-100 hover:text-brand-600 transition-colors">
                My Timelines
              </Link>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={[
                    "flex items-center justify-center gap-2 border text-base font-semibold px-6 py-4 rounded-2xl transition-colors w-full",
                    signOutPending
                      ? "border-red-300 bg-red-50 text-red-600"
                      : "border-card-border text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <LogOutIcon />
                  {signOutPending ? "Tap again to sign out" : "Sign out"}
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="py-4 text-lg font-semibold text-gray-800 border-b border-gray-100 hover:text-brand-600 transition-colors">
                Sign in
              </Link>
              <div className="pt-6">
                <Link
                  href="/generate"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center bg-accent-500 hover:bg-accent-600 text-white text-base font-semibold px-6 py-4 rounded-2xl transition-colors w-full"
                >
                  Start Free →
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* Spacer so page content doesn't hide under fixed header */}
      <div className="h-16" aria-hidden="true" />

      {/* Toast notification */}
      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
