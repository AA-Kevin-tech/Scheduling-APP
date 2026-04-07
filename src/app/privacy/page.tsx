import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Pulse",
  description: "Privacy policy for Pulse staff scheduling software.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <article className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white px-6 py-10 shadow-sm md:px-10 md:py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">Effective date: April 7, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 md:text-base">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              1. Who we are
            </h2>
            <p>
              This Privacy Policy describes how Pulse (&quot;we,&quot; &quot;us&quot;) collects, uses, and
              shares personal information when you use our staff scheduling and time
              tracking services (the &quot;Service&quot;). The data controller is the entity
              operating the Service deployment you access (for example, your employer or a
              vendor hosting Pulse on their behalf).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              2. Information we collect
            </h2>
            <p>We may collect:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-medium text-slate-800">Account data:</strong> name,
                work email, role, organization identifiers, and credentials (passwords are
                stored using secure hashing).
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Scheduling and workforce data:
                </strong>{" "}
                shifts, departments, locations, time clock events, swap requests, approvals,
                and similar operational records you or your organization enter.
              </li>
              <li>
                <strong className="font-medium text-slate-800">Technical data:</strong> IP
                address, device/browser type, timestamps, and logs used for security,
                reliability, and troubleshooting.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Communications metadata:
                </strong>{" "}
                if your organization enables notifications, delivery-related information
                associated with email or SMS alerts.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Integration data (optional):
                </strong>{" "}
                if an administrator connects third-party services (such as accounting
                platforms), tokens and identifiers needed to maintain that connection, as
                described in the integration provider&apos;s documentation.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              3. How we use information
            </h2>
            <p>We use personal information to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide, operate, and improve the Service.</li>
              <li>Authenticate users and enforce access controls by role.</li>
              <li>Maintain security, prevent abuse, and meet legal obligations.</li>
              <li>
                Send operational or administrative messages when configured by your
                organization (for example, schedule or time-clock alerts).
              </li>
              <li>Analyze aggregated or de-identified usage to improve product quality.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              4. Legal bases (EEA/UK users)
            </h2>
            <p>
              Where the GDPR or UK GDPR applies, we rely on appropriate bases such as
              contract (providing the Service), legitimate interests (security and
              improvement, balanced against your rights), and consent where required for
              specific processing (for example, certain non-essential cookies or
              marketing, if offered).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              5. How we share information
            </h2>
            <p>
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-medium text-slate-800">Service providers</strong> who
                host infrastructure, send messages, or support the Service under contract and
                confidentiality obligations.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Integration partners
                </strong>{" "}
                when your organization enables a connection; those partners receive
                information in accordance with their services and your administrator&apos;s
                choices.
              </li>
              <li>
                <strong className="font-medium text-slate-800">Your employer</strong>, as
                the organization operating or purchasing access to Pulse may access
                workforce data in the normal course of managing schedules and time.
              </li>
              <li>
                <strong className="font-medium text-slate-800">Authorities</strong> when
                required by law or to protect rights, safety, and security.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              6. Retention
            </h2>
            <p>
              We retain information as long as needed to provide the Service, comply with
              law, resolve disputes, and enforce agreements. Retention periods may depend on
              your organization&apos;s settings and regulatory requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              7. Security
            </h2>
            <p>
              We use administrative, technical, and organizational measures designed to
              protect personal information. No method of transmission or storage is
              completely secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              8. International transfers
            </h2>
            <p>
              If data is processed in countries other than your own, we rely on appropriate
              safeguards where required (such as standard contractual clauses).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">9. Your choices</h2>
            <p>
              Depending on your jurisdiction, you may have rights to access, correct,
              delete, restrict, or object to certain processing, or to portability.
              Employees should contact their organization&apos;s administrator for many
              workforce-related requests. You may also contact us as described below.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              10. Children
            </h2>
            <p>
              The Service is not directed to children under 16, and we do not knowingly
              collect their personal information for commercial purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              11. Changes
            </h2>
            <p>
              We may update this Policy from time to time. We will post the revised version
              with an updated effective date and, where appropriate, provide additional
              notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">12. Contact</h2>
            <p>
              For privacy questions or requests, contact us at the address or email
              published on your Pulse deployment or your organization&apos;s administrator.
            </p>
          </section>

          <p className="pt-4 text-xs text-slate-500">
            This policy is provided for transparency and integration requirements. Have
            qualified counsel review it for your entity and jurisdictions.
          </p>
        </div>

        <footer className="mt-12 flex justify-center border-t border-slate-100 pt-8">
          <Link
            href="/eula"
            className="text-sm font-medium text-sky-700 hover:text-sky-800 hover:underline"
          >
            End User License Agreement
          </Link>
        </footer>
      </article>
    </div>
  );
}
