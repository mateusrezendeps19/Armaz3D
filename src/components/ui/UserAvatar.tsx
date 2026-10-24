import { ROLE_META, initials } from '../../lib/auth';
import type { User } from '../../types/stock';

/** Iniciais do usuário na cor do perfil. */
export function UserAvatar({ user, size = 'h-7 w-7' }: { user: Pick<User, 'name' | 'role'>; size?: string }) {
  const color = ROLE_META[user.role].color;
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full text-[10px] font-bold`}
      style={{ background: `${color}22`, color }}
    >
      {initials(user.name)}
    </span>
  );
}
