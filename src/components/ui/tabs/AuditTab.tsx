import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Download, FileJson, FileSpreadsheet, FilterX, ScrollText, Search, Users } from 'lucide-react';
import { useStockStore } from '../../../store/useStockStore';
import { useCurrentUser, usePermission } from '../../../hooks/useAuth';
import {
  REASON_LABEL,
  downloadFile,
  fileStamp,
  formatDateTime,
  movementsToCsv,
  movementsToJson,
  toCsv,
} from '../../../lib/exportLog';
import type { Movement, MovementReason, MovementType } from '../../../types/stock';
import { Panel, inputClass, labelClass } from '../Panel';
import { UserAvatar } from '../UserAvatar';

/** Acima disso a lista mostra só os mais recentes; a exportação sempre leva todos os filtrados. */
const MAX_RENDERED = 300;

/** Filtro combinado de tipo e motivo. */
type KindFilter = 'all' | MovementType | MovementReason;

const KIND_OPTIONS: Array<{ value: KindFilter; label: string }> = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'in', label: 'Entradas' },
  { value: 'out', label: 'Saídas' },
  ...(Object.keys(REASON_LABEL) as MovementReason[]).map((r) => ({ value: r, label: `· ${REASON_LABEL[r]}` })),
];

/** Valor especial do filtro de usuário para registros sem responsável. */
const UNIDENTIFIED = '__none__';

interface Filters {
  userId: string;
  kind: KindFilter;
  from: string;
  to: string;
  query: string;
}

const EMPTY_FILTERS: Filters = { userId: '', kind: 'all', from: '', to: '', query: '' };

const numberFormat = new Intl.NumberFormat('pt-BR');

/** `yyyy-mm-dd` (input date) → timestamp local do início do dia. */
const dayStart = (value: string) => new Date(`${value}T00:00:00`).getTime();
const DAY_MS = 86_400_000;

function applyFilters(movements: Movement[], f: Filters): Movement[] {
  const from = f.from ? dayStart(f.from) : -Infinity;
  const to = f.to ? dayStart(f.to) + DAY_MS : Infinity;
  const q = f.query.trim().toLowerCase();
  return movements.filter(
    (m) =>
      (!f.userId || (f.userId === UNIDENTIFIED ? m.userId === null : m.userId === f.userId)) &&
      (f.kind === 'all' || m.type === f.kind || m.reason === f.kind) &&
      m.at >= from &&
      m.at < to &&
      (!q || [m.sku, m.name, m.address, m.userName].some((v) => v.toLowerCase().includes(q))),
  );
}

interface UserSummary {
  userId: string | null;
  name: string;
  inCount: number;
  inUnits: number;
  outCount: number;
  outUnits: number;
  lastAt: number;
}

function summarize(movements: Movement[]): UserSummary[] {
  const byUser = new Map<string, UserSummary>();
  for (const m of movements) {
    const key = m.userId ?? UNIDENTIFIED;
    const row = byUser.get(key) ?? { userId: m.userId, name: m.userName, inCount: 0, inUnits: 0, outCount: 0, outUnits: 0, lastAt: 0 };
    if (m.type === 'in') {
      row.inCount++;
      row.inUnits += m.quantity;
    } else {
      row.outCount++;
      row.outUnits += m.quantity;
    }
    // Exibe o nome usado na movimentação mais recente (o usuário pode ter sido renomeado).
    if (m.at > row.lastAt) {
      row.lastAt = m.at;
      row.name = m.userName;
    }
    byUser.set(key, row);
  }
  return [...byUser.values()].sort((a, b) => b.inCount + b.outCount - (a.inCount + a.outCount));
}

