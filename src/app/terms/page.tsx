import Link from "next/link";

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-primary-bg text-text-primary">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-[10px] tracking-[0.3em] uppercase text-text-muted font-[family-name:var(--font-body)] hover:text-text-primary transition-colors">
            Way of Gods
          </Link>
        </div>

        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold mb-8">
          Terms of Service
        </h1>

        <div className="space-y-6 text-sm text-text-muted leading-relaxed font-[family-name:var(--font-body)]">
          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Acceptance of Terms</h2>
            <p>
              By accessing and using the Way of Gods Power Score Quiz, you agree to be bound by these
              terms of service. If you do not agree with any part of these terms, do not use this site.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">The Quiz</h2>
            <p>
              The Power Score Quiz is provided for entertainment and self-reflection purposes.
              It is not a clinical psychological assessment. Results should not be used as a substitute
              for professional advice. The quiz is free to take.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Digital Products</h2>
            <p>
              The Full Power Profile report is a digital product sold for $3.
              Due to the digital nature of this product, all sales are final.
              No refunds will be issued once the report has been delivered.
              The report is for personal use only and may not be redistributed,
              resold, or shared publicly.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Intellectual Property</h2>
            <p>
              All content on this site, including quiz questions, archetype descriptions,
              scoring methodology, and report content, is the intellectual property of Way of Gods.
              Unauthorized reproduction, distribution, or use of this content is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">User Conduct</h2>
            <p>
              You agree not to attempt to reverse-engineer the scoring system,
              scrape content from this site, use automated tools to complete the quiz,
              or circumvent any security measures implemented on this site.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Limitation of Liability</h2>
            <p>
              Way of Gods provides this quiz and related content &quot;as is&quot; without warranty of any kind.
              We are not liable for any decisions made based on quiz results or report content.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the site
              after changes constitutes acceptance of the updated terms.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-divider-dark">
          <Link href="/" className="text-accent hover:text-accent-light text-sm font-[family-name:var(--font-body)] transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
