# planning/backlog.md

## Completed

### Core Capabilities (2025-11-10 - Initial Implementation)

- [x] CAP-BOARD-OPS: User manages Miro boards through Claude ✅ 2025-11-10
- [x] CAP-ITEM-READ: User discovers board content programmatically ✅ 2025-11-10
- [x] CAP-ITEM-MODIFY: User updates existing board elements ✅ 2025-11-10
- [x] CAP-STICKY-CREATION: User creates sticky notes with full styling control ✅ 2025-11-10
- [x] CAP-SHAPE-CREATION: User creates geometric shapes and flowchart symbols ✅ 2025-11-10
- [x] CAP-TEXT-CREATION: User adds text labels and annotations ✅ 2025-11-10
- [x] CAP-FRAME-CREATION: User creates organizational frames ✅ 2025-11-10
- [x] CAP-CONNECTOR-CREATION: User shows relationships between elements ✅ 2025-11-10
- [x] CAP-CONNECTOR-STYLING: User updates connector appearance ✅ 2025-11-10

### Infrastructure Capabilities

- [x] CAP-OAUTH-FLOW: User authenticates with Miro once ✅ 2025-11-10
- [x] CAP-TOKEN-REFRESH: User's session never expires during work ✅ 2025-11-10
- [x] CAP-ERROR-HANDLING: User gets actionable error messages ✅ 2025-11-10
- [x] CAP-CLAUDE-DESKTOP: User accesses Miro directly from Claude Desktop ✅ 2025-11-10
- [x] CAP-REAUTH-FLOW: User receives reauthentication URL when Miro tokens expire ✅ 2025-11-27
- [x] CAP-AUTH-STATUS: User checks authentication status and gets authorization URL ✅ 2025-11-27

### Configuration & Security

- [x] CAP-CONFIG-MANAGEMENT: User manages credentials centrally ✅ 2025-11-10
- [x] CAP-SECURITY: User's credentials never leak ✅ 2025-11-10

### Testing & Quality

- [x] CAP-API-TESTING: Developer validates Miro integration ✅ 2025-11-10
- [x] CAP-MCP-TESTING: Developer validates MCP protocol compliance ✅ 2025-11-10

### Documentation & Examples

- [x] CAP-DOCUMENTATION: User understands setup and usage ✅ 2025-11-10
- [x] CAP-DEMO-EXAMPLE: User sees real-world usage pattern ✅ 2025-11-10

### In Progress (Completed 2025-11-24)

- [x] CAP-HTTP-HANDLER: Developer creates gateway-compatible HTTP handler ✅ 2025-11-24

### Recently Completed (2025-11-10)

- [x] FEAT1: User places items directly in frames ✅ 2025-11-10

### Performance Optimizations (Quick Wins) - 2025-11-10

- [x] CAP-INSTANT-RESPONSE: User experiences faster board operations ✅ 2025-11-10
- [x] CAP-BURST-PERFORMANCE: User creates multiple items rapidly ✅ 2025-11-10
- [x] TECH-CLARITY: Developer modifies configuration easily ✅ 2025-11-10
- [x] TECH-MAINTAINABILITY: Developer modifies style logic in one place ✅ 2025-11-10

### Technical Capabilities (Developer Experience)

- [x] TECH-TESTABILITY: Developer tests components in isolation ✅ 2025-11-24

## In Progress

(No items currently in progress)

## Recently Completed (2025-12-02)

- [x] CAP-BATCH-CREATION: User creates multiple similar items efficiently ✅ 2025-12-02
- [x] CAP-LAYOUT-ASSISTANCE: User gets suggested layouts for common patterns ✅ 2025-12-02

## Recently Completed (2025-11-27)

- [x] CAP-AUTH-STATUS: User checks authentication status and gets authorization URL ✅ 2025-11-27

## Recently Completed (2025-11-24)

- [x] OPS1: Operator sees accurate authentication status in health check ✅ 2025-11-24
- [x] TECH4: Gateway client accesses MCP at clean root URL ✅ 2025-11-24

## Planned

### Priority Rationale

