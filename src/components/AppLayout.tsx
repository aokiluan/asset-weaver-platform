import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between border-b bg-card px-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[13px] font-semibold uppercase tracking-wide text-foreground truncate">
                S3 Capital Securitizadora S.A.
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                60.353.126/0001-71
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Notificações"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <span className="text-xs text-foreground hidden md:inline px-1">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={signOut}
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sair
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
