import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | PQ — Way of Gods",
  description: "What the PQ Assessment collects, why, who sees it, how long it is kept, and how to have it deleted.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "19 October 2026";

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
        <p className="text-xs text-text-muted mb-8 font-[family-name:var(--font-body)]">Last updated {LAST_UPDATED}</p>

        <div className="space-y-6 text-sm text-text-muted leading-relaxed font-[family-name:var(--font-body)]">
          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Who we are</h2>
            <p>
              The PQ Assessment at quiz.wayofgods.com is operated by Way of Gods (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
              This policy explains what we collect when you take the assessment, why, who else sees it, and how to have it removed.
              The assessment is for people aged 16 and over.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">What we collect</h2>
            <p>When you complete the assessment we store one record containing:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The first name and email address you enter on the final step.</li>
              <li>Your multiple-choice answers (24 or 27, depending on whether the tiebreaker questions were needed) and the scores, archetype and PQ number computed from them.</li>
              <li>Your answers to the two optional free-text prompts, if you chose to write them.</li>
              <li>Whether you ticked the box asking for occasional emails from Way of Gods.</li>
              <li>Where you came from, if your link carried it: campaign tags (<span className="font-mono">utm_*</span>), the referring site, and the page you landed on. No advertising identifiers, no cross-site tracking.</li>
              <li>Your IP address and browser identification string, used only to limit abuse (see below). These are deleted automatically after 30 days.</li>
              <li>If you buy the full report: the payment status, the time of payment, and the payment reference issued by Dodo Payments. We never see or store your card or bank details.</li>
            </ul>
            <p className="mt-2">
              Your browser also keeps a copy of your in-progress answers, your finished result, and the campaign tags above, so you can resume the quiz if the tab closes and so the results page can offer you the report. This is deleted from your device automatically after 48 hours, and never leaves it except as part of the record described above.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Why we collect it</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="text-text-primary">To produce your results.</span> Your answers are the input to your archetype, your free summary, and the paid report. (Performing the service you asked for.)</li>
              <li><span className="text-text-primary">To deliver what you bought.</span> The paid report is generated from your stored answers, carries your name on the cover, and is watermarked with your email. (Performing our contract with you.)</li>
              <li><span className="text-text-primary">To email you — only if you asked.</span> If you ticked the box, we may send occasional notes about Way of Gods, including the Sovereign Doctrine book. Every email has an unsubscribe link. If you did not tick it, we send nothing. (Your consent, which you can withdraw at any time.)</li>
              <li><span className="text-text-primary">To keep the service honest.</span> Limits per email address and per network per day stop automated abuse. Your result is always shown even when a limit is reached; it is just not stored. (Our legitimate interest in running a working service.)</li>
              <li><span className="text-text-primary">To know what works.</span> Campaign tags tell us which post or link brought people here. We look at this in aggregate.</li>
              <li><span className="text-text-primary">To improve the assessment.</span> We analyse answers in aggregate, without names or emails, to check question quality and recalibrate archetype rarity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Who else sees it</h2>
            <p>
              Your record is stored in a database hosted by Supabase. The site runs on Vercel. Both act on our instructions as processors and cannot use your data for their own purposes.
            </p>
            <p className="mt-2">
              If you buy the report, payment is taken by Dodo Payments, which acts as the merchant of record under its own privacy policy. We pass Dodo your email, your name, an internal reference number so the payment can be matched to your report, and your country (worked out from your network location) so the right taxes and payment methods are offered. Dodo collects your card or bank details and billing address itself.
            </p>
            <p className="mt-2">
              Nobody else receives your data. We do not sell it, rent it, or share it with advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Cookies and analytics</h2>
            <p>
              We set no cookies at all, and no advertising or tracking scripts run on the site. The only browser storage we use is the local copy of your quiz described above.
              If we add analytics in future, it will be a privacy-focused service that does not build individual profiles, and this page will be updated first.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">How long we keep it</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP address and browser string: 30 days, then cleared automatically.</li>
              <li>The copy in your browser: 48 hours, then deleted automatically.</li>
              <li>Your record (name, email, answers, result, payment status): for as long as you might want to return to your report, unless you ask us to delete it. If you unsubscribe from emails we stop emailing you but keep the record so a paid report stays available.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Your rights</h2>
            <p>
              Wherever you live, you can ask us to show you what we hold about you, correct it, delete it, or stop emailing you.
              Email <a href="mailto:hello@wayofgods.com" className="text-accent hover:text-accent-light">hello@wayofgods.com</a> <span className="text-text-primary">from the address you used on the quiz</span> — that is how we confirm it is you, so we cannot act on requests sent from another address or through social media.
              We reply within 30 days. Deleting your record also removes any paid report attached to it.
              If you are in the EU or UK you also have the right to complain to your data-protection authority.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Children</h2>
            <p>
              The assessment is intended for people aged 16 and over. If you believe someone younger has submitted data, email us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Contact</h2>
            <p>
              Email <a href="mailto:hello@wayofgods.com" className="text-accent hover:text-accent-light">hello@wayofgods.com</a>.
              You can also reach us on Instagram at <a href="https://instagram.com/wayofgods" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-light">@wayofgods</a> for general questions, but requests about your data must come by email as described above.
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
