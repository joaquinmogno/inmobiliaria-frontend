import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Disclosure,
  DisclosureButton,
  DisclosurePanel
} from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { FormEvent } from 'react';
import type { AccessRole, Permission, RoleInput } from '../services/roles.service';
import type { PermissionKey } from '../utils/permissions';

type PermissionGroup = {
  title: string;
  permissions: Permission[];
};

type RoleEditorDialogProps = {
  open: boolean;
  editingRole: AccessRole | null;
  form: RoleInput;
  groups: PermissionGroup[];
  error: string;
  submitting: boolean;
  onClose: () => void;
  onFormChange: (form: RoleInput) => void;
  onTogglePermission: (permission: PermissionKey) => void;
  onSetGroupPermissions: (permissions: PermissionKey[], selected: boolean) => void;
  onSubmit: (event: FormEvent) => void;
};

export default function RoleEditorDialog({
  open,
  editingRole,
  form,
  groups,
  error,
  submitting,
  onClose,
  onFormChange,
  onTogglePermission,
  onSetGroupPermissions,
  onSubmit
}: RoleEditorDialogProps) {
  const totalPermissions = groups.reduce((total, group) => total + group.permissions.length, 0);

  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <DialogPanel className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">
          <header className="shrink-0 border-b border-gray-200 px-4 py-4 sm:px-6">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editingRole ? 'Editar rol' : 'Crear rol'}
            </DialogTitle>
            <p className="mt-1 text-sm text-content-muted">
              Definí los datos del rol y abrí solamente los módulos que necesites configurar.
            </p>
          </header>

          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-bold">
                  Nombre
                  <input
                    required
                    maxLength={80}
                    value={form.nombre}
                    onChange={event => onFormChange({ ...form, nombre: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-xl border border-gray-300 px-3"
                  />
                </label>
                <label className="block text-sm font-bold">
                  Descripción
                  <input
                    maxLength={240}
                    value={form.descripcion || ''}
                    onChange={event => onFormChange({ ...form, descripcion: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-xl border border-gray-300 px-3"
                  />
                </label>
              </div>

              <section aria-labelledby="role-permissions-title">
                <div className="flex flex-col gap-2 rounded-xl bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 id="role-permissions-title" className="font-bold text-indigo-950">Permisos por módulo</h2>
                    <p className="mt-0.5 text-sm text-indigo-900">Las dependencias necesarias se agregan automáticamente.</p>
                  </div>
                  <p className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-status-accent" aria-live="polite">
                    {form.permisos.length} de {totalPermissions} seleccionados
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  {groups.map((group, index) => {
                    const selectedCount = group.permissions.filter(permission => form.permisos.includes(permission.clave)).length;
                    const allSelected = selectedCount === group.permissions.length;
                    const headingId = `role-permission-group-${index}`;

                    return (
                      <Disclosure key={group.title} defaultOpen={index === 0 || selectedCount > 0} as="section" className="rounded-xl border border-gray-200 bg-white">
                        <DisclosureButton className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-gray-50">
                          <span id={headingId} className="min-w-0 flex-1 font-bold text-gray-900">{group.title}</span>
                          <span className="shrink-0 text-xs font-semibold text-content-muted">{selectedCount}/{group.permissions.length}</span>
                          <ChevronDownIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-600 transition-transform group-data-open:rotate-180" />
                        </DisclosureButton>
                        <DisclosurePanel className="border-t border-gray-100 px-4 pb-4 pt-3">
                          <div className="mb-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onSetGroupPermissions(group.permissions.map(permission => permission.clave), !allSelected)}
                              className="min-h-10 rounded-lg bg-indigo-50 px-3 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                            >
                              {allSelected ? 'Limpiar módulo' : 'Seleccionar módulo'}
                            </button>
                          </div>
                          <fieldset className="grid gap-2 sm:grid-cols-2">
                            <legend className="sr-only">Permisos de {group.title}</legend>
                            {group.permissions.map(permission => (
                              <label key={permission.clave} className="flex min-h-10 items-start gap-3 rounded-lg p-2 text-sm hover:bg-gray-50">
                                <input
                                  type="checkbox"
                                  checked={form.permisos.includes(permission.clave)}
                                  onChange={() => onTogglePermission(permission.clave)}
                                  className="mt-0.5 h-5 w-5 shrink-0 rounded"
                                />
                                <span>
                                  <span className="block font-medium text-gray-900">{permission.etiqueta}</span>
                                  {permission.requiere.length > 0 && <span className="block text-xs text-content-muted">Incluye los accesos necesarios</span>}
                                </span>
                              </label>
                            ))}
                          </fieldset>
                        </DisclosurePanel>
                      </Disclosure>
                    );
                  })}
                </div>
              </section>
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-4 font-semibold text-gray-700 hover:bg-gray-100">Cancelar</button>
              <button disabled={submitting} className="min-h-11 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? 'Guardando…' : 'Guardar rol'}
              </button>
            </footer>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
