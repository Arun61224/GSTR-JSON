import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, Search, Filter, CheckCircle2 } from 'lucide-react';
import { ValidationIssue } from '../engine/gstEngine';

interface ValidationViewProps {
  issues: ValidationIssue[];
}

export const ValidationView: React.FC<ValidationViewProps> = ({ issues }) => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'ERROR' | 'WARNING' | 'INFO'>('ALL');
  const [filterSection, setFilterSection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const errorCount = issues.filter(i => i.severity === 'ERROR').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;
  const infoCount = issues.filter(i => i.severity === 'INFO').length;

  const sections = Array.from(new Set(issues.map(i => i.section))).filter(Boolean);

  const filteredIssues = issues.filter(issue => {
    if (filterSeverity !== 'ALL' && issue.severity !== filterSeverity) return false;
    if (filterSection !== 'ALL' && issue.section !== filterSection) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = issue.message.toLowerCase().includes(q);
      const matchCode = issue.code.toLowerCase().includes(q);
      const matchDoc = issue.document_number.toLowerCase().includes(q);
      const matchGstin = issue.gstin.toLowerCase().includes(q);
      if (!matchMsg && !matchCode && !matchDoc && !matchGstin) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterSeverity('ALL')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            filterSeverity === 'ALL'
              ? 'bg-slate-800 border-slate-600'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium">Total Signals</div>
          <div className="text-xl font-bold text-white mt-1">{issues.length}</div>
        </div>

        <div
          onClick={() => setFilterSeverity('ERROR')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            filterSeverity === 'ERROR'
              ? 'bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-rose-900/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-rose-400">
            <span>Errors (Blocking)</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 mt-1">{errorCount}</div>
        </div>

        <div
          onClick={() => setFilterSeverity('WARNING')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            filterSeverity === 'WARNING'
              ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-amber-900/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-amber-400">
            <span>Warnings (Review)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 mt-1">{warningCount}</div>
        </div>

        <div
          onClick={() => setFilterSeverity('INFO')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            filterSeverity === 'INFO'
              ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-blue-900/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-blue-400">
            <span>Audit & Info</span>
            <Info className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-blue-400 mt-1">{infoCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-slate-900/40 border border-slate-800 p-2.5 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search message, code, doc#, or GSTIN..."
            className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Section:</span>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
          >
            <option value="ALL">All Sections</option>
            {sections.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {filteredIssues.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-medium text-slate-200">No issues found matching current criteria.</p>
            <p className="text-xs text-slate-500">Your returns are clean and ready for JSON serialization.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Code / Section</th>
                  <th className="py-2.5 px-3">File / Row</th>
                  <th className="py-2.5 px-3">Document / GSTIN</th>
                  <th className="py-2.5 px-4">Validation Message & Guidance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredIssues.map((issue, idx) => {
                  let badge = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                  if (issue.severity === 'ERROR') badge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                  if (issue.severity === 'WARNING') badge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                  return (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge}`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-300">{issue.code}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{issue.section}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono text-slate-400">{issue.source_file || '—'}</div>
                        {issue.source_row > 0 && (
                          <div className="text-[10px] text-slate-500">Row {issue.source_row}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-300">
                        {issue.document_number || issue.gstin || '—'}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="text-slate-200 font-medium">{issue.message}</div>
                        {issue.guidance && (
                          <div className="text-[11px] text-emerald-400/90 mt-0.5">
                            💡 Guidance: {issue.guidance}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
