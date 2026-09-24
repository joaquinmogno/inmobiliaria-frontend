import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ActiveFilterChips, { type ActiveFilterChip } from '../../components/ActiveFilterChips';
import AppSelect from '../../components/AppSelect';
import AutocompleteSelector from '../../components/AutocompleteSelector';
import FilterBar from '../../components/FilterBar';
import ServerPagination from '../../components/ServerPagination';
import { liquidacionesService, type Liquidacion } from '../../services/liquidaciones.service';
import { formatCurrency } from '../../utils/currency';
import { formatDate, formatMonthYear } from '../../utils/date';
import { getTenantPaidTotal } from './liquidation-detail.model';

type FilterOptions = Awaited<ReturnType<typeof liquidacionesService.getFilters>>;
type PersonFilterOption = { id: number; nombreCompleto: string };
type PropertyFilterOption = { id: number; direccion: string; piso: string | null; departamento: string | null };
type HistoryFilters = {
  periodo: string;
  estado: string;
  propiedadId: string;
  inquilinoId: string;
  propietarioId: string;
  moneda: string;
  soloDeuda: boolean;
  vencidas: boolean;
  pendientePropietario: boolean;
  adelantos: boolean;
};

const PAGE_SIZE = 12;
const FILTER_KEYS: Array<keyof HistoryFilters> = ['periodo', 'estado', 'propiedadId', 'inquilinoId', 'propietarioId', 'moneda', 'soloDeuda', 'vencidas', 'pendientePropietario', 'adelantos'];

const filtersFromSearchParams = (searchParams: URLSearchParams): HistoryFilters => ({
  periodo: searchParams.get('periodo') || '',
  estado: searchParams.get('estado') || '',
  propiedadId: searchParams.get('propiedadId') || '',
  inquilinoId: searchParams.get('inquilinoId') || '',
  propietarioId: searchParams.get('propietarioId') || '',
  moneda: searchParams.get('moneda') || '',
  soloDeuda: searchParams.get('soloDeuda') === 'true',
  vencidas: searchParams.get('vencidas') === 'true',
  pendientePropietario: searchParams.get('pendientePropietario') === 'true',
  adelantos: searchParams.get('adelantos') === 'true'
});

const nextAction = (liquidation: Liquidacion) => liquidation.estado === 'BORRADOR' ? 'Revisar borrador'
  : liquidation.estado === 'CONFIRMADA' && liquidation.estadoCobroInquilino !== 'COBRADO' ? 'Registrar cobro'
    : liquidation.estado === 'CONFIRMADA' && liquidation.estadoPagoPropietario !== 'PAGADO' ? `Pagar a ${liquidation.propietarioNombre || liquidation.contrato?.propietarios.find(owner => owner.esPrincipal)?.persona.nombreCompleto || 'propietario'}`
      : 'Ver comprobantes';

const operationalBalances = (liquidation: Liquidacion) => {
  if (liquidation.resumenOperativo) return liquidation.resumenOperativo;
  const cobradoInquilino = getTenantPaidTotal(liquidation);
  const pagadoPropietario = Number(liquidation.montoPagadoPropietario || 0);
  return {
    cobradoInquilino,
    pagadoPropietario,
    saldoPropietario: Math.max(0, Number(liquidation.montoPropietario) - pagadoPropietario),
    capitalPropioExpuesto: Math.max(0, pagadoPropietario - cobradoInquilino)
  };
};

