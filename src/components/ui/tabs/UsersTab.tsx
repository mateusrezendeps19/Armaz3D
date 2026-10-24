import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, Loader2, Save, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useStockStore } from '../../../store/useStockStore';
import { useCurrentUser } from '../../../hooks/useAuth';
import { MIN_PASSWORD_LENGTH, ROLE_META } from '../../../lib/auth';
import { formatDate, formatDateTime } from '../../../lib/exportLog';
import type { User, UserRole } from '../../../types/stock';
import { Panel, inputClass, labelClass } from '../Panel';
import { UserAvatar as Avatar } from '../UserAvatar';

const ROLES = Object.keys(ROLE_META) as UserRole[];

type Feedback = { type: 'ok' | 'error'; text: string } | null;

/** 'new' = cadastro; id = edição; null = nada aberto. */
type Editing = 'new' | string | null;

export function UsersTab() {
  const [editing, setEditing] = useState<Editing>(null);
  const user = useStockStore((s) => (editing && editing !== 'new' ? s.users.find((u) => u.id === editing) : undefined));

  return (
    <>
      {editing === 'new' && <NewUserForm onDone={(id) => setEditing(id)} onCancel={() => setEditing(null)} />}
      {user && <EditUserForm key={user.id} user={user} onClose={() => setEditing(null)} />}
      <UserList selectedId={editing} onSelect={setEditing} />
    </>
  );
}

