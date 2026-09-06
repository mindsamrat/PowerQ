import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | PQ — Way of Gods",
  description: "What the PQ Assessment collects, why, and how to have it deleted.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "6 September 2026";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-primary-bg text-text-primary">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-[10px] tracking-[0.3em] uppercase text-text-muted font-[family-name:var(--font-body)] hover:text-text-primary transition-colors">
            Way of Gods
          </Link>
        </div>

        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold mb-2">
          Privacy Policy
        </h1>
        <p className="text-xs text-text-muted/60 mb-8 font-[family-name:var(--font-body)]">Last updated {LAST_UPDATED}</p>

        <div className="space-y-6 text-sm text-text-muted leading-relaxed font-[family-name:var(--font-body)]">
          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Who we are</h2>
            <p>
              The PQ Assessment at quiz.wayofgods.com is operated by Way of Gods (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
              This policy explains what we collect when you take the assessment, why, and how to have it removed.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">What we collect</h2>
            <p>When you complete the assessment we store:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The first name and email address you enter on the final step.</li>
              <li>Your 27 multiple-choice answers and the scores, archetype and PQ number computed from them.</li>
              <li>Your two optional free-text answers, if you chose to write them.</li>
              <li>Your IP address and browser user-agent string, used only for abuse prevention and rate limiting.</li>
              <li>If you buy the full report: the payment status and time of payment. We never see or store your card details.</li>
            </ul>
            <p className="mt-2">
              While you are taking the quiz, your in-progress answers are also kept in your own browser&rsquo;s local storage for up to 48 hours so you can resume if the tab closes. This never leaves your device.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Why we collect it</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="text-text-primary">To produce your results.</span> Your answers are the input to your archetype, your free summary, and the paid report.</li>
              <li><span className="text-text-primary">To deliver what you bought.</span> The paid report is generated from your stored answers and watermarked with your email.</li>
              <li><span className="text-text-primary">To contact you.</span> We may email you about your results, the Sovereign book series, and other Way of Gods material. Every such email has an unsubscribe link. We send at most a few emails a month.</li>
              <li><span className="text-text-primary">To keep the service honest.</span> IP-based limits stop automated abuse and repeated submissions.</li>
              <li><span className="text-text-primary">To improve the assessment.</span> We analyse answers in aggregate (never individually attributed) to recalibrate archetype rarity and question quality.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Where it is stored and who can see it</h2>
            <p>
              Your record is stored in a database hosted by Supabase (supabase.com). Access is restricted to Way of Gods.
              Payments are processed by Dodo Payments, which acts as the merchant of record and has its own privacy policy;
              we pass them your email, your name, and an internal reference number so we can match the payment to your report.
              The site is hosted on Vercel. We do not sell, rent, or share your data with anyone else.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Cookies and analytics</h2>
            <p>
              We set no advertising or tracking cookies. The only browser storage we use is the local storage described above.
              If we add analytics in future, it will be a privacy-focused service that does not build individual profiles, and this page will be updated.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">How long we keep it</h2>
            <p>
              We keep your record for as long as you might want to return to your report. You can ask us to delete it at any time (below).
              If you unsubscribe from emails we stop emailing you but keep the record so your paid report remains available, unless you ask for deletion.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Your rights</h2>
            <p>
              Wherever you live, you can ask us to show you what we hold about you, correct it, or delete it.
              To do so, message us with the email address you used and, if you have it, the document id printed on your report.
              We will act within 30 days. If you are in the EU/UK you also have the right to complain to your data-protection authority.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Children</h2>
            <p>
              The assessment is intended for people aged 16 and over. If you believe a child has submitted data, contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Contact</h2>
            <p>
              Message us on Instagram at <a href="https://instagram.com/wayofgods" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-light">@wayofgods</a> or
              email <a href="mailto:hello@wayofgods.com" className="text-accent hover:text-accent-light">hello@wayofgods.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Changes</h2>
            <p>
              If we change this policy we will update the date at the top. Material changes will be announced on the site before they take effect.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-divider-dark flex items-center gap-6">
          <Link href="/" className="text-accent hover:text-accent-light text-sm font-[family-name:var(--font-body)] transition-colors">
            &larr; Back to Home
          </Link>
          <Link href="/terms" className="text-text-muted hover:text-text-primary text-sm font-[family-name:var(--font-body)] transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </main>
  );
}
