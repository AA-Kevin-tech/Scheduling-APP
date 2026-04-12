import { getFirstVenueName } from "@/lib/queries/location-display";

export default async function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const venueName = await getFirstVenueName();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      <header className="border-b border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
            Pulse
          </span>
          {venueName ? (
            <span className="text-xs text-slate-500 dark:text-zinc-500">{venueName}</span>
          ) : null}
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
    </div>
  );
}
