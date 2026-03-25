"use client";

import Lottie from "lottie-react";
import dogAnimation from "@/assets/animations/dog love.json";

interface LottieDogSuccessProps {
  autoplay?: boolean;
}

export function LottieDogSuccess({ autoplay = true }: LottieDogSuccessProps) {
  return (
    <Lottie
      animationData={dogAnimation}
      loop={false}
      autoplay={autoplay}
      style={{ width: 240, height: 240 }}
    />
  );
}
