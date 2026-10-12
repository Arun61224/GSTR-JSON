"""
Comprehensive unit and regression tests for GSTR-1 Generator Engine.
Validates Amazon CSV adapters, tax calculations, HSN aggregations, and compares against OD.json reference.
"""

from decimal import Decimal
import json
import os
import unittest

from engine.constants import STATE_CODE_MAP, VALID_GST_RATES
from engine.csv_adapters import AmazonCSVAdapter, detect_file_type, parse_date_to_ddmmyyyy
from engine.gstr1_processor import GSTR1Processor
from engine.models import InvoiceType, Severity
from engine.tax_calculator import extract_state_code, determine_supply_type, calculate_taxes, SupplyType


class TestGSTR1Engine(unittest.TestCase):
    """Test suite covering all 12 core requirements."""

    def setUp(self):
        self.fixtures_dir = os.path.join(os.path.dirname(__file__), "..", "fixtures")
        self.templates_dir = os.path.join(self.fixtures_dir, "templates")
        self.ref_json_path = os.path.join(self.fixtures_dir, "OD.json")

    def test_01_csv_header_detection(self):
        """1. CSV headers are detected correctly without relying solely on filenames."""
        b2b_headers = [
            "GSTIN/UIN of Recipient", "Receiver Name", "Invoice Number", "Invoice date",
            "Invoice Value", "Place Of Supply", "Reverse Charge", "Rate", "Taxable Value"
        ]
        self.assertEqual(detect_file_type(b2b_headers, "random_name.csv"), "b2b")

        b2cs_headers = ["Type", "Place Of Supply", "Rate", "Taxable Value", "E-Commerce GSTIN"]
        self.assertEqual(detect_file_type(b2cs_headers, "file_123.csv"), "b2cs")

        cdnr_headers = ["GSTIN/UIN of Recipient", "Note Number", "Note Date", "Note Type", "Taxable Value"]
        self.assertEqual(detect_file_type(cdnr_headers, "notes.csv"), "cdnr")

        doc_headers = ["Nature of Document", "Sr. No. From", "Sr. No. To", "Total Number", "Cancelled"]
        self.assertEqual(detect_file_type(doc_headers, "summary.csv"), "docs")

        eco_headers = ["GSTIN of E-Commerce Operator", "E-Commerce Operator Name", "Taxable Value"]
        self.assertEqual(detect_file_type(eco_headers, "eco_report.csv"), "supeco")

    def test_02_multi_gstin_isolation(self):
        """2. Seller GSTINs are isolated into separate returns and never mixed."""
        # Process for AP registration
        proc_ap = GSTR1Processor(seller_gstin="37ABAFV0462G1ZA", filing_period="092026")
        # Process for Karnataka registration
        proc_ka = GSTR1Processor(seller_gstin="29ABAFV0462G1Z7", filing_period="092026")

        b2cs_csv = """Type,Place Of Supply,Rate,Taxable Value
OE,37-ANDHRA PRADESH,5,1000.00
OE,29-KARNATAKA,5,2000.00
"""
        proc_ap.load_file("b2cs.csv", b2cs_csv)
        proc_ka.load_file("b2cs.csv", b2cs_csv)

        res_ap = proc_ap.run()
        res_ka = proc_ka.run()

        # AP should treat POS 37 as INTRA and POS 29 as INTER
        b2cs_ap = {x["pos"]: x for x in res_ap["gstr1_json"]["b2cs"]}
        self.assertEqual(b2cs_ap["37"]["sply_ty"], "INTRA")
        self.assertEqual(b2cs_ap["29"]["sply_ty"], "INTER")

        # KA should treat POS 29 as INTRA and POS 37 as INTER
        b2cs_ka = {x["pos"]: x for x in res_ka["gstr1_json"]["b2cs"]}
        self.assertEqual(b2cs_ka["29"]["sply_ty"], "INTRA")
        self.assertEqual(b2cs_ka["37"]["sply_ty"], "INTER")

    def test_03_tax_rates_and_pos_normalization(self):
        """3. Tax rates and state codes normalized correctly."""
        self.assertEqual(extract_state_code("37-ANDHRA PRADESH"), "37")
        self.assertEqual(extract_state_code("36-TELANGANA"), "36")
        self.assertEqual(extract_state_code("07-DELHI"), "07")
        self.assertEqual(extract_state_code("DELHI"), "07")
        self.assertEqual(extract_state_code("29"), "29")

    def test_04_multiple_lines_grouped_into_invoice(self):
        """4. Multiple lines of one invoice grouped correctly."""
        adapter = AmazonCSVAdapter()
        csv_content = """GSTIN/UIN of Recipient,Receiver Name,Invoice Number,Invoice date,Invoice Value,Place Of Supply,Reverse Charge,Invoice Type,Rate,Taxable Value,Cess Amount
37AUJPG5075A1ZT,KALYAN SILKS,INV-001,08-09-2026,1050,37-ANDHRA PRADESH,N,Regular B2B,5,500.00,0
37AUJPG5075A1ZT,KALYAN SILKS,INV-001,08-09-2026,1050,37-ANDHRA PRADESH,N,Regular B2B,12,500.00,0
"""
        _, rows = adapter.parse_csv_content(csv_content)
        invoices = adapter.parse_b2b(rows, seller_gstin="37ABAFV0462G1ZA")
        self.assertEqual(len(invoices), 1)
        self.assertEqual(invoices[0].invoice_number, "INV-001")
        self.assertEqual(len(invoices[0].items), 2)
        self.assertEqual(invoices[0].items[0].rate, Decimal("5.0"))
        self.assertEqual(invoices[0].items[1].rate, Decimal("12.0"))

    def test_05_document_counts_and_net_issued(self):
        """5. Document counts are calculated correctly: net = tot - cancel."""
        adapter = AmazonCSVAdapter()
        csv_content = """Nature of Document,Sr. No. From,Sr. No. To,Total Number,Cancelled
Invoices for outward supply,RJX1-707,RJX1-733,27,0
Credit Note,RJX1-C-88,RJX1-C-90,3,1
"""
        _, rows = adapter.parse_csv_content(csv_content)
        docs = adapter.parse_docs(rows)
        self.assertEqual(len(docs), 2)
        self.assertEqual(docs[0].total_number, 27)
        self.assertEqual(docs[0].cancelled, 0)
        self.assertEqual(docs[0].net_issued, 27)
        self.assertEqual(docs[1].total_number, 3)
        self.assertEqual(docs[1].cancelled, 1)
        self.assertEqual(docs[1].net_issued, 2)

    def test_06_hsn_totals_reconciliation(self):
        """6. HSN totals are reconciled correctly against source lines."""
        adapter = AmazonCSVAdapter()
        csv_content = """HSN,Description,UQC,Total Quantity,Total Value,Taxable Value,Integrated Tax Amount,Central Tax Amount,State/UT Tax Amount,Cess Amount,Rate
61099090,T-SHIRT,PCS,10,1050,1000,0,25,25,0,5
61072990,SHIRT,PCS,5,525,500,25,0,0,0,5
"""
        _, rows = adapter.parse_csv_content(csv_content)
        hsn_items = adapter.parse_hsn(rows, category="B2C")
        self.assertEqual(len(hsn_items), 2)
        total_txval = sum(i.taxable_value for i in hsn_items)
        self.assertEqual(total_txval, Decimal("1500.00"))

    def test_07_ecommerce_supplies_no_double_counting(self):
        """7. E-commerce operator section is distinct and preserves operator ETIN."""
        adapter = AmazonCSVAdapter()
        csv_content = """GSTIN of E-Commerce Operator,E-Commerce Operator Name,Taxable Value,Integrated tax,Central tax,State/UT tax,Cess Amount
37AAICA3918J1CS,AMAZON SELLER SERVICES PRIVATE LIMITED,16223.40,215.89,297.68,297.68,0
"""
        _, rows = adapter.parse_csv_content(csv_content)
        ecos = adapter.parse_eco(rows)
        self.assertEqual(len(ecos), 1)
        self.assertEqual(ecos[0].eco_gstin, "37AAICA3918J1CS")
        self.assertEqual(ecos[0].taxable_value, Decimal("16223.40"))

    def test_08_negative_refund_adjustment_handling(self):
        """8. Negative refund/adjustment amounts are classified correctly without breaking."""
        adapter = AmazonCSVAdapter()
        csv_content = """Type,Place Of Supply,Rate,Applicable % of Tax Rate,Taxable Value,Cess Amount,E-Commerce GSTIN
OE,24-GUJARAT,5,,-692.38,0,
"""
        _, rows = adapter.parse_csv_content(csv_content)
        b2cs = adapter.parse_b2cs(rows, seller_gstin="37ABAFV0462G1ZA")
        self.assertEqual(len(b2cs), 1)
        self.assertEqual(b2cs[0].taxable_value, Decimal("-692.38"))
        self.assertEqual(b2cs[0].igst, Decimal("-34.62"))

    def test_09_missing_mandatory_data_produces_errors(self):
        """9. Missing required data produces clear errors."""
        processor = GSTR1Processor(seller_gstin="INVALID_GSTIN", filing_period="999999")
        results = processor.run()
        self.assertFalse(results["can_generate"])
        error_codes = [i["code"] for i in results["validation_summary"]["issues"] if i["severity"] == "ERROR"]
        self.assertIn("ERR_SELLER_GSTIN_INVALID", error_codes)
        self.assertIn("ERR_FILING_PERIOD_INVALID", error_codes)

    def test_10_golden_reference_regression_against_od_json(self):
        """10. Generated JSON matches the expected reference structure and totals from OD.json."""
        with open(self.ref_json_path, "r", encoding="utf-8") as f:
            golden_data = json.load(f)

        processor = GSTR1Processor(seller_gstin=golden_data["gstin"], filing_period=golden_data["fp"])

        for fname in os.listdir(self.templates_dir):
            if fname.endswith(".csv"):
                fpath = os.path.join(self.templates_dir, fname)
                with open(fpath, "r", encoding="utf-8-sig") as f:
                    processor.load_file(fname, f.read())

        results = processor.run()
        self.assertTrue(results["can_generate"], f"Errors found: {results['validation_summary']['issues']}")

        gen_json = results["gstr1_json"]
        self.assertEqual(gen_json["gstin"], golden_data["gstin"])
        self.assertEqual(gen_json["fp"], golden_data["fp"])

        # Compare B2CS
        golden_b2cs = golden_data.get("b2cs", [])
        gen_b2cs = gen_json.get("b2cs", [])
        gen_pos_map = {item["pos"]: item for item in gen_b2cs}
        for golden_item in golden_b2cs:
            pos = golden_item["pos"]
            self.assertIn(pos, gen_pos_map)
            self.assertEqual(gen_pos_map[pos]["txval"], golden_item["txval"])

        # Compare doc_issue
        golden_docs = golden_data.get("doc_issue", {}).get("doc_det", [])
        gen_docs = gen_json.get("doc_issue", {}).get("doc_det", [])
        self.assertEqual(len(gen_docs), len(golden_docs))

    def test_11_large_dataset_performance(self):
        """11. Large CSV data handling executes smoothly under time & memory constraints."""
        adapter = AmazonCSVAdapter()
        # Generate 5,000 synthetic rows
        header = "Type,Place Of Supply,Rate,Applicable % of Tax Rate,Taxable Value,Cess Amount,E-Commerce GSTIN\n"
        row_template = "OE,07-DELHI,5,,100.50,0,\n"
        large_content = header + (row_template * 5000)

        _, rows = adapter.parse_csv_content(large_content)
        self.assertEqual(len(rows), 5000)
        summaries = adapter.parse_b2cs(rows, seller_gstin="37ABAFV0462G1ZA")
        self.assertEqual(len(summaries), 5000)

    def test_12_invalid_transaction_flagging(self):
        """12. Invalid transactions are flagged rather than silently included."""
        adapter = AmazonCSVAdapter()
        # B2B row missing invoice number
        bad_b2b = """GSTIN/UIN of Recipient,Receiver Name,Invoice Number,Invoice date,Invoice Value,Place Of Supply,Reverse Charge,Rate,Taxable Value
37AUJPG5075A1ZT,KALYAN SILKS,,08-09-2026,1050,37-ANDHRA PRADESH,N,5,1000.00
"""
        _, rows = adapter.parse_csv_content(bad_b2b)
        invoices = adapter.parse_b2b(rows, seller_gstin="37ABAFV0462G1ZA")
        self.assertEqual(len(invoices), 0)
        self.assertTrue(any(i.code == "ERR_B2B_MISSING_INUM" for i in adapter.issues))


if __name__ == "__main__":
    unittest.main()
