import api from './api';
import { PAYMENT_METHOD_OPTIONS } from './pagos.service';

export type CardScope = 'CAJA' | 'INTERNO' | 'TEODORO' | 'DANIEL';
export type CreditCardInput = { nombre: string; banco: string; ultimosCuatro: string };
export type CreditCard = CreditCardInput & { id: number; activa: boolean; version: number };
export const cardLabel = (card: CreditCard) => `•••• ${card.ultimosCuatro} · ${card.nombre} · ${card.banco}`;
export const isCreditCardMethod = (method?: string | null) => ['tarjeta', 'tarjeta de credito', 'tarjeta credito'].includes(
    (method || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\s]+/g, ' ').trim().toLowerCase()
);
export const OUTGOING_PAYMENT_METHOD_OPTIONS = [...PAYMENT_METHOD_OPTIONS, { value: 'TARJETA_CREDITO' as const, label: 'Tarjeta de crédito' }];
export type OutgoingPaymentMethod = typeof OUTGOING_PAYMENT_METHOD_OPTIONS[number]['value'];
export const creditCardsService = {
    list: (scope: CardScope) => api.get<CreditCard[]>(`/tarjetas/${scope}`),
    create: (scope: CardScope, data: CreditCardInput) => api.post<CreditCard>(`/tarjetas/${scope}`, data),
    setActive: (scope: CardScope, card: CreditCard, activa: boolean) => api.patch<CreditCard>(`/tarjetas/${scope}/${card.id}`, { activa, version: card.version })
};
