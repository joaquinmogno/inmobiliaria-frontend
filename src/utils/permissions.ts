import { type User } from "../services/auth.service";

export const SUELDOS_PERMISSIONS = [
  "sueldos.ver",
  "sueldos.crear",
  "sueldos.editar",
  "sueldos.eliminar",
] as const;

export const MODULE_PERMISSIONS = [
  "contratos.ver",
  "contratos.crear",
  "contratos.editar",
  "contratos.eliminar",
  "caja_chica.ver",
  "caja_chica.crear",
  "caja_chica.editar",
  "caja_chica.eliminar",
  "liquidaciones.ver",
  "liquidaciones.crear",
  "liquidaciones.editar",
  "liquidaciones.eliminar",
  "pagos.ver",
  "pagos.crear",
  "pagos.editar",
  "pagos.eliminar",
  "propiedades.ver",
  "propiedades.crear",
  "propiedades.editar",
  "propiedades.eliminar",
  "personas.ver",
  "personas.crear",
  "personas.editar",
  "personas.eliminar",
  "usuarios.ver",
  "usuarios.crear",
  "usuarios.editar",
  "usuarios.eliminar",
  "usuarios.permisos",
  "usuarios.asignar_rol",
  "configuracion.perfil.ver",
  "configuracion.perfil.editar",
  "configuracion.backups.ver",
  "configuracion.backups.crear",
  "configuracion.backups.eliminar",
  "configuracion.backups.descargar",
  "configuracion.auditoria.ver",
  "reportes.dashboard.ver",
  "reportes.contratos.ver",
  "reportes.morosidad.ver",
  "reportes.financieros.ver",
  "contratos.archivos.ver",
  "contratos.restaurar",
  ...SUELDOS_PERMISSIONS,
] as const;

export type PermissionKey = typeof MODULE_PERMISSIONS[number];

export const ADMIN_ROLES = ["SUPERADMIN", "OWNER", "JEFE", "ADMIN"] as const;

export const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  OWNER: "Owner",
  JEFE: "Jefe",
  ADMIN: "Administrador",
  AGENTE: "Agente",
};

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "contratos.ver": "Ver contratos",
  "contratos.crear": "Crear contratos",
  "contratos.editar": "Editar contratos",
  "contratos.eliminar": "Eliminar contratos",
  "caja_chica.ver": "Ver caja chica",
  "caja_chica.crear": "Crear caja chica",
  "caja_chica.editar": "Editar caja chica",
  "caja_chica.eliminar": "Eliminar caja chica",
  "liquidaciones.ver": "Ver liquidaciones",
  "liquidaciones.crear": "Crear liquidaciones",
  "liquidaciones.editar": "Editar liquidaciones",
  "liquidaciones.eliminar": "Eliminar liquidaciones",
  "pagos.ver": "Ver pagos",
  "pagos.crear": "Crear pagos",
  "pagos.editar": "Editar pagos",
  "pagos.eliminar": "Eliminar pagos",
  "propiedades.ver": "Ver propiedades",
  "propiedades.crear": "Crear propiedades",
  "propiedades.editar": "Editar propiedades",
  "propiedades.eliminar": "Eliminar propiedades",
  "personas.ver": "Ver personas",
  "personas.crear": "Crear personas",
  "personas.editar": "Editar personas",
  "personas.eliminar": "Eliminar personas",
  "usuarios.ver": "Ver usuarios",
  "usuarios.crear": "Crear usuarios",
  "usuarios.editar": "Editar usuarios",
  "usuarios.eliminar": "Eliminar usuarios",
  "usuarios.permisos": "Administrar permisos",
  "usuarios.asignar_rol": "Asignar roles",
  "configuracion.perfil.ver": "Ver perfil",
  "configuracion.perfil.editar": "Editar perfil",
  "configuracion.backups.ver": "Ver backups",
  "configuracion.backups.crear": "Crear backups",
  "configuracion.backups.eliminar": "Eliminar backups",
  "configuracion.backups.descargar": "Descargar backups",
  "configuracion.auditoria.ver": "Ver auditoría",
  "reportes.dashboard.ver": "Ver dashboard",
  "reportes.contratos.ver": "Ver métricas de contratos",
  "reportes.morosidad.ver": "Ver morosidad",
  "reportes.financieros.ver": "Ver reportes financieros",
  "contratos.archivos.ver": "Ver archivos de contratos",
  "contratos.restaurar": "Restaurar contratos",
  "sueldos.ver": "Ver sueldos",
  "sueldos.crear": "Crear sueldos",
  "sueldos.editar": "Editar sueldos",
  "sueldos.eliminar": "Eliminar sueldos",
};

