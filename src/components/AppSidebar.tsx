import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
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
  Database,
  FileSpreadsheet,
  LayoutGrid,
  BarChart3,
  Briefcase,
  Pin,
  PinOff,
  ChevronDown,
  TrendingUp,
  Activity,
  CalendarDays,
  Vote,
  FileSignature,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Item = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: readonly string[];
};

type Group = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  items: Item[];
};

const GROUPS: Group[] = [
  {
    key: "gestao",
    label: "Gestão",
    icon: BarChart3,
    items: [
      { title: "Dashboard Comercial", url: "/gestao/comercial", icon: TrendingUp },
      { title: "Dashboard Operacional", url: "/gestao/operacional", icon: Activity },
      { title: "Dashboard Financeiro", url: "/gestao/financeiro", icon: Wallet },
      { title: "Dashboard Diário", url: "/gestao/diario", icon: CalendarDays },
    ],
  },
  {
    key: "operacao",
    label: "Operação",
    icon: Briefcase,
    items: [
      { title: "CRM", url: "/pipeline", icon: KanbanSquare },
      { title: "Cedentes", url: "/cedentes", icon: Building2 },
      {
        title: "Comitê",
        url: "/comite",
        icon: Vote,
        roles: ["admin", "comite", "gestor_credito", "analista_credito"] as const,
      },
      {
        title: "Formalização",
        url: "/formalizacao",
        icon: FileSignature,
        roles: ["admin", "analista_cadastro", "gestor_comercial"] as const,
      },
    ],
  },
  {
    key: "config",
    label: "Configurações",
    icon: Settings,
    adminOnly: true,
    items: [
      {
        title: "Financeiro",
        url: "/financeiro",
        icon: Wallet,
        roles: ["admin", "financeiro", "gestor_financeiro", "gestor_risco"] as const,
      },
      { title: "Usuários", url: "/configuracoes/usuarios", icon: Users },
      { title: "Alçadas", url: "/configuracoes/alcadas", icon: Gavel },
      { title: "Pipeline", url: "/configuracoes/pipeline", icon: ListChecks },
      { title: "Categorias de doc.", url: "/configuracoes/categorias", icon: Tags },
      { title: "BI – Datasets", url: "/bi/datasets", icon: Database },
      { title: "BI – Uploads", url: "/bi/uploads", icon: FileSpreadsheet },
      { title: "BI – Widgets", url: "/bi/widgets", icon: LayoutGrid },
    ],
  },
];

const PIN_KEY = "sidebar:pinned";
const OPEN_KEY = "sidebar:openGroups";
const COLLAPSED_W = 56;
const EXPANDED_W = 240;

export function AppSidebar() {
  const { pathname } = useLocation();
  const { hasRole } = useAuth();

  const [pinned, setPinned] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PIN_KEY) === "1";
  });
  const [hovered, setHovered] = useState(false);

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const visibleGroups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => !i.roles || i.roles.some((r) => hasRole(r as any))),
      }))
        .filter((g) => (g.adminOnly ? hasRole("admin") || g.items.some((i) => i.roles) : true))
        .filter((g) => g.items.length > 0),
    [hasRole],
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(OPEN_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return Object.fromEntries(GROUPS.map((g) => [g.key, true]));
  });

  useEffect(() => {
    localStorage.setItem(PIN_KEY, pinned ? "1" : "0");
  }, [pinned]);

  useEffect(() => {
    localStorage.setItem(OPEN_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  useEffect(() => {
    const activeGroup = visibleGroups.find((g) =>
      g.items.some((i) => isActive(i.url)),
    );
    if (activeGroup && !openGroups[activeGroup.key]) {
      setOpenGroups((s) => ({ ...s, [activeGroup.key]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const expanded = pinned || hovered;

  return (
    <>
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

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {visibleGroups.map((group, idx) => {
            const isOpen = openGroups[group.key] ?? true;
            const groupHasActive = group.items.some((i) => isActive(i.url));

            return (
              <div key={group.key} className="pt-1.5 pb-1">
                {idx > 0 && (
                  <div className="my-1.5 mx-3 border-t border-sidebar-border/70" />
                )}

                {expanded ? (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((s) => ({ ...s, [group.key]: !isOpen }))
                    }
                    className={cn(
                      "w-full px-3 h-8 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider",
                      "text-sidebar-foreground/55 hover:text-sidebar-foreground transition-colors",
                    )}
                  >
                    <group.icon className="h-3.5 w-3.5" />
                    <span className="flex-1 text-left truncate">{group.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        !isOpen && "-rotate-90",
                      )}
                    />
                  </button>
                ) : (
                  <div className="h-1" aria-hidden />
                )}

                {(isOpen || !expanded) && (
                  <ul className="flex flex-col">
                    {group.items.map((item) => (
                      <SidebarItem
                        key={item.url}
                        to={item.url}
                        end={item.url === "/"}
                        icon={item.icon}
                        label={item.title}
                        active={isActive(item.url)}
                        expanded={expanded}
                        nested={expanded}
                      />
                    ))}
                  </ul>
                )}

                {!expanded && groupHasActive && (
                  <div className="mx-auto mt-1 h-0.5 w-6 rounded bg-sidebar-foreground/20" />
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function SidebarItem({
  to,
  end,
  icon: Icon,
  label,
  active,
  expanded,
  nested,
}: {
  to: string;
  end?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  expanded: boolean;
  nested: boolean;
}) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        title={!expanded ? label : undefined}
        className={cn(
          "my-0.5 flex items-center gap-2.5 rounded-md h-9 text-[13px]",
          "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
          expanded ? (nested ? "mx-2 pl-6 pr-2.5" : "mx-2 px-2.5") : "mx-1.5 justify-center px-0",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {expanded && <span className="truncate">{label}</span>}
      </NavLink>
    </li>
  );
}
