import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "End User License Agreement | Pulse",
  description: "End user license agreement for Pulse staff scheduling software.",
};

export default function EulaPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <article className="mx-auto max-w-3xl surface-card px-6 py-10 md:px-10 md:py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          End User License Agreement
        </h1>
        <p className="mt-2 text-sm text-slate-500">Effective date: April 7, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 md:text-base">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              1. Acceptance of these terms
            </h2>
            <p>
              By accessing or using Pulse (&quot;Service&quot;), you agree to this End User
              License Agreement (&quot;Agreement&quot;). If you are using the Service on behalf
              of an organization, you represent that you have authority to bind that
              organization. If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              2. The Service
            </h2>
            <p>
              Pulse provides staff scheduling, time tracking, notifications, and related
              workforce tools. Features may change over time. Some capabilities may require
              separate configuration or third-party connections (for example, accounting or
              payroll integrations).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              3. License grant
            </h2>
            <p>
              Subject to this Agreement, we grant you a limited, non-exclusive,
              non-transferable, revocable license to access and use the Service for your
              internal business operations during your subscription or trial, in accordance
              with our documentation and applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              4. Acceptable use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Use the Service in violation of law or in a way that harms others or our
                systems.
              </li>
              <li>
                Probe, scan, or test vulnerabilities without authorization, or interfere
                with the Service&apos;s operation.
              </li>
              <li>
                Attempt to gain unauthorized access to accounts, data, or networks.
              </li>
              <li>
                Reverse engineer, decompile, or attempt to extract source code except where
                prohibited by law.
              </li>
              <li>
                Resell, sublicense, or commercially exploit the Service without our prior
                written consent.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              5. Accounts and credentials
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of login credentials
              and for activity under your account. Notify us promptly if you suspect
              unauthorized use.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              6. Customer data
            </h2>
            <p>
              You retain your rights in data you submit to the Service (&quot;Customer
              Data&quot;). You grant us permission to host, process, and display Customer
              Data as needed to provide and secure the Service, consistent with our Privacy
              Policy. You represent that you have all rights and consents necessary to
              submit Customer Data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              7. Third-party services
            </h2>
            <p>
              Optional integrations (such as accounting platforms) are subject to those
              providers&apos; terms and privacy policies. We are not responsible for
              third-party services you choose to enable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              8. Intellectual property
            </h2>
            <p>
              The Service, including software, branding, and documentation, is owned by us
              and our licensors. Except for the limited license above, no rights are
              granted.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              9. Disclaimers
            </h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the maximum
              extent permitted by law, we disclaim warranties of merchantability, fitness
              for a particular purpose, and non-infringement. We do not warrant that the
              Service will be uninterrupted or error-free.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              10. Limitation of liability
            </h2>
            <p>
              To the maximum extent permitted by law: (a) we will not be liable for any
              indirect, incidental, special, consequential, or punitive damages; and (b) our
              aggregate liability for all claims relating to the Service will not exceed
              the amounts you paid us for the Service in the twelve (12) months before the
              claim (or, if none, fifty U.S. dollars).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              11. Indemnity
            </h2>
            <p>
              You will defend and indemnify us against claims arising from your Customer
              Data, your use of the Service in violation of this Agreement, or your breach
              of applicable law, subject to our prompt notice and reasonable cooperation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              12. Changes and termination
            </h2>
            <p>
              We may modify the Service or this Agreement with reasonable notice where
              required. We may suspend or terminate access for material breach or risk to
              the Service. Provisions that by their nature should survive will survive
              termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              13. General
            </h2>
            <p>
              This Agreement is governed by the laws of the State of Delaware, excluding
              conflict-of-law rules, unless otherwise required by applicable law. If a
              provision is unenforceable, the remainder stays in effect. This is the entire
              agreement regarding the subject matter and supersedes prior discussions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">14. Contact</h2>
            <p>
              For questions about this Agreement, contact us at the address or email
              published on your Pulse deployment or your order documentation.
            </p>
          </section>

          <p className="pt-4 text-xs text-slate-500">
            This document is provided for operational and integration requirements (such as
            developer platform listings). It is not personalized legal advice; have counsel
            review before relying on it commercially.
          </p>
        </div>

        <footer className="mt-12 flex justify-center border-t border-slate-100 pt-8">
          <Link
            href="/privacy"
            className="text-sm font-medium text-sky-700 hover:text-sky-800 hover:underline"
          >
            Privacy Policy
          </Link>
        </footer>
      </article>
    </div>
  );
}
