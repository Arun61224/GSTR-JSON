# GSTR-1 JSON Generator for Amazon Sellers

A production-grade solution that converts Amazon Seller Central GST report CSV files into official GSTR-1 JSON files suitable for direct upload through the Indian GST Portal offline utility tool (v3.1.8+).

Designed for Indian e-commerce sellers managing multiple GSTIN registrations who need to file monthly GSTR-1 returns with transparent reconciliation, schema validation, and audit tracking.

---

## 🚀 Key Features

1. **All 7 Amazon Seller Central CSV Reports Supported**:
   - `b2b,sez,de.csv` (B2B Tax Invoices, SEZ, Deemed Exports)
   - `b2cs.csv` (B2C Small Supplies by POS and Tax Rate)
   - `cdnr.csv` (Credit & Debit Notes for registered buyers)
   - `docs.csv` (Document Register: Invoices & Credit Notes Issued / Cancelled)
   - `hsn(b2b).csv` (B2B Tariff / HSN Summary)
   - `hsn(b2c).csv` (B2C Tariff / HSN Summary)
   - `supplies_through_eco.csv` (Supplies made through E-Commerce Operator: Section 14/15 `supeco`)

2. **Strict GSTN Offline Utility Schema Adherence**:
   - Matches official schema benchmarked against accepted `OD.json` golden fixture.
   - Preserves invoice numbers, leading zeros, and alphanumeric characters.
   - Correctly formats dates to `DD-MM-YYYY` across varying Amazon source date dialects.
   - Accurately determines Inter-State (`IGST`) vs Intra-State (`CGST` + `SGST`) supplies based on seller registration state code vs Place of Supply (`POS`).
   - Supports negative values in B2CS for sales return / net refund adjustments without crashing.

3. **Multi-GSTIN Registration Support**:
   - Isolates transactions belonging to different seller GSTIN registrations.
   - Never cross-contaminates different registrations.
   - Batch export: Generates individual JSON returns and an All-in-One `.ZIP` archive for all registered seller branches.

4. **Multi-Level Validation Engine**:
   - **ERROR (Blocking)**: Invalid seller GSTIN checksum, invalid return period, missing mandatory fields, cancelled docs exceeding total.
   - **WARNING (Review)**: Non-standard tax rates, short HSN codes (<4 digits), potential cross-state tax mismatches.
   - **INFO (Audit)**: Permitted negative return adjustments, successful POS mappings.

5. **Granular Section Reconciliation & Audit Trail**:
   - Reconciles `B2CS` taxable value against `HSN B2C` summary totals.
   - Reconciles `B2B` taxable value against `HSN B2B` summary totals.
   - Reconciles `ECO` supplies with platform transactions without double counting.
   - Exports complete row-level audit trails and reconciliation CSV spreadsheets.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Python Engine**: Python 3.9+ standard library (`decimal`, `csv`, `json`, `re`, `unittest`)
- **Packaging & Compression**: JSZip for offline bundle archives, PapaParse for streaming CSV parsing
- **Deployment**: Vercel ready (`vercel.json`)

---

## 📂 Project Structure

```
├── engine/                   # Python GSTR-1 Generator Engine
│   ├── __init__.py
│   ├── cli.py                # Command-line interface
│   ├── constants.py          # State code maps (01-38, 97), UQCs, rates
│   ├── csv_adapters.py       # Amazon CSV parsers and header signature detector
│   ├── gstr1_processor.py    # Master orchestrator
│   ├── models.py             # Normalized transaction and validation models
│   ├── serializer.py         # Official GSTN JSON offline utility serializer
│   ├── tax_calculator.py     # Precise Decimal tax calculations & POS logic
│   └── validator.py          # 3-tier validation engine (ERROR, WARNING, INFO)
├── tests/
│   └── test_gstr1_engine.py  # 12-point unit and golden regression tests
├── fixtures/
│   ├── OD.json               # Accepted reference JSON benchmark
│   └── templates/            # 7 sample Amazon Seller Central CSV files
├── src/                      # Web Dashboard source code
│   ├── App.tsx               # Main Dashboard with tabbed views
│   ├── components/           # UI views (Upload, Validation, Reconciliation, JSON, Audit)
│   ├── data/                 # Sample templates loader
│   ├── engine/               # TypeScript counterpart of the calculation engine
│   └── utils/                # CSV and ZIP export helpers
├── vercel.json               # Vercel deployment configuration
├── requirements.txt          # Python dependencies
└── package.json              # Node dependencies
```

---

## 🧪 Running Automated Regression Tests

Run the complete 12-point Python test suite against the reference fixtures:

```bash
python3 -m unittest discover -s tests -p "test_*.py" -v
```

All 12 tests verify:
1. CSV header detection without relying solely on filenames
2. Seller GSTIN isolation into separate returns
3. State code and POS normalization (e.g. `37-ANDHRA PRADESH` -> `37`)
4. Grouping multiple tax-rate lines of a single invoice
5. Document count calculations (`net = tot - cancel`)
6. HSN summary reconciliation against line totals
7. E-commerce supplies handling without double counting
8. Classification and tolerance of negative refund/adjustment amounts
9. Missing mandatory data error reporting
10. Golden regression test against `OD.json`
11. Large dataset chunking (5,000+ synthetic rows)
12. Flagging invalid transactions rather than silently including them

---

## 🖥️ Running the Python CLI

You can run the engine directly from the command line:

```bash
python3 -m engine.cli \
  --gstin 37ABAFV0462G1ZA \
  --fp 092026 \
  --dir fixtures/templates \
  --output gstr1_output.json
```

---

## 🌐 Running the Web Application Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to interact with the dashboard:
- Click **"Load Sample Templates"** for instant demonstration against the golden reference dataset.
- Drag and drop your own Amazon Seller Central CSV exports.
- Switch between seller GSTIN registrations or add new state registrations.
- Inspect validation warnings, reconciliation balances, and formatted JSON.
- Download individual `.json` returns or a complete `.zip` package.

---

## 🚀 Vercel Deployment

Deploy directly using the Vercel CLI or GitHub integration:

```bash
npm install -g vercel
vercel
```

The included `vercel.json` automatically configures Vite build output, clean URLs, and security headers.
