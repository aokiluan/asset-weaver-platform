Espelhar o padrão do `CedenteVisitReportForm` (Comercial) no `CreditReportForm` (Crédito). Apenas o arquivo `src/components/credito/CreditReportForm.tsx` será modificado.

## Mudanças

1. **Header — título e subtítulo**
   - "Relatório estruturado de crédito" → **"Relatório de crédito"**.
   - "Preencha as 8 seções para liberar envio ao comitê." → **"Inclui análise estruturada, due diligence e pleito de crédito."**

2. **Header — remover do topo**
   - Remover o botão **"Cancelar"** (modo edit) do header.
   - Remover o `<DraftIndicator />` do header.

3. **Card "Motivo da alteração"**
   - Trocar `rounded-lg border bg-card p-4 space-y-0.5` por `border rounded-md p-3 bg-muted/30 space-y-2`.
   - Trocar `<Label htmlFor="motivo-alteracao" className="text-sm">Motivo da alteração <span className="text-destructive">*</span></Label>` por `<Label>Motivo da alteração *</Label>` (sem id/htmlFor).

4. **Rodapé — novo bloco no padrão Comercial**
   - Substituir o bloco atual:
     ```tsx
     {canEdit && (mode === "create" || mode === "edit") && (
       <div className="flex justify-end pt-2">
         <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">…</Button>
       </div>
     )}
     ```
   - Por:
     ```tsx
     {canEdit && (mode === "create" || mode === "edit") && (
       <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
         <DraftIndicator
           lastSavedAt={lastSavedAt}
           restored={restored}
           onDiscard={() => discardDraft(emptyReport(cedenteId, proposalId))}
         />
         <div className="flex items-center gap-2">
           {mode === "edit" && (
             <Button variant="ghost" onClick={handleCancelarEdicao} disabled={saving}>
               <X className="h-4 w-4 mr-2" /> Cancelar
             </Button>
           )}
           <Button onClick={save} disabled={saving}>
             {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
             {mode === "edit" ? "Salvar nova versão" : "Salvar relatório"}
           </Button>
         </div>
       </div>
     )}
     ```

Resultado: o header fica idêntico ao do Comercial (sem Cancelar e sem DraftIndicator), e o rodapé reúne `DraftIndicator` + `Cancelar` + `Salvar` no mesmo padrão.