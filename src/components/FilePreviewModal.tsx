import React from 'react';
import { X, FileText, CheckCircle2 } from 'lucide-react';
import { UploadedReportFile } from '../engine/gstEngine';
import Papa from 'papaparse';

interface FilePreviewModalProps {
  file: UploadedReportFile | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const parsed = Papa.parse(file.content.trim(), { header: true, preview: 15 });
  const headers = parsed.meta.fields || [];
  const rows = parsed.data as Record<string, string>[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{file.filename}</h3>
              <p className="text-xs text-slate-400">
                Type: <span className="text-emerald-400 font-mono">{file.detectedType.toUpperCase()}</span> • {file.rowCount} rows • {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column Detection Tags */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/40">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Detected Headers ({headers.length}):
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {headers.map((h, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300 font-mono"
              >
                {h}
              </span>
            ))}
          </div>
        </div>

        {/* Sample Rows Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400">
                <tr>
                  <th className="py-2 px-3">#</th>
                  {headers.map((h, i) => (
                    <th key={i} className="py-2 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20">
                    <td className="py-2 px-3 text-slate-500 font-sans">{idx + 1}</td>
                    {headers.map((h, i) => (
                      <td key={i} className="py-2 px-3 whitespace-nowrap text-slate-300">
                        {row[h] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-2">
            Showing first {rows.length} rows preview. Full file parsed accurately during GSTR-1 calculation.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
