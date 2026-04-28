import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Leads from "./pages/Leads.tsx";
import Pipeline from "./pages/Pipeline.tsx";
import Cedentes from "./pages/Cedentes.tsx";
import CedenteDetail from "./pages/CedenteDetail.tsx";
import Credito from "./pages/Credito.tsx";
import CreditoDetail from "./pages/CreditoDetail.tsx";
import Financeiro from "./pages/Financeiro.tsx";
import AdminUsuarios from "./pages/admin/AdminUsuarios.tsx";
import AdminAlcadas from "./pages/admin/AdminAlcadas.tsx";
import AdminPipeline from "./pages/admin/AdminPipeline.tsx";
import AdminCategorias from "./pages/admin/AdminCategorias.tsx";
import RoleGuard from "@/components/RoleGuard";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/cedentes" element={<Cedentes />} />
              <Route path="/cedentes/:id" element={<CedenteDetail />} />
              <Route path="/credito" element={<Credito />} />
              <Route path="/credito/:id" element={<CreditoDetail />} />
              <Route path="/financeiro" element={<RoleGuard role={["admin", "financeiro", "gestor_risco"]}><Financeiro /></RoleGuard>} />
              <Route path="/admin/usuarios" element={<RoleGuard role="admin"><AdminUsuarios /></RoleGuard>} />
              <Route path="/admin/alcadas" element={<RoleGuard role="admin"><AdminAlcadas /></RoleGuard>} />
              <Route path="/admin/pipeline" element={<RoleGuard role="admin"><AdminPipeline /></RoleGuard>} />
              <Route path="/admin/categorias" element={<RoleGuard role="admin"><AdminCategorias /></RoleGuard>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
