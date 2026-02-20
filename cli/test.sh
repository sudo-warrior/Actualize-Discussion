#!/bin/bash
set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Incident Commander CLI Test ==="
echo ""

# Validate CLI exists
if [ ! -f "./dist/ic" ]; then
  echo "❌ CLI not built. Run: npm run build"
  exit 1
fi

# Get API key
echo "📝 Step 1: Get API key"
echo "Open http://localhost:5000 → Profile → API Keys → Create New Key"
echo ""
read -p "Enter your API key (starts with ic_): " API_KEY

if [ -z "$API_KEY" ]; then
  echo "❌ No API key provided. Exiting."
  exit 1
fi

# Validate API key format
if [[ ! "$API_KEY" =~ ^ic_[a-f0-9]{64}$ ]]; then
  echo "⚠️  Warning: API key format looks incorrect"
  echo "Expected: ic_ followed by 64 hex characters"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Configure
echo ""
echo "⚙️  Step 2: Configuring CLI..."
./dist/ic config --endpoint http://localhost:5000 --key "$API_KEY"

# Test analyze
echo ""
echo "🔍 Step 3: Testing analyze command..."
cat > /tmp/test-error.log << 'EOF'
2024-01-20 10:30:45 ERROR Database connection failed
Connection timeout after 30 seconds
Host: db.example.com:5432
User: app_user
Database: production
Stack trace:
  at Connection.connect (/app/db.js:45)
  at DatabasePool.getConnection (/app/pool.js:23)
  at async QueryExecutor.execute (/app/query.js:12)
  at async main (/app/index.js:8)

Additional context:
- Last successful connection: 2024-01-20 10:25:12
- Connection pool size: 10
- Active connections: 0
- Failed attempts: 3
EOF

echo "Analyzing test log file..."
./dist/ic analyze /tmp/test-error.log || echo "❌ Analyze failed"

# Test list
echo ""
echo "📋 Step 4: Testing list command..."
./dist/ic list --limit 5 || echo "❌ List failed"

# Test JSON
echo ""
echo "📊 Step 5: Testing JSON output..."
./dist/ic list --limit 1 --json | head -20 || echo "❌ JSON output failed"

# Test stdin
echo ""
echo "📥 Step 6: Testing stdin input..."
echo "ERROR: Memory leak detected. Heap size: 2.5GB" | ./dist/ic analyze || echo "❌ Stdin failed"

# Test get
echo ""
echo "🔎 Step 7: Testing get command..."
INCIDENT_ID=$(./dist/ic list --limit 1 --json 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ ! -z "$INCIDENT_ID" ]; then
  echo "Getting incident: $INCIDENT_ID"
  ./dist/ic get "$INCIDENT_ID" || echo "❌ Get failed"
  
  # Test status
  echo ""
  echo "✏️  Step 8: Testing status update..."
  ./dist/ic status "$INCIDENT_ID" critical || echo "❌ Status update failed"
  ./dist/ic resolve "$INCIDENT_ID" || echo "❌ Resolve failed"
else
  echo "⚠️  No incidents found to test get/status commands"
fi

# Cleanup
rm -f /tmp/test-error.log

echo ""
echo "✅ All tests complete!"
echo ""
echo "To test watch mode manually:"
echo "  Terminal 1: touch /tmp/test-watch.log && ./dist/ic watch /tmp/test-watch.log"
echo "  Terminal 2: echo 'ERROR: Test' >> /tmp/test-watch.log"
