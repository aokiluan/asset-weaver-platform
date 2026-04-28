import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface PageTab {
  label: string;
  to: string;
  end?: boolean;
}

interface PageTabsProps {
  title: string;
  description?: string;
  tabs: PageTab[];
  actions?: React.ReactNode;
}

/**
 * Cabeçalho de página com abas horizontais (estilo Nibo):
 * título grande à esquerda + linha horizontal de tabs com underline
 * na ativa.
 */
export function PageTabs({ title, description, tabs, actions }: PageTabsProps) {
  return (
    <div className="border-b bg-background -mx-6 -mt-6 px-6 pt-6 mb-6">
      <div className="flex flex-wrap items-end justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-8 min-w-0 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>

          <nav className="flex items-end gap-1 -mb-px">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  cn(
                    "px-3 pb-3 pt-2 text-[13px] font-medium border-b-2 transition-colors",
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  )
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
