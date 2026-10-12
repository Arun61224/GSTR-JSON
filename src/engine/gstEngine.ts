/**
 * Production-grade GSTR-1 JSON Generation Engine for Amazon Seller Central Reports.
 * Replicates the standalone Python engine with 100% mathematical precision and schema adherence.
 */

import Papa from 'papaparse';

// Standard 2-digit GST state codes
export const STATE_CODE_MAP: Record<string, string> = {
  "01": "JAMMU AND KASHMIR",
  "02": "HIMACHAL PRADESH",
  "03": "PUNJAB",
  "04": "CHANDIGARH",
  "05": "UTTARAKHAND",
  "06": "HARYANA",
  "07": "DELHI",
  "08": "RAJASTHAN",
  "09": "UTTAR PRADESH",
  "10": "BIHAR",
  "11": "SIKKIM",
  "12": "ARUNACHAL PRADESH",
  "13": "NAGALAND",
  "14": "MANIPUR",
  "15": "MIZORAM",
  "16": "TRIPURA",
  "17": "MEGHALAYA",
  "18": "ASSAM",
  "19": "WEST BENGAL",
  "20": "JHARKHAND",
  "21": "ODISHA",
  "22": "CHATTISGARH",
  "23": "MADHYA PRADESH",
  "24": "GUJARAT",
  "25": "DAMAN AND DIU",
  "26": "DADRA AND NAGAR HAVELI AND DAMAN AND DIU",
  "27": "MAHARASHTRA",
  "28": "ANDHRA PRADESH (OLD)",
  "29": "KARNATAKA",
  "30": "GOA",
  "31": "LAKSHADWEEP",
  "32": "KERALA",
  "33": "TAMIL NADU",
  "34": "PUDUCHERRY",
  "35": "ANDAMAN AND NICOBAR ISLANDS",
  "36": "TELANGANA",
  "37": "ANDHRA PRADESH",
  "38": "LADAKH",
  "97": "OTHER TERRITORY",
};

export const STATE_NAME_TO_CODE: Record<string, string> = {
  "JAMMU AND KASHMIR": "01",
  "JAMMU & KASHMIR": "01",
  "J&K": "01",
  "HIMACHAL PRADESH": "02",
  "PUNJAB": "03",
  "CHANDIGARH": "04",
  "UTTARAKHAND": "05",
  "UTTARANCHAL": "05",
  "HARYANA": "06",
  "DELHI": "07",
  "DELHI NCR": "07",
  "NEW DELHI": "07",
  "RAJASTHAN": "08",
  "UTTAR PRADESH": "09",
  "BIHAR": "10",
  "SIKKIM": "11",
  "ARUNACHAL PRADESH": "12",
  "NAGALAND": "13",
  "MANIPUR": "14",
  "MIZORAM": "15",
  "TRIPURA": "16",
  "MEGHALAYA": "17",
  "ASSAM": "18",
  "WEST BENGAL": "19",
  "JHARKHAND": "20",
  "ODISHA": "21",
  "ORISSA": "21",
  "CHATTISGARH": "22",
  "CHHATTISGARH": "22",
  "MADHYA PRADESH": "23",
  "GUJARAT": "24",
  "DAMAN AND DIU": "25",
  "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "26",
  "DADRA & NAGAR HAVELI": "26",
  "DAMAN & DIU": "26",
  "MAHARASHTRA": "27",
  "KARNATAKA": "29",
  "GOA": "30",
  "LAKSHADWEEP": "31",
  "KERALA": "32",
  "TAMIL NADU": "33",
  "PUDUCHERRY": "34",
  "PONDICHERRY": "34",
  "ANDAMAN AND NICOBAR ISLANDS": "35",
  "ANDAMAN & NICOBAR ISLANDS": "35",
  "TELANGANA": "36",
  "ANDHRA PRADESH": "37",
  "LADAKH": "38",
  "OTHER TERRITORY": "97",
};

export const DOCUMENT_NATURE_MAP: Record<string, [number, string]> = {
  "invoices for outward supply": [1, "Invoices for outward supply"],
  "inward supply": [2, "Invoices for inward supply from unregistered person"],
  "revised invoice": [3, "Revised Invoice"],
  "debit note": [4, "Debit Note"],
  "credit note": [5, "Credit Note"],
  "receipt voucher": [6, "Receipt voucher"],
  "payment voucher": [7, "Payment Voucher"],
  "refund voucher": [8, "Refund voucher"],
  "delivery challan for job work": [9, "Delivery Challan for job work"],
  "delivery challan for supply on approval": [10, "Delivery Challan for supply on approval"],
  "delivery challan in case of liquid gas": [11, "Delivery Challan in case of liquid gas"],
  "delivery challan in cases other than by way of supply": [12, "Delivery Challan in cases other than by way of supply"],
};

export const VALID_GST_RATES = new Set([0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28]);
export const VALID_UQCS = new Set([
  "BAG", "BAL", "BDL", "BKL", "BOU", "BOX", "BTL", "BUN", "CAN", "CBM", "CCM",
  "CMS", "CTN", "DOZ", "DRM", "GGK", "GMS", "GRS", "GYD", "KGS", "KLR", "KME",
  "MLT", "MTR", "MTS", "NOS", "PAC", "PCS", "PRS", "QTL", "ROL", "SET", "SQF",
  "SQM", "SQY", "TBS", "TGM", "THD", "TON", "TUB", "UGS", "UNT", "YDS", "OTH"
]);

