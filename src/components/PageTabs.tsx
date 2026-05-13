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
    <div className="border-b bg-background -mx-8 -mt-7 px-8 pt-7 mb-7">
      <div className="flex flex-wrap items-end justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-10 min-w-0 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-[20px] font-medium text-foreground leading-tight tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-[12px] text-muted-foreground mt-1">{description}</p>
            )}
          </div>

          <nav className="flex items-end gap-3 -mb-px">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  cn(
                    "pb-3 pt-2 text-[14px] border-b-2 transition-colors",
                    isActive
                      ? "border-primary text-foreground font-medium"
                      : "border-transparent text-muted-foreground font-normal hover:text-foreground",
                  )
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {actions && <div className="flex items-center gap-2 mb-2">{actions}</div>}
      </div>
    </div>
  );
}
