/**
 * Export and Download utilities for GSTR-1 returns, ZIP bundles, and CSV audit reports.
 */

import JSZip from 'jszip';
import Papa from 'papaparse';
import { ProcessGSTR1Result } from '../engine/gstEngine';

export function downloadBlob(content: string | Blob, filename: string, mimeType: string = 'text/plain') {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSingleGstr1Json(result: ProcessGSTR1Result) {
  const filename = `GSTR1_${result.seller_gstin}_${result.filing_period}.json`;
  downloadBlob(result.gstr1_json_str, filename, 'application/json');
}

export function downloadValidationCsv(result: ProcessGSTR1Result) {
  const issues = result.validation_summary.issues.map(i => ({
    Severity: i.severity,
    Code: i.code,
    Section: i.section,
    Source_File: i.source_file,
    Row_Number: i.source_row,
    Document_Number: i.document_number,
    GSTIN: i.gstin,
    Message: i.message,
    Guidance: i.guidance,
  }));

  const csv = Papa.unparse(issues);
  downloadBlob(csv, `Validation_Report_${result.seller_gstin}_${result.filing_period}.csv`, 'text/csv');
}

export function downloadAuditCsv(result: ProcessGSTR1Result) {
  const rows = result.audit_log.map(a => ({
    Source_File: a.source_file,
    Row_Number: a.source_row,
    Raw_Reference: a.raw_reference,
    Source_Type: a.source_type,
    Seller_GSTIN: a.seller_gstin,
    Classification_Decision: a.classification_decision,
    Status: a.status,
    Reason: a.reason,
    Taxable_Value: a.taxable_value,
    Total_Tax: a.total_tax,
    Rate: a.rate,
    Place_Of_Supply: a.pos,
    Notes: a.notes,
  }));

  const csv = Papa.unparse(rows);
  downloadBlob(csv, `Audit_Trail_${result.seller_gstin}_${result.filing_period}.csv`, 'text/csv');
}

export function downloadReconciliationCsv(result: ProcessGSTR1Result) {
  const r = result.reconciliation;
  const data = [
    { Section: 'B2B Invoices', Count: r.b2b.invoices_count, Taxable_Value: r.b2b.taxable_value, IGST: r.b2b.igst, CGST: r.b2b.cgst, SGST: r.b2b.sgst, Total_Tax: r.b2b.total_tax },
    { Section: 'B2CS Supplies', Count: r.b2cs.records_count, Taxable_Value: r.b2cs.taxable_value, IGST: r.b2cs.igst, CGST: r.b2cs.cgst, SGST: r.b2cs.sgst, Total_Tax: r.b2cs.total_tax },
    { Section: 'CDNR Credit/Debit Notes', Count: r.cdnr.notes_count, Taxable_Value: r.cdnr.taxable_value, IGST: 0, CGST: 0, SGST: 0, Total_Tax: 0 },
    { Section: 'Documents Issued', Count: r.docs.net_issued, Taxable_Value: 0, IGST: 0, CGST: 0, SGST: 0, Total_Tax: 0 },
    { Section: 'HSN B2C', Count: r.hsn.b2c_count, Taxable_Value: r.hsn.b2c_taxable_value, IGST: 0, CGST: 0, SGST: 0, Total_Tax: 0 },
    { Section: 'HSN B2B', Count: r.hsn.b2b_count, Taxable_Value: r.hsn.b2b_taxable_value, IGST: 0, CGST: 0, SGST: 0, Total_Tax: 0 },
    { Section: 'E-Commerce Supplies (ECO)', Count: r.supeco.operators_count, Taxable_Value: r.supeco.taxable_value, IGST: r.supeco.igst, CGST: r.supeco.cgst, SGST: r.supeco.sgst, Total_Tax: 0 },
    { Section: 'Grand Totals (B2B + B2CS)', Count: '-', Taxable_Value: r.grand_totals.total_taxable_value, IGST: r.grand_totals.total_igst, CGST: r.grand_totals.total_cgst, SGST: r.grand_totals.total_sgst, Total_Tax: r.grand_totals.total_tax },
  ];

  const csv = Papa.unparse(data);
  downloadBlob(csv, `Reconciliation_Summary_${result.seller_gstin}_${result.filing_period}.csv`, 'text/csv');
}

export async function downloadAllInZip(results: ProcessGSTR1Result[]) {
  const zip = new JSZip();

  for (const res of results) {
    const folder = zip.folder(`GSTR1_${res.seller_gstin}`) || zip;
    folder.file(`gstr1_${res.seller_gstin}_${res.filing_period}.json`, res.gstr1_json_str);

    // Validation CSV
    const issues = res.validation_summary.issues.map(i => ({
      Severity: i.severity,
      Code: i.code,
      Section: i.section,
      Source_File: i.source_file,
      Row_Number: i.source_row,
      Document_Number: i.document_number,
      GSTIN: i.gstin,
      Message: i.message,
      Guidance: i.guidance,
    }));
    folder.file(`validation_report.csv`, Papa.unparse(issues));

    // Audit CSV
    const audit = res.audit_log.map(a => ({
      Source_File: a.source_file,
      Row_Number: a.source_row,
      Raw_Reference: a.raw_reference,
      Source_Type: a.source_type,
      Seller_GSTIN: a.seller_gstin,
      Classification_Decision: a.classification_decision,
      Status: a.status,
      Reason: a.reason,
      Taxable_Value: a.taxable_value,
      Total_Tax: a.total_tax,
      Rate: a.rate,
      Place_Of_Supply: a.pos,
    }));
    folder.file(`audit_trail.csv`, Papa.unparse(audit));
  }

  // Add Readme
  zip.file('README_GST_PORTAL.txt', `GSTR-1 JSON Return Files for GST Offline Utility
Generated for Return Period: ${results[0]?.filing_period || 'Selected Period'}

Instructions:
1. Open the official GST Offline Utility (v3.1.8 or later).
2. Click on 'Returns' -> 'GSTR 1' -> 'Upload Offline'.
3. Select the generated .json file for your corresponding GSTIN.
4. Review section summaries and proceed with JSON validation on the GST portal.
`);

  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, `GSTR1_Returns_Package_${new Date().toISOString().slice(0, 10)}.zip`, 'application/zip');
}
