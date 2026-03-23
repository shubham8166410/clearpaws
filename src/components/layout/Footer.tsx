import Link from "next/link";
import { PawPrint } from "@/components/icons/PawPrint";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-800 text-white mt-auto">
      <div className="max-w-5xl mx-auto px-4 pt-12 pb-6">
        {/* 4-column grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-white/10">
          {/* Brand */}
          <div className="flex flex-col gap-3 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <PawPrint className="w-6 h-6 text-accent-500" aria-hidden="true" />
              <span className="font-extrabold text-lg tracking-tight">PetBorder</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Australia&apos;s pet travel compliance planner. Built for pet owners navigating DAFF regulations.
            </p>
          </div>

          {/* Plan your move */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
              Plan your move
            </h3>
            <Link href="/generate" className="text-sm text-white/70 hover:text-white transition-colors">
              Moving to Australia
            </Link>
            <Link href="/outbound" className="text-sm text-white/70 hover:text-white transition-colors">
              Leaving Australia
            </Link>
            <a href="/#how-it-works" className="text-sm text-white/70 hover:text-white transition-colors">
              How it works
            </a>
            <Link href="/dashboard/agencies" className="text-sm text-white/70 hover:text-white transition-colors">
              Compare agencies
            </Link>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
              Company
            </h3>
            <Link href="/about" className="text-sm text-white/70 hover:text-white transition-colors">
              About PetBorder
            </Link>
            <Link href="/contact" className="text-sm text-white/70 hover:text-white transition-colors">
              Contact Us
            </Link>
            <a
              href="https://www.agriculture.gov.au/biosecurity-trade/cats-dogs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Official DAFF site ↗
            </a>
          </div>

          {/* Support */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
              Support
            </h3>
            <Link href="/faq" className="text-sm text-white/70 hover:text-white transition-colors">
              FAQ
            </Link>
            <Link href="/privacy" className="text-sm text-white/70 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-white/70 hover:text-white transition-colors">
              Terms of Use
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/40">
          <p>© {year} PetBorder. All rights reserved.</p>
          <p className="sm:max-w-sm sm:text-right leading-relaxed">
            PetBorder provides general guidance only. Always verify requirements with DAFF before booking travel for your pet.
          </p>
        </div>
      </div>
    </footer>
  );
}