**High Priority**: Foundation + Highest ROI (effort vs user value)
- CAP-RICH-DIAGNOSTICS: Foundation capability - error clarity blocks debugging and enables production usage for ALL future capabilities ✅
- CAP-BATCH-CREATION: Reduces conversation verbosity 10x for repetitive tasks (10 messages → 1 command) ✅
- CAP-LAYOUT-ASSISTANCE: Eliminates coordinate calculation burden for structured diagrams ✅
- **CAP-BOARD-SYNC**: Foundation for collaborative workflow - reduces 10-20 API calls to 1, enables change detection
- **CAP-BATCH-UPDATE**: 10x latency reduction for repositioning tasks (proven need from org chart work)

**Medium Priority**: Important UX improvements, moderate effort
- CAP-BOARD-TEMPLATES: Reduces time-to-first-board for common patterns (org charts, kanban, etc.)
- CAP-ITEM-SEARCH: Enables navigation in boards with 50+ items without visual scanning
- CAP-BOARD-EXPORT: Enables backup/versioning workflows and documentation generation
- **CAP-CHANGE-DETECTION**: Prevents human-AI conflicts, enables "human structures, AI fills" pattern
- **CAP-SPATIAL-SEARCH**: Location-based queries without parsing all items (complements BOARD-SYNC)
- **CAP-STRUCTURED-INVENTORY**: Automatic board comprehension for complex hierarchies

**Low Priority**: Nice-to-have features, uncertain demand
- CAP-IMAGE-UPLOAD: Media-rich boards (use case unvalidated)
- CAP-BOARD-PERMISSIONS: Collaboration features (solo usage primary)
- CAP-COMMENTS: Annotation features (low demand signal)

### High Priority

- [x] CAP-RICH-DIAGNOSTICS: Developer identifies failure root cause in one glance ✅ 2025-11-25
- [x] CAP-BATCH-CREATION: User creates multiple similar items efficiently ✅ 2025-12-02
- [x] CAP-LAYOUT-ASSISTANCE: User gets suggested layouts for common patterns ✅ 2025-12-02
- [x] CAP-BOARD-SYNC: Agent AI retrieves complete board snapshot in single request ✅ 2025-12-03
- [x] CAP-BATCH-UPDATE: Agent AI updates multiple items atomically ✅ 2025-12-03
- [ ] **EPIC-SDK-BRIDGE**: Agent AI accesses Web SDK features (z-index, selection, grouping) via bridge app

### Medium Priority

- [ ] CAP-BOARD-TEMPLATES: User starts from common diagram types
- [ ] CAP-ITEM-SEARCH: User finds elements by content or properties
- [ ] CAP-BOARD-EXPORT: User captures board state
- [ ] CAP-CHANGE-DETECTION: Agent AI detects board changes since last read
- [ ] CAP-SPATIAL-SEARCH: Agent AI finds items in geographic zone
- [ ] CAP-STRUCTURED-INVENTORY: Agent AI understands board hierarchy automatically

### Low Priority

- [ ] CAP-IMAGE-UPLOAD: User adds images to boards
- [ ] CAP-BOARD-PERMISSIONS: User controls board access
- [ ] CAP-COMMENTS: User adds contextual notes

---

## Collaborative Workflow Capabilities (Added 2025-12-03)

These capabilities emerged from real-world usage of the MCP server on a complex organizational board (115 people, 5 domains, 16 teams). They address human-AI collaboration patterns and reduce API call overhead for complex boards.

### CAP-BOARD-SYNC: Agent AI retrieves complete board snapshot in single request

**Outcome**: Agent reduces board discovery from 10-20 paginated API calls to 1 comprehensive snapshot

**User Story**:
> As an agent AI working on a Miro board,
> I want to retrieve a complete snapshot of the board in a single request,
> So that I have a full view without making 10+ paginated calls.

**Acceptance Criteria**:
- New function `sync_board(board_id)` returns ALL items on board
- Includes all types: shapes, sticky_notes, text, frames, connectors
- Format structured by type for easier processing
- Handles pagination internally (invisible to caller)
- Returns board metadata (dimensions, last modified timestamp)

**Value**: Foundation for collaborative workflow - enables quick detection of human changes, reduces latency 10-20x

**Complexity**: M (Medium)

**Technical Notes**:
- Uses existing Miro REST API pagination
- Orchestrates multiple `list_items` calls internally
- Returns structured format: `{metadata: {...}, items: {shapes: [...], sticky_notes: [...], ...}}`

