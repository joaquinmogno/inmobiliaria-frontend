import PageHeader from '../components/PageHeader';
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

  return <div className="ui-page">
    <PageHeader title="Liquidaciones" description="Prepará el mes, registrá cobros y completá los pagos a propietarios desde un flujo guiado." actions={
      <nav aria-label="Vistas de liquidaciones" className="ui-tabs">
        <button type="button" aria-current={view === 'MES' ? 'page' : undefined} onClick={() => selectView('MES')} className="ui-tab">Trabajo del mes</button>
        <button type="button" aria-current={view === 'HISTORIAL' ? 'page' : undefined} onClick={() => selectView('HISTORIAL')} className="ui-tab">Historial</button>
      </nav>
    } />

    <p className="text-xs text-gray-600">Estados independientes: documento, cobro, pago al propietario y cierre administrativo. “Cobro y pago resueltos” no acredita cierre administrativo ni cierre de Caja.</p>

    {view === 'MES'
      ? <MonthlyLiquidationWorkspace />
      : <LiquidationHistory />}
  </div>;
}
