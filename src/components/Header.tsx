import React from 'react';
import { FileSpreadsheet, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';

interface HeaderProps {
  filingPeriod: string;
  selectedGstin: string;
  onLoadSampleData: () => void;
  onReset: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  filingPeriod,
  selectedGstin,
  onLoadSampleData,
  onReset,
  isLoading,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
            <FileSpreadsheet className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                GSTR-1 JSON Generator
              </h1>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Amazon Seller Central
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Offline Utility Compliant • Multi-GSTIN • Section Reconciliation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className="text-slate-400">GSTIN:</span>
            <span className="font-mono font-medium text-emerald-400">{selectedGstin || 'None'}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">FP:</span>
            <span className="font-mono font-medium text-teal-300">{filingPeriod || '092026'}</span>
          </div>

          <button
            onClick={onLoadSampleData}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
            title="Load the 7 Amazon CSV templates and compare with OD.json"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>Load Sample Templates</span>
          </button>

          <button
            onClick={onReset}
            disabled={isLoading}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
            title="Reset files and start over"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
