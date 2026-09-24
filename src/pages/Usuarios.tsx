import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EllipsisVerticalIcon, KeyIcon, PencilSquareIcon, PlusIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { usersService, type CreateUserData, type UserType } from '../services/users.service';
import { rolesService, type AccessRole, type Permission, type RoleInput } from '../services/roles.service';
import { type User } from '../services/auth.service';
import { type PermissionKey } from '../utils/permissions';
import ServerPagination from '../components/ServerPagination';
import { requestConfirmation } from '../services/confirmation';
import AppSelect from '../components/AppSelect';
import { formatDateTime } from '../utils/date';
import RoleEditorDialog from '../components/RoleEditorDialog';

const emptyUser = (): CreateUserData => ({ email: '', password: '', nombreCompleto: '', tipo: 'USUARIO', rolId: null });
const emptyRole = (): RoleInput => ({ nombre: '', descripcion: '', permisos: [] });

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<'usuarios' | 'roles'>('usuarios');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [userModal, setUserModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<AccessRole | null>(null);
  const [userForm, setUserForm] = useState<CreateUserData>(emptyUser());
  const [roleForm, setRoleForm] = useState<RoleInput>(emptyRole());
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = currentUser?.tipo === 'ADMIN';
  const activeRoles = useMemo(() => roles.filter(role => role.activo), [roles]);
  const permissionGroups = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of catalog) {
      const existing = groups.get(permission.grupo) || [];
      existing.push(permission);
      groups.set(permission.grupo, existing);
    }
    return [...groups.entries()].map(([title, permissions]) => ({ title, permissions }));
  }, [catalog]);

  const load = async (targetPage = page, targetSearch = search) => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [usersResult, rolesResult, catalogResult] = await Promise.all([
        usersService.getAll(targetPage, 25, targetSearch),
        rolesService.getAll(),
        rolesService.getPermissionCatalog()
      ]);
      setUsers(usersResult.data);
      setTotal(usersResult.meta.total);
      setTotalPages(usersResult.meta.totalPages);
      setRoles(rolesResult);
      setCatalog(catalogResult);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo cargar la gestión de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [page, isAdmin]);

  if (!isAdmin) return <div className="rounded-2xl border border-red-100 bg-white p-8"><h1 className="text-2xl font-bold">Acceso denegado</h1><p className="mt-2 text-content-muted">Solo un Administrador puede gestionar usuarios y roles.</p></div>;

  const openNewUser = () => {
    setEditingUser(null);
    setUserForm(emptyUser());
    setError('');
    setUserModal(true);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      password: '',
      nombreCompleto: user.nombreCompleto || user.fullName,
      tipo: user.tipo,
      rolId: user.rol?.id || null
    });
    setError('');
    setUserModal(true);
  };

  const openPasswordReset = (user: User) => {
    setResetTarget(user);
    setTemporaryPassword('');
    setError('');
  };

  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (userForm.tipo === 'USUARIO' && !userForm.rolId) throw new Error('Seleccioná un rol para el usuario');
      if (editingUser) {
        await usersService.update(editingUser.id, {
          email: userForm.email,
          nombreCompleto: userForm.nombreCompleto,
          tipo: userForm.tipo,
          rolId: userForm.tipo === 'USUARIO' ? userForm.rolId : null
        });
      } else {
        await usersService.create(userForm);
      }
      setUserModal(false);
      await load();
      toast.success(editingUser ? 'Usuario actualizado' : 'Usuario creado con contraseña temporal');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUser = async (target: User) => {
    if (target.id === currentUser?.id) return toast.error('No podés deshabilitar tu propia cuenta');
    const nextActive = !target.activo;
    if (!await requestConfirmation({
      title: nextActive ? 'Habilitar usuario' : 'Deshabilitar usuario',
      message: nextActive ? `¿Habilitar a ${target.fullName}?` : `${target.fullName} perderá acceso y se cerrarán sus sesiones.`,
      confirmText: nextActive ? 'Habilitar' : 'Deshabilitar',
      type: nextActive ? 'info' : 'danger'
    })) return;
    try {
      if (nextActive) await usersService.update(target.id, { activo: true });
      else await usersService.disable(target.id);
      await load();
      toast.success(nextActive ? 'Usuario habilitado' : 'Usuario deshabilitado');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado');
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetTarget) return;
    setSubmitting(true);
    setError('');
    try {
      await usersService.resetPassword(resetTarget.id, temporaryPassword);
      setResetTarget(null);
      setTemporaryPassword('');
      toast.success('Contraseña temporal actualizada y sesiones revocadas');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo restablecer la contraseña');
    } finally { setSubmitting(false); }
  };

  const openNewRole = () => {
    setEditingRole(null);
    setRoleForm(emptyRole());
    setError('');
    setRoleModal(true);
  };

  const openEditRole = (role: AccessRole) => {
    setEditingRole(role);
    setRoleForm({ nombre: role.nombre, descripcion: role.descripcion || '', permisos: role.permisos.map(item => item.clave) });
    setError('');
    setRoleModal(true);
  };

  const togglePermission = (permission: PermissionKey) => {
    setRoleForm(current => {
      const selected = new Set(current.permisos);
      if (selected.has(permission)) {
        selected.delete(permission);
        let removedDependency = true;
        while (removedDependency) {
          removedDependency = false;
          for (const candidate of catalog) {
            if (selected.has(candidate.clave) && candidate.requiere.some(required => !selected.has(required))) {
              selected.delete(candidate.clave);
              removedDependency = true;
            }
          }
        }
      } else {
        const addWithDependencies = (key: PermissionKey) => {
          if (selected.has(key)) return;
          const capability = catalog.find(item => item.clave === key);
          capability?.requiere.forEach(required => addWithDependencies(required));
          selected.add(key);
        };
        addWithDependencies(permission);
      }
      return { ...current, permisos: [...selected] };
    });
  };

  const setGroupPermissions = (permissions: PermissionKey[], enabled: boolean) => {
    setRoleForm(current => {
      const selected = new Set(current.permisos);

      if (enabled) {
        const addWithDependencies = (key: PermissionKey) => {
          if (selected.has(key)) return;
          const capability = catalog.find(item => item.clave === key);
          capability?.requiere.forEach(required => addWithDependencies(required));
          selected.add(key);
        };
        permissions.forEach(addWithDependencies);
      } else {
        permissions.forEach(permission => selected.delete(permission));
        let removedDependency = true;
        while (removedDependency) {
          removedDependency = false;
          for (const candidate of catalog) {
            if (selected.has(candidate.clave) && candidate.requiere.some(required => !selected.has(required))) {
              selected.delete(candidate.clave);
              removedDependency = true;
            }
          }
        }
      }

      return { ...current, permisos: [...selected] };
    });
  };

  const saveRole = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingRole) await rolesService.update(editingRole.id, { ...roleForm, version: editingRole.version });
      else await rolesService.create(roleForm);
      setRoleModal(false);
      await load();
      toast.success(editingRole ? 'Rol actualizado; se cerraron las sesiones afectadas' : 'Rol creado');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el rol');
    } finally { setSubmitting(false); }
  };

  const duplicateRole = async (role: AccessRole) => {
    try { await rolesService.duplicate(role.id); await load(); toast.success('Rol duplicado'); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : 'No se pudo duplicar el rol'); }
  };

  const removeRole = async (role: AccessRole) => {
    if (!await requestConfirmation({ title: 'Eliminar rol', message: `¿Eliminar el rol “${role.nombre}”?`, confirmText: 'Eliminar' })) return;
    try { await rolesService.delete(role.id); await load(); toast.success('Rol eliminado'); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : 'No se pudo eliminar el rol'); }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-0 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Usuarios y roles</h1><p className="mt-1 text-content-muted">Administrá quién ingresa y qué puede hacer cada rol.</p></div>
        <button onClick={tab === 'usuarios' ? openNewUser : openNewRole} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 font-semibold text-white hover:bg-indigo-700"><PlusIcon className="h-5 w-5" />{tab === 'usuarios' ? 'Nuevo usuario' : 'Nuevo rol'}</button>
      </div>

      <div className="flex gap-2 border-b border-gray-200" role="tablist">
        {(['usuarios', 'roles'] as const).map(item => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`min-h-11 border-b-2 px-5 font-bold capitalize ${tab === item ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-content-muted'}`}>{item}</button>)}
      </div>

      {tab === 'usuarios' && <>
        <form onSubmit={event => { event.preventDefault(); setPage(1); void load(1, search); }} className="flex gap-2"><label className="sr-only" htmlFor="user-search">Buscar usuarios</label><input id="user-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nombre o email" className="min-h-11 flex-1 rounded-xl border border-gray-300 px-4" /><button className="rounded-xl border border-gray-300 bg-white px-5 font-semibold">Buscar</button></form>
        {!loading && users.length > 0 && <div className="space-y-3 2xl:hidden" data-testid="mobile-user-list">
          {users.map(item => {
            const accessLabel = item.tipo === 'ADMIN' ? 'Administrador' : item.rol?.nombre || 'Sin rol';
            const titleId = `mobile-user-${item.id}`;

            return <article key={item.id} aria-labelledby={titleId} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                    <UserIcon className="h-5 w-5 text-indigo-600" />
                  </span>
                  <div className="min-w-0">
                    <h2 id={titleId} className="break-words font-bold leading-snug text-gray-900">{item.fullName}</h2>
                    <p className="mt-0.5 break-all text-sm text-content-muted">{item.email}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${item.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {item.activo ? 'Activo' : 'Deshabilitado'}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
                <div className="min-w-0">
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-600">Acceso</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-gray-900">{accessLabel}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-600">Último acceso</dt>
                  <dd className="mt-1 break-words text-sm text-gray-700">{item.ultimoAcceso ? formatDateTime(item.ultimoAcceso) : 'Nunca'}</dd>
                </div>
              </dl>

              <Menu as="div" className="relative mt-3">
                <MenuButton className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <EllipsisVerticalIcon className="h-5 w-5" />
                  Acciones
                </MenuButton>
                <MenuItems anchor="bottom end" className="z-[200] mt-1 w-64 origin-top-right rounded-xl border border-gray-200 bg-white p-1.5 shadow-2xl outline-none [--anchor-gap:6px]">
                  <MenuItem>
                    <button type="button" onClick={() => openEditUser(item)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 data-focus:bg-indigo-50 data-focus:text-indigo-800">
                      <PencilSquareIcon className="h-5 w-5 text-indigo-600" />
                      Editar usuario
                    </button>
                  </MenuItem>
                  {item.id !== currentUser?.id && <MenuItem>
                    <button type="button" onClick={() => openPasswordReset(item)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 data-focus:bg-amber-50 data-focus:text-amber-800">
                      <KeyIcon className="h-5 w-5 text-amber-700" />
                      Cambiar contraseña
                    </button>
                  </MenuItem>}
                  {item.id !== currentUser?.id && <MenuItem>
                    <button type="button" onClick={() => void toggleUser(item)} className={`flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-sm font-bold ${item.activo ? 'text-red-700 data-focus:bg-red-50' : 'text-emerald-700 data-focus:bg-emerald-50'}`}>
                      {item.activo ? 'Deshabilitar usuario' : 'Habilitar usuario'}
                    </button>
                  </MenuItem>}
                </MenuItems>
              </Menu>
            </article>;
          })}
        </div>}
        {!loading && users.length > 0 && <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm 2xl:block">
          <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 text-xs uppercase text-content-muted"><tr><th className="px-5 py-4">Usuario</th><th className="px-5 py-4">Acceso</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Último acceso</th><th className="sticky right-0 z-20 bg-gray-50 px-5 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">Acciones</th></tr></thead><tbody className="divide-y divide-gray-100">
            {users.map(item => <tr key={item.id}><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-indigo-50 p-2"><UserIcon className="h-5 w-5 text-indigo-600" /></span><div><p className="font-bold text-gray-900">{item.fullName}</p><p className="text-sm text-content-muted">{item.email}</p></div></div></td><td className="px-5 py-4"><span className="font-semibold">{item.tipo === 'ADMIN' ? 'Administrador' : item.rol?.nombre || 'Sin rol'}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{item.activo ? 'Activo' : 'Deshabilitado'}</span></td><td className="px-5 py-4 text-sm text-gray-600">{item.ultimoAcceso ? formatDateTime(item.ultimoAcceso) : 'Nunca'}</td><td className="sticky right-0 z-10 bg-white px-5 py-4 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]"><div className="flex justify-end gap-2"><button aria-label={`Editar ${item.fullName}`} onClick={() => openEditUser(item)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"><PencilSquareIcon className="h-5 w-5" /></button>{item.id !== currentUser?.id && <button aria-label={`Cambiar contraseña de ${item.fullName}`} onClick={() => openPasswordReset(item)} className="rounded-lg p-2 text-status-warning hover:bg-amber-50"><KeyIcon className="h-5 w-5" /></button>}{item.id !== currentUser?.id && <button onClick={() => void toggleUser(item)} data-danger-trigger={item.activo ? 'true' : undefined} className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${item.activo ? 'destructive-action' : 'bg-emerald-50 text-emerald-700'}`}>{item.activo ? 'Deshabilitar' : 'Habilitar'}</button>}</div></td></tr>)}
          </tbody></table></div>
        </div>}
        {!loading && users.length === 0 && <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-content-muted shadow-sm">No se encontraron usuarios.</p>}
        {loading && <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-content-muted shadow-sm">Cargando...</p>}
        <ServerPagination page={page} totalPages={totalPages} total={total} pageSize={25} currentCount={users.length} onPageChange={setPage} />
      </>}

      {tab === 'roles' && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{roles.map(role => <article key={role.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="rounded-xl bg-indigo-50 p-2"><ShieldCheckIcon className="h-6 w-6 text-indigo-600" /></span><div><h2 className="font-bold text-gray-900">{role.nombre}</h2><p className="mt-1 text-sm text-content-muted">{role.descripcion || 'Sin descripción'}</p></div></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${role.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{role.activo ? 'Activo' : 'Inactivo'}</span></div><div className="mt-4 flex gap-2 text-sm text-gray-600"><span>{role.permisos.length} permisos</span><span>·</span><span>{role.cantidadUsuarios} usuarios</span></div><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => openEditRole(role)} className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">Editar</button><button onClick={() => void duplicateRole(role)} className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">Duplicar</button><button disabled={role.cantidadUsuarios > 0} onClick={() => void removeRole(role)} data-danger-trigger="true" className="destructive-action rounded-lg px-3 py-2 text-sm font-bold transition-colors disabled:opacity-100">Eliminar</button></div></article>)}</div>}

      <Dialog open={userModal} onClose={() => !submitting && setUserModal(false)} className="relative z-50"><DialogBackdrop className="fixed inset-0 bg-black/50" /><div className="fixed inset-0 overflow-y-auto p-4"><div className="flex min-h-full items-center justify-center"><DialogPanel className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><DialogTitle className="text-xl font-bold">{editingUser ? 'Editar usuario' : 'Crear usuario'}</DialogTitle><form onSubmit={saveUser} className="mt-5 space-y-4">{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<label className="block text-sm font-bold">Nombre completo<input required maxLength={120} value={userForm.nombreCompleto} onChange={e => setUserForm({ ...userForm, nombreCompleto: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-gray-300 px-3" /></label><label className="block text-sm font-bold">Email<input required type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-gray-300 px-3" /></label>{!editingUser && <label className="block text-sm font-bold">Contraseña temporal<input required type="password" minLength={12} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-gray-300 px-3" /><span className="mt-1 block text-xs font-normal text-content-muted">Debe tener al menos 12 caracteres. El usuario deberá cambiarla al ingresar.</span></label>}<label className="block text-sm font-bold">Tipo de cuenta<AppSelect className="mt-1" ariaLabel="Tipo de cuenta" value={userForm.tipo} disabled={editingUser?.id === currentUser?.id} onChange={value => setUserForm({ ...userForm, tipo: value as UserType, rolId: value === 'ADMIN' ? null : userForm.rolId })} options={[{ value: 'USUARIO', label: 'Usuario con rol' }, { value: 'ADMIN', label: 'Administrador — acceso total' }]} /></label>{userForm.tipo === 'USUARIO' && <label className="block text-sm font-bold">Rol<AppSelect className="mt-1" required ariaLabel="Rol del usuario" value={String(userForm.rolId || '')} onChange={value => setUserForm({ ...userForm, rolId: Number(value) || null })} options={[{ value: '', label: 'Seleccionar rol', disabled: true }, ...activeRoles.map(role => ({ value: String(role.id), label: role.nombre }))]} /></label>}<div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setUserModal(false)} className="min-h-11 px-4 font-semibold">Cancelar</button><button disabled={submitting} className="min-h-11 rounded-xl bg-indigo-600 px-5 font-bold text-white disabled:opacity-50">Guardar</button></div></form></DialogPanel></div></div></Dialog>

      <RoleEditorDialog
        key={`${editingRole?.id || 'new'}-${roleModal ? 'open' : 'closed'}`}
        open={roleModal}
        editingRole={editingRole}
        form={roleForm}
        groups={permissionGroups}
        error={error}
        submitting={submitting}
        onClose={() => setRoleModal(false)}
        onFormChange={setRoleForm}
        onTogglePermission={togglePermission}
        onSetGroupPermissions={setGroupPermissions}
        onSubmit={saveRole}
      />

      <Dialog open={Boolean(resetTarget)} onClose={() => !submitting && setResetTarget(null)} className="relative z-50"><DialogBackdrop className="fixed inset-0 bg-black/50" /><div className="fixed inset-0 flex items-center justify-center p-4"><DialogPanel className="w-full max-w-md rounded-2xl bg-white p-6"><DialogTitle className="text-xl font-bold">Restablecer contraseña</DialogTitle><p className="mt-2 text-sm text-content-muted">Definí una contraseña temporal para {resetTarget?.fullName}. Se cerrarán todas sus sesiones.</p><form onSubmit={resetPassword} className="mt-5 space-y-4">{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<label className="block text-sm font-bold">Nueva contraseña temporal<input autoFocus required minLength={12} type="password" value={temporaryPassword} onChange={e => setTemporaryPassword(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-gray-300 px-3" /></label><div className="flex justify-end gap-3"><button type="button" onClick={() => setResetTarget(null)} className="min-h-11 px-4">Cancelar</button><button disabled={submitting} className="min-h-11 rounded-xl bg-status-warning px-4 font-bold text-white">Restablecer</button></div></form></DialogPanel></div></Dialog>
    </div>
  );
}
