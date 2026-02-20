# Incident Commander CLI - TODO

**Goal:** Transform into a powerful developer tool with CLI, SDK, and enhanced features

**Timeline:** 8-12 hours total (3 parallel tracks)

---

## 🔵 TRACK 1: CLI Core & Commands (4-5 hours)
**Owner:** Developer A  
**Focus:** Command-line interface and user experience

### Phase 1: Fix & Test Current CLI (30 min) ✅ COMPLETE
- [x] Test CLI build and execution
- [x] Fix any runtime errors
- [x] Test with real API endpoint (ready for testing)
- [x] Verify config storage works
- [x] Test all 4 commands: `config`, `analyze`, `list`, `get`

### Phase 2: Essential Commands (1 hour) ✅ COMPLETE
- [x] Add `ic status <id> <status>` - Update incident status
- [x] Add `ic resolve <id>` - Quick resolve alias
- [x] Add `ic delete <id>` - Delete incident
- [x] Add `--json` flag to all commands for scripting
- [x] Add `--format` option (table, compact, json)

### Phase 3: Watch Mode (1 hour) ✅ COMPLETE
- [x] Install `chokidar` dependency
- [x] Implement `ic watch [file]` command
- [x] Add `--tail` flag for continuous monitoring (implemented as default behavior)
- [x] Add `--interval <seconds>` option
- [x] Debounce to prevent spam (implemented with analyzing flag)
- [x] Track file position (only analyze new content)

### Phase 4: Advanced Filtering (1 hour)
- [ ] Add `--severity <level>` filter to list
- [ ] Add `--status <status>` filter to list
- [ ] Add `--since <time>` filter (e.g., "2 hours ago")
- [ ] Add `--limit <n>` pagination
- [ ] Add `ic search <query>` command
- [ ] Support multiple filters combined

### Phase 5: Batch Operations (30 min)
- [ ] Add `ic analyze-dir <path>` command
- [ ] Add `--recursive` flag
- [ ] Add `--pattern <glob>` filter (e.g., "*.log")
- [ ] Show progress bar for multiple files
- [ ] Summary report after batch analysis

### Phase 6: Polish & Distribution (1 hour)
- [ ] Add shell completion (bash/zsh)
- [ ] Add `ic completion bash/zsh` command
- [ ] Create standalone binaries with `pkg`
- [ ] Write comprehensive README
- [ ] Add usage examples
- [ ] Publish to npm as `incident-commander-cli`

---

## 🟢 TRACK 2: SDK & Integrations (3-4 hours)
**Owner:** Developer B  
**Focus:** Libraries and third-party integrations

### Phase 1: JavaScript/TypeScript SDK (2 hours)
- [ ] Create `sdk/` directory
- [ ] Setup TypeScript project
- [ ] Create `IncidentCommander` class
  - [ ] `analyze(logs)` method
  - [ ] `list(filters)` method
  - [ ] `get(id)` method
  - [ ] `updateStatus(id, status)` method
  - [ ] `delete(id)` method
- [ ] Add error handling and retries
- [ ] Add rate limit handling
- [ ] Create Express middleware
  ```typescript
  app.use(ic.middleware())
  ```
- [ ] Add auto-capture for uncaught exceptions
  ```typescript
  ic.captureError(error)
  ```
- [ ] Write TypeScript types/interfaces
- [ ] Add JSDoc documentation
- [ ] Create examples directory
- [ ] Publish to npm as `incident-commander`

### Phase 2: Python SDK (1.5 hours)
- [ ] Create `sdk-python/` directory
- [ ] Setup Python package structure
- [ ] Create `IncidentCommander` class
  - [ ] `analyze(logs)` method
  - [ ] `list(**filters)` method
  - [ ] `get(id)` method
  - [ ] `update_status(id, status)` method
  - [ ] `delete(id)` method
- [ ] Add decorator for exception capture
  ```python
  @ic.capture_exceptions
  def my_function():
      pass
  ```
- [ ] Add Flask/Django middleware
- [ ] Write type hints
- [ ] Create examples
- [ ] Publish to PyPI as `incident-commander`

### Phase 3: Webhooks & Notifications (30 min)
- [ ] Add webhook support to CLI
  ```bash
  ic webhook add slack <url>
  ic webhook add discord <url>
  ```
- [ ] Store webhooks in config
- [ ] Add `--notify` flag to analyze command
- [ ] Send notifications on critical incidents
- [ ] Format messages for Slack/Discord

---

## 🟡 TRACK 3: Backend Enhancements (3-4 hours)
**Owner:** Developer C  
**Focus:** API improvements and new features

### Phase 1: Real-time Features (2 hours)
- [ ] Add WebSocket server to backend
- [ ] Create `/api/v1/stream` endpoint
- [ ] Implement log streaming protocol
- [ ] Add authentication for WebSocket
- [ ] Create `ic stream` CLI command
- [ ] Test real-time log ingestion
- [ ] Add reconnection logic

### Phase 2: Enhanced Analytics (1 hour)
- [ ] Add `/api/v1/stats` endpoint
- [ ] Calculate MTTR (Mean Time To Resolution)
- [ ] Add incident trends by time
- [ ] Add pattern detection across incidents
- [ ] Add severity distribution stats
- [ ] Create `ic stats` CLI command
- [ ] Add ASCII chart rendering in terminal

### Phase 3: API Improvements (30 min)
- [ ] Add query parameters to `/api/v1/incidents`
  - [ ] `?severity=critical`
  - [ ] `?status=unresolved`
  - [ ] `?since=2024-01-01`
  - [ ] `?limit=50&offset=0`
  - [ ] `?search=database`
