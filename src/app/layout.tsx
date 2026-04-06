import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Power Score Quiz | Way of Gods",
  description:
    "Discover your Power Archetype. A free assessment that maps your psychology of power across 3 axes and reveals which of 6 archetypes drives your decisions.",
  openGraph: {
    title: "Discover Your Power Archetype | Way of Gods",
    description:
      "Take the free Power Score quiz. 15 questions. 3 axes of power. 6 archetypes. Find out how you wield influence.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
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
