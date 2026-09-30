import { useSearchParams } from 'react-router-dom';
import LiquidationHistory from '../features/liquidations/LiquidationHistory';
import MonthlyLiquidationWorkspace from '../features/liquidations/MonthlyLiquidationWorkspace';

export default function Liquidaciones() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'HISTORIAL' ? 'HISTORIAL' : 'MES';

  const selectView = (nextView: 'MES' | 'HISTORIAL') => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextView === 'HISTORIAL') {
      nextParams.set('view', 'HISTORIAL');
    } else {
      ['view', 'q', 'periodo', 'estado', 'propiedadId', 'inquilinoId', 'propietarioId', 'moneda', 'vencidas', 'soloDeuda', 'pendientePropietario', 'adelantos', 'conCuotas'].forEach(key => nextParams.delete(key));
    }
    setSearchParams(nextParams);
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
      ? <MonthlyLiquidationWorkspace />
      : <LiquidationHistory />}
  </div>;
}
