interface Props {
  lastSavedAt: Date | null;
  restored?: boolean;
  onDiscard?: () => void;
  className?: string;
}

// Indicador de rascunho desativado por preferência visual.
// Autosave continua funcionando via useFormDraft.
export function DraftIndicator(_props: Props) {
  return null;
}
