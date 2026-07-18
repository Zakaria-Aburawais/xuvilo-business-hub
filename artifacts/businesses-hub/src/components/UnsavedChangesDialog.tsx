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
import { Button } from "@/components/ui/button";

interface UnsavedChangesDialogProps {
  open: boolean;
  lang: string;
  onStay: () => void;
  onLeave: () => void;
  /** Optional: save the document, then leave if the save succeeded. */
  onSaveAndLeave?: () => void | Promise<void>;
  saving?: boolean;
}

export function UnsavedChangesDialog({
  open,
  lang,
  onStay,
  onLeave,
  onSaveAndLeave,
  saving,
}: UnsavedChangesDialogProps) {
  const ar = lang === "ar";
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onStay(); }}>
      <AlertDialogContent dir={ar ? "rtl" : "ltr"}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {ar ? "المغادرة دون حفظ؟" : "Leave without saving?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {ar
              ? "لديك تغييرات غير محفوظة. إذا غادرت الآن فستفقد هذه التغييرات."
              : "You have unsaved changes. If you leave now, these changes will be lost."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay}>
            {ar ? "البقاء" : "Stay"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onLeave}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {ar ? "المغادرة" : "Leave"}
          </AlertDialogAction>
          {onSaveAndLeave && (
            <Button onClick={() => void onSaveAndLeave()} disabled={saving}>
              {saving
                ? (ar ? "جارٍ الحفظ..." : "Saving...")
                : (ar ? "حفظ ومغادرة" : "Save & leave")}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