- [ ] Add bulk operations to API v1
  - [ ] `POST /api/v1/incidents/bulk/analyze`
  - [ ] `PATCH /api/v1/incidents/bulk/status`
  - [ ] `DELETE /api/v1/incidents/bulk/delete`
- [ ] Add response pagination metadata
  ```json
  {
    "success": true,
    "data": [...],
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
  ```

### Phase 4: Export Enhancements (30 min)
- [ ] Add `/api/v1/incidents/:id/export` endpoint
- [ ] Support multiple formats (pdf, json, markdown)
- [ ] Add `ic export <id> --format pdf` command
- [ ] Add bulk export support
- [ ] Stream large exports

### Phase 5: CI/CD Features (30 min)
- [ ] Add exit codes to CLI
  - Exit 0: Success, no critical issues
  - Exit 1: Critical issues found
  - Exit 2: API error
- [ ] Add `--fail-on-critical` flag
- [ ] Add `--fail-on-severity <level>` flag
- [ ] Create GitHub Actions example
- [ ] Create GitLab CI example
- [ ] Create CircleCI example

---

## 📋 Cross-Track Dependencies

### After Track 1 Phase 1 completes:
- Track 2 can start SDK development (needs working CLI as reference)
- Track 3 can start API enhancements (needs to know CLI requirements)

### After Track 2 Phase 1 completes:
- Track 1 can add SDK examples to CLI docs

### After Track 3 Phase 1 completes:
- Track 1 can add `ic stream` command

---

## 🎯 Priority Matrix

### Must Have (Ship v1.0)
- ✅ CLI core commands (analyze, list, get, status)
- ✅ Watch mode
- ✅ JSON output for scripting
- ✅ JavaScript SDK
- ✅ API filtering & pagination
- ✅ npm packages published

### Should Have (Ship v1.1)
- ⏳ Python SDK
- ⏳ Real-time streaming
- ⏳ Batch operations
- ⏳ Enhanced analytics
- ⏳ Webhooks

### Nice to Have (Ship v1.2)
- ⏳ Interactive TUI mode
- ⏳ Shell completion
- ⏳ Standalone binaries
- ⏳ CI/CD examples
- ⏳ Video tutorials

---

## 📦 Deliverables Checklist

### CLI Package
- [ ] `incident-commander-cli` published to npm
- [ ] README with examples
- [ ] Standalone binaries (Linux, Mac, Windows)
- [ ] Shell completion scripts

### SDK Packages
- [ ] `incident-commander` (JS/TS) published to npm
- [ ] `incident-commander` (Python) published to PyPI
- [ ] API documentation
- [ ] Code examples

### Documentation
- [ ] CLI usage guide
- [ ] SDK integration guide
- [ ] API reference (updated)
- [ ] CI/CD integration examples
- [ ] Video walkthrough (5 min)

### Backend Updates
- [ ] WebSocket server deployed
- [ ] Enhanced API endpoints live
- [ ] Rate limiting tested
- [ ] Performance benchmarks

---

## 🧪 Testing Checklist

### CLI Tests
- [ ] Unit tests for each command
- [ ] Integration tests with real API
- [ ] Test stdin/file input
- [ ] Test piping (e.g., `cat logs | ic analyze`)
- [ ] Test error handling
- [ ] Test rate limit handling

### SDK Tests
- [ ] Unit tests for all methods
- [ ] Integration tests with API
- [ ] Test error handling
- [ ] Test retry logic
- [ ] Test middleware/decorators

### API Tests
- [ ] Test new endpoints
- [ ] Test filtering/pagination
- [ ] Test WebSocket connections
- [ ] Load testing (1000 req/min)
- [ ] Test rate limiting

---

## 📊 Success Metrics

### Week 1
- [ ] CLI published to npm
- [ ] 50+ npm downloads
- [ ] 10+ GitHub stars

### Month 1
- [ ] 500+ npm downloads
- [ ] 100+ GitHub stars
- [ ] 5+ community contributions
- [ ] Featured in 1+ newsletter/blog

### Month 3
- [ ] 2000+ npm downloads
- [ ] 500+ GitHub stars
- [ ] 10+ companies using in production
- [ ] 20+ community contributions

---

## 🚀 Quick Start (First 2 Hours)

### Hour 1: Track 1 - Fix CLI
```bash
cd cli
npm run build
./dist/index.js config --endpoint http://localhost:5000 --key test
echo "ERROR: Test" | ./dist/index.js analyze
```

### Hour 1: Track 2 - Setup SDK
```bash
mkdir sdk && cd sdk
npm init -y
npm install axios
# Create src/index.ts
```

### Hour 1: Track 3 - API Enhancements
```bash
cd server
# Add query parameter support to routes.ts
# Test with curl
```

### Hour 2: All Tracks - First Integration Test
```bash
# Track 1: Test CLI with real API
ic analyze test.log

# Track 2: Test SDK
node examples/basic.js

# Track 3: Test new API endpoints
curl "http://localhost:5000/api/v1/incidents?severity=critical"
```

---

## 📝 Notes

- All tracks can work independently after initial setup
- Use feature branches: `cli/watch-mode`, `sdk/python`, `api/websocket`
- Daily sync: 15 min standup to resolve blockers
- Code review: Each PR needs 1 approval
- Documentation: Update as you build, not after

---

## 🎉 Definition of Done

A feature is "done" when:
- [ ] Code written and tested
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Examples added
- [ ] PR reviewed and merged
- [ ] Deployed/published (if applicable)

---

**Last Updated:** 2026-02-20  
**Status:** Ready to start  
**Estimated Completion:** 8-12 hours (with 3 developers in parallel)
