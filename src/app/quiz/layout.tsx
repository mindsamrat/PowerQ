import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Take the PQ Assessment | Way of Gods",
  description:
    "27 questions, about four minutes. Map your psychology of power across four axes and find which of eight archetypes drives your decisions.",
  alternates: { canonical: "/quiz" },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
