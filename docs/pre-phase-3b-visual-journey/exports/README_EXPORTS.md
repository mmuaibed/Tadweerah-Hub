# Pre-Phase 3-B Diagram Exports

This folder prepares the Pre-Phase 3-B visual diagrams for automated SVG/PDF export and optional manual draw.io review.

Canonical source:

- `docs/pre-phase-3b-visual-journey/08A_VISUAL_DIAGRAMS.md`

Extracted Mermaid source files:

- `mermaid/01_persona_journey_map.mmd`
- `mermaid/02_active_route_map.mmd`
- `mermaid/03_sustainability_allocation_flow.mmd`
- `mermaid/04_reports_flow.mmd`
- `mermaid/05_40_35_5_evidence_map.mmd`
- `mermaid/06_terminology_flow_diagram.mmd`

## Open In diagrams.net / draw.io

1. Open diagrams.net / draw.io.
2. Create a new blank diagram.
3. Choose `Insert` > `Advanced` > `Mermaid`.
4. Open one `.mmd` file from `exports/mermaid/`.
5. Copy the Mermaid source into the Mermaid import box.
6. Insert the diagram.
7. Review layout and adjust canvas/page settings if needed.

## Save As `.drawio`

1. After importing the Mermaid diagram, choose `File` > `Save As`.
2. Save the diagram as a `.drawio` file.
3. Recommended location:
   - `docs/pre-phase-3b-visual-journey/exports/drawio/`
4. Keep one `.drawio` file per Mermaid source diagram.

## Export To PDF From draw.io

1. Open the `.drawio` diagram.
2. Choose `File` > `Export as` > `PDF`.
3. Enable crop/page options as appropriate for review.
4. Save the PDF into:
   - `docs/pre-phase-3b-visual-journey/exports/pdf/`

## Automated Mermaid Export

Mermaid CLI is installed as a root dev dependency:

- `@mermaid-js/mermaid-cli`
- `puppeteer` only as the dev dependency required by Mermaid CLI export support

Regenerate all SVG and PDF exports from the repository root with:

```powershell
$svgDir = 'docs\pre-phase-3b-visual-journey\exports\svg'; $pdfDir = 'docs\pre-phase-3b-visual-journey\exports\pdf'; New-Item -ItemType Directory -Force $svgDir, $pdfDir | Out-Null; foreach ($file in Get-ChildItem 'docs\pre-phase-3b-visual-journey\exports\mermaid\*.mmd' | Sort-Object Name) { $base = $file.BaseName; pnpm.cmd exec mmdc -i $file.FullName -o (Join-Path $svgDir ($base + '.svg')) -b transparent; if ($LASTEXITCODE -ne 0) { throw "SVG export failed for $($file.Name)" }; pnpm.cmd exec mmdc -i $file.FullName -o (Join-Path $pdfDir ($base + '.pdf')) -b white; if ($LASTEXITCODE -ne 0) { throw "PDF export failed for $($file.Name)" } }
```

Outputs:

- SVG: `docs/pre-phase-3b-visual-journey/exports/svg/`
- PDF: `docs/pre-phase-3b-visual-journey/exports/pdf/`

## Export Status

Automated SVG/PDF generation is available through Mermaid CLI.

Common draw.io command names were not found locally during read-only detection, so draw.io files remain manual snapshots unless a separate draw.io workflow is approved.

## Source-Of-Truth Warning

Mermaid Markdown remains the canonical editable visual source.

The canonical file is:

- `docs/pre-phase-3b-visual-journey/08A_VISUAL_DIAGRAMS.md`

The `.mmd`, `.drawio`, `.svg`, and `.pdf` files are export artifacts or snapshots. They must be regenerated after future updates to `08A_VISUAL_DIAGRAMS.md` or any file under `exports/mermaid/`.

If an exported diagram differs from the canonical Markdown source, use the Mermaid Markdown source as the authority.
