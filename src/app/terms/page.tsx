import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | PQ — Way of Gods",
  description: "Terms for using the PQ Assessment and buying the full report.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "6 September 2026";

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-primary-bg text-text-primary">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-[10px] tracking-[0.3em] uppercase text-text-muted font-[family-name:var(--font-body)] hover:text-text-primary transition-colors">
            Way of Gods
          </Link>
        </div>

        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold mb-2">
          Terms of Service
        </h1>
        <p className="text-xs text-text-muted/60 mb-8 font-[family-name:var(--font-body)]">Last updated {LAST_UPDATED}</p>

        <div className="space-y-6 text-sm text-text-muted leading-relaxed font-[family-name:var(--font-body)]">
          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">1. Agreement</h2>
            <p>
              By using the PQ Assessment at quiz.wayofgods.com (the &ldquo;Service&rdquo;), operated by Way of Gods, you agree to these terms
              and to our <Link href="/privacy" className="text-accent hover:text-accent-light">Privacy Policy</Link>. If you do not agree, do not use the Service.
              You must be at least 16 years old.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">2. What the assessment is, and is not</h2>
            <p>
              The PQ Assessment is a self-report questionnaire that classifies how you tend to exert influence across four behavioural axes.
              It draws on published psychology and behavioural-economics frameworks, but it is <span className="text-text-primary">not</span> a clinical
              instrument, a psychological diagnosis, or professional advice of any kind. Results describe tendencies, not facts about you, and depend
              entirely on how you answer. Archetype rarity figures are estimates until enough responses exist to compute them from data.
              Do not make medical, legal, financial, or employment decisions on the basis of your results.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">3. The free assessment</h2>
            <p>
              Taking the assessment and receiving the on-screen result and the free four-page summary costs nothing.
              To receive results you must provide a first name and a working email address. Disposable email addresses are rejected.
              We limit the number of completions per network address per day to prevent abuse.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">4. The paid report</h2>
            <p>
              The Full PQ Report is a digital PDF, generated from your stored answers, sold for the price shown at checkout (currently USD 3).
              Payment is taken by Dodo Payments, who act as merchant of record; their terms apply to the transaction itself.
              The report is available to download from the confirmation page immediately after payment is confirmed, and remains available at that link.
            </p>
            <p className="mt-2">
              <span className="text-text-primary">Refunds.</span> Because the report is personalised and delivered instantly, by completing the purchase you ask us to
              deliver it immediately and acknowledge that you lose any statutory right of withdrawal once it is delivered, where the law allows this.
              If the report fails to generate or is materially defective, contact us within 14 days and we will fix it or refund you.
              Nothing in these terms limits rights you have under consumer law that cannot be excluded.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">5. Licence and intellectual property</h2>
            <p>
              The questions, scoring method, archetype descriptions, report text, design, and shareable card images are the property of Way of Gods.
              You may download your own results and report for personal use, and you may share your shareable card and archetype name freely.
              You may not resell, republish, scrape, or reproduce the Service&rsquo;s content, or use it to build a competing assessment.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">6. Acceptable use</h2>
            <p>
              Do not submit false or third-party email addresses, use bots or scripts to complete the assessment, attempt to forge results or
              payment confirmations, interfere with the Service, or probe it for vulnerabilities without our written permission.
              We may block access from any source that does.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">7. Availability and changes</h2>
            <p>
              We may change the questions, scoring, archetypes, pricing, or design of the Service at any time, and may suspend or withdraw it.
              Changes to scoring may mean that retaking the assessment gives a different result. We may update these terms; the date at the top shows the current version,
              and continued use after a change means you accept it.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">8. Disclaimer and liability</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the fullest extent permitted by law we exclude all warranties,
              and our total liability to you for any claim arising from the Service is limited to the amount you paid us in the 12 months before the claim.
              We are not liable for indirect or consequential loss, or for decisions you make based on your results.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">9. Contact</h2>
            <p>
              Questions about these terms or about a purchase: Instagram <a href="https://instagram.com/wayofgods" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-light">@wayofgods</a> or
              email <a href="mailto:hello@wayofgods.com" className="text-accent hover:text-accent-light">hello@wayofgods.com</a>. Quote the document id from your report if you have one.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-divider-dark flex items-center gap-6">
          <Link href="/" className="text-accent hover:text-accent-light text-sm font-[family-name:var(--font-body)] transition-colors">
            &larr; Back to Home
          </Link>
          <Link href="/privacy" className="text-text-muted hover:text-text-primary text-sm font-[family-name:var(--font-body)] transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
