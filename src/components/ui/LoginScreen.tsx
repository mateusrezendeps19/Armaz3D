import { useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, Loader2, LogIn, Warehouse } from 'lucide-react';
import { useStockStore } from '../../store/useStockStore';
import { inputClass, labelClass } from './Panel';

/** Tela de acesso sobre a cena 3D. Nada do overlay de gestão é montado antes do login. */
export function LoginScreen() {
  const login = useStockStore((s) => s.login);
  // Dica do acesso inicial só enquanto o administrador padrão for o único usuário e não tiver trocado a senha.
  const firstAccess = useStockStore((s) => s.users.length === 1 && s.users[0].username === 'admin' && s.users[0].mustChangePassword);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await login(username, password);
    if (!result.ok) {
      setError(result.error);
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/60 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-80 rounded-2xl border border-slate-700/60 bg-slate-900/90 p-6 shadow-2xl shadow-black/50 backdrop-blur-md"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400">
            <Warehouse size={20} />
          </span>
          <div className="leading-tight">
            <h1 className="text-base font-bold text-slate-100">Armaz3D</h1>
            <p className="text-xs text-slate-400">Entre para acessar o galpão</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="login-username">
              Usuário
            </label>
            <input
              id="login-username"
              className={inputClass}
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="login-password">
              Senha
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`${inputClass} pr-9`}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:text-slate-100"
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            Entrar
          </button>
        </div>

        {firstAccess && (
          <p className="mt-4 rounded-md bg-slate-950/60 px-3 py-2 text-[11px] text-slate-400 ring-1 ring-slate-800">
            Primeiro acesso: usuário <b className="text-slate-200">admin</b>, senha <b className="text-slate-200">admin</b>. A
            troca da senha será solicitada em seguida.
          </p>
        )}
      </form>
    </div>
  );
}
