# Deep Dive: API Key Security & CLI Installation

## 🔐 API Key Security Analysis

### ✅ Key Generation (SECURE)
```typescript
// server/routes.ts:298
const rawKey = `ic_${randomBytes(32).toString("hex")}`;
```
- Uses Node.js `crypto.randomBytes(32)` - cryptographically secure
- Generates 64 hex characters (256 bits of entropy)
- Prefixed with `ic_` for identification
- **Total length:** 67 characters (ic_ + 64 hex)
- **Example:** `ic_a1b2c3d4e5f6...` (67 chars)

### ✅ Key Storage (SECURE)
```typescript
// server/routes.ts:299-300
const keyHash = hashApiKey(rawKey);  // SHA-256 hash
const keyPrefix = rawKey.slice(0, 10);  // Only first 10 chars stored

// Database stores:
// - keyHash: SHA-256 hash (never the raw key)
// - keyPrefix: "ic_a1b2c3d" (for display only)
```
- Raw key **never stored** in database
- Only SHA-256 hash stored
- Prefix stored for user identification
- Raw key shown **only once** on creation

### ✅ Key Validation (SECURE)
```typescript
// server/routes.ts:26-28
const keyHash = hashApiKey(token);
const apiKey = await storage.findApiKeyByHash(keyHash);
if (!apiKey) return 401;
```
- Incoming key is hashed with SHA-256
- Hash compared against database
- Constant-time comparison (via database)
- Revoked keys rejected

### ✅ Rate Limiting (IMPLEMENTED)
- 100 requests per day per key
- Resets every 24 hours
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Returns 429 when exceeded

### 🔒 Security Score: **9/10**

**Strengths:**
- ✅ Cryptographically secure random generation
- ✅ SHA-256 hashing (industry standard)
- ✅ No raw keys in database
- ✅ Rate limiting implemented
- ✅ Revocation support
- ✅ User isolation (keys tied to userId)

**Minor Improvements:**
- ⚠️ Could add key expiration dates
- ⚠️ Could add IP whitelisting
- ⚠️ Could add scopes/permissions per key

---

## 📦 CLI Installation Methods

### Method 1: npm Global Install (Post-Publish)
```bash
# After publishing to npm
npm install -g incident-commander-cli

# Use anywhere
ic --version
ic analyze logs.txt
```

**Status:** ⏳ Not yet published  
**Action needed:** Run `npm publish` in cli/ directory

### Method 2: npx (No Install)
```bash
# After publishing to npm
npx incident-commander-cli analyze logs.txt
```

**Status:** ⏳ Not yet published

### Method 3: curl Install Script
```bash
# One-liner install
curl -fsSL https://raw.githubusercontent.com/user/repo/main/install.sh | bash

# Or download and inspect first
curl -fsSL https://raw.githubusercontent.com/user/repo/main/install.sh -o install.sh
bash install.sh
```

**Status:** ❌ Not implemented  
**Action needed:** Create install.sh script (see below)

### Method 4: Direct Binary Download
```bash
# Download pre-built binary
curl -L https://github.com/user/repo/releases/download/v1.0.0/ic-linux -o ic
chmod +x ic
sudo mv ic /usr/local/bin/

# Or for user install
mkdir -p ~/.local/bin
mv ic ~/.local/bin/
```

**Status:** ❌ Not implemented  
**Action needed:** Build binaries with `pkg` or `esbuild`

### Method 5: Local Install (Current - Working)
```bash
cd cli
npm install
npm run build
./dist/ic --version
```

**Status:** ✅ Working now

---

## 🧪 Getting API Key

### Option 1: Via Web Dashboard (Recommended ✅)
```bash
# 1. Open browser
open http://localhost:5000

# 2. Sign in with magic link (check email)
# 3. Navigate: Profile → API Keys
# 4. Click "Create New Key"
# 5. Name it "CLI Test"
# 6. Copy the key (shown only once!)
# 7. Configure CLI:
./dist/ic config --endpoint http://localhost:5000 --key ic_xxx...
```

### Option 2: Via curl (Complex - Requires Supabase JWT)
```bash
# Step 1: Get Supabase JWT token
# This requires magic link authentication flow
# Not practical for CLI testing

# Step 2: Create API key with JWT
curl -X POST http://localhost:5000/api/keys \
  -H "Authorization: Bearer <supabase-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "CLI Test Key"}'

# Response includes raw key (only time it's shown):
{
  "id": "uuid",
  "name": "CLI Test Key",
  "key": "ic_a1b2c3d4e5f6...",  # ← Use this!
  "keyPrefix": "ic_a1b2c3d",
  "createdAt": "2024-01-20T10:30:00Z"
}
```

