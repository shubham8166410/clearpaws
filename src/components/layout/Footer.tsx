import Link from "next/link";
import { PawPrint } from "@/components/icons/PawPrint";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-800 text-white mt-auto">
      <div className="max-w-5xl mx-auto px-4 pt-12 pb-6">
        {/* 3-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pb-8 border-b border-white/10">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <PawPrint className="w-6 h-6 text-accent-500" aria-hidden="true" />
              <span className="font-extrabold text-lg tracking-tight">PetBorder</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Australia's pet import compliance planner. Built for pet owners navigating DAFF regulations.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
              Navigate
            </h3>
            <a href="/#how-it-works" className="text-sm text-white/70 hover:text-white transition-colors">
              How it works
            </a>
            <Link href="/generate" className="text-sm text-white/70 hover:text-white transition-colors">
              Start free
            </Link>
            <a href="/#faq" className="text-sm text-white/70 hover:text-white transition-colors">
              FAQ
            </a>
            <a
              href="https://www.agriculture.gov.au/biosecurity-trade/cats-dogs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Official DAFF site ↗
            </a>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
              Legal
            </h3>
            <span className="text-sm text-white/70 cursor-default">Privacy policy</span>
            <span className="text-sm text-white/70 cursor-default">Terms of use</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/40">
          <p>© {year} PetBorder. Built for Australian pet owners.</p>
          <p className="sm:max-w-sm sm:text-right leading-relaxed">
            PetBorder provides general guidance only. Always verify requirements with DAFF before travel.
          </p>
        </div>
      </div>
    </footer>
  );
}