export type Severity = "ERROR" | "WARNING" | "INFO";

export interface ValidationIssue {
  severity: Severity;
  code: string;
  message: string;
  section: string;
  source_file: string;
  source_row: number;
  gstin: string;
  document_number: string;
  guidance: string;
}

export interface AuditRecord {
  source_file: string;
  source_row: number;
  raw_reference: string;
  source_type: string;
  seller_gstin: string;
  classification_decision: string;
  status: "INCLUDED" | "EXCLUDED" | "FLAGGED";
  reason: string;
  taxable_value: number;
  total_tax: number;
  rate: number;
  pos: string;
  notes: string;
}

export interface UploadedReportFile {
  id: string;
  filename: string;
  size: number;
  content: string;
  detectedType: 'b2b' | 'b2cs' | 'cdnr' | 'docs' | 'hsn_b2b' | 'hsn_b2c' | 'supeco' | 'unknown';
  headers: string[];
  rowCount: number;
}

export function normalizeHeader(h: string): string {
  if (!h) return '';
  return h.replace(/^\ufeff/, '').replace(/["']/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function extractStateCode(posRaw: string): string {
  if (!posRaw) return '';
  const s = String(posRaw).trim();
  const match = s.match(/^(\d{2})/);
  if (match && STATE_CODE_MAP[match[1]]) {
    return match[1];
  }
  const cleanName = s.toUpperCase().replace(/^\d+\s*[-_]?\s*/, '').trim();
  if (STATE_NAME_TO_CODE[cleanName]) {
    return STATE_NAME_TO_CODE[cleanName];
  }
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (name.includes(cleanName) || cleanName.includes(name)) {
      return code;
    }
  }
  if (/^\d+$/.test(s)) {
    const code = s.padStart(2, '0');
    if (STATE_CODE_MAP[code]) return code;
  }
  return '';
}

export function parseDateToDDMMYYYY(rawDate: string): string {
  if (!rawDate) return '';
  const s = String(rawDate).trim();
  if (!s) return '';

  const match = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (match) {
    let day = parseInt(match[1], 10);
    let month = parseInt(match[2], 10);
    let year = match[3];
    if (year.length === 2) year = '20' + year;
    return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
  }

  // Handle formats like 1-Sep-26 or 01-Sep-2026
  const monMatch = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
  if (monMatch) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const day = String(parseInt(monMatch[1], 10)).padStart(2, '0');
    const month = months[monMatch[2].toLowerCase()] || '01';
    let year = monMatch[3];
    if (year.length === 2) year = '20' + year;
    return `${day}-${month}-${year}`;
  }

  return s;
}

export function detectFileType(headers: string[], filename: string = ''): 'b2b' | 'b2cs' | 'cdnr' | 'docs' | 'hsn_b2b' | 'hsn_b2c' | 'supeco' | 'unknown' {
  const norm = headers.map(normalizeHeader);
  const set = new Set(norm);
  const fn = filename.toLowerCase();

  if (norm.some(h => h.includes('note number') || h.includes('note type'))) {
    return 'cdnr';
  }
  if (norm.some(h => h.includes('nature of document')) || (norm.some(h => h.includes('sr. no. from')) && norm.some(h => h.includes('sr. no. to')))) {
    return 'docs';
  }
  if (norm.some(h => h.includes('e-commerce operator')) && !norm.some(h => h.includes('invoice number'))) {
    return 'supeco';
  }
  if (norm.some(h => h.includes('hsn')) && norm.some(h => h.includes('uqc'))) {
    if (fn.includes('b2c')) return 'hsn_b2c';
    if (fn.includes('b2b')) return 'hsn_b2b';
    return fn.includes('b2c') ? 'hsn_b2c' : 'hsn_b2b';
  }
  if (norm.some(h => h.includes('invoice number')) && norm.some(h => h.includes('recipient') || h.includes('receiver'))) {
    return 'b2b';
  }
  if ((set.has('type') || norm.some(h => h.includes('place of supply'))) && norm.some(h => h.includes('taxable value')) && !norm.some(h => h.includes('invoice number'))) {
    return 'b2cs';
  }

  return 'unknown';
}

