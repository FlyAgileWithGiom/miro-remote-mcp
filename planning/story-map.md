# planning/story-map.md

## Epic 1: Frame Organization Support (✅ Completed 2025-11-10)

**Goal**: Enable users to create organized Miro boards with hierarchical structure
**Business Value**: Users create complex visualizations in single operation vs multiple manual steps in Miro UI

```
FEAT: Frame Organization
└── FEAT1: User places items directly in frames (3h)
    └── Enables creation of structured boards in single MCP session vs post-creation organization
```

**Total Effort**: 3 hours
**Impact**: Eliminates manual organization step, enables complex board creation through Claude conversations
**Status**: ✅ Completed 2025-11-10

---

## Epic 2: Foundation & Developer Experience (High Priority)

**Goal**: Establish production-ready foundation with reliable error handling and efficient creation workflows
**Business Value**: Users can debug issues effectively and create complex boards with minimal conversation overhead

```
Epic 2: Foundation & DX
├── CAP-RICH-DIAGNOSTICS: Developer identifies failure root cause in one glance ✅ 2025-11-25
│   └── Foundation for production usage - errors include type, status, parameter, resolution
├── CAP-BATCH-CREATION: User creates multiple similar items efficiently (TBD)
│   └── Reduces conversation verbosity 10x for repetitive tasks (10 messages → 1 command)
└── CAP-LAYOUT-ASSISTANCE: User gets suggested layouts for common patterns (TBD)
    └── Eliminates coordinate calculation burden for structured diagrams
```

**Status**: 1/3 completed
**Impact**:
- Error clarity unblocks production debugging ✅
- Batch operations reduce token usage and conversation length
- Layout assistance removes manual positioning tedium

**Priority Rationale**: Foundation before features - reliable errors enable debugging for ALL capabilities

---

## Epic 3: Enhanced Workflows & Productivity (Medium Priority)

**Goal**: Accelerate time-to-value and enable advanced board management workflows
**Business Value**: Users start faster with templates and manage complex boards more effectively

```
Epic 3: Enhanced Workflows
├── CAP-BOARD-TEMPLATES: User starts from common diagram types (TBD)
│   └── Reduces time-to-first-board for common patterns (org charts, kanban, etc.)
├── CAP-ITEM-SEARCH: User finds elements by content or properties (TBD)
│   └── Enables navigation in boards with 50+ items without visual scanning
└── CAP-BOARD-EXPORT: User captures board state (TBD)
    └── Enables backup/versioning workflows and documentation generation
```

**Total Effort**: TBD (requires estimation session)
**Impact**: Faster onboarding (templates) + Better navigation (search) + Data portability (export)

---

## Epic 4: Advanced Media & Collaboration (Low Priority - Deferred)

**Goal**: Enable rich media content and multi-user collaboration features
**Business Value**: Advanced use cases for media-rich boards and team collaboration

```
Epic 4: Advanced Features
├── CAP-IMAGE-UPLOAD: User adds images to boards (TBD)
│   └── Media-rich boards (use case unvalidated)
├── CAP-BOARD-PERMISSIONS: User controls board access (TBD)
│   └── Collaboration features (solo usage primary)
└── CAP-COMMENTS: User adds contextual notes (TBD)
    └── Annotation features (low demand signal)
```

**Total Effort**: TBD (requires estimation session)
**Impact**: Nice-to-have features with uncertain demand - defer until user requests signal priority

**Deferral Rationale**: Focus on core workflows before expanding to unvalidated use cases

---

## Epic 5: Operations & Remote Access (OPS/Infrastructure - Deferred)

**Goal**: Enable Miro MCP access from any Claude client, not just local Desktop
**Business Value**: Users access Miro integration from web, mobile, any MCP-compatible client

```
Epic 5: Operations
└── OPS-SCALEWAY: User accesses Miro MCP from any Claude client (TBD)
    └── Deploy HTTP endpoint to Scaleway Functions for remote access
```

**Total Effort**: TBD (implementation notes reference proven mcp-gdrive pattern)
**Impact**: Universal access vs single-machine limitation

**Deferral Rationale**: Operational enhancement - not blocking core feature development

---