export function AuditTab() {
  const allMovements = useStockStore((s) => s.movements);
  const users = useStockStore((s) => s.users);
  const me = useCurrentUser();
  const seeAll = usePermission('audit:all');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  // Sem `audit:all`, cada usuário enxerga apenas as próprias movimentações.
  const scoped = useMemo(
    () => (seeAll ? allMovements : allMovements.filter((m) => m.userId === me?.id)),
    [allMovements, seeAll, me?.id],
  );
  const filtered = useMemo(() => applyFilters(scoped, filters), [scoped, filters]);
  // O resumo respeita os filtros, exceto o de usuário (que ele próprio controla).
  const summary = useMemo(() => summarize(applyFilters(scoped, { ...filters, userId: '' })), [scoped, filters]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const exportName = (ext: string) => {
    const who = filters.userId && filters.userId !== UNIDENTIFIED ? users.find((u) => u.id === filters.userId)?.username : '';
    return `movimentacoes${who ? `_${who}` : ''}_${fileStamp()}.${ext}`;
  };

  const exportSummary = () =>
    downloadFile(
      toCsv(
        ['Usuário', 'Entradas', 'Unidades recebidas', 'Saídas', 'Unidades expedidas', 'Última movimentação'],
        summary.map((r) => [r.name, r.inCount, r.inUnits, r.outCount, r.outUnits, formatDateTime(r.lastAt)]),
      ),
      `resumo_usuarios_${fileStamp()}.csv`,
      'text/csv',
    );

  return (
    <>
      {seeAll && (
        <Panel
          title="Movimentação por usuário"
          icon={<Users size={16} className="text-cyan-400" />}
          actions={
            <ExportButton icon={FileSpreadsheet} label="CSV" disabled={!summary.length} onClick={exportSummary} />
          }
          className="shrink-0 [&>div]:max-h-48 [&>div]:overflow-y-auto"
        >
          {summary.length === 0 ? (
            <p className="py-2 text-center text-xs text-slate-500">Nenhuma movimentação no período.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="pb-1 font-medium">Usuário</th>
                  <th className="pb-1 text-right font-medium">Entradas</th>
                  <th className="pb-1 text-right font-medium">Saídas</th>
                  <th className="pb-1 text-right font-medium">Última</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((r) => {
                  const key = r.userId ?? UNIDENTIFIED;
                  const user = users.find((u) => u.id === r.userId);
                  const active = filters.userId === key;
                  return (
                    <tr
                      key={key}
                      onClick={() => set('userId', active ? '' : key)}
                      className={`cursor-pointer transition ${active ? 'bg-cyan-500/15' : 'hover:bg-slate-800'}`}
                      title={active ? 'Remover filtro' : 'Filtrar por este usuário'}
                    >
                      <td className="rounded-l-md py-1 pl-1">
                        <span className="flex items-center gap-2">
                          <UserAvatar user={user ?? { name: r.name, role: 'viewer' }} size="h-6 w-6" />
                          <span className="truncate text-slate-100">{r.name}</span>
                        </span>
                      </td>
                      <td className="text-right tabular-nums text-emerald-400">
                        {r.inCount} <span className="text-slate-500">({numberFormat.format(r.inUnits)} un.)</span>
                      </td>
                      <td className="text-right tabular-nums text-orange-400">
                        {r.outCount} <span className="text-slate-500">({numberFormat.format(r.outUnits)} un.)</span>
                      </td>
                      <td className="rounded-r-md pr-1 text-right text-[10px] tabular-nums text-slate-400">
                        {formatDateTime(r.lastAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      <Panel
        title={seeAll ? 'Registro de movimentações' : 'Minhas movimentações'}
        icon={<ScrollText size={16} className="text-cyan-400" />}
        actions={
          <div className="flex items-center gap-1">
            <span className="mr-1 text-[11px] text-slate-400">
              {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
            </span>
            <ExportButton
              icon={FileSpreadsheet}
              label="CSV"
              disabled={!filtered.length}
              onClick={() => downloadFile(movementsToCsv(filtered), exportName('csv'), 'text/csv')}
            />
            <ExportButton
              icon={FileJson}
              label="JSON"
              disabled={!filtered.length}
              onClick={() => downloadFile(movementsToJson(filtered), exportName('json'), 'application/json')}
            />
          </div>
        }
        className="flex min-h-0 flex-1 flex-col [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col"
      >
        <div className="mb-3 space-y-2">
          <div className={`grid gap-2 ${seeAll ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {seeAll && (
              <select className={inputClass} value={filters.userId} onChange={(e) => set('userId', e.target.value)}>
                <option value="">Todos os usuários</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (@{u.username})
                  </option>
                ))}
                {allMovements.some((m) => m.userId === null) && <option value={UNIDENTIFIED}>Não identificado</option>}
              </select>
            )}
            <select className={inputClass} value={filters.kind} onChange={(e) => set('kind', e.target.value as KindFilter)}>
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <div>
              <label className={labelClass}>De</label>
              <input type="date" className={inputClass} value={filters.from} max={filters.to || undefined} onChange={(e) => set('from', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Até</label>
              <input type="date" className={inputClass} value={filters.to} min={filters.from || undefined} onChange={(e) => set('to', e.target.value)} />
            </div>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              disabled={!hasFilters}
              title="Limpar filtros"
              className="grid h-[34px] w-9 place-items-center rounded-md border border-slate-700 text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
            >
              <FilterX size={15} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className={`${inputClass} pl-8`}
              placeholder="Buscar SKU, produto, endereço ou usuário"
              value={filters.query}
              onChange={(e) => set('query', e.target.value)}
            />
          </div>
        </div>

        <ul className="scrollbar-thin -mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
          {filtered.slice(0, MAX_RENDERED).map((m) => (
            <MovementRow key={m.id} movement={m} />
          ))}
          {filtered.length > MAX_RENDERED && (
            <li className="py-2 text-center text-[11px] text-slate-500">
              Mostrando os {MAX_RENDERED} mais recentes de {filtered.length}. Exporte para ver todos.
            </li>
          )}
          {filtered.length === 0 && (
            <li className="py-6 text-center text-xs text-slate-500">
              {scoped.length ? 'Nenhum registro corresponde aos filtros.' : 'Nenhuma movimentação registrada ainda.'}
            </li>
          )}
        </ul>
      </Panel>
    </>
  );
}

function MovementRow({ movement: m }: { movement: Movement }) {
  const isIn = m.type === 'in';
  const Icon = isIn ? ArrowDownToLine : ArrowUpFromLine;
  return (
    <li className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition hover:bg-slate-800/60">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${
          isIn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
        }`}
      >
        <Icon size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-slate-100">{m.name}</span>
        <span className="block truncate text-[11px] text-slate-400">
          {REASON_LABEL[m.reason]} · {m.sku} · {m.address}
        </span>
      </span>
      <span className="w-28 shrink-0 truncate text-[11px] text-slate-300" title={m.userName}>
        {m.userName}
      </span>
      <span className="w-24 shrink-0 text-right">
        <span className={`block text-xs font-semibold tabular-nums ${isIn ? 'text-emerald-400' : 'text-orange-400'}`}>
          {isIn ? '+' : '−'}
          {m.quantity}
        </span>
        <span className="block text-[10px] tabular-nums text-slate-500">{formatDateTime(m.at)}</span>
      </span>
    </li>
  );
}

function ExportButton({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: typeof Download;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`Exportar ${label}`}
      className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
    >
      <Icon size={12} />
      {label}
    </button>
  );
}
