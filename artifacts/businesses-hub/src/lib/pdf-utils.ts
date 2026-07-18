// Utilities for printing (CSS @media print approach)
export function printDocument(printAreaId: string) {
  const printArea = document.getElementById(printAreaId);
  if (!printArea) return;

  const printContents = printArea.innerHTML;
  const originalContents = document.body.innerHTML;

  document.body.innerHTML = `
    <html>
      <head>
        <title>Print</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Cairo', 'Inter', sans-serif; margin: 0; padding: 20px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>${printContents}</body>
    </html>
  `;

  window.print();
  document.body.innerHTML = originalContents;
  window.location.reload();
}

// Re-export from new comprehensive currencies file for backward compatibility
export { ALL_CURRENCIES as CURRENCIES_LIST, getCurrencySymbol } from "./currencies";
