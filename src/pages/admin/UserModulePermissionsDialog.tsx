import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { MODULES } from "./ModulePermissionsMatrix";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userIsAdmin: boolean;
}

export default function UserModulePermissionsDialog({ open, onOpenChange, userId, userName, userIsAdmin }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("user_module_permissions")
        .select("module_key, enabled")
        .eq("user_id", userId);
      if (error) {
        toast.error("Erro ao carregar", { description: error.message });
      } else {
        const map: Record<string, boolean> = {};
        for (const r of (data ?? []) as { module_key: string; enabled: boolean }[]) {
          map[r.module_key] = r.enabled;
        }
        setPerms(map);
      }
      setLoading(false);
    })();
  }, [open, userId]);

  async function toggle(moduleKey: string, value: boolean) {
    const prev = perms[moduleKey] ?? false;
    setPerms((p) => ({ ...p, [moduleKey]: value }));
    const { error } = await (supabase as any)
      .from("user_module_permissions")
      .upsert(
        {
          user_id: userId,
          module_key: moduleKey,
          enabled: value,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module_key" },
      );
    if (error) {
      setPerms((p) => ({ ...p, [moduleKey]: prev }));
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    qc.invalidateQueries({ queryKey: ["user-module-permissions"] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[14px]">Permissões de {userName}</DialogTitle>
          <DialogDescription className="text-[11px]">
            {userIsAdmin
              ? "Admin sempre tem acesso total a todos os módulos."
              : "Marque os módulos do menu que este usuário pode enxergar. Padrão: bloqueado."}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="space-y-1.5">
            {MODULES.map((m) => {
              const checked = userIsAdmin ? true : perms[m.key] ?? false;
              return (
                <label
                  key={m.key}
                  className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 cursor-pointer"
                >
                  <span className="text-[12px] font-medium">{m.label}</span>
                  <Switch
                    checked={checked}
                    disabled={userIsAdmin}
                    onCheckedChange={(v) => toggle(m.key, !!v)}
                  />
                </label>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
