import { useEffect, useState } from 'react';
import { BuildingOfficeIcon, IdentificationIcon, PhotoIcon } from '@heroicons/react/24/outline';
import AppSelect from '../../components/AppSelect';
import FormError, { useFormError } from '../../components/FormError';
import { useAuth } from '../../context/AuthContext';
import {
    inmobiliariaService,
    type CondicionIva,
    type Inmobiliaria,
    type InmobiliariaProfileInput
} from '../../services/inmobiliaria.service';

const inputClass = 'mt-1 min-h-11 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100';

const emptyProfile: InmobiliariaProfileInput = {
    nombre: '', razonSocial: null, cuit: null, direccion: null, domicilioFiscal: null,
    email: null, telefono: null, contactoAdministrativo: null, slogan: null, logoUrl: null,
    condicionIva: 'NO_INFORMADO', ingresosBrutos: null, puntoVenta: null, inicioActividades: null
};

const profileFromAgency = (agency: Inmobiliaria): InmobiliariaProfileInput => ({
    nombre: agency.nombre,
    razonSocial: agency.razonSocial,
    cuit: agency.cuit,
    direccion: agency.direccion,
    domicilioFiscal: agency.domicilioFiscal,
    email: agency.email,
    telefono: agency.telefono,
    contactoAdministrativo: agency.contactoAdministrativo,
    slogan: agency.slogan,
    logoUrl: agency.logoUrl,
    condicionIva: agency.condicionIva || 'NO_INFORMADO',
    ingresosBrutos: agency.ingresosBrutos,
    puntoVenta: agency.puntoVenta,
    inicioActividades: agency.inicioActividades ? agency.inicioActividades.slice(0, 10) : null
});

const blankToNull = (value: string) => value.trim() || null;

