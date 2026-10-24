import { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, Loader2, X } from 'lucide-react';
import { useStockStore } from '../../store/useStockStore';
import { useCurrentUser } from '../../hooks/useAuth';
import { MIN_PASSWORD_LENGTH } from '../../lib/auth';
import { inputClass, labelClass } from './Panel';

/**
 * Troca da própria senha. Abre sozinho (sem como fechar) quando o usuário precisa trocar a
 * senha provisória, ou sob demanda pelo menu lateral.
 */
export function ChangePasswordDialog() {
  const user = useCurrentUser();
  const open = useStockStore((s) => s.passwordDialogOpen);
  const setOpen = useStockStore((s) => s.setPasswordDialogOpen);
  const changeOwnPassword = useStockStore((s) => s.changeOwnPassword);
  const logout = useStockStore((s) => s.logout);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const forced = !!user?.mustChangePassword;
  if (!user || (!open && !forced)) return null;

  const close = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
    setOpen(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (next !== confirm) return setError('A confirmação não confere com a nova senha.');
    setBusy(true);
    const result = await changeOwnPassword(current, next);
    setBusy(false);
    if (result.ok) close();
    else setError(result.error);
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 grid place-items-center bg-slate-950/70 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-80 rounded-2xl border border-slate-700/60 bg-slate-900 p-5 shadow-2xl shadow-black/50"
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <KeyRound size={16} className="text-cyan-400" />
              {forced ? 'Defina uma nova senha' : 'Alterar senha'}
            </h2>
            {forced && (
              <p className="mt-1 text-xs text-slate-400">Sua senha atual é provisória. Escolha uma senha pessoal para continuar.</p>
            )}
          </div>
          {!forced && (
            <button
              type="button"
              onClick={close}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Senha atual</label>
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              className={inputClass}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
              className={inputClass}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Confirmar nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            {forced && (
              <button
                type="button"
                onClick={logout}
                className="flex-1 rounded-lg border border-slate-700 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                Sair
              </button>
            )}
            <button
              type="submit"
              disabled={busy || !current || !next || !confirm}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-500 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              Salvar senha
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
