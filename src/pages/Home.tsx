import { useState, useEffect } from "react";
import { contractsService, getDaysLeft, type Contract } from "../services/contracts.service";
import ContractExpireCard from "../components/ContractExpireCard";
import ContractUpdateCard from "../components/ContractUpdateCard";
import PaginatedList from "../components/PaginatedList";
import ContractDetailsModal from "../components/ContractDetailsModal";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

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
  tenant: string;
  updateDate: string;
  daysLeft: number;
}

export default function Home() {
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expiringList, setExpiringList] = useState<ExpiringContract[]>([]);
  const [updatingList, setUpdatingList] = useState<UpdatingContract[]>([]);
  const [allContracts, setAllContracts] = useState<Contract[]>([]);

  // Load data on mount
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      const data = await contractsService.getAll();
      setAllContracts(data);

      const activeContracts = data.filter(c => c.estado === 'ACTIVO');
      const nonExpiredContracts = activeContracts.filter(c => getDaysLeft(c.fechaFin) >= 0);

      const expiring = nonExpiredContracts
        .map(c => ({
          id: c.id,
          address: c.propiedad.direccion,
          owner: c.propietario.nombreCompleto,
          tenant: c.inquilino.nombreCompleto,
          endDate: c.fechaFin,
          daysLeft: getDaysLeft(c.fechaFin)
        }))
        .filter(c => c.daysLeft < 90)
        .sort((a, b) => a.daysLeft - b.daysLeft);

      const updating = nonExpiredContracts
        .map(c => ({
          id: c.id,
          address: c.propiedad.direccion,
          tenant: c.inquilino.nombreCompleto,
          updateDate: c.fechaProximaActualizacion || c.fechaActualizacion,
          daysLeft: getDaysLeft(c.fechaProximaActualizacion || c.fechaActualizacion)
        }))
        .filter(c => c.daysLeft >= 0 && c.daysLeft < 30)
        .sort((a, b) => a.daysLeft - b.daysLeft);

      setExpiringList(expiring);
      setUpdatingList(updating);
    } catch (error) {
      console.error("Error loading home data:", error);
    }
  };

  const handleContractClick = (contractId: number) => {
    const contract = allContracts.find((c) => c.id === contractId);
    if (contract) {
      setSelectedContract(contract);
      setIsModalOpen(true);
    }
  };

  const handleDeleteContract = async (contractId: number) => {
    if (window.confirm("¿Seguro que desea eliminar contrato?")) {
      try {
        await contractsService.delete(contractId);
        refreshData();
        setIsModalOpen(false);
        setSelectedContract(null);
      } catch (error) {
        alert("Error al eliminar el contrato");
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedContract(null), 300); // Clear after animation
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Contratos por vencer */}
      <PaginatedList
        title="Contratos próximos a vencer"
        items={expiringList}
        renderItem={(contract) => (
          <ContractExpireCard
            key={contract.id}
            contract={contract}
            onClick={() => handleContractClick(contract.id)}
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
        title="Contratos próximos a actualizar"
        items={updatingList}
        renderItem={(contract) => (
          <ContractUpdateCard
            key={contract.id}
            contract={contract}
            onClick={() => handleContractClick(contract.id)}
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

      <ContractDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        contract={selectedContract}
        onDelete={handleDeleteContract}
      />
    </div>
  );
}

