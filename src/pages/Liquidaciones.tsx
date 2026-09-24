import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import NewLiquidationModal from '../components/NewLiquidationModal';
import { useAuth } from '../context/AuthContext';
import LiquidationHistory from '../features/liquidations/LiquidationHistory';
import MonthlyLiquidationWorkspace from '../features/liquidations/MonthlyLiquidationWorkspace';
import { contractsService, type Contract } from '../services/contracts.service';
import { liquidacionesService } from '../services/liquidaciones.service';
import { hasPermission } from '../utils/permissions';

export default function Liquidaciones() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canCreate = hasPermission(user, 'liquidaciones.crear');
  const [view, setView] = useState<'MES' | 'HISTORIAL'>(() => searchParams.get('view') === 'HISTORIAL' ? 'HISTORIAL' : 'MES');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [individualOpen, setIndividualOpen] = useState(false);

  useEffect(() => {
    if (!canCreate) return;
    contractsService.getAll({ limit: 100, status: 'ACTIVO' })
      .then(response => setContracts(response.data.filter(contract => contract.administrado)))
      .catch(() => toast.error('No se pudieron cargar los contratos activos'));
  }, [canCreate]);

  useEffect(() => {
    if (searchParams.get('view') === 'HISTORIAL') setView('HISTORIAL');
  }, [searchParams]);

  const selectView = (nextView: 'MES' | 'HISTORIAL') => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextView === 'HISTORIAL') {
      nextParams.set('view', 'HISTORIAL');
    } else {
      ['view', 'q', 'periodo', 'estado', 'propiedadId', 'inquilinoId', 'propietarioId', 'moneda', 'vencidas', 'soloDeuda', 'pendientePropietario', 'adelantos'].forEach(key => nextParams.delete(key));
    }
    setSearchParams(nextParams);
    setView(nextView);
  };

  const createIndividual = async (contratoId: number, periodo: string, montoHonorarios?: number, porcentajeHonorarios?: number, cuotasIds?: number[]) => {
    try {
      const created = await liquidacionesService.create(contratoId, periodo, montoHonorarios, porcentajeHonorarios, cuotasIds);
      toast.success('Borrador creado');
      setIndividualOpen(false);
      navigate(`/liquidaciones/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la liquidación');
    }
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <header>
      <h1 className="text-2xl font-black tracking-tight text-gray-950">Liquidaciones</h1>
      <p className="mt-1 text-sm text-gray-700">Prepará el mes, registrá cobros y completá los pagos a propietarios desde un flujo guiado.</p>
    </header>

    <nav aria-label="Vistas de liquidaciones" className="inline-flex rounded-xl border border-gray-300 bg-white p-1 shadow-sm">
      <button type="button" aria-current={view === 'MES' ? 'page' : undefined} onClick={() => selectView('MES')} className={`min-h-11 rounded-lg px-4 text-sm font-bold ${view === 'MES' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Trabajo del mes</button>
      <button type="button" aria-current={view === 'HISTORIAL' ? 'page' : undefined} onClick={() => selectView('HISTORIAL')} className={`min-h-11 rounded-lg px-4 text-sm font-bold ${view === 'HISTORIAL' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Historial</button>
    </nav>

    {view === 'MES'
      ? <MonthlyLiquidationWorkspace canCreate={canCreate} onOpenIndividual={() => setIndividualOpen(true)} />
      : <LiquidationHistory />}

    <NewLiquidationModal isOpen={individualOpen} onClose={() => setIndividualOpen(false)} onSave={createIndividual} contracts={contracts} />
  </div>;
}
