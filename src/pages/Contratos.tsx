import { useState, useEffect, Fragment } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { contractsService, type Contract, type EstadoContrato } from "../services/contracts.service";
import { formatCurrency } from "../utils/currency";
import { openAuthenticatedFile } from "../services/api";
import { getDocumentActionLabel, isWordDocument } from "../utils/documentFiles";
import {
  PlusIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilSquareIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import NewContractModal from "../components/NewContractModal";
import ContractDetailsModal from "../components/ContractDetailsModal";
import WhatsAppLink from "../components/WhatsAppLink";
import ConfirmationModal from "../components/ConfirmationModal";
import ContractRescissionModal from "../components/ContractRescissionModal";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import ServerPagination from "../components/ServerPagination";
import FilterBar, { persistFilter, readPersistedFilter } from "../components/FilterBar";
import AppSelect from "../components/AppSelect";
import ActiveFilterChips from "../components/ActiveFilterChips";

type ContractListStatus = Exclude<EstadoContrato, 'PAPELERA'>;

const contractListOptions: Array<{ value: ContractListStatus; label: string; description: string }> = [
  { value: 'ACTIVO', label: 'Contratos activos', description: 'Contratos actualmente vigentes' },
  { value: 'PROGRAMADO', label: 'Contratos programados', description: 'Contratos que comienzan próximamente' },
  { value: 'FINALIZADO', label: 'Contratos finalizados', description: 'Contratos cuya vigencia terminó' },
  { value: 'RESCINDIDO', label: 'Contratos rescindidos', description: 'Contratos terminados anticipadamente' }
];

export default function Contratos() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, "contratos.crear");
  const canEdit = hasPermission(user, "contratos.editar");
  const canDelete = hasPermission(user, "contratos.eliminar");
  const canViewFiles = hasPermission(user, "contratos.archivos.ver");
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const alertFilter = searchParams.get('alerta') === 'POR_VENCER' ? 'POR_VENCER' : undefined;
  const urlStatus = contractListOptions.some(option => option.value === searchParams.get('estado'))
    ? searchParams.get('estado') as ContractListStatus
    : 'ACTIVO';
  const [contractsList, setContractsList] = useState<Contract[]>([]);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? readPersistedFilter("contratos"));
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') ?? readPersistedFilter("contratos"));
  const [currentPage, setCurrentPage] = useState(1);
  const [totalContracts, setTotalContracts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [, setIsLoading] = useState(true);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<number | null>(null);
  const [contractToRescind, setContractToRescind] = useState<Contract | null>(null);

  const [statusFilter, setStatusFilter] = useState<ContractListStatus>(alertFilter ? 'ACTIVO' : urlStatus);

  useEffect(() => {
    persistFilter("contratos", searchTerm);
    if (location.state?.openNewContractModal && canCreate) {
      setEditingContract(null);
      setRenewingContract(null);
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, canCreate, searchTerm]);

  useEffect(() => {
    const nextSearch = searchParams.get('q');
    if (nextSearch !== null && nextSearch !== searchTerm) {
      setSearchTerm(nextSearch);
      setDebouncedSearch(nextSearch);
    }
    setStatusFilter(alertFilter ? 'ACTIVO' : urlStatus);
  }, [searchParams, alertFilter, urlStatus]);

  useEffect(() => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      if (searchTerm.trim()) next.set('q', searchTerm.trim());
      else next.delete('q');
      return next;
    }, { replace: true });
  }, [searchTerm, setSearchParams]);

  useEffect(() => {
    if (!alertFilter) return;
    setStatusFilter('ACTIVO');
    setCurrentPage(1);
  }, [alertFilter]);

  const updateStatusFilter = (nextStatus: ContractListStatus, clearAlert = false) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      if (nextStatus === 'ACTIVO') next.delete('estado');
      else next.set('estado', nextStatus);
      if (clearAlert) next.delete('alerta');
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    refreshData(debouncedSearch, currentPage, controller.signal);
    return () => controller.abort();
  }, [debouncedSearch, currentPage, statusFilter, alertFilter]);

  const refreshData = async (
    searchQuery: string = debouncedSearch,
    page: number = currentPage,
    signal?: AbortSignal,
    requestedStatus: ContractListStatus = statusFilter,
    requestedAlert: 'POR_VENCER' | undefined = alertFilter
  ) => {
    setIsLoading(true);
    try {
      const response = await contractsService.getAll({ search: searchQuery, page, limit: 10, status: requestedStatus, alert: requestedAlert, signal });
      setContractsList(response.data);
      setTotalContracts(response.meta.total);
      setTotalPages(response.meta.totalPages);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error("Error loading contracts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const itemsPerPage = 10;

  const currentContracts = contractsList;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Helper to format address
  const formatAddress = (propiedad: Contract["propiedad"]) => {
    let addr = propiedad.direccion;
    if (propiedad.piso) addr += ` - Piso ${propiedad.piso}`;
    if (propiedad.departamento) addr += ` ${propiedad.departamento}`;
    return addr;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [renewingContract, setRenewingContract] = useState<Contract | null>(null);

  const handleEdit = (contract: Contract) => {
    setRenewingContract(null);
    setEditingContract(contract);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContract(null);
    setRenewingContract(null);
  };

  const handleSaveContract = async (data: any) => {
    try {
      setIsLoading(true);
      let savedStatus = statusFilter;

      const formData = new FormData();
      formData.append('fechaInicio', data.startDate);
      formData.append('fechaFin', data.endDate);
      formData.append('fechaActualizacion', data.updateDate);
      formData.append('observaciones', data.observations || '');
      formData.append('montoAlquiler', data.montoAlquiler);
      formData.append('moneda', data.moneda || 'ARS');
      formData.append('montoHonorarios', data.montoHonorarios || '0');
      formData.append('porcentajeHonorarios', data.porcentajeHonorarios || '');
      formData.append('pagaHonorarios', data.pagaHonorarios || 'INQUILINO');
      formData.append('diaVencimiento', data.diaVencimiento || '10');
      formData.append('porcentajeActualizacion', data.porcentajeActualizacion || '');
      formData.append('tipoAjuste', data.tipoAjuste || '');
      formData.append('administrado', data.administrado.toString());
      formData.append('requiereActualizacion', data.requiereActualizacion.toString());
      if (data.contratoAnteriorId) formData.append('contratoAnteriorId', String(data.contratoAnteriorId));
      if (data.file) {
        formData.append('pdf', data.file);
        if (data.observacionDocumento?.trim()) {
          formData.append('observacionDocumento', data.observacionDocumento.trim());
        }
      }

      if (editingContract) {
        // Update Logic
        formData.append('version', String(editingContract.version));
        const contract = await contractsService.update(editingContract.id, formData);
        if (contract.estado !== 'PAPELERA') savedStatus = contract.estado;

        // Upload additional files if any
        if (data.additionalFiles && data.additionalFiles.length > 0) {
          for (const file of data.additionalFiles) {
            await contractsService.addAttachment(editingContract.id, file, undefined, data.tipoArchivosAdicionales);
          }
        }

        toast.success("Contrato actualizado correctamente");
      } else {
        // Create Logic
        if (data.propiedadId) {
          formData.append('propiedadId', data.propiedadId.toString());
        }
        if (data.propiedad) {
          formData.append('propiedad', JSON.stringify(data.propiedad));
        }
        formData.append('propietarios', JSON.stringify(data.propietarios));
        formData.append('inquilinos', JSON.stringify(data.inquilinos));

        if (data.honorarioInicial) {
            formData.append('honorarioInicial', data.honorarioInicial.toString());
        }
        if (data.honorarioInicialMetodoPago) {
            formData.append('honorarioInicialMetodoPago', data.honorarioInicialMetodoPago);
        }

        const contract = await contractsService.create(formData);

        // Upload additional files
        if (data.additionalFiles && data.additionalFiles.length > 0) {
          for (const file of data.additionalFiles) {
            await contractsService.addAttachment(contract.id, file, undefined, data.tipoArchivosAdicionales);
          }
        }

        if (contract.estado !== 'PAPELERA') {
          savedStatus = contract.estado;
        }
        toast.success("Contrato creado correctamente");
      }

      updateStatusFilter(savedStatus);
      setCurrentPage(1);
      await refreshData(debouncedSearch, 1, undefined, savedStatus);
      handleCloseModal();
    } catch (error: any) {
      console.error("Error al guardar el contrato:", error);
      toast.error(error.message || "Hubo un error al guardar el contrato. Por favor, intente nuevamente.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleViewDetails = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDetailsModalOpen(true);
  };

  const handleRenewContract = (contract: Contract) => {
    setIsDetailsModalOpen(false);
    setEditingContract(null);
    setRenewingContract(contract);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setContractToDelete(id);
    setIsDetailsModalOpen(false); // Close details modal if open
    setIsDeleteModalOpen(true);
  };

  const handleRescission = async ({ motivo, fechaRescision }: { motivo: string; fechaRescision: string }) => {
    if (!contractToRescind) return;
    await contractsService.rescindir(contractToRescind.id, { motivo, fechaRescision, version: contractToRescind.version });
    toast.success('Contrato rescindido correctamente');
    setIsDetailsModalOpen(false);
    await refreshData(debouncedSearch);
  };

  const contractStatusBadge = (estado: Contract['estado']) => {
    const styles = {
      PROGRAMADO: 'bg-blue-50 text-blue-700 border-blue-200',
      ACTIVO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      FINALIZADO: 'bg-gray-100 text-gray-700 border-gray-200',
      RESCINDIDO: 'bg-orange-50 text-orange-700 border-orange-200',
      PAPELERA: 'bg-red-50 text-red-700 border-red-200'
    };
    const labels = { PROGRAMADO: 'PROGRAMADO', ACTIVO: 'ACTIVO', FINALIZADO: 'FINALIZADO', RESCINDIDO: 'RESCINDIDO', PAPELERA: 'PAPELERA' };
    return <span className={`text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded border ${styles[estado]}`}>{labels[estado]}</span>;
  };

  const selectedList = contractListOptions.find(option => option.value === statusFilter)!;


  const confirmDelete = async () => {
    if (contractToDelete) {
      try {
        await contractsService.delete(contractToDelete);
        toast.success("Contrato eliminado correctamente");
        refreshData(debouncedSearch);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo mover el contrato a la papelera");
      } finally {
        setContractToDelete(null);
      }
    }
  };


  const handleOpenContractFile = async (path: string | null) => {
    if (path) {
      try {
        const action = await openAuthenticatedFile(path);
        if (action === 'downloaded' && isWordDocument(path)) {
          toast.success("El documento Word se descargó correctamente");
        }
      } catch (error) {
        toast.error("No se pudo abrir el archivo");
      }
    } else {
      toast.error("Este contrato no tiene un archivo asociado.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedList.label}
          </h1>
          <p className="text-sm text-content-muted">
            {alertFilter ? 'Mostrando contratos activos que vencen dentro de los próximos 60 días.' : selectedList.description}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <AppSelect
            ariaLabel="Filtrar contratos por estado"
            value={statusFilter}
            onChange={(value) => {
              updateStatusFilter(value as ContractListStatus, Boolean(alertFilter));
              setCurrentPage(1);
            }}
            options={contractListOptions}
            className="w-full sm:w-64"
          />
          {canCreate && (
            <button
              onClick={() => {
                setEditingContract(null);
                setRenewingContract(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium cursor-pointer"
            >
              <PlusIcon className="w-5 h-5" />
              Nuevo contrato
            </button>
          )}
        </div>
      </div>

      <NewContractModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveContract}
        editingContract={editingContract}
        renewingContract={renewingContract}
      />

      <ContractDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        contract={selectedContract}
        onDelete={handleDelete}
        onRescind={contract => setContractToRescind(contract)}
        onRenew={canCreate ? handleRenewContract : undefined}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Contrato"
        message="Solo los contratos sin actividad financiera ni obligaciones pendientes pueden ir a la papelera. Si tuvo movimientos, usá la rescisión para conservar el historial."
        confirmText="Mover a papelera"
        type="danger"
      />

      <ContractRescissionModal
        isOpen={Boolean(contractToRescind)}
        contractLabel={contractToRescind ? formatAddress(contractToRescind.propiedad) : ''}
        onClose={() => setContractToRescind(null)}
        onConfirm={handleRescission}
      />

      <FilterBar query={searchTerm} onQueryChange={value => { setSearchTerm(value); setCurrentPage(1); }} onClear={() => { setSearchTerm(""); updateStatusFilter('ACTIVO', true); setCurrentPage(1); }} resultCount={totalContracts} placeholder="Buscar por dirección, propietario, inquilino o teléfono..." />
      <ActiveFilterChips filters={[
        ...(searchTerm ? [{ key: 'q', label: `Búsqueda: ${searchTerm}`, onRemove: () => setSearchTerm('') }] : []),
        ...(statusFilter !== 'ACTIVO' ? [{ key: 'estado', label: `Estado: ${contractListOptions.find(option => option.value === statusFilter)?.label || statusFilter}`, onRemove: () => updateStatusFilter('ACTIVO') }] : []),
        ...(alertFilter ? [{ key: 'alerta', label: 'Próximos a vencer', onRemove: () => updateStatusFilter('ACTIVO', true) }] : [])
      ]} onClearAll={() => { setSearchTerm(''); updateStatusFilter('ACTIVO', true); }} />

      {/* Contenedor Principal Tablas/Tarjetas */}
      <div className="lg:bg-white lg:rounded-xl lg:shadow-sm lg:border lg:border-gray-200 min-h-[400px] flex flex-col">
        {/* VISTA DESKTOP */}
        <div className="relative hidden overflow-x-auto rounded-t-xl 2xl:block">
          <p className="sr-only">Deslizá horizontalmente para ver más columnas.</p>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 z-10 bg-gray-50 whitespace-nowrap">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-content-muted uppercase tracking-wider"
                >
                  Inmueble
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-content-muted uppercase tracking-wider"
                >
                  Inquilino
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-content-muted uppercase tracking-wider"
                >
                  Propietario
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-content-muted uppercase tracking-wider"
                >
                  Contacto Inquilino
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-content-muted uppercase tracking-wider"
                >
                  Contacto Propietario
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-content-muted uppercase tracking-wider"
                >
                  Alquiler
                </th>
                <th scope="col" className="sticky right-0 z-20 bg-gray-50 px-6 py-3 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">
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
                      <div className="max-w-64 truncate text-sm font-medium text-gray-900" title={formatAddress(contract.propiedad)}>
                        {formatAddress(contract.propiedad)}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {contractStatusBadge(contract.estado)}
                        <div className={`text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded border ${contract.administrado ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {contract.administrado ? 'ADMINISTRADO' : 'GESTIÓN ÚNICA'}
                        </div>
                      </div>
                   </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="max-w-52 truncate text-sm text-gray-900" title={contract.inquilinos.find(i => i.esPrincipal)?.persona.nombreCompleto || "Sin inquilino"}>
                        {contract.inquilinos.find(i => i.esPrincipal)?.persona.nombreCompleto || "Sin inquilino"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="max-w-52 truncate text-sm text-gray-900" title={contract.propietarios.find(p => p.esPrincipal)?.persona.nombreCompleto || "Sin propietario"}>
                        {contract.propietarios.find(p => p.esPrincipal)?.persona.nombreCompleto || "Sin propietario"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-content-muted">
                        <WhatsAppLink phone={contract.inquilinos.find(i => i.esPrincipal)?.persona.telefono || ""} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-content-muted">
                        <WhatsAppLink phone={contract.propietarios.find(p => p.esPrincipal)?.persona.telefono || ""} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {formatCurrency(contract.montoAlquiler, contract.moneda)}
                      </div>
                    </td>

                    <td className="sticky right-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">
                      <Menu as="div" className="inline-block text-left">
                        <div>
                          <MenuButton aria-label="Acciones del contrato" className="inline-flex h-11 w-11 items-center justify-center text-gray-600 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                            <EllipsisVerticalIcon className="w-5 h-5" />
                          </MenuButton>
                        </div>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <MenuItems 
                            anchor="bottom end"
                            className="z-[100] w-52 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none divide-y divide-gray-50 overflow-hidden border border-gray-100 [--anchor-gap:8px]"
                          >
                            <div className="py-1">
                              <MenuItem>
                                {({ focus }) => (
                                  <button
                                    onClick={() => handleViewDetails(contract)}
                                    className={`${focus ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                                      } group flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors`}
                                  >
                                    <EyeIcon className="w-4 h-4" />
                                    Ver detalles
                                  </button>
                                )}
                              </MenuItem>
                              {canViewFiles && (
                              <MenuItem>
                                {({ focus }) => (
                                  <button
                                    onClick={() => handleOpenContractFile(contract.rutaArchivoContrato)}
                                    className={`${focus ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                                      } group flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors`}
                                  >
                                    <DocumentTextIcon className="w-4 h-4" />
                                    {getDocumentActionLabel(contract.rutaArchivoContrato)} contrato
                                  </button>
                                )}
                              </MenuItem>
                              )}
                            </div>
                            {canEdit && <div className="py-1">
                              <MenuItem>
                                {({ focus }) => (
                                  <button
                                    onClick={() => handleEdit(contract)}
                                    className={`${focus ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                      } group flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors`}
                                  >
                                    <PencilSquareIcon className="w-4 h-4" />
                                    Editar
                                  </button>
                                )}
                              </MenuItem>
                              {(contract.estado === 'ACTIVO' || contract.estado === 'PROGRAMADO') && <>
                                <MenuItem>
                                  {({ focus }) => (
                                    <button
                                      onClick={() => setContractToRescind(contract)}
                                      className={`${focus ? 'bg-orange-50 text-orange-700' : 'text-gray-700'} group flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors`}
                                    >
                                      <NoSymbolIcon className="w-4 h-4" />
                                      Rescindir contrato
                                    </button>
                                  )}
                                </MenuItem>
                              </>}
                            </div>}
                            {canDelete && <div className="py-1">
                              <MenuItem>
                                {({ focus }) => (
                                  <button
                                    onClick={() => handleDelete(contract.id)}
                                    className={`${focus ? 'bg-red-50 text-red-700' : 'text-status-danger'
                                      } group flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors`}
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                    Eliminar
                                  </button>
                                )}
                              </MenuItem>
                            </div>}
                          </MenuItems>
                        </Transition>
                      </Menu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-content-muted"
                  >
                    No se encontraron contratos que coincidan con tu búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* VISTA MOBILE */}
        <div className="space-y-4 2xl:hidden">
            {currentContracts.map((contract) => (
                <div key={contract.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                             <div className="bg-indigo-50 p-2 rounded-lg shrink-0">
                                  <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                             </div>
                             <div>
                                  <p className="font-bold text-gray-900 leading-tight">{formatAddress(contract.propiedad)}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {contractStatusBadge(contract.estado)}
                                    <p className={`text-xs font-bold uppercase mt-1 inline-block px-1.5 py-0.5 rounded border ${contract.administrado ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                      {contract.administrado ? 'ADMINISTRADO' : 'GESTIÓN ÚNICA'}
                                    </p>
                                  </div>
                             </div>
                        </div>
                        <Menu as="div" className="relative">
                            <MenuButton aria-label="Acciones del contrato" className="flex h-11 w-11 items-center justify-center text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-all duration-200 cursor-pointer focus:outline-none">
                                <EllipsisVerticalIcon className="w-6 h-6" />
                            </MenuButton>
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <MenuItems 
                                  anchor="bottom end"
                                  className="z-[100] w-60 origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none divide-y divide-gray-50 overflow-hidden border border-gray-100 [--anchor-gap:8px]"
                                >
                                    <div className="py-1">
                                        <MenuItem>
                                            {({ focus }) => (
                                                <button
                                                    onClick={() => handleViewDetails(contract)}
                                                    className={`${focus ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'} group flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors`}
                                                >
                                                    <EyeIcon className="w-5 h-5 text-indigo-500" />
                                                    Ver detalles
                                                </button>
                                            )}
                                        </MenuItem>
                                        {canViewFiles && (
                                        <MenuItem>
                                            {({ focus }) => (
                                                <button
                                                    onClick={() => handleOpenContractFile(contract.rutaArchivoContrato)}
                                                    className={`${focus ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'} group flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors`}
                                                >
                                                    <DocumentTextIcon className="w-5 h-5 text-indigo-500" />
                                                    {getDocumentActionLabel(contract.rutaArchivoContrato)} contrato
                                                </button>
                                            )}
                                        </MenuItem>
                                        )}
                                    </div>
                                    {canEdit && <div className="py-1">
                                        <MenuItem>
                                            {({ focus }) => (
                                                <button
                                                    onClick={() => handleEdit(contract)}
                                                    className={`${focus ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} group flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors`}
                                                >
                                                    <PencilSquareIcon className="w-5 h-5 text-blue-500" />
                                                    Editar contrato
                                                </button>
                                            )}
                                        </MenuItem>
                                        {(contract.estado === 'ACTIVO' || contract.estado === 'PROGRAMADO') && <>
                                          <MenuItem>
                                            {({ focus }) => (
                                              <button onClick={() => setContractToRescind(contract)} className={`${focus ? 'bg-orange-50 text-orange-700' : 'text-gray-700'} group flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors`}>
                                                <NoSymbolIcon className="w-5 h-5 text-orange-600" />
                                                Rescindir contrato
                                              </button>
                                            )}
                                          </MenuItem>
                                        </>}
                                    </div>}
                                    {canDelete && <div className="py-1">
                                        <MenuItem>
                                            {({ focus }) => (
                                                <button
                                                    onClick={() => handleDelete(contract.id)}
                                                    className={`${focus ? 'bg-red-50 text-red-700' : 'text-status-danger'} group flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors`}
                                                >
                                                    <TrashIcon className="w-5 h-5 text-red-500" />
                                                    Eliminar
                                                </button>
                                            )}
                                        </MenuItem>
                                    </div>}
                                </MenuItems>
                            </Transition>
                        </Menu>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-sm flex flex-col gap-2 mt-1">
                         <div className="flex justify-between items-center bg-white p-2 border border-gray-100 rounded-md">
                             <div className="flex flex-col">
                                 <span className="text-xs uppercase font-bold text-gray-600">Inquilino</span>
                                 <span className="font-semibold text-gray-700">{contract.inquilinos.find(i => i.esPrincipal)?.persona.nombreCompleto || "N/A"}</span>
                             </div>
                             <WhatsAppLink phone={contract.inquilinos.find(i => i.esPrincipal)?.persona.telefono || ""} />
                         </div>
                         <div className="flex justify-between items-center bg-white p-2 border border-gray-100 rounded-md">
                             <div className="flex flex-col">
                                 <span className="text-xs uppercase font-bold text-gray-600">Propietario</span>
                                 <span className="font-semibold text-gray-700">{contract.propietarios.find(p => p.esPrincipal)?.persona.nombreCompleto || "N/A"}</span>
                             </div>
                             <WhatsAppLink phone={contract.propietarios.find(p => p.esPrincipal)?.persona.telefono || ""} />
                         </div>
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-100">
                         <span className="text-xs uppercase font-bold text-content-muted tracking-wider">Alquiler</span>
                         <span className="text-lg font-black text-gray-900">{formatCurrency(contract.montoAlquiler, contract.moneda)}</span>
                    </div>
                </div>
            ))}
            {currentContracts.length === 0 && (
                <div className="bg-white p-8 rounded-xl border border-gray-100 text-center text-sm text-content-muted shadow-sm">
                    No se encontraron contratos que coincidan con tu búsqueda.
                </div>
            )}
        </div>

        {/* Pagination Footer */}
        <ServerPagination page={currentPage} totalPages={totalPages} total={totalContracts} pageSize={itemsPerPage} currentCount={currentContracts.length} onPageChange={handlePageChange} />
      </div>
    </div>
  );
}
