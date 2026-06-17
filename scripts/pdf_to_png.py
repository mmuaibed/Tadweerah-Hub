"""
PDF to PNG Exporter for Tadweerah Hub
Note: This script requires PyMuPDF. 
Before running, install it via:
    pip install PyMuPDF

This script extracts PNG images from the generated PDF as a fallback
when draw.io CLI image export fails (e.g. headless GPU issues).
"""
import fitz
import os

pdf_path = r"docs\exports\operational-truth-v5\Tadweerah_Operational_Truth_Workflows_v5.pdf"
out_dir = r"docs\exports\operational-truth-v5"

pages_names = [
    "01_Overview",
    "02_Marketplace_Listing",
    "03_Offers_and_Deals",
    "04_Deal_Lifecycle",
    "05_Operational_Contracts",
    "06_Shipments_and_Weights",
    "07_Reports",
    "08_Transport_Quote_Lite",
    "09_Future_Transporters",
    "10_Future_Recycled",
    "11_Admin_Ops",
    "12_Admin_Findings"
]

doc = fitz.open(pdf_path)

if len(doc) != len(pages_names):
    print(f"Warning: PDF has {len(doc)} pages, but we have {len(pages_names)} names.")

# Use a high resolution scale
zoom = 2.0
mat = fitz.Matrix(zoom, zoom)

for i in range(min(len(doc), len(pages_names))):
    page = doc.load_page(i)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    out_file = os.path.join(out_dir, f"{pages_names[i]}.png")
    pix.save(out_file)
    print(f"Saved {out_file}")

doc.close()
print("PDF to PNG conversion complete.")
