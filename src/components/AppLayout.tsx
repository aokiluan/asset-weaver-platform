import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoSecundario from "@/assets/s3-logo-secundario.png";

export default function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src={logoSecundario}
              alt="S3 Capital"
              className="h-10 w-auto object-contain shrink-0"
            />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[15px] font-semibold text-foreground truncate">
                S3 CAPITAL SECURITIZADORA S.A.
              </span>
              <span className="text-[13px] tabular-nums text-muted-foreground">
                60.353.126/0001-71
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
            </Button>
            <span className="text-[13px] text-foreground hidden md:inline px-1">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-[13px]"
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
