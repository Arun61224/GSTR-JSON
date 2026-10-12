"""
Normalized data models for Amazon GST reports and GSTR-1 output.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum
from typing import List, Optional, Dict, Any


class Severity(str, Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


class SupplyType(str, Enum):
    INTRA = "INTRA"
    INTER = "INTER"


class InvoiceType(str, Enum):
    REGULAR = "R"
    DEEMED_EXPORT = "DE"
    SEZ_WITH_PAY = "SEWP"
    SEZ_WITHOUT_PAY = "SEWOP"


@dataclass
class ValidationIssue:
    severity: Severity
    code: str
    message: str
    section: str
    source_file: Optional[str] = None
    source_row: Optional[int] = None
    gstin: Optional[str] = None
    document_number: Optional[str] = None
    guidance: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "severity": self.severity.value,
            "code": self.code,
            "message": self.message,
            "section": self.section,
            "source_file": self.source_file or "",
            "source_row": self.source_row or 0,
            "gstin": self.gstin or "",
            "document_number": self.document_number or "",
            "guidance": self.guidance or "",
        }


@dataclass
class AuditRecord:
    source_file: str
    source_row: int
    raw_reference: str
    source_type: str
    seller_gstin: str
    classification_decision: str
    status: str  # INCLUDED, EXCLUDED, FLAGGED
    reason: str
    taxable_value: Decimal = Decimal("0.00")
    total_tax: Decimal = Decimal("0.00")
    rate: Decimal = Decimal("0.00")
    pos: str = ""
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_file": self.source_file,
            "source_row": self.source_row,
            "raw_reference": self.raw_reference,
            "source_type": self.source_type,
            "seller_gstin": self.seller_gstin,
            "classification_decision": self.classification_decision,
            "status": self.status,
            "reason": self.reason,
            "taxable_value": float(self.taxable_value),
            "total_tax": float(self.total_tax),
            "rate": float(self.rate),
            "pos": self.pos,
            "notes": self.notes,
        }


@dataclass
class NormalizedB2BInvoiceItem:
    item_num: int
    rate: Decimal
    taxable_value: Decimal
    igst: Decimal = Decimal("0.00")
    cgst: Decimal = Decimal("0.00")
    sgst: Decimal = Decimal("0.00")
    cess: Decimal = Decimal("0.00")


@dataclass
class NormalizedB2BInvoice:
    invoice_number: str
    invoice_date: str  # DD-MM-YYYY
    invoice_value: Decimal
    recipient_gstin: str
    receiver_name: str
    pos: str  # 2-digit state code
    reverse_charge: str  # "Y" or "N"
    invoice_type: InvoiceType
    ecommerce_gstin: Optional[str]
    items: List[NormalizedB2BInvoiceItem] = field(default_factory=list)
    source_file: str = ""
    source_row: int = 0


@dataclass
class NormalizedB2CSummary:
    supply_type: SupplyType  # "INTRA" or "INTER"
    rate: Decimal
    type_code: str  # "OE"
    pos: str  # 2-digit code
    taxable_value: Decimal
    igst: Decimal = Decimal("0.00")
    cgst: Decimal = Decimal("0.00")
    sgst: Decimal = Decimal("0.00")
    cess: Decimal = Decimal("0.00")
    ecommerce_gstin: Optional[str] = None
    source_file: str = ""
    source_row: int = 0


@dataclass
class NormalizedCreditDebitNote:
    recipient_gstin: str
    receiver_name: str
    note_number: str
    note_date: str
    note_type: str  # "C" or "D"
    pos: str
    reverse_charge: str
    note_supply_type: str
    note_value: Decimal
    rate: Decimal
    taxable_value: Decimal
    cess: Decimal = Decimal("0.00")
    source_file: str = ""
    source_row: int = 0


@dataclass
class NormalizedDocIssueEntry:
    nature_of_document: str
    sr_no_from: str
    sr_no_to: str
    total_number: int
    cancelled: int
    net_issued: int
    source_file: str = ""
    source_row: int = 0


@dataclass
class NormalizedHSNItem:
    hsn_sac: str
    description: str
    uqc: str
    quantity: Decimal
    total_value: Decimal
    taxable_value: Decimal
    rate: Decimal
    igst: Decimal = Decimal("0.00")
    cgst: Decimal = Decimal("0.00")
    sgst: Decimal = Decimal("0.00")
    cess: Decimal = Decimal("0.00")
    category: str = "B2C"  # "B2B" or "B2C"
    source_file: str = ""
    source_row: int = 0


@dataclass
class NormalizedEcoSupply:
    eco_gstin: str
    eco_name: str
    taxable_value: Decimal
    igst: Decimal = Decimal("0.00")
    cgst: Decimal = Decimal("0.00")
    sgst: Decimal = Decimal("0.00")
    cess: Decimal = Decimal("0.00")
    source_file: str = ""
    source_row: int = 0
