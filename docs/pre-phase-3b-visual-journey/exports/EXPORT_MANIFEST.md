# Pre-Phase 3-B Diagram Export Manifest

Last updated: 2026-06-29  
Source diagram file: `docs/pre-phase-3b-visual-journey/08A_VISUAL_DIAGRAMS.md`

Export tooling:

- Mermaid CLI: root dev dependency `@mermaid-js/mermaid-cli`
- Puppeteer: root dev dependency used only for Mermaid CLI export support

## Files Created

Mermaid source files:

- `docs/pre-phase-3b-visual-journey/exports/mermaid/01_persona_journey_map.mmd`
- `docs/pre-phase-3b-visual-journey/exports/mermaid/02_active_route_map.mmd`
- `docs/pre-phase-3b-visual-journey/exports/mermaid/03_sustainability_allocation_flow.mmd`
- `docs/pre-phase-3b-visual-journey/exports/mermaid/04_reports_flow.mmd`
- `docs/pre-phase-3b-visual-journey/exports/mermaid/05_40_35_5_evidence_map.mmd`
- `docs/pre-phase-3b-visual-journey/exports/mermaid/06_terminology_flow_diagram.mmd`

SVG exports:

- `docs/pre-phase-3b-visual-journey/exports/svg/01_persona_journey_map.svg`
- `docs/pre-phase-3b-visual-journey/exports/svg/02_active_route_map.svg`
- `docs/pre-phase-3b-visual-journey/exports/svg/03_sustainability_allocation_flow.svg`
- `docs/pre-phase-3b-visual-journey/exports/svg/04_reports_flow.svg`
- `docs/pre-phase-3b-visual-journey/exports/svg/05_40_35_5_evidence_map.svg`
- `docs/pre-phase-3b-visual-journey/exports/svg/06_terminology_flow_diagram.svg`

PDF exports:

- `docs/pre-phase-3b-visual-journey/exports/pdf/01_persona_journey_map.pdf`
- `docs/pre-phase-3b-visual-journey/exports/pdf/02_active_route_map.pdf`
- `docs/pre-phase-3b-visual-journey/exports/pdf/03_sustainability_allocation_flow.pdf`
- `docs/pre-phase-3b-visual-journey/exports/pdf/04_reports_flow.pdf`
- `docs/pre-phase-3b-visual-journey/exports/pdf/05_40_35_5_evidence_map.pdf`
- `docs/pre-phase-3b-visual-journey/exports/pdf/06_terminology_flow_diagram.pdf`

Export support files:

- `docs/pre-phase-3b-visual-journey/exports/README_EXPORTS.md`
- `docs/pre-phase-3b-visual-journey/exports/EXPORT_MANIFEST.md`

## Export Status

| Item | Status | Notes |
|---|---|---|
| Mermaid source extraction | Complete | Six `.mmd` files were created from `08A_VISUAL_DIAGRAMS.md`. The diagram legend was not exported because the requested package listed the six substantive diagrams only. |
| Mermaid CLI availability | Available | `pnpm.cmd exec mmdc --version` returned `11.15.0`. |
| SVG exports | Generated | Six SVG files were generated under `exports/svg/`. |
| PDF exports | Generated | Six PDF files were generated under `exports/pdf/`. |
| draw.io automated export | Not available | `where.exe draw.io`, `where.exe diagrams.net`, and `where.exe drawio` did not find a local CLI during export-package setup. |
| Manual action needed | Optional | Manual draw.io import is only needed if `.drawio` snapshots are desired. |

## Arabic Encoding Status

Root cause:

- The previous `.mmd` export files contained mojibake Arabic labels such as `Ø`, `Ù`, and `Ã` sequences.
- The generated SVG/PDF files reflected that corrupted source text.

Fix status:

| Item | Status | Notes |
|---|---|---|
| Mermaid `.mmd` Arabic | Fixed | The six `.mmd` files were reconstructed with real Arabic UTF-8 labels. |
| Mermaid init/font settings | Added | Each `.mmd` includes `htmlLabels` and `Tahoma, Arial, Segoe UI, sans-serif` font fallback. |
| SVG Arabic | Fixed by text sanity check | Regenerated SVG files contain readable Arabic and no `Ø`, `Ù`, or `Ã` mojibake markers. |
| PDF Arabic | Regenerated; visual inspection needed | PDFs were regenerated from fixed UTF-8 `.mmd` files, but local automated PDF text extraction was unavailable. |
| English fallback exports | Not created | Not needed because Mermaid source and SVG exports were fixed with readable Arabic. |

Manual PDF inspection note:

- `pdftotext` was not available locally.
- Python was available, but `pypdf` and `pdfplumber` were not installed.
- No new packages were installed for PDF text extraction.
- A human should visually inspect the regenerated PDFs to confirm Arabic glyph shaping and reading order.

## Regeneration Command

Run from the repository root:

```powershell
$svgDir = 'docs\pre-phase-3b-visual-journey\exports\svg'; $pdfDir = 'docs\pre-phase-3b-visual-journey\exports\pdf'; New-Item -ItemType Directory -Force $svgDir, $pdfDir | Out-Null; foreach ($file in Get-ChildItem 'docs\pre-phase-3b-visual-journey\exports\mermaid\*.mmd' | Sort-Object Name) { $base = $file.BaseName; pnpm.cmd exec mmdc -i $file.FullName -o (Join-Path $svgDir ($base + '.svg')) -b transparent; if ($LASTEXITCODE -ne 0) { throw "SVG export failed for $($file.Name)" }; pnpm.cmd exec mmdc -i $file.FullName -o (Join-Path $pdfDir ($base + '.pdf')) -b white; if ($LASTEXITCODE -ne 0) { throw "PDF export failed for $($file.Name)" } }
```

## Recommended Manual Export Targets

If manual exports are created later, use:

- Draw.io files: `docs/pre-phase-3b-visual-journey/exports/drawio/`
- SVG files: `docs/pre-phase-3b-visual-journey/exports/svg/`
- PDF files: `docs/pre-phase-3b-visual-journey/exports/pdf/`

The SVG and PDF folders are now populated by Mermaid CLI. Draw.io remains manual unless a separate draw.io workflow is approved.

## Update Rule

Regenerate export files after every future change to:

- `docs/pre-phase-3b-visual-journey/08A_VISUAL_DIAGRAMS.md`
- `docs/pre-phase-3b-visual-journey/exports/mermaid/*.mmd`

Future phase closure notes must state whether the diagrams and any export snapshots were updated or explicitly marked not applicable.

## Canonical Source Rule

`08A_VISUAL_DIAGRAMS.md` remains the canonical editable visual source.

The `.mmd`, `.drawio`, `.svg`, and `.pdf` files are snapshots for review/export convenience only.
