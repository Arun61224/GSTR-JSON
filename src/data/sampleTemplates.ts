/**
 * Amazon Seller Central GST Report Sample CSV Templates.
 * Derived from official Amazon Seller Central exports and the OD.json benchmark.
 */

import { UploadedReportFile } from '../engine/gstEngine';

export const SAMPLE_TEMPLATES: Omit<UploadedReportFile, 'id'>[] = [
  {
    filename: 'b2b,sez,de.csv',
    size: 420,
    detectedType: 'b2b',
    headers: [
      'GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice date',
      'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Applicable % of Tax Rate',
      'Invoice Type', 'E-Commerce GSTIN', 'Rate', 'Taxable Value', 'Cess Amount'
    ],
    rowCount: 3,
    content: `GSTIN/UIN of Recipient,Receiver Name,Invoice Number,Invoice date,Invoice Value,Place Of Supply,Reverse Charge,Applicable % of Tax Rate,Invoice Type,E-Commerce GSTIN,Rate,Taxable Value,Cess Amount
37AUJPG5075A1ZT,KALYAN SILKS TRADERS,RJX1-714,08-09-2026,725,37-ANDHRA PRADESH,N,,Regular B2B,,5,690.07,0
27ABAFV0462G1ZB,MAHARASHTRA RETAIL CO,RJX1-T-158,06-09-2026,480,27-MAHARASHTRA,N,,Regular B2B,,5,457.14,0
29ABAFV0462G1Z7,BANGALORE COMMERCIALS,RJX1-T-159,15-09-2026,314,29-KARNATAKA,N,,Regular B2B,,5,298.71,0
36ACNFA7127K1Z1,AAINFINITY CONSULTING SERVICES LLP,BLR7-41731,01-09-2026,797,36-TELANGANA,N,,Regular B2B,,5,759.05,0`
  },
  {
    filename: 'b2cs.csv',
    size: 485,
    detectedType: 'b2cs',
    headers: ['Type', 'Place Of Supply', 'Rate', 'Applicable % of Tax Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN'],
    rowCount: 8,
    content: `Type,Place Of Supply,Rate,Applicable % of Tax Rate,Taxable Value,Cess Amount,E-Commerce GSTIN
OE,37-ANDHRA PRADESH,5,,11215.65,0,
OE,36-TELANGANA,5,,2056.37,0,
OE,30-GOA,5,,671.61,0,
OE,17-MEGHALAYA,5,,671.61,0,
OE,21-ODISHA,5,,568.57,0,
OE,29-KARNATAKA,5,,520.95,0,
OE,27-MAHARASHTRA,5,,520.95,0,
OE,24-GUJARAT,5,,-692.38,0,
OE,07-DELHI,5,,174765.23,0,`
  },
  {
    filename: 'cdnr.csv',
    size: 290,
    detectedType: 'cdnr',
    headers: [
      'GSTIN/UIN of Recipient', 'Receiver Name', 'Note Number', 'Note Date', 'Note Type',
      'Place Of Supply', 'Reverse Charge', 'Note Supply Type', 'Note Value',
      'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount'
    ],
    rowCount: 1,
    content: `GSTIN/UIN of Recipient,Receiver Name,Note Number,Note Date,Note Type,Place Of Supply,Reverse Charge,Note Supply Type,Note Value,Applicable % of Tax Rate,Rate,Taxable Value,Cess Amount
29AAFCV6549P1ZB,VAMTECH ENERGY SOLUTIONS PRIVATE LIMITED,BLR8-C-1360,04-09-2026,C,29-KARNATAKA,N,Regular B2B,773.09,,5,736.27,0`
  },
  {
    filename: 'docs.csv',
    size: 210,
    detectedType: 'docs',
    headers: ['Nature of Document', 'Sr. No. From', 'Sr. No. To', 'Total Number', 'Cancelled'],
    rowCount: 2,
    content: `Nature of Document,Sr. No. From,Sr. No. To,Total Number,Cancelled
Invoices for outward supply,RJX1-707,RJX1-733,27,0
Credit Note,RJX1-C-88,RJX1-C-90,3,1
Invoices for outward supply,BLR8-14908,BLR8-19453,4546,271`
  },
  {
    filename: 'hsn(b2b).csv',
    size: 360,
    detectedType: 'hsn_b2b',
    headers: [
      'HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Taxable Value',
      'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount', 'Rate'
    ],
    rowCount: 2,
    content: `HSN,Description,UQC,Total Quantity,Total Value,Taxable Value,Integrated Tax Amount,Central Tax Amount,State/UT Tax Amount,Cess Amount,Rate
61099090,,PCS,2,1038.22,988.78,14.94,17.25,17.25,0,5
61072990,,PCS,1,480.00,457.14,22.86,0.00,0.00,0,5
61099090,,PCS,728,289596.51,275805.58,13224.39,283.27,283.27,0,5`
  },
  {
    filename: 'hsn(b2c).csv',
    size: 470,
    detectedType: 'hsn_b2c',
    headers: [
      'HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Taxable Value',
      'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount', 'Rate'
    ],
    rowCount: 4,
    content: `HSN,Description,UQC,Total Quantity,Total Value,Taxable Value,Integrated Tax Amount,Central Tax Amount,State/UT Tax Amount,Cess Amount,Rate
61099090,,PCS,11,7944.49,7566.12,26.05,176.16,176.16,0,5
61072990,,PCS,2,2137.38,2035.60,101.78,0.00,0.00,0,5
61112000,,PCS,5,3333.21,3174.47,33.58,62.58,62.58,0,5
61034990,,PCS,5,2895.00,2757.14,54.48,41.69,41.69,0,5
61112000,,PCS,4379,2679575.22,2551968.33,82731.01,22437.94,22437.94,0,5`
  },
  {
    filename: 'supplies_through_eco.csv',
    size: 260,
    detectedType: 'supeco',
    headers: ['GSTIN of E-Commerce Operator', 'E-Commerce Operator Name', 'Taxable Value', 'Integrated tax', 'Central tax', 'State/UT tax', 'Cess Amount'],
    rowCount: 1,
    content: `GSTIN of E-Commerce Operator,E-Commerce Operator Name,Taxable Value,Integrated tax,Central tax,State/UT tax,Cess Amount
37AAICA3918J1CS,AMAZON SELLER SERVICES PRIVATE LIMITED,16223.40,215.89,297.68,297.68,0
29AAECM9636P3CS,MYNTRA DESIGNS PRIVATE LIMITED,34891.42,1657.22,43.68,43.68,0`
  }
];

