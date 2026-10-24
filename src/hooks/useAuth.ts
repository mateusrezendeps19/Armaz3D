import { useStockStore } from '../store/useStockStore';
import { can, canOpenTab } from '../lib/auth';
import type { AppTab, Permission, User } from '../types/stock';

/** Usuário da sessão atual (undefined na tela de login). */
export function useCurrentUser(): User | undefined {
  return useStockStore((s) => (s.currentUserId ? s.users.find((u) => u.id === s.currentUserId) : undefined));
}

export function usePermission(permission: Permission): boolean {
  return useStockStore((s) => can(s.users.find((u) => u.id === s.currentUserId), permission));
}

/** Aba ativa, ou o dashboard se o perfil atual não puder abri-la (ex.: perfil alterado durante a sessão). */
export function useActiveTab(): AppTab {
  return useStockStore((s) => (canOpenTab(s.users.find((u) => u.id === s.currentUserId), s.activeTab) ? s.activeTab : 'dashboard'));
}
