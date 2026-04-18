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
  openGraph: {
    title: "PQ — The Power Quotient Assessment",
    description:
      "25 questions. 4 axes of power. 8 archetypes. Discover which one drives your decisions.",
    type: "website",
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
        <ConsoleWarning />
      </body>
    </html>
  );
}

function ConsoleWarning() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          console.log(
            "%cThis site is monitored. Unauthorized access to source code or data is prohibited.",
            "color: #C41E3A; font-size: 14px; font-weight: bold;"
          );
          document.addEventListener("contextmenu", function(e) { e.preventDefault(); });
        `,
      }}
    />
  );
}