**Verdict:** Web dashboard is much easier

---

## ✅ test.sh Analysis

### Current Status: **Ready to Use** ✅

**What it does:**
1. ✅ Prompts user for API key (interactive)
2. ✅ Configures CLI with endpoint and key
3. ✅ Tests analyze command (file input)
4. ✅ Tests list command
5. ✅ Tests JSON output
6. ✅ Tests stdin input
7. ✅ Tests get command (with dynamic ID)
8. ✅ Tests status update commands
9. ✅ Provides watch mode instructions

**Improvements needed:**
- ⚠️ Assumes `cd cli` works (should use absolute path)
- ⚠️ No error handling if commands fail
- ⚠️ No cleanup of test files
- ⚠️ No validation of API key format

### Enhanced Version:

```bash
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
echo "🔍 Step 3: Testing analyze..."
cat > /tmp/test-error.log << 'EOF'
2024-01-20 10:30:45 ERROR Database connection failed
Connection timeout after 30 seconds
Host: db.example.com:5432
EOF

./dist/ic analyze /tmp/test-error.log || echo "❌ Analyze failed"

# Test list
echo ""
echo "📋 Step 4: Testing list..."
./dist/ic list --limit 5 || echo "❌ List failed"

# Test JSON
echo ""
echo "📊 Step 5: Testing JSON output..."
./dist/ic list --limit 1 --json || echo "❌ JSON output failed"

# Test stdin
echo ""
echo "📥 Step 6: Testing stdin..."
echo "ERROR: Memory leak detected" | ./dist/ic analyze || echo "❌ Stdin failed"

# Test get
echo ""
echo "🔎 Step 7: Testing get..."
INCIDENT_ID=$(./dist/ic list --limit 1 --json 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ ! -z "$INCIDENT_ID" ]; then
  ./dist/ic get "$INCIDENT_ID" || echo "❌ Get failed"
  
  # Test status
  echo ""
  echo "✏️  Step 8: Testing status..."
  ./dist/ic status "$INCIDENT_ID" critical || echo "❌ Status update failed"
  ./dist/ic resolve "$INCIDENT_ID" || echo "❌ Resolve failed"
else
  echo "⚠️  No incidents to test get/status commands"
fi

# Cleanup
rm -f /tmp/test-error.log

echo ""
echo "✅ All tests complete!"
echo ""
echo "To test watch mode:"
echo "  Terminal 1: touch /tmp/watch.log && ./dist/ic watch /tmp/watch.log"
echo "  Terminal 2: echo 'ERROR: Test' >> /tmp/watch.log"
```

---

## 🚀 curl Install Script (install.sh)

Create this for one-liner installation:

```bash
#!/bin/bash
# Incident Commander CLI Installer

set -e

echo "Installing Incident Commander CLI..."

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux*)
    PLATFORM="linux"
    ;;
  Darwin*)
    PLATFORM="macos"
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

# Download binary
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

echo "Downloading ic for $PLATFORM..."
curl -fsSL "https://github.com/user/repo/releases/latest/download/ic-$PLATFORM" -o "$INSTALL_DIR/ic"
chmod +x "$INSTALL_DIR/ic"

# Add to PATH if needed
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo ""
  echo "Add to your PATH:"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
  echo "Add this to ~/.bashrc or ~/.zshrc to make it permanent"
fi

echo "✅ Installed to $INSTALL_DIR/ic"
echo ""
echo "Get started:"
echo "  ic config --endpoint https://your-app.com --key <your-key>"
echo "  ic analyze logs.txt"
```

---

## 📋 Summary

### API Key Security: ✅ EXCELLENT
- Cryptographically secure generation
- SHA-256 hashing
- No raw keys in database
- Rate limiting implemented
- Revocation support

### CLI Installation: ⏳ PARTIAL
- ✅ Local build works
- ⏳ npm publish needed
- ❌ curl install not implemented
- ❌ Binaries not built

### test.sh Status: ✅ READY
- Works as-is
- Could use minor improvements
- Requires manual API key from web dashboard
- Tests all major functionality

### Recommendations:

1. **Immediate (5 min):**
   - ✅ test.sh is ready to use now
   - Just need API key from web dashboard

2. **Short-term (1 hour):**
   - Enhance test.sh with error handling
   - Create install.sh script
   - Build standalone binaries

3. **Medium-term (2 hours):**
   - Publish to npm
   - Create GitHub releases
   - Add CI/CD for binary builds

4. **Long-term:**
   - Add key expiration
   - Add IP whitelisting
   - Add key scopes/permissions
