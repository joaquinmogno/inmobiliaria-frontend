import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import { currentMonthInput, formatDate, formatMonthYear, todayDateInput } from '../utils/date';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { contractsService, getDaysLeft, type Contract } from "../services/contracts.service";
import ContractCard from "../components/ContractCard";
import PaginatedList from "../components/PaginatedList";
import ContractDetailsModal from "../components/ContractDetailsModal";
import UpdateContractModal from "../components/UpdateContractModal";
import {
  CheckCircleIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowPathIcon,
  ChartBarIcon,
  HomeModernIcon,
} from "@heroicons/react/24/outline";
import { reportesService, type AccruedFinancialReport, type CashFinancialReport } from "../services/reportes.service";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import { formatCurrency, type Moneda } from "../utils/currency";
import toast from "react-hot-toast";
import { requestConfirmation } from "../services/confirmation";
import OperationalAlertsPanel from "../components/OperationalAlertsPanel";

export interface ExpiringContract {
  id: number;
  address: string;
  owner: string;
  tenant: string;
  endDate: string;
  daysLeft: number;
}

export interface UpdatingContract {
  id: number;
  address: string;
  owner: string;
  tenant: string;
  updateDate: string;
  daysLeft: number;
}

interface KpiData {
  propiedadesTotal: number;
  contratosActivos: number;
  morosidad: number;
  porMoneda?: Record<Moneda, {
    recaudadoTotal: number;
    gananciaBruta: number;
    gastosAgencia: number;
    utilidadNeta: number;
    fondoCustodia: number;
    morosidad: number;
  }>;
  devengado?: AccruedFinancialReport | null;
  caja?: CashFinancialReport | null;
  operacion?: { alquileresVencidos: number; cobrosPendientes: number; pagosPropietarioPendientes: number; contratosPorVencer: number };
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canViewContracts = hasPermission(user, "contratos.ver");
  const canEditContracts = hasPermission(user, "contratos.editar");
  const canDeleteContracts = hasPermission(user, "contratos.eliminar");
  const canViewDashboard = hasPermission(user, "reportes.dashboard.ver");
  const canViewContractReports = hasPermission(user, "reportes.contratos.ver");
  const canViewDelinquencyReports = hasPermission(user, "reportes.morosidad.ver");
  const canViewFinancialReports = hasPermission(user, "reportes.financieros.ver");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedContractForUpdate, setSelectedContractForUpdate] = useState<Contract | null>(null);

  const [expiringList, setExpiringList] = useState<ExpiringContract[]>([]);
  const [updatingList, setUpdatingList] = useState<UpdatingContract[]>([]);
  const [allContracts, setAllContracts] = useState<Contract[]>([]);
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);

  useEffect(() => {
    refreshData();
  }, [canViewContracts, canViewDashboard]);

  const refreshData = async () => {
    try {
      setLoadingKpis(true);
      const [reportData, alertsData] = await Promise.all([
        canViewDashboard ? reportesService.getDashboardReport() : Promise.resolve(null),
        canViewContracts ? contractsService.getAlertas() : Promise.resolve([]),
      ]);

      // --- Listas de alertas (desde el backend) ---
      const alerts = (alertsData || []) as Contract[];
      setAllContracts(alerts);

      const expiring = alerts
        .filter(c => c.fechaFin && getDaysLeft(c.fechaFin) <= 60 && getDaysLeft(c.fechaFin) >= 0)
        .map((c) => ({
          id: c.id,
          address: c.propiedad.direccion,
          owner: c.propietarios.find(p => p.esPrincipal)?.persona.nombreCompleto || '-',
          tenant: c.inquilinos.find(i => i.esPrincipal)?.persona.nombreCompleto || '-',
          endDate: c.fechaFin,
          daysLeft: getDaysLeft(c.fechaFin),
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft);

      const updating = alerts
        .filter(c => c.requiereActualizacion && c.fechaProximaActualizacion && getDaysLeft(c.fechaProximaActualizacion) <= 30 && getDaysLeft(c.fechaProximaActualizacion) >= 0)
        .map((c) => ({
          id: c.id,
          address: c.propiedad.direccion,
          owner: c.propietarios.find(p => p.esPrincipal)?.persona.nombreCompleto || '-',
          tenant: c.inquilinos.find(i => i.esPrincipal)?.persona.nombreCompleto || '-',
          updateDate: c.fechaProximaActualizacion || "",
          daysLeft: c.fechaProximaActualizacion ? getDaysLeft(c.fechaProximaActualizacion) : 999,
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft);

      setExpiringList(expiring);
      setUpdatingList(updating);

      setKpis(reportData ? {
        propiedadesTotal: reportData.propiedades.total,
        contratosActivos: reportData.contratos.activos,
	        morosidad: reportData.finanzas.morosidad,
	        porMoneda: reportData.finanzas.porMoneda,
            devengado: reportData.finanzas.devengado,
            caja: reportData.finanzas.caja
        , operacion: reportData.operacion
      } : null);
    } catch (error) {
      console.error("Error loading home data:", error);
    } finally {
      setLoadingKpis(false);
    }
  };

  const handleContractClick = (contractId: number) => {
    const contract = allContracts.find((c) => c.id === contractId);
    if (contract) {
      setSelectedContract(contract);
      setIsDetailsModalOpen(true);
    }
  };

  const handleOpenUpdateModal = (e: React.MouseEvent, contractId: number) => {
    e.stopPropagation();
    if (!canEditContracts) return;
    const contract = allContracts.find((c) => c.id === contractId);
    if (contract) {
        setSelectedContractForUpdate(contract);
        setIsUpdateModalOpen(true);
    }
  };

  const handleDeleteContract = async (contractId: number) => {
    if (!canDeleteContracts) return;
    if (await requestConfirmation({ title: "Enviar contrato a la papelera", message: "El contrato dejará de aparecer entre los activos. Podrás restaurarlo desde la papelera.", confirmText: "Enviar a papelera" })) {
      try {
        await contractsService.delete(contractId);
        refreshData();
        setIsDetailsModalOpen(false);
        setSelectedContract(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo eliminar el contrato");
      }
    }
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setTimeout(() => setSelectedContract(null), 300);
  };

  const reportPeriod = kpis?.devengado?.periodo || kpis?.caja?.periodo || currentMonthInput();
  const reportMonth = formatMonthYear(`${reportPeriod.slice(0, 7)}-01`);
  const kpiCards = [
    {
      label: "Propiedades registradas",
      criterion: "Todas, con o sin contrato",
      visible: canViewDashboard,
      value: kpis?.propiedadesTotal ?? "-",
      icon: HomeModernIcon,
      iconStyle: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "Contratos Activos",
      criterion: "Incluye gestión única",
      visible: canViewContractReports,
      value: kpis?.contratosActivos ?? "-",
      icon: DocumentTextIcon,
      iconStyle: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "Pendiente de cobro · ARS",
      criterion: "Saldo / facturado del mes",
      visible: canViewDelinquencyReports,
      value: kpis?.devengado && canViewFinancialReports ? `${kpis.morosidad.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "—",
      icon: ChartBarIcon,
      iconStyle: "bg-indigo-50 text-indigo-700",
      valueStyle: "text-gray-950",
    },
  ];

  return (
    <div className="ui-page">
      
      <PageHeader title={`Panel de ${user?.inmobiliaria?.nombre || "Gestión"}`} description={`Inventario actual, pendientes de todos los períodos y finanzas de ${reportMonth}.`} />

      {/* Indicadores operativos: las cifras financieras se muestran una sola vez y separadas por moneda. */}
      <section aria-labelledby="operational-summary-title">
        <h2 id="operational-summary-title" className="sr-only">Resumen operativo</h2>
      <div data-testid="dashboard-operational-kpis" className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 gap-3">
        {kpiCards.filter(card => card.visible).map(card => <MetricCard key={card.label} label={card.label} value={card.value} description={card.criterion} loading={loadingKpis} />)}
	      </div>
      <p className="mt-2 text-xs text-gray-600">Inventario al {formatDate(todayDateInput())}: propiedades de todo el registro y contratos en estado ACTIVO. Pendiente de cobro: saldo de inquilinos / facturado en ARS de {reportMonth}, incluidas deudas aún no vencidas.{!kpis?.devengado && !loadingKpis && canViewDelinquencyReports && ' Porcentaje no disponible sin el reporte financiero.'}</p>
      </section>

      {canViewDashboard && kpis?.operacion && <section aria-labelledby="priority-actions-title" className="ui-panel p-4">
        <div><h2 id="priority-actions-title" className="ui-section-title">Prioridades operativas</h2><p className="mt-1 text-xs leading-5 text-content-muted">Liquidaciones confirmadas de todos los períodos; vencimientos de contratos activos en los próximos 60 días.</p></div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Liquidaciones vencidas', value: kpis.operacion.alquileresVencidos, tone: 'text-red-800', action: () => navigate('/liquidaciones?view=HISTORIAL&vencidas=true') },
            { label: 'Liquidaciones con cobro pendiente', value: kpis.operacion.cobrosPendientes, tone: 'text-amber-800', action: () => navigate('/liquidaciones?view=HISTORIAL&soloDeuda=true') },
            { label: 'Liquidaciones con pago pendiente', value: kpis.operacion.pagosPropietarioPendientes, tone: 'text-blue-800', action: () => navigate('/liquidaciones?view=HISTORIAL&pendientePropietario=true') },
            { label: 'Contratos próximos a vencer', value: kpis.operacion.contratosPorVencer, tone: 'text-amber-800', action: () => navigate('/contratos?alerta=POR_VENCER') }
          ].map(item => {
            const hasPending = item.value > 0;
            return <button type="button" key={item.label} onClick={item.action} className={`group grid grid-cols-[auto_1fr] items-start gap-x-3 rounded-md border border-slate-200 bg-white p-3 text-left transition-colors hover:border-indigo-300 hover:bg-slate-50 ${hasPending ? item.tone : 'text-slate-700'}`}>
              <p className="row-span-2 text-2xl font-semibold tabular-nums">{item.value}</p>
              <p className="text-sm font-medium text-slate-800">{item.label}</p>
              <p className="mt-1 text-xs font-medium">{hasPending ? <span className="underline">Ver y resolver</span> : <>Sin pendientes · <span className="underline">Ver listado</span></>}</p>
            </button>;
          })}
        </div>
      </section>}


	      {canViewFinancialReports && kpis?.porMoneda && (
	        <section data-testid="dashboard-financial-summary" aria-labelledby="financial-summary-title" className="ui-panel p-4">
	          <div className="mb-3">
	            <h2 id="financial-summary-title" className="ui-section-title">Resumen financiero por moneda</h2>
	            <p className="mt-1 text-xs leading-5 text-content-muted">Período: {reportMonth}. Devengado usa el período de la liquidación; caja usa la fecha real de cada movimiento. Los saldos de esos documentos incluyen cobros y créditos aplicados hasta hoy. Los importes no se combinan entre ARS y USD.</p>
	          </div>
	        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
	          {(["ARS", "USD"] as Moneda[]).map(moneda => {
	            const metrics = kpis.porMoneda?.[moneda];
	            const accrued = kpis.devengado?.porMoneda?.[moneda];
	            const cashPeriod = kpis.caja?.movimientosDelPeriodo?.[moneda];
	            const cashBalance = kpis.caja?.saldoAlCierre?.[moneda];
	            if (!metrics) return null;
	            const hasAmount = metrics.recaudadoTotal || metrics.gananciaBruta || metrics.gastosAgencia || metrics.utilidadNeta || metrics.fondoCustodia || accrued?.facturado || cashBalance?.saldo;
	            if (moneda === "USD" && !hasAmount) return null;

	            return (
                  <article key={moneda} data-testid="dashboard-currency-summary" className="min-w-0 rounded-md border border-slate-200 px-3 py-2">
                    <h3 className="border-b border-slate-200 pb-2 text-sm font-semibold text-indigo-800">Finanzas en {moneda}</h3>
                    <p className="mt-2 text-xs font-semibold text-slate-600">Devengado · liquidaciones del período</p>
                    <dl>
                      {[
                        ['Facturado', accrued?.facturado ?? 0],
                        ['Pendiente de inquilinos', accrued?.saldoPendienteInquilinos ?? 0],
                        ['Importe de propietarios', accrued?.importePropietariosDevengado ?? 0],
                        ['Pendiente de propietarios', accrued?.saldoPendientePropietarios ?? 0]
                      ].map(([label, value]) => <div className="ui-financial-line" key={label}><dt className="text-slate-600">{label}</dt><dd>{formatCurrency(Number(value), moneda)}</dd></div>)}
                    </dl>
                    <p className="mt-2 border-t border-slate-100 pt-2 text-xs font-semibold text-slate-600">Caja · movimientos reales</p>
                    <dl>
                      <div className="ui-financial-line"><dt className="text-slate-600">Cobrado a inquilinos</dt><dd>{formatCurrency(cashPeriod?.cobrosInquilinos ?? metrics.recaudadoTotal, moneda)}</dd></div>
                      <div className="ui-financial-line"><dt className="text-slate-600">Saldo al cierre</dt><dd>{formatCurrency(cashBalance?.saldo ?? 0, moneda)}</dd></div>
                    </dl>
                    <div data-testid="dashboard-net-result" className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 py-2">
                      <p className="text-xs text-content-muted">Honorarios devengados / gastos por caja</p>
                      <p className={`text-lg font-semibold tabular-nums ${metrics.utilidadNeta < 0 ? "text-status-danger" : "text-status-success"}`}>{formatCurrency(metrics.utilidadNeta, moneda)}</p>
                    </div>
                  </article>
	            );
	          })}
	        </div>
	        </section>
	      )}

      {canViewDashboard && <OperationalAlertsPanel />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contratos por vencer */}
          <PaginatedList
            title="Contratos a vencer (Próx 60d)"
            items={expiringList}
            renderItem={(contract) => (
              <ContractCard
                key={(contract as any).id}
                address={(contract as any).address}
                owner={(contract as any).owner}
                tenant={(contract as any).tenant}
                date={(contract as any).endDate}
                badgeText={`Vence en ${(contract as any).daysLeft} días`}
                badgeColor="red"
                icon={ClockIcon}
                onClick={() => handleContractClick((contract as any).id)}
              />
            )}
            badgeColor="red"
            emptyState={
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <CheckCircleIcon className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">
                  No hay contratos próximos a vencer
                </p>
              </div>
            }
          />

          {/* Contratos por actualizar */}
          <PaginatedList
            title="Actualizaciones (Próx 30d)"
            items={updatingList}
            renderItem={(contract) => (
              <ContractCard
                key={(contract as any).id}
                address={(contract as any).address}
                owner={(contract as any).owner}
                tenant={(contract as any).tenant}
                date={(contract as any).updateDate}
                badgeText={`En ${(contract as any).daysLeft} d`}
                badgeColor="orange"
                icon={ArrowPathIcon}
                onClick={() => handleContractClick((contract as any).id)}
                action={canEditContracts ? (
                    <button
                        onClick={(e) => handleOpenUpdateModal(e, (contract as any).id)}
                        className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition-colors"
                    >
                        Actualizar
                    </button>
                ) : undefined}
              />
            )}
            badgeColor="orange"
            emptyState={
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <CheckCircleIcon className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">
                  No hay contratos próximos a actualizar
                </p>
              </div>
            }
          />
      </div>

      <ContractDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        contract={selectedContract}
        onDelete={handleDeleteContract}
      />

      <UpdateContractModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        contract={selectedContractForUpdate}
        onUpdate={refreshData}
      />
    </div>
  );
}
