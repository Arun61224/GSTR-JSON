import React, { useState } from 'react';
import { Search, ListFilter, Download, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import { AuditRecord } from '../engine/gstEngine';
import { downloadBlob } from '../utils/exportUtils';
import Papa from 'papaparse';

interface AuditTrailViewProps {
  auditLog: AuditRecord[];
  sellerGstin: string;
  filingPeriod: string;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  auditLog,
  sellerGstin,
  filingPeriod,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const sourceTypes = Array.from(new Set(auditLog.map(a => a.source_type)));

  const filtered = auditLog.filter(record => {
    if (filterType !== 'ALL' && record.source_type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = record.raw_reference.toLowerCase().includes(q);
      const matchFile = record.source_file.toLowerCase().includes(q);
      const matchDec = record.classification_decision.toLowerCase().includes(q);
      const matchReason = record.reason.toLowerCase().includes(q);
      if (!matchRef && !matchFile && !matchDec && !matchReason) return false;
    }
    return true;
  });

  const handleExportAuditCsv = () => {
    const csv = Papa.unparse(auditLog);
    downloadBlob(csv, `Audit_Trail_${sellerGstin}_${filingPeriod}.csv`, 'text/csv');
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">Record-by-Record Audit Trail</h3>
            <p className="text-[11px] text-slate-400">
              {auditLog.length} processed items with source lineage and classification reasoning.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by ref, file, decision..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono outline-none"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
          >
            <option value="ALL">All Types</option>
            {sourceTypes.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <button
            onClick={handleExportAuditCsv}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Audit CSV</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-3">Row</th>
                <th className="py-2.5 px-3">Source File</th>
                <th className="py-2.5 px-3">Reference / Key</th>
                <th className="py-2.5 px-3">Classification Decision</th>
                <th className="py-2.5 px-3">POS & Rate</th>
                <th className="py-2.5 px-3 text-right">Taxable Val</th>
                <th className="py-2.5 px-3 text-right">Total Tax</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-3 text-slate-400">#{item.source_row}</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">{item.source_file}</td>
                  <td className="py-2 px-3 text-emerald-300 font-bold">{item.raw_reference}</td>
                  <td className="py-2 px-3 text-slate-200 font-sans">
                    <div>{item.classification_decision}</div>
                    <div className="text-[10px] text-slate-500">{item.reason}</div>
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    {item.pos ? `POS ${item.pos}` : '—'} • {item.rate}%
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-400">
                    ₹{item.taxable_value.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right text-teal-300">
                    ₹{item.total_tax.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-center font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
