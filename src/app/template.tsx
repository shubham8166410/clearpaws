import { PageTransition } from "@/components/ui/PageTransition";

/**
 * Next.js template.tsx is remounted on every navigation (unlike layout.tsx
 * which is preserved). This makes AnimatePresence work correctly for page
 * enter/exit transitions.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
