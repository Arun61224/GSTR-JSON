import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Trash2, Eye, Tag, ChevronDown } from 'lucide-react';
import { UploadedReportFile, detectFileType } from '../engine/gstEngine';
import Papa from 'papaparse';

interface FileUploadZoneProps {
  files: UploadedReportFile[];
  onFilesAdded: (newFiles: UploadedReportFile[]) => void;
  onRemoveFile: (fileId: string) => void;
  onPreviewFile: (file: UploadedReportFile) => void;
  onUpdateFileType?: (fileId: string, newType: UploadedReportFile['detectedType']) => void;
}

const SECTION_OPTIONS: { value: UploadedReportFile['detectedType']; label: string }[] = [
  { value: 'b2b', label: 'B2B / SEZ / DE Invoices' },
  { value: 'b2cs', label: 'B2CS Summary (B2C Small)' },
  { value: 'cdnr', label: 'CDNR (Credit / Debit Notes)' },
  { value: 'docs', label: 'Documents Issued Register' },
  { value: 'hsn_b2c', label: 'HSN Summary (B2C)' },
  { value: 'hsn_b2b', label: 'HSN Summary (B2B)' },
  { value: 'supeco', label: 'Supplies via ECO (Amazon)' },
  { value: 'unknown', label: 'Unclassified / Other' },
];

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  files,
  onFilesAdded,
  onRemoveFile,
  onPreviewFile,
  onUpdateFileType,
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-5">
      {/* Upload Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-7 sm:p-10 text-center transition-all cursor-pointer ${
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
              Drop your Amazon Seller Central GST reports here, or{' '}
              <span className="text-emerald-400 underline underline-offset-2">
                browse files
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-lg mx-auto">
              Auto-detects section by column headers and contents. Upload all your monthly reports at once or individually.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[11px] text-slate-500">
            <span>Supports: B2B</span>
            <span>•</span>
            <span>B2CS</span>
            <span>•</span>
            <span>Credit/Debit Notes</span>
            <span>•</span>
            <span>Documents Register</span>
            <span>•</span>
            <span>HSN Summaries</span>
            <span>•</span>
            <span>ECO Supplies</span>
          </div>
        </div>
      </div>

      {/* Only Show Uploaded Files List if files exist */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Uploaded Files ({files.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Auto-classified based on report column headers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className="text-xs font-semibold text-white truncate font-mono"
                        title={file.filename}
                      >
                        {file.filename}
                      </span>
                    </div>

                    <button
                      onClick={() => onRemoveFile(file.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                    <span className="font-mono text-emerald-400 font-medium">
                      {file.rowCount.toLocaleString()} rows
                    </span>
                    <span>•</span>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                </div>

                {/* Section Mapping Dropdown */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                    <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                    <select
                      value={file.detectedType}
                      onChange={(e) =>
                        onUpdateFileType &&
                        onUpdateFileType(
                          file.id,
                          e.target.value as UploadedReportFile['detectedType']
                        )
                      }
                      className="bg-slate-950/80 border border-slate-800 text-[11px] text-slate-200 rounded-lg px-2 py-1 outline-none w-full truncate font-medium cursor-pointer"
                    >
                      {SECTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => onPreviewFile(file)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition cursor-pointer shrink-0"
                    title="Preview file headers and data"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
