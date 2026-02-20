#!/bin/bash

# Quick CLI test without API key (tests basic functionality)

echo "=== Incident Commander CLI - Basic Tests ==="
echo ""

cd /home/collins-emmanuel/Documents/Actualize-Discussion/cli

# Test 1: Version
echo "✓ Test 1: Version command"
./dist/ic --version
echo ""

# Test 2: Help
echo "✓ Test 2: Help command"
./dist/ic --help | head -10
echo ""

# Test 3: Config (show current)
echo "✓ Test 3: Config command"
./dist/ic config
echo ""

# Test 4: List commands
echo "✓ Test 4: Available commands"
./dist/ic --help | grep "Commands:" -A 10
echo ""

# Test 5: Analyze help
echo "✓ Test 5: Analyze command help"
./dist/ic analyze --help
echo ""

# Test 6: Watch help
echo "✓ Test 6: Watch command help"
./dist/ic watch --help
echo ""

echo "=== Basic tests complete! ==="
echo ""
echo "To test with real API:"
echo "1. Open http://localhost:5000"
echo "2. Sign in and create an API key"
echo "3. Run: ./dist/ic config --endpoint http://localhost:5000 --key <your-key>"
echo "4. Run: echo 'ERROR: Test' | ./dist/ic analyze"
