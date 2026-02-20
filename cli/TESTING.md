# CLI Testing Guide

## ✅ Basic Tests (Completed)

All basic CLI functionality works:
- ✅ Version command
- ✅ Help command
- ✅ Config command
- ✅ All 8 commands available
- ✅ Command help text
- ✅ Build system working

## 🧪 Manual Testing Steps

### Prerequisites
1. Server is running at http://localhost:5000
2. You have a Supabase account configured

### Step 1: Get API Key

**Option A: Via Web Dashboard**
```bash
# 1. Open browser
open http://localhost:5000

# 2. Sign in with magic link (check your email)
# 3. Go to Profile → API Keys
# 4. Click "Create New Key"
# 5. Name it "CLI Test"
# 6. Copy the key (starts with ic_)
```

**Option B: Via Database (Quick Test)**
```bash
# If you have direct database access, you can create a test key
# This is for testing only - production should use the web UI
```

### Step 2: Configure CLI

```bash
cd cli

# Configure with your API key
./dist/ic config --endpoint http://localhost:5000 --key ic_your_key_here

# Verify config
./dist/ic config
```

### Step 3: Test Analyze Command

```bash
# Test with a file
cat > /tmp/test.log << 'EOF'
2024-01-20 10:30:45 ERROR Database connection failed
Connection timeout after 30 seconds
Host: db.example.com:5432
Stack trace:
  at Connection.connect (/app/db.js:45)
  at async main (/app/index.js:12)
EOF

./dist/ic analyze /tmp/test.log

# Test with stdin
echo "ERROR: Memory leak detected. Heap size: 2.5GB" | ./dist/ic analyze

# Test with piped input
cat /tmp/test.log | ./dist/ic analyze
```

### Step 4: Test List Command

```bash
# List all incidents
./dist/ic list

# List with limit
./dist/ic list --limit 5

# List with status filter
./dist/ic list --status critical

# List as JSON
./dist/ic list --json

# List and pipe to jq
./dist/ic list --json | jq '.[0]'
```

### Step 5: Test Get Command

```bash
# Get an incident (replace with actual ID)
./dist/ic get <incident-id>

# Get as JSON
./dist/ic get <incident-id> --json
```

### Step 6: Test Status Commands

```bash
# Update status
./dist/ic status <incident-id> critical
./dist/ic status <incident-id> resolved

# Quick resolve
./dist/ic resolve <incident-id>
```

### Step 7: Test Delete Command

```bash
# Delete with confirmation
./dist/ic delete <incident-id> --yes
```

### Step 8: Test Watch Mode

```bash
# Terminal 1: Start watching
touch /tmp/watch-test.log
./dist/ic watch /tmp/watch-test.log

# Terminal 2: Add content
echo "ERROR: Test error 1" >> /tmp/watch-test.log
sleep 2
echo "ERROR: Test error 2" >> /tmp/watch-test.log

# Watch with custom interval
./dist/ic watch /tmp/watch-test.log --interval 10

# Stop with Ctrl+C
```

## 🎯 Expected Results

### Analyze Command
- Should show spinner "Analyzing logs with AI..."
- Should display incident details:
  - Title
  - Severity (colored)
  - Confidence percentage
  - Root cause
  - Recommended fix
  - Next steps
  - Incident ID
  - Link to view in dashboard

### List Command
- Should show spinner "Fetching incidents..."
- Should display incidents in format:
  ```
  [CRITICAL] abc123de Error title (2024-01-20 10:30:45)
  ```
- JSON output should be valid JSON array

### Get Command
- Should show detailed incident view
- Should include completed steps with checkmarks

### Status Commands
- Should show success message
- Should update status in database

### Watch Mode
- Should show "Watching /path/to/file"
- Should detect new content
- Should analyze only new lines
- Should show incident summary for each detection
- Should handle Ctrl+C gracefully

## 🐛 Common Issues

### "Please configure endpoint and API key first"
**Solution:** Run `./dist/ic config --endpoint http://localhost:5000 --key <your-key>`

### "Invalid or revoked API key"
**Solution:** 
- Check your API key is correct
- Verify it hasn't been revoked in the dashboard
- Create a new key if needed

### "Rate limit exceeded"
**Solution:** Wait for rate limit to reset (shown in error message)

### "Analysis failed"
**Solution:**
- Check server is running: `curl http://localhost:5000`
- Check GEMINI_API_KEY is set in .env
- Check server logs: `tail -f /tmp/server.log`

### Watch mode not detecting changes
**Solution:**
- Ensure file exists before starting watch
- Try appending with `>>` not `>`
- Check file permissions

## 📊 Test Checklist

- [ ] CLI builds successfully
- [ ] Version command works
- [ ] Help command works
- [ ] Config command stores settings
- [ ] Analyze from file works
- [ ] Analyze from stdin works
- [ ] List command works
- [ ] List with filters works
- [ ] List JSON output works
- [ ] Get command works
- [ ] Get JSON output works
- [ ] Status update works
- [ ] Resolve command works
- [ ] Delete command works
- [ ] Watch mode detects changes
- [ ] Watch mode analyzes new content
- [ ] Watch mode handles Ctrl+C
- [ ] Error messages are clear
- [ ] Colors display correctly
- [ ] Spinners work
- [ ] Rate limiting is handled

## 🚀 Real-World Test Scenarios

### Scenario 1: Docker Logs
```bash
docker run --rm alpine sh -c 'echo "ERROR: Connection failed" >&2' 2>&1 | ./dist/ic analyze
```

### Scenario 2: Kubernetes Logs
```bash
# If you have kubectl configured
kubectl logs <pod-name> | ./dist/ic analyze
```

### Scenario 3: System Logs
```bash
sudo tail -n 50 /var/log/syslog | ./dist/ic analyze
```

### Scenario 4: Application Logs
```bash
./dist/ic watch /var/log/nginx/error.log
```

### Scenario 5: CI/CD Integration
```bash
# Run tests and analyze output
npm test 2>&1 | tee test.log
./dist/ic analyze test.log
```

### Scenario 6: Scripting
```bash
# Get all critical incidents and resolve them
./dist/ic list --status critical --json | \
  jq -r '.[].id' | \
  while read id; do
    echo "Resolving $id"
    ./dist/ic resolve "$id"
  done
```

## ✅ Success Criteria

The CLI is ready for production when:
- ✅ All commands execute without errors
- ✅ API communication works correctly
- ✅ Error messages are helpful
- ✅ JSON output is valid
- ✅ Watch mode is stable
- ✅ Rate limiting is handled gracefully
- ✅ Config persists between sessions
- ✅ Stdin/piping works
- ✅ Colors and formatting look good

## 📝 Next Steps After Testing

Once testing is complete:
1. Fix any bugs found
2. Continue to Phase 4 (Advanced Filtering)
3. Or move to Phase 6 (Distribution - npm publish)
