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

  const kpiCards = [
    {
      label: "Propiedades administradas",
      visible: canViewDashboard,
      value: kpis?.propiedadesTotal ?? "-",
      icon: HomeModernIcon,
      iconStyle: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "Contratos Activos",
      visible: canViewContractReports,
      value: kpis?.contratosActivos ?? "-",
      icon: DocumentTextIcon,
      iconStyle: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "Morosidad",
      visible: canViewDelinquencyReports,
      value: kpis ? `${kpis.morosidad.toFixed(1)}%` : "-",
      icon: ChartBarIcon,
      iconStyle: kpis && kpis.morosidad > 10 ? "bg-red-50 text-status-danger" : "bg-indigo-50 text-indigo-700",
      valueStyle: kpis && kpis.morosidad > 10 ? "text-status-danger" : "text-gray-950",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="line-clamp-2 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight" title={`Panel de ${user?.inmobiliaria?.nombre || "Gestión"}`}>
            Panel de {user?.inmobiliaria?.nombre || "Gestión"}
          </h1>
          <p className="text-gray-600 text-sm">Resumen financiero y alertas del mes actual.</p>
        </div>
      </div>

      {/* Indicadores operativos: las cifras financieras se muestran una sola vez y separadas por moneda. */}
      <section aria-labelledby="operational-summary-title">
        <h2 id="operational-summary-title" className="sr-only">Resumen operativo</h2>
      <div data-testid="dashboard-operational-kpis" className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 gap-4">
        {kpiCards.filter(card => card.visible).map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconStyle}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                {loadingKpis ? (
                  <div className="mb-1 h-7 w-16 animate-pulse rounded bg-gray-200" />
                ) : (
                  <p className={`text-2xl font-bold leading-tight ${card.valueStyle || "text-gray-950"}`}>{card.value}</p>
                )}
                <p className="text-xs font-medium leading-tight text-content-muted">{card.label}</p>
              </div>
            </div>
          );
        })}
	      </div>
      </section>

      {canViewDashboard && kpis?.operacion && <section aria-labelledby="priority-actions-title" className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm sm:p-5">
        <div><h2 id="priority-actions-title" className="text-lg font-bold text-gray-950">Prioridades operativas</h2><p className="mt-1 text-sm text-content-muted">Acciones que requieren seguimiento hoy.</p></div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Alquileres vencidos', value: kpis.operacion.alquileresVencidos, tone: 'border-red-200 bg-red-50 text-red-900', action: () => navigate('/liquidaciones?view=HISTORIAL&vencidas=true') },
            { label: 'Cobros pendientes', value: kpis.operacion.cobrosPendientes, tone: 'border-amber-200 bg-amber-50 text-amber-900', action: () => navigate('/liquidaciones?view=HISTORIAL&soloDeuda=true') },
            { label: 'Listas para pagar al propietario', value: kpis.operacion.pagosPropietarioPendientes, tone: 'border-blue-200 bg-blue-50 text-blue-900', action: () => navigate('/liquidaciones?view=HISTORIAL&pendientePropietario=true') },
            { label: 'Contratos próximos a vencer', value: kpis.operacion.contratosPorVencer, tone: 'border-gray-200 bg-gray-50 text-gray-900', action: () => navigate('/contratos?alerta=POR_VENCER') }
          ].map(item => <button type="button" key={item.label} onClick={item.action} className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${item.tone}`}><p className="text-2xl font-black">{item.value}</p><p className="mt-1 text-sm font-bold">{item.label}</p><p className="mt-2 text-xs font-semibold underline">Ver y resolver</p></button>)}
        </div>
      </section>}

      {canViewDashboard && <OperationalAlertsPanel />}

	      {canViewFinancialReports && kpis?.porMoneda && (
	        <section data-testid="dashboard-financial-summary" aria-labelledby="financial-summary-title" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
	          <div className="mb-4">
	            <h2 id="financial-summary-title" className="text-lg font-bold text-gray-950">Resumen financiero por moneda</h2>
	            <p className="mt-1 text-sm text-content-muted">Devengado usa el período de la liquidación; caja usa la fecha real de cada movimiento. Los importes no se combinan entre ARS y USD.</p>
	          </div>
	        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
	          {(["ARS", "USD"] as Moneda[]).map(moneda => {
	            const metrics = kpis.porMoneda?.[moneda];
	            const accrued = kpis.devengado?.porMoneda?.[moneda];
	            const cashPeriod = kpis.caja?.movimientosDelPeriodo?.[moneda];
	            const cashBalance = kpis.caja?.saldoAlCierre?.[moneda];
	            if (!metrics) return null;
	            const hasAmount = metrics.recaudadoTotal || metrics.gananciaBruta || metrics.gastosAgencia || metrics.utilidadNeta || metrics.fondoCustodia || accrued?.facturado || cashBalance?.saldo;
	            if (moneda === "USD" && !hasAmount) return null;

	            return (
	              <article key={moneda} data-testid="dashboard-currency-summary" className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
	                <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
	                  <h3 className="text-sm font-bold text-gray-950">Finanzas en {moneda}</h3>
	                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-800">{moneda}</span>
	                </div>
	                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
	                  <div className="col-span-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
	                    <p className="text-xs font-black uppercase tracking-wide text-indigo-800">Devengado · liquidaciones del período</p>
	                    <div className="mt-2 grid grid-cols-2 gap-3">
	                      <div><p className="text-xs font-medium text-content-muted">Facturado</p><p className="font-bold text-gray-950">{formatCurrency(accrued?.facturado ?? 0, moneda)}</p></div>
	                      <div><p className="text-xs font-medium text-content-muted">Pendiente de inquilinos</p><p className="font-bold text-gray-950">{formatCurrency(accrued?.saldoPendienteInquilinos ?? 0, moneda)}</p></div>
	                    </div>
	                  </div>
	                  <div className="col-span-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
	                    <p className="text-xs font-black uppercase tracking-wide text-emerald-800">Caja · movimientos reales</p>
	                    <div className="mt-2 grid grid-cols-2 gap-3">
	                      <div><p className="text-xs font-medium text-content-muted">Cobrado a inquilinos</p><p className="font-bold text-gray-950">{formatCurrency(cashPeriod?.cobrosInquilinos ?? metrics.recaudadoTotal, moneda)}</p></div>
	                      <div><p className="text-xs font-medium text-content-muted">Saldo al cierre</p><p className="font-bold text-gray-950">{formatCurrency(cashBalance?.saldo ?? 0, moneda)}</p></div>
	                    </div>
	                  </div>
	                  <div data-testid="dashboard-net-result" className="col-span-2 mt-1 border-t border-gray-200 pt-3">
	                    <p className="text-xs font-medium text-content-muted">Honorarios devengados / gastos por caja</p>
	                    <p className={`text-xl font-black ${metrics.utilidadNeta < 0 ? "text-status-danger" : "text-status-success"}`}>{formatCurrency(metrics.utilidadNeta, moneda)}</p>
	                  </div>
	                </div>
	              </article>
	            );
	          })}
	        </div>
	        </section>
	      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
