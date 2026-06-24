import { type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import AccessDenied from "../pages/AccessDenied";
import { hasPermission, type PermissionKey } from "../utils/permissions";

interface PermissionGuardProps {
  permission: PermissionKey;
  children: ReactNode;
}

export default function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const { user } = useAuth();

  if (!hasPermission(user, permission)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
