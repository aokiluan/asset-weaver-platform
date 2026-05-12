import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  CEDENTE_FIELDS, CedenteFieldKey, ParsedRow, SheetData,
  autoMapColumns, buildTemplateXlsx, exportErrorsCsv, parseFile, validateRows,
} from "@/lib/cedentes-import";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
};

type Step = "upload" | "preview" | "importing";

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "preview", label: "Validação" },
];

export function CedenteImportDialog({ open, onOpenChange, onImported }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [mapping, setMapping] = useState<Record<number, CedenteFieldKey | "">>({});
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload"); setFileName(""); setSheet(null); setMapping({});
    setRows([]); setProgress(0); setImportedCount(0);
  };

  useEffect(() => { if (!open) reset(); }, [open]);

  const downloadTemplate = () => {
    const blob = buildTemplateXlsx();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "modelo-cedentes.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande", { description: "Limite de 5MB" });
      return;
    }
    try {
      const data = await parseFile(file);
      if (data.headers.length === 0 || data.rows.length === 0) {
        toast.error("Planilha vazia ou inválida"); return;
      }
      const autoMap = autoMapColumns(data.headers);
      const fields = Object.values(autoMap).filter(Boolean) as CedenteFieldKey[];
      if (!fields.includes("razao_social") || !fields.includes("cnpj")) {
        toast.error("Colunas obrigatórias ausentes", {
          description: "A planilha precisa ter colunas 'razao_social' e 'cnpj'. Baixe o modelo padrão.",
        });
        return;
      }
      setFileName(file.name);
      setSheet(data);
      setMapping(autoMap);
      const { data: existing } = await supabase.from("cedentes").select("cnpj");
      const existSet = new Set((existing ?? []).map((r: any) => (r.cnpj ?? "").replace(/\D/g, "")));
      setRows(validateRows(data, autoMap, existSet));
      setStep("preview");
    } catch (e: any) {
      toast.error("Erro ao ler arquivo", { description: e?.message });
    }
  };

  const summary = useMemo(() => {
    const valid = rows.filter((r) => r.status === "valid").length;
    const warning = rows.filter((r) => r.status === "warning").length;
    const error = rows.filter((r) => r.status === "error").length;
    return { valid, warning, error };
  }, [rows]);

  const doImport = async () => {
    const valids = rows.filter((r) => r.status === "valid").map((r) => r.mapped);
    if (valids.length === 0) return;
    setStep("importing"); setProgress(0); setImportedCount(0);
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < valids.length; i += batchSize) {
      const batch = valids.slice(i, i + batchSize);
      const { error } = await supabase.from("cedentes").insert(batch as any);
      if (error) {
        toast.error("Erro na importação", { description: error.message });
        setStep("preview"); return;
      }
      inserted += batch.length;
      setImportedCount(inserted);
      setProgress(Math.round((inserted / valids.length) * 100));
    }
    toast.success(`${inserted} cedente${inserted > 1 ? "s" : ""} importado${inserted > 1 ? "s" : ""}`);
    onImported?.();
    onOpenChange(false);
  };

  const downloadErrors = () => {
    const blob = exportErrorsCsv(rows);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cedentes-erros.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const currentStepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-base">Importar cedentes via planilha</DialogTitle>
          <DialogDescription className="text-xs">
            Baixe o modelo, preencha e envie. Aceita .xlsx e .csv (até 5MB).
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 text-[11px]">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                "size-5 rounded-full flex items-center justify-center text-[10px] font-medium",
                i < currentStepIdx || step === "importing"
                  ? "bg-primary text-primary-foreground"
                  : i === currentStepIdx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}>{i + 1}</div>
              <span className={cn(i === currentStepIdx ? "font-medium" : "text-muted-foreground")}>{s.label}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {step === "upload" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed rounded-md p-8 hover:bg-muted/30 transition-colors flex flex-col items-center gap-2"
            >
              <Upload className="size-6 text-muted-foreground" />
              <div className="text-[12px] font-medium">Clique para selecionar a planilha</div>
              <div className="text-[10px] text-muted-foreground">.xlsx ou .csv até 5MB</div>
            </button>
            <input
              ref={fileRef} type="file" accept=".xlsx,.csv,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
            <div className="flex items-center justify-between rounded-md border p-2.5 bg-muted/20">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-3.5 text-muted-foreground" />
                <span className="text-[11px]">Não tem o modelo? Baixe a planilha padrão.</span>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={downloadTemplate}>
                <Download className="size-3.5 mr-1" /> Baixar modelo
              </Button>
            </div>
          </div>
        )}

        {/* mapeamento removido — auto-map a partir dos headers do modelo */}

        {step === "preview" && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-[11px]">
              <Badge variant="default" className="gap-1"><CheckCircle2 className="size-3" />{summary.valid} válidas</Badge>
              <Badge variant="secondary" className="gap-1"><AlertTriangle className="size-3" />{summary.warning} ignoradas</Badge>
              <Badge variant="destructive" className="gap-1"><X className="size-3" />{summary.error} com erro</Badge>
              {summary.error > 0 && (
                <Button size="sm" variant="ghost" className="h-6 text-[11px] ml-auto" onClick={downloadErrors}>
                  <Download className="size-3 mr-1" /> Exportar erros
                </Button>
              )}
            </div>
            <div className="border rounded-md max-h-[360px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5 w-8">#</th>
                    <th className="text-left px-2 py-1.5 w-8"></th>
                    <th className="text-left px-2 py-1.5">Razão social</th>
                    <th className="text-left px-2 py-1.5">CNPJ</th>
                    <th className="text-left px-2 py-1.5">Status / Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowIndex} className="border-t hover:bg-muted/20">
                      <td className="px-2 py-1 text-muted-foreground tabular-nums">{r.rowIndex}</td>
                      <td className="px-2 py-1">
                        {r.status === "valid" && <CheckCircle2 className="size-3.5 text-green-600" />}
                        {r.status === "warning" && <AlertTriangle className="size-3.5 text-yellow-600" />}
                        {r.status === "error" && <X className="size-3.5 text-destructive" />}
                      </td>
                      <td className="px-2 py-1 truncate max-w-[220px]">{r.mapped.razao_social || r.raw.razao_social || "—"}</td>
                      <td className="px-2 py-1 font-mono text-[10px]">{r.mapped.cnpj || r.raw.cnpj || "—"}</td>
                      <td className="px-2 py-1 text-muted-foreground">
                        {[...r.errors, ...r.warnings].join(" · ") || "OK"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-3 py-4">
            <div className="text-[12px] text-center">Importando {importedCount} de {summary.valid}...</div>
            <Progress value={progress} />
          </div>
        )}

        <DialogFooter className="gap-2">
          {step !== "importing" && (
            <Button variant="ghost" className="h-7 text-[12px]" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" className="h-7 text-[12px]" onClick={() => setStep("upload")}>Voltar</Button>
              <Button className="h-7 text-[12px]" disabled={summary.valid === 0} onClick={doImport}>
                Importar {summary.valid} cedente{summary.valid !== 1 ? "s" : ""}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
