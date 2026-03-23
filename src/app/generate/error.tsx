"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function GenerateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[GenerateError]", error);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-4 text-center">
      <div className="text-5xl" aria-hidden="true">😿</div>
      <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        We hit an unexpected error. Please try again, and if the problem persists{" "}
        <a href="mailto:help@petborder.com" className="underline">
          contact us
        </a>
        .
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/">
          <Button variant="ghost">← Home</Button>
        </Link>
      </div>
    </div>
  );
}
