# Miro MCP - Project Learnings

## Miro API Limitations

### Fonts (Sticky Notes)
- **No direct font control** on sticky notes via REST API
- Only 2 styles supported via API (not precisely documented)
- Font size = function of sticky dimensions (width/height)
- Basic HTML supported in content: `<strong>`, `<em>`, `<p>`
- **Text color not modifiable** on stickies/cards

### Z-Index / Layers
- **REST API: No z-index control possible!**
- Web SDK only: `bringToFront()`, `sendToBack()`, `bringInFrontOf(target)`
- Frames always at bottom (parent container)
- Items added to a frame inherit its layer index
- Creation order = default stacking order

**Puppeteer Bridge Exploration (2025-12-05)**:
- **Spike conclusion**: NOT feasible for production
- **Critical blocker**: OAuth token incompatibility (API tokens ≠ browser session)
- **Performance**: Browser cold start ~3s (unacceptable for MCP operations)
- **Alternative**: Document limitation, focus on other MCP features
- See: `spikes/sdk-bridge/README.md` for full analysis

**Sources:**
- [Sticky Note Font Size](https://community.miro.com/developer-platform-forum-57/sticky-note-font-size-3958)
- [Z-Index API Discussion](https://community.miro.com/developer-platform-forum-57/z-index-api-3456)

## Project Learnings

### 2025-12-06 - Token Refresh Never Triggering

**Methodological: Validate Infrastructure Before Blaming Code, Then Vice Versa**
Initial hypothesis was "Docker volume doesn't persist tokens". Deployment logs proved tokens.json survived deployments. When infrastructure is validated, pivot to code analysis. The bug was in the refresh logic, not in persistence. Always let evidence guide investigation direction.

**Technical: Multi-Layer Token Caching Desynchronization**
Two independent expiration trackers existed:
- `MiroClient.tokenExpiresAt`: Forces refresh after 1h (correct)
- `OAuth2Manager.tokens.expires_at`: Decides if Miro refresh is needed

Bug: When `expires_in` was missing from Miro response, code used 1-year fallback. MiroClient would call `getValidAccessToken()` after 1h, but OAuth2Manager thought token valid for 1 year → no actual Miro refresh → 401 errors.

**Technical: Miro OAuth Token Lifecycle**
- Access tokens: 1 hour expiration
- Refresh tokens: 60 days expiration
- Only ONE active token per user - authenticating elsewhere invalidates previous tokens
- Source: [Miro OAuth Docs](https://developers.miro.com/docs/getting-started-with-oauth)

### 2025-12-05 - Puppeteer SDK Bridge Spike (NO-GO)

**Methodological: Auth-First Spike Testing**
When exploring unfamiliar technology integration, test authentication FIRST. Auth architecture mismatches are often deal-breakers that invalidate entire technical approaches. 90 minutes to discover fundamental blocker is far better than 40 hours building a doomed solution.

**Technical: OAuth Token Context Separation**
Miro's REST API OAuth tokens are completely separate from browser session auth. No token exchange mechanism exists. This is a common pattern across many services - API tokens ≠ web session tokens. Cannot bridge REST API authentication to browser automation without requiring users to login interactively in headless browser.

**Technical: Puppeteer Performance Baseline**
Browser cold start: ~3 seconds on modern Mac. Even with browser reuse, navigation + SDK access adds 2-5 seconds. Total operation time: 5-8 seconds - unacceptable for MCP operations which should complete in <500ms for good UX.

**Decision: Document Limitation**
Z-index control via MCP is not feasible. Clean separation - MCP for automation (creation, updates, batch operations), manual UI for visual refinement (z-index). User impact is minimal as z-index is visual polish, not core functionality.

### 2025-11-26 - Docker Registry-Based Deployment Implementation

**Methodological: "Is it on?" - State Before Solutions**
When debugging connectivity/access issues, validate basic state (power, process running, service enabled) before diving into configuration debugging. Example: Dev server SSH timeout was diagnosed with nmap, security groups, UFW analysis when the actual issue was the server being powered off. Always check: Does it exist? → Is it running? → How is it configured?

**Technical: Scaleway instance_keys Pattern for Persistent SSH Access**
Scaleway instances regenerate `/root/.ssh/authorized_keys` from `/root/.ssh/instance_keys` on boot. Direct edits to authorized_keys are ephemeral. For deployment keys that must survive reboots:
```bash
echo 'ssh-ed25519 AAAA... github-actions' >> /root/.ssh/instance_keys
scw-fetch-ssh-keys --upgrade
```
This prevented GitHub Actions deployment failures after server reboots.

**Methodological: Worktree Isolation for Infrastructure Changes**
Using `git worktree` for deployment architecture changes (CI/CD workflows, Docker configs) provides safe isolation for testing complete deployment flows without risking main branch stability. More valuable for infrastructure than feature development since deployment testing requires pushing to test CI integration.

### Proposed Decision Anchors

**1. CI/CD Architecture: Docker Registry vs Build-on-Server**
- **Decision**: Use Scaleway Container Registry (rg.fr-par.scw.cloud) with images built in CI
- **Rationale**: Faster deployments (pull vs build), consistent artifacts, easier rollbacks, same registry as other Fly Agile services
- **Trade-offs**: Requires registry authentication, slightly more complex workflow
- **Context**: Migrated from tarball-upload + server-side build pattern, then from GitHub Container Registry to Scaleway for consistency

**2. Deployment Trigger Strategy: Tags vs Branch-based**
- **Decision**: Main branch = production tag, dev branch = dev tag, feat/* branches = branch-name tag
- **Added**: dev-* tags trigger dev deployment regardless of branch
- **Rationale**: Flexible testing without polluting main branch
- **Context**: Supports hotfixes and feature testing before merge
