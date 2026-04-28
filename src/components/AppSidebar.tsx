import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  FileText,
  Shield,
  Settings,
  Building2,
  Scale,
  Gavel,
  ListChecks,
  Tags,
  Wallet,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Pipeline", url: "/pipeline", icon: KanbanSquare },
  { title: "Cedentes", url: "/cedentes", icon: Building2 },
  { title: "Crédito", url: "/credito", icon: Scale },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, roles: ["admin", "financeiro", "gestor_risco"] as const },
];

const adminItems = [
  { title: "Usuários", url: "/admin/usuarios", icon: Settings },
  { title: "Alçadas", url: "/admin/alcadas", icon: Gavel },
  { title: "Pipeline", url: "/admin/pipeline", icon: ListChecks },
  { title: "Categorias de doc.", url: "/admin/categorias", icon: Tags },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { hasRole } = useAuth();

  const isActive = (path: string) => path === "/" ? pathname === "/" : pathname.startsWith(path);
  const showAdmin = hasRole("admin");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border py-2">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="h-7 w-7 rounded-md bg-[var(--gradient-primary)] flex items-center justify-center shrink-0">
            <Shield className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold text-sidebar-foreground">Securitizadora</span>
              <span className="text-[10px] text-sidebar-foreground/60">Plataforma de gestão</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup className="py-1.5">
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 h-6 px-3">
            Operação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="h-8 text-[13px] rounded-md px-3"
                  >
                    <NavLink to={item.url} end={item.url === "/"}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdmin && (
          <SidebarGroup className="py-1.5 border-t border-sidebar-border/60">
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 h-6 px-3">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0">
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className="h-8 text-[13px] rounded-md px-3"
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
