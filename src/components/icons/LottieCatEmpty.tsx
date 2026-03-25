"use client";

import Lottie from "lottie-react";
import catAnimation from "@/assets/animations/cat-love.json";

interface LottieCatEmptyProps {
  autoplay?: boolean;
}

export function LottieCatEmpty({ autoplay = true }: LottieCatEmptyProps) {
  return (
    <Lottie
      animationData={catAnimation}
      loop
      autoplay={autoplay}
      style={{ width: 160, height: 160 }}
    />
  );
}
