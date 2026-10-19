import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your PQ Result | Way of Gods",
  description: "Your Power Quotient archetype, scores and signature answers.",
  // Result links are personal; search engines must not index them.
  robots: { index: false, follow: false },
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
