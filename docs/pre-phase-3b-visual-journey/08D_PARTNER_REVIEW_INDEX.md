# Pre-Phase 3-B Partner Review Index

## Partner Review Files

| File | Audience | Purpose |
|---|---|---|
| `docs/pre-phase-3b-visual-journey/08C_PARTNER_REVIEW_PACKAGE.md` | Founders / partners | Executive review summary for discussion and decisions. |
| `docs/pre-phase-3b-visual-journey/08A_VISUAL_DIAGRAMS.md` | Founders / product / technical reviewers | Editable Mermaid diagrams showing the visual journey, route status, and quantity-risk map. |
| `docs/pre-phase-3b-visual-journey/08_VISUAL_JOURNEY_STORYBOARD.md` | Product / technical reviewers | Full evidence-based storyboard and confidence map. |

## Internal Technical Evidence Files

| File | Purpose |
|---|---|
| `docs/pre-phase-3b-visual-journey/02_BROWSER_JOURNEY_LOG.md` | Initial browser journey evidence and route reachability log. |
| `docs/pre-phase-3b-visual-journey/03_URL_RESOLUTION.md` | URL/domain resolution evidence for staging/custom-domain access. |
| `docs/pre-phase-3b-visual-journey/04_CUSTOM_DOMAIN_BROWSER_DISCOVERY.md` | Anonymous custom-domain browser discovery evidence. |
| `docs/pre-phase-3b-visual-journey/05_SELLER_PRODUCER_AUTH_DISCOVERY.md` | Seller/producer authenticated read-only journey evidence. |
| `docs/pre-phase-3b-visual-journey/06_BUYER_PROCESSOR_AUTH_DISCOVERY.md` | Buyer/processor/recycler authenticated read-only journey evidence. |
| `docs/pre-phase-3b-visual-journey/07_ADMIN_AUTH_DISCOVERY.md` | Admin authenticated read-only governance/reporting evidence. |
| `docs/pre-phase-3b-visual-journey/08B_VISUAL_DIAGRAMS_MAINTENANCE.md` | Maintenance rules for keeping visual diagrams current. |

## Screenshot Folders

| Folder | Contents |
|---|---|
| `docs/pre-phase-3b-visual-journey/screenshots/` | General browser discovery screenshots. |
| `docs/pre-phase-3b-visual-journey/screenshots/seller-producer/` | Seller/producer journey screenshots. |
| `docs/pre-phase-3b-visual-journey/screenshots/buyer-processor/` | Buyer/processor/recycler journey screenshots. |
| `docs/pre-phase-3b-visual-journey/screenshots/admin/` | Admin read-only discovery screenshots. |

## Recommended Review Order

1. Start with `08C_PARTNER_REVIEW_PACKAGE.md` for the executive summary.
2. Review `08A_VISUAL_DIAGRAMS.md` for the visual journey and route map.
3. Use `08_VISUAL_JOURNEY_STORYBOARD.md` for detailed evidence and confidence levels.
4. Refer to persona evidence files only when a specific screen or observation needs validation.

## Partner Review vs Internal Evidence

Partner-review files:

- `08C_PARTNER_REVIEW_PACKAGE.md`
- `08A_VISUAL_DIAGRAMS.md`
- `08_VISUAL_JOURNEY_STORYBOARD.md`

Internal technical evidence:

- `02_BROWSER_JOURNEY_LOG.md`
- `03_URL_RESOLUTION.md`
- `04_CUSTOM_DOMAIN_BROWSER_DISCOVERY.md`
- `05_SELLER_PRODUCER_AUTH_DISCOVERY.md`
- `06_BUYER_PROCESSOR_AUTH_DISCOVERY.md`
- `07_ADMIN_AUTH_DISCOVERY.md`
- `08B_VISUAL_DIAGRAMS_MAINTENANCE.md`
- Screenshot folders under `docs/pre-phase-3b-visual-journey/screenshots/`

## How To Keep This Updated

Mermaid Markdown diagrams are the canonical source for visual diagrams.

Any future Phase 3-B implementation must either:

- update the diagrams when sustainability journeys, reports, quantities, terminology, or role visibility change, or
- explicitly mark the diagrams as not applicable for that implementation phase.

Future closure notes must state whether the diagrams were updated.

`PROJECT_MAP.md` should be linked to these artifacts in a separate approved documentation-link task. That task should not be combined with implementation or source-code changes.

## Suggested Permanent Link Target

Recommended files to link from `PROJECT_MAP.md` in the later approved task:

- `docs/pre-phase-3b-visual-journey/08_VISUAL_JOURNEY_STORYBOARD.md`
- `docs/pre-phase-3b-visual-journey/08A_VISUAL_DIAGRAMS.md`
- `docs/pre-phase-3b-visual-journey/08C_PARTNER_REVIEW_PACKAGE.md`
- `docs/pre-phase-3b-visual-journey/08D_PARTNER_REVIEW_INDEX.md`

## Exact Next Prompt For Permanent Links

Add permanent documentation links for Pre-Phase 3-B visual journey artifacts to `docs/PROJECT_MAP.md`. Documentation-only; do not modify source code, do not implement fixes, do not change `.ai`, do not start Phase 3-B, and do not update any other main project document unless explicitly needed for the approved link task.
