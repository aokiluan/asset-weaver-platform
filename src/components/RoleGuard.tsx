import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { Loader2 } from "lucide-react";
import type { AppRole } from "@/lib/roles";

interface Props {
  children: ReactNode;
  role: AppRole | readonly AppRole[] | AppRole[];
  moduleKey?: string;
}

export default function RoleGuard({ children, role, moduleKey }: Props) {
  const { hasRole, loading } = useAuth();
  const { isModuleEnabled, isLoading: modLoading } = useModulePermissions();
  const location = useLocation();

  if (loading || (moduleKey && modLoading)) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
    </div>;
  }
  const roles: AppRole[] = Array.isArray(role) ? [...role] : [role as AppRole];
  const allowed = roles.some((r) => hasRole(r));
  if (!allowed) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  if (moduleKey && !isModuleEnabled(moduleKey)) {
    return <Navigate to="/gestao/comercial" replace />;
  }
  return <>{children}</>;
}
