import type { ReactNode } from 'react';
import { BadgeDollarSign, Gamepad2, Gauge, Layers, RotateCcw, SlidersHorizontal, Star, TextSearch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  countActive,
  DEFAULT_CRITERIA,
  INSTALLS_OPTIONS,
  MARKET_AGE_OPTIONS,
  PRESENCE_OPTIONS,
  PRICE_OPTIONS,
  RATINGS_OPTIONS,
  SCORE_OPTIONS,
  UPDATED_OPTIONS,
} from '../lib/criteria';
import type { CategoryOption, Criteria, Option } from '../lib/criteria';
import { formatNumber } from '../lib/format';
import type { SearchMode } from '../types';

interface Props {
  mode: SearchMode;
  criteria: Criteria;
  onChange: (criteria: Criteria) => void;
  onReset: () => void;
  /** Categorias da coleta atual (null antes da primeira busca). */
  categories: CategoryOption[] | null;
  /** Modo concorrente: categoria do app informado, para seleção rápida. */
  seedCategory?: { genreId: string; genre: string } | undefined;
  /** Resultado dos filtros na coleta atual. */
  summary?: { included: number; total: number } | undefined;
}

// ---------------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------------

const activeRing = 'border-indigo-400 bg-indigo-50/60 text-indigo-800';
const idleRing = 'border-slate-200 bg-white text-slate-800';

function Group({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <Icon className="size-3.5" />
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function SelectField<T extends string | number>({
  label,
  value,
  options,
  defaultValue,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  defaultValue: T;
  onChange: (value: T) => void;
}) {
  const active = value !== defaultValue;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select
        className={`h-9 w-full rounded-lg border px-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${active ? activeRing : idleRing}`}
        value={String(value)}
        onChange={(e) => {
          const picked = options.find((o) => String(o.value) === e.target.value);
          if (picked) onChange(picked.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SegmentedField<T extends string>({
  label,
  value,
  options,
  defaultValue,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  defaultValue: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid h-9 grid-flow-col overflow-hidden rounded-lg border border-slate-200">
        {options.map((o) => {
          const selected = value === o.value;
          const highlight = selected && o.value !== defaultValue;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.value)}
              className={`px-2 text-xs transition not-first:border-l not-first:border-slate-200 ${
                highlight
                  ? 'bg-indigo-600 font-semibold text-white'
                  : selected
                    ? 'bg-slate-100 font-semibold text-slate-800'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, icon, label, hint }: { checked: boolean; onChange: (v: boolean) => void; icon: ReactNode; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700" title={hint}>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </label>
  );
}

function CategoryPicker({
  options,
  selected,
  onChange,
  seedCategory,
}: {
  options: CategoryOption[] | null;
  selected: string[];
  onChange: (ids: string[]) => void;
  seedCategory?: { genreId: string; genre: string } | undefined;
}) {
  if (!options) {
    return <p className="text-xs text-slate-400">As categorias encontradas aparecem aqui depois da busca.</p>;
  }
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const seedAvailable = seedCategory && options.some((o) => o.genreId === seedCategory.genreId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-slate-500">
          {selected.length === 0 ? 'Todas as categorias' : `${selected.length} de ${options.length} selecionadas`}
        </span>
        {seedAvailable && (
          <button type="button" onClick={() => onChange([seedCategory.genreId])} className="font-medium text-indigo-600 hover:underline">
            Só a do app informado ({seedCategory.genre})
          </button>
        )}
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="font-medium text-slate-500 hover:text-slate-800 hover:underline">
            Limpar seleção
          </button>
        )}
      </div>
      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
        {options.map((o) => {
          const on = selected.includes(o.genreId);
          return (
            <button
              key={o.genreId}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.genreId)}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {o.genre} <span className={on ? 'text-indigo-200' : 'text-slate-400'}>{o.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------

export function FiltersPanel({ mode, criteria, onChange, onReset, categories, seedCategory, summary }: Props) {
  const set = <K extends keyof Criteria>(key: K, value: Criteria[K]) => onChange({ ...criteria, [key]: value });
  const active = countActive(criteria);
  const d = DEFAULT_CRITERIA;

  return (
    <section aria-label="Filtros" className="rounded-2xl border border-slate-200 bg-white text-left shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <SlidersHorizontal className="size-4 text-slate-500" /> Filtros
          </span>
          {active > 0 && (
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
              {active} {active === 1 ? 'ativo' : 'ativos'}
            </span>
          )}
          <span className="text-xs text-slate-400">
            {summary
              ? `Mostrando ${formatNumber(summary.included)} de ${formatNumber(summary.total)} apps da coleta`
              : 'Aplicados na hora sobre a coleta, sem nova busca'}
          </span>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={active === 0}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800 disabled:invisible"
        >
          <RotateCcw className="size-3.5" /> Limpar filtros
        </button>
      </header>

      <div className="grid gap-6 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
        <Group icon={Star} title="Qualidade">
          <SelectField label="Nota mínima" value={criteria.minScore} options={SCORE_OPTIONS} defaultValue={d.minScore} onChange={(v) => set('minScore', v)} />
          <SelectField label="Mínimo de avaliações" value={criteria.minRatings} options={RATINGS_OPTIONS} defaultValue={d.minRatings} onChange={(v) => set('minRatings', v)} />
        </Group>

        <Group icon={Gauge} title="Alcance e maturidade">
          <SelectField label="Mínimo de downloads" value={criteria.minInstalls} options={INSTALLS_OPTIONS} defaultValue={d.minInstalls} onChange={(v) => set('minInstalls', v)} />
          <SelectField label="Última atualização" value={criteria.updatedWithinMonths} options={UPDATED_OPTIONS} defaultValue={d.updatedWithinMonths} onChange={(v) => set('updatedWithinMonths', v)} />
          <SelectField label="Tempo de mercado" value={criteria.marketAge} options={MARKET_AGE_OPTIONS} defaultValue={d.marketAge} onChange={(v) => set('marketAge', v)} />
        </Group>

        <Group icon={BadgeDollarSign} title="Modelo de negócio">
          <SegmentedField label="Preço" value={criteria.price} options={PRICE_OPTIONS} defaultValue={d.price} onChange={(v) => set('price', v)} />
          <SegmentedField label="Anúncios" value={criteria.ads} options={PRESENCE_OPTIONS} defaultValue={d.ads} onChange={(v) => set('ads', v)} />
          <SegmentedField label="Compras no app" value={criteria.iap} options={PRESENCE_OPTIONS} defaultValue={d.iap} onChange={(v) => set('iap', v)} />
        </Group>

        <div className="sm:col-span-2 lg:col-span-3">
          <Group icon={Layers} title="Escopo">
            <CategoryPicker
              options={categories}
              selected={criteria.categories}
              onChange={(ids) => set('categories', ids)}
              seedCategory={mode === 'similar' ? seedCategory : undefined}
            />
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
              <Toggle
                checked={criteria.excludeGames}
                onChange={(v) => set('excludeGames', v)}
                icon={<Gamepad2 className="size-4 text-slate-400" />}
                label="Excluir jogos"
              />
              {mode === 'keyword' && (
                <Toggle
                  checked={criteria.requireTermMatch}
                  onChange={(v) => set('requireTermMatch', v)}
                  icon={<TextSearch className="size-4 text-slate-400" />}
                  label="Somente apps que citam o termo"
                  hint="O termo precisa aparecer no título, no resumo ou na descrição (ignora acentos e plural simples; não reconhece sinônimos)."
                />
              )}
            </div>
          </Group>
        </div>
      </div>
    </section>
  );
}
