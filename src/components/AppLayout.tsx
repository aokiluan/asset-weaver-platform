import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoSecundario from "@/assets/s3-logo-secundario.png";

function getInitials(email?: string | null) {
  if (!email) return "?";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  return letters.toUpperCase() || "?";
}

export default function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between gap-4 border-b bg-card px-6">
          {/* Empresa */}
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <img
              src={logoSecundario}
              alt="S3 Capital"
              className="h-9 w-auto object-contain shrink-0"
            />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[14px] font-semibold text-foreground truncate">
                S3 CAPITAL SECURITIZADORA S.A.
              </span>
              <span className="text-[12px] tabular-nums text-muted-foreground">
                60.353.126/0001-71
              </span>
            </div>
          </div>

          {/* Busca global (visual) */}
          <div className="flex-1 max-w-xl mx-auto hidden md:block">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar em todos…"
                className="pl-9 h-9 rounded-full bg-muted/60 border-transparent focus-visible:bg-card focus-visible:border-input"
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground relative"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
              <span
                aria-hidden
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card"
              />
            </Button>

            <div className="flex items-center gap-2 pl-1">
              <div
                className="h-8 w-8 rounded-full bg-primary/10 text-primary text-[12px] font-semibold flex items-center justify-center select-none"
                aria-hidden
              >
                {getInitials(user?.email)}
              </div>
              <span className="text-[13px] text-foreground hidden lg:inline max-w-[180px] truncate">
                {user?.email}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-[13px] text-muted-foreground hover:text-foreground"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sair
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
