import type { ReactNode } from 'react';
import { CalendarClock, Gamepad2, SlidersHorizontal } from 'lucide-react';
import type { Filters, PriceFilter } from '../types';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  disabled?: boolean;
}

const SCORE_OPTIONS = [
  { value: 0, label: 'Todas' },
  { value: 3, label: '3.0+' },
  { value: 4, label: '4.0+' },
  { value: 4.5, label: '4.5+' },
];

const INSTALL_OPTIONS = [
  { value: 0, label: 'Qualquer' },
  { value: 10_000, label: '10 mil+' },
  { value: 100_000, label: '100 mil+' },
  { value: 1_000_000, label: '1 mi+' },
  { value: 10_000_000, label: '10 mi+' },
];

const PRICE_OPTIONS: { value: PriceFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'free', label: 'Gratuitos' },
  { value: 'paid', label: 'Pagos' },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </div>
  );
}

const selectClass =
  'h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60';

function Toggle({
  checked,
  onChange,
  disabled,
  icon,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean | undefined;
  icon: ReactNode;
  label: string;
}) {
  return (
    <label className="flex h-9 cursor-pointer items-center gap-2.5 text-sm text-slate-700 has-disabled:cursor-not-allowed has-disabled:opacity-60">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </label>
  );
}

export function FiltersPanel({ filters, onChange, disabled }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <SlidersHorizontal className="size-3.5" /> Filtros
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-[auto_auto_auto_1fr]">
        <Field label="Nota mínima">
          <select
            className={selectClass}
            value={filters.minScore}
            disabled={disabled}
            onChange={(e) => set('minScore', Number(e.target.value))}
          >
            {SCORE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Mínimo de downloads">
          <select
            className={selectClass}
            value={filters.minInstalls}
            disabled={disabled}
            onChange={(e) => set('minInstalls', Number(e.target.value))}
          >
            {INSTALL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Preço">
          <div role="radiogroup" aria-label="Preço" className="inline-flex h-9 overflow-hidden rounded-lg border border-slate-200">
            {PRICE_OPTIONS.map((o) => {
              const active = filters.price === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => set('price', o.value)}
                  className={`px-3 text-sm transition not-first:border-l not-first:border-slate-200 disabled:cursor-not-allowed ${
                    active ? 'bg-indigo-50 font-semibold text-indigo-700' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="col-span-2 flex flex-wrap items-end gap-x-6 gap-y-2 md:col-span-1 md:justify-end">
          <Toggle
            checked={filters.recentOnly}
            onChange={(v) => set('recentOnly', v)}
            disabled={disabled}
            icon={<CalendarClock className="size-4 text-slate-400" />}
            label="Atualizados nos últimos 2 anos"
          />
          <Toggle
            checked={filters.excludeGames}
            onChange={(v) => set('excludeGames', v)}
            disabled={disabled}
            icon={<Gamepad2 className="size-4 text-slate-400" />}
            label="Excluir jogos"
          />
        </div>
      </div>
    </div>
  );
}
