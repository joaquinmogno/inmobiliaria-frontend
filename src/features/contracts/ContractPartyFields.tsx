import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import AutocompleteSelector from '../../components/AutocompleteSelector';
import { personasService, type Persona } from '../../services/personas.service';
import type { ContractParty } from './contract-form.model';

type Props = {
    kind: 'owner' | 'tenant';
    parties: ContractParty[];
    editing: boolean;
    searching: boolean;
    onSearchingChange: (searching: boolean) => void;
    onAdd: (person: Persona | null) => void;
    onUpdate: (index: number, field: 'nombreCompleto' | 'telefono', value: string) => void;
    onRemove: (index: number) => void;
};

export default function ContractPartyFields({
    kind, parties, editing, searching, onSearchingChange, onAdd, onUpdate, onRemove
}: Props) {
    const owner = kind === 'owner';
    const title = owner ? 'Propietarios' : 'Inquilinos';
    const singular = owner ? 'propietario' : 'inquilino';
    const searchLabel = owner ? 'Buscar Propietario' : 'Buscar Inquilino';

    return (
        <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-indigo-900">{title} *</h4>
                {!editing && <button type="button" onClick={() => onAdd(null)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">+ AGREGAR OTRO</button>}
            </div>
            <div className="space-y-3">
                {parties.map((party, index) => (
                    <div key={`${party.id || 'manual'}-${index}`} className="relative rounded-lg border border-gray-200 bg-white p-3">
                        {parties.length > 1 && !editing && (
                            <button type="button" onClick={() => onRemove(index)} className="absolute right-2 top-2 text-red-500 hover:text-red-700" aria-label={`Quitar ${singular} ${index + 1}`}>
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        )}
                        <p className="mb-2 text-xs font-bold text-status-accent">
                            {index === 0 ? `${singular.toUpperCase()} PRINCIPAL` : `${owner ? 'CO-PROPIETARIO' : 'CO-INQUILINO'} ${index}`}
                            {party.id && <span className="ml-2 text-status-success">(existente)</span>}
                        </p>
                        <div className="space-y-2">
                            <label className="sr-only" htmlFor={`${owner ? 'owner' : 'tenant'}-${index}-name`}>Nombre completo de {singular.toLowerCase()} {index + 1}</label>
                            <input id={`${owner ? 'owner' : 'tenant'}-${index}-name`} type="text" placeholder="Nombre Completo *" required className="w-full rounded-lg border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={party.nombreCompleto} onChange={event => onUpdate(index, 'nombreCompleto', event.target.value)} disabled={!!party.id || editing} />
                            <label className="sr-only" htmlFor={`${owner ? 'owner' : 'tenant'}-${index}-phone`}>Teléfono de {singular.toLowerCase()} {index + 1}</label>
                            <input id={`${owner ? 'owner' : 'tenant'}-${index}-phone`} type="text" placeholder="Teléfono" className="w-full rounded-lg border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={party.telefono} onChange={event => onUpdate(index, 'telefono', event.target.value)} disabled={!!party.id || editing} />
                        </div>
                    </div>
                ))}
                {!editing && (!searching ? (
                    <button type="button" onClick={() => onSearchingChange(true)} className="mt-1 flex items-center gap-1 text-xs font-semibold text-status-accent hover:text-indigo-900">
                        <MagnifyingGlassIcon className="h-4 w-4" />¿Buscar {singular} existente?
                    </button>
                ) : (
                    <div>
                        <AutocompleteSelector<Persona>
                            label={searchLabel}
                            placeholder="Nombre o DNI..."
                            onSearch={personasService.search}
                            onSelect={onAdd}
                            renderItem={person => `${person.nombreCompleto} ${person.dni ? `(${person.dni})` : ''}`}
                            renderSelection={() => ''}
                            idField="id"
                            value={null}
                        />
                        <button type="button" onClick={() => onSearchingChange(false)} className="mt-1 text-xs text-gray-600 hover:text-gray-700">Cancelar búsqueda</button>
                    </div>
                ))}
            </div>
        </section>
    );
}
