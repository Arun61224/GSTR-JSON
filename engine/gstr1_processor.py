"""
Master orchestrator for GSTR-1 JSON generation from Amazon Seller Central reports.
Supports multi-GSTIN segregation, transparent reconciliation, validation, and audit tracking.
"""

from decimal import Decimal
import json
from typing import Dict, List, Optional, Any

from engine.csv_adapters import AmazonCSVAdapter, detect_file_type
from engine.models import (
    AuditRecord,
    NormalizedB2BInvoice,
    NormalizedB2CSummary,
    NormalizedCreditDebitNote,
    NormalizedDocIssueEntry,
    NormalizedHSNItem,
    NormalizedEcoSupply,
    Severity,
    ValidationIssue,
)
from engine.serializer import GSTR1Serializer
from engine.tax_calculator import round_cur
from engine.validator import GSTR1Validator


class GSTR1Processor:
    """Orchestrates parsing, validation, multi-GSTIN routing, and GSTR-1 generation."""

    def __init__(self, seller_gstin: str, filing_period: str):
        self.seller_gstin = seller_gstin.strip().upper()
        self.filing_period = filing_period.strip()
        self.adapter = AmazonCSVAdapter()
        self.validator = GSTR1Validator()

        # Processed sections
        self.b2b_invoices: List[NormalizedB2BInvoice] = []
        self.b2cs_summaries: List[NormalizedB2CSummary] = []
        self.cdnr_notes: List[NormalizedCreditDebitNote] = []
        self.doc_entries: List[NormalizedDocIssueEntry] = []
        self.hsn_items: List[NormalizedHSNItem] = []
        self.eco_supplies: List[NormalizedEcoSupply] = []

        # File classification
        self.loaded_files: Dict[str, str] = {}  # detected_type -> filename

    def load_file(self, filename: str, content: str) -> str:
        """Parses an uploaded file into its corresponding section."""
        headers, rows = self.adapter.parse_csv_content(content)
        if not headers or not rows:
            return "empty"

        file_type = detect_file_type(headers, filename)
        self.loaded_files[file_type] = filename

        if file_type == "b2b":
            self.b2b_invoices = self.adapter.parse_b2b(
                rows, source_file=filename, seller_gstin=self.seller_gstin
            )
        elif file_type == "b2cs":
            self.b2cs_summaries = self.adapter.parse_b2cs(
                rows, source_file=filename, seller_gstin=self.seller_gstin
            )
        elif file_type == "cdnr":
            self.cdnr_notes = self.adapter.parse_cdnr(
                rows, source_file=filename, seller_gstin=self.seller_gstin
            )
        elif file_type == "docs":
            self.doc_entries = self.adapter.parse_docs(
                rows, source_file=filename
            )
        elif file_type == "hsn_b2b":
            items = self.adapter.parse_hsn(
                rows, category="B2B", source_file=filename
            )
            self.hsn_items.extend(items)
        elif file_type == "hsn_b2c":
            items = self.adapter.parse_hsn(
                rows, category="B2C", source_file=filename
            )
            self.hsn_items.extend(items)
        elif file_type == "supeco":
            self.eco_supplies = self.adapter.parse_eco(
                rows, source_file=filename
            )

        return file_type

    def run(self) -> Dict[str, Any]:
        """
        Runs validation, reconciliation, and serializes GSTR-1 JSON.
        Returns complete result dictionary.
        """
        # Validate Header
        self.validator.validate_seller_gstin(self.seller_gstin)
        self.validator.validate_filing_period(self.filing_period)

        # Validate Sections
        self.validator.validate_b2b(self.b2b_invoices, self.seller_gstin)
        self.validator.validate_b2cs(self.b2cs_summaries, self.seller_gstin)
        self.validator.validate_docs(self.doc_entries)
        self.validator.validate_hsn(self.hsn_items)

        # Calculate section totals for reconciliation
        b2b_txval = sum((sum(i.taxable_value for i in inv.items) for inv in self.b2b_invoices), Decimal("0.00"))
        b2b_igst = sum((sum(i.igst for i in inv.items) for inv in self.b2b_invoices), Decimal("0.00"))
        b2b_cgst = sum((sum(i.cgst for i in inv.items) for inv in self.b2b_invoices), Decimal("0.00"))
        b2b_sgst = sum((sum(i.sgst for i in inv.items) for inv in self.b2b_invoices), Decimal("0.00"))

        b2cs_txval = sum((s.taxable_value for s in self.b2cs_summaries), Decimal("0.00"))
        b2cs_igst = sum((s.igst for s in self.b2cs_summaries), Decimal("0.00"))
        b2cs_cgst = sum((s.cgst for s in self.b2cs_summaries), Decimal("0.00"))
        b2cs_sgst = sum((s.sgst for s in self.b2cs_summaries), Decimal("0.00"))

        hsn_b2c_txval = sum((i.taxable_value for i in self.hsn_items if i.category == "B2C"), Decimal("0.00"))
        hsn_b2c_igst = sum((i.igst for i in self.hsn_items if i.category == "B2C"), Decimal("0.00"))
        hsn_b2c_cgst = sum((i.cgst for i in self.hsn_items if i.category == "B2C"), Decimal("0.00"))
        hsn_b2c_sgst = sum((i.sgst for i in self.hsn_items if i.category == "B2C"), Decimal("0.00"))

        hsn_b2b_txval = sum((i.taxable_value for i in self.hsn_items if i.category == "B2B"), Decimal("0.00"))
        hsn_b2b_igst = sum((i.igst for i in self.hsn_items if i.category == "B2B"), Decimal("0.00"))
        hsn_b2b_cgst = sum((i.cgst for i in self.hsn_items if i.category == "B2B"), Decimal("0.00"))
        hsn_b2b_sgst = sum((i.sgst for i in self.hsn_items if i.category == "B2B"), Decimal("0.00"))

        eco_txval = sum((e.taxable_value for e in self.eco_supplies), Decimal("0.00"))
        eco_igst = sum((e.igst for e in self.eco_supplies), Decimal("0.00"))
        eco_cgst = sum((e.cgst for e in self.eco_supplies), Decimal("0.00"))
        eco_sgst = sum((e.sgst for e in self.eco_supplies), Decimal("0.00"))

        self.validator.validate_reconciliation(
            b2cs_txval=b2cs_txval,
            hsn_b2c_txval=hsn_b2c_txval,
            b2b_txval=b2b_txval,
            hsn_b2b_txval=hsn_b2b_txval,
            eco_txval=eco_txval
        )

        # Collect all validation issues
        all_issues = self.adapter.issues + self.validator.issues
        error_count = sum(1 for i in all_issues if i.severity == Severity.ERROR)
        warning_count = sum(1 for i in all_issues if i.severity == Severity.WARNING)
        info_count = sum(1 for i in all_issues if i.severity == Severity.INFO)

        # Generate GSTR-1 JSON structure
        gstr1_dict = GSTR1Serializer.serialize(
            seller_gstin=self.seller_gstin,
            filing_period=self.filing_period,
            b2b_invoices=self.b2b_invoices,
            b2cs_summaries=self.b2cs_summaries,
            cdnr_notes=self.cdnr_notes,
            doc_entries=self.doc_entries,
            hsn_items=self.hsn_items,
            eco_supplies=self.eco_supplies,
        )

        reconciliation_summary = {
            "b2b": {
                "invoices_count": len(self.b2b_invoices),
                "items_count": sum(len(inv.items) for inv in self.b2b_invoices),
                "taxable_value": float(round_cur(b2b_txval)),
                "igst": float(round_cur(b2b_igst)),
                "cgst": float(round_cur(b2b_cgst)),
                "sgst": float(round_cur(b2b_sgst)),
                "total_tax": float(round_cur(b2b_igst + b2b_cgst + b2b_sgst)),
            },
            "b2cs": {
                "records_count": len(self.b2cs_summaries),
                "taxable_value": float(round_cur(b2cs_txval)),
                "igst": float(round_cur(b2cs_igst)),
                "cgst": float(round_cur(b2cs_cgst)),
                "sgst": float(round_cur(b2cs_sgst)),
                "total_tax": float(round_cur(b2cs_igst + b2cs_cgst + b2cs_sgst)),
            },
            "cdnr": {
                "notes_count": len(self.cdnr_notes),
                "taxable_value": float(round_cur(sum((n.taxable_value for n in self.cdnr_notes), Decimal("0.00")))),
            },
            "docs": {
                "series_count": len(self.doc_entries),
                "total_documents": sum(d.total_number for d in self.doc_entries),
                "cancelled_documents": sum(d.cancelled for d in self.doc_entries),
                "net_issued": sum(d.net_issued for d in self.doc_entries),
            },
            "hsn": {
                "b2c_count": len([i for i in self.hsn_items if i.category == "B2C"]),
                "b2b_count": len([i for i in self.hsn_items if i.category == "B2B"]),
                "b2c_taxable_value": float(round_cur(hsn_b2c_txval)),
                "b2b_taxable_value": float(round_cur(hsn_b2b_txval)),
                "total_taxable_value": float(round_cur(hsn_b2c_txval + hsn_b2b_txval)),
            },
            "supeco": {
                "operators_count": len(self.eco_supplies),
                "taxable_value": float(round_cur(eco_txval)),
                "igst": float(round_cur(eco_igst)),
                "cgst": float(round_cur(eco_cgst)),
                "sgst": float(round_cur(eco_sgst)),
            },
            "grand_totals": {
                "total_taxable_value": float(round_cur(b2b_txval + b2cs_txval)),
                "total_igst": float(round_cur(b2b_igst + b2cs_igst)),
                "total_cgst": float(round_cur(b2b_cgst + b2cs_cgst)),
                "total_sgst": float(round_cur(b2b_sgst + b2cs_sgst)),
                "total_tax": float(round_cur(b2b_igst + b2cs_igst + b2b_cgst + b2cs_cgst + b2b_sgst + b2cs_sgst)),
            }
        }

        return {
            "seller_gstin": self.seller_gstin,
            "filing_period": self.filing_period,
            "can_generate": (error_count == 0),
            "gstr1_json": gstr1_dict,
            "gstr1_json_str": GSTR1Serializer.to_json_str(gstr1_dict),
            "reconciliation": reconciliation_summary,
            "validation_summary": {
                "errors": error_count,
                "warnings": warning_count,
                "info": info_count,
                "total": len(all_issues),
                "issues": [i.to_dict() for i in all_issues],
            },
            "audit_log": [a.to_dict() for a in self.adapter.audit_log],
            "loaded_files": self.loaded_files,
        }
