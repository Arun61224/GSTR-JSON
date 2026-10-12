import React, { useState } from 'react';
import { Building2, Calendar, Plus, X, Check } from 'lucide-react';
import { STATE_CODE_MAP } from '../engine/gstEngine';

interface GstinSelectorProps {
  gstinList: string[];
  selectedGstin: string;
  onSelectGstin: (gstin: string) => void;
  onAddGstin: (gstin: string) => void;
  onRemoveGstin: (gstin: string) => void;
  filingPeriod: string;
  onChangeFilingPeriod: (fp: string) => void;
}

export const GstinSelector: React.FC<GstinSelectorProps> = ({
  gstinList,
  selectedGstin,
  onSelectGstin,
  onAddGstin,
  onRemoveGstin,
  filingPeriod,
  onChangeFilingPeriod,
}) => {
  const [newGstin, setNewGstin] = useState('');
  const [inputError, setInputError] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newGstin.trim().toUpperCase();
    if (!clean) return;

    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean)) {
      setInputError('Must be a valid 15-character GSTIN format (e.g. 37ABAFV0462G1ZA)');
      return;
    }
    if (gstinList.includes(clean)) {
      setInputError('GSTIN is already in the list');
      return;
    }

    setInputError('');
    onAddGstin(clean);
    setNewGstin('');
  };

  const getMonthYearLabel = (fp: string) => {
    if (!fp || fp.length !== 6) return '';
    const monthNum = parseInt(fp.slice(0, 2), 10);
    const yearNum = fp.slice(2);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthNum >= 1 && monthNum <= 12) {
      return `${months[monthNum - 1]} ${yearNum}`;
    }
    return '';
  };

  const periodLabel = getMonthYearLabel(filingPeriod);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        {/* GSTIN management */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-slate-200">
              Seller GSTIN Registrations
            </span>
            <span className="text-xs text-slate-400">
              ({gstinList.length} registered)
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Generate isolated GSTR-1 returns per state registration without cross-contamination.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {gstinList.map((g) => {
              const stateCode = g.slice(0, 2);
              const stateName = STATE_CODE_MAP[stateCode] || 'Unknown';
              const isSelected = selectedGstin === g;

              return (
                <div
                  key={g}
                  onClick={() => onSelectGstin(g)}
                  className={`group flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30'
                      : 'bg-slate-800/80 border-slate-700 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-semibold">{g}</span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      {stateName}
                    </span>
                  </div>

                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}

                  {gstinList.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveGstin(g);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-slate-500 transition p-0.5 shrink-0"
                      title="Remove GSTIN"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Return Period Selector */}
        <div className="shrink-0 bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-teal-400 shrink-0" />
          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Filing Period (MMYYYY)
            </label>
            <div className="flex items-center space-x-2 mt-0.5">
              <input
                type="text"
                value={filingPeriod}
                onChange={(e) =>
                  onChangeFilingPeriod(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="092026"
                className="bg-slate-950/70 border border-slate-700 focus:border-teal-400 rounded px-2 py-0.5 font-mono text-sm text-white font-semibold outline-none w-24 text-center"
                maxLength={6}
              />
              {periodLabel && (
                <span className="text-xs px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium whitespace-nowrap">
                  {periodLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add New GSTIN input */}
      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-800/80"
      >
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={newGstin}
            onChange={(e) => {
              setNewGstin(e.target.value);
              setInputError('');
            }}
            placeholder="Add another Seller GSTIN (e.g. 29ABAFV0462G1Z7)"
            className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono outline-none"
            maxLength={15}
          />
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add GSTIN</span>
        </button>
      </form>
      {inputError && <p className="text-xs text-rose-400">{inputError}</p>}
    </div>
  );
};
