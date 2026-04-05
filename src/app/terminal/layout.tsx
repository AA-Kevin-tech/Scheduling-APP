export default function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      <header className="border-b border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Time clock
          </span>
          <span className="text-xs text-slate-500">Austin Aquarium</span>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
    </div>
  );
}
