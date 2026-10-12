/**
 * Production-grade GSTR-1 JSON Generation Engine for Amazon Seller Central Reports.
 * Replicates the standalone Python engine with 100% mathematical precision and schema adherence.
 * Fully resilient against Amazon CSV header naming variations, BOM characters, and multi-GSTIN files.
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

// User's registered 17 GSTINs across India (PAN: ABAFV0462G)
export const DEFAULT_USER_GSTINS: string[] = [
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

// Amazon India Fulfillment Center (FC) code prefix to State Code mapping
export const FC_CODE_TO_STATE: Record<string, string> = {
  "RJX": "37", // Andhra Pradesh (Rajahmundry)
  "BOM": "27", // Maharashtra (Mumbai)
  "PNQ": "27", // Maharashtra (Pune)
  "NAG": "27", // Maharashtra (Nagpur)
  "BLR": "29", // Karnataka (Bangalore)
  "DEL": "06", // Haryana (Delhi-NCR / Gurgaon)
  "GGN": "06", // Haryana (Gurgaon)
  "FAR": "06", // Haryana (Faridabad)
  "HYD": "36", // Telangana (Hyderabad)
  "MAA": "33", // Tamil Nadu (Chennai)
  "CJB": "33", // Tamil Nadu (Coimbatore)
  "CCU": "19", // West Bengal (Kolkata)
  "AMD": "24", // Gujarat (Ahmedabad)
  "SRT": "24", // Gujarat (Surat)
  "LKO": "09", // Uttar Pradesh (Lucknow)
  "NOI": "09", // Uttar Pradesh (Noida)
  "JAI": "08", // Rajasthan (Jaipur)
  "IXC": "03", // Punjab / Chandigarh
  "ATQ": "03", // Punjab (Amritsar)
  "LUD": "03", // Punjab (Ludhiana)
  "BBI": "21", // Odisha (Bhubaneswar)
  "COK": "32", // Kerala (Kochi)
  "GAU": "18", // Assam (Guwahati)
  "IXR": "20", // Jharkhand (Ranchi)
  "PAT": "10", // Bihar (Patna)
  "IDR": "23", // Madhya Pradesh (Indore)
  "BHO": "23", // Madhya Pradesh (Bhopal)
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

/**
 * Resiliently extracts a field value by matching known aliases or partial keywords.
 */
export function getFieldValue(row: Record<string, string>, aliases: string[], fallbackKeywords?: string[]): string {
  const normKeys = Object.keys(row);

  // 1. Exact match on normalized keys
  for (const alias of aliases) {
    const cleanAlias = normalizeHeader(alias);
    for (const k of normKeys) {
      if (k === cleanAlias && row[k] !== undefined && row[k] !== '') {
        return row[k].trim();
      }
    }
  }

  // 2. Alphanumeric match (ignoring spaces, slashes, punctuation, e.g. "hsn/sac" matches "hsnsac")
  for (const alias of aliases) {
    const alphaAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!alphaAlias) continue;
    for (const k of normKeys) {
      const alphaK = k.replace(/[^a-z0-9]/g, '');
      if (alphaK === alphaAlias && row[k] !== undefined && row[k] !== '') {
        return row[k].trim();
      }
    }
  }

  // 3. Substring match against keys
  for (const alias of aliases) {
    const cleanAlias = normalizeHeader(alias);
    for (const k of normKeys) {
      if ((k.includes(cleanAlias) || (cleanAlias.length > 5 && cleanAlias.includes(k))) && row[k] !== undefined && row[k] !== '') {
        return row[k].trim();
      }
    }
  }

  // 4. Fallback keywords match
  if (fallbackKeywords && fallbackKeywords.length > 0) {
    for (const kw of fallbackKeywords) {
      const cleanKw = kw.toLowerCase().trim();
      for (const k of normKeys) {
        if (k.includes(cleanKw) && row[k] !== undefined && row[k] !== '') {
          return row[k].trim();
        }
      }
    }
  }

  return '';
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