---

### CAP-BATCH-UPDATE: Agent AI updates multiple items atomically

**Outcome**: Agent repositions 10 items in 1 request instead of 10 sequential calls

**User Story**:
> As an agent AI positioning multiple dozens of items,
> I want to update multiple items in a single request,
> So that I reduce latency and have atomic operations.

**Acceptance Criteria**:
- Function `batch_update_items(board_id, updates)` accepts array of updates
- Format: `[{id: "...", position: {...}, style: {...}}, ...]`
- Executes all updates in parallel server-side
- Returns results with success/error status for each item
- Reasonable limit (e.g., 50 items per batch)

**Value**: Reduces latency dramatically for repositioning tasks, enables "all or nothing" reliability

**Complexity**: M (Medium)

**Technical Notes**:
- Parallel execution using Rust async/await
- Individual item failures don't block entire batch
- Returns detailed status per item for error handling

---

### CAP-CHANGE-DETECTION: Agent AI detects board changes since last read

**Outcome**: Agent identifies human edits instantly without re-reading entire board

**User Story**:
> As an agent AI working in parallel with a human,
> I want to detect quickly what changed on the board since my last read,
> So that I adapt my plan without overwriting human modifications.

**Acceptance Criteria**:
- Function `get_board_changes(board_id, since_timestamp)` returns deltas
- Identifies items created, modified, deleted
- For modifications, indicates which fields changed (position, content, style)
- Uses Miro native timestamps (`modifiedAt`)
- Clear diff format: `{created: [...], updated: [...], deleted: [...]}`

**Value**: Prevents conflicts between human and AI actions, enables "human structures, AI fills" workflow

**Complexity**: L (Large)

**Technical Notes**:
- Requires caching previous board state or leveraging Miro modification timestamps
- May need local state management (cache last sync timestamp)
- Consider WebSocket integration for real-time change notifications (future enhancement)

---

### CAP-SPATIAL-SEARCH: Agent AI finds items in geographic zone

**Outcome**: Agent finds "the rectangle at x=1500, y=200" without parsing all items

**User Story**:
> As an agent AI searching for a containing rectangle,
> I want to find all items in a geographic area,
> So that I quickly identify structures without parsing all items.

**Acceptance Criteria**:
- Function `find_items_in_area(board_id, x, y, width, height, type?)`
- Returns items whose center is in specified zone
- Optional filter by item type
- Results sorted by z-index (visual layer) or creation timestamp
- Handles Miro "center" coordinate system correctly

**Value**: Instant location-based searches, identifies already-positioned items, useful for post-modification verification

**Complexity**: M (Medium)

**Technical Notes**:
- Requires full board sync first (builds on CAP-BOARD-SYNC)
- Spatial indexing on server-side for performance
- Coordinate system: center-based (Miro native)
- Bounding box calculation: `top = y - height/2`, `bottom = y + height/2`, etc.

---

### CAP-STRUCTURED-INVENTORY: Agent AI understands board hierarchy automatically

**Outcome**: Agent comprehends "5 domains, 16 teams, 115 people" structure immediately

**User Story**:
> As an agent AI analyzing an organizational board,
> I want a pre-structured inventory by zones/semantic types,
> So that I understand the structure without manual parsing.

**Acceptance Criteria**:
- Function `get_structured_inventory(board_id)` analyzes board
- Automatically detects parent frames
- Groups items by parent frame
- Identifies containing rectangles (thick border, transparent fill)
- Separates "structure" items vs "content" items
- Hierarchical format: `{frames: {frame_id: {metadata: {...}, children: [...]}}}`

**Value**: Instant comprehension of complex boards, reduces cognitive analysis load, foundation for intelligent positioning calculations

**Complexity**: L (Large)

**Technical Notes**:
- Heuristics for detecting "structure" elements (frames, thick-bordered rectangles)
- Builds parent-child relationships from `parent_id` and spatial containment
- Returns semantic categorization (domains, teams, people for org charts)
- Extensible pattern matching for different board types

---

---

## EPIC-SDK-BRIDGE: Web SDK Bridge App (Added 2025-12-03)

**Outcome**: Agent AI controls z-index, selection, and grouping via Miro Web SDK bridge

### Overview