export default function InstallationProfileSettings({ refreshToken }: { refreshToken: number }) {
    const { updateInmobiliaria } = useAuth();
    const { error, setError, reportError, formRef } = useFormError();
    const [profile, setProfile] = useState<InmobiliariaProfileInput>(emptyProfile);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        inmobiliariaService.getMe()
            .then(agency => setProfile(profileFromAgency(agency)))
            .catch(loadError => console.error('Error loading inmobiliaria:', loadError));
    }, [refreshToken]);

    const updateText = (field: Exclude<keyof InmobiliariaProfileInput, 'puntoVenta' | 'condicionIva'>, value: string) => {
        setProfile(current => ({ ...current, [field]: blankToNull(value) }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        setSuccess(false);
        try {
            const updated = await inmobiliariaService.updateMe(profile);
            setProfile(profileFromAgency(updated));
            updateInmobiliaria(updated.nombre);
            setSuccess(true);
            window.setTimeout(() => setSuccess(false), 3000);
        } catch (submitError) {
            reportError(submitError, 'No se pudo actualizar el perfil institucional');
        } finally {
            setLoading(false);
        }
    };

    const hasFiscalData = Boolean(
        profile.razonSocial || profile.cuit || profile.ingresosBrutos || profile.puntoVenta || profile.inicioActividades
        || profile.condicionIva !== 'NO_INFORMADO'
    );

    return (
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-gray-100 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="flex items-center text-lg font-semibold text-gray-900">
                        <BuildingOfficeIcon className="mr-2 h-5 w-5 text-indigo-600" />
                        Perfil institucional
                    </h2>
                    <p className="mt-1 text-sm text-content-muted">Estos datos se usan en comprobantes, reportes y comunicaciones.</p>
                </div>
                {success && <span className="text-sm font-medium text-status-success">✓ Cambios guardados</span>}
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-8 p-6">
                <FormError message={error} />

                <fieldset>
                    <legend className="flex items-center text-base font-semibold text-gray-900"><BuildingOfficeIcon className="mr-2 h-5 w-5 text-indigo-600" />Identidad y contacto</legend>
                    <p className="mt-1 text-sm text-content-muted">El nombre comercial es el único dato obligatorio para operar.</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="block text-sm font-medium text-gray-700">Nombre comercial *
                            <input id="installation-name" required maxLength={140} value={profile.nombre} onChange={event => setProfile(current => ({ ...current, nombre: event.target.value }))} className={inputClass} />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">Eslogan o leyenda
                            <input maxLength={160} value={profile.slogan ?? ''} onChange={event => updateText('slogan', event.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">Correo de contacto
                            <input type="email" maxLength={254} value={profile.email ?? ''} onChange={event => updateText('email', event.target.value)} className={inputClass} placeholder="administracion@inmobiliaria.com" />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">Teléfono
                            <input type="tel" maxLength={40} value={profile.telefono ?? ''} onChange={event => updateText('telefono', event.target.value)} className={inputClass} placeholder="+54 9 11 5555 1234" />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">Contacto administrativo
                            <input maxLength={140} value={profile.contactoAdministrativo ?? ''} onChange={event => updateText('contactoAdministrativo', event.target.value)} className={inputClass} placeholder="Nombre y cargo" />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">Domicilio comercial
                            <input maxLength={180} value={profile.direccion ?? ''} onChange={event => updateText('direccion', event.target.value)} className={inputClass} />
                        </label>
                    </div>
                </fieldset>

                <fieldset className="border-t border-gray-100 pt-7">
                    <legend className="flex items-center text-base font-semibold text-gray-900"><IdentificationIcon className="mr-2 h-5 w-5 text-indigo-600" />Datos legales y de facturación</legend>
                    <p className="mt-1 text-sm text-content-muted">Son opcionales. Al informar cualquiera de estos datos, se requiere razón social, CUIT válido y condición frente al IVA.</p>
                    {hasFiscalData && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Completá los tres datos requeridos para mantener una identificación fiscal consistente.</p>}
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="block text-sm font-medium text-gray-700">Razón social
                            <input maxLength={160} value={profile.razonSocial ?? ''} onChange={event => updateText('razonSocial', event.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">CUIT
                            <input inputMode="numeric" maxLength={13} value={profile.cuit ?? ''} onChange={event => updateText('cuit', event.target.value)} className={inputClass} placeholder="30-12345678-9" />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">Condición frente al IVA
                            <AppSelect id="agency-vat-status" ariaLabel="Condición frente al IVA" value={profile.condicionIva} onChange={value => setProfile(current => ({ ...current, condicionIva: value as CondicionIva }))} options={[
                                { value: 'NO_INFORMADO', label: 'Sin informar' },
                                { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable inscripto' },
                                { value: 'MONOTRIBUTISTA', label: 'Monotributista' },
                                { value: 'EXENTO', label: 'Exento' },
                                { value: 'CONSUMIDOR_FINAL', label: 'Consumidor final' }
                            ]} className="mt-1" />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">Ingresos Brutos
                            <input maxLength={30} value={profile.ingresosBrutos ?? ''} onChange={event => updateText('ingresosBrutos', event.target.value)} className={inputClass} placeholder="Número o EXENTO" />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">Punto de venta
                            <input type="number" min="1" max="99999" value={profile.puntoVenta ?? ''} onChange={event => setProfile(current => ({ ...current, puntoVenta: event.target.value === '' ? null : Number(event.target.value) }))} className={inputClass} />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">Inicio de actividades
                            <input type="date" value={profile.inicioActividades ?? ''} onChange={event => updateText('inicioActividades', event.target.value)} className={inputClass} />
                        </label>
                        <label className="block text-sm font-medium text-gray-700 md:col-span-2">Domicilio fiscal
                            <input maxLength={180} value={profile.domicilioFiscal ?? ''} onChange={event => updateText('domicilioFiscal', event.target.value)} className={inputClass} />
                        </label>
                    </div>
                </fieldset>

                <fieldset className="border-t border-gray-100 pt-7">
                    <legend className="flex items-center text-base font-semibold text-gray-900"><PhotoIcon className="mr-2 h-5 w-5 text-indigo-600" />Identidad visual</legend>
                    <p className="mt-1 text-sm text-content-muted">Podés usar una URL pública completa (http o https) para incluir el logo en los comprobantes.</p>
                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
                        <label className="block flex-1 text-sm font-medium text-gray-700">URL del logo
                            <input type="url" maxLength={2048} value={profile.logoUrl ?? ''} onChange={event => updateText('logoUrl', event.target.value)} className={inputClass} placeholder="https://ejemplo.com/logo.png" />
                        </label>
                        {profile.logoUrl && <img src={profile.logoUrl} alt="Vista previa del logo" className="h-16 max-w-40 rounded-lg border border-gray-200 object-contain p-1" onError={event => { event.currentTarget.style.display = 'none'; }} />}
                    </div>
                </fieldset>

                <div className="flex justify-end border-t border-gray-100 pt-6">
                    <button type="submit" disabled={loading} className={`min-h-11 rounded-xl px-6 font-semibold text-white shadow-md transition-all ${loading ? 'cursor-not-allowed bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}>
                        {loading ? 'Guardando...' : 'Guardar perfil institucional'}
                    </button>
                </div>
            </form>
        </section>
    );
}
