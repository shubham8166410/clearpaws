"use client";

import dynamic from "next/dynamic";

const LottieHero = dynamic(
  () => import("./LottieHero").then((m) => m.LottieHero),
  {
    ssr: false,
    // Transparent placeholder — same dimensions as the Lottie so no layout shift
    loading: () => (
      <div className="w-[180px] h-[180px] sm:w-[260px] sm:h-[260px] lg:w-[380px] lg:h-[380px]" aria-hidden="true" />
    ),
  }
);

export function HeroAnimation({ className }: { className?: string }) {
  return <LottieHero className={className} />;
}
