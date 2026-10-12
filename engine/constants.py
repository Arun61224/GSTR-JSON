"""
Official GST constants and mappings for GSTR-1 Offline Utility.
"""

from typing import Dict, Set

# Standard 2-digit GST state codes
STATE_CODE_MAP: Dict[str, str] = {
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
    "28": "ANDHRA PRADESH",  # Old AP
    "29": "KARNATAKA",
    "30": "GOA",
    "31": "LAKSHADWEEP",
    "32": "KERALA",
    "33": "TAMIL NADU",
    "34": "PUDUCHERRY",
    "35": "ANDAMAN AND NICOBAR ISLANDS",
    "36": "TELANGANA",
    "37": "ANDHRA PRADESH",  # New AP
    "38": "LADAKH",
    "97": "OTHER TERRITORY",
}

# Reverse mapping for State Name -> 2-digit code
STATE_NAME_TO_CODE: Dict[str, str] = {
    v.upper(): k for k, v in STATE_CODE_MAP.items()
}
# Additional name aliases
STATE_NAME_TO_CODE.update({
    "JAMMU & KASHMIR": "01",
    "J&K": "01",
    "UTTARANCHAL": "05",
    "DELHI NCR": "07",
    "NEW DELHI": "07",
    "CHHATTISGARH": "22",
    "ORISSA": "21",
    "PONDICHERRY": "34",
    "ANDAMAN & NICOBAR ISLANDS": "35",
    "ANDAMAN AND NICOBAR": "35",
    "DADRA & NAGAR HAVELI": "26",
    "DAMAN & DIU": "26",
})

# Document nature mapping to official doc_num and doc_typ
DOCUMENT_NATURE_MAP = {
    "invoices for outward supply": (1, "Invoices for outward supply"),
    "inward supply": (2, "Invoices for inward supply from unregistered person"),
    "revised invoice": (3, "Revised Invoice"),
    "debit note": (4, "Debit Note"),
    "credit note": (5, "Credit Note"),
    "receipt voucher": (6, "Receipt voucher"),
    "payment voucher": (7, "Payment Voucher"),
    "refund voucher": (8, "Refund voucher"),
    "delivery challan for job work": (9, "Delivery Challan for job work"),
    "delivery challan for supply on approval": (10, "Delivery Challan for supply on approval"),
    "delivery challan in case of liquid gas": (11, "Delivery Challan in case of liquid gas"),
    "delivery challan in cases other than by way of supply": (12, "Delivery Challan in cases other than by way of supply"),
}

# Standard GST tax rates
VALID_GST_RATES: Set[float] = {0.0, 0.1, 0.25, 1.0, 1.5, 3.0, 5.0, 6.0, 7.5, 12.0, 18.0, 28.0}

# Standard Units of Quantity (UQC)
VALID_UQCS: Set[str] = {
    "BAG", "BAL", "BDL", "BKL", "BOU", "BOX", "BTL", "BUN", "CAN", "CBM", "CCM",
    "CMS", "CTN", "DOZ", "DRM", "GGK", "GMS", "GRS", "GYD", "KGS", "KLR", "KME",
    "MLT", "MTR", "MTS", "NOS", "PAC", "PCS", "PRS", "QTL", "ROL", "SET", "SQF",
    "SQM", "SQY", "TBS", "TGM", "THD", "TON", "TUB", "UGS", "UNT", "YDS", "OTH"
}
