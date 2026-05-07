import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Kanban,
  Gear,
  Buildings,
  Gavel,
  ListChecks,
  Tag,
  Wallet,
  Database,
  MicrosoftExcelLogo,
  SquaresFour,
  ChartBar,
  Briefcase,
  PushPin,
  PushPinSlash,
  CaretDown,
  List,
  TrendUp,
  Pulse,
  CalendarBlank,
  Scales,
  NotePencil,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { forwardRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// Wrapper que aplica peso "thin" por padrão e expõe a API simples { className }
function thin(Icon: PhosphorIcon) {
  const Wrapped = forwardRef<SVGSVGElement, { className?: string }>(
    ({ className }, ref) => <Icon ref={ref} weight="thin" className={className} />,
  );
  Wrapped.displayName = `Thin(${(Icon as any).displayName ?? "Icon"})`;
  return Wrapped as unknown as React.ComponentType<{ className?: string }>;
}

const IconDashboard = thin(SquaresFour);
const IconUsers = thin(Users);
const IconKanban = thin(Kanban);
const IconSettings = thin(Gear);
const IconBuilding = thin(Buildings);
const IconGavel = thin(Gavel);
const IconListChecks = thin(ListChecks);
const IconTags = thin(Tag);
const IconWallet = thin(Wallet);
const IconDatabase = thin(Database);
const IconExcel = thin(MicrosoftExcelLogo);
const IconGrid = thin(SquaresFour);
const IconChart = thin(ChartBar);
const IconBriefcase = thin(Briefcase);
const IconPin = thin(PushPin);
const IconPinOff = thin(PushPinSlash);
const IconChevronDown = thin(CaretDown);
const IconMenu = thin(List);
const IconTrendingUp = thin(TrendUp);
const IconActivity = thin(Pulse);
const IconCalendar = thin(CalendarBlank);
const IconVote = thin(Scales);
const IconSignature = thin(NotePencil);


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
    icon: IconChart,
    items: [
      { title: "Dashboard Comercial", url: "/gestao/comercial", icon: IconTrendingUp },
      { title: "Dashboard Operacional", url: "/gestao/operacional", icon: IconActivity },
      { title: "Dashboard Financeiro", url: "/gestao/financeiro", icon: IconWallet },
      { title: "Dashboard Diário", url: "/gestao/diario", icon: IconCalendar },
    ],
  },
  {
    key: "operacao",
    label: "Operação",
    icon: IconBriefcase,
    items: [
      { title: "CRM", url: "/pipeline", icon: IconKanban },
      { title: "Cedentes", url: "/cedentes", icon: IconBuilding },
      {
        title: "Comitê",
        url: "/comite",
        icon: IconVote,
        roles: ["admin", "comite", "credito"] as const,
      },
      {
        title: "Formalização",
        url: "/formalizacao",
        icon: IconSignature,
        roles: ["admin", "formalizacao", "cadastro"] as const,
      },
    ],
  },
  {
    key: "config",
    label: "Configurações",
    icon: IconSettings,
    adminOnly: true,
    items: [
      {
        title: "Financeiro",
        url: "/financeiro",
        icon: IconWallet,
        roles: ["admin", "financeiro"] as const,
      },
      { title: "Usuários", url: "/configuracoes/usuarios", icon: IconUsers },
      { title: "Equipes", url: "/configuracoes/equipes", icon: IconUsers },
      { title: "Alçadas", url: "/configuracoes/alcadas", icon: IconGavel },
      { title: "Pipeline", url: "/configuracoes/pipeline", icon: IconListChecks },
      { title: "Categorias de doc.", url: "/configuracoes/categorias", icon: IconTags },
      { title: "BI – Datasets", url: "/bi/datasets", icon: IconDatabase },
      { title: "BI – Uploads", url: "/bi/uploads", icon: IconExcel },
      { title: "BI – Widgets", url: "/bi/widgets", icon: IconGrid },
    ],
  },
];

const PIN_KEY = "sidebar:pinned";
const OPEN_KEY = "sidebar:openGroups";
const COLLAPSED_W = 60;
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
          expanded && !pinned && "shadow-md",
        )}
        style={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
      >
        <div className={cn(
          "h-16 flex items-center justify-between border-b border-sidebar-border shrink-0",
          expanded ? "px-3" : "px-1.5",
        )}>
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
                {pinned ? <IconPinOff className="h-4 w-4" /> : <IconPin className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setPinned(true)}
              className="h-7 w-7 mx-auto flex items-center justify-center rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              title="Abrir menu"
              aria-label="Abrir menu"
            >
              <IconMenu className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                      "w-full px-4 h-7 flex items-center gap-2 text-[11px] font-normal uppercase tracking-[0.1em]",
                      "text-muted-foreground/80 hover:text-foreground transition-colors",
                    )}
                  >
                    <span className="flex-1 text-left truncate">{group.label}</span>
                    <IconChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform opacity-50",
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
          "relative my-0.5 flex items-center gap-3 rounded-md h-9 text-[13px]",
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
          active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium hover:bg-sidebar-accent",
          expanded ? (nested ? "mx-2 pl-5 pr-3" : "mx-2 px-3") : "mx-1.5 justify-center px-0",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active && "text-sidebar-accent-foreground")} />
        {expanded && <span className="truncate">{label}</span>}
      </NavLink>
    </li>
  );
}
