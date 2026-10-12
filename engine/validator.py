"""
Comprehensive GST validation engine for GSTR-1 preparation.
Enforces 3 severity tiers: ERROR, WARNING, and INFO.
"""

from decimal import Decimal
import re
from typing import Dict, List, Set, Any

from engine.constants import STATE_CODE_MAP, VALID_GST_RATES, VALID_UQCS
from engine.models import (
    NormalizedB2BInvoice,
    NormalizedB2CSummary,
    NormalizedCreditDebitNote,
    NormalizedDocIssueEntry,
    NormalizedHSNItem,
    NormalizedEcoSupply,
    Severity,
    ValidationIssue,
)


GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
RETURN_PERIOD_REGEX = re.compile(r"^(0[1-9]|1[0-2])20[2-9][0-9]$")


class GSTR1Validator:
    """Validates inputs, calculations, and consistency across GSTR-1 sections."""

    def __init__(self):
        self.issues: List[ValidationIssue] = []

    def validate_seller_gstin(self, gstin: str) -> bool:
        """Validates seller GSTIN format and state code."""
        if not gstin:
            self.issues.append(ValidationIssue(
                severity=Severity.ERROR,
                code="ERR_SELLER_GSTIN_EMPTY",
                message="Seller GSTIN cannot be blank.",
                section="HEADER",
                guidance="Provide the registered 15-character GSTIN of the seller."
            ))
            return False

        clean_gstin = gstin.strip().upper()
        if not GSTIN_REGEX.match(clean_gstin):
            self.issues.append(ValidationIssue(
                severity=Severity.ERROR,
                code="ERR_SELLER_GSTIN_INVALID",
                message=f"Seller GSTIN '{clean_gstin}' is not a valid 15-digit GSTIN pattern.",
                section="HEADER",
                gstin=clean_gstin,
                guidance="Ensure 2 digits state code + 10 char PAN + 1 entity number + 'Z' + 1 check character."
            ))
            return False

        state_code = clean_gstin[:2]
        if state_code not in STATE_CODE_MAP:
            self.issues.append(ValidationIssue(
                severity=Severity.ERROR,
                code="ERR_SELLER_STATE_UNKNOWN",
                message=f"Seller GSTIN starts with unassigned state code '{state_code}'.",
                section="HEADER",
                gstin=clean_gstin,
                guidance="Verify the state code against official GST directory."
            ))
            return False

        self.issues.append(ValidationIssue(
            severity=Severity.INFO,
            code="INF_SELLER_GSTIN_VALID",
            message=f"Seller GSTIN verified: {clean_gstin} ({STATE_CODE_MAP[state_code]}).",
            section="HEADER",
            gstin=clean_gstin,
        ))
        return True

    def validate_filing_period(self, fp: str) -> bool:
        """Validates MMYYYY return filing period."""
        if not fp or not RETURN_PERIOD_REGEX.match(fp.strip()):
            self.issues.append(ValidationIssue(
                severity=Severity.ERROR,
                code="ERR_FILING_PERIOD_INVALID",
                message=f"Filing period '{fp}' must be in MMYYYY format (e.g. 092026).",
                section="HEADER",
                guidance="Enter a 6-digit month and year, e.g. '092026' for September 2026."
            ))
            return False
        return True

    def validate_b2b(self, invoices: List[NormalizedB2BInvoice], seller_gstin: str) -> None:
        """Validates B2B invoices and line items."""
        seller_state = seller_gstin[:2] if len(seller_gstin) >= 2 else ""
        seen_invoices: Dict[str, Set[Decimal]] = {}

        for inv in invoices:
            # Check buyer GSTIN
            if not GSTIN_REGEX.match(inv.recipient_gstin):
                self.issues.append(ValidationIssue(
                    severity=Severity.WARNING,
                    code="WRN_BUYER_GSTIN_PATTERN",
                    message=f"Buyer GSTIN '{inv.recipient_gstin}' on invoice {inv.invoice_number} might be non-standard.",
                    section="B2B",
                    document_number=inv.invoice_number,
                    source_file=inv.source_file,
                    source_row=inv.source_row,
                    guidance="Verify if recipient holds a special UIN or provisional registration."
                ))

            # POS validation
            if inv.pos not in STATE_CODE_MAP:
                self.issues.append(ValidationIssue(
                    severity=Severity.ERROR,
                    code="ERR_B2B_INVALID_POS",
                    message=f"Invoice {inv.invoice_number} has unknown POS '{inv.pos}'.",
                    section="B2B",
                    document_number=inv.invoice_number,
                    source_file=inv.source_file,
                    source_row=inv.source_row,
                    guidance="POS must match a valid GST state code."
                ))

            # Check duplicate invoice / duplicate rate line items
            if inv.invoice_number in seen_invoices:
                rates_set = seen_invoices[inv.invoice_number]
                for itm in inv.items:
                    if itm.rate in rates_set:
                        self.issues.append(ValidationIssue(
                            severity=Severity.WARNING,
                            code="WRN_B2B_DUPLICATE_RATE_LINE",
                            message=f"Invoice {inv.invoice_number} has duplicate line for tax rate {itm.rate}%.",
                            section="B2B",
                            document_number=inv.invoice_number,
                            source_file=inv.source_file,
                            guidance="Multiple line items at the exact same tax rate should usually be merged into one itm_det."
                        ))
                    rates_set.add(itm.rate)
            else:
                seen_invoices[inv.invoice_number] = {itm.rate for itm in inv.items}

            # Inter vs Intra tax routing check
            is_intra = (inv.pos == seller_state)
            for itm in inv.items:
                if is_intra and itm.igst > 0:
                    self.issues.append(ValidationIssue(
                        severity=Severity.WARNING,
                        code="WRN_B2B_TAX_MISMATCH_INTRA",
                        message=f"Invoice {inv.invoice_number} is INTRA-state (POS {inv.pos} == Seller {seller_state}) but has IGST {itm.igst}.",
                        section="B2B",
                        document_number=inv.invoice_number,
                        guidance="Intra-state transactions must report CGST + SGST instead of IGST."
                    ))
                elif not is_intra and (itm.cgst > 0 or itm.sgst > 0):
                    self.issues.append(ValidationIssue(
                        severity=Severity.WARNING,
                        code="WRN_B2B_TAX_MISMATCH_INTER",
                        message=f"Invoice {inv.invoice_number} is INTER-state (POS {inv.pos} != Seller {seller_state}) but has CGST/SGST.",
                        section="B2B",
                        document_number=inv.invoice_number,
                        guidance="Inter-state supplies must report IGST instead of CGST/SGST."
                    ))

    def validate_b2cs(self, summaries: List[NormalizedB2CSummary], seller_gstin: str) -> None:
        """Validates B2CS rows."""
        seller_state = seller_gstin[:2] if len(seller_gstin) >= 2 else ""

        for s in summaries:
            if s.pos not in STATE_CODE_MAP:
                self.issues.append(ValidationIssue(
                    severity=Severity.ERROR,
                    code="ERR_B2CS_POS_INVALID",
                    message=f"Invalid POS '{s.pos}' in B2CS.",
                    section="B2CS",
                    source_file=s.source_file,
                    source_row=s.source_row,
                ))

            if float(s.rate) not in VALID_GST_RATES:
                self.issues.append(ValidationIssue(
                    severity=Severity.WARNING,
                    code="WRN_B2CS_NONSTANDARD_RATE",
                    message=f"B2CS rate {s.rate}% is not among standard GST rates.",
                    section="B2CS",
                    source_file=s.source_file,
                    source_row=s.source_row,
                ))

            if s.taxable_value < 0:
                self.issues.append(ValidationIssue(
                    severity=Severity.INFO,
                    code="INF_B2CS_NEGATIVE_ADJUSTMENT",
                    message=f"B2CS row for POS {s.pos} at rate {s.rate}% has negative taxable value {s.taxable_value} (e-commerce return/refund adjustment).",
                    section="B2CS",
                    source_file=s.source_file,
                    source_row=s.source_row,
                    guidance="Negative values are permitted in GSTR-1 B2CS for net sales returns in the tax period."
                ))

    def validate_docs(self, entries: List[NormalizedDocIssueEntry]) -> None:
        """Validates Documents Issued register."""
        for e in entries:
            if e.cancelled > e.total_number:
                self.issues.append(ValidationIssue(
                    severity=Severity.ERROR,
                    code="ERR_DOCS_CANCELLED_EXCEEDS_TOTAL",
                    message=f"Cancelled documents ({e.cancelled}) exceed total documents ({e.total_number}) for series {e.sr_no_from} to {e.sr_no_to}.",
                    section="DOCS",
                    source_file=e.source_file,
                    source_row=e.source_row,
                ))
            if e.net_issued < 0:
                self.issues.append(ValidationIssue(
                    severity=Severity.ERROR,
                    code="ERR_DOCS_NET_NEGATIVE",
                    message=f"Net documents issued is negative ({e.net_issued}) for {e.nature_of_document}.",
                    section="DOCS",
                    source_file=e.source_file,
                    source_row=e.source_row,
                ))

    def validate_hsn(self, items: List[NormalizedHSNItem]) -> None:
        """Validates HSN records."""
        for item in items:
            # UQC validation
            if item.uqc not in VALID_UQCS:
                self.issues.append(ValidationIssue(
                    severity=Severity.WARNING,
                    code="WRN_HSN_UNKNOWN_UQC",
                    message=f"HSN {item.hsn_sac} has non-standard UQC '{item.uqc}'.",
                    section=f"HSN_{item.category}",
                    source_file=item.source_file,
                    source_row=item.source_row,
                    guidance="Standard UQCs include PCS, NOS, KGS, SET, PAC, etc."
                ))

            if len(item.hsn_sac) < 4:
                self.issues.append(ValidationIssue(
                    severity=Severity.WARNING,
                    code="WRN_HSN_DIGITS_SHORT",
                    message=f"HSN code '{item.hsn_sac}' has fewer than 4 digits.",
                    section=f"HSN_{item.category}",
                    source_file=item.source_file,
                    source_row=item.source_row,
                    guidance="Mandatory HSN requirement is at least 4 digits (up to 8 digits)."
                ))

    def validate_reconciliation(
        self,
        b2cs_txval: Decimal,
        hsn_b2c_txval: Decimal,
        b2b_txval: Decimal,
        hsn_b2b_txval: Decimal,
        eco_txval: Decimal
    ) -> None:
        """Cross-checks taxable values between sections."""
        # Reconcile B2C: B2CS vs HSN B2C
        if hsn_b2c_txval > Decimal("0.00") and b2cs_txval > Decimal("0.00"):
            diff_b2c = abs(b2cs_txval - hsn_b2c_txval)
            if diff_b2c > Decimal("1.00"):
                self.issues.append(ValidationIssue(
                    severity=Severity.WARNING,
                    code="WRN_RECON_B2C_HSN_DIFF",
                    message=f"B2CS total taxable value ({b2cs_txval}) differs from HSN B2C total ({hsn_b2c_txval}) by {diff_b2c}.",
                    section="RECONCILIATION",
                    guidance="Check if any B2C invoices or credit notes were omitted or categorized differently."
                ))
            else:
                self.issues.append(ValidationIssue(
                    severity=Severity.INFO,
                    code="INF_RECON_B2C_MATCH",
                    message=f"B2CS taxable total ({b2cs_txval}) reconciles with HSN B2C total ({hsn_b2c_txval}).",
                    section="RECONCILIATION"
                ))

        # Reconcile B2B: B2B Invoices vs HSN B2B
        if hsn_b2b_txval > Decimal("0.00") and b2b_txval > Decimal("0.00"):
            diff_b2b = abs(b2b_txval - hsn_b2b_txval)
            if diff_b2b > Decimal("1.00"):
                self.issues.append(ValidationIssue(
                    severity=Severity.WARNING,
                    code="WRN_RECON_B2B_HSN_DIFF",
                    message=f"B2B total taxable value ({b2b_txval}) differs from HSN B2B total ({hsn_b2b_txval}) by {diff_b2b}.",
                    section="RECONCILIATION",
                    guidance="Inspect B2B invoice line items against HSN summary."
                ))
            else:
                self.issues.append(ValidationIssue(
                    severity=Severity.INFO,
                    code="INF_RECON_B2B_MATCH",
                    message=f"B2B taxable total ({b2b_txval}) reconciles with HSN B2B total ({hsn_b2b_txval}).",
                    section="RECONCILIATION"
                ))

        # E-commerce check
        if eco_txval > Decimal("0.00"):
            total_supplies = b2cs_txval + b2b_txval
            diff_eco = abs(total_supplies - eco_txval)
            if diff_eco <= Decimal("1.00"):
                self.issues.append(ValidationIssue(
                    severity=Severity.INFO,
                    code="INF_RECON_ECO_MATCH",
                    message=f"E-commerce operator supply ({eco_txval}) matches B2CS + B2B total ({total_supplies}).",
                    section="RECONCILIATION"
                ))
            else:
                self.issues.append(ValidationIssue(
                    severity=Severity.INFO,
                    code="INF_RECON_ECO_INFO",
                    message=f"E-commerce reported taxable supply: {eco_txval}. Total recorded supplies: {total_supplies}.",
                    section="RECONCILIATION"
                ))
