import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { type AppRole, ROLE_LABEL, PRIMARY_ROLES } from "@/lib/roles";

const ALL_ROLES: AppRole[] = [...PRIMARY_ROLES, "gestor_geral"];

interface UserRolesDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: { id: string; nome: string; email: string; roles: AppRole[] } | null;
  onAdd: (role: AppRole) => void;
  onRemove: (role: AppRole) => void;
}

export function UserRolesDrawer({
  open,
  onOpenChange,
  user,
  onAdd,
  onRemove,
}: UserRolesDrawerProps) {
  if (!user) return null;
  const available = ALL_ROLES.filter((r) => !user.roles.includes(r));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px] p-4">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-[14px] font-medium leading-tight">
            {user.nome}
          </SheetTitle>
          <SheetDescription className="text-[11px] leading-none">
            {user.email}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 mt-4">
          <div className="space-y-1.5">
            <div className="text-[10px] leading-none uppercase tracking-wide text-muted-foreground">
              Funções atribuídas
            </div>
            <div className="flex flex-wrap gap-1 min-h-[28px]">
              {user.roles.length === 0 && (
                <span className="text-[11px] text-muted-foreground leading-tight">
                  Nenhuma função atribuída
                </span>
              )}
              {user.roles.map((r) => (
                <Badge
                  key={r}
                  variant="secondary"
                  className="gap-1 h-5 px-1.5 text-[11px] font-normal"
                >
                  {ROLE_LABEL[r]}
                  <button
                    onClick={() => onRemove(r)}
                    className="hover:text-destructive"
                    aria-label={`Remover função ${ROLE_LABEL[r]}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] leading-none uppercase tracking-wide text-muted-foreground">
              Atribuir nova função
            </div>
            <Select
              value=""
              onValueChange={(v) => onAdd(v as AppRole)}
              disabled={available.length === 0}
            >
              <SelectTrigger className="h-7 text-[12px]">
                <SelectValue
                  placeholder={
                    available.length === 0
                      ? "Todas as funções já atribuídas"
                      : "Selecione uma função"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {available.map((r) => (
                  <SelectItem key={r} value={r} className="text-[12px]">
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
