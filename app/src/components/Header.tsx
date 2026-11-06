import { BarChart3 } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {/* Mesmo desenho de public/favicon.svg — altere os dois juntos. */}
          <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BarChart3 className="size-4" />
          </span>
          <span className="text-lg font-bold tracking-tight">AppBench</span>
        </div>
        <span className="hidden text-sm text-slate-500 sm:block">Benchmarking de aplicativos · Google Play</span>
      </div>
    </header>
  );
}
