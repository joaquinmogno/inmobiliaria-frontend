import api from './api';
import type { Moneda } from '../utils/currency';

export interface CuentaBancaria {
    id: number;
    nombre: string;
    banco: string;
    moneda: Moneda;
    activa: boolean;
    esHistorica: boolean;
}

export const cuentasBancariasService = {
    getAll: (incluirInactivas = false) => api.get<CuentaBancaria[]>('/cuentas-bancarias', { params: incluirInactivas ? { incluirInactivas: 'true' } : {} }),
    create: (data: Omit<CuentaBancaria, 'id' | 'esHistorica'>) => api.post<CuentaBancaria>('/cuentas-bancarias', data),
    update: (id: number, data: Omit<CuentaBancaria, 'id' | 'esHistorica'>) => api.put<CuentaBancaria>(`/cuentas-bancarias/${id}`, data)
};
