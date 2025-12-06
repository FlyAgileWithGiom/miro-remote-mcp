# Backlog - Miro MCP

## Planned

### High: Feature Capabilities
- [ ] CAP-BOARD-SYNC: Agent AI retrieves complete board state in single request
- [ ] CAP-BATCH-UPDATE: Agent AI updates multiple board items atomically

### Medium: Quality & Performance
- [ ] TECH7: System maintains stable memory footprint under sustained high usage
- [ ] TECH-PAGINATION: System prevents unbounded searches on large boards
- [ ] TECH3: Developer extends auth logic with full TypeScript type safety

### Medium: Feature Capabilities
- [ ] CAP-CHANGE-DETECTION: Agent AI detects board changes since last sync
- [ ] CAP-SPATIAL-SEARCH: Agent AI finds items within geographic zone
- [ ] CAP-STRUCTURED-INVENTORY: Agent AI understands board element hierarchy automatically
- [ ] CAP-BOARD-TEMPLATES: User creates boards from common diagram templates
- [ ] CAP-ITEM-SEARCH: User finds board elements by content or properties
- [ ] CAP-BOARD-EXPORT: User captures complete board state for archival

### Low: Future Enhancements
- [ ] EPIC-SDK-BRIDGE: Agent AI accesses Web SDK features via bridge layer
- [ ] CAP-IMAGE-UPLOAD: User adds images to boards programmatically
- [ ] CAP-BOARD-PERMISSIONS: User controls granular board access rights
- [ ] CAP-COMMENTS: User adds contextual comments to board items

## In Progress
- [⏳] TECH-OUTPUT-FORMAT: Agent AI retrieves board items within context token limits (~70% reduction)

## Bug fixes (2025-12-06)
- [x] BUG-GEOMETRY-UPDATE: Agent AI modifies item dimensions (width/height) successfully ✅ 2025-12-06
- [x] BUG-PAGINATION-LIMIT: Agent AI lists board items without HTTP 400 errors ✅ 2025-12-06

## Completed

### Phase 1: Critical Safety Nets (2025-12-03)
- [x] TECH-E2E-PROTOCOL: Developer validates MCP protocol compliance end-to-end ✅ 2025-12-03
- [x] TECH-INTEGRATION-MIRO: Developer validates live Miro API integration works ✅ 2025-12-03
- [x] TECH-OAUTH-RACE: System refreshes OAuth tokens safely under concurrent requests ✅ 2025-12-03
- [x] TECH-DEPS-PINNED: Team deploys with reproducible builds using pinned dependencies ✅ 2025-12-03

### Phase 2: Quick Wins (2025-12-03)
- [x] TECH1: Developer generates tree diagrams at scale without timeout (30s → 2s) ✅ 2025-12-03
- [x] TECH4: Developer works with clean production builds (no duplicate outputs) ✅ 2025-12-03
- [x] TECH5: Developer navigates source code without debug/test pollution ✅ 2025-12-03

### Phase 3: Quality & Performance (2025-12-03)
- [x] TECH6: Agent AI responds instantly for repeated board searches (5000ms → 0ms) ✅ 2025-12-03
- [x] TECH2: Developer modifies batch schemas in single location (DRY) ✅ 2025-12-03
- [x] TECH-RATE-LIMITS: System queues gracefully when hitting rate limits ✅ 2025-12-03

### Phase 4: REST Optimizations (2025-12-05)
- [x] TECH-HTTP2: API responds 50-70% faster via connection reuse (keepAlive) ✅ 2025-12-05
- [x] TECH-PAGINATION: API fetches board items 20-30% faster (100 vs 50 per page) ✅ 2025-12-05
- [x] TECH-CACHE-TTL: Agent AI gets instant responses for 5 minutes on repeated reads ✅ 2025-12-05

### Previous Deliveries
- [x] TOOL1: Agent AI creates hierarchical tree diagrams on Miro ✅ 2025-11-26
- [x] TOOL2: Agent AI creates org charts with photos ✅ 2025-11-26
- [x] TOOL3: Agent AI creates mind maps ✅ 2025-11-26
- [x] TOOL4: Agent AI updates board items ✅ 2025-11-27
- [x] TOOL5: Agent AI reads board contents ✅ 2025-11-27
- [x] TOOL6: Agent AI deletes board items ✅ 2025-11-27
- [x] TOOL7: Agent AI creates basic shapes ✅ 2025-11-27
- [x] OPS-CI-CD: Team deploys automatically via GitHub Actions ✅ 2025-11-26
- [x] OPS-DOCKER-REGISTRY: Team deploys consistent images from Scaleway registry ✅ 2025-11-26
- [x] OPS-TOKEN-PERSIST: Server maintains authentication across restarts ✅ 2025-11-27
- [x] CODE-QUALITY-REVIEW: Team works with refactored, maintainable codebase ✅ 2025-12-02
