import { type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import AccessDenied from "../pages/AccessDenied";
import { hasPermission, type PermissionKey } from "../utils/permissions";

interface PermissionGuardProps {
  permission?: PermissionKey;
  permissions?: PermissionKey[];
  adminOnly?: boolean;
  children: ReactNode;
}

export default function PermissionGuard({ permission, permissions, adminOnly, children }: PermissionGuardProps) {
  const { user } = useAuth();

  const allowed = adminOnly
    ? user?.tipo === "ADMIN"
    : permission ? hasPermission(user, permission) : Boolean(permissions?.some(item => hasPermission(user, item)));
  if (!allowed) {
    return <AccessDenied permission={permission || permissions?.join(" o ")} />;
  }

  return <>{children}</>;
}
