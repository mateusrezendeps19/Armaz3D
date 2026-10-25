import type { ComponentType } from 'react';
import { useActiveTab } from '../../hooks/useAuth';
import type { AppTab } from '../../types/stock';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { ItemDetailsPanel } from './ItemDetailsPanel';
import { Legend } from './Legend';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AuditTab } from './tabs/AuditTab';
import { DashboardTab } from './tabs/DashboardTab';
import { InboundTab } from './tabs/InboundTab';
import { LayoutTab } from './tabs/LayoutTab';
import { OutboundTab } from './tabs/OutboundTab';
import { UsersTab } from './tabs/UsersTab';

const TAB_CONTENT: Record<AppTab, ComponentType> = {
  dashboard: DashboardTab,
  inbound: InboundTab,
  outbound: OutboundTab,
  audit: AuditTab,
  users: UsersTab,
  layout: LayoutTab,
};

/** Abas com tabelas, que ocupam uma coluna mais larga. */
const WIDE_TABS: ReadonlySet<AppTab> = new Set(['audit', 'users', 'layout']);

/**
 * Overlay 2D sobre o Canvas. A raiz ignora o ponteiro (a cena 3D continua recebendo
 * eventos); cada painel reativa os eventos com `pointer-events-auto`.
 */
export function DashboardUI() {
  const activeTab = useActiveTab();
  const TabContent = TAB_CONTENT[activeTab];

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
        <TopBar />

        <div className="flex min-h-0 flex-1 gap-3">
          <aside
            key={activeTab}
            className={`flex min-h-0 flex-col gap-3 ${WIDE_TABS.has(activeTab) ? 'w-[36rem] min-w-[22rem] shrink' : 'w-[22rem] shrink-0'}`}
          >
            <TabContent />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col items-end">
            <ItemDetailsPanel />
            <div className="mt-auto">
              <Legend />
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordDialog />
    </div>
  );
}