export const REFERENCE_OD_JSON_STRING = `{
  "gstin": "37ABAFV0462G1ZA",
  "fp": "092026",
  "b2b": [
    {
      "ctin": "37AUJPG5075A1ZT",
      "inv": [
        {
          "inum": "RJX1-714",
          "idt": "08-09-2026",
          "val": 725,
          "pos": "37",
          "rchrg": "N",
          "inv_typ": "R",
          "itms": [
            {
              "num": 1,
              "itm_det": {
                "txval": 690.07,
                "rt": 5,
                "iamt": 0,
                "camt": 17.25,
                "samt": 17.25,
                "csamt": 0
              }
            }
          ]
        }
      ]
    },
    {
      "ctin": "27ABAFV0462G1ZB",
      "inv": [
        {
          "inum": "RJX1-T-158",
          "idt": "06-09-2026",
          "val": 480,
          "pos": "27",
          "rchrg": "N",
          "inv_typ": "R",
          "itms": [
            {
              "num": 1,
              "itm_det": {
                "txval": 457.14,
                "rt": 5,
                "iamt": 22.86,
                "camt": 0,
                "samt": 0,
                "csamt": 0
              }
            }
          ]
        }
      ]
    },
    {
      "ctin": "29ABAFV0462G1Z7",
      "inv": [
        {
          "inum": "RJX1-T-159",
          "idt": "15-09-2026",
          "val": 314,
          "pos": "29",
          "rchrg": "N",
          "inv_typ": "R",
          "itms": [
            {
              "num": 1,
              "itm_det": {
                "txval": 298.71,
                "rt": 5,
                "iamt": 14.94,
                "camt": 0,
                "samt": 0,
                "csamt": 0
              }
            }
          ]
        }
      ]
    }
  ],
  "b2cs": [
    {
      "sply_ty": "INTRA",
      "rt": 5,
      "typ": "OE",
      "pos": "37",
      "txval": 11215.65,
      "iamt": 0,
      "samt": 280.43,
      "camt": 280.43,
      "csamt": 0
    },
    {
      "sply_ty": "INTER",
      "rt": 5,
      "typ": "OE",
      "pos": "36",
      "txval": 2056.37,
      "iamt": 102.82,
      "samt": 0,
      "camt": 0,
      "csamt": 0
    },
    {
      "sply_ty": "INTER",
      "rt": 5,
      "typ": "OE",
      "pos": "30",
      "txval": 671.61,
      "iamt": 33.58,
      "samt": 0,
      "camt": 0,
      "csamt": 0
    },
    {
      "sply_ty": "INTER",
      "rt": 5,
      "typ": "OE",
      "pos": "17",
      "txval": 671.61,
      "iamt": 33.58,
      "samt": 0,
      "camt": 0,
      "csamt": 0
    },
    {
      "sply_ty": "INTER",
      "rt": 5,
      "typ": "OE",
      "pos": "21",
      "txval": 568.57,
      "iamt": 28.43,
      "samt": 0,
      "camt": 0,
      "csamt": 0
    },
    {
      "sply_ty": "INTER",
      "rt": 5,
      "typ": "OE",
      "pos": "29",
      "txval": 520.95,
      "iamt": 26.05,
      "samt": 0,
      "camt": 0,
      "csamt": 0
    },
    {
      "sply_ty": "INTER",
      "rt": 5,
      "typ": "OE",
      "pos": "27",
      "txval": 520.95,
      "iamt": 26.05,
      "samt": 0,
      "camt": 0,
      "csamt": 0
    },
    {
      "sply_ty": "INTER",
      "rt": 5,
      "typ": "OE",
      "pos": "24",
      "txval": -692.38,
      "iamt": -34.62,
      "samt": 0,
      "camt": 0,
      "csamt": 0
    }
  ],
  "doc_issue": {
    "doc_det": [
      {
        "doc_num": 1,
        "doc_typ": "Invoices for outward supply",
        "docs": [
          {
            "num": 1,
            "from": "RJX1-707",
            "to": "RJX1-733",
            "totnum": 27,
            "cancel": 0,
            "net_issue": 27
          }
        ]
      },
      {
        "doc_num": 5,
        "doc_typ": "Credit Note",
        "docs": [
          {
            "num": 1,
            "from": "RJX1-C-88",
            "to": "RJX1-C-90",
            "totnum": 3,
            "cancel": 1,
            "net_issue": 2
          }
        ]
      }
    ]
  },
  "supeco": {
    "clttx": [
      {
        "etin": "37AAICA3918J1CS",
        "suppval": 16223.4,
        "igst": 215.89,
        "cgst": 297.68,
        "sgst": 297.68,
        "cess": 0,
        "flag": "N"
      }
    ]
  },
  "hsn": {
    "hsn_b2c": [
      {
        "num": 1,
        "hsn_sc": "61099090",
        "uqc": "PCS",
        "qty": 11,
        "rt": 5,
        "txval": 7566.12,
        "iamt": 26.05,
        "samt": 176.16,
        "camt": 176.16,
        "csamt": 0
      },
      {
        "num": 2,
        "hsn_sc": "61072990",
        "uqc": "PCS",
        "qty": 2,
        "rt": 5,
        "txval": 2035.6,
        "iamt": 101.78,
        "samt": 0,
        "camt": 0,
        "csamt": 0
      },
      {
        "num": 3,
        "hsn_sc": "61112000",
        "uqc": "PCS",
        "qty": 5,
        "rt": 5,
        "txval": 3174.47,
        "iamt": 33.58,
        "samt": 62.58,
        "camt": 62.58,
        "csamt": 0
      },
      {
        "num": 4,
        "hsn_sc": "61034990",
        "uqc": "PCS",
        "qty": 5,
        "rt": 5,
        "txval": 2757.14,
        "iamt": 54.48,
        "samt": 41.69,
        "camt": 41.69,
        "csamt": 0
      }
    ],
    "hsn_b2b": [
      {
        "num": 5,
        "hsn_sc": "61099090",
        "uqc": "PCS",
        "qty": 2,
        "rt": 5,
        "txval": 988.78,
        "iamt": 14.94,
        "samt": 17.25,
        "camt": 17.25,
        "csamt": 0
      },
      {
        "num": 6,
        "hsn_sc": "61072990",
        "uqc": "PCS",
        "qty": 1,
        "rt": 5,
        "txval": 457.14,
        "iamt": 22.86,
        "samt": 0,
        "camt": 0,
        "csamt": 0
      }
    ]
  }
}`;
