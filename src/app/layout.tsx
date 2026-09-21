import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import { DockToggle } from "@/components/DockToggle";
import { SiteBubble } from "@/components/SiteBubble";
import { StackBubble } from "@/components/StackBubble";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/site";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "David Koen", url: "https://github.com/TheDavidKoen" }],
  creator: "David Koen",
  keywords: [
    "GraphQL",
    "GraphQL Yoga",
    "DataLoader",
    "The Met",
    "Metropolitan Museum of Art",
    "open access art",
    "Next.js",
    "API design",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#07070d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${display.variable} ${mono.variable}`} data-dock="closed">
      <body>
        {children}
        <DockToggle />
        <StackBubble />
        <SiteBubble />
      </body>
    </html>
  );
}