export function roundCur(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export interface ProcessGSTR1Result {
  seller_gstin: string;
  filing_period: string;
  can_generate: boolean;
  gstr1_json: any;
  gstr1_json_str: string;
  reconciliation: {
    b2b: {
      invoices_count: number;
      items_count: number;
      taxable_value: number;
      igst: number;
      cgst: number;
      sgst: number;
      total_tax: number;
    };
    b2cs: {
      records_count: number;
      taxable_value: number;
      igst: number;
      cgst: number;
      sgst: number;
      total_tax: number;
    };
    cdnr: {
      notes_count: number;
      taxable_value: number;
    };
    docs: {
      series_count: number;
      total_documents: number;
      cancelled_documents: number;
      net_issued: number;
    };
    hsn: {
      b2c_count: number;
      b2b_count: number;
      b2c_taxable_value: number;
      b2b_taxable_value: number;
      total_taxable_value: number;
    };
    supeco: {
      operators_count: number;
      taxable_value: number;
      igst: number;
      cgst: number;
      sgst: number;
    };
    grand_totals: {
      total_taxable_value: number;
      total_igst: number;
      total_cgst: number;
      total_sgst: number;
      total_tax: number;
    };
  };
  validation_summary: {
    errors: number;
    warnings: number;
    info: number;
    total: number;
    issues: ValidationIssue[];
  };
  audit_log: AuditRecord[];
  loaded_files: Record<string, string>;
}

export function processReportsLocally(
  files: UploadedReportFile[],
  sellerGstin: string,
  filingPeriod: string
): ProcessGSTR1Result {
  const issues: ValidationIssue[] = [];
  const auditLog: AuditRecord[] = [];
  const cleanSellerGstin = sellerGstin.trim().toUpperCase();
  const sellerState = cleanSellerGstin.slice(0, 2);

  // Validate Seller GSTIN
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!cleanSellerGstin) {
    issues.push({
      severity: 'ERROR',
      code: 'ERR_SELLER_GSTIN_EMPTY',
      message: 'Seller GSTIN cannot be blank.',
      section: 'HEADER',
      source_file: '',
      source_row: 0,
      gstin: '',
      document_number: '',
      guidance: 'Enter the registered 15-character GSTIN of the seller.'
    });
  } else if (!gstinRegex.test(cleanSellerGstin)) {
    issues.push({
      severity: 'ERROR',
      code: 'ERR_SELLER_GSTIN_INVALID',
      message: `Seller GSTIN '${cleanSellerGstin}' does not match official 15-character GST format.`,
      section: 'HEADER',
      source_file: '',
      source_row: 0,
      gstin: cleanSellerGstin,
      document_number: '',
      guidance: 'Expected 2 digits state code + 10 char PAN + 1 entity char + "Z" + 1 check character.'
    });
  } else if (!STATE_CODE_MAP[sellerState]) {
    issues.push({
      severity: 'ERROR',
      code: 'ERR_SELLER_STATE_UNKNOWN',
      message: `Seller GSTIN state prefix '${sellerState}' is not recognized in official GST directory.`,
      section: 'HEADER',
      source_file: '',
      source_row: 0,
      gstin: cleanSellerGstin,
      document_number: '',
      guidance: 'Check the state code against official GST state list.'
    });
  } else {
    issues.push({
      severity: 'INFO',
      code: 'INF_SELLER_GSTIN_VALID',
      message: `Seller GSTIN verified: ${cleanSellerGstin} (${STATE_CODE_MAP[sellerState]}).`,
      section: 'HEADER',
      source_file: '',
      source_row: 0,
      gstin: cleanSellerGstin,
      document_number: '',
      guidance: ''
    });
  }

  // Validate Filing Period
  if (!/^(0[1-9]|1[0-2])20[2-9][0-9]$/.test(filingPeriod.trim())) {
    issues.push({
      severity: 'ERROR',
      code: 'ERR_FILING_PERIOD_INVALID',
      message: `Filing period '${filingPeriod}' must be in MMYYYY format (e.g. 092026).`,
      section: 'HEADER',
      source_file: '',
      source_row: 0,
      gstin: cleanSellerGstin,
      document_number: '',
      guidance: 'Provide a 6-digit month and year, e.g. 092026 for September 2026.'
    });
  }

  // Parsed sections
  let b2bInvoicesMap: Record<string, any> = {};
  let b2csList: any[] = [];
  let cdnrList: any[] = [];
  let docsList: any[] = [];
  let hsnList: any[] = [];
  let ecoList: any[] = [];
  const loadedFiles: Record<string, string> = {};

  for (const f of files) {
    const parsed = Papa.parse(f.content.trim(), { header: true, skipEmptyLines: true });
    const rawRows = parsed.data as Record<string, string>[];
    const detected = f.detectedType !== 'unknown' ? f.detectedType : detectFileType(f.headers, f.filename);
    loadedFiles[detected] = f.filename;

    if (detected === 'b2b') {
      for (let idx = 0; idx < rawRows.length; idx++) {
        const row = rawRows[idx];
        const rowNum = idx + 2;
        const normRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          normRow[normalizeHeader(k)] = v?.trim() || '';
        }

        const ctin = (normRow['gstin/uin of recipient'] || normRow['gstin'] || normRow['recipient gstin'] || '').toUpperCase();
        const receiverName = normRow['receiver name'] || normRow['party name'] || '';
        const inum = normRow['invoice number'] || normRow['invoice no'] || normRow['inum'] || '';
        const idt = parseDateToDDMMYYYY(normRow['invoice date'] || normRow['date'] || '');
        const val = parseFloat(normRow['invoice value'] || normRow['total value'] || '0') || 0;
        const posRaw = normRow['place of supply'] || normRow['pos'] || '';
        const pos = extractStateCode(posRaw);
        const rchrg = (normRow['reverse charge'] || 'N').toUpperCase() === 'Y' ? 'Y' : 'N';
        const rate = parseFloat(normRow['rate'] || '0') || 0;
        const txval = parseFloat(normRow['taxable value'] || normRow['txval'] || '0') || 0;
        const cess = parseFloat(normRow['cess amount'] || normRow['cess'] || '0') || 0;

        let invTyp = 'R';
        const invTypeRaw = (normRow['invoice type'] || '').toLowerCase();
        if (invTypeRaw.includes('deemed') || invTypeRaw.includes('de')) invTyp = 'DE';
        else if (invTypeRaw.includes('sez')) invTyp = invTypeRaw.includes('with') ? 'SEWP' : 'SEWOP';

        if (!inum) {
          issues.push({
            severity: 'ERROR',
            code: 'ERR_B2B_MISSING_INUM',
            message: `Missing Invoice Number in ${f.filename} at row ${rowNum}`,
            section: 'B2B',
            source_file: f.filename,
            source_row: rowNum,
            gstin: ctin,
            document_number: '',
            guidance: 'All B2B rows must contain a non-empty invoice number.'
          });
          continue;
        }

        if (!ctin) {
          issues.push({
            severity: 'ERROR',
            code: 'ERR_B2B_MISSING_CTIN',
            message: `Missing Recipient GSTIN for invoice ${inum} in row ${rowNum}`,
            section: 'B2B',
            source_file: f.filename,
            source_row: rowNum,
            gstin: '',
            document_number: inum,
            guidance: 'B2B supplies mandate a valid recipient GSTIN.'
          });
        }

        const isIntra = (pos === sellerState);
        let igst = 0, cgst = 0, sgst = 0;
        if (isIntra) {
          cgst = roundCur((txval * (rate / 2)) / 100);
          sgst = roundCur((txval * (rate / 2)) / 100);
        } else {
          igst = roundCur((txval * rate) / 100);
        }

        if (!b2bInvoicesMap[inum]) {
          b2bInvoicesMap[inum] = {
            inum,
            idt,
            val: roundCur(val),
            pos,
            rchrg,
            inv_typ: invTyp,
            ctin,
            receiverName,
            itms: []
          };
        }

        const itmNum = b2bInvoicesMap[inum].itms.length + 1;
        b2bInvoicesMap[inum].itms.push({
          num: itmNum,
          itm_det: {
            txval: roundCur(txval),
            rt: rate,
            iamt: igst,
            camt: cgst,
            samt: sgst,
            csamt: roundCur(cess),
          }
        });

        auditLog.push({
          source_file: f.filename,
          source_row: rowNum,
          raw_reference: inum,
          source_type: 'B2B_LINE',
          seller_gstin: cleanSellerGstin,
          classification_decision: `B2B Line Rate ${rate}% (POS ${pos})`,
          status: 'INCLUDED',
          reason: `Grouped into invoice ${inum}`,
          taxable_value: roundCur(txval),
          total_tax: roundCur(igst + cgst + sgst + cess),
          rate,
          pos,
          notes: ''
        });
      }
    } else if (detected === 'b2cs') {
      for (let idx = 0; idx < rawRows.length; idx++) {
        const row = rawRows[idx];
        const rowNum = idx + 2;
        const normRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          normRow[normalizeHeader(k)] = v?.trim() || '';
        }

        const typeCode = normRow['type'] || 'OE';
        const posRaw = normRow['place of supply'] || normRow['pos'] || '';
        const pos = extractStateCode(posRaw);
        const rate = parseFloat(normRow['rate'] || '0') || 0;
        const txval = parseFloat(normRow['taxable value'] || normRow['txval'] || '0') || 0;
        const cess = parseFloat(normRow['cess amount'] || normRow['cess'] || '0') || 0;

        if (!pos) {
          issues.push({
            severity: 'ERROR',
            code: 'ERR_B2CS_INVALID_POS',
            message: `Unrecognized POS '${posRaw}' in B2CS row ${rowNum}`,
            section: 'B2CS',
            source_file: f.filename,
            source_row: rowNum,
            gstin: '',
            document_number: '',
            guidance: 'Place of supply must match a valid GST state code.'
          });
          continue;
        }

        const isIntra = (pos === sellerState);
        let igst = 0, cgst = 0, sgst = 0;
        if (isIntra) {
          cgst = roundCur((txval * (rate / 2)) / 100);
          sgst = roundCur((txval * (rate / 2)) / 100);
        } else {
          igst = roundCur((txval * rate) / 100);
        }

        b2csList.push({
          sply_ty: isIntra ? 'INTRA' : 'INTER',
          rt: rate,
          typ: typeCode,
          pos,
          txval: roundCur(txval),
          iamt: igst,
          camt: cgst,
          samt: sgst,
          csamt: roundCur(cess)
        });

        if (txval < 0) {
          issues.push({
            severity: 'INFO',
            code: 'INF_B2CS_NEGATIVE_ADJUSTMENT',
            message: `Negative taxable value ${txval} in POS ${pos} rate ${rate}% (net sales returns).`,
            section: 'B2CS',
            source_file: f.filename,
            source_row: rowNum,
            gstin: '',
            document_number: '',
            guidance: 'Permitted in GSTR-1 B2CS returns for net credit adjustments.'
          });
        }

        auditLog.push({
          source_file: f.filename,
          source_row: rowNum,
          raw_reference: `B2CS-${pos}-${rate}%`,
          source_type: 'B2CS_ENTRY',
          seller_gstin: cleanSellerGstin,
          classification_decision: `B2CS ${isIntra ? 'INTRA' : 'INTER'} Rate ${rate}% POS ${pos}`,
          status: 'INCLUDED',
          reason: 'Aggregated to B2CS table',
          taxable_value: roundCur(txval),
          total_tax: roundCur(igst + cgst + sgst + cess),
          rate,
          pos,
          notes: ''
        });
      }
    } else if (detected === 'cdnr') {
      for (let idx = 0; idx < rawRows.length; idx++) {
        const row = rawRows[idx];
        const rowNum = idx + 2;
        const normRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          normRow[normalizeHeader(k)] = v?.trim() || '';
        }

        const ctin = (normRow['gstin/uin of recipient'] || normRow['gstin'] || '').toUpperCase();
        const noteNum = normRow['note number'] || normRow['note no'] || '';
        const noteDt = parseDateToDDMMYYYY(normRow['note date'] || '');
        const noteType = (normRow['note type'] || 'C').toUpperCase();
        const pos = extractStateCode(normRow['place of supply'] || '');
        const rchrg = (normRow['reverse charge'] || 'N').toUpperCase();
        const noteVal = parseFloat(normRow['note value'] || '0') || 0;
        const rate = parseFloat(normRow['rate'] || '0') || 0;
        const txval = parseFloat(normRow['taxable value'] || '0') || 0;
        const cess = parseFloat(normRow['cess amount'] || '0') || 0;

        if (!noteNum) {
          issues.push({
            severity: 'ERROR',
            code: 'ERR_CDNR_MISSING_NUM',
            message: `Missing Note Number in row ${rowNum}`,
            section: 'CDNR',
            source_file: f.filename,
            source_row: rowNum,
            gstin: ctin,
            document_number: '',
            guidance: 'Note number is mandatory for Credit/Debit notes.'
          });
          continue;
        }

        cdnrList.push({
          ctin,
          nt_num: noteNum,
          nt_dt: noteDt,
          val: roundCur(noteVal),
          ntty: noteType,
          pos,
          rchrg,
          rate,
          txval: roundCur(txval),
          cess: roundCur(cess)
        });

        auditLog.push({
          source_file: f.filename,
          source_row: rowNum,
          raw_reference: noteNum,
          source_type: 'CDNR',
          seller_gstin: cleanSellerGstin,
          classification_decision: `CDNR Type ${noteType} Rate ${rate}%`,
          status: 'INCLUDED',
          reason: `Processed CDNR for ${ctin}`,
          taxable_value: roundCur(txval),
          total_tax: roundCur((txval * rate) / 100),
          rate,
          pos,
          notes: ''
        });
      }
    } else if (detected === 'docs') {
      for (let idx = 0; idx < rawRows.length; idx++) {
        const row = rawRows[idx];
        const rowNum = idx + 2;
        const normRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          normRow[normalizeHeader(k)] = v?.trim() || '';
        }

        const nature = normRow['nature of document'] || '';
        const fromSr = normRow['sr. no. from'] || normRow['from'] || '';
        const toSr = normRow['sr. no. to'] || normRow['to'] || '';
        const totNum = parseInt(normRow['total number'] || '0', 10) || 0;
        const cancelled = parseInt(normRow['cancelled'] || '0', 10) || 0;
        const net = totNum - cancelled;

        if (!nature) continue;

        if (cancelled > totNum) {
          issues.push({
            severity: 'ERROR',
            code: 'ERR_DOCS_CANCELLED_EXCEEDS_TOTAL',
            message: `Cancelled docs (${cancelled}) exceed total (${totNum}) in series ${fromSr} - ${toSr}`,
            section: 'DOCS',
            source_file: f.filename,
            source_row: rowNum,
            gstin: '',
            document_number: `${fromSr}-${toSr}`,
            guidance: 'Verify cancelled count in doc register.'
          });
        }

        docsList.push({
          nature,
          from: fromSr,
          to: toSr,
          totnum: totNum,
          cancel: cancelled,
          net_issue: net
        });

        auditLog.push({
          source_file: f.filename,
          source_row: rowNum,
          raw_reference: `${fromSr}-${toSr}`,
          source_type: 'DOC_SERIES',
          seller_gstin: cleanSellerGstin,
          classification_decision: `Doc Series ${nature}`,
          status: 'INCLUDED',
          reason: `Total: ${totNum}, Cancel: ${cancelled}, Net: ${net}`,
          taxable_value: 0,
          total_tax: 0,
          rate: 0,
          pos: '',
          notes: ''
        });
      }
    } else if (detected === 'hsn_b2b' || detected === 'hsn_b2c') {
      const isB2B = (detected === 'hsn_b2b');
      for (let idx = 0; idx < rawRows.length; idx++) {
        const row = rawRows[idx];
        const rowNum = idx + 2;
        const normRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          normRow[normalizeHeader(k)] = v?.trim() || '';
        }

        const hsn = normRow['hsn'] || '';
        const uqc = (normRow['uqc'] || 'PCS').toUpperCase();
        const qty = parseFloat(normRow['total quantity'] || normRow['quantity'] || '0') || 0;
        const txval = parseFloat(normRow['taxable value'] || '0') || 0;
        const iamt = parseFloat(normRow['integrated tax amount'] || normRow['iamt'] || '0') || 0;
        const camt = parseFloat(normRow['central tax amount'] || normRow['camt'] || '0') || 0;
        const samt = parseFloat(normRow['state/ut tax amount'] || normRow['samt'] || '0') || 0;
        const cess = parseFloat(normRow['cess amount'] || '0') || 0;
        const rate = parseFloat(normRow['rate'] || '0') || 0;

        if (!hsn) {
          issues.push({
            severity: 'ERROR',
            code: 'ERR_HSN_MISSING',
            message: `Missing HSN code in row ${rowNum}`,
            section: isB2B ? 'HSN_B2B' : 'HSN_B2C',
            source_file: f.filename,
            source_row: rowNum,
            gstin: '',
            document_number: '',
            guidance: 'HSN code must be present for all summarized items.'
          });
          continue;
        }

        hsnList.push({
          category: isB2B ? 'B2B' : 'B2C',
          hsn_sc: hsn,
          uqc,
          qty: roundCur(qty),
          rt: rate,
          txval: roundCur(txval),
          iamt: roundCur(iamt),
          camt: roundCur(camt),
          samt: roundCur(samt),
          csamt: roundCur(cess)
        });

        auditLog.push({
          source_file: f.filename,
          source_row: rowNum,
          raw_reference: `HSN-${hsn}`,
          source_type: isB2B ? 'HSN_B2B' : 'HSN_B2C',
          seller_gstin: cleanSellerGstin,
          classification_decision: `HSN ${hsn} Rate ${rate}% Qty ${qty}`,
          status: 'INCLUDED',
          reason: `Categorized into HSN ${isB2B ? 'B2B' : 'B2C'} summary`,
          taxable_value: roundCur(txval),
          total_tax: roundCur(iamt + camt + samt + cess),
          rate,
          pos: '',
          notes: ''
        });
      }
    } else if (detected === 'supeco') {
      for (let idx = 0; idx < rawRows.length; idx++) {
        const row = rawRows[idx];
        const rowNum = idx + 2;
        const normRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          normRow[normalizeHeader(k)] = v?.trim() || '';
        }

        const etin = (normRow['gstin of e-commerce operator'] || normRow['etin'] || normRow['operator gstin'] || '').toUpperCase();
        const ecoName = normRow['e-commerce operator name'] || normRow['operator name'] || '';
        const txval = parseFloat(normRow['taxable value'] || '0') || 0;
        const iamt = parseFloat(normRow['integrated tax'] || normRow['iamt'] || '0') || 0;
        const camt = parseFloat(normRow['central tax'] || normRow['camt'] || '0') || 0;
        const samt = parseFloat(normRow['state/ut tax'] || normRow['samt'] || '0') || 0;
        const cess = parseFloat(normRow['cess amount'] || '0') || 0;

        if (!etin) {
          issues.push({
            severity: 'ERROR',
            code: 'ERR_ECO_MISSING_ETIN',
            message: `Missing ECO GSTIN in row ${rowNum}`,
            section: 'ECO',
            source_file: f.filename,
            source_row: rowNum,
            gstin: '',
            document_number: '',
            guidance: 'ETIN is required for e-commerce operator reporting.'
          });
          continue;
        }

        ecoList.push({
          etin,
          ecoName,
          suppval: roundCur(txval),
          igst: roundCur(iamt),
          cgst: roundCur(camt),
          sgst: roundCur(samt),
          cess: roundCur(cess)
        });

        auditLog.push({
          source_file: f.filename,
          source_row: rowNum,
          raw_reference: etin,
          source_type: 'SUPECO',
          seller_gstin: cleanSellerGstin,
          classification_decision: `Supply through ECO ${etin}`,
          status: 'INCLUDED',
          reason: `Platform: ${ecoName}`,
          taxable_value: roundCur(txval),
          total_tax: roundCur(iamt + camt + samt + cess),
          rate: 0,
          pos: '',
          notes: ''
        });
      }
    }
  }

  // Aggregate B2CS
  const b2csAgg: Record<string, any> = {};
  for (const item of b2csList) {
    const key = `${item.sply_ty}_${item.rt}_${item.typ}_${item.pos}`;
    if (!b2csAgg[key]) {
      b2csAgg[key] = {
        sply_ty: item.sply_ty,
        rt: item.rt,
        typ: item.typ,
        pos: item.pos,
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0
      };
    }
    b2csAgg[key].txval = roundCur(b2csAgg[key].txval + item.txval);
    b2csAgg[key].iamt = roundCur(b2csAgg[key].iamt + item.iamt);
    b2csAgg[key].camt = roundCur(b2csAgg[key].camt + item.camt);
    b2csAgg[key].samt = roundCur(b2csAgg[key].samt + item.samt);
    b2csAgg[key].csamt = roundCur(b2csAgg[key].csamt + item.csamt);
  }
  const finalB2cs = Object.values(b2csAgg);

  // Group B2B by CTIN
  const ctinGroups: Record<string, any[]> = {};
  for (const inv of Object.values(b2bInvoicesMap)) {
    if (!ctinGroups[inv.ctin]) ctinGroups[inv.ctin] = [];
    ctinGroups[inv.ctin].push({
      inum: inv.inum,
      idt: inv.idt,
      val: inv.val,
      pos: inv.pos,
      rchrg: inv.rchrg,
      inv_typ: inv.inv_typ,
      itms: inv.itms
    });
  }
  const finalB2b = Object.entries(ctinGroups).map(([ctin, invs]) => ({
    ctin,
    inv: invs
  }));

  // Group CDNR by CTIN
  const cdnrGroups: Record<string, any[]> = {};
  for (const n of cdnrList) {
    if (!cdnrGroups[n.ctin]) cdnrGroups[n.ctin] = [];
    const isIntra = (n.pos === sellerState);
    const halfRt = n.rate / 2;
    const camt = isIntra ? roundCur((n.txval * halfRt) / 100) : 0;
    const samt = isIntra ? roundCur((n.txval * halfRt) / 100) : 0;
    const iamt = !isIntra ? roundCur((n.txval * n.rate) / 100) : 0;

    cdnrGroups[n.ctin].push({
      nt_num: n.nt_num,
      nt_dt: n.nt_dt,
      val: n.val,
      ntty: n.ntty,
      pos: n.pos,
      rchrg: n.rchrg,
      p_gst: 'N',
      itms: [
        {
          num: 1,
          itm_det: {
            txval: n.txval,
            rt: n.rate,
            iamt,
            camt,
            samt,
            csamt: n.cess
          }
        }
      ]
    });
  }
  const finalCdnr = Object.entries(cdnrGroups).map(([ctin, notes]) => ({
    ctin,
    nt: notes
  }));

  // Group Docs by doc_num
  const docsCatMap: Record<number, any> = {};
  for (const doc of docsList) {
    let docNum = 1;
    let docTyp = doc.nature;
    const natClean = doc.nature.toLowerCase();
    for (const [keyPat, [mappedNum, mappedLabel]] of Object.entries(DOCUMENT_NATURE_MAP)) {
      if (natClean.includes(keyPat)) {
        docNum = mappedNum;
        docTyp = mappedLabel;
        break;
      }
    }

    if (!docsCatMap[docNum]) {
      docsCatMap[docNum] = {
        doc_num: docNum,
        doc_typ: docTyp,
        docs: []
      };
    }

    docsCatMap[docNum].docs.push({
      num: docsCatMap[docNum].docs.length + 1,
      from: doc.from,
      to: doc.to,
      totnum: doc.totnum,
      cancel: doc.cancel,
      net_issue: doc.net_issue
    });
  }
  const finalDocs = {
    doc_det: Object.values(docsCatMap).sort((a, b) => a.doc_num - b.doc_num)
  };

  // Group HSN
  const hsnB2c = hsnList.filter(i => i.category === 'B2C');
  const hsnB2b = hsnList.filter(i => i.category === 'B2B');
  let runningHsnNum = 1;
  const finalHsn: Record<string, any> = {};

  if (hsnB2c.length > 0) {
    finalHsn.hsn_b2c = hsnB2c.map(item => ({
      num: runningHsnNum++,
      hsn_sc: item.hsn_sc,
      uqc: item.uqc,
      qty: item.qty,
      rt: item.rt,
      txval: item.txval,
      iamt: item.iamt,
      samt: item.samt,
      camt: item.camt,
      csamt: item.csamt
    }));
  }

  if (hsnB2b.length > 0) {
    finalHsn.hsn_b2b = hsnB2b.map(item => ({
      num: runningHsnNum++,
      hsn_sc: item.hsn_sc,
      uqc: item.uqc,
      qty: item.qty,
      rt: item.rt,
      txval: item.txval,
      iamt: item.iamt,
      samt: item.samt,
      camt: item.camt,
      csamt: item.csamt
    }));
  }

  // Supeco
  const finalSupeco = ecoList.length > 0 ? {
    clttx: ecoList.map(e => ({
      etin: e.etin,
      suppval: e.suppval,
      igst: e.igst,
      cgst: e.cgst,
      sgst: e.sgst,
      cess: e.cess,
      flag: 'N'
    }))
  } : undefined;

  // Build final JSON
  const gstr1Json: any = {
    gstin: cleanSellerGstin,
    fp: filingPeriod.trim(),
  };

  if (finalB2b.length > 0) gstr1Json.b2b = finalB2b;
  if (finalB2cs.length > 0) gstr1Json.b2cs = finalB2cs;
  if (finalCdnr.length > 0) gstr1Json.cdnr = finalCdnr;
  if (docsList.length > 0) gstr1Json.doc_issue = finalDocs;
  if (finalSupeco) gstr1Json.supeco = finalSupeco;
  if (Object.keys(finalHsn).length > 0) gstr1Json.hsn = finalHsn;

  // Reconciliation Totals
  const b2bInvoices = Object.values(b2bInvoicesMap);
  const b2bTxval = roundCur(b2bInvoices.reduce((acc, inv) => acc + inv.itms.reduce((sum: number, it: any) => sum + it.itm_det.txval, 0), 0));
  const b2bIgst = roundCur(b2bInvoices.reduce((acc, inv) => acc + inv.itms.reduce((sum: number, it: any) => sum + it.itm_det.iamt, 0), 0));
  const b2bCgst = roundCur(b2bInvoices.reduce((acc, inv) => acc + inv.itms.reduce((sum: number, it: any) => sum + it.itm_det.camt, 0), 0));
  const b2bSgst = roundCur(b2bInvoices.reduce((acc, inv) => acc + inv.itms.reduce((sum: number, it: any) => sum + it.itm_det.samt, 0), 0));

  const b2csTxval = roundCur(finalB2cs.reduce((acc, it) => acc + it.txval, 0));
  const b2csIgst = roundCur(finalB2cs.reduce((acc, it) => acc + it.iamt, 0));
  const b2csCgst = roundCur(finalB2cs.reduce((acc, it) => acc + it.camt, 0));
  const b2csSgst = roundCur(finalB2cs.reduce((acc, it) => acc + it.samt, 0));

  const hsnB2cTxval = roundCur(hsnB2c.reduce((acc, it) => acc + it.txval, 0));
  const hsnB2bTxval = roundCur(hsnB2b.reduce((acc, it) => acc + it.txval, 0));

  const ecoTxval = roundCur(ecoList.reduce((acc, it) => acc + it.suppval, 0));
  const ecoIgst = roundCur(ecoList.reduce((acc, it) => acc + it.igst, 0));
  const ecoCgst = roundCur(ecoList.reduce((acc, it) => acc + it.cgst, 0));
  const ecoSgst = roundCur(ecoList.reduce((acc, it) => acc + it.sgst, 0));

  // Cross-reconciliation checks
  if (hsnB2cTxval > 0 && b2csTxval > 0) {
    const diff = Math.abs(b2csTxval - hsnB2cTxval);
    if (diff > 1.0) {
      issues.push({
        severity: 'WARNING',
        code: 'WRN_RECON_B2C_HSN_DIFF',
        message: `B2CS total taxable value (${b2csTxval}) differs from HSN B2C total (${hsnB2cTxval}) by ${diff.toFixed(2)}.`,
        section: 'RECONCILIATION',
        source_file: '',
        source_row: 0,
        gstin: cleanSellerGstin,
        document_number: '',
        guidance: 'Inspect if any credit notes or returns were omitted in HSN.'
      });
    } else {
      issues.push({
        severity: 'INFO',
        code: 'INF_RECON_B2C_MATCH',
        message: `B2CS taxable total (${b2csTxval}) reconciles with HSN B2C total (${hsnB2cTxval}).`,
        section: 'RECONCILIATION',
        source_file: '',
        source_row: 0,
        gstin: cleanSellerGstin,
        document_number: '',
        guidance: ''
      });
    }
  }

  if (ecoTxval > 0) {
    const diffEco = Math.abs((b2bTxval + b2csTxval) - ecoTxval);
    if (diffEco <= 1.0) {
      issues.push({
        severity: 'INFO',
        code: 'INF_RECON_ECO_MATCH',
        message: `ECO supply taxable total (${ecoTxval}) matches B2CS + B2B combined supplies (${b2bTxval + b2csTxval}).`,
        section: 'RECONCILIATION',
        source_file: '',
        source_row: 0,
        gstin: cleanSellerGstin,
        document_number: '',
        guidance: ''
      });
    }
  }

  const errCount = issues.filter(i => i.severity === 'ERROR').length;
  const wrnCount = issues.filter(i => i.severity === 'WARNING').length;
  const infCount = issues.filter(i => i.severity === 'INFO').length;

  return {
    seller_gstin: cleanSellerGstin,
    filing_period: filingPeriod,
    can_generate: (errCount === 0),
    gstr1_json: gstr1Json,
    gstr1_json_str: JSON.stringify(gstr1Json, null, 2),
    reconciliation: {
      b2b: {
        invoices_count: b2bInvoices.length,
        items_count: b2bInvoices.reduce((acc, inv) => acc + inv.itms.length, 0),
        taxable_value: b2bTxval,
        igst: b2bIgst,
        cgst: b2bCgst,
        sgst: b2bSgst,
        total_tax: roundCur(b2bIgst + b2bCgst + b2bSgst),
      },
      b2cs: {
        records_count: finalB2cs.length,
        taxable_value: b2csTxval,
        igst: b2csIgst,
        cgst: b2csCgst,
        sgst: b2csSgst,
        total_tax: roundCur(b2csIgst + b2csCgst + b2csSgst),
      },
      cdnr: {
        notes_count: cdnrList.length,
        taxable_value: roundCur(cdnrList.reduce((acc, it) => acc + it.txval, 0)),
      },
      docs: {
        series_count: docsList.length,
        total_documents: docsList.reduce((acc, it) => acc + it.totnum, 0),
        cancelled_documents: docsList.reduce((acc, it) => acc + it.cancel, 0),
        net_issued: docsList.reduce((acc, it) => acc + it.net_issue, 0),
      },
      hsn: {
        b2c_count: hsnB2c.length,
        b2b_count: hsnB2b.length,
        b2c_taxable_value: hsnB2cTxval,
        b2b_taxable_value: hsnB2bTxval,
        total_taxable_value: roundCur(hsnB2cTxval + hsnB2bTxval),
      },
      supeco: {
        operators_count: ecoList.length,
        taxable_value: ecoTxval,
        igst: ecoIgst,
        cgst: ecoCgst,
        sgst: ecoSgst,
      },
      grand_totals: {
        total_taxable_value: roundCur(b2bTxval + b2csTxval),
        total_igst: roundCur(b2bIgst + b2csIgst),
        total_cgst: roundCur(b2bCgst + b2csCgst),
        total_sgst: roundCur(b2bSgst + b2csSgst),
        total_tax: roundCur(b2bIgst + b2csIgst + b2bCgst + b2csCgst + b2bSgst + b2csSgst),
      }
    },
    validation_summary: {
      errors: errCount,
      warnings: wrnCount,
      info: infCount,
      total: issues.length,
      issues
    },
    audit_log: auditLog,
    loaded_files: loadedFiles
  };
}
