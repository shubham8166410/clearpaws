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
  metadataBase: new URL("https://petborder.com"),
  title: {
    default: "PetBorder — Pet Travel Compliance Planner for Australia",
    template: "%s | PetBorder",
  },
  description:
    "Get a personalised DAFF compliance timeline for bringing your dog or cat to Australia. Exact dates, cost estimates, and step-by-step guidance — free in 60 seconds.",
  keywords: [
    "pet import Australia",
    "DAFF pet compliance",
    "bring dog to Australia",
    "bring cat to Australia",
    "pet travel Australia",
    "Mickleham quarantine",
    "RNATT blood test",
    "pet relocation Australia",
    "DAFF import permit",
    "pet quarantine Melbourne",
    "move to Australia with dog",
    "move to Australia with cat",
  ],
  authors: [{ name: "PetBorder", url: "https://petborder.com" }],
  creator: "PetBorder",
  publisher: "PetBorder",
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://petborder.com",
    siteName: "PetBorder",
    title: "PetBorder — Pet Travel Compliance Planner for Australia",
    description:
      "Personalised DAFF compliance timelines for bringing your pet to Australia. Know every step, deadline, and cost before you book.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PetBorder — Pet Travel Compliance Planner for Australia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@petborder_au",
    title: "PetBorder — Pet Travel Compliance Planner",
    description:
      "Know every DAFF step, deadline, and cost before moving your pet to Australia. Free in 60 seconds.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://petborder.com",
  },
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