export const PERMISSION_GROUPS: Array<{ title: string; permissions: PermissionKey[] }> = [
  { title: "Contratos", permissions: ["contratos.ver", "contratos.crear", "contratos.editar", "contratos.eliminar", "contratos.archivos.ver", "contratos.restaurar"] },
  { title: "Caja chica", permissions: ["caja_chica.ver", "caja_chica.crear", "caja_chica.editar", "caja_chica.eliminar"] },
  { title: "Liquidaciones", permissions: ["liquidaciones.ver", "liquidaciones.crear", "liquidaciones.editar", "liquidaciones.eliminar"] },
  { title: "Pagos", permissions: ["pagos.ver", "pagos.crear", "pagos.editar", "pagos.eliminar"] },
  { title: "Propiedades", permissions: ["propiedades.ver", "propiedades.crear", "propiedades.editar", "propiedades.eliminar"] },
  { title: "Personas", permissions: ["personas.ver", "personas.crear", "personas.editar", "personas.eliminar"] },
  { title: "Usuarios", permissions: ["usuarios.ver", "usuarios.crear", "usuarios.editar", "usuarios.eliminar", "usuarios.permisos", "usuarios.asignar_rol"] },
  { title: "Configuración", permissions: ["configuracion.perfil.ver", "configuracion.perfil.editar", "configuracion.backups.ver", "configuracion.backups.crear", "configuracion.backups.descargar", "configuracion.backups.eliminar", "configuracion.auditoria.ver"] },
  { title: "Reportes", permissions: ["reportes.dashboard.ver", "reportes.contratos.ver", "reportes.morosidad.ver", "reportes.financieros.ver"] },
  { title: "Sueldos", permissions: [...SUELDOS_PERMISSIONS] },
];

export const ROLE_PRESETS: Array<{ name: string; permissions: PermissionKey[]; deniedPermissions?: PermissionKey[] }> = [
  { name: "Jefe", permissions: MODULE_PERMISSIONS.filter(permission => permission !== "configuracion.backups.eliminar") },
  { name: "Administrador", permissions: MODULE_PERMISSIONS.filter(permission => !permission.startsWith("sueldos.") && permission !== "configuracion.backups.eliminar") },
  {
    name: "Administrativo",
    permissions: [
      "contratos.ver", "contratos.crear", "contratos.editar",
      "contratos.archivos.ver",
      "propiedades.ver", "propiedades.crear", "propiedades.editar",
      "personas.ver", "personas.crear", "personas.editar",
      "liquidaciones.ver", "liquidaciones.crear", "liquidaciones.editar",
      "pagos.ver", "pagos.crear",
      "caja_chica.ver", "caja_chica.crear",
      "reportes.dashboard.ver",
    ],
  },
  {
    name: "Cobranzas",
    permissions: [
      "contratos.ver", "personas.ver", "propiedades.ver",
      "contratos.archivos.ver",
      "liquidaciones.ver", "liquidaciones.editar",
      "pagos.ver", "pagos.crear",
      "caja_chica.ver", "caja_chica.crear",
      "reportes.dashboard.ver",
    ],
  },
  { name: "Solo lectura", permissions: MODULE_PERMISSIONS.filter(permission => permission.endsWith(".ver")) },
];

export function isAdminRole(role?: string): boolean {
  return !!role && ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number]);
}

export function hasPermission(user: User | null | undefined, permission: PermissionKey): boolean {
  if (!user) return false;
  return !!user.permissions?.includes(permission);
}
