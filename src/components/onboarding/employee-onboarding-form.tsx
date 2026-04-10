"use client";

import { useActionState, useEffect, useState } from "react";
import { completeEmployeeOnboarding } from "@/actions/employee-invite";
import { SCHEDULE_TIMEZONE_OPTIONS } from "@/lib/schedule/timezones";

const FILING = [
  { value: "SINGLE", label: "Single or married filing separately" },
  { value: "MARRIED_JOINT", label: "Married filing jointly" },
  { value: "MARRIED_SEPARATE", label: "Married filing separately" },
  { value: "HEAD_OF_HOUSEHOLD", label: "Head of household" },
] as const;

type Props = {
  token: string;
  defaultFirstName?: string;
  defaultLastName?: string;
};

export function EmployeeOnboardingForm({
  token,
  defaultFirstName,
  defaultLastName,
}: Props) {
  const [state, formAction, pending] = useActionState(
    completeEmployeeOnboarding,
    null,
  );
  const [compensationType, setCompensationType] = useState<"HOURLY" | "SALARY">(
    "HOURLY",
  );

  useEffect(() => {
    if (state?.ok) {
      window.location.href = "/login?onboarded=1";
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="token" value={token} />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Account</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <input
              name="passwordConfirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Time clock PIN</h2>
        <p className="text-xs text-slate-500">
          4–8 digits. Used at the workplace time clock terminal.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              PIN
            </label>
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              required
              pattern="\d{4,8}"
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Confirm PIN
            </label>
            <input
              name="pinConfirm"
              type="password"
              inputMode="numeric"
              required
              pattern="\d{4,8}"
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Your profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Legal first name
            </label>
            <input
              name="firstName"
              required
              autoComplete="given-name"
              defaultValue={defaultFirstName ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Legal last name
            </label>
            <input
              name="lastName"
              defaultValue={defaultLastName ?? ""}
              autoComplete="family-name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Mobile phone
            </label>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Time zone
            </label>
            <select
              name="timezone"
              required
              defaultValue="America/Chicago"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {SCHEDULE_TIMEZONE_OPTIONS.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Mailing address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Address line 1
            </label>
            <input
              name="addressLine1"
              required
              autoComplete="street-address"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Address line 2
            </label>
            <input
              name="addressLine2"
              autoComplete="address-line2"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              City
            </label>
            <input
              name="city"
              required
              autoComplete="address-level2"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              State
            </label>
            <input
              name="state"
              required
              maxLength={2}
              placeholder="TX"
              autoComplete="address-level1"
              className="mt-1 w-full uppercase rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              ZIP / postal code
            </label>
            <input
              name="postalCode"
              required
              autoComplete="postal-code"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Employment</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Hire date
            </label>
            <input
              name="hireDate"
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Employment type
            </label>
            <select
              name="employmentType"
              required
              defaultValue="FULL_TIME"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="FULL_TIME">Full time</option>
              <option value="PART_TIME">Part time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Pay type
            </label>
            <select
              name="compensationType"
              required
              value={compensationType}
              onChange={(e) =>
                setCompensationType(e.target.value as "HOURLY" | "SALARY")
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="HOURLY">Hourly</option>
              <option value="SALARY">Salary</option>
            </select>
          </div>
          {compensationType === "HOURLY" ? (
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Hourly rate (USD)
              </label>
              <input
                name="hourlyRate"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 18.50"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Annual salary (USD)
              </label>
              <input
                name="annualSalary"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 52000"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Tax withholding (federal / state)
        </h2>
        <p className="text-xs text-slate-500">
          Stored encrypted for payroll export. Adjust fields to match your
          payroll process.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Social Security number
            </label>
            <input
              name="ssn"
              type="password"
              inputMode="numeric"
              required
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Federal filing status
            </label>
            <select
              name="federalFilingStatus"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {FILING.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Federal dependents / credits ($)
            </label>
            <input
              name="federalDependentsAmount"
              type="text"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Extra federal withholding ($)
            </label>
            <input
              name="federalExtraWithholding"
              type="text"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              State withholding (code)
            </label>
            <input
              name="stateCode"
              maxLength={2}
              placeholder="Optional"
              className="mt-1 w-full uppercase rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              State allowances / notes
            </label>
            <input
              name="stateAllowancesOrNotes"
              type="text"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Extra state withholding ($)
            </label>
            <input
              name="stateExtraWithholding"
              type="text"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Direct deposit</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Bank name (optional)
            </label>
            <input
              name="bankName"
              type="text"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Routing number
            </label>
            <input
              name="routingNumber"
              required
              inputMode="numeric"
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Account type
            </label>
            <select
              name="accountType"
              required
              defaultValue="checking"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Account number
            </label>
            <input
              name="accountNumber"
              type="password"
              required
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Confirm account number
            </label>
            <input
              name="accountNumberConfirm"
              type="password"
              required
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Saving…" : "Complete onboarding"}
      </button>
    </form>
  );
}
