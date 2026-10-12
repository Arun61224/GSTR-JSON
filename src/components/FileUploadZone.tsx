import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Trash2, Eye, Table } from 'lucide-react';
import { UploadedReportFile, detectFileType, normalizeHeader } from '../engine/gstEngine';
import Papa from 'papaparse';

interface FileUploadZoneProps {
  files: UploadedReportFile[];
  onFilesAdded: (newFiles: UploadedReportFile[]) => void;
  onRemoveFile: (fileId: string) => void;
  onPreviewFile: (file: UploadedReportFile) => void;
}

const REQUIRED_CATEGORIES = [
  { key: 'b2b', label: 'B2B / SEZ / DE', filename: 'b2b,sez,de.csv', desc: 'B2B Tax Invoices' },
  { key: 'b2cs', label: 'B2CS Summary', filename: 'b2cs.csv', desc: 'B2C Sales by POS & Rate' },
  { key: 'cdnr', label: 'CDNR Credit/Debit', filename: 'cdnr.csv', desc: 'Registered Notes' },
  { key: 'docs', label: 'Documents Issued', filename: 'docs.csv', desc: 'Outward Series & Cancelled' },
  { key: 'hsn_b2c', label: 'HSN (B2C)', filename: 'hsn(b2c).csv', desc: 'B2C Tariff Aggregation' },
  { key: 'hsn_b2b', label: 'HSN (B2B)', filename: 'hsn(b2b).csv', desc: 'B2B Tariff Aggregation' },
  { key: 'supeco', label: 'Supplies via ECO', filename: 'supplies_through_eco.csv', desc: 'Operator (Amazon/Flipkart)' },
];

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  files,
  onFilesAdded,
  onRemoveFile,
  onPreviewFile,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFiles = (rawFiles: FileList | File[]) => {
    const fileList = Array.from(rawFiles);
    const parsedFiles: UploadedReportFile[] = [];

    let processedCount = 0;
    fileList.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string) || '';
        const parsed = Papa.parse(content.trim(), { header: true, preview: 5 });
        const headers = parsed.meta.fields || [];
        const detected = detectFileType(headers, f.name);

        parsedFiles.push({
          id: `${f.name}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          filename: f.name,
          size: f.size,
          content,
          detectedType: detected,
          headers,
          rowCount: (content.match(/\n/g) || []).length,
        });

        processedCount++;
        if (processedCount === fileList.length) {
          onFilesAdded(parsedFiles);
        }
      };
      reader.readAsText(f, 'UTF-8');
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/70'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleProcessFiles(e.target.files);
          }}
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Drop Amazon Seller Central CSV reports here, or <span className="text-emerald-400 underline underline-offset-2">browse</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Supports UTF-8 BOM, auto-detects all 7 Amazon report types by column headers. Up to 100,000+ rows processed efficiently in chunks.
            </p>
          </div>
        </div>
      </div>

      {/* 7 Report Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {REQUIRED_CATEGORIES.map((cat) => {
          const matchedFile = files.find(f => f.detectedType === cat.key);
          const isLoaded = !!matchedFile;

          return (
            <div
              key={cat.key}
              className={`p-3 rounded-xl border flex flex-col justify-between transition ${
                isLoaded
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-slate-900/40 border-slate-800 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white tracking-wide">
                    {cat.label}
                  </span>
                  {isLoaded ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-600" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1" title={cat.filename}>
                  {cat.filename}
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                {isLoaded ? (
                  <>
                    <span className="text-emerald-400 font-mono font-medium">
                      {matchedFile.rowCount} rows
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewFile(matchedFile);
                        }}
                        className="text-slate-400 hover:text-white p-0.5"
                        title="Preview data"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFile(matchedFile.id);
                        }}
                        className="text-slate-400 hover:text-rose-400 p-0.5"
                        title="Remove file"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="text-slate-500 italic">Not loaded</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
