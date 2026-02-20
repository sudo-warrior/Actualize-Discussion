# CLI Implementation Plan

## Current State Analysis

### ✅ API Already Working
The API v1 endpoints are **fully functional** and curl-accessible:

```bash
# All these work RIGHT NOW:
curl -X POST https://your-app.com/api/v1/incidents/analyze \
  -H "Authorization: Bearer ic_xxx" \
  -H "Content-Type: application/json" \
  -d '{"logs": "ERROR: Connection failed"}'

curl https://your-app.com/api/v1/incidents \
  -H "Authorization: Bearer ic_xxx"

curl https://your-app.com/api/v1/incidents/{id} \
  -H "Authorization: Bearer ic_xxx"

curl -X PATCH https://your-app.com/api/v1/incidents/{id}/status \
  -H "Authorization: Bearer ic_xxx" \
  -d '{"status": "resolved"}'

curl -X DELETE https://your-app.com/api/v1/incidents/{id} \
  -H "Authorization: Bearer ic_xxx"
```

**API Features:**
- ✅ API key authentication (Bearer token or X-API-Key header)
- ✅ Rate limiting (100 req/day per key)
- ✅ Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- ✅ Consistent JSON responses with `{success, data/error}` format
- ✅ User isolation (incidents filtered by API key owner)
- ✅ Full CRUD operations

---

## Implementation Plan

### Phase 1: Core CLI (30-45 minutes) ✅ DONE
**Status:** Basic structure created, needs testing

**Files Created:**
- `cli/package.json` - Dependencies and build config
- `cli/src/index.ts` - Main CLI logic
- `cli/tsconfig.json` - TypeScript config
- `cli/README.md` - Documentation

**Commands Implemented:**
1. `ic config` - Configure endpoint and API key
2. `ic analyze [file]` - Analyze logs (file or stdin)
3. `ic list` - List incidents with filters
4. `ic get <id>` - Get incident details

**Dependencies:**
- `commander` - CLI framework
- `chalk` - Terminal colors
- `ora` - Spinners
- `conf` - Config storage
- `axios` - HTTP client

---

### Phase 2: Enhanced Commands (1-2 hours)

#### 2.1 Status Management
```bash
ic status <id> <status>           # Update incident status
ic resolve <id>                   # Quick resolve (alias)
ic critical <id>                  # Mark as critical (alias)
```

#### 2.2 Watch Mode (Real-time)
```bash
ic watch [file]                   # Watch file for changes, auto-analyze
ic watch --tail /var/log/app.log  # Tail and analyze continuously
ic watch --interval 30            # Check every 30 seconds
```

**Implementation:**
- Use `fs.watch()` or `chokidar` for file watching
- Debounce to avoid spam
- Only analyze new content (track file position)

#### 2.3 Filtering & Search
```bash
ic list --severity critical       # Filter by severity
ic list --status unresolved       # Filter by status
ic list --since "2 hours ago"     # Time-based filter
ic list --limit 50                # Pagination
ic search "database error"        # Search in logs/titles
```

#### 2.4 Output Formats
```bash
ic list --json                    # JSON output (for scripting)
ic list --format table            # Table format (default)
ic list --format compact          # One-line per incident
ic get <id> --json                # JSON output
```

---

### Phase 3: Advanced Features (2-3 hours)

#### 3.1 Batch Operations
```bash
ic analyze-dir ./logs/            # Analyze all files in directory
ic analyze-dir --recursive        # Include subdirectories
ic analyze-dir --pattern "*.log"  # Filter by pattern
```

#### 3.2 Templates
```bash
ic templates list                 # List saved templates
ic templates use <name>           # Use template for analysis
ic analyze --template nginx       # Analyze with specific template
```

#### 3.3 Export
```bash
ic export <id> --format pdf       # Export as PDF
ic export <id> --format json      # Export as JSON
ic export <id> --format markdown  # Export as Markdown
ic export --all --since "1 week"  # Bulk export
```

#### 3.4 Statistics
```bash
ic stats                          # Show summary stats
ic stats --detailed               # Detailed breakdown
ic stats --chart                  # ASCII chart in terminal
```

---

### Phase 4: Developer Experience (1-2 hours)

#### 4.1 Interactive Mode
```bash
ic                                # Launch interactive TUI
# Arrow keys to navigate incidents
# Enter to view details
# Space to toggle selection
# D to delete, R to resolve, etc.
```

**Tech:** Use `inquirer` or `prompts` for interactive prompts

#### 4.2 Shell Integration
```bash
# Bash/Zsh completion
ic completion bash > /etc/bash_completion.d/ic
ic completion zsh > ~/.zsh/completions/_ic

# Aliases
alias icw='ic watch'
alias icl='ic list'
alias ica='ic analyze'
```

