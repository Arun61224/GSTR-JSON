"""
CSV adapters for Amazon Seller Central GST reports.
Performs resilient column signature detection, BOM stripping, header normalization,
and structured parsing into normalized transaction models.
"""

import csv
import io
import re
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any

from engine.constants import DOCUMENT_NATURE_MAP
from engine.models import (
    AuditRecord,
    InvoiceType,
    NormalizedB2BInvoice,
    NormalizedB2BInvoiceItem,
    NormalizedB2CSummary,
    NormalizedCreditDebitNote,
    NormalizedDocIssueEntry,
    NormalizedHSNItem,
    NormalizedEcoSupply,
    Severity,
    ValidationIssue,
)
from engine.tax_calculator import (
    determine_supply_type,
    extract_state_code,
    parse_decimal_safe,
    round_cur,
)


def normalize_header(header: str) -> str:
    """Strip whitespace, BOM, quotes and lowercase for comparison."""
    if not header:
        return ""
    h = header.strip().lstrip("\ufeff").replace('"', "").replace("'", "")
    h = re.sub(r"\s+", " ", h)
    return h.strip().lower()


def parse_date_to_ddmmyyyy(raw_date: Any) -> str:
    """
    Parses various date formats from Amazon reports into standard DD-MM-YYYY.
    Supports formats like:
      - '08-09-2026'
      - '1-Sep-26'
      - '01-Sep-2026'
      - '2026-09-08'
      - '08/09/2026'
    """
    if not raw_date:
        return ""
    d_str = str(raw_date).strip()
    if not d_str:
        return ""

    formats = [
        "%d-%m-%Y",
        "%d-%b-%y",
        "%d-%b-%Y",
        "%d/%m/%Y",
        "%Y-%m-%d",
        "%d-%m-%y",
        "%d/%m/%y",
        "%Y/%m/%d",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(d_str, fmt)
            # If 2-digit year resulted in 19xx for 20xx
            if dt.year < 2000:
                dt = dt.replace(year=dt.year + 100)
            return dt.strftime("%d-%m-%Y")
        except ValueError:
            continue

    # Fallback regex extraction if standard format matches DD-MM-YYYY
    match = re.match(r"^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$", d_str)
    if match:
        day, month, year = match.groups()
        if len(year) == 2:
            year = "20" + year
        return f"{int(day):02d}-{int(month):02d}-{year}"

    return d_str


def detect_file_type(headers: List[str], filename: str = "") -> str:
    """
    Detects which of the 7 Amazon report types the file represents
    based on column signatures and filename hints.
    """
    norm_headers = [normalize_header(h) for h in headers]
    h_set = set(norm_headers)
    fname_lower = filename.lower()

    # 1. Filename-based detection
    if "cdnr" in fname_lower or "credit" in fname_lower or "debit" in fname_lower:
        return "cdnr"
    if "docs" in fname_lower or "document" in fname_lower:
        return "docs"
    if "eco" in fname_lower or "supeco" in fname_lower or "ecommerce" in fname_lower:
        return "supeco"
    if "hsn(b2b)" in fname_lower or "hsn_b2b" in fname_lower or ("hsn" in fname_lower and "b2b" in fname_lower):
        return "hsn_b2b"
    if "hsn(b2c)" in fname_lower or "hsn_b2c" in fname_lower or ("hsn" in fname_lower and "b2c" in fname_lower):
        return "hsn_b2c"
    if "b2b,sez" in fname_lower or ("b2b" in fname_lower and "hsn" not in fname_lower):
        return "b2b"
    if "b2cs" in fname_lower or ("b2c" in fname_lower and "hsn" not in fname_lower):
        return "b2cs"

    # 2. CDNR (Credit/Debit note)
    if any("note number" in h or "note no" in h or "note type" in h for h in h_set):
        return "cdnr"

    # 3. Documents Issued
    if any("nature of document" in h for h in h_set) or (
        any("sr. no. from" in h for h in h_set) and any("sr. no. to" in h for h in h_set)
    ):
        return "docs"

    # 4. Supplies through E-commerce
    if any("e-commerce operator" in h or "eco gstin" in h or "etin" in h for h in h_set):
        return "supeco"

    # 5. HSN summaries
    if any("hsn" in h or "sac" in h for h in h_set):
        if "b2c" in fname_lower or any("b2c" in h for h in h_set):
            return "hsn_b2c"
        if "b2b" in fname_lower or any("b2b" in h for h in h_set):
            return "hsn_b2b"
        return "hsn_b2c" if "b2c" in fname_lower else "hsn_b2b"

    # 6. B2B, SEZ, DE
    if any("invoice" in h or "inum" in h for h in h_set) and any(
        "recipient" in h or "receiver" in h or "buyer" in h or "party" in h or "gstin" in h for h in h_set
    ):
        return "b2b"

    # 7. B2CS
    if (
        any("type" in h or "place of supply" in h or "pos" in h or "state" in h for h in h_set)
    ) and any("taxable" in h or "rate" in h or "amount" in h for h in h_set):
        return "b2cs"

    return "unknown"


class AmazonCSVAdapter:
    """Reads Amazon Seller Central CSV files and converts into normalized records."""

    def __init__(self):
        self.issues: List[ValidationIssue] = []
        self.audit_log: List[AuditRecord] = []

    def parse_csv_content(self, content_str: str) -> Tuple[List[str], List[Dict[str, str]]]:
        """Parses CSV string, strips BOM, handles dialect and returns (headers, rows)."""
        clean_content = content_str.lstrip("\ufeff")
        f = io.StringIO(clean_content)
        # Handle delimiter detection
        sample = clean_content[:2048]
        delimiter = ","
        if sample:
            try:
                dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
                delimiter = dialect.delimiter
            except Exception:
                delimiter = ","

        reader = csv.reader(f, delimiter=delimiter)
        rows_raw = list(reader)
        if not rows_raw:
            return [], []

        raw_headers = rows_raw[0]
        # Map normalized header -> original header
        rows: List[Dict[str, str]] = []
        for row in rows_raw[1:]:
            if not row or all(not cell.strip() for cell in row):
                continue  # skip completely blank rows
            row_dict = {}
            for idx, col_name in enumerate(raw_headers):
                val = row[idx].strip() if idx < len(row) else ""
                row_dict[normalize_header(col_name)] = val
                row_dict[col_name] = val
            rows.append(row_dict)

        return raw_headers, rows

    def parse_b2b(
        self,
        rows: List[Dict[str, str]],
        source_file: str = "b2b,sez,de.csv",
        seller_gstin: str = ""
    ) -> List[NormalizedB2BInvoice]:
        """Parses B2B invoices and line items."""
        invoices_map: Dict[str, NormalizedB2BInvoice] = {}

        for idx, row in enumerate(rows, start=2):
            ctin = (
                row.get("gstin/uin of recipient")
                or row.get("gstin")
                or row.get("recipient gstin", "")
            ).strip().upper()
            receiver_name = (row.get("receiver name") or row.get("party name", "")).strip()
            inum = (
                row.get("invoice number")
                or row.get("invoice no")
                or row.get("inum", "")
            ).strip()
            idt_raw = row.get("invoice date") or row.get("date", "")
            idt = parse_date_to_ddmmyyyy(idt_raw)
            val = parse_decimal_safe(row.get("invoice value") or row.get("total value") or row.get("val", 0))
            pos_raw = row.get("place of supply") or row.get("pos", "")
            pos = extract_state_code(pos_raw)
            rchrg = (row.get("reverse charge") or row.get("rchrg", "N")).strip().upper()
            if rchrg not in ("Y", "N"):
                rchrg = "N"

            inv_type_raw = (row.get("invoice type") or "Regular B2B").strip()
            inv_type = InvoiceType.REGULAR
            if "deemed" in inv_type_raw.lower() or "de" in inv_type_raw.lower():
                inv_type = InvoiceType.DEEMED_EXPORT
            elif "sez" in inv_type_raw.lower():
                inv_type = InvoiceType.SEZ_WITH_PAY if "with" in inv_type_raw.lower() else InvoiceType.SEZ_WITHOUT_PAY

            eco_gstin = (row.get("e-commerce gstin") or "").strip().upper() or None
            rate = parse_decimal_safe(row.get("rate", 0))
            txval = parse_decimal_safe(row.get("taxable value") or row.get("txval", 0))
            cess = parse_decimal_safe(row.get("cess amount") or row.get("cess", 0))

            if not inum:
                self.issues.append(ValidationIssue(
                    severity=Severity.ERROR,
                    code="ERR_B2B_MISSING_INUM",
                    message="Missing Invoice Number in B2B row",
                    section="B2B",
                    source_file=source_file,
                    source_row=idx,
                    guidance="Ensure all B2B records have a valid Invoice Number."
                ))
                continue

            if not ctin:
                self.issues.append(ValidationIssue(
                    severity=Severity.ERROR,
                    code="ERR_B2B_MISSING_CTIN",
                    message=f"Missing Recipient GSTIN for invoice {inum}",
                    section="B2B",
                    source_file=source_file,
                    source_row=idx,
                    document_number=inum,
                    guidance="B2B invoices require a valid 15-character recipient GSTIN."
                ))

            # Determine taxes
            sply_type = determine_supply_type(seller_gstin, pos)
            half_rate = rate / Decimal("2.0")
            if sply_type == determine_supply_type(seller_gstin, seller_gstin[:2] if len(seller_gstin) >= 2 else "99"):
                # Intra-state
                cgst = round_cur((txval * half_rate) / Decimal("100.0"))
                sgst = round_cur((txval * half_rate) / Decimal("100.0"))
                igst = Decimal("0.00")
            else:
                igst = round_cur((txval * rate) / Decimal("100.0"))
                cgst = Decimal("0.00")
                sgst = Decimal("0.00")

            if inum not in invoices_map:
                inv = NormalizedB2BInvoice(
                    invoice_number=inum,
                    invoice_date=idt,
                    invoice_value=val,
                    recipient_gstin=ctin,
                    receiver_name=receiver_name,
                    pos=pos,
                    reverse_charge=rchrg,
                    invoice_type=inv_type,
                    ecommerce_gstin=eco_gstin,
                    source_file=source_file,
                    source_row=idx,
                )
                invoices_map[inum] = inv
            else:
                inv = invoices_map[inum]

            item_idx = len(inv.items) + 1
            item = NormalizedB2BInvoiceItem(
                item_num=item_idx,
                rate=rate,
                taxable_value=round_cur(txval),
                igst=igst,
                cgst=cgst,
                sgst=sgst,
                cess=round_cur(cess)
            )
            inv.items.append(item)

            self.audit_log.append(AuditRecord(
                source_file=source_file,
                source_row=idx,
                raw_reference=inum,
                source_type="B2B_LINE",
                seller_gstin=seller_gstin,
                classification_decision=f"B2B Line Rate {rate}%",
                status="INCLUDED",
                reason=f"Processed B2B invoice {inum} item {item_idx}",
                taxable_value=txval,
                total_tax=igst + cgst + sgst + cess,
                rate=rate,
                pos=pos,
            ))

        return list(invoices_map.values())

    def parse_b2cs(
        self,
        rows: List[Dict[str, str]],
        source_file: str = "b2cs.csv",
        seller_gstin: str = ""
    ) -> List[NormalizedB2CSummary]:
        """Parses B2CS report rows."""
        results: List[NormalizedB2CSummary] = []

        for idx, row in enumerate(rows, start=2):
            type_code = (row.get("type") or "OE").strip()
            pos_raw = row.get("place of supply") or row.get("pos", "")
            pos = extract_state_code(pos_raw)
            rate = parse_decimal_safe(row.get("rate", 0))
            txval = parse_decimal_safe(row.get("taxable value") or row.get("txval", 0))
            cess = parse_decimal_safe(row.get("cess amount") or row.get("cess", 0))
            eco_gstin = (row.get("e-commerce gstin") or "").strip().upper() or None

            if not pos:
                self.issues.append(ValidationIssue(
                    severity=Severity.ERROR,
                    code="ERR_B2CS_INVALID_POS",
                    message=f"Invalid or missing Place of Supply '{pos_raw}' in B2CS row {idx}",
                    section="B2CS",
                    source_file=source_file,
                    source_row=idx,
                    guidance="Check that the POS contains a valid GST state code or recognized state name."
                ))
                continue

            sply_type = determine_supply_type(seller_gstin, pos)
            half_rate = rate / Decimal("2.0")

            if sply_type.value == "INTRA":
                cgst = round_cur((txval * half_rate) / Decimal("100.0"))
                sgst = round_cur((txval * half_rate) / Decimal("100.0"))
                igst = Decimal("0.00")
            else:
                igst = round_cur((txval * rate) / Decimal("100.0"))
                cgst = Decimal("0.00")
                sgst = Decimal("0.00")

            rec = NormalizedB2CSummary(
                supply_type=sply_type,
                rate=rate,
                type_code=type_code,
                pos=pos,
                taxable_value=round_cur(txval),
                igst=igst,
                cgst=cgst,
                sgst=sgst,
                cess=round_cur(cess),
                ecommerce_gstin=eco_gstin,
                source_file=source_file,
                source_row=idx,
            )
            results.append(rec)

            self.audit_log.append(AuditRecord(
                source_file=source_file,
                source_row=idx,
                raw_reference=f"B2CS-{pos}-{rate}%",
                source_type="B2CS_ENTRY",
                seller_gstin=seller_gstin,
                classification_decision=f"B2CS {sply_type.value} Rate {rate}% POS {pos}",
                status="INCLUDED",
                reason="Aggregated to B2CS return table",
                taxable_value=txval,
                total_tax=igst + cgst + sgst + cess,
                rate=rate,
                pos=pos,
            ))

        return results

    def parse_cdnr(
        self,
        rows: List[Dict[str, str]],
        source_file: str = "cdnr.csv",
        seller_gstin: str = ""
    ) -> List[NormalizedCreditDebitNote]:
        """Parses CDNR (Credit/Debit Notes Registered)."""
        notes: List[NormalizedCreditDebitNote] = []

        for idx, row in enumerate(rows, start=2):
            ctin = (row.get("gstin/uin of recipient") or row.get("gstin", "")).strip().upper()
            receiver_name = (row.get("receiver name") or "").strip()
            note_num = (row.get("note number") or row.get("note no", "")).strip()
            note_dt_raw = row.get("note date") or ""
            note_dt = parse_date_to_ddmmyyyy(note_dt_raw)
            note_type = (row.get("note type") or "C").strip().upper()
            pos = extract_state_code(row.get("place of supply") or "")
            rchrg = (row.get("reverse charge") or "N").strip().upper()
            supply_type = (row.get("note supply type") or "Regular B2B").strip()
            note_val = parse_decimal_safe(row.get("note value", 0))
            rate = parse_decimal_safe(row.get("rate", 0))
            txval = parse_decimal_safe(row.get("taxable value", 0))
            cess = parse_decimal_safe(row.get("cess amount", 0))

            if not note_num:
                self.issues.append(ValidationIssue(
                    severity=Severity.ERROR,
                    code="ERR_CDNR_MISSING_NUM",
                    message="Missing Note Number in CDNR row",
                    section="CDNR",
                    source_file=source_file,
                    source_row=idx,
                    guidance="Credit/Debit notes must specify a note number."
                ))
                continue

            n = NormalizedCreditDebitNote(
                recipient_gstin=ctin,
                receiver_name=receiver_name,
                note_number=note_num,
                note_date=note_dt,
                note_type=note_type,
                pos=pos,
                reverse_charge=rchrg,
                note_supply_type=supply_type,
                note_value=round_cur(note_val),
                rate=rate,
                taxable_value=round_cur(txval),
                cess=round_cur(cess),
                source_file=source_file,
                source_row=idx,
            )
            notes.append(n)

            self.audit_log.append(AuditRecord(
                source_file=source_file,
                source_row=idx,
                raw_reference=note_num,
                source_type="CDNR",
                seller_gstin=seller_gstin,
                classification_decision=f"CDNR Type {note_type} Rate {rate}%",
                status="INCLUDED",
                reason=f"Processed note {note_num} for recipient {ctin}",
                taxable_value=txval,
                total_tax=round_cur((txval * rate) / Decimal("100.0")),
                rate=rate,
                pos=pos,
            ))

        return notes

    def parse_docs(
        self,
        rows: List[Dict[str, str]],
        source_file: str = "docs.csv"
    ) -> List[NormalizedDocIssueEntry]:
        """Parses Documents Issued register."""
        entries: List[NormalizedDocIssueEntry] = []

        for idx, row in enumerate(rows, start=2):
            nature = (row.get("nature of document") or "").strip()
            from_sr = (row.get("sr. no. from") or row.get("from", "")).strip()
            to_sr = (row.get("sr. no. to") or row.get("to", "")).strip()
            tot_num = int(parse_decimal_safe(row.get("total number", 0)))
            cancelled = int(parse_decimal_safe(row.get("cancelled", 0)))
            net_issue = tot_num - cancelled

            if not nature:
                continue

            entry = NormalizedDocIssueEntry(
                nature_of_document=nature,
                sr_no_from=from_sr,
                sr_no_to=to_sr,
                total_number=tot_num,
                cancelled=cancelled,
                net_issued=net_issue,
                source_file=source_file,
                source_row=idx,
            )
            entries.append(entry)

            self.audit_log.append(AuditRecord(
                source_file=source_file,
                source_row=idx,
                raw_reference=f"{from_sr}-{to_sr}",
                source_type="DOC_REGISTER",
                seller_gstin="",
                classification_decision=f"Doc Series {nature}",
                status="INCLUDED",
                reason=f"Total: {tot_num}, Cancelled: {cancelled}, Net: {net_issue}",
                taxable_value=Decimal("0.00"),
                total_tax=Decimal("0.00"),
                rate=Decimal("0.00"),
                pos="",
            ))

        return entries

    def parse_hsn(
        self,
        rows: List[Dict[str, str]],
        category: str = "B2C",
        source_file: str = "hsn.csv"
    ) -> List[NormalizedHSNItem]:
        """Parses HSN summary CSV."""
        items: List[NormalizedHSNItem] = []

        for idx, row in enumerate(rows, start=2):
            hsn = (row.get("hsn") or "").strip()
            desc = (row.get("description") or "").strip()
            uqc = (row.get("uqc") or "PCS").strip().upper()
            qty = parse_decimal_safe(row.get("total quantity") or row.get("quantity", 0))
            tot_val = parse_decimal_safe(row.get("total value", 0))
            txval = parse_decimal_safe(row.get("taxable value", 0))
            iamt = parse_decimal_safe(row.get("integrated tax amount") or row.get("iamt", 0))
            camt = parse_decimal_safe(row.get("central tax amount") or row.get("camt", 0))
            samt = parse_decimal_safe(row.get("state/ut tax amount") or row.get("samt", 0))
            csamt = parse_decimal_safe(row.get("cess amount") or row.get("cess", 0))
            rate = parse_decimal_safe(row.get("rate", 0))

            if not hsn:
                self.issues.append(ValidationIssue(
                    severity=Severity.ERROR,
                    code="ERR_HSN_MISSING",
                    message=f"Missing HSN code in row {idx}",
                    section=f"HSN_{category}",
                    source_file=source_file,
                    source_row=idx,
                    guidance="Provide valid 4, 6, or 8 digit HSN/SAC code."
                ))
                continue

            item = NormalizedHSNItem(
                hsn_sac=hsn,
                description=desc,
                uqc=uqc,
                quantity=round_cur(qty),
                total_value=round_cur(tot_val),
                taxable_value=round_cur(txval),
                rate=rate,
                igst=round_cur(iamt),
                cgst=round_cur(camt),
                sgst=round_cur(samt),
                cess=round_cur(csamt),
                category=category,
                source_file=source_file,
                source_row=idx,
            )
            items.append(item)

            self.audit_log.append(AuditRecord(
                source_file=source_file,
                source_row=idx,
                raw_reference=f"HSN-{hsn}-{uqc}",
                source_type=f"HSN_{category}",
                seller_gstin="",
                classification_decision=f"HSN {hsn} Qty {qty} {uqc} Rate {rate}%",
                status="INCLUDED",
                reason=f"Categorized into HSN {category} summary",
                taxable_value=txval,
                total_tax=iamt + camt + samt + csamt,
                rate=rate,
                pos="",
            ))

        return items

    def parse_eco(
        self,
        rows: List[Dict[str, str]],
        source_file: str = "supplies_through_eco.csv"
    ) -> List[NormalizedEcoSupply]:
        """Parses Supplies through E-commerce operator."""
        ecos: List[NormalizedEcoSupply] = []

        for idx, row in enumerate(rows, start=2):
            etin = (
                row.get("gstin of e-commerce operator")
                or row.get("etin")
                or row.get("operator gstin", "")
            ).strip().upper()
            eco_name = (row.get("e-commerce operator name") or row.get("operator name", "")).strip()
            txval = parse_decimal_safe(row.get("taxable value", 0))
            iamt = parse_decimal_safe(row.get("integrated tax") or row.get("iamt", 0))
            camt = parse_decimal_safe(row.get("central tax") or row.get("camt", 0))
            samt = parse_decimal_safe(row.get("state/ut tax") or row.get("samt", 0))
            csamt = parse_decimal_safe(row.get("cess amount") or row.get("cess", 0))

            if not etin:
                self.issues.append(ValidationIssue(
                    severity=Severity.ERROR,
                    code="ERR_ECO_MISSING_ETIN",
                    message=f"Missing E-commerce operator GSTIN in row {idx}",
                    section="ECO",
                    source_file=source_file,
                    source_row=idx,
                    guidance="ECO supply records must contain the GSTIN/ETIN of the platform."
                ))
                continue

            eco = NormalizedEcoSupply(
                eco_gstin=etin,
                eco_name=eco_name,
                taxable_value=round_cur(txval),
                igst=round_cur(iamt),
                cgst=round_cur(camt),
                sgst=round_cur(samt),
                cess=round_cur(csamt),
                source_file=source_file,
                source_row=idx,
            )
            ecos.append(eco)

            self.audit_log.append(AuditRecord(
                source_file=source_file,
                source_row=idx,
                raw_reference=etin,
                source_type="SUPECO",
                seller_gstin="",
                classification_decision=f"E-Commerce Supply {etin}",
                status="INCLUDED",
                reason=f"Supply through operator: {eco_name}",
                taxable_value=txval,
                total_tax=iamt + camt + samt + csamt,
                rate=Decimal("0.00"),
                pos="",
            ))

        return ecos
