import { useState, useEffect } from "react";
import { TrashIcon, InformationCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import { contractsService, type Contract } from "../services/contracts.service";
import ConfirmationModal from "../components/ConfirmationModal";

export interface TrashedContract extends Contract {
  daysUntilDeletion: number;
}

export default function Papelera() {
  const [trashedContracts, setTrashedContracts] = useState<TrashedContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<number | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const data = await contractsService.getAll();
      const trashed = data
        .filter(c => c.estado === 'PAPELERA')
        .map(c => ({
          ...c,
          daysUntilDeletion: 90 // Mocking this for now as backend might not provide it
        }));
      setTrashedContracts(trashed);
    } catch (error) {
      console.error("Error loading trashed contracts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await contractsService.restore(id);
      refreshData();
    } catch (error) {
      alert("Error al restaurar el contrato");
    }
  };

  const handlePermanentDelete = (id: number) => {
    setContractToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmPermanentDelete = async () => {
    if (contractToDelete) {
      try {
        await contractsService.permanentlyDelete(contractToDelete);
        refreshData();
      } catch (error) {
        alert("Error al eliminar el contrato permanentemente");
      } finally {
        setContractToDelete(null);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-600 mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-red-100 p-2 rounded-lg">
            <TrashIcon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Papelera de Contratos</h1>
            <p className="text-gray-600 text-xs">Contratos eliminados y archivados</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-10 text-gray-500">Cargando...</div>
      ) : trashedContracts.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-lg shadow-sm p-10 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrashIcon className="w-8 h-8 text-gray-400" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">La papelera está vacía</h2>
            <p className="text-gray-600 text-sm mb-5">
              No hay contratos eliminados. Los contratos que elimines aparecerán aquí y podrás restaurarlos o eliminarlos permanentemente.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 text-left">
              <div className="flex gap-2.5">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1 text-sm">Información</h3>
                  <p className="text-xs text-blue-800">
                    Los contratos eliminados se conservan por 90 días antes de ser eliminados permanentemente del sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Trashed Contracts List */
        <div className="grid gap-4">
          {trashedContracts.map((contract) => (
            <div key={contract.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">{contract.propiedad.direccion}</h3>
                <p className="text-sm text-gray-500">
                  Inquilino: {contract.inquilino.nombreCompleto} | Propietario: {contract.propietario.nombreCompleto}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-3 py-1 rounded-full text-xs font-medium">
                  <ClockIcon className="w-4 h-4" />
                  <span>Se elimina en {contract.daysUntilDeletion} días</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestore(contract.id)}
                    className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200"
                  >
                    RESTAURAR
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(contract.id)}
                    className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                  >
                    ELIMINAR
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmPermanentDelete}
        title="Eliminar Definitivamente"
        message="¿Estás seguro de que deseas eliminar este contrato permanentemente? Esta acción NO se puede deshacer y se perderán todos los datos asociados."
        confirmText="Eliminar Permanentemente"
        type="danger"
      />
    </div>
  );
}