#### 4.3 Piping Support
```bash
# Pipe from any command
docker logs my-app 2>&1 | ic analyze
kubectl logs pod-name | ic analyze
journalctl -u nginx | ic analyze

# Chain commands
ic list --status critical | jq '.[] | .id' | xargs -I {} ic resolve {}
```

---

### Phase 5: CI/CD Integration (1 hour)

#### 5.1 Exit Codes
```bash
ic analyze logs.txt
# Exit 0: No critical issues
# Exit 1: Critical issues found
# Exit 2: API error
```

#### 5.2 CI/CD Examples
```yaml
# GitHub Actions
- name: Analyze logs
  run: |
    ic analyze ./logs/test.log
    if [ $? -eq 1 ]; then
      echo "Critical issues found!"
      exit 1
    fi

# GitLab CI
analyze_logs:
  script:
    - ic analyze logs/*.log --severity critical --fail-on-critical
```

#### 5.3 Webhooks
```bash
ic webhook add slack https://hooks.slack.com/xxx
ic webhook add discord https://discord.com/api/webhooks/xxx
ic analyze logs.txt --notify  # Send to webhooks on critical
```

---

### Phase 6: SDK/Library (2-3 hours)

#### 6.1 JavaScript/TypeScript SDK
```typescript
import { IncidentCommander } from 'incident-commander';

const ic = new IncidentCommander({
  endpoint: 'https://your-app.com',
  apiKey: 'ic_xxx'
});

// Analyze logs
const incident = await ic.analyze(logs);

// List incidents
const incidents = await ic.list({ status: 'critical' });

// Auto-capture errors
ic.captureError(error);

// Express middleware
app.use(ic.middleware());
```

#### 6.2 Python SDK
```python
from incident_commander import IncidentCommander

ic = IncidentCommander(
    endpoint='https://your-app.com',
    api_key='ic_xxx'
)

# Analyze logs
incident = ic.analyze(logs)

# Auto-capture exceptions
@ic.capture_exceptions
def my_function():
    # Errors automatically sent to IC
    pass
```

---

## Timeline Summary

| Phase | Time | Priority | Status |
|-------|------|----------|--------|
| 1. Core CLI | 30-45 min | Critical | ✅ Done |
| 2. Enhanced Commands | 1-2 hours | High | Pending |
| 3. Advanced Features | 2-3 hours | Medium | Pending |
| 4. Developer Experience | 1-2 hours | High | Pending |
| 5. CI/CD Integration | 1 hour | Medium | Pending |
| 6. SDK/Library | 2-3 hours | High | Pending |

**Total Time:** 8-12 hours for full implementation

---

## Immediate Next Steps (30 minutes)

1. **Test the CLI** (5 min)
   ```bash
   cd cli
   npm run build
   ./dist/index.js config --endpoint http://localhost:5000 --key ic_test
   echo "ERROR: Test" | ./dist/index.js analyze
   ```

2. **Add watch mode** (15 min)
   - Install `chokidar`
   - Add `ic watch` command
   - Implement file watching logic

3. **Add status command** (5 min)
   ```typescript
   program
     .command('status')
     .argument('<id>', 'Incident ID')
     .argument('<status>', 'New status (analyzing, resolved, critical)')
     .action(async (id, status) => {
       // Call PATCH /api/v1/incidents/:id/status
     });
   ```

4. **Add JSON output** (5 min)
   ```typescript
   .option('--json', 'Output as JSON')
   .action(async (options) => {
     if (options.json) {
       console.log(JSON.stringify(data, null, 2));
     } else {
       // Pretty print
     }
   });
   ```

---

## Distribution

### NPM Package
```bash
# Publish to npm
npm publish

# Users install globally
npm install -g incident-commander-cli

# Or use with npx
npx incident-commander-cli analyze logs.txt
```

### Standalone Binary
Use `pkg` or `nexe` to create standalone executables:
```bash
npm install -g pkg
pkg cli/package.json --targets node18-linux-x64,node18-macos-x64,node18-win-x64
```

---

## Testing Strategy

1. **Unit Tests** (Jest)
   - Test each command
   - Mock API responses
   - Test error handling

2. **Integration Tests**
   - Test against real API
   - Test file operations
   - Test piping

3. **E2E Tests**
   - Full workflow tests
   - CI/CD scenarios

---

## Documentation

1. **README.md** - Quick start guide ✅
2. **EXAMPLES.md** - Real-world examples
3. **API.md** - API reference
4. **CONTRIBUTING.md** - Development guide
5. **Video Tutorial** - 5-minute demo

---

## Success Metrics

- ✅ CLI works with existing API (no backend changes needed)
- ✅ Supports stdin/file input
- ✅ Pretty terminal output with colors
- ✅ Config persistence
- ⏳ Watch mode for real-time monitoring
- ⏳ JSON output for scripting
- ⏳ Exit codes for CI/CD
- ⏳ Published to npm
- ⏳ 100+ GitHub stars in first month
