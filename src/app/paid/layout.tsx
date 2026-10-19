import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your PQ Report | Way of Gods",
  description: "Download your full PQ Power Profile.",
  robots: { index: false, follow: false },
};

export default function PaidLayout({ children }: { children: React.ReactNode }) {
  return children;
}
