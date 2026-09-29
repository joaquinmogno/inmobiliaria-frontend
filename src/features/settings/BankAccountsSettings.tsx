import { useEffect, useState } from 'react';
import { PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import AppSelect from '../../components/AppSelect';
import { cuentasBancariasService, type CuentaBancaria } from '../../services/cuentas-bancarias.service';
import type { Moneda } from '../../utils/currency';
import { toast } from 'react-hot-toast';

type Form = { nombre: string; banco: string; moneda: Moneda; activa: boolean };
const emptyForm = (): Form => ({ nombre: '', banco: '', moneda: 'ARS', activa: true });

export default function BankAccountsSettings({ refreshToken }: { refreshToken: number }) {
    const [accounts, setAccounts] = useState<CuentaBancaria[]>([]);
    const [form, setForm] = useState<Form>(emptyForm);
    const [editing, setEditing] = useState<CuentaBancaria | null>(null);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try { setAccounts(await cuentasBancariasService.getAll(true)); }
        catch { toast.error('No se pudieron cargar las cuentas bancarias.'); }
    };
    useEffect(() => { void load(); }, [refreshToken]);

    const reset = () => { setEditing(null); setForm(emptyForm()); };
    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        try {
            if (editing) await cuentasBancariasService.update(editing.id, form);
            else await cuentasBancariasService.create(form);
            toast.success(editing ? 'Cuenta bancaria actualizada.' : 'Cuenta bancaria creada.');
            reset();
            await load();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'No se pudo guardar la cuenta bancaria.');
        } finally { setSaving(false); }
    };

    return <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Cuentas bancarias</h2>
            <p className="mt-1 text-sm text-gray-600">Definí dónde se registran las transferencias y cheques. Las cuentas inactivas se conservan para el historial.</p>
        </div>
        <form onSubmit={submit} className="grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-5">
            <input required maxLength={100} value={form.banco} onChange={event => setForm({ ...form, banco: event.target.value })} placeholder="Banco o billetera" className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm sm:col-span-2" />
            <input required maxLength={100} value={form.nombre} onChange={event => setForm({ ...form, nombre: event.target.value })} placeholder="Nombre de la cuenta" className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm sm:col-span-2" />
            <AppSelect ariaLabel="Moneda de cuenta" value={form.moneda} onChange={value => setForm({ ...form, moneda: value as Moneda })} options={[{ value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' }]} />
            {editing && <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-gray-700 sm:col-span-2"><input type="checkbox" checked={form.activa} onChange={event => setForm({ ...form, activa: event.target.checked })} /> Activa para nuevos movimientos</label>}
            <div className="flex gap-2 sm:col-span-5">
                <button disabled={saving} type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"><PlusIcon className="h-4 w-4" />{editing ? 'Guardar cambios' : 'Agregar cuenta'}</button>
                {editing && <button type="button" onClick={reset} className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700">Cancelar</button>}
            </div>
        </form>
        <div className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-200">
            {accounts.length === 0 && <p className="p-4 text-sm text-gray-600">Todavía no hay cuentas bancarias creadas.</p>}
            {accounts.map(account => <div key={account.id} className="flex items-center justify-between gap-3 p-4">
                <div><p className="font-bold text-gray-900">{account.banco} — {account.nombre}</p><p className="text-sm text-gray-600">{account.moneda} · {account.esHistorica ? 'Histórica' : account.activa ? 'Activa' : 'Inactiva'}</p></div>
                {!account.esHistorica && <button type="button" onClick={() => { setEditing(account); setForm({ nombre: account.nombre, banco: account.banco, moneda: account.moneda, activa: account.activa }); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><PencilSquareIcon className="h-4 w-4" />Editar</button>}
            </div>)}
        </div>
    </section>;
}
