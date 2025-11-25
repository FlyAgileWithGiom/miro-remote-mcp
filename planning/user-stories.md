# planning/user-stories.md

### OPS-SCALEWAY: User accesses Miro MCP from any Claude client (not just local Desktop)

**User**: Claude user on web, mobile, or any MCP-compatible client needing Miro integration
**Outcome**: Miro board operations available through HTTP endpoint from any device/platform
**Context**: Currently Miro MCP only works with Claude Desktop via StdIO transport, limiting access to single local machine with proper config

**Acceptance Criteria**:
- Scaleway Functions handler wraps existing Miro tools as HTTP endpoints
- All 14 MCP tools accessible via HTTP (list_boards, create_sticky_note, etc.)
- OAuth credentials passed via environment variables (not local filesystem)
- Private function with X-Auth-Token authentication
- Deployment script automates packaging and upload to Scaleway
- Health endpoint confirms function is operational
- Request/response format compatible with MCP-over-HTTP clients
- Documentation includes deployment guide and client configuration

**Implementation Notes**:
- Pattern based on successful mcp-gdrive Scaleway deployment
- Handler file: src/functions-handler.ts (similar to mcp-gdrive pattern)
- Deployment script: deploy-scaleway-functions.sh
- OAuth tokens from base64-encoded environment variable
- Scale to zero when not used (cost-effective)
- 30s timeout sufficient for Miro API operations

**Source**: USER_REQUEST - enable remote access to Miro MCP

---

### FEAT1: User places items directly in frames (vs manual move after creation)

**User**: Claude Desktop user creating Miro visualizations through MCP tools
**Outcome**: Items (sticky notes, shapes, text) appear in target frame immediately upon creation
**Context**: Currently all items are created at board root, requiring manual repositioning in Miro UI to organize within frames

**Acceptance Criteria**:
- create_sticky_note accepts optional parent_id parameter
- create_shape accepts optional parent_id parameter
- create_text accepts optional parent_id parameter
- Items created with parent_id appear inside specified frame
- Items without parent_id maintain current behavior (board root)
- update_item can move items between frames by changing parent
- Coordinates are relative to frame when parent_id specified

**Implementation Notes**:
- Add optional parent_id to tool schemas
- Include parent: { id: parentId } in API payload when provided
- Document coordinate system change (board center vs frame top-left)
- Test with existing frames to verify containment

**Source**: USER_REQUEST - layer/frame organization discussion

---

### CAP-RELIABLE-ERRORS: Developer debugs MCP tool failures efficiently

**User**: Developer using Miro MCP via Claude Desktop/Code
**Outcome**: Error messages reveal cause and suggest resolution (vs generic "Error occurred")
**Context**: Currently all errors show "Error occurred during tool execution" - no visibility into actual cause (API error, auth issue, invalid parameters, rate limit)

**Acceptance Criteria**:
- [ ] Error messages include: error type, cause, affected tool
- [ ] Miro API errors surface status code and message
- [ ] Auth errors indicate token expiry or permission issues
- [ ] Invalid parameters show which parameter failed

**Source**: BACKLOG - foundation capability

---
