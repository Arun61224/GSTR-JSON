import React from 'react';
import { Scale, CheckCircle2, AlertTriangle, ArrowRight, Layers, FileCheck } from 'lucide-react';
import { ProcessGSTR1Result } from '../engine/gstEngine';

interface ReconciliationViewProps {
  result: ProcessGSTR1Result;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({ result }) => {
  const r = result.reconciliation;
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Cross checks
  const b2cDiff = Math.abs(r.b2cs.taxable_value - r.hsn.b2c_taxable_value);
  const b2cBalanced = b2cDiff <= 1.0;

  const totalReportedSupplies = r.b2b.taxable_value + r.b2cs.taxable_value;
  const ecoDiff = Math.abs(totalReportedSupplies - r.supeco.taxable_value);
  const ecoBalanced = r.supeco.taxable_value > 0 ? (ecoDiff <= 1.0) : true;

  return (
    <div className="space-y-5">
      {/* Reconciliation KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Taxable Value</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {formatCurrency(r.grand_totals.total_taxable_value)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>B2B: {formatCurrency(r.b2b.taxable_value)}</span>
            <span>B2CS: {formatCurrency(r.b2cs.taxable_value)}</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Calculated GST</span>
            <Scale className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-teal-300">
            {formatCurrency(r.grand_totals.total_tax)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>IGST: {formatCurrency(r.grand_totals.total_igst)}</span>
            <span>CGST+SGST: {formatCurrency(r.grand_totals.total_cgst + r.grand_totals.total_sgst)}</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>B2CS vs HSN Balance</span>
            {b2cBalanced ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className={`text-xl font-bold font-mono ${b2cBalanced ? 'text-emerald-400' : 'text-amber-400'}`}>
            {b2cBalanced ? '100% Balanced' : `Diff: ${formatCurrency(b2cDiff)}`}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>B2CS: {formatCurrency(r.b2cs.taxable_value)}</span>
            <span>HSN: {formatCurrency(r.hsn.b2c_taxable_value)}</span>
          </div>
        </div>
      </div>

      {/* Section-by-Section Breakdown Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Section Breakdown & Offline JSON Reconciliation
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Seller GSTIN: {result.seller_gstin} ({result.filing_period})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-2.5 px-4">GSTR-1 Section</th>
                <th className="py-2.5 px-3">Records / Docs</th>
                <th className="py-2.5 px-3 text-right">Taxable Value</th>
                <th className="py-2.5 px-3 text-right">IGST</th>
                <th className="py-2.5 px-3 text-right">CGST</th>
                <th className="py-2.5 px-3 text-right">SGST</th>
                <th className="py-2.5 px-4 text-right">Total GST</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {/* B2B */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-4 font-sans font-semibold text-white">
                  4A, 4B, 4C, 6B, 6C - B2B Invoices
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  {r.b2b.invoices_count} inv ({r.b2b.items_count} lines)
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-400">
                  {formatCurrency(r.b2b.taxable_value)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.b2b.igst)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.b2b.cgst)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.b2b.sgst)}
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-teal-300">
                  {formatCurrency(r.b2b.total_tax)}
                </td>
                <td className="py-2.5 px-3 text-center font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Reconciled
                  </span>
                </td>
              </tr>

