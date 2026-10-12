"""
GSTN Official GSTR-1 Offline Utility JSON Serializer.
Converts normalized models into strict GST portal compliant offline JSON structure.
"""

from decimal import Decimal
import json
from typing import Dict, List, Any

from engine.constants import DOCUMENT_NATURE_MAP
from engine.models import (
    NormalizedB2BInvoice,
    NormalizedB2CSummary,
    NormalizedCreditDebitNote,
    NormalizedDocIssueEntry,
    NormalizedHSNItem,
    NormalizedEcoSupply,
)
from engine.tax_calculator import round_cur


def to_float(d: Decimal) -> float:
    """Converts Decimal to standard JSON float, cleanly rounding to 2 decimals."""
    rounded = round_cur(d)
    # If it is a whole number like 725.00, return int or float matching portal style
    f = float(rounded)
    return int(f) if f.is_integer() and not ("." in str(rounded) and rounded % 1 != 0) else f


class GSTR1Serializer:
    """Serializes returns to official GSTN offline utility format."""

    @staticmethod
    def serialize(
        seller_gstin: str,
        filing_period: str,
        b2b_invoices: List[NormalizedB2BInvoice],
        b2cs_summaries: List[NormalizedB2CSummary],
        cdnr_notes: List[NormalizedCreditDebitNote],
        doc_entries: List[NormalizedDocIssueEntry],
        hsn_items: List[NormalizedHSNItem],
        eco_supplies: List[NormalizedEcoSupply],
    ) -> Dict[str, Any]:
        """
        Builds complete GSTR-1 dictionary matching schema of official offline utility.
        """
        root: Dict[str, Any] = {
            "gstin": seller_gstin.strip().upper(),
            "fp": filing_period.strip(),
        }

        # 1. B2B Section
        if b2b_invoices:
            ctin_groups: Dict[str, List[Dict[str, Any]]] = {}
            for inv in b2b_invoices:
                ctin = inv.recipient_gstin
                if ctin not in ctin_groups:
                    ctin_groups[ctin] = []

                inv_obj: Dict[str, Any] = {
                    "inum": inv.invoice_number,
                    "idt": inv.invoice_date,
                    "val": to_float(inv.invoice_value),
                    "pos": inv.pos,
                    "rchrg": inv.reverse_charge,
                    "inv_typ": inv.invoice_type.value,
                    "itms": []
                }

                for item in inv.items:
                    itm_det: Dict[str, Any] = {
                        "txval": to_float(item.taxable_value),
                        "rt": to_float(item.rate),
                        "iamt": to_float(item.igst),
                        "camt": to_float(item.cgst),
                        "samt": to_float(item.sgst),
                        "csamt": to_float(item.cess),
                    }
                    inv_obj["itms"].append({
                        "num": item.item_num,
                        "itm_det": itm_det,
                    })

                ctin_groups[ctin].append(inv_obj)

            root["b2b"] = [
                {"ctin": ctin, "inv": invs}
                for ctin, invs in ctin_groups.items()
            ]

        # 2. B2CS Section (Aggregate by sply_ty, rt, typ, pos)
        if b2cs_summaries:
            b2cs_aggregated: Dict[tuple, Dict[str, Any]] = {}
            for s in b2cs_summaries:
                key = (s.supply_type.value, s.rate, s.type_code, s.pos)
                if key not in b2cs_aggregated:
                    b2cs_aggregated[key] = {
                        "sply_ty": s.supply_type.value,
                        "rt": to_float(s.rate),
                        "typ": s.type_code,
                        "pos": s.pos,
                        "txval": Decimal("0.00"),
                        "iamt": Decimal("0.00"),
                        "camt": Decimal("0.00"),
                        "samt": Decimal("0.00"),
                        "csamt": Decimal("0.00"),
                    }
                b2cs_aggregated[key]["txval"] += s.taxable_value
                b2cs_aggregated[key]["iamt"] += s.igst
                b2cs_aggregated[key]["camt"] += s.cgst
                b2cs_aggregated[key]["samt"] += s.sgst
                b2cs_aggregated[key]["csamt"] += s.cess

            root["b2cs"] = [
                {
                    "sply_ty": v["sply_ty"],
                    "rt": v["rt"],
                    "typ": v["typ"],
                    "pos": v["pos"],
                    "txval": to_float(v["txval"]),
                    "iamt": to_float(v["iamt"]),
                    "samt": to_float(v["samt"]),
                    "camt": to_float(v["camt"]),
                    "csamt": to_float(v["csamt"]),
                }
                for v in b2cs_aggregated.values()
            ]

        # 3. CDNR Section
        if cdnr_notes:
            cdnr_groups: Dict[str, List[Dict[str, Any]]] = {}
            for note in cdnr_notes:
                ctin = note.recipient_gstin
                if ctin not in cdnr_groups:
                    cdnr_groups[ctin] = []

                # Compute tax for note
                half_rt = note.rate / Decimal("2.0")
                is_intra = (note.pos == seller_gstin[:2])
                if is_intra:
                    camt = round_cur((note.taxable_value * half_rt) / Decimal("100.0"))
                    samt = round_cur((note.taxable_value * half_rt) / Decimal("100.0"))
                    iamt = Decimal("0.00")
                else:
                    iamt = round_cur((note.taxable_value * note.rate) / Decimal("100.0"))
                    camt = Decimal("0.00")
                    samt = Decimal("0.00")

                nt_obj = {
                    "nt_num": note.note_number,
                    "nt_dt": note.note_date,
                    "val": to_float(note.note_value),
                    "ntty": note.note_type,
                    "pos": note.pos,
                    "rchrg": note.reverse_charge,
                    "p_gst": "N",
                    "itms": [
                        {
                            "num": 1,
                            "itm_det": {
                                "txval": to_float(note.taxable_value),
                                "rt": to_float(note.rate),
                                "iamt": to_float(iamt),
                                "camt": to_float(camt),
                                "samt": to_float(samt),
                                "csamt": to_float(note.cess),
                            }
                        }
                    ]
                }
                cdnr_groups[ctin].append(nt_obj)

            root["cdnr"] = [
                {"ctin": ctin, "nt": notes}
                for ctin, notes in cdnr_groups.items()
            ]

        # 4. Documents Issued Section
        if doc_entries:
            doc_cat_groups: Dict[int, Dict[str, Any]] = {}

            for entry in doc_entries:
                nat_clean = entry.nature_of_document.strip().lower()
                doc_num = 1
                doc_typ_label = entry.nature_of_document
                for key_pat, (mapped_num, mapped_label) in DOCUMENT_NATURE_MAP.items():
                    if key_pat in nat_clean:
                        doc_num = mapped_num
                        doc_typ_label = mapped_label
                        break

                if doc_num not in doc_cat_groups:
                    doc_cat_groups[doc_num] = {
                        "doc_num": doc_num,
                        "doc_typ": doc_typ_label,
                        "docs": []
                    }

                doc_cat_groups[doc_num]["docs"].append({
                    "num": len(doc_cat_groups[doc_num]["docs"]) + 1,
                    "from": entry.sr_no_from,
                    "to": entry.sr_no_to,
                    "totnum": entry.total_number,
                    "cancel": entry.cancelled,
                    "net_issue": entry.net_issued,
                })

            root["doc_issue"] = {
                "doc_det": sorted(list(doc_cat_groups.values()), key=lambda x: x["doc_num"])
            }

        # 5. E-Commerce Section (supeco)
        if eco_supplies:
            root["supeco"] = {
                "clttx": [
                    {
                        "etin": eco.eco_gstin,
                        "suppval": to_float(eco.taxable_value),
                        "igst": to_float(eco.igst),
                        "cgst": to_float(eco.cgst),
                        "sgst": to_float(eco.sgst),
                        "cess": to_float(eco.cess),
                        "flag": "N",
                    }
                    for eco in eco_supplies
                ]
            }

        # 6. HSN Section (split into hsn_b2c and hsn_b2b)
        if hsn_items:
            hsn_b2c = [i for i in hsn_items if i.category == "B2C"]
            hsn_b2b = [i for i in hsn_items if i.category == "B2B"]

            hsn_dict: Dict[str, Any] = {}
            running_num = 1

            if hsn_b2c:
                serialized_b2c = []
                for item in hsn_b2c:
                    serialized_b2c.append({
                        "num": running_num,
                        "hsn_sc": item.hsn_sac,
                        "uqc": item.uqc,
                        "qty": to_float(item.quantity),
                        "rt": to_float(item.rate),
                        "txval": to_float(item.taxable_value),
                        "iamt": to_float(item.igst),
                        "samt": to_float(item.sgst),
                        "camt": to_float(item.cgst),
                        "csamt": to_float(item.cess),
                    })
                    running_num += 1
                hsn_dict["hsn_b2c"] = serialized_b2c

            if hsn_b2b:
                serialized_b2b = []
                for item in hsn_b2b:
                    serialized_b2b.append({
                        "num": running_num,
                        "hsn_sc": item.hsn_sac,
                        "uqc": item.uqc,
                        "qty": to_float(item.quantity),
                        "rt": to_float(item.rate),
                        "txval": to_float(item.taxable_value),
                        "iamt": to_float(item.igst),
                        "samt": to_float(item.sgst),
                        "camt": to_float(item.cgst),
                        "csamt": to_float(item.cess),
                    })
                    running_num += 1
                hsn_dict["hsn_b2b"] = serialized_b2b

            root["hsn"] = hsn_dict

        return root

    @staticmethod
    def to_json_str(data: Dict[str, Any], indent: int = 2) -> str:
        return json.dumps(data, indent=indent, ensure_ascii=False)
