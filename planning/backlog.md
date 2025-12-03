# Backlog - Miro MCP

## Planned

### Critical: Production Safety Nets
- [ ] TECH-E2E-PROTOCOL: Developer validates MCP protocol compliance end-to-end
- [ ] TECH-INTEGRATION-MIRO: Developer validates live Miro API integration works
- [ ] TECH-OAUTH-RACE: System refreshes OAuth tokens safely under concurrent requests
- [ ] TECH-DEPS-PINNED: Team deploys with reproducible builds using pinned dependencies

### High: Quick Wins & Blocking Workflows
- [ ] TECH1: Developer generates tree diagrams at scale without timeout (30s → 2s)
- [ ] CAP-BOARD-SYNC: Agent AI retrieves complete board state in single request
- [ ] CAP-BATCH-UPDATE: Agent AI updates multiple board items atomically
- [ ] TECH4: Developer works with clean production builds (no duplicate outputs)
- [ ] TECH5: Developer navigates layout code without dead conditional branches

### Medium: Quality & Performance
- [ ] TECH6: Agent AI responds instantly for repeated board searches (caching)
- [ ] TECH7: System maintains stable memory footprint under sustained high usage
- [ ] TECH-RATE-LIMITS: System queues gracefully when hitting Miro API rate limits
- [ ] TECH-PAGINATION: System prevents unbounded searches on large boards
- [ ] TECH2: Developer modifies batch item creation logic in single location
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
(currently empty)

## Completed
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
