"""
Tax calculation and place of supply logic for GSTR-1.
"""

from decimal import Decimal, ROUND_HALF_UP
import re
from typing import Tuple, Any
from engine.constants import STATE_CODE_MAP, STATE_NAME_TO_CODE, VALID_GST_RATES
from engine.models import SupplyType


def round_cur(val: Decimal) -> Decimal:
    """Round to 2 decimal places using standard ROUND_HALF_UP."""
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def extract_state_code(pos_raw: str) -> str:
    """
    Extracts a valid 2-digit GST state code from raw POS string.
    Examples:
      '37-ANDHRA PRADESH' -> '37'
      '36-TELANGANA' -> '36'
      '07' -> '07'
      'DELHI' -> '07'
    """
    if not pos_raw:
        return ""
    pos_str = str(pos_raw).strip()
    
    # Check leading two digits
    match = re.match(r"^(\d{2})", pos_str)
    if match:
        code = match.group(1)
        if code in STATE_CODE_MAP:
            return code
            
    # Try exact match or name cleanup
    clean_name = pos_str.upper()
    # Strip any numeric prefixes if present
    clean_name = re.sub(r"^\d+\s*[-_]?\s*", "", clean_name).strip()
    
    if clean_name in STATE_NAME_TO_CODE:
        return STATE_NAME_TO_CODE[clean_name]
        
    for name, code in STATE_NAME_TO_CODE.items():
        if name in clean_name or clean_name in name:
            return code
            
    # If it's a 1 or 2 digit number
    if pos_str.isdigit():
        code = pos_str.zfill(2)
        if code in STATE_CODE_MAP:
            return code

    return ""


def determine_supply_type(seller_gstin: str, pos_code: str) -> SupplyType:
    """
    Determines whether a transaction is INTRA or INTER state.
    Seller state code is derived from the first 2 characters of the seller's GSTIN.
    """
    if not seller_gstin or len(seller_gstin) < 2:
        return SupplyType.INTER
    seller_state = seller_gstin[:2]
    return SupplyType.INTRA if seller_state == pos_code else SupplyType.INTER


def calculate_taxes(
    taxable_value: Decimal,
    rate: Decimal,
    supply_type: SupplyType,
    existing_igst: Decimal = Decimal("0.00"),
    existing_cgst: Decimal = Decimal("0.00"),
    existing_sgst: Decimal = Decimal("0.00"),
    existing_cess: Decimal = Decimal("0.00")
) -> Tuple[Decimal, Decimal, Decimal, Decimal]:
    """
    Computes (igst, cgst, sgst, cess).
    If existing taxes are non-zero, uses them after rounding validation.
    Otherwise calculates using rate and supply_type.
    """
    cess = round_cur(existing_cess)

    # If existing values are provided and non-zero, preserve them
    if (existing_igst != Decimal("0.00") or existing_cgst != Decimal("0.00") or existing_sgst != Decimal("0.00")):
        return round_cur(existing_igst), round_cur(existing_cgst), round_cur(existing_sgst), cess

    if supply_type == SupplyType.INTRA:
        half_rate = rate / Decimal("2.0")
        cgst = round_cur((taxable_value * half_rate) / Decimal("100.0"))
        sgst = round_cur((taxable_value * half_rate) / Decimal("100.0"))
        igst = Decimal("0.00")
    else:
        igst = round_cur((taxable_value * rate) / Decimal("100.0"))
        cgst = Decimal("0.00")
        sgst = Decimal("0.00")

    return igst, cgst, sgst, cess


def parse_decimal_safe(val: Any) -> Decimal:
    """Safe decimal parsing handling empty strings, commas, and scientific notation."""
    if val is None:
        return Decimal("0.00")
    s = str(val).strip().replace(",", "")
    if not s or s == "-":
        return Decimal("0.00")
    try:
        return Decimal(s)
    except Exception:
        return Decimal("0.00")
