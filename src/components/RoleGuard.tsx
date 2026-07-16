import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import AccessDenied from "../pages/AccessDenied";

export default function RoleGuard({ role, children }: { role: string; children: ReactNode }) {
  const { user } = useAuth();
  if ((user?.rol || user?.role) !== role) return <AccessDenied />;
  return <>{children}</>;
}
