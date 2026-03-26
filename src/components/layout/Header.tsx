"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import type { User } from "@supabase/supabase-js";

const CatLoveLogo = dynamic(
  () => import("@/components/icons/CatLoveLogo").then((m) => ({ default: m.CatLoveLogo })),
  { ssr: false, loading: () => <span style={{ width: 36, height: 36, display: "inline-block" }} /> }
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

// ── Auth skeleton (shown while auth state is resolving) ────────────────────

function AuthSkeleton() {
  return (
    <div className="flex items-center gap-3 animate-pulse" aria-hidden="true">
      <div className="h-8 w-16 bg-white/10 rounded-lg" />
      <div className="h-9 w-28 bg-white/10 rounded-lg" />
    </div>
  );
}

// ── Desktop nav link with active indicator ─────────────────────────────────

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  isActive: boolean;
  prefersReduced: boolean | null;
}

function NavLink({ href, children, isActive, prefersReduced }: NavLinkProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        "relative text-sm font-medium transition-all duration-150 px-3 py-1.5 rounded-lg whitespace-nowrap",
        isActive
          ? "text-white font-semibold bg-accent-500/20"
          : "text-white/70 hover:text-white hover:bg-white/8",
      ].join(" ")}
      style={{
        transform: !isActive && hovered && !prefersReduced ? "scale(1.03)" : "scale(1)",
        transition: "transform 150ms ease, color 150ms ease",
      }}
    >
      {children}
      {/* Active underline — always mounted so layoutId shared animation works.
          Fades/scales to 0 when not active so framer-motion has a source
          position to animate FROM when the active link changes. */}
      <motion.span
        layoutId="activeNavIndicator"
        className="absolute left-2 right-2 -bottom-0.5 h-0.5 rounded-full bg-accent-500"
        animate={{
          scaleX: isActive ? 1 : 0,
          opacity: isActive ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ originX: 0 }}
      />
      {/* Hover underline peek (non-active links only) */}
      {!isActive && (
        <motion.span
          className="absolute left-2 right-2 -bottom-0.5 h-0.5 rounded-full bg-accent-500/60"
          animate={{ scaleX: hovered && !prefersReduced ? 0.4 : 0, opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{ originX: 0 }}
        />
      )}
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [getStartedOpen, setGetStartedOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const getStartedRef = useRef<HTMLDivElement>(null);
  const signOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth state ────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser()
      .then(({ data }) => { setUser(data.user); })
      .catch(() => { setUser(null); })
      .finally(() => {
        // Small delay so the skeleton doesn't flash on fast connections
        authTimerRef.current = setTimeout(() => setAuthReady(true), 80);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // 150ms debounce to prevent jarring snap on auth state changes
      if (authTimerRef.current) clearTimeout(authTimerRef.current);
      authTimerRef.current = setTimeout(() => {
        setUser(session?.user ?? null);
        setAuthReady(true);
      }, 150);

      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (authTimerRef.current) clearTimeout(authTimerRef.current);
    };
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
      setSignOutPending(true);
      if (signOutTimerRef.current) clearTimeout(signOutTimerRef.current);
      signOutTimerRef.current = setTimeout(() => setSignOutPending(false), 3000);
      return;
    }

    if (signOutTimerRef.current) clearTimeout(signOutTimerRef.current);
    setSignOutPending(false);
    setUserMenuOpen(false);
    setMenuOpen(false);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast("Sign out failed. Please try again.");
      setSignOutPending(false);
      return;
    }
    window.location.href = "/";
  }, [signOutPending, showToast]);

  // Reset pending state if menus close
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
      if (authTimerRef.current) clearTimeout(authTimerRef.current);
    };
  }, []);

  // ── Scroll effect ─────────────────────────────────────────────────────────

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Body scroll lock (mobile menu) ───────────────────────────────────────

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // ── Close menus on outside click ─────────────────────────────────────────

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

  useEffect(() => {
    if (!getStartedOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (getStartedRef.current && !getStartedRef.current.contains(e.target as Node)) {
        setGetStartedOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [getStartedOpen]);

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

  // Which nav link is active?
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Mobile active link classes
  const mobileActiveClass = (href: string) =>
    isActive(href)
      ? "border-l-[3px] border-accent-500 bg-white/10 text-white font-semibold pl-3"
      : "border-l-[3px] border-transparent pl-3";

  return (
    <>
      <header
        className={[
          "fixed top-0 inset-x-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-brand-800/95 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
            : "bg-brand-800",
        ].join(" ")}
      >
        {/* Gradient accent line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-500/50 to-transparent" />

        <div className="max-w-5xl mx-auto px-4 h-[4.5rem] flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-1 group"
            aria-label="PetBorder — Home"
          >
            <motion.div
              animate={{ scale: scrolled ? 0.95 : 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <CatLoveLogo size={36} />
            </motion.div>
            <span className="font-semibold text-xl tracking-tight" style={{ letterSpacing: "-0.4px" }}>
              <span className="text-white">Pet</span><span style={{ color: "#E67E22" }}>Border</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-0.5" aria-label="Main navigation">
            {/* Divider */}
            <span className="w-px h-5 bg-white/15 mr-2" aria-hidden="true" />
            <a
              href="/#how-it-works"
              className="relative text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 transition-all duration-150 px-3 py-1.5 rounded-lg whitespace-nowrap"
            >
              How it works
            </a>
            <NavLink href="/generate" isActive={isActive("/generate")} prefersReduced={prefersReduced}>
              Moving to Australia
            </NavLink>
            <NavLink href="/outbound" isActive={isActive("/outbound")} prefersReduced={prefersReduced}>
              Leaving Australia
            </NavLink>
            <NavLink href="/about" isActive={isActive("/about")} prefersReduced={prefersReduced}>
              About
            </NavLink>

            {/* Auth section */}
            <div className="ml-2 flex items-center gap-3">
              {!authReady ? (
                <AuthSkeleton />
              ) : user ? (
                /* User menu dropdown */
                <motion.div
                  ref={userMenuRef}
                  className="relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((o) => !o)}
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                    aria-label={`Account menu for ${displayName}`}
                    className="flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-white/10 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {avatarInitial}
                    </span>
                    <span className="text-sm font-medium text-white/90 max-w-[120px] truncate">
                      {displayName}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                      className={`text-white/50 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        role="menu"
                        initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-lg border border-card-border py-1.5"
                      >
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        <Link href="/dashboard" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <UserIcon />
                          My Dashboard
                        </Link>
                        <Link href="/dashboard/timelines" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Sign in — ghost pill */}
                  <Link
                    href="/login"
                    className="text-sm font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 hover:bg-white/8 px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    Sign in
                  </Link>

                  {/* Get Started dropdown — with glow + arrow */}
                  <div ref={getStartedRef} className="relative">
                    <motion.button
                      type="button"
                      onClick={() => setGetStartedOpen((o) => !o)}
                      aria-expanded={getStartedOpen}
                      aria-haspopup="menu"
                      whileHover={prefersReduced ? {} : { scale: 1.02, boxShadow: "0 0 20px rgba(230, 126, 34, 0.35)" }}
                      whileTap={prefersReduced ? {} : { scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="inline-flex items-center gap-1.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors ring-1 ring-accent-400/40 min-h-[44px]"
                    >
                      Get Started
                      <motion.svg
                        xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        animate={{ rotate: getStartedOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </motion.svg>
                    </motion.button>

                    <AnimatePresence>
                      {getStartedOpen && (
                        <motion.div
                          role="menu"
                          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-lg border border-card-border py-1.5 z-50"
                        >
                          <Link href="/generate" role="menuitem" onClick={() => setGetStartedOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <span aria-hidden="true">✈️🇦🇺</span>
                            Moving to Australia
                          </Link>
                          <Link href="/outbound" role="menuitem" onClick={() => setGetStartedOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <span aria-hidden="true">🇦🇺✈️</span>
                            Leaving Australia
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </div>
          </nav>

          {/* Mobile hamburger */}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="sm:hidden flex flex-col justify-center gap-1.5 w-10 h-10 rounded-lg hover:bg-white/10 transition-colors p-2"
          >
            <motion.span
              className="block h-0.5 bg-white rounded origin-center"
              animate={menuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.span
              className="block h-0.5 bg-white rounded"
              animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.15 }}
            />
            <motion.span
              className="block h-0.5 bg-white rounded origin-center"
              animate={menuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.2 }}
            />
          </button>
        </div>
      </header>

      {/* Mobile menu — slide down */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            id="mobile-menu"
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scaleY: 0.95 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scaleY: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ originY: 0 }}
            className="fixed inset-x-0 top-[4.5rem] z-40 bg-brand-800 overflow-hidden sm:hidden border-b border-white/10 shadow-lg"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col px-6 py-4 gap-1">
              <a
                href="/#how-it-works"
                onClick={() => setMenuOpen(false)}
                className="py-3 text-base font-medium text-white/70 hover:text-white transition-colors border-l-[3px] border-transparent pl-3"
              >
                How it works
              </a>
              <Link href="/generate" onClick={() => setMenuOpen(false)} className={`py-3 text-base font-medium text-white/70 hover:text-white transition-colors ${mobileActiveClass("/generate")}`}>
                Moving to Australia
              </Link>
              <Link href="/outbound" onClick={() => setMenuOpen(false)} className={`py-3 text-base font-medium text-white/70 hover:text-white transition-colors ${mobileActiveClass("/outbound")}`}>
                Leaving Australia
              </Link>
              <Link href="/dashboard/agencies" onClick={() => setMenuOpen(false)} className={`py-3 text-base font-medium text-white/70 hover:text-white transition-colors ${mobileActiveClass("/dashboard/agencies")}`}>
                Compare Agencies
              </Link>

              <div className="border-t border-white/10 mt-2 pt-2 flex flex-col gap-0.5">
                <Link href="/faq" onClick={() => setMenuOpen(false)} className={`py-2.5 text-sm font-medium text-white/50 hover:text-white transition-colors ${mobileActiveClass("/faq")}`}>
                  FAQ
                </Link>
                <Link href="/about" onClick={() => setMenuOpen(false)} className={`py-2.5 text-sm font-medium text-white/50 hover:text-white transition-colors ${mobileActiveClass("/about")}`}>
                  About
                </Link>
                <Link href="/contact" onClick={() => setMenuOpen(false)} className={`py-2.5 text-sm font-medium text-white/50 hover:text-white transition-colors ${mobileActiveClass("/contact")}`}>
                  Contact
                </Link>
              </div>

              {user ? (
                <>
                  <div className="border-t border-white/10 mt-2 pt-3 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {avatarInitial}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                      <p className="text-xs text-white/50 truncate">{user.email}</p>
                    </div>
                  </div>
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={`py-3 text-base font-semibold text-white hover:text-white/80 transition-colors ${mobileActiveClass("/dashboard")}`}>
                    My Dashboard
                  </Link>
                  <Link href="/dashboard/timelines" onClick={() => setMenuOpen(false)} className={`py-3 text-base font-semibold text-white hover:text-white/80 transition-colors ${mobileActiveClass("/dashboard/timelines")}`}>
                    My Timelines
                  </Link>
                  <div className="pt-3 pb-2">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className={[
                        "flex items-center justify-center gap-2 border text-base font-semibold px-6 py-3.5 rounded-2xl transition-colors w-full",
                        signOutPending
                          ? "border-red-400 bg-red-900/30 text-red-300"
                          : "border-white/20 text-white/70 hover:bg-white/10",
                      ].join(" ")}
                    >
                      <LogOutIcon />
                      {signOutPending ? "Tap again to sign out" : "Sign out"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="py-3 text-base font-semibold text-white border-t border-white/10 hover:text-white/80 transition-colors border-l-[3px] border-l-transparent pl-3 mt-2">
                    Sign in
                  </Link>
                  <div className="pt-3 pb-2 flex flex-col gap-3">
                    <Link
                      href="/generate"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-base font-semibold px-6 py-4 rounded-2xl transition-colors w-full"
                    >
                      <span aria-hidden="true">✈️🇦🇺</span>
                      Bringing pet to Australia
                    </Link>
                    <Link
                      href="/outbound"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white text-base font-semibold px-6 py-4 rounded-2xl transition-colors w-full"
                    >
                      <span aria-hidden="true">🇦🇺✈️</span>
                      Taking pet overseas
                    </Link>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div className="h-[4.5rem]" aria-hidden="true" />

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
