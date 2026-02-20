# Incident Commander CLI

AI-powered log analysis from your terminal.

## Installation

```bash
npm install -g incident-commander-cli
```

Or use locally:
```bash
cd cli
npm install
npm run dev
```

## Quick Start

1. **Configure your API credentials:**
```bash
ic config --endpoint https://your-app.com --key ic_your_api_key_here
```

2. **Analyze logs:**
```bash
# From a file
ic analyze ./logs/error.log

# From stdin
cat /var/log/app.log | ic analyze

# From command output
docker logs my-container | ic analyze
```

3. **List incidents:**
```bash
ic list
ic list --status critical
ic list --limit 20
```

4. **Get incident details:**
```bash
ic get <incident-id>
```

## Commands

### `ic config`
Configure API endpoint and key.

```bash
ic config --endpoint https://your-app.com --key your_api_key
ic config  # Show current config
```

### `ic analyze [file]`
Analyze logs and create an incident.

```bash
ic analyze error.log
ic analyze < logs.txt
tail -f /var/log/app.log | ic analyze
```

### `ic list`
List recent incidents.

```bash
ic list
ic list --status critical
ic list --limit 50
```

### `ic get <id>`
Get detailed incident information.

```bash
ic get abc123def456
```

## Examples

**Analyze Kubernetes pod logs:**
```bash
kubectl logs pod-name | ic analyze
```

**Monitor logs in real-time:**
```bash
tail -f /var/log/nginx/error.log | ic analyze
```

**Analyze Docker container logs:**
```bash
docker logs my-app 2>&1 | ic analyze
```

**Check critical incidents:**
```bash
ic list --status critical
```

## Configuration

Config is stored in:
- Linux: `~/.config/incident-commander/config.json`
- macOS: `~/Library/Preferences/incident-commander/config.json`
- Windows: `%APPDATA%\incident-commander\config.json`

## API Key

Get your API key from the web dashboard:
1. Go to Profile → API Keys
2. Create a new key
3. Copy and configure: `ic config --key your_key`
