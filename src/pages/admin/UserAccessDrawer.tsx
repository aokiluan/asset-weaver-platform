import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { type AppRole, ROLE_LABEL, OPERACAO_ROLES } from "@/lib/roles";

const OTHER_MODULES: { key: string; label: string }[] = [
  { key: "gestao", label: "Gestão" },
  { key: "diretorio", label: "Diretório" },
  { key: "financeiro_mod", label: "Financeiro" },
  { key: "config", label: "Config" },
  { key: "bi", label: "BI" },
];

interface UserAccess {
  id: string;
  nome: string;
  email: string;
  roles: AppRole[];
  modules: Record<string, boolean>;
}

interface UserAccessDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UserAccess | null;
  onToggleAdmin: (next: boolean) => void;
  onToggleModule: (moduleKey: string, next: boolean) => void;
  onToggleRole: (role: AppRole, next: boolean) => void;
}

export function UserAccessDrawer({
  open,
  onOpenChange,
  user,
  onToggleAdmin,
  onToggleModule,
  onToggleRole,
}: UserAccessDrawerProps) {
  if (!user) return null;
  const isAdmin = user.roles.includes("admin");
  const operacaoOn = isAdmin || !!user.modules["operacao"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px] p-4 overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-[14px] font-medium leading-tight">
            {user.nome}
          </SheetTitle>
          <SheetDescription className="text-[11px] leading-none">
            {user.email}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 mt-4">
          {/* Admin global */}
          <div className="rounded-md border border-border p-2.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="text-[12px] font-medium leading-none">Administrador</div>
                <div className="text-[10px] text-muted-foreground leading-none">
                  Acesso global a todos os módulos
                </div>
              </div>
              <Switch checked={isAdmin} onCheckedChange={onToggleAdmin} />
            </div>
          </div>

          {/* Operação + funções */}
          <div className="rounded-md border border-border p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="text-[12px] font-medium leading-none">Operação</div>
                <div className="text-[10px] text-muted-foreground leading-none">
                  Pipeline de cedentes e propostas
                </div>
              </div>
              <Switch
                checked={operacaoOn}
                disabled={isAdmin}
                onCheckedChange={(v) => onToggleModule("operacao", !!v)}
              />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                Funções
              </div>
              <div className="flex flex-wrap gap-1">
                {OPERACAO_ROLES.map((r) => {
                  const checked = user.roles.includes(r);
                  const disabled = !operacaoOn;
                  return (
                    <button
                      key={r}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggleRole(r, !checked)}
                      className={`h-6 px-2 rounded-full border text-[11px] leading-none transition-colors ${
                        checked
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-foreground"
                      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {ROLE_LABEL[r]}
                    </button>
                  );
                })}
              </div>
              {!operacaoOn && (
                <div className="text-[10px] text-muted-foreground leading-tight">
                  Ative o módulo Operação para atribuir funções
                </div>
              )}
            </div>
          </div>

          {/* Outros módulos */}
          <div className="rounded-md border border-border p-2.5 space-y-2">
            <div className="text-[12px] font-medium leading-none">Outros módulos</div>
            <div className="space-y-1.5">
              {OTHER_MODULES.map((m) => {
                const checked = isAdmin || !!user.modules[m.key];
                return (
                  <div key={m.key} className="flex items-center justify-between gap-2">
                    <div className="text-[12px] leading-none">{m.label}</div>
                    <Switch
                      checked={checked}
                      disabled={isAdmin}
                      onCheckedChange={(v) => onToggleModule(m.key, !!v)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
