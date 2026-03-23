import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavigationProgress } from "@/components/layout/NavigationProgress";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PetBorder — Pet Travel Compliance Planner for Australia",
    template: "%s | PetBorder",
  },
  description:
    "Get a personalised DAFF compliance timeline for bringing your dog or cat to Australia. Exact dates, cost estimates, and step-by-step guidance.",
  keywords: [
    "pet import Australia",
    "DAFF pet compliance",
    "bring dog to Australia",
    "bring cat to Australia",
    "pet travel Australia",
    "Mickleham quarantine",
    "RNATT blood test",
    "pet relocation Australia",
  ],
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "PetBorder",
    title: "PetBorder — Pet Travel Compliance Planner for Australia",
    description:
      "Personalised DAFF compliance timelines for bringing your pet to Australia. Know exactly what to do and when.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PetBorder — Pet Travel Compliance Planner",
    description: "Personalised DAFF compliance timelines for Australia pet import.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${plusJakarta.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-surface text-gray-900 antialiased overflow-x-hidden">
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
