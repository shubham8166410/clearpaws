"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8 text-gray-500">
      Loading API documentation...
    </div>
  ),
});

interface SwaggerUIComponentProps {
  spec: Record<string, unknown>;
}

export function SwaggerUIComponent({ spec }: SwaggerUIComponentProps) {
  return <SwaggerUI spec={spec} />;
}
