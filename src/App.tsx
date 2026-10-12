/**
 * GSTR-1 JSON Generator for Amazon Sellers
 * Complete professional dashboard supporting multi-GSTIN segregation,
 * validation, reconciliation, JSON offline utility generation, and export packages.
 */

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Layers,
  AlertTriangle,
  Scale,
  Code,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileDown,
  Archive,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

import { Header } from './components/Header';
import { GstinSelector } from './components/GstinSelector';
import { FileUploadZone } from './components/FileUploadZone';
import { ValidationView } from './components/ValidationView';
import { ReconciliationView } from './components/ReconciliationView';
import { JsonViewer } from './components/JsonViewer';
import { AuditTrailView } from './components/AuditTrailView';
import { FilePreviewModal } from './components/FilePreviewModal';

import {
  UploadedReportFile,
  processReportsLocally,
  ProcessGSTR1Result,
  STATE_CODE_MAP,
} from './engine/gstEngine';
import { SAMPLE_TEMPLATES } from './data/sampleTemplates';
import {
  downloadSingleGstr1Json,
  downloadAllInZip,
  downloadValidationCsv,
  downloadAuditCsv,
  downloadReconciliationCsv,
} from './utils/exportUtils';

// User's registered 17 GSTINs across 17 states (PAN: ABAFV0462G)
const DEFAULT_USER_GSTINS: string[] = [
  '27ABAFV0462G1ZB', // Maharashtra (27)
  '33ABAFV0462G1ZI', // Tamil Nadu (33)
  '36ABAFV0462G1ZC', // Telangana (36)
  '06ABAFV0462G1ZF', // Haryana (06)
  '19ABAFV0462G1Z8', // West Bengal (19)
  '29ABAFV0462G1Z7', // Karnataka (29)
  '09ABAFV0462G1Z9', // Uttar Pradesh (09)
  '03ABAFV0462G1ZL', // Punjab (03)
  '21ABAFV0462G1ZN', // Odisha (21)
  '37ABAFV0462G1ZA', // Andhra Pradesh (37)
  '24ABAFV0462G1ZH', // Gujarat (24)
  '23ABAFV0462G1ZJ', // Madhya Pradesh (23)
  '08ABAFV0462G1ZB', // Rajasthan (08)
  '32ABAFV0462G1ZK', // Kerala (32)
  '18ABAFV0462G1ZA', // Assam (18)
  '20ABAFV0462G1ZP', // Jharkhand (20)
  '10ABAFV0462G1ZQ', // Bihar (10)
];

