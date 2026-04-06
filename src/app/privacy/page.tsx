import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-primary-bg text-text-primary">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-[10px] tracking-[0.3em] uppercase text-text-muted font-[family-name:var(--font-body)] hover:text-text-primary transition-colors">
            Way of Gods
          </Link>
        </div>

        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold mb-8">
          Privacy Policy
        </h1>

        <div className="space-y-6 text-sm text-text-muted leading-relaxed font-[family-name:var(--font-body)]">
          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">What We Collect</h2>
            <p>
              We collect only your email address when you complete the Power Score quiz.
              Your quiz answers are processed entirely in your browser and are never sent to our servers.
              Quiz data is stored in your browser&apos;s session storage and is deleted when you close the tab.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">How We Use Your Email</h2>
            <p>
              Your email is used to deliver your Power Archetype results and, if purchased, your full Power Profile report.
              We may also send you occasional emails related to the Way of Gods content, including information about
              Sovereign: The Architecture of Human Power and related publications.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Email Marketing</h2>
            <p>
              By submitting your email, you consent to receiving marketing emails from Way of Gods.
              Every email contains a one-click unsubscribe link. You can opt out at any time.
              We typically send no more than one email per week.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Data Storage</h2>
            <p>
              Your email is stored securely in our email marketing platform. We do not maintain a separate database
              of user information. We do not store your quiz answers or results on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Cookies</h2>
            <p>
              This site does not use tracking cookies. We may use privacy-focused analytics that do not
              rely on cookies or collect personally identifiable information.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Third Parties</h2>
            <p>
              We do not sell, rent, or share your email address with third parties.
              Payment processing is handled by Gumroad, which has its own privacy policy.
              Email delivery is handled by our email marketing provider.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Your Rights</h2>
            <p>
              You may request deletion of your data at any time by contacting us or by clicking
              the unsubscribe link in any email. Upon unsubscription, your email will be removed
              from our active mailing list.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-base mb-2">Contact</h2>
            <p>
              For privacy-related inquiries, reach out via our Instagram @WayOfGods.
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
