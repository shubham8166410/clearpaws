"use client";

import dynamic from "next/dynamic";

const LottieHero = dynamic(
  () => import("./LottieHero").then((m) => m.LottieHero),
  {
    ssr: false,
    // Transparent placeholder — same dimensions as the Lottie so no layout shift
    loading: () => (
      <div className="w-[200px] h-[200px] lg:w-[300px] lg:h-[300px]" aria-hidden="true" />
    ),
  }
);

export function HeroAnimation({ className }: { className?: string }) {
  return <LottieHero className={className} />;
}
