import { useState, useEffect } from "react";
import { contractsService, type Contract } from "../services/contracts.service";
import { getFileUrl } from "../services/api";
import { ownersService } from "../services/owners.service";
import { tenantsService } from "../services/tenants.service";
import { propertiesService } from "../services/properties.service";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  DocumentTextIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import NewContractModal from "../components/NewContractModal";
import ContractDetailsModal from "../components/ContractDetailsModal";
import WhatsAppLink from "../components/WhatsAppLink";
import ConfirmationModal from "../components/ConfirmationModal";
import { toast } from "react-hot-toast";


export default function Contratos() {
  const [contractsList, setContractsList] = useState<Contract[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [, setIsLoading] = useState(true);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<number | null>(null);

  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const data = await contractsService.getAll();
      setContractsList(data);
    } catch (error) {
      console.error("Error loading contracts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const itemsPerPage = 10;

  // Helper to check if expired
  const isExpired = (dateString: string) => {
    const today = new Date();
    const targetDate = new Date(dateString);
    return targetDate < today;
  };

  // Filter logic
  const filteredContracts = contractsList
    .filter((contract) => contract.estado === "ACTIVO")
    .filter((contract) => {
      const expired = isExpired(contract.fechaFin);
      return showExpired ? expired : !expired;
    })
    .filter((contract) => {
      const searchLower = searchTerm.toLowerCase();
      const address = contract.propiedad.direccion.toLowerCase();
      const owner = contract.propietario.nombreCompleto.toLowerCase();
      const tenant = contract.inquilino.nombreCompleto.toLowerCase();
      const ownerPhone = contract.propietario.telefono.toLowerCase();
      const tenantPhone = contract.inquilino.telefono.toLowerCase();

      return (
        address.includes(searchLower) ||
        owner.includes(searchLower) ||
        tenant.includes(searchLower) ||
        ownerPhone.includes(searchLower) ||
        tenantPhone.includes(searchLower)
      );
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const currentContracts = filteredContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setActiveMenuId(null); // Close any open menus
    }
  };

  const toggleMenu = (id: number) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // Helper to format address
  const formatAddress = (propiedad: Contract["propiedad"]) => {
    let addr = propiedad.direccion;
    if (propiedad.piso) addr += ` - Piso ${propiedad.piso}`;
    if (propiedad.departamento) addr += ` ${propiedad.departamento}`;
    return addr;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveContract = async (data: any) => {
    try {
      setIsLoading(true);

      // 1. Create Owner
      const owner = await ownersService.create({
        nombreCompleto: data.ownerName,
        telefono: data.ownerPhone,
        email: null // Modal doesn't have email yet
      });

      // 2. Create Property
      const property = await propertiesService.create({
        direccion: data.address,
        piso: data.floor || null,
        departamento: data.unit || null,
        propietarioId: owner.id
      });

      // 3. Create Tenant
      const tenant = await tenantsService.create({
        nombreCompleto: data.tenantName,
        telefono: data.tenantPhone,
        email: null // Modal doesn't have email yet
      });

      // 4. Create Contract
      const formData = new FormData();
      formData.append('fechaInicio', data.startDate);
      formData.append('fechaFin', data.endDate);
      formData.append('fechaActualizacion', data.updateDate);
      formData.append('observaciones', data.observations || '');
      formData.append('propiedadId', property.id.toString());
      formData.append('propietarioId', owner.id.toString());
      formData.append('inquilinoId', tenant.id.toString());

      if (data.file) {
        formData.append('pdf', data.file);
      }

      const contract = await contractsService.create(formData);

      // 5. Upload additional files
      if (data.additionalFiles && data.additionalFiles.length > 0) {
        for (const file of data.additionalFiles) {
          await contractsService.addAttachment(contract.id, file);
        }
      }

      toast.success("Contrato creado correctamente");
      await refreshData();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error al guardar el contrato:", error);
      toast.error("Hubo un error al guardar el contrato. Por favor, intente nuevamente.");
    } finally {

      setIsLoading(false);
    }
  };

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleViewDetails = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDetailsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDelete = (id: number) => {
    setContractToDelete(id);
    setIsDetailsModalOpen(false); // Close details modal if open
    setIsDeleteModalOpen(true);
  };


  const confirmDelete = async () => {
    if (contractToDelete) {
      try {
        await contractsService.delete(contractToDelete);
        toast.success("Contrato eliminado correctamente");
        refreshData();
        setActiveMenuId(null);
      } catch (error) {

        toast.error("Error al eliminar el contrato");
      } finally {

        setContractToDelete(null);
      }
    }
  };


  const handleViewPdf = (path: string | null) => {
    if (path) {
      window.open(getFileUrl(path), "_blank");
    } else {
      alert("Este contrato no tiene un archivo PDF asociado.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {showExpired ? "Contratos Vencidos" : "Contratos"}
          </h1>
          <p className="text-sm text-gray-500">
            {showExpired
              ? "Historial de contratos que han finalizado su vigencia"
              : "Gestión de todos los contratos activos"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowExpired(!showExpired);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showExpired
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              }`}
          >
            {showExpired ? "Ver Contratos Activos" : "Ver Contratos Vencidos"}
          </button>
          {!showExpired && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium cursor-pointer"
            >
              <PlusIcon className="w-5 h-5" />
              Nuevo Contrato
            </button>
          )}
        </div>
      </div>

      <NewContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveContract}
      />

      <ContractDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        contract={selectedContract}
        onDelete={handleDelete}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Contrato"
        message="¿Estás seguro de que deseas eliminar este contrato? El contrato se moverá a la papelera y podrá ser recuperado más tarde."
        confirmText="Eliminar"
        type="danger"
      />

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por dirección, propietario, inquilino o teléfono..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Inmueble
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Inquilino
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Propietario
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Contacto Inquilino
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Contacto Propietario
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentContracts.length > 0 ? (
                currentContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatAddress(contract.propiedad)}
                      </div>
                      {showExpired && (
                        <div className="text-xs text-red-600 font-medium mt-1 bg-red-50 inline-block px-2 py-0.5 rounded border border-red-100">
                          Venció el {new Date(contract.fechaFin).toLocaleDateString("es-AR")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {contract.inquilino.nombreCompleto}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {contract.propietario.nombreCompleto}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        <WhatsAppLink phone={contract.inquilino.telefono} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        <WhatsAppLink phone={contract.propietario.telefono} />
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                      <button
                        onClick={() => toggleMenu(contract.id)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <EllipsisVerticalIcon className="w-5 h-5" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === contract.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 py-1">
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                              onClick={() => handleViewDetails(contract)}
                            >
                              <EyeIcon className="w-4 h-4 text-gray-500" />
                              Ver detalles
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                              onClick={() => {
                                handleViewPdf(contract.rutaPdf);
                                setActiveMenuId(null);
                              }}
                            >
                              <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                              Ver contrato
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                              onClick={() => handleDelete(contract.id)}
                            >
                              <TrashIcon className="w-4 h-4 text-red-500" />
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    No se encontraron contratos que coincidan con tu búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  a{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredContracts.length)}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium">{filteredContracts.length}</span>{" "}
                  resultados
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  {/* Simple page numbers could go here, but for now just prev/next as requested */}
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Siguiente</span>
                    <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
