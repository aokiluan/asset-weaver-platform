import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Settings,
  Building2,
  Scale,
  Gavel,
  ListChecks,
  Tags,
  Wallet,
  Pin,
  PinOff,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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

const PIN_KEY = "sidebar:pinned";
const COLLAPSED_W = 56; // px (w-14)
const EXPANDED_W = 220; // px

export function AppSidebar() {
  const { pathname } = useLocation();
  const { hasRole } = useAuth();

  const [pinned, setPinned] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PIN_KEY) === "1";
  });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    localStorage.setItem(PIN_KEY, pinned ? "1" : "0");
  }, [pinned]);

  const expanded = pinned || hovered;
  const showAdmin = hasRole("admin");

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <>
      {/* Spacer: reserva o espaço da sidebar no fluxo da página.
          Quando não pinned, ocupa apenas a largura colapsada. */}
      <div
        className="shrink-0 transition-[width] duration-200 ease-linear hidden md:block"
        style={{ width: pinned ? EXPANDED_W : COLLAPSED_W }}
        aria-hidden
      />

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden md:flex flex-col",
          "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          "transition-[width] duration-200 ease-linear",
          expanded && !pinned && "shadow-xl",
        )}
        style={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between border-b border-sidebar-border px-3 shrink-0">
          {expanded ? (
            <>
              <span className="text-[14px] text-sidebar-foreground">
                Painel de Gestão
              </span>
              <button
                type="button"
                onClick={() => setPinned((p) => !p)}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-md",
                  "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  pinned && "bg-sidebar-accent text-sidebar-foreground",
                )}
                title={pinned ? "Desafixar menu" : "Fixar menu"}
                aria-label={pinned ? "Desafixar menu" : "Fixar menu"}
              >
                {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <div className="h-7 w-7" aria-hidden />
          )}
        </div>

        {/* Conteúdo */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {/* Grupo principal */}
          <Group expanded={expanded} label="Operação">
            {mainItems.map((item) => (
              <Item
                key={item.title}
                to={item.url}
                end={item.url === "/"}
                icon={item.icon}
                label={item.title}
                active={isActive(item.url)}
                expanded={expanded}
              />
            ))}
          </Group>

          {showAdmin && (
            <>
              <Divider />
              <Group expanded={expanded} label="Administração">
                {adminItems.map((item) => (
                  <Item
                    key={item.title}
                    to={item.url}
                    icon={item.icon}
                    label={item.title}
                    active={isActive(item.url)}
                    expanded={expanded}
                  />
                ))}
              </Group>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

function Divider() {
  return <div className="my-1.5 mx-3 border-t border-sidebar-border/70" />;
}

function Group({
  expanded,
  label,
  children,
}: {
  expanded: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-2 pb-1">
      {expanded && (
        <div className="px-3 h-6 flex items-center text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          {label}
        </div>
      )}
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}

function Item({
  to,
  end,
  icon: Icon,
  label,
  active,
  expanded,
}: {
  to: string;
  end?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  expanded: boolean;
}) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        title={!expanded ? label : undefined}
        className={cn(
          "mx-2 my-0.5 flex items-center gap-2.5 rounded-md h-9 px-2.5 text-[13px]",
          "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          !expanded && "justify-center px-0 mx-1.5",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {expanded && <span className="truncate">{label}</span>}
      </NavLink>
    </li>
  );
}
