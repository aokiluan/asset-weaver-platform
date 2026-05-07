import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, RefreshCw, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type DriveFile = {
  id: string;
  name: string;
  webUrl?: string;
  size?: number;
  lastModifiedDateTime?: string;
  parentReference?: { path?: string };
};

type Worksheet = { id: string; name: string; position: number };

type SheetData = {
  values: any[][];
  rowCount: number;
  columnCount: number;
  address?: string;
};

async function callGraph<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("excel-graph", { body: payload });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

const formatBytes = (n?: number) => {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const formatCell = (v: any) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1000 || !Number.isInteger(v)) {
      return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    }
  }
  return String(v);
};

export default function Financeiro() {
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");

  const filesQuery = useQuery({
    queryKey: ["excel-files"],
    queryFn: () => callGraph<{ files: DriveFile[] }>({ action: "list" }),
  });

  const worksheetsQuery = useQuery({
    queryKey: ["excel-worksheets", selectedFile?.id],
    enabled: !!selectedFile?.id,
    queryFn: () =>
      callGraph<{ worksheets: Worksheet[] }>({ action: "worksheets", itemId: selectedFile!.id }),
  });

  const sheetQuery = useQuery({
    queryKey: ["excel-sheet", selectedFile?.id, selectedSheet],
    enabled: !!selectedFile?.id && !!selectedSheet,
    queryFn: () =>
      callGraph<SheetData>({ action: "read", itemId: selectedFile!.id, worksheet: selectedSheet }),
  });

  const filteredFiles = useMemo(() => {
    const list = filesQuery.data?.files ?? [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((f) => f.name.toLowerCase().includes(s));
  }, [filesQuery.data, search]);

  const worksheets = worksheetsQuery.data?.worksheets ?? [];

  // Auto-select first sheet when file changes
  if (worksheets.length > 0 && !selectedSheet) {
    setSelectedSheet(worksheets[0].name);
  }

  const handleSelectFile = (file: DriveFile) => {
    setSelectedFile(file);
    setSelectedSheet("");
  };

  const error =
    (filesQuery.error as Error | undefined)?.message ||
    (worksheetsQuery.error as Error | undefined)?.message ||
    (sheetQuery.error as Error | undefined)?.message;

  if (error) {
    // Surface once via toast
    if (filesQuery.isError) toast.error(error);
  }

  const headerRow: any[] = sheetQuery.data?.values?.[0] ?? [];
  const dataRows: any[][] = sheetQuery.data?.values?.slice(1) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Conectado ao OneDrive — selecione uma planilha para visualizar.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => filesQuery.refetch()}
          disabled={filesQuery.isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${filesQuery.isFetching ? "animate-spin" : ""}`} />
          Atualizar lista
        </Button>
      </div>

      {error && filesQuery.isError && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">
            Erro ao acessar o OneDrive: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planilhas no OneDrive</CardTitle>
            <CardDescription>
              {filesQuery.isLoading ? "Carregando..." : `${filteredFiles.length} arquivo(s)`}
            </CardDescription>
            <div className="relative pt-2">
              <Search className="absolute left-2 top-4 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar planilha..."
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[60vh] overflow-y-auto space-y-1">
            {filteredFiles.map((f) => (
              <button
                key={f.id}
                onClick={() => handleSelectFile(f)}
                className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                  selectedFile?.id === f.id
                    ? "bg-accent border-primary"
                    : "hover:bg-muted/50 border-transparent"
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileSpreadsheet className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{formatBytes(f.size)}</span>
                      {f.lastModifiedDateTime && (
                        <span>· {format(new Date(f.lastModifiedDateTime), "dd/MM/yyyy")}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {!filesQuery.isLoading && filteredFiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma planilha encontrada.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base truncate">
                  {selectedFile?.name ?? "Selecione uma planilha"}
                </CardTitle>
                <CardDescription>
                  {sheetQuery.data
                    ? `${sheetQuery.data.rowCount} linhas × ${sheetQuery.data.columnCount} colunas`
                    : selectedFile
                    ? "Carregando dados..."
                    : "Os dados aparecerão aqui."}
                </CardDescription>
              </div>
              {selectedFile?.webUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={selectedFile.webUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir no Excel
                  </a>
                </Button>
              )}
            </div>
            {worksheets.length > 0 && (
              <div className="pt-2">
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Selecione a aba" />
                  </SelectTrigger>
                  <SelectContent>
                    {worksheets.map((w) => (
                      <SelectItem key={w.id} value={w.name}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selectedFile && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Selecione uma planilha à esquerda para visualizar os dados.
              </div>
            )}
            {selectedFile && sheetQuery.isLoading && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Carregando dados da planilha...
              </div>
            )}
            {sheetQuery.error && (
              <div className="text-sm text-destructive py-4">
                Erro ao carregar a aba: {(sheetQuery.error as Error).message}
              </div>
            )}
            {sheetQuery.data && headerRow.length > 0 && (
              <div className="overflow-auto max-h-[60vh] border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {headerRow.map((h, i) => (
                        <TableHead key={i} className="whitespace-nowrap">
                          {formatCell(h)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataRows.slice(0, 500).map((row, ri) => (
                      <TableRow key={ri}>
                        <TableCell className="text-muted-foreground">{ri + 2}</TableCell>
                        {row.map((c, ci) => (
                          <TableCell key={ci} className="whitespace-nowrap">
                            {formatCell(c)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {dataRows.length > 500 && (
                  <div className="p-3 text-xs text-muted-foreground border-t">
                    Exibindo as primeiras 500 linhas de {dataRows.length}.{" "}
                    <Badge variant="outline">Pré-visualização</Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
