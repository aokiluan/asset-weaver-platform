import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isAdvance, STAGE_LABEL, type InvestorStage } from "@/lib/investor-contacts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactName: string;
  fromStage: InvestorStage;
  toStage: InvestorStage;
  onConfirm: () => void;
}

export function ConfirmStageMoveDialog({
  open,
  onOpenChange,
  contactName,
  fromStage,
  toStage,
  onConfirm,
}: Props) {
  const advancing = isAdvance(fromStage, toStage);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[14px]">Confirmar movimentação</AlertDialogTitle>
          <AlertDialogDescription className="text-[12px] leading-tight">
            Mover <span className="font-medium text-foreground">{contactName}</span> de{" "}
            <span className="font-medium text-foreground">{STAGE_LABEL[fromStage]}</span> para{" "}
            <span className="font-medium text-foreground">{STAGE_LABEL[toStage]}</span>?
            {advancing && (
              <span className="block mt-2 text-primary">
                O último contato será atualizado para hoje.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-1">
          <AlertDialogCancel className="h-7 text-[12px]">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="h-7 text-[12px]"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