function UserList({ selectedId, onSelect }: { selectedId: Editing; onSelect: (id: Editing) => void }) {
  const users = useStockStore((s) => s.users);
  const movements = useStockStore((s) => s.movements);
  const me = useCurrentUser();

  const movementCount = useMemo(() => {
    const counts = new Map<string, number>();
    movements.forEach((m) => m.userId && counts.set(m.userId, (counts.get(m.userId) ?? 0) + 1));
    return counts;
  }, [movements]);

  const rows = useMemo(
    () => [...users].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'pt-BR')),
    [users],
  );

  return (
    <Panel
      title="Usuários"
      icon={<Users size={16} className="text-cyan-400" />}
      actions={
        <button
          type="button"
          onClick={() => onSelect('new')}
          className="flex items-center gap-1 rounded-md bg-cyan-500 px-2 py-1 text-[11px] font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          <UserPlus size={12} />
          Novo usuário
        </button>
      }
      className="flex min-h-0 flex-1 flex-col [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col"
    >
      <div className="mb-1 grid grid-cols-[1fr_7rem_6rem_4rem] gap-2 px-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        <span>Usuário</span>
        <span>Perfil</span>
        <span>Último acesso</span>
        <span className="text-right">Mov.</span>
      </div>
      <ul className="scrollbar-thin -mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
        {rows.map((u) => {
          const role = ROLE_META[u.role];
          return (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onSelect(u.id)}
                className={`grid w-full grid-cols-[1fr_7rem_6rem_4rem] items-center gap-2 rounded-md px-2 py-1.5 text-left transition ${
                  u.id === selectedId ? 'bg-cyan-500/15 ring-1 ring-cyan-500/50' : 'hover:bg-slate-800'
                } ${u.active ? '' : 'opacity-50'}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar user={u} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-slate-100">
                      {u.name}
                      {u.id === me?.id && <span className="ml-1.5 text-[10px] font-normal text-cyan-400">(você)</span>}
                    </span>
                    <span className="block truncate text-[11px] text-slate-400">
                      @{u.username}
                      {!u.active && ' · inativo'}
                      {u.active && u.mustChangePassword && ' · senha provisória'}
                    </span>
                  </span>
                </span>
                <span className="truncate text-[11px] font-medium" style={{ color: role.color }}>
                  {role.label}
                </span>
                <span className="text-[10px] tabular-nums text-slate-400">
                  {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Nunca'}
                </span>
                <span className="text-right text-xs tabular-nums text-slate-300">{movementCount.get(u.id) ?? 0}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function RoleSelect({ value, onChange }: { value: UserRole; onChange: (role: UserRole) => void }) {
  return (
    <>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value as UserRole)}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_META[r].label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[11px] text-slate-500">{ROLE_META[value].description}</p>
    </>
  );
}

function FeedbackText({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return <p className={`text-xs ${feedback.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.text}</p>;
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
    >
      <X size={15} />
    </button>
  );
}

function NewUserForm({ onDone, onCancel }: { onDone: (id: string) => void; onCancel: () => void }) {
  const createUser = useStockStore((s) => s.createUser);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('operator');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await createUser({ name, username, role, password });
    setBusy(false);
    if (result.ok) onDone(result.id);
    else setFeedback({ type: 'error', text: result.error });
  };

  return (
    <Panel title="Novo usuário" icon={<UserPlus size={16} className="text-cyan-400" />} actions={<CloseButton onClick={onCancel} />}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Nome</label>
            <input className={inputClass} autoFocus placeholder="Maria Souza" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Login</label>
            <input
              className={inputClass}
              placeholder="maria.souza"
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Perfil</label>
            <RoleSelect value={role} onChange={setRole} />
          </div>
          <div>
            <label className={labelClass}>Senha provisória</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={`Mín. ${MIN_PASSWORD_LENGTH} caracteres`}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-500">Será trocada no primeiro acesso.</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
          Cadastrar usuário
        </button>
        <FeedbackText feedback={feedback} />
      </form>
    </Panel>
  );
}

function EditUserForm({ user, onClose }: { user: User; onClose: () => void }) {
  const updateUser = useStockStore((s) => s.updateUser);
  const resetUserPassword = useStockStore((s) => s.resetUserPassword);
  const deleteUser = useStockStore((s) => s.deleteUser);
  const me = useCurrentUser();
  const isMe = user.id === me?.id;
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [password, setPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  // A confirmação de exclusão expira se o usuário não clicar de novo.
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const report = (result: { ok: true } | { ok: false; error: string }, okText: string) =>
    setFeedback(result.ok ? { type: 'ok', text: okText } : { type: 'error', text: result.error });

  const save = (e: FormEvent) => {
    e.preventDefault();
    report(updateUser(user.id, { name, role }), 'Alterações salvas.');
  };

  const toggleActive = () =>
    report(updateUser(user.id, { active: !user.active }), user.active ? 'Usuário desativado.' : 'Usuário reativado.');

  const resetPassword = async () => {
    if (busy) return;
    setBusy(true);
    const result = await resetUserPassword(user.id, password);
    setBusy(false);
    if (result.ok) setPassword('');
    report(result, 'Senha provisória definida. Será exigida a troca no próximo acesso.');
  };

  const remove = () => {
    if (!confirmDelete) return setConfirmDelete(true);
    const result = deleteUser(user.id);
    if (result.ok) onClose();
    else {
      setConfirmDelete(false);
      report(result, '');
    }
  };

  const dirty = name.trim() !== user.name || role !== user.role;

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Avatar user={user} size="h-6 w-6" />
          {user.name}
        </span>
      }
      actions={<CloseButton onClick={onClose} />}
    >
      <div className="space-y-3">
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Nome</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
              <p className="mt-1 text-[11px] text-slate-500">
                Login: @{user.username} · desde {formatDate(user.createdAt)}
              </p>
            </div>
            <div>
              <label className={labelClass}>Perfil</label>
              <RoleSelect value={role} onChange={setRole} />
            </div>
          </div>
          <button
            type="submit"
            disabled={!dirty}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-40"
          >
            <Save size={15} />
            Salvar alterações
          </button>
        </form>

        <div>
          <label className={labelClass}>Redefinir senha</label>
          <div className="flex gap-2">
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Nova senha provisória"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={resetPassword}
              disabled={busy || !password}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-700 px-3 text-xs text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
              Redefinir
            </button>
          </div>
        </div>

        {!isMe && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleActive}
              className="rounded-lg border border-slate-700 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
            >
              {user.active ? 'Desativar acesso' : 'Reativar acesso'}
            </button>
            <button
              type="button"
              onClick={remove}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition ${
                confirmDelete
                  ? 'border-red-500 bg-red-500 text-slate-950 hover:bg-red-400'
                  : 'border-red-500/50 bg-red-500/10 text-red-300 hover:bg-red-500/20'
              }`}
            >
              <Trash2 size={13} />
              {confirmDelete ? 'Confirmar exclusão' : 'Excluir'}
            </button>
          </div>
        )}

        <FeedbackText feedback={feedback} />
      </div>
    </Panel>
  );
}
