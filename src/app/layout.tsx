import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PQ — The Power Quotient Assessment | Way of Gods",
  description:
    "The PQ Assessment maps your psychology of power across 4 axes and 8 archetypes. A proprietary diagnostic from Way of Gods.",
  metadataBase: new URL("https://quiz.wayofgods.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PQ — The Power Quotient Assessment",
    description:
      "27 questions. 4 axes of power. 8 archetypes. Discover which one drives your decisions.",
    type: "website",
    url: "https://quiz.wayofgods.com",
    siteName: "Way of Gods",
  },
  twitter: {
    card: "summary_large_image",
    title: "PQ — The Power Quotient Assessment",
    description:
      "27 questions. 4 axes of power. 8 archetypes. Discover which one drives your decisions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
