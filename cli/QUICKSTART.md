# Incident Commander CLI - Quick Start

## Installation

```bash
cd cli
npm install
npm run build
```

## Configuration

```bash
./dist/ic config --endpoint http://localhost:5000 --key ic_your_api_key_here
```

## Commands

### Analyze logs
```bash
# From a file
./dist/ic analyze logs/error.log

# From stdin
cat logs/error.log | ./dist/ic analyze
echo "ERROR: Database connection failed" | ./dist/ic analyze
```

### List incidents
```bash
./dist/ic list
./dist/ic list --status critical
./dist/ic list --limit 20
./dist/ic list --json  # JSON output for scripting
```

### Get incident details
```bash
./dist/ic get <incident-id>
./dist/ic get <incident-id> --json
```

### Update status
```bash
./dist/ic status <incident-id> resolved
./dist/ic status <incident-id> critical
./dist/ic resolve <incident-id>  # Quick alias
```

### Delete incident
```bash
./dist/ic delete <incident-id> --yes
```

### Watch mode (real-time)
```bash
# Watch a log file for changes
./dist/ic watch /var/log/app.log

# Custom check interval
./dist/ic watch /var/log/app.log --interval 10

# Test it:
# Terminal 1: ./dist/ic watch test.log
# Terminal 2: echo "ERROR: Test error" >> test.log
```

## Examples

### Monitor Docker logs
```bash
docker logs -f my-container 2>&1 | ./dist/ic analyze
```

### Monitor Kubernetes pods
```bash
kubectl logs -f pod-name | ./dist/ic analyze
```

### Watch application logs
```bash
./dist/ic watch /var/log/nginx/error.log
```

### CI/CD Integration
```bash
# Analyze logs and fail on critical
./dist/ic analyze build.log
if [ $? -eq 1 ]; then
  echo "Critical issues found!"
  exit 1
fi
```

### Scripting with JSON output
```bash
# Get all critical incidents
./dist/ic list --status critical --json | jq '.[].id'

# Resolve all critical incidents
./dist/ic list --status critical --json | jq -r '.[].id' | while read id; do
  ./dist/ic resolve "$id"
done
```

## Testing

Create a test log file:
```bash
cat > test.log << 'EOF'
2024-01-20 10:30:45 ERROR Database connection failed
Connection timeout after 30 seconds
Host: db.example.com:5432
Stack trace:
  at Connection.connect (/app/db.js:45)
  at async main (/app/index.js:12)
EOF

./dist/ic analyze test.log
```

## Next Steps

- Get your API key from the web dashboard (Profile → API Keys)
- Configure the CLI: `./dist/ic config --endpoint <url> --key <key>`
- Start analyzing logs!