export default function App() {
  // State
  const [files, setFiles] = useState<UploadedReportFile[]>([]);
  const [gstinList, setGstinList] = useState<string[]>(DEFAULT_USER_GSTINS);
  const [selectedGstin, setSelectedGstin] = useState<string>('27ABAFV0462G1ZB');
  const [filingPeriod, setFilingPeriod] = useState<string>('092026');
  const [activeTab, setActiveTab] = useState<
    'files' | 'validation' | 'reconciliation' | 'json' | 'audit' | 'download'
  >('files');
  const [previewFile, setPreviewFile] = useState<UploadedReportFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-process whenever files, selected GSTIN, or filing period change
  const currentResult: ProcessGSTR1Result = useMemo(() => {
    return processReportsLocally(files, selectedGstin, filingPeriod);
  }, [files, selectedGstin, filingPeriod]);

  // Compute multi-GSTIN batch results for ZIP export
  const allGstinResults: ProcessGSTR1Result[] = useMemo(() => {
    return gstinList.map((g) => processReportsLocally(files, g, filingPeriod));
  }, [files, gstinList, filingPeriod]);

  // Check if other GSTINs have data when current GSTIN has 0 records
  const gstinWithMostData = useMemo(() => {
    if (currentResult.total_records_processed > 0) return null;
    let bestGstin: string | null = null;
    let maxRecords = 0;
    for (const res of allGstinResults) {
      if (res.total_records_processed > maxRecords) {
        maxRecords = res.total_records_processed;
        bestGstin = res.seller_gstin;
      }
    }
    return bestGstin ? { gstin: bestGstin, count: maxRecords } : null;
  }, [currentResult, allGstinResults]);

  // Handle manual loading of sample templates when user clicks the button
  const handleLoadSampleData = () => {
    setIsProcessing(true);
    const sampleFilesWithId: UploadedReportFile[] = SAMPLE_TEMPLATES.map(
      (t) => ({
        ...t,
        id: `sample_${t.detectedType}`,
      })
    );
    setFiles(sampleFilesWithId);
    setSelectedGstin('37ABAFV0462G1ZA');
    setFilingPeriod('092026');
    setTimeout(() => {
      setIsProcessing(false);
    }, 200);
  };

  const handleReset = () => {
    setFiles([]);
  };

  const handleUpdateFileType = (
    fileId: string,
    newType: UploadedReportFile['detectedType']
  ) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, detectedType: newType } : f))
    );
  };

  const handleFilesAdded = (newFiles: UploadedReportFile[]) => {
    setFiles((prev) => {
      // Replace existing file of same detected type or append
      const existingTypes = new Set(newFiles.map((n) => n.detectedType));
      const filteredPrev = prev.filter(
        (p) => !existingTypes.has(p.detectedType)
      );
      const combined = [...filteredPrev, ...newFiles];

      // Auto-switch to the GSTIN that contains data
      setTimeout(() => {
        let bestG = '';
        let maxCount = 0;
        for (const g of gstinList) {
          const res = processReportsLocally(combined, g, filingPeriod);
          if (res.total_records_processed > maxCount) {
            maxCount = res.total_records_processed;
            bestG = g;
          }
        }
        if (bestG) {
          setSelectedGstin(bestG);
        }
      }, 50);

      return combined;
    });
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAddGstin = (newGstin: string) => {
    if (!gstinList.includes(newGstin)) {
      setGstinList((prev) => [...prev, newGstin]);
    }
    setSelectedGstin(newGstin);
  };

  const handleRemoveGstin = (gstinToRemove: string) => {
    const updated = gstinList.filter((g) => g !== gstinToRemove);
    setGstinList(updated);
    if (selectedGstin === gstinToRemove) {
      setSelectedGstin(updated[0] || '');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const errorsCount = currentResult.validation_summary.errors;

  return (
    <div className="min-h-screen bg-[#090d14] text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-black">
      {/* App Header */}
      <Header
        filingPeriod={filingPeriod}
        selectedGstin={selectedGstin}
        onLoadSampleData={handleLoadSampleData}
        onReset={handleReset}
        isLoading={isProcessing}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        {/* Registration & Period Control */}
        <GstinSelector
          gstinList={gstinList}
          selectedGstin={selectedGstin}
          onSelectGstin={setSelectedGstin}
          onAddGstin={handleAddGstin}
          onRemoveGstin={handleRemoveGstin}
          filingPeriod={filingPeriod}
          onChangeFilingPeriod={setFilingPeriod}
          gstinRecordCounts={currentResult.gstin_record_counts}
        />

        {/* GSTIN Switcher Prompt if another GSTIN has records */}
        {gstinWithMostData && (
          <div className="bg-teal-950/40 border border-teal-500/40 p-3.5 rounded-xl flex items-center justify-between text-xs text-teal-200">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                Uploaded report contains {gstinWithMostData.count} records for{' '}
                <strong className="font-mono text-white">
                  {gstinWithMostData.gstin} (
                  {STATE_CODE_MAP[gstinWithMostData.gstin.slice(0, 2)] || 'State'}
                  )
                </strong>
                .
              </span>
            </div>
            <button
              onClick={() => setSelectedGstin(gstinWithMostData.gstin)}
              className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold flex items-center space-x-1 transition cursor-pointer"
            >
              <span>Switch to this GSTIN</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Status Notification Banner */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            errorsCount > 0
              ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              : files.length === 0
              ? 'bg-slate-900/60 border-slate-800 text-slate-400'
              : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            {errorsCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : files.length === 0 ? (
              <Layers className="w-5 h-5 text-slate-500 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}

            <div>
              <div className="text-sm font-bold text-white flex items-center space-x-2">
                <span>
                  {errorsCount > 0
                    ? `${errorsCount} Error(s) Preventing JSON Generation`
                    : files.length === 0
                    ? 'No Reports Loaded Yet'
                    : 'GSTR-1 JSON Return Ready for Offline Utility'}
                </span>
                {files.length > 0 && errorsCount === 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    GSTN Offline v3.1 Compliant
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {errorsCount > 0
                  ? 'Review the Validation tab for actionable guidance on row-level corrections.'
                  : files.length === 0
                  ? 'Upload your Amazon Seller Central GST reports to generate GSTR-1 returns.'
                  : `Active GSTIN: ${selectedGstin} (${
                      STATE_CODE_MAP[selectedGstin.slice(0, 2)] || ''
                    }) • Taxable Supplies: ${formatCurrency(
                      currentResult.reconciliation.grand_totals
                        .total_taxable_value
                    )} • Total Tax: ${formatCurrency(
                      currentResult.reconciliation.grand_totals.total_tax
                    )}`}
              </p>
            </div>
          </div>

          {errorsCount === 0 && files.length > 0 && (
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => downloadSingleGstr1Json(currentResult)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/40 transition cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download .JSON</span>
              </button>

              <button
                onClick={() => downloadAllInZip(allGstinResults)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
                title="Download ZIP containing JSONs for all seller GSTINs + Audit CSVs"
              >
                <Archive className="w-3.5 h-3.5 text-teal-400" />
                <span>All GSTINs (.ZIP)</span>
              </button>
            </div>
          )}
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center space-x-1 border-b border-slate-800 overflow-x-auto pb-px">
          {[
            {
              id: 'files',
              label: 'Upload & Files',
              icon: FileSpreadsheet,
              count: files.length,
            },
            {
              id: 'validation',
              label: 'Validation',
              icon: AlertTriangle,
              count: currentResult.validation_summary.total,
              badgeColor:
                errorsCount > 0
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-slate-800 text-slate-400',
            },
            {
              id: 'reconciliation',
              label: 'Reconciliation',
              icon: Scale,
              badge: 'Balance',
            },
            { id: 'json', label: 'GSTR-1 JSON', icon: Code },
            {
              id: 'audit',
              label: 'Audit Trail',
              icon: ShieldCheck,
              count: currentResult.audit_log.length,
            },
            { id: 'download', label: 'Exports & Downloads', icon: Download },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      tab.badgeColor || 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="pt-2">
          {activeTab === 'files' && (
            <FileUploadZone
              files={files}
              onFilesAdded={handleFilesAdded}
              onRemoveFile={handleRemoveFile}
              onPreviewFile={(f) => setPreviewFile(f)}
              onUpdateFileType={handleUpdateFileType}
            />
          )}

          {activeTab === 'validation' && (
            <ValidationView issues={currentResult.validation_summary.issues} />
          )}

          {activeTab === 'reconciliation' && (
            <ReconciliationView result={currentResult} />
          )}

          {activeTab === 'json' && <JsonViewer result={currentResult} />}

          {activeTab === 'audit' && (
            <AuditTrailView
              auditLog={currentResult.audit_log}
              sellerGstin={selectedGstin}
              filingPeriod={filingPeriod}
            />
          )}

          {activeTab === 'download' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: GSTR-1 JSON */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Code className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    GSTR-1 Offline JSON
                  </h4>
                  <p className="text-xs text-slate-400">
                    Official JSON file formatted specifically for direct upload
                    to the GST Portal offline utility tool.
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 pt-2">
                    File: GSTR1_{selectedGstin}_{filingPeriod}.json
                  </div>
                </div>
                <button
                  onClick={() => downloadSingleGstr1Json(currentResult)}
                  disabled={!currentResult.can_generate}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download .JSON</span>
                </button>
              </div>

              {/* Card 2: All GSTINs ZIP */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Archive className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Complete Return Package (.ZIP)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Bundles GSTR-1 JSON files for all {gstinList.length} GSTIN
                    registrations, audit CSVs, and validation summary files.
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 pt-2">
                    Contains: {gstinList.length} JSONs + CSVs + Instructions
                  </div>
                </div>
                <button
                  onClick={() => downloadAllInZip(allGstinResults)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  <Archive className="w-4 h-4 text-teal-400" />
                  <span>Download All-in-One (.ZIP)</span>
                </button>
              </div>

              {/* Card 3: Validation CSV */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Validation Report (.CSV)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Export all errors, warnings, and informational signals with
                    source row numbers and suggested fixes.
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 pt-2">
                    Total Issues: {currentResult.validation_summary.total}
                  </div>
                </div>
                <button
                  onClick={() => downloadValidationCsv(currentResult)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Download Validation CSV</span>
                </button>
              </div>

              {/* Card 4: Reconciliation Summary CSV */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Reconciliation Summary (.CSV)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Section-wise tax breakdown with taxable values, IGST, CGST,
                    SGST, and Cess totals.
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 pt-2">
                    Sections: B2B, B2CS, CDNR, DOCS, HSN, ECO
                  </div>
                </div>
                <button
                  onClick={() => downloadReconciliationCsv(currentResult)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Download Reconciliation CSV</span>
                </button>
              </div>

              {/* Card 5: Audit Trail CSV */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Audit Trail (.CSV)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Granular record-level audit trail linking every invoice line
                    and POS group to its output status.
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 pt-2">
                    Processed Records: {currentResult.audit_log.length}
                  </div>
                </div>
                <button
                  onClick={() => downloadAuditCsv(currentResult)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-purple-400" />
                  <span>Download Audit Trail CSV</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>GSTR-1 Offline Utility JSON Engine for Amazon Sellers</span>
          </div>
          <div>
            Adheres strictly to GSTN Offline Return Specification & Schema.
          </div>
        </div>
      </footer>
    </div>
  );
}
