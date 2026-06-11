import { MovementType } from '@zentro/shared';

export type TagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';

/** Cor da p-tag para cada status de pedido. */
export function orderSeverity(status: string): TagSeverity {
  switch (status) {
    case 'NOVO':
      return 'info';
    case 'CONFIRMADO':
      return 'secondary';
    case 'EM_SEPARACAO':
    case 'SAIU_PARA_ENTREGA':
    case 'PRONTO_PARA_RETIRADA':
      return 'warn';
    case 'ENTREGUE':
      return 'success';
    case 'CANCELADO':
      return 'danger';
    default:
      return 'secondary';
  }
}

/** Cor da p-tag para cada tipo de movimentacao de estoque. */
export function movementSeverity(type: MovementType): TagSeverity {
  switch (type) {
    case 'ENTRADA':
    case 'CANCELAMENTO':
      return 'success';
    case 'SAIDA':
    case 'VENDA':
      return 'warn';
    case 'AJUSTE':
      return 'info';
    default:
      return 'secondary';
  }
}

/** Mensagem amigavel de um HttpErrorResponse (422 do backend traz {message}). */
export function errMessage(err: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  const e = err as { error?: { message?: string }; message?: string };
  return e?.error?.message ?? fallback;
}

/** Data local em yyyy-MM-dd (para query params LocalDate do backend). */
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Snapshot de endereco salvo no pedido (JSON). */
export interface AddressSnapshot {
  label?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
  reference?: string;
  latitude?: number;
  longitude?: number;
}

export function parseSnapshot(raw: string | null): AddressSnapshot | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AddressSnapshot;
  } catch {
    return null;
  }
}