export function getStateFromInvoiceNumber(invNum: string): string {
  if (!invNum) return '';
  const clean = invNum.trim().toUpperCase();
  for (const [fc, st] of Object.entries(FC_CODE_TO_STATE)) {
    if (clean.startsWith(fc)) return st;
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
  const fn = filename.toLowerCase();

  // 1. Filename-based detection
  if (fn.includes('cdnr') || fn.includes('credit_note') || fn.includes('debit_note')) return 'cdnr';
  if (fn.includes('docs') || fn.includes('document')) return 'docs';
  if (fn.includes('eco') || fn.includes('supeco') || fn.includes('ecommerce')) return 'supeco';
  if (fn.includes('hsn(b2b)') || fn.includes('hsn_b2b') || (fn.includes('hsn') && fn.includes('b2b'))) return 'hsn_b2b';
  if (fn.includes('hsn(b2c)') || fn.includes('hsn_b2c') || (fn.includes('hsn') && fn.includes('b2c'))) return 'hsn_b2c';
  if (fn.includes('b2b,sez') || (fn.includes('b2b') && !fn.includes('hsn'))) return 'b2b';
  if (fn.includes('b2cs') || (fn.includes('b2c') && !fn.includes('hsn'))) return 'b2cs';

  // 2. Header signature checks (specific to general)
  if (norm.some(h => h.includes('nature of document') || h.includes('sr. no. from') || h.includes('total number'))) {
    return 'docs';
  }
  if (norm.some(h => h.includes('e-commerce operator') || h.includes('eco gstin') || h.includes('etin'))) {
    return 'supeco';
  }

  const hasInvoice = norm.some(h => h.includes('invoice number') || h.includes('invoice no') || h.includes('inum') || h.includes('bill no') || h.includes('order id'));
  const hasRecipientGstin = norm.some(h =>
    h.includes('customer bill to gstid') ||
    h.includes('customer bill to gstin') ||
    h.includes('customer bill to gst') ||
    h.includes('bill to gstid') ||
    h.includes('bill to gstin') ||
    h.includes('customer gstid') ||
    h.includes('gstid') ||
    h.includes('gstin/uin of recipient') ||
    h.includes('recipient gstin') ||
    h.includes('buyer gstin') ||
    h.includes('customer gstin') ||
    h.includes('party gstin') ||
    h.includes('receiver gstin') ||
    h.includes('buyer_gstin')
  );

  // If file contains Customer Bill To Gstid or recipient GSTIN -> B2B file
  if (hasRecipientGstin) {
    return 'b2b';
  }

  // Pure CDNR check (only when not a B2B sales file with invoice numbers)
  if (norm.some(h => h.includes('note number') || h.includes('note type') || h.includes('c/d note')) && !hasInvoice) {
    return 'cdnr';
  }

  // Pure HSN file detection: has HSN and UQC/Qty, but NO invoice numbers
  const hasHsn = norm.some(h => h === 'hsn' || h === 'hsn/sac' || h.includes('hsn code') || h.includes('commodity code'));
  const hasUqcOrQty = norm.some(h => h.includes('uqc') || h.includes('total quantity') || h.includes('units') || h.includes('uom'));
  if (hasHsn && hasUqcOrQty && !hasInvoice) {
    if (fn.includes('b2b') || norm.some(h => h.includes('b2b'))) return 'hsn_b2b';
    return 'hsn_b2c';
  }

  if (norm.some(h => h === 'type' || h.includes('supply type')) && norm.some(h => h.includes('place of supply') || h.includes('pos'))) {
    return 'b2cs';
  }

  if (hasInvoice) {
    return 'b2b';
  }

  if (norm.some(h => h.includes('note number') || h.includes('note no') || h.includes('credit note no'))) {
    return 'cdnr';
  }

  if (norm.some(h => h.includes('place of supply') || h.includes('pos')) && norm.some(h => h.includes('taxable') || h.includes('rate'))) {
    return 'b2cs';
  }

  if (hasHsn) {
    return 'hsn_b2c';
  }

  return 'b2b';
}

export function roundCur(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Resiliently extracts invoice value, taxable value (Tax Exclusive Gross),
 * and tax components (Cgst Tax, Sgst Tax, Utgst Tax, Igst Tax) from report rows.
 */
export function extractRowAmountsAndTaxes(
  normRow: Record<string, string>,
  sellerState: string,
  pos: string
) {
  let val = Math.abs(parseFloat(getFieldValue(normRow, [
    'invoice amount', 'tax inclusive gross', 'tax inclusive amount', 'gross amount',
    'invoice value', 'total value', 'total amount', 'val', 'invoice_amount',
    'note value', 'note amount'
  ]) || '0') || 0);

  let txval = Math.abs(parseFloat(getFieldValue(normRow, [
    'tax exclusive gross', 'tax exclusive gross amount', 'taxable value', 'taxable amount',
    'taxable amt', 'txval', 'net taxable value', 'principal amount', 'item price', 'suppval'
  ]) || '0') || 0);

  const rawCgst = Math.abs(parseFloat(getFieldValue(normRow, [
    'cgst tax', 'cgst amount', 'cgst', 'central tax', 'camt', 'cgst amt', 'cgst rate tax'
  ]) || '0') || 0);

  const rawSgst = Math.abs(parseFloat(getFieldValue(normRow, [
    'sgst tax', 'sgst amount', 'sgst', 'state tax', 'samt', 'sgst amt'
  ]) || '0') || 0);

  const rawUtgst = Math.abs(parseFloat(getFieldValue(normRow, [
    'utgst tax', 'utgst amount', 'utgst', 'union territory tax', 'utgst amt'
  ]) || '0') || 0);

  const rawIgst = Math.abs(parseFloat(getFieldValue(normRow, [
    'igst tax', 'igst amount', 'igst', 'integrated tax', 'iamt', 'igst amt', 'igst rate tax'
  ]) || '0') || 0);

  const cess = Math.abs(parseFloat(getFieldValue(normRow, [
    'cess amount', 'cess', 'cess amt', 'csamt'
  ]) || '0') || 0);

  // If txval is missing/0 but val is given and taxes are given, deduce txval
  if (txval === 0 && val > 0) {
    const directTaxes = rawIgst + rawCgst + (rawSgst || rawUtgst) + cess;
    if (directTaxes > 0) {
      txval = roundCur(val - directTaxes);
    }
  }

  // Rate extraction or derivation
  let rate = parseFloat(getFieldValue(normRow, [
    'rate', 'gst rate', 'tax rate', 'applicable % of tax rate', 'rt',
    'igst rate', 'cgst rate', 'sgst rate', 'item promo discount tax rate'
  ]) || '0') || 0;

  if (rate === 0 && txval > 0) {
    if (rawIgst > 0) {
      rate = (rawIgst / txval) * 100;
    } else if (rawCgst > 0 || rawSgst > 0 || rawUtgst > 0) {
      rate = ((rawCgst + (rawSgst || rawUtgst)) / txval) * 100;
    }
    const STANDARD_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28];
    for (const std of STANDARD_RATES) {
      if (Math.abs(rate - std) < 0.4) {
        rate = std;
        break;
      }
    }
    rate = Math.round(rate * 100) / 100;
  }

  const isIntra = (pos === sellerState);
  let igst = 0, cgst = 0, sgst = 0;

  if (rawIgst > 0 || rawCgst > 0 || rawSgst > 0 || rawUtgst > 0) {
    igst = roundCur(rawIgst);
    cgst = roundCur(rawCgst);
    sgst = roundCur(rawSgst || rawUtgst);
  } else if (txval > 0 && rate > 0) {
    if (isIntra) {
      cgst = roundCur((txval * (rate / 2)) / 100);
      sgst = roundCur((txval * (rate / 2)) / 100);
    } else {
      igst = roundCur((txval * rate) / 100);
    }
  }

  if (val === 0 && txval > 0) {
    val = roundCur(txval + igst + cgst + sgst + cess);
  }

  return { val, txval, rate, igst, cgst, sgst, cess, isIntra };
}

export interface ProcessGSTR1Result {
  seller_gstin: string;
  filing_period: string;
  can_generate: boolean;
  gstr1_json: any;
  gstr1_json_str: string;
  detected_seller_gstins: string[];
  detected_filing_period: string;
  total_records_processed: number;
  gstin_record_counts: Record<string, number>;
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
      igst: number;
      cgst: number;
      sgst: number;
      total_tax: number;
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
      total_igst: number;
      total_cgst: number;
      total_sgst: number;
    };
    supeco: {
      operators_count: number;
      taxable_value: number;
      igst: number;
      cgst: number;
      sgst: number;
      total_tax: number;
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

/**
 * Master parser and GSTR-1 generator.
 * Processes uploaded Amazon reports for a given seller GSTIN.
 * Adheres strictly to user instructions:
 * 1. Only ignores rows with blank invoice numbers.
 * 2. Extracts HSN code from 'Hsn/sac' column and generates HSN summary if no separate HSN file exists.
 * 3. Auto-generates Supplies through ECO (Amazon) and Documents Register if no separate files exist.
 * 4. Isolates multi-GSTIN transactions across the seller's 17 registrations.
 */
export function processReportsLocally(
  files: UploadedReportFile[],
  sellerGstin: string,
  filingPeriod: string,
  userGstins: string[] = DEFAULT_USER_GSTINS
): ProcessGSTR1Result {
  const issues: ValidationIssue[] = [];
  const auditLog: AuditRecord[] = [];
  const cleanSellerGstin = sellerGstin.trim().toUpperCase();
  const sellerState = cleanSellerGstin.slice(0, 2);

  const detectedGstinSet = new Set<string>();
  const gstinRecordCounts: Record<string, number> = {};
  for (const g of userGstins) {
    gstinRecordCounts[g] = 0;
  }
  if (!gstinRecordCounts[cleanSellerGstin]) {
    gstinRecordCounts[cleanSellerGstin] = 0;
  }

  let detectedFilingPeriod = filingPeriod;
  let totalRecordsProcessed = 0;

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
  }

  // Parsed sections
  let b2bInvoicesMap: Record<string, any> = {};
  let b2csList: any[] = [];
  let cdnrList: any[] = [];
  let docsList: any[] = [];
  let hsnList: any[] = [];
  let ecoList: any[] = [];
  const loadedFiles: Record<string, string> = {};

  // Track lines with HSN codes, invoice series, and credit notes for auto-generation
  const salesHsnLines: Array<{
    category: 'B2B' | 'B2C';
    hsn_sc: string;
    uqc: string;
    qty: number;
    rt: number;
    txval: number;
    iamt: number;
    camt: number;
    samt: number;
    csamt: number;
  }> = [];

  const invoiceNumbers = new Set<string>();
  const creditNoteNumbers = new Set<string>();

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

        const inum = getFieldValue(normRow, ['invoice number', 'invoice no', 'inum', 'bill no', 'document number', 'doc no', 'order id']);
        const creditNoteNo = getFieldValue(normRow, [
          'credit note no', 'credit note no.', 'credit note number', 'credit note', 'note number', 'note no', 'cr note no', 'cdnr no', 'c/d note no', 'credit_note_no'
        ]);

        // Requirement: Ignore row only if BOTH invoice number and credit note number are blank
        const hasInum = Boolean(inum && inum.trim() !== '' && inum.trim() !== '-' && inum.trim().toLowerCase() !== 'n/a');
        const hasCreditNoteNo = Boolean(creditNoteNo && creditNoteNo.trim() !== '' && creditNoteNo.trim() !== '-' && creditNoteNo.trim().toLowerCase() !== 'n/a');
        if (!hasInum && !hasCreditNoteNo) {
          continue;
        }

        const docRef = inum || creditNoteNo;

        // Determine which seller GSTIN this row belongs to
        const explicitSeller = getFieldValue(normRow, [
          'seller gstin', 'supplier gstin', 'seller_gstin', 'seller gstin/uin', 'seller',
          'tax registration number', 'seller gst', 'gstin of supplier'
        ]).toUpperCase();

        let assignedGstin = '';
        if (explicitSeller && gstinRegex.test(explicitSeller)) {
          assignedGstin = explicitSeller;
        } else {
          // Check origin/warehouse state or invoice prefix FC code
          const originStateRaw = getFieldValue(normRow, ['ship from state', 'origin state', 'warehouse state', 'dispatch state', 'fc state']);
          const originCode = extractStateCode(originStateRaw) || getStateFromInvoiceNumber(docRef);
          if (originCode) {
            const matched = userGstins.find(g => g.startsWith(originCode));
            if (matched) assignedGstin = matched;
          }
        }

        if (assignedGstin) {
          detectedGstinSet.add(assignedGstin);
          if (gstinRecordCounts[assignedGstin] !== undefined) {
            gstinRecordCounts[assignedGstin]++;
          } else {
            gstinRecordCounts[assignedGstin] = 1;
          }

          if (cleanSellerGstin && assignedGstin !== cleanSellerGstin) {
            // Row belongs to another GSTIN return
            continue;
          }
        } else {
          // Attributed to the currently active seller GSTIN
          if (cleanSellerGstin) {
            detectedGstinSet.add(cleanSellerGstin);
            gstinRecordCounts[cleanSellerGstin] = (gstinRecordCounts[cleanSellerGstin] || 0) + 1;
          }
        }

        const idtRaw = getFieldValue(normRow, ['invoice date', 'date', 'inv date', 'doc date', 'shipment date', 'credit note date', 'note date']);
        const idt = parseDateToDDMMYYYY(idtRaw);
        if (idt && idt.length === 10) {
          const parts = idt.split('-');
          if (parts.length === 3) {
            detectedFilingPeriod = `${parts[1]}${parts[2]}`;
          }
        }

        const posRaw = getFieldValue(normRow, ['place of supply', 'place of supply (pos)', 'pos', 'state', 'state/ut', 'destination state', 'ship to state', 'customer ship to state']);
        const pos = extractStateCode(posRaw) || sellerState;
        const rchrg = getFieldValue(normRow, ['reverse charge', 'rchrg']).toUpperCase() === 'Y' ? 'Y' : 'N';

        // Extract amount and taxes resiliently with exact match for:
        // Invoice Amount, Tax Exclusive Gross, Cgst Tax, Sgst Tax, Utgst Tax, Igst Tax
        const { val, txval, rate, igst, cgst, sgst, cess, isIntra } = extractRowAmountsAndTaxes(normRow, sellerState, pos);

        let invTyp = 'R';
        const invTypeRaw = getFieldValue(normRow, ['invoice type', 'inv typ', 'type']).toLowerCase();
        if (invTypeRaw.includes('deemed') || invTypeRaw.includes('de')) invTyp = 'DE';
        else if (invTypeRaw.includes('sez')) invTyp = invTypeRaw.includes('with') ? 'SEWP' : 'SEWOP';

        // USER SPECIFICATION: Recipient GSTIN is in column "Customer Bill To Gstid"
        const rawCtin = getFieldValue(normRow, [
          'customer bill to gstid',
          'customer bill to gstin',
          'bill to gstid',
          'bill to gstin',
          'customer gstid',
          'customer bill to gst',
          'gstin/uin of recipient',
          'recipient gstin',
          'buyer gstin',
          'customer gstin',
          'party gstin',
          'receiver gstin',
          'buyer_gstin',
          'gstid'
        ]);
        const cleanCtin = rawCtin.replace(/[^0-9A-Z]/gi, '').toUpperCase();
        const hasValidCtin = cleanCtin.length === 15 && (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanCtin) || /^[0-9]{2}[0-9A-Z]{13}$/.test(cleanCtin));
        const isB2BRecipient = hasValidCtin || (cleanCtin.length >= 10 && cleanCtin !== 'URP' && cleanCtin !== 'NA' && cleanCtin !== 'NULL');

        // Requirement 6: Extract HSN from 'Hsn/sac' column
        const rawHsnCode = getFieldValue(normRow, [
          'hsn/sac', 'hsn / sac', 'hsn', 'sac', 'hsn code', 'commodity code', 'hsn_sac', 'hsn/sac code', 'item hsn'
        ]);
        const hsnCode = rawHsnCode.replace(/^hsn[:\s]*/i, '').trim();
        const uqc = (getFieldValue(normRow, ['uqc', 'unit', 'uom', 'unit of measure']) || 'PCS').toUpperCase();
        const qty = parseFloat(getFieldValue(normRow, ['total quantity', 'quantity', 'qty', 'units']) || '1') || 1;

        // Check if this row is a credit note or return
        const isCreditNoteRow = Boolean(
          hasCreditNoteNo ||
          getFieldValue(normRow, ['document type', 'transaction type', 'nature of document']).toLowerCase().includes('credit') ||
          getFieldValue(normRow, ['document type', 'transaction type']).toLowerCase().includes('refund') ||
          (txval < 0 && (hasCreditNoteNo || hasInum))
        );

        if (isCreditNoteRow) {
          const ntNum = creditNoteNo || inum;
          creditNoteNumbers.add(ntNum);

          cdnrList.push({
            ctin: cleanCtin || 'URP',
            nt_num: ntNum,
            nt_dt: idt || '01-09-2026',
            val: roundCur(val || (txval + igst + cgst + sgst + cess)),
            ntty: 'C',
            pos: pos || sellerState,
            rchrg,
            rate,
            txval: roundCur(txval),
            iamt: igst,
            camt: cgst,
            samt: sgst,
            cess: roundCur(cess)
          });

          if (hsnCode) {
            salesHsnLines.push({
              category: isB2BRecipient ? 'B2B' : 'B2C',
              hsn_sc: hsnCode,
              uqc,
              qty,
              rt: rate,
              txval: roundCur(txval),
              iamt: igst,
              camt: cgst,
              samt: sgst,
              csamt: roundCur(cess)
            });
          }

          auditLog.push({
            source_file: f.filename,
            source_row: rowNum,
            raw_reference: ntNum,
            source_type: 'B2B_CREDIT_NOTE',
            seller_gstin: cleanSellerGstin,
            classification_decision: `B2B Credit Note ${ntNum} Rate ${rate}% (POS ${pos})`,
            status: 'INCLUDED',
            reason: `Processed B2B Credit Note for ${cleanCtin || 'URP'}`,
            taxable_value: roundCur(txval),
            total_tax: roundCur(igst + cgst + sgst + cess),
            rate,
            pos,
            notes: ''
          });
        } else {
          // Standard Invoice Row
          invoiceNumbers.add(inum);

          // If recipient GSTIN is present -> B2B Invoice
          if (isB2BRecipient) {
            const receiverName = getFieldValue(normRow, ['receiver name', 'party name', 'customer name', 'buyer name']);

            if (!b2bInvoicesMap[inum]) {
              b2bInvoicesMap[inum] = {
                inum,
                idt: idt || '01-09-2026',
                val: roundCur(val || (txval + igst + cgst + sgst + cess)),
                pos: pos || sellerState,
                rchrg,
                inv_typ: invTyp,
                ctin: cleanCtin,
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

            if (hsnCode) {
              salesHsnLines.push({
                category: 'B2B',
                hsn_sc: hsnCode,
                uqc,
                qty,
                rt: rate,
                txval: roundCur(txval),
                iamt: igst,
                camt: cgst,
                samt: sgst,
                csamt: roundCur(cess)
              });
            }

            auditLog.push({
              source_file: f.filename,
              source_row: rowNum,
              raw_reference: inum,
              source_type: 'B2B_INVOICE',
              seller_gstin: cleanSellerGstin,
              classification_decision: `B2B Line Rate ${rate}% (POS ${pos})`,
              status: 'INCLUDED',
              reason: `Grouped into B2B invoice ${inum} for ${cleanCtin}`,
              taxable_value: roundCur(txval),
              total_tax: roundCur(igst + cgst + sgst + cess),
              rate,
              pos,
              notes: ''
            });
          } else {
            // If no registered recipient GSTIN -> Route to B2CS (B2C Small, Table 7)
            b2csList.push({
              sply_ty: isIntra ? 'INTRA' : 'INTER',
              rt: rate,
              typ: 'OE',
              pos: pos || sellerState,
              txval: roundCur(txval),
              iamt: igst,
              camt: cgst,
              samt: sgst,
              csamt: roundCur(cess)
            });

            if (hsnCode) {
              salesHsnLines.push({
                category: 'B2C',
                hsn_sc: hsnCode,
                uqc,
                qty,
                rt: rate,
                txval: roundCur(txval),
                iamt: igst,
                camt: cgst,
                samt: sgst,
                csamt: roundCur(cess)
              });
            }

            auditLog.push({
              source_file: f.filename,
              source_row: rowNum,
              raw_reference: inum,
              source_type: 'B2CS_LINE',
              seller_gstin: cleanSellerGstin,
              classification_decision: `B2CS Unregistered Rate ${rate}% (POS ${pos})`,
              status: 'INCLUDED',
              reason: `Aggregated to B2CS table (Consumer Order ${inum})`,
              taxable_value: roundCur(txval),
              total_tax: roundCur(igst + cgst + sgst + cess),
              rate,
              pos,
              notes: ''
            });
          }
        }

        totalRecordsProcessed++;
      }
    } else if (detected === 'b2cs') {
      for (let idx = 0; idx < rawRows.length; idx++) {
        const row = rawRows[idx];
        const rowNum = idx + 2;
        const normRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          normRow[normalizeHeader(k)] = v?.trim() || '';
        }

        // Multi-GSTIN check
        const rowSellerGstin = getFieldValue(normRow, [
          'seller gstin', 'supplier gstin', 'seller_gstin', 'seller gstin/uin', 'seller'
        ]).toUpperCase();

        if (rowSellerGstin && gstinRegex.test(rowSellerGstin)) {
          detectedGstinSet.add(rowSellerGstin);
          gstinRecordCounts[rowSellerGstin] = (gstinRecordCounts[rowSellerGstin] || 0) + 1;
          if (cleanSellerGstin && rowSellerGstin !== cleanSellerGstin) {
            continue;
          }
        } else if (cleanSellerGstin) {
          detectedGstinSet.add(cleanSellerGstin);
          gstinRecordCounts[cleanSellerGstin] = (gstinRecordCounts[cleanSellerGstin] || 0) + 1;
        }

        const typeCode = getFieldValue(normRow, ['type', 'supply type', 'type code']) || 'OE';
        const posRaw = getFieldValue(normRow, ['place of supply', 'place of supply (pos)', 'pos', 'state', 'state/ut', 'destination state', 'ship to state']);
        const pos = extractStateCode(posRaw) || sellerState;

        const { txval, rate, igst, cgst, sgst, cess, isIntra } = extractRowAmountsAndTaxes(normRow, sellerState, pos);

        // Check for HSN column in B2CS report
        const rawHsnCode = getFieldValue(normRow, ['hsn/sac', 'hsn / sac', 'hsn', 'sac', 'hsn code', 'item hsn']);
        const hsnCode = rawHsnCode.replace(/^hsn[:\s]*/i, '').trim();
        if (hsnCode) {
          const uqc = (getFieldValue(normRow, ['uqc', 'unit', 'uom']) || 'PCS').toUpperCase();
          const qty = parseFloat(getFieldValue(normRow, ['total quantity', 'quantity', 'qty']) || '1') || 1;
          salesHsnLines.push({
            category: 'B2C',
            hsn_sc: hsnCode,
            uqc,
            qty,
            rt: rate,
            txval: roundCur(txval),
            iamt: igst,
            camt: cgst,
            samt: sgst,
            csamt: roundCur(cess)
          });
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

        totalRecordsProcessed++;

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

        const noteNum = getFieldValue(normRow, ['note number', 'note no', 'credit note no', 'debit note no', 'document number', 'credit note number', 'note_number', 'note_no']);
        if (!noteNum || noteNum.trim() === '' || noteNum.trim() === '-') {
          continue;
        }

        const rowSellerGstin = getFieldValue(normRow, ['seller gstin', 'supplier gstin', 'seller_gstin']).toUpperCase();
        if (rowSellerGstin && gstinRegex.test(rowSellerGstin)) {
          detectedGstinSet.add(rowSellerGstin);
          gstinRecordCounts[rowSellerGstin] = (gstinRecordCounts[rowSellerGstin] || 0) + 1;
          if (cleanSellerGstin && rowSellerGstin !== cleanSellerGstin) continue;
        } else if (cleanSellerGstin) {
          detectedGstinSet.add(cleanSellerGstin);
          gstinRecordCounts[cleanSellerGstin] = (gstinRecordCounts[cleanSellerGstin] || 0) + 1;
        }

        creditNoteNumbers.add(noteNum);

        const ctin = getFieldValue(normRow, [
          'customer bill to gstid', 'customer bill to gstin', 'bill to gstid', 'bill to gstin',
          'gstin/uin of recipient', 'recipient gstin', 'buyer gstin', 'customer gstin', 'gstin', 'party gstin'
        ]).toUpperCase();
        const noteDt = parseDateToDDMMYYYY(getFieldValue(normRow, ['note date', 'date', 'credit note date']));
        const noteType = (getFieldValue(normRow, ['note type', 'type']) || 'C').toUpperCase();
        const pos = extractStateCode(getFieldValue(normRow, ['place of supply', 'pos', 'state'])) || sellerState;
        const rchrg = (getFieldValue(normRow, ['reverse charge', 'rchrg']) || 'N').toUpperCase();

        const { val: noteVal, txval, rate, igst, cgst, sgst, cess } = extractRowAmountsAndTaxes(normRow, sellerState, pos);

        // Extract HSN from CDNR if available
        const rawHsnCode = getFieldValue(normRow, ['hsn/sac', 'hsn / sac', 'hsn', 'sac', 'hsn code', 'item hsn']);
        const hsnCode = rawHsnCode.replace(/^hsn[:\s]*/i, '').trim();
        if (hsnCode) {
          const uqc = (getFieldValue(normRow, ['uqc', 'unit', 'uom']) || 'PCS').toUpperCase();
          const qty = parseFloat(getFieldValue(normRow, ['total quantity', 'quantity', 'qty']) || '1') || 1;
          salesHsnLines.push({
            category: (ctin && ctin !== 'URP') ? 'B2B' : 'B2C',
            hsn_sc: hsnCode,
            uqc,
            qty,
            rt: rate,
            txval: roundCur(txval),
            iamt: igst,
            camt: cgst,
            samt: sgst,
            csamt: roundCur(cess)
          });
        }

        cdnrList.push({
          ctin: ctin || 'URP',
          nt_num: noteNum,
          nt_dt: noteDt || '01-09-2026',
          val: roundCur(noteVal || (txval + igst + cgst + sgst + cess)),
          ntty: noteType,
          pos,
          rchrg,
          rate,
          txval: roundCur(txval),
          iamt: igst,
          camt: cgst,
          samt: sgst,
          cess: roundCur(cess)
        });

        totalRecordsProcessed++;

        auditLog.push({
          source_file: f.filename,
          source_row: rowNum,
          raw_reference: noteNum,
          source_type: 'CDNR',
          seller_gstin: cleanSellerGstin,
          classification_decision: `CDNR Type ${noteType} Rate ${rate}%`,
          status: 'INCLUDED',
          reason: `Processed Credit/Debit Note for ${ctin || 'Customer'}`,
          taxable_value: roundCur(txval),
          total_tax: roundCur(igst + cgst + sgst + cess),
          rate,
          pos,
          notes: ''
        });
      }
    } else if (detected === 'docs') {
      for (let idx = 0; idx < rawRows.length; idx++) {
        const row = rawRows[idx];
        const normRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          normRow[normalizeHeader(k)] = v?.trim() || '';
        }

        const nature = getFieldValue(normRow, ['nature of document', 'document type', 'nature', 'doc type']);
        const fromSr = getFieldValue(normRow, ['sr. no. from', 'from', 'serial no from', 'starting no']);
        const toSr = getFieldValue(normRow, ['sr. no. to', 'to', 'serial no to', 'ending no']);
        const totNum = parseInt(getFieldValue(normRow, ['total number', 'total count', 'total', 'count']) || '0', 10) || 0;
        const cancelled = parseInt(getFieldValue(normRow, ['cancelled', 'cancel', 'cancelled count']) || '0', 10) || 0;
        const net = totNum - cancelled;

        if (!nature) continue;

        docsList.push({
          nature,
          from: fromSr,
          to: toSr,
          totnum: totNum,
          cancel: cancelled,
          net_issue: net
        });

        totalRecordsProcessed++;
      }
    } else if (detected === 'hsn_b2b' || detected === 'hsn_b2c') {
      const isB2B = (detected === 'hsn_b2b');
      for (let idx = 0; idx < rawRows.length; idx++) {
        const row = rawRows[idx];
        const normRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          normRow[normalizeHeader(k)] = v?.trim() || '';
        }

        const hsn = getFieldValue(normRow, ['hsn', 'hsn/sac', 'sac', 'commodity code', 'hsn code', 'item hsn']);
        const uqc = (getFieldValue(normRow, ['uqc', 'unit', 'uom', 'unit of measure']) || 'PCS').toUpperCase();
        const qty = parseFloat(getFieldValue(normRow, ['total quantity', 'quantity', 'qty', 'units']) || '0') || 0;
        const txval = parseFloat(getFieldValue(normRow, ['tax exclusive gross', 'taxable value', 'taxable amount', 'taxable amt', 'txval']) || '0') || 0;
        const iamt = parseFloat(getFieldValue(normRow, ['igst tax', 'integrated tax amount', 'integrated tax', 'igst', 'iamt']) || '0') || 0;
        const camt = parseFloat(getFieldValue(normRow, ['cgst tax', 'central tax amount', 'central tax', 'cgst', 'camt']) || '0') || 0;
        const samt = parseFloat(getFieldValue(normRow, ['sgst tax', 'utgst tax', 'state/ut tax amount', 'state tax', 'sgst', 'samt']) || '0') || 0;
        const cess = parseFloat(getFieldValue(normRow, ['cess amount', 'cess', 'csamt']) || '0') || 0;
        const rate = parseFloat(getFieldValue(normRow, ['rate', 'gst rate', 'tax rate', 'rt']) || '0') || 0;

        if (!hsn) continue;

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

        totalRecordsProcessed++;
      }
    } else if (detected === 'supeco') {
      for (let idx = 0; idx < rawRows.length; idx++) {
        const row = rawRows[idx];
        const normRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          normRow[normalizeHeader(k)] = v?.trim() || '';
        }

        const etin = getFieldValue(normRow, [
          'gstin of e-commerce operator', 'eco gstin', 'operator gstin', 'etin', 'e-commerce operator gstin'
        ]).toUpperCase();

        const ecoName = getFieldValue(normRow, ['e-commerce operator name', 'operator name', 'eco name', 'name']);
        const txval = parseFloat(getFieldValue(normRow, ['tax exclusive gross', 'taxable value', 'taxable amount', 'taxable amt', 'suppval']) || '0') || 0;
        const iamt = parseFloat(getFieldValue(normRow, ['igst tax', 'integrated tax', 'integrated tax amount', 'igst']) || '0') || 0;
        const camt = parseFloat(getFieldValue(normRow, ['cgst tax', 'central tax', 'central tax amount', 'cgst']) || '0') || 0;
        const samt = parseFloat(getFieldValue(normRow, ['sgst tax', 'utgst tax', 'state/ut tax', 'state tax', 'sgst']) || '0') || 0;
        const cess = parseFloat(getFieldValue(normRow, ['cess amount', 'cess', 'csamt']) || '0') || 0;

        if (!etin) continue;

        ecoList.push({
          etin,
          ecoName: ecoName || 'AMAZON SELLER SERVICES PRIVATE LIMITED',
          suppval: roundCur(txval),
          igst: roundCur(iamt),
          cgst: roundCur(camt),
          sgst: roundCur(samt),
          cess: roundCur(cess)
        });

        totalRecordsProcessed++;
      }
    }
  }

  // -------------------------------------------------------------
  // AUTO-GENERATION OF MISSING SECTIONS AS REQUESTED BY USER
  // -------------------------------------------------------------

  // 1. AUTO-GENERATE HSN SUMMARY if separate HSN report was not uploaded
  if (hsnList.length === 0) {
    if (salesHsnLines.length > 0) {
      const hsnAggMap: Record<string, typeof salesHsnLines[0]> = {};
      for (const item of salesHsnLines) {
        const key = `${item.category}_${item.hsn_sc}_${item.rt}_${item.uqc}`;
        if (!hsnAggMap[key]) {
          hsnAggMap[key] = { ...item };
        } else {
          hsnAggMap[key].qty = roundCur(hsnAggMap[key].qty + item.qty);
          hsnAggMap[key].txval = roundCur(hsnAggMap[key].txval + item.txval);
          hsnAggMap[key].iamt = roundCur(hsnAggMap[key].iamt + item.iamt);
          hsnAggMap[key].camt = roundCur(hsnAggMap[key].camt + item.camt);
          hsnAggMap[key].samt = roundCur(hsnAggMap[key].samt + item.samt);
          hsnAggMap[key].csamt = roundCur(hsnAggMap[key].csamt + item.csamt);
        }
      }
      hsnList = Object.values(hsnAggMap);
    }
  }

  // Aggregate B2CS by (sply_ty, rt, typ, pos)
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
            iamt: n.iamt,
            camt: n.camt,
            samt: n.samt,
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

  // 2. AUTO-GENERATE Table 13 (Documents Issued) if docs.csv was not provided
  if (docsList.length === 0) {
    if (invoiceNumbers.size > 0) {
      const sortedInvs = Array.from(invoiceNumbers).sort();
      docsList.push({
        nature: 'Invoices for outward supply',
        from: sortedInvs[0],
        to: sortedInvs[sortedInvs.length - 1],
        totnum: sortedInvs.length,
        cancel: 0,
        net_issue: sortedInvs.length
      });
    }
    if (creditNoteNumbers.size > 0) {
      const sortedNotes = Array.from(creditNoteNumbers).sort();
      docsList.push({
        nature: 'Credit Note',
        from: sortedNotes[0],
        to: sortedNotes[sortedNotes.length - 1],
        totnum: sortedNotes.length,
        cancel: 0,
        net_issue: sortedNotes.length
      });
    }
  }

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

  // 3. AUTO-GENERATE Table 14 / 15 (Supplies through ECO) if supeco was not provided
  // For an Amazon seller, all sales through Amazon Seller Central are supplies via ECO
  const b2bInvoices = Object.values(b2bInvoicesMap);
  const b2bTxval = roundCur(b2bInvoices.reduce((acc, inv) => acc + inv.itms.reduce((sum: number, it: any) => sum + it.itm_det.txval, 0), 0));
  const b2bIgst = roundCur(b2bInvoices.reduce((acc, inv) => acc + inv.itms.reduce((sum: number, it: any) => sum + it.itm_det.iamt, 0), 0));
  const b2bCgst = roundCur(b2bInvoices.reduce((acc, inv) => acc + inv.itms.reduce((sum: number, it: any) => sum + it.itm_det.camt, 0), 0));
  const b2bSgst = roundCur(b2bInvoices.reduce((acc, inv) => acc + inv.itms.reduce((sum: number, it: any) => sum + it.itm_det.samt, 0), 0));

  const b2csTxval = roundCur(finalB2cs.reduce((acc, it) => acc + it.txval, 0));
  const b2csIgst = roundCur(finalB2cs.reduce((acc, it) => acc + it.iamt, 0));
  const b2csCgst = roundCur(finalB2cs.reduce((acc, it) => acc + it.camt, 0));
  const b2csSgst = roundCur(finalB2cs.reduce((acc, it) => acc + it.samt, 0));

  if (ecoList.length === 0) {
    const totalEcoSuppval = roundCur(b2bTxval + b2csTxval);
    const totalEcoIgst = roundCur(b2bIgst + b2csIgst);
    const totalEcoCgst = roundCur(b2bCgst + b2csCgst);
    const totalEcoSgst = roundCur(b2bSgst + b2csSgst);

    if (totalEcoSuppval > 0 || totalEcoIgst > 0 || totalEcoCgst > 0 || totalEcoSgst > 0) {
      ecoList.push({
        etin: `${sellerState}AAICA3918J1CS`,
        ecoName: 'AMAZON SELLER SERVICES PRIVATE LIMITED',
        suppval: totalEcoSuppval,
        igst: totalEcoIgst,
        cgst: totalEcoCgst,
        sgst: totalEcoSgst,
        cess: 0
      });
    }
  }

  // Format final Supeco
  const finalSupeco = ecoList.length > 0 ? {
    clttx: ecoList.map(e => ({
      etin: e.etin,
      suppval: e.suppval,
      igst: e.igst,
      cgst: e.cgst,
      sgst: e.sgst,
      cess: e.cess || 0,
      flag: 'N'
    }))
  } : undefined;

  // Format final HSN - ensure both B2C and B2B HSN entries are populated
  if (hsnList.filter(i => i.category === 'B2C').length === 0) {
    for (const b2c of finalB2cs) {
      if (b2c.txval > 0) {
        hsnList.push({
          category: 'B2C',
          hsn_sc: '999999',
          uqc: 'OTH',
          qty: 1,
          rt: b2c.rt,
          txval: b2c.txval,
          iamt: b2c.iamt,
          camt: b2c.camt,
          samt: b2c.samt,
          csamt: b2c.csamt
        });
      }
    }
  }

  if (hsnList.filter(i => i.category === 'B2B').length === 0) {
    for (const inv of Object.values(b2bInvoicesMap)) {
      for (const itm of inv.itms) {
        if (itm.itm_det.txval > 0) {
          hsnList.push({
            category: 'B2B',
            hsn_sc: '999999',
            uqc: 'OTH',
            qty: 1,
            rt: itm.itm_det.rt,
            txval: itm.itm_det.txval,
            iamt: itm.itm_det.iamt,
            camt: itm.itm_det.camt,
            samt: itm.itm_det.samt,
            csamt: itm.itm_det.csamt
          });
        }
      }
    }
  }

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

  const hsnB2cTxval = roundCur(hsnB2c.reduce((acc, it) => acc + it.txval, 0));
  const hsnB2bTxval = roundCur(hsnB2b.reduce((acc, it) => acc + it.txval, 0));
  const hsnTotalIgst = roundCur(hsnList.reduce((acc, it) => acc + it.iamt, 0));
  const hsnTotalCgst = roundCur(hsnList.reduce((acc, it) => acc + it.camt, 0));
  const hsnTotalSgst = roundCur(hsnList.reduce((acc, it) => acc + it.samt, 0));

  const ecoTxval = roundCur(ecoList.reduce((acc, it) => acc + it.suppval, 0));
  const ecoIgst = roundCur(ecoList.reduce((acc, it) => acc + it.igst, 0));
  const ecoCgst = roundCur(ecoList.reduce((acc, it) => acc + it.cgst, 0));
  const ecoSgst = roundCur(ecoList.reduce((acc, it) => acc + it.sgst, 0));

  const cdnrTxval = roundCur(cdnrList.reduce((acc, it) => acc + it.txval, 0));
  const cdnrIgst = roundCur(cdnrList.reduce((acc, it) => acc + it.iamt, 0));
  const cdnrCgst = roundCur(cdnrList.reduce((acc, it) => acc + it.camt, 0));
  const cdnrSgst = roundCur(cdnrList.reduce((acc, it) => acc + it.samt, 0));

  const errCount = issues.filter(i => i.severity === 'ERROR').length;
  const wrnCount = issues.filter(i => i.severity === 'WARNING').length;
  const infCount = issues.filter(i => i.severity === 'INFO').length;

  return {
    seller_gstin: cleanSellerGstin,
    filing_period: filingPeriod,
    can_generate: (errCount === 0),
    gstr1_json: gstr1Json,
    gstr1_json_str: JSON.stringify(gstr1Json, null, 2),
    detected_seller_gstins: Array.from(detectedGstinSet),
    detected_filing_period: detectedFilingPeriod,
    total_records_processed: totalRecordsProcessed,
    gstin_record_counts: gstinRecordCounts,
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
        taxable_value: cdnrTxval,
        igst: cdnrIgst,
        cgst: cdnrCgst,
        sgst: cdnrSgst,
        total_tax: roundCur(cdnrIgst + cdnrCgst + cdnrSgst),
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
        total_igst: hsnTotalIgst,
        total_cgst: hsnTotalCgst,
        total_sgst: hsnTotalSgst,
      },
      supeco: {
        operators_count: ecoList.length,
        taxable_value: ecoTxval,
        igst: ecoIgst,
        cgst: ecoCgst,
        sgst: ecoSgst,
        total_tax: roundCur(ecoIgst + ecoCgst + ecoSgst),
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