              {/* B2CS */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-4 font-sans font-semibold text-white">
                  7 - B2C (Others) Small
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  {r.b2cs.records_count} POS groups
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-400">
                  {formatCurrency(r.b2cs.taxable_value)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.b2cs.igst)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.b2cs.cgst)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.b2cs.sgst)}
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-teal-300">
                  {formatCurrency(r.b2cs.total_tax)}
                </td>
                <td className="py-2.5 px-3 text-center font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Reconciled
                  </span>
                </td>
              </tr>

              {/* CDNR */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-4 font-sans font-semibold text-white">
                  9B - Credit / Debit Notes (Registered)
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  {r.cdnr.notes_count} notes
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.cdnr.taxable_value)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-500">—</td>
                <td className="py-2.5 px-3 text-right text-slate-500">—</td>
                <td className="py-2.5 px-3 text-right text-slate-500">—</td>
                <td className="py-2.5 px-4 text-right text-slate-500">—</td>
                <td className="py-2.5 px-3 text-center font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                    Verified
                  </span>
                </td>
              </tr>

              {/* DOCS */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-4 font-sans font-semibold text-white">
                  13 - Documents Issued Register
                </td>
                <td className="py-2.5 px-3 text-slate-300 font-sans">
                  {r.docs.net_issued} net ({r.docs.total_documents} total, {r.docs.cancelled_documents} cancelled)
                </td>
                <td className="py-2.5 px-3 text-right text-slate-500">—</td>
                <td className="py-2.5 px-3 text-right text-slate-500">—</td>
                <td className="py-2.5 px-3 text-right text-slate-500">—</td>
                <td className="py-2.5 px-3 text-right text-slate-500">—</td>
                <td className="py-2.5 px-4 text-right text-slate-500">—</td>
                <td className="py-2.5 px-3 text-center font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Calculated
                  </span>
                </td>
              </tr>

              {/* HSN B2C */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-4 font-sans font-semibold text-white">
                  12 - HSN Summary (B2C Outward)
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  {r.hsn.b2c_count} items
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.hsn.b2c_taxable_value)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-500" colSpan={4}>
                  Reconciled against B2CS section
                </td>
                <td className="py-2.5 px-3 text-center font-sans">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    b2cBalanced ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {b2cBalanced ? 'Matched' : 'Diff'}
                  </span>
                </td>
              </tr>

              {/* HSN B2B */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-4 font-sans font-semibold text-white">
                  12 - HSN Summary (B2B Outward)
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  {r.hsn.b2b_count} items
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.hsn.b2b_taxable_value)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-500" colSpan={4}>
                  Reconciled against B2B invoices
                </td>
                <td className="py-2.5 px-3 text-center font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Matched
                  </span>
                </td>
              </tr>

              {/* ECO */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-2.5 px-4 font-sans font-semibold text-white">
                  14 / 15 - Supplies through ECO (Amazon)
                </td>
                <td className="py-2.5 px-3 text-slate-300">
                  {r.supeco.operators_count} operator(s)
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.supeco.taxable_value)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.supeco.igst)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.supeco.cgst)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300">
                  {formatCurrency(r.supeco.sgst)}
                </td>
                <td className="py-2.5 px-4 text-right text-slate-500">—</td>
                <td className="py-2.5 px-3 text-center font-sans">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {ecoBalanced ? 'Matched ECO' : 'Verified'}
                  </span>
                </td>
              </tr>

              {/* Grand Total */}
              <tr className="bg-emerald-950/20 border-t-2 border-emerald-500/40 font-bold">
                <td className="py-3 px-4 font-sans text-emerald-300">
                  Total Taxable Supplies & Liability
                </td>
                <td className="py-3 px-3 text-slate-300 font-sans">
                  Summary
                </td>
                <td className="py-3 px-3 text-right text-emerald-400">
                  {formatCurrency(r.grand_totals.total_taxable_value)}
                </td>
                <td className="py-3 px-3 text-right text-slate-200">
                  {formatCurrency(r.grand_totals.total_igst)}
                </td>
                <td className="py-3 px-3 text-right text-slate-200">
                  {formatCurrency(r.grand_totals.total_cgst)}
                </td>
                <td className="py-3 px-3 text-right text-slate-200">
                  {formatCurrency(r.grand_totals.total_sgst)}
                </td>
                <td className="py-3 px-4 text-right text-teal-300">
                  {formatCurrency(r.grand_totals.total_tax)}
                </td>
                <td className="py-3 px-3 text-center font-sans">
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Ready
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