function OperationalBalanceChips({ liquidation }: { liquidation: Liquidacion }) {
  const balances = operationalBalances(liquidation);
  const chips = [
    { label: 'Cobrado inquilino', value: balances.cobradoInquilino, tone: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
    { label: 'Entregado al propietario', value: balances.pagadoPropietario, tone: 'border-blue-200 bg-blue-50 text-blue-900' },
    { label: 'Saldo propietario', value: balances.saldoPropietario, tone: balances.saldoPropietario > 0 ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-gray-200 bg-gray-50 text-gray-700' },
    { label: 'Adelanto a recuperar', value: balances.capitalPropioExpuesto, tone: balances.capitalPropioExpuesto > 0 ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-gray-200 bg-gray-50 text-gray-700' }
  ];
  return <div className="grid min-w-64 grid-cols-2 gap-1.5">
    {chips.map(chip => <div key={chip.label} className={`rounded-lg border px-2 py-1.5 ${chip.tone}`}>
      <p className="text-[10px] font-black uppercase leading-3 tracking-wide">{chip.label}</p>
      <p className="mt-1 text-xs font-black">{formatCurrency(Number(chip.value), liquidation.moneda)}</p>
    </div>)}
  </div>;
}

export default function LiquidationHistory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<Liquidacion[]>([]);
  const [options, setOptions] = useState<FilterOptions>({ periodos: [], monedas: ['ARS', 'USD'] });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') || '');
  const [filters, setFilters] = useState(() => filtersFromSearchParams(searchParams));
  const [selectedProperty, setSelectedProperty] = useState<PropertyFilterOption | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<PersonFilterOption | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<PersonFilterOption | null>(null);

  useEffect(() => {
    liquidacionesService.getFilters().then(setOptions).catch(() => toast.error('No se pudieron cargar los filtros del historial'));
  }, []);

  useEffect(() => {
    const query = searchParams.get('q') || '';
    setSearch(query);
    setDebouncedSearch(query);
    setFilters(filtersFromSearchParams(searchParams));
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    const id = Number(filters.propiedadId);
    if (!id) { setSelectedProperty(null); return; }
    void liquidacionesService.searchFilterProperties('', 1, id).then(response => active && setSelectedProperty(response.data[0] || null));
    return () => { active = false; };
  }, [filters.propiedadId]);

  useEffect(() => {
    let active = true;
    const id = Number(filters.inquilinoId);
    if (!id) { setSelectedTenant(null); return; }
    void liquidacionesService.searchFilterPeople('INQUILINO', '', 1, id).then(response => active && setSelectedTenant(response.data[0] || null));
    return () => { active = false; };
  }, [filters.inquilinoId]);

  useEffect(() => {
    let active = true;
    const id = Number(filters.propietarioId);
    if (!id) { setSelectedOwner(null); return; }
    void liquidacionesService.searchFilterPeople('PROPIETARIO', '', 1, id).then(response => active && setSelectedOwner(response.data[0] || null));
    return () => { active = false; };
  }, [filters.propietarioId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    liquidacionesService.getAll(undefined, page, PAGE_SIZE, debouncedSearch, filters)
      .then(response => {
        if (!active) return;
        setRows(response.data);
        setMeta({ total: response.meta.total, totalPages: response.meta.totalPages });
      })
      .catch(() => active && toast.error('No se pudo cargar el historial'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [page, debouncedSearch, filters]);

  const updateUrl = (key: string, value: string | boolean) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      if (value === '' || value === false) next.delete(key);
      else next.set(key, value === true ? 'true' : value);
      return next;
    }, { replace: true });
  };

  const updateFilter = <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) => updateUrl(key, value);
  const updateSearch = (value: string) => {
    setSearch(value);
    updateUrl('q', value.trim());
  };
  const clear = () => setSearchParams(current => {
    const next = new URLSearchParams(current);
    ['q', ...FILTER_KEYS].forEach(key => next.delete(key));
    return next;
  }, { replace: true });

  const activeFilters: ActiveFilterChip[] = (() => {
    const stateLabel = ({ BORRADOR: 'Borradores', CONFIRMADA: 'Confirmadas', ANULADA: 'Anuladas' } as Record<string, string>)[filters.estado] || filters.estado;
    const booleanFilters: Array<[keyof HistoryFilters, string]> = [
      ['soloDeuda', 'Con deuda'], ['vencidas', 'Vencidas'], ['pendientePropietario', 'Pendientes de pago al propietario'], ['adelantos', 'Adelantos a recuperar']
    ];
    return [
      ...(search ? [{ key: 'q', label: `Búsqueda: ${search}`, onRemove: () => updateSearch('') }] : []),
      ...(filters.periodo ? [{ key: 'periodo', label: `Período: ${formatMonthYear(filters.periodo)}`, onRemove: () => updateFilter('periodo', '') }] : []),
      ...(filters.estado ? [{ key: 'estado', label: `Estado: ${stateLabel}`, onRemove: () => updateFilter('estado', '') }] : []),
      ...(filters.moneda ? [{ key: 'moneda', label: `Moneda: ${filters.moneda}`, onRemove: () => updateFilter('moneda', '') }] : []),
      ...(filters.propiedadId ? [{ key: 'propiedadId', label: `Propiedad: ${selectedProperty?.direccion || `#${filters.propiedadId}`}`, onRemove: () => updateFilter('propiedadId', '') }] : []),
      ...(filters.inquilinoId ? [{ key: 'inquilinoId', label: `Inquilino: ${selectedTenant?.nombreCompleto || `#${filters.inquilinoId}`}`, onRemove: () => updateFilter('inquilinoId', '') }] : []),
      ...(filters.propietarioId ? [{ key: 'propietarioId', label: `Propietario: ${selectedOwner?.nombreCompleto || `#${filters.propietarioId}`}`, onRemove: () => updateFilter('propietarioId', '') }] : []),
      ...booleanFilters.filter(([key]) => filters[key] === true).map(([key, label]) => ({ key, label, onRemove: () => updateUrl(key, false) }))
    ];
  })();

  return <section aria-labelledby="liquidation-history-title" className="space-y-4">
    <div>
      <h2 id="liquidation-history-title" className="text-xl font-black text-gray-950">Historial de liquidaciones</h2>
      <p className="mt-1 text-sm text-gray-700">Consultá períodos anteriores y encontrá operaciones por persona, propiedad, moneda o estado.</p>
    </div>
    <FilterBar query={search} onQueryChange={updateSearch} onClear={clear} resultCount={meta.total} placeholder="Propiedad, inquilino o propietario…">
      <AppSelect ariaLabel="Período" value={filters.periodo} onChange={value => updateFilter('periodo', value)} options={[{ value: '', label: 'Todos los períodos' }, ...options.periodos.map(value => ({ value: value.slice(0, 10), label: formatMonthYear(value) }))]} className="w-full sm:w-48" />
      <AppSelect ariaLabel="Estado" value={filters.estado} onChange={value => updateFilter('estado', value)} options={[
        { value: '', label: 'Todos los documentos' }, { value: 'BORRADOR', label: 'Borrador' }, { value: 'CONFIRMADA', label: 'Confirmada' }, { value: 'ANULADA', label: 'Anulada' }
      ]} className="w-full sm:w-56" />
      <AppSelect ariaLabel="Moneda" value={filters.moneda} onChange={value => updateFilter('moneda', value)} options={[{ value: '', label: 'Todas las monedas' }, ...options.monedas.map(value => ({ value, label: value }))]} className="w-full sm:w-44" />
      <details className="w-full rounded-xl border border-gray-300 bg-white sm:w-auto">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-bold text-gray-800">Más filtros</summary>
        <div className="grid gap-3 border-t border-gray-200 p-3 sm:min-w-80">
          <AutocompleteSelector<PropertyFilterOption>
            label="Propiedad"
            placeholder="Dirección, matrícula o partida..."
            value={selectedProperty}
            onSearch={liquidacionesService.searchFilterProperties}
            onSelect={item => { setSelectedProperty(item); updateFilter('propiedadId', item ? String(item.id) : ''); }}
            renderItem={item => `${item.direccion}${item.piso ? ` · Piso ${item.piso}` : ''}${item.departamento ? ` · ${item.departamento}` : ''}`}
            renderSelection={item => item.direccion}
            idField="id"
          />
          <AutocompleteSelector<PersonFilterOption>
            label="Inquilino"
            placeholder="Nombre, DNI o CUIT..."
            value={selectedTenant}
            onSearch={(query, currentPage) => liquidacionesService.searchFilterPeople('INQUILINO', query, currentPage)}
            onSelect={item => { setSelectedTenant(item); updateFilter('inquilinoId', item ? String(item.id) : ''); }}
            renderItem={item => item.nombreCompleto}
            renderSelection={item => item.nombreCompleto}
            idField="id"
          />
          <AutocompleteSelector<PersonFilterOption>
            label="Propietario"
            placeholder="Nombre, DNI o CUIT..."
            value={selectedOwner}
            onSearch={(query, currentPage) => liquidacionesService.searchFilterPeople('PROPIETARIO', query, currentPage)}
            onSelect={item => { setSelectedOwner(item); updateFilter('propietarioId', item ? String(item.id) : ''); }}
            renderItem={item => item.nombreCompleto}
            renderSelection={item => item.nombreCompleto}
            idField="id"
          />
          {([['soloDeuda', 'Con deuda'], ['vencidas', 'Vencidas'], ['pendientePropietario', 'Pendientes de pago al propietario'], ['adelantos', 'Adelantos a recuperar']] as const).map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"><input type="checkbox" checked={filters[key]} onChange={event => updateFilter(key, event.target.checked)} className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />{label}</label>)}
        </div>
      </details>
    </FilterBar>
    <ActiveFilterChips filters={activeFilters} onClearAll={clear} />

    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {loading ? <p className="p-10 text-center text-sm font-semibold text-gray-700">Cargando historial…</p> : <>
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-[1200px] border-collapse text-left">
            <caption className="sr-only">Historial de liquidaciones</caption>
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-black uppercase tracking-wide text-gray-700">
              <tr>
                <th scope="col" className="px-3 py-3">Período</th>
                <th scope="col" className="px-3 py-3">Propiedad</th>
                <th scope="col" className="px-3 py-3">Inquilino</th>
                <th scope="col" className="px-3 py-3">Estado</th>
                <th scope="col" className="px-3 py-3">Saldos operativos</th>
                <th scope="col" className="px-3 py-3 text-right">Total</th>
                <th scope="col" className="px-3 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map(row => {
                const property = row.propiedadDireccion || row.contrato?.propiedad.direccion || 'Propiedad sin dirección';
                const tenant = row.inquilinoNombre || row.contrato?.inquilinos.find(item => item.esPrincipal)?.persona.nombreCompleto || 'Sin inquilino';
                const state = row.estado === 'BORRADOR' ? 'Borrador' : row.estado === 'ANULADA' ? 'Anulada' : `Cobro ${row.estadoCobroInquilino.toLowerCase()} · dueño ${row.estadoPagoPropietario.toLowerCase()}`;
                return <tr key={row.id} className="align-top hover:bg-gray-50/80">
                  <td className="px-3 py-3.5 text-sm font-bold text-gray-900">{formatMonthYear(row.periodo)}</td>
                  <td className="min-w-0 px-3 py-3.5"><p className="max-w-56 break-words text-sm font-black text-gray-950">{property}</p><p className="mt-1 text-xs text-gray-600">Vence {formatDate(row.fechaVencimiento)}</p></td>
                  <td className="min-w-0 px-3 py-3.5 text-sm font-semibold text-gray-800"><p className="max-w-48 break-words">{tenant}</p></td>
                  <td className="px-3 py-3.5"><span className="inline-flex max-w-48 rounded-full border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-bold leading-4 text-gray-800">{state}</span></td>
                  <td className="px-3 py-3.5"><OperationalBalanceChips liquidation={row} /></td>
                  <td className="px-3 py-3.5 text-right"><p className="break-words text-sm font-black text-gray-950">{formatCurrency(Number(row.netoACobrar), row.moneda)}</p></td>
                  <td className="px-3 py-3.5 text-right"><button type="button" onClick={() => navigate(`/liquidaciones/${row.id}`)} className="min-h-11 w-full rounded-xl bg-indigo-600 px-3 text-sm font-bold leading-4 text-white hover:bg-indigo-700 xl:w-auto">{nextAction(row)}</button></td>
                </tr>;
              })}
              {!rows.length && <tr><td colSpan={7} className="p-10 text-center text-sm font-semibold text-gray-700">No se encontraron liquidaciones con esos filtros.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-gray-200 lg:hidden">
        {rows.map(row => {
          const property = row.propiedadDireccion || row.contrato?.propiedad.direccion || 'Propiedad sin dirección';
          const tenant = row.inquilinoNombre || row.contrato?.inquilinos.find(item => item.esPrincipal)?.persona.nombreCompleto || 'Sin inquilino';
          return <article key={row.id} className="grid min-w-0 gap-3 p-4 hover:bg-gray-50 md:grid-cols-[minmax(0,1fr)_minmax(12rem,auto)] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-black text-gray-950">{property}</h3><span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs font-bold text-gray-800">{formatMonthYear(row.periodo)}</span></div>
              <p className="mt-1 break-words text-sm text-gray-700">{tenant} · vence {formatDate(row.fechaVencimiento)}</p>
              <p className="mt-2 text-xs font-bold text-gray-700">{row.estado === 'BORRADOR' ? 'Borrador' : row.estado === 'ANULADA' ? 'Anulada' : `Cobro ${row.estadoCobroInquilino.toLowerCase()} · pago al propietario ${row.estadoPagoPropietario.toLowerCase()}`}</p>
              <div className="mt-3"><OperationalBalanceChips liquidation={row} /></div>
            </div>
            <div className="flex min-w-0 flex-col gap-2 border-t border-gray-100 pt-3 md:items-end md:border-0 md:pt-0">
              <p className="text-lg font-black text-gray-950">{formatCurrency(Number(row.netoACobrar), row.moneda)}</p>
              <button type="button" onClick={() => navigate(`/liquidaciones/${row.id}`)} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700">{nextAction(row)}</button>
            </div>
          </article>;
        })}
        {!rows.length && <p className="p-10 text-center text-sm font-semibold text-gray-700">No se encontraron liquidaciones con esos filtros.</p>}
        </div>
      </>}
      <ServerPagination page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} currentCount={rows.length} onPageChange={setPage} />
    </div>
  </section>;
}
