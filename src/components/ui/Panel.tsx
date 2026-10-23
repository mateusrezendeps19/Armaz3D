import type { ReactNode } from 'react';

interface PanelProps {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Cartão translúcido usado por todos os painéis do overlay. */
export function Panel({ title, icon, actions, className = '', children }: PanelProps) {
  return (
    <section
      className={`pointer-events-auto rounded-xl border border-slate-700/60 bg-slate-900/80 shadow-2xl shadow-black/40 backdrop-blur-md ${className}`}
    >
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-700/60 px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            {icon}
            {title}
          </h2>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50';

export const labelClass = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400';
