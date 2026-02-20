#!/bin/bash

# Demo script - shows CLI capabilities without needing API key

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Incident Commander CLI - Feature Demonstration         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd /home/collins-emmanuel/Documents/Actualize-Discussion/cli

# Show version
echo "📦 Version:"
./dist/ic --version
echo ""

# Show available commands
echo "🎯 Available Commands:"
./dist/ic --help | grep -A 20 "Commands:"
echo ""

# Show analyze help
echo "🔍 Analyze Command:"
./dist/ic analyze --help
echo ""

# Show watch help
echo "👁  Watch Command:"
./dist/ic watch --help
echo ""

# Show list help
echo "📋 List Command:"
./dist/ic list --help
echo ""

# Show config
echo "⚙️  Current Configuration:"
./dist/ic config
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Demo Complete!                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "To use the CLI:"
echo "  1. Get an API key from http://localhost:5000"
echo "  2. Configure: ./dist/ic config --endpoint http://localhost:5000 --key <key>"
echo "  3. Analyze: echo 'ERROR: Test' | ./dist/ic analyze"
echo "  4. Watch: ./dist/ic watch /var/log/app.log"
echo ""
echo "See TESTING.md for full testing guide"
