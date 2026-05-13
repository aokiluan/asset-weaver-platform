import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import CedenteCadastro from "./pages/CedenteCadastro.tsx";
import Financeiro from "./pages/Financeiro.tsx";
import Configuracoes from "./pages/Configuracoes.tsx";
import BI from "./pages/BI.tsx";
import BIIndicadores from "./pages/bi/BIIndicadores.tsx";
import AdminUsuarios from "./pages/admin/AdminUsuarios.tsx";
import AdminEquipes from "./pages/admin/AdminEquipes.tsx";
import AdminAlcadas from "./pages/admin/AdminAlcadas.tsx";
import AdminPipeline from "./pages/admin/AdminPipeline.tsx";
import AdminCategorias from "./pages/admin/AdminCategorias.tsx";
import AdminPermissoes from "./pages/admin/AdminPermissoes.tsx";
import AdminDatasets from "./pages/admin/AdminDatasets.tsx";
import AdminRelatorios from "./pages/admin/AdminRelatorios.tsx";
import AdminDashboardWidgets from "./pages/admin/AdminDashboardWidgets.tsx";
import GestaoComercial from "./pages/gestao/GestaoComercial.tsx";
import GestaoOperacional from "./pages/gestao/GestaoOperacional.tsx";
import GestaoFinanceiro from "./pages/gestao/GestaoFinanceiro.tsx";
import GestaoDiario from "./pages/gestao/GestaoDiario.tsx";
import Comite from "./pages/Comite.tsx";
import Formalizacao from "./pages/Formalizacao.tsx";
import Diretorio from "./pages/Diretorio.tsx";
import DiretorioDetail from "./pages/DiretorioDetail.tsx";
import Investidores from "./pages/Investidores.tsx";
import InvestidorDetail from "./pages/InvestidorDetail.tsx";
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
              <Route path="/" element={<Navigate to="/gestao/comercial" replace />} />
              <Route path="/inicio" element={<Index />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/cedentes" element={<Cedentes />} />
              <Route path="/cedentes/novo" element={<CedenteCadastro />} />
              <Route path="/cedentes/:id/editar" element={<CedenteCadastro />} />
              <Route path="/cedentes/:id" element={<CedenteDetail />} />
              <Route path="/diretorio" element={<Diretorio />} />
              <Route path="/diretorio/investidores" element={<Investidores />} />
              <Route path="/diretorio/investidores/:id" element={<InvestidorDetail />} />
              <Route path="/diretorio/:id" element={<DiretorioDetail />} />
              {/* Rotas legadas redirecionam para a tela do cedente */}
              <Route path="/credito" element={<Navigate to="/cedentes" replace />} />
              <Route path="/credito/:id" element={<Navigate to="/cedentes" replace />} />
              <Route path="/cadastro/fila" element={<Navigate to="/cedentes" replace />} />
              <Route
                path="/financeiro"
                element={
                  <RoleGuard role={["admin", "financeiro", "gestor_geral"]} moduleKey="financeiro_mod">
                    <Financeiro />
                  </RoleGuard>
                }
              />

              {/* Gestão (dashboards) */}
              <Route path="/gestao/comercial" element={<GestaoComercial />} />
              <Route path="/gestao/operacional" element={<GestaoOperacional />} />
              <Route path="/gestao/financeiro" element={<GestaoFinanceiro />} />
              <Route path="/gestao/diario" element={<GestaoDiario />} />

              {/* Comitê e Formalização (placeholders Fase 2/3) */}
              <Route
                path="/comite"
                element={
                  <RoleGuard role={["admin", "comite", "credito", "gestor_geral"]} moduleKey="operacao">
                    <Comite />
                  </RoleGuard>
                }
              />
              <Route
                path="/formalizacao"
                element={
                  <RoleGuard role={["admin", "formalizacao", "gestor_geral"]} moduleKey="operacao">
                    <Formalizacao />
                  </RoleGuard>
                }
              />

              {/* Configurações (consolida o antigo /admin/*) */}
              <Route
                path="/configuracoes"
                element={
                  <RoleGuard role="admin">
                    <Configuracoes />
                  </RoleGuard>
                }
              >
                <Route index element={<Navigate to="usuarios" replace />} />
                <Route path="usuarios" element={<AdminUsuarios />} />
                <Route path="equipes" element={<AdminEquipes />} />
                <Route path="alcadas" element={<AdminAlcadas />} />
                <Route path="pipeline" element={<AdminPipeline />} />
                <Route path="categorias" element={<AdminCategorias />} />
                <Route path="permissoes" element={<AdminPermissoes />} />
              </Route>

              {/* BI / Relatórios */}
              <Route
                path="/bi"
                element={
                  <RoleGuard role="admin">
                    <BI />
                  </RoleGuard>
                }
              >
                <Route index element={<Navigate to="indicadores" replace />} />
                <Route path="indicadores" element={<BIIndicadores />} />
                <Route path="uploads" element={<AdminRelatorios />} />
                <Route path="datasets" element={<AdminDatasets />} />
                <Route path="widgets" element={<AdminDashboardWidgets />} />
              </Route>

              {/* Redirects das rotas antigas */}
              <Route path="/admin/usuarios" element={<Navigate to="/configuracoes/usuarios" replace />} />
              <Route path="/admin/alcadas" element={<Navigate to="/configuracoes/alcadas" replace />} />
              <Route path="/admin/pipeline" element={<Navigate to="/configuracoes/pipeline" replace />} />
              <Route path="/admin/categorias" element={<Navigate to="/configuracoes/categorias" replace />} />
              <Route path="/admin/datasets" element={<Navigate to="/bi/datasets" replace />} />
              <Route path="/admin/relatorios" element={<Navigate to="/bi/uploads" replace />} />
              <Route path="/admin/widgets" element={<Navigate to="/bi/widgets" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
