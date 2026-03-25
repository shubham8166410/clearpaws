"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const DogSuccessAnimation = dynamic(
  () => import("@/components/icons/LottieDogSuccess").then((m) => m.LottieDogSuccess),
  { ssr: false }
);

interface Props {
  timelineId: string;
}

export function PaymentSuccessCelebration({ timelineId }: Props) {
  const storageKey = `petborder_celebrate_${timelineId}`;
  const [showAnimation, setShowAnimation] = useState(false);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    const alreadySeen = localStorage.getItem(storageKey);
    if (!alreadySeen) {
      setShowAnimation(true);
      localStorage.setItem(storageKey, "true");
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAutoplay(false);
    }
  }, [storageKey]);

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
      {showAnimation && (
        <div aria-hidden="true">
          <DogSuccessAnimation autoplay={autoplay} />
        </div>
      )}
      <div>
        <p className="font-bold text-green-900 text-lg">You&apos;re all set!</p>
        <p className="text-sm text-green-700 mt-1">Your document pack is ready to download.</p>
      </div>
      <a
        href={`/api/pdf/${timelineId}`}
        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors min-h-[44px]"
        aria-label="Download document pack PDF"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Download PDF
      </a>
    </div>
  );
}
