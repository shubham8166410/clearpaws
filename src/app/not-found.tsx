import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-4 text-center">
      <div className="text-5xl" aria-hidden="true">🐾</div>
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="text-sm text-gray-500 max-w-sm">
        This page doesn't exist. Let's get your pet's journey back on track.
      </p>
      <Link href="/">
        <Button>← Back to ClearPaws</Button>
      </Link>
    </div>
  );
}
