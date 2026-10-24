import type { Movement, MovementReason } from '../types/stock';

export const REASON_LABEL: Record<MovementReason, string> = {
  receipt: 'Recebimento',
  restock: 'Reposição',
  withdrawal: 'Baixa parcial',
  removal: 'Retirada do palete',
};

export const TYPE_LABEL = { in: 'Entrada', out: 'Saída' } as const;

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

export const formatDateTime = (at: number) => dateTimeFormat.format(at);
export const formatDate = (at: number) => dateFormat.format(at);

/** Escapa uma célula CSV (separador `;`, padrão do Excel em pt-BR). */
function csvCell(value: string | number): string {
  const text = String(value);
  // Prefixa textos que o Excel interpretaria como fórmula (injeção de CSV).
  const safe = typeof value === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: Array<Array<string | number>>): string {
  // BOM para o Excel reconhecer UTF-8 (acentos).
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}

export function movementsToCsv(movements: Movement[]): string {
  return toCsv(
    ['Data/hora', 'Usuário', 'Tipo', 'Motivo', 'SKU', 'Produto', 'Quantidade', 'Endereço'],
    movements.map((m) => [
      formatDateTime(m.at),
      m.userName,
      TYPE_LABEL[m.type],
      REASON_LABEL[m.reason],
      m.sku,
      m.name,
      m.type === 'in' ? m.quantity : -m.quantity,
      m.address,
    ]),
  );
}

export function movementsToJson(movements: Movement[]): string {
  return JSON.stringify(
    movements.map((m) => ({
      dataHora: new Date(m.at).toISOString(),
      usuarioId: m.userId,
      usuario: m.userName,
      tipo: TYPE_LABEL[m.type],
      motivo: REASON_LABEL[m.reason],
      sku: m.sku,
      produto: m.name,
      quantidade: m.quantity,
      endereco: m.address,
    })),
    null,
    2,
  );
}

/** Dispara o download de um arquivo gerado no renderer (o Electron abre o diálogo "Salvar como"). */
export function downloadFile(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Sufixo de data para nomes de arquivo: 2026-10-24_1530. */
export function fileStamp(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}`;
}
