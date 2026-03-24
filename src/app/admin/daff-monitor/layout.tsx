import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DAFF Monitor | PetBorder Admin",
};

export default function DaffMonitorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
