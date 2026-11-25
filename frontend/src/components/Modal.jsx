import React from 'react';
import { X, Printer } from 'lucide-react';

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-4xl', onPrint }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm no-print-bg">
      <div className={`relative w-full ${maxWidth} max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl print-sheet`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 no-print">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                onClick={onPrint}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
