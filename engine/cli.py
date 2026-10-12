"""
Command Line Interface for GSTR-1 Generator Engine.
Usage:
  python3 -m engine.cli --gstin 37ABAFV0462G1ZA --fp 092026 --dir fixtures/templates --output output_gstr1.json
"""

import argparse
import json
import os
import sys
from engine.gstr1_processor import GSTR1Processor


def main():
    parser = argparse.ArgumentParser(description="Convert Amazon Seller Central GST reports to GSTR-1 JSON.")
    parser.add_argument("--gstin", required=True, help="15-character Seller GSTIN registration")
    parser.add_argument("--fp", required=True, help="Filing period MMYYYY (e.g. 092026)")
    parser.add_argument("--dir", default="fixtures/templates", help="Directory containing Amazon CSV reports")
    parser.add_argument("--output", default="gstr1_output.json", help="Destination file path for generated JSON")

    args = parser.parse_args()

    processor = GSTR1Processor(seller_gstin=args.gstin, filing_period=args.fp)

    if not os.path.isdir(args.dir):
        print(f"Error: Directory '{args.dir}' does not exist.", file=sys.stderr)
        sys.exit(1)

    loaded_count = 0
    for fname in os.listdir(args.dir):
        if fname.endswith(".csv"):
            fpath = os.path.join(args.dir, fname)
            with open(fpath, "r", encoding="utf-8-sig") as f:
                content = f.read()
                detected = processor.load_file(fname, content)
                print(f"Loaded '{fname}' -> Detected as: {detected}")
                loaded_count += 1

    print(f"Loaded {loaded_count} CSV reports. Processing...")
    results = processor.run()

    print(f"Validation: {results['validation_summary']['errors']} Errors, {results['validation_summary']['warnings']} Warnings, {results['validation_summary']['info']} Info")

    with open(args.output, "w", encoding="utf-8") as f:
        f.write(results["gstr1_json_str"])
    print(f"Successfully wrote GSTR-1 JSON to '{args.output}'!")


if __name__ == "__main__":
    main()
