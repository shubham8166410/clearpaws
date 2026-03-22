"use client";

import { useParams } from "next/navigation";
import { WlLeadCaptureBridge } from "@/components/whitelabel/WlLeadCaptureBridge";

export default function WlPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  return (
    <div className="px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <WlLeadCaptureBridge agencySlug={slug} />
      </div>
    </div>
  );
}