REST API cannot control z-index, selection, or grouping. These features require the Web SDK which only runs in-browser. This epic creates a Miro App that bridges our MCP server to Web SDK capabilities via WebSocket.

**Architecture**: MCP Server ↔ WebSocket ↔ Miro App (iframe) ↔ Web SDK

**Constraint**: Board must be open in browser with app active (mitigated by Playwright/Chromium MCP automation)

### Capabilities

| ID | Capability | Tool |
|----|------------|------|
| CAP-ZINDEX-FRONT | Agent brings item to front | `sdk_bring_to_front(board_id, item_id)` |
| CAP-ZINDEX-BACK | Agent sends item to back | `sdk_send_to_back(board_id, item_id)` |
| CAP-SELECTION-READ | Agent sees user's selection | `sdk_get_selection(board_id)` |
| CAP-SELECTION-WRITE | Agent selects items | `sdk_select(board_id, item_ids[])` |
| CAP-GROUPING | Agent groups items | `sdk_group(board_id, item_ids[])` |
| CAP-UNGROUPING | Agent ungroups items | `sdk_ungroup(board_id, group_id)` |

**Value**: Bidirectional interaction - Claude sees what user selected and can manipulate layer order

### Components

| Component | Effort | Files |
|-----------|--------|-------|
| Miro App (Web SDK) | 2-3 days | `miro-bridge-app/` (new project) |
| WebSocket Hub | 1-2 days | `src/websocket-hub.ts` (new) |
| MCP Tools | 1 day | `src/tools.ts` (extend) |
| Infrastructure | 0.5 day | Docker, Miro Developer Portal |
| Tests & Debug | 1-2 days | Integration tests |
| **TOTAL** | **5-8 days** | |

### References

