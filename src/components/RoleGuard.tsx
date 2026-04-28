import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type AppRole =
  | "admin" | "gestor_comercial" | "comercial" | "analista_credito"
  | "comite" | "gestor_risco" | "financeiro" | "operacional";

interface Props {
  children: ReactNode;
  role: AppRole | readonly AppRole[] | AppRole[];
}

export default function RoleGuard({ children, role }: Props) {
  const { hasRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
    </div>;
  }
  const roles: AppRole[] = Array.isArray(role) ? [...role] : [role as AppRole];
  const allowed = roles.some((r) => hasRole(r));
  if (!allowed) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
