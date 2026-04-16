import { useState, useEffect } from "react";
import { contractsService, getDaysLeft, type Contract } from "../services/contracts.service";
import ContractCard from "../components/ContractCard";
import PaginatedList from "../components/PaginatedList";
import ContractDetailsModal from "../components/ContractDetailsModal";
import UpdateContractModal from "../components/UpdateContractModal";
import {
  CheckCircleIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ClockIcon,
  ArrowPathIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { reportesService } from "../services/reportes.service";
import { useAuth } from "../context/AuthContext";

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
  contratosActivos: number;
  recaudadoTotal: number;
  gananciaBruta: number;
  gastosAgencia: number;
  utilidadNeta: number;
  morosidad: number;
  fondoCustodia: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Home() {
  const { user } = useAuth();
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
  }, []);

  const refreshData = async () => {
    try {
      setLoadingKpis(true);
      const [contractsData, reportData, alertsData] = await Promise.all([
        contractsService.getAll() as Promise<Contract[]>,
        reportesService.getDashboardReport(),
        contractsService.getAlertas(),
      ]);

      setAllContracts(contractsData);

      // --- Listas de alertas (desde el backend) ---
      const alerts = (alertsData || []) as Contract[];

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
        .filter(c => c.fechaProximaActualizacion && getDaysLeft(c.fechaProximaActualizacion) <= 30 && getDaysLeft(c.fechaProximaActualizacion) >= 0)
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

      setKpis({
        contratosActivos: reportData.contratos.activos,
        recaudadoTotal: reportData.finanzas.recaudadoTotal,
        gananciaBruta: reportData.finanzas.gananciaBruta,
        gastosAgencia: reportData.finanzas.gastosAgencia,
        utilidadNeta: reportData.finanzas.utilidadNeta,
        morosidad: reportData.finanzas.morosidad,
        fondoCustodia: reportData.finanzas.fondoCustodia
      });
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
    const contract = allContracts.find((c) => c.id === contractId);
    if (contract) {
        setSelectedContractForUpdate(contract);
        setIsUpdateModalOpen(true);
    }
  };

  const handleDeleteContract = async (contractId: number) => {
    if (window.confirm("¿Seguro que desea eliminar contrato?")) {
      try {
        await contractsService.delete(contractId);
        refreshData();
        setIsDetailsModalOpen(false);
        setSelectedContract(null);
      } catch (error) {
        alert("Error al eliminar el contrato");
      }
    }
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setTimeout(() => setSelectedContract(null), 300);
  };

  const kpiCards = [
    {
      label: "Contratos Activos",
      value: kpis?.contratosActivos ?? "-",
      icon: DocumentTextIcon,
      color: "bg-indigo-50 text-indigo-600",
      iconBg: "bg-indigo-100",
    },
    {
      label: "Ingresos Brutos",
      value: kpis ? formatCurrency(kpis.recaudadoTotal) : "-",
      icon: BanknotesIcon,
      color: "bg-emerald-50 text-emerald-600",
      iconBg: "bg-emerald-100",
    },
    {
      label: "Ganancia Agencia",
      value: kpis ? formatCurrency(kpis.gananciaBruta) : "-",
      icon: BanknotesIcon,
      color: "bg-violet-50 text-violet-600",
      iconBg: "bg-violet-100",
    },
    {
        label: "Plata Ajena",
        value: kpis ? formatCurrency(kpis.fondoCustodia) : "-",
        icon: BanknotesIcon,
        color: "bg-amber-50 text-amber-600",
        iconBg: "bg-amber-100",
      },
    {
      label: "Morosidad",
      value: kpis ? `${kpis.morosidad.toFixed(1)}%` : "-",
      icon: ChartBarIcon,
      color: kpis && kpis.morosidad > 10 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600",
      iconBg: kpis && kpis.morosidad > 10 ? "bg-red-100" : "bg-gray-100",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Panel de {user?.inmobiliaria?.nombre || "Gestión"}
          </h1>
          <p className="text-gray-500 text-sm">Resumen financiero y alertas del mes actual.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-xl p-4 flex flex-col gap-3 shadow-sm border border-gray-100 ${card.color}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                {loadingKpis ? (
                  <div className="h-7 w-16 bg-current opacity-10 rounded animate-pulse mb-1" />
                ) : (
                  <p className="text-2xl font-bold leading-tight">{card.value}</p>
                )}
                <p className="text-xs font-medium opacity-70 leading-tight">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resultado Neto Highlight */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="relative">
          <h3 className="text-sm font-black uppercase tracking-widest mb-2 opacity-80">Resultado Neto del Mes</h3>
          <p className="text-6xl font-black tracking-tighter">
            {kpis ? formatCurrency(kpis.utilidadNeta) : "-"}
          </p>
          <div className="flex gap-4 mt-4">
            <div className="bg-white/10 px-3 py-1 rounded-lg">
                <p className="text-[10px] font-bold opacity-70 uppercase">Ganancia Bruta</p>
                <p className="text-lg font-bold">{kpis ? formatCurrency(kpis.gananciaBruta) : "-"}</p>
            </div>
            <div className="bg-white/10 px-3 py-1 rounded-lg">
                <p className="text-[10px] font-bold opacity-70 uppercase">Gastos y Sueldos</p>
                <p className="text-lg font-bold text-red-200">{kpis ? formatCurrency(kpis.gastosAgencia) : "-"}</p>
            </div>
          </div>
        </div>
        <div className="hidden md:block">
            <ChartBarIcon className="w-32 h-32 opacity-10" />
        </div>
      </div>

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
                <CheckCircleIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
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
                action={
                    <button
                        onClick={(e) => handleOpenUpdateModal(e, (contract as any).id)}
                        className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-[10px] font-bold hover:bg-orange-700 transition-colors"
                    >
                        Actualizar
                    </button>
                }
              />
            )}
            badgeColor="orange"
            emptyState={
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <CheckCircleIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
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
