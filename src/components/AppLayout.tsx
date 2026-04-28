import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AppLayout() {
  const { user, signOut, roles } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b bg-card px-3">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-xs text-muted-foreground hidden md:inline">
                {roles.length > 0 ? roles.join(" · ") : "Sem função atribuída"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground hidden sm:inline">{user?.email}</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={signOut}>
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
    </SidebarProvider>
  );
}
