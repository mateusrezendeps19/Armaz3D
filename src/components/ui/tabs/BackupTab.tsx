import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { DatabaseBackup, FileDown, FileUp, Loader2, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useStockStore } from '../../../store/useStockStore';
import { MAX_BACKUP_BYTES, parseBackup } from '../../../lib/backup';
import type { BackupData, BackupFile } from '../../../lib/backup';
import { downloadFile, fileStamp, formatDateTime } from '../../../lib/exportLog';
import { Panel } from '../Panel';

/** A partir daqui o backup é considerado antigo. */
const STALE_AFTER_MS = 7 * 86_400_000;

const numberFormat = new Intl.NumberFormat('pt-BR');

type Feedback = { type: 'ok' | 'error'; text: string } | null;

export function BackupTab() {
  return (
    <>
      <ExportPanel />
      <RestorePanel />
    </>
  );
}

function ExportPanel() {
  const exportBackup = useStockStore((s) => s.exportBackup);
  const lastBackupAt = useStockStore((s) => s.lastBackupAt);
  const aisles = useStockStore((s) => s.aisles);
  const racks = useStockStore((s) => s.racks);
  const items = useStockStore((s) => s.items);
  const movements = useStockStore((s) => s.movements);
  const users = useStockStore((s) => s.users);
  // Lido na renderização: o aviso de "backup antigo" só precisa valer no momento em que a aba é aberta.
  const [now] = useState(() => Date.now());

  const stale = !lastBackupAt || now - lastBackupAt > STALE_AFTER_MS;

  const download = () => {
    const backup = exportBackup();
    if (!backup) return;
    downloadFile(JSON.stringify(backup, null, 2), `armaz3d_backup_${fileStamp()}.json`, 'application/json');
  };

  return (
    <Panel title="Backup" icon={<DatabaseBackup size={16} className="text-cyan-400" />}>
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          Os dados ficam só neste computador. Guarde uma cópia em outro lugar (pen drive, nuvem) para não perder o estoque
          se o app for reinstalado ou o cache for limpo.
        </p>

        <BackupSummary data={{ aisles, racks, items, movements, users }} />

        <div
          className={`flex items-start gap-2 rounded-md px-3 py-2 text-[11px] ring-1 ${
            stale ? 'bg-amber-500/10 text-amber-300 ring-amber-500/30' : 'bg-slate-950/60 text-slate-400 ring-slate-800'
          }`}
        >
          {stale && <TriangleAlert size={13} className="mt-px shrink-0" />}
          {lastBackupAt
            ? `Último backup gerado em ${formatDateTime(lastBackupAt)}${stale ? ' (há mais de 7 dias).' : '.'}`
            : 'Nenhum backup gerado ainda.'}
        </div>

        <button
          type="button"
          onClick={download}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          <FileDown size={16} />
          Baixar backup
        </button>
        <p className="flex gap-1.5 text-[11px] text-slate-500">
          <ShieldAlert size={12} className="mt-px shrink-0" />
          O arquivo inclui os usuários (senhas apenas como hash). Guarde-o em local seguro.
        </p>
      </div>
    </Panel>
  );
}

function RestorePanel() {
  const restoreBackup = useStockStore((s) => s.restoreBackup);
  const inputRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<BackupFile | null>(null);
  const [fileName, setFileName] = useState('');
  const [keepUsers, setKeepUsers] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [reading, setReading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // A confirmação expira se não houver segundo clique.
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(t);
  }, [confirming]);

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    setBackup(null);
    setConfirming(false);
    setFileName(file.name);
    if (file.size > MAX_BACKUP_BYTES) return setFeedback({ type: 'error', text: 'Arquivo grande demais para ser um backup.' });
    setReading(true);
    const result = parseBackup(await file.text());
    setReading(false);
    if (result.ok) {
      setBackup(result.backup);
      setFeedback(null);
    } else {
      setFeedback({ type: 'error', text: result.error });
    }
  };

  const restore = () => {
    if (!backup) return;
    if (!confirming) return setConfirming(true);
    const result = restoreBackup(backup.data, { keepUsers });
    setConfirming(false);
    if (!result.ok) return setFeedback({ type: 'error', text: result.error });
    setBackup(null);
    setFileName('');
    setFeedback({ type: 'ok', text: 'Backup restaurado.' });
  };

  return (
    <Panel title="Restaurar backup" icon={<FileUp size={16} className="text-cyan-400" />}>
      <div className="space-y-3">
        <input ref={inputRef} type="file" accept=".json,application/json" className="hidden" onChange={pickFile} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={reading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 py-3 text-sm text-slate-300 transition hover:border-cyan-500/60 hover:text-cyan-300 disabled:opacity-50"
        >
          {reading ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
          {fileName || 'Selecionar arquivo de backup (.json)'}
        </button>

        {backup && (
          <>
            <div className="rounded-md bg-slate-950/60 px-3 py-2 text-[11px] text-slate-400 ring-1 ring-slate-800">
              Gerado em <span className="text-slate-200">{formatDateTime(Date.parse(backup.exportedAt))}</span> por{' '}
              <span className="text-slate-200">{backup.exportedBy}</span>
            </div>
            <BackupSummary data={backup.data} />

            <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={keepUsers}
                onChange={(e) => setKeepUsers(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 accent-cyan-500"
              />
              <span>
                Manter os usuários atuais
                <span className="block text-[11px] text-slate-500">
                  Desmarcado, os usuários e senhas voltam aos do backup. Se você não estiver entre eles, a sessão será
                  encerrada.
                </span>
              </span>
            </label>

            <p className="flex gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300">
              <TriangleAlert size={13} className="mt-px shrink-0" />
              Substitui o layout, o estoque e o histórico atuais. Baixe um backup antes, se quiser guardar o estado de agora.
            </p>

            <button
              type="button"
              onClick={restore}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-sm font-semibold transition ${
                confirming
                  ? 'border-red-500 bg-red-500 text-slate-950 hover:bg-red-400'
                  : 'border-red-500/50 bg-red-500/10 text-red-300 hover:bg-red-500/20'
              }`}
            >
              <FileUp size={15} />
              {confirming ? 'Clique de novo para confirmar' : 'Restaurar este backup'}
            </button>
          </>
        )}

        {feedback && (
          <p className={`text-xs ${feedback.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.text}</p>
        )}
      </div>
    </Panel>
  );
}

/** Contagens do conteúdo de um backup (ou do estado atual). */
function BackupSummary({ data }: { data: BackupData }) {
  const active = data.items.filter((i) => i.phase !== 'leaving');
  const rows: Array<[string, number]> = [
    ['Ruas', data.aisles.length],
    ['Estantes', data.racks.length],
    ['Paletes', active.length],
    ['Unidades', active.reduce((sum, i) => sum + i.quantity, 0)],
    ['Movimentações', data.movements.length],
    ['Usuários', data.users.length],
  ];
  return (
    <dl className="grid grid-cols-3 gap-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md bg-slate-950/60 px-2.5 py-1.5 ring-1 ring-slate-800">
          <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="text-sm font-semibold tabular-nums text-slate-100">{numberFormat.format(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