- [Feasibility Study](/Users/guillaume/.claude/plans/cached-painting-codd.md)
- [miro-breakout-chat-app](https://github.com/miroapp/miro-breakout-chat-app) - Socket.IO pattern
- [Miro Web SDK Reference](https://developers.miro.com/docs/web-sdk-reference-guide)

---

### Technical Capabilities (From Review 2025-12-02)

- [ ] TECH1: User creates tree diagrams at scale without waiting (vs 30s for 100 nodes)
- [ ] TECH2: Developer modifies batch creation logic in single location (vs 3 duplicate handlers)
- [ ] TECH3: Developer extends auth logic with full type safety (vs type assertion hack)
- [ ] TECH4: Developer works with clean production build (vs test files in dist/)
- [ ] TECH5: Developer navigates layout code without dead paths (vs unused custom layout)
- [ ] TECH6: System responds instantly for repeated item queries (vs re-fetching every time)
- [ ] TECH7: System maintains stable memory under high board usage (vs unbounded cache growth)
- [ ] TECH8: Developer deploys with confidence OAuth and MCP protocol work correctly

### API Limitations (Not Fixable)

**Fonts**:
- ✅ Shapes/Text: Font family and size controllable via API
- ❌ Sticky notes: No font control - size auto-scales with sticky dimensions
- ❌ Sticky notes: Text color not modifiable
- ✅ HTML formatting: `<strong>`, `<em>`, `<p>` work in content

**Z-Index / Layers**:
- ❌ REST API has NO z-index control
- ❌ Only Web SDK has `bringToFront()`, `sendToBack()`, `bringInFrontOf()`
- ⚠️ Creation order = stacking order by default
- ⚠️ Frames always at bottom (parent container behavior)
- ⚠️ Items added to frame inherit frame's layer index

**Workarounds**:
- For z-order: Create items in desired back-to-front order
- For fonts: Use sticky size to control text size
- For emphasis: Use HTML tags in content

### Deprecated (Removed from Scope)

- [x] ~~OPS-SCALEWAY: Deploy to Scaleway Functions~~ → Deprecated: HTTP gateway approach preferred
- [x] ~~CAP-STDIO-TRANSPORT: Local stdio transport~~ → Deprecated: HTTP-only deployment

## Backlog Health

**Total Capabilities Delivered**: 30 capabilities
  - 16 MVP capabilities (Initial implementation)
  - 1 Feature (FEAT1 - parent_id)
  - 2 Performance (CAP-INSTANT-RESPONSE, CAP-BURST-PERFORMANCE)
  - 2 Technical (TECH-CLARITY, TECH-MAINTAINABILITY)
  - 1 Infrastructure (CAP-HTTP-HANDLER - gateway-ready)
  - 1 Technical (TECH-TESTABILITY - unit test suite)
  - 1 Developer Experience (CAP-RICH-DIAGNOSTICS - error classification)
  - 2 Infrastructure Capabilities (CAP-REAUTH-FLOW, CAP-AUTH-STATUS - 2025-11-27)
  - 2 Batch/Layout Capabilities (CAP-BATCH-CREATION, CAP-LAYOUT-ASSISTANCE - 2025-12-02)

**Recently Completed** (2025-12-02):
  - CAP-BATCH-CREATION: Batch creation of sticky notes, shapes, and text items
  - CAP-LAYOUT-ASSISTANCE: 5 layout algorithms (grid, row, column, tree, radial)
  - Full code quality review (code-quality, architecture, performance, integration)

**Planned Work**: 20 items remaining (updated 2025-12-03)
  - 1 Epic: EPIC-SDK-BRIDGE (Web SDK bridge for z-index, selection, grouping - 5-8 days)
  - 2 High Priority features (CAP-BOARD-SYNC, CAP-BATCH-UPDATE)
  - 6 Medium Priority features (CAP-BOARD-TEMPLATES, CAP-ITEM-SEARCH, CAP-BOARD-EXPORT, CAP-CHANGE-DETECTION, CAP-SPATIAL-SEARCH, CAP-STRUCTURED-INVENTORY)
  - 3 Low Priority features (CAP-IMAGE-UPLOAD, CAP-BOARD-PERMISSIONS, CAP-COMMENTS)
  - 8 Technical Capabilities (TECH1-8 from review 2025-12-02)

**Collaborative Workflow Capabilities** (added 2025-12-03):
  - Based on real-world usage with complex organizational boards
  - 5 new capabilities for human-AI collaboration
  - Priority: 2 High (SYNC, BATCH-UPDATE), 3 Medium (CHANGE-DETECTION, SPATIAL-SEARCH, STRUCTURED-INVENTORY)
  - Total complexity: 2M + 2L (foundation + sophisticated features)

**Technical Investment Ratio**: 42% (8 of 19 remaining items)
  - **Status**: 🟡 Yellow Zone (40-60%) - Tech debt present but balanced
  - TECH1 (tree scale) is **blocking** for production tree layouts
  - Quick wins: TECH4, TECH5 (cleanup, 1h total)
  - **Recommendation**: Alternate new features (CAP-BOARD-SYNC first) with tech debt (TECH1-3)

**Architecture Decisions** (2025-12-02):
  - ~~Scaleway Functions~~ → HTTP gateway deployment only
  - ~~stdio transport~~ → HTTP-only (gateway pattern)
  - Single-account per MCP instance (multi-tenant via gateway)

**API Limitations Documented**:
  - Fonts: Controllable for shapes/text, NOT for sticky notes
  - Z-Index: No control via REST API (Web SDK only)
  - Workarounds documented in backlog

**Font Support** (added 2025-12-03):
  - ✅ `create_text` now supports: fontSize, fontFamily, textColor, textAlign
  - ✅ `create_shape` now supports: fontSize, fontFamily, textColor
  - ❌ Sticky notes: No font control (API limitation)

**Velocity**: 30 capabilities delivered across 4 development sessions (2025-11-10, 2025-11-24, 2025-11-27, 2025-12-02)

## Version History

- **v0.1.0** (2025-11-10 AM): Initial MVP with 14 MCP tools, OAuth2, and Claude Desktop integration
- **v0.1.1** (2025-11-10 PM): Frame-based organization (FEAT1) + Performance optimizations (Quick Wins)
- **v0.1.2** (2025-11-24): HTTP handler + Unit test suite (Gateway-ready + TECH-TESTABILITY)
- **v0.1.3** (2025-11-25): Rich error diagnostics (CAP-RICH-DIAGNOSTICS)
- **v0.1.4** (2025-11-27): Reauthentication flow (CAP-REAUTH-FLOW + CAP-AUTH-STATUS)
- **v1.3.0** (2025-12-02): Batch creation + Layout assistance (3 batch tools, 5 layout algorithms)
- **Current** (HEAD): 30 capabilities, deployed to production, tech debt identified
