import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export interface CsvPreviewColumn<T> {
  label: string;
  get: (row: T) => string;
}

const MAX_PREVIEW_ROWS = 10;

export function CsvImportPreviewDialog<T>({
  open,
  rows,
  columns,
  title,
  description,
  confirmLabel,
  cancelLabel,
  moreLabel,
  importing,
  onConfirm,
  onCancel,
  testIdPrefix,
}: {
  open: boolean;
  rows: T[];
  columns: CsvPreviewColumn<T>[];
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  moreLabel: string;
  importing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testIdPrefix: string;
}) {
  const preview = rows.slice(0, MAX_PREVIEW_ROWS);
  const remaining = rows.length - preview.length;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !importing) onCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground" data-testid={`${testIdPrefix}-preview-count`}>
          {description}
        </p>
        <div className="max-h-[50vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
              <tr>
                {columns.map((c) => (
                  <th key={c.label} className="text-start px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-t border-gray-100 dark:border-gray-800" data-testid={`${testIdPrefix}-preview-row`}>
                  {columns.map((c) => (
                    <td key={c.label} className="px-3 py-2 max-w-[200px] truncate">{c.get(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {remaining > 0 && (
          <p className="text-xs text-muted-foreground">{moreLabel}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={importing} data-testid={`${testIdPrefix}-preview-cancel`}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} disabled={importing} className="gap-2" data-testid={`${testIdPrefix}-preview-confirm`}>
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
