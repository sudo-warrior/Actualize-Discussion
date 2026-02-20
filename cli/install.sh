#!/bin/bash
# Incident Commander CLI Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/user/repo/main/install.sh | bash

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Incident Commander CLI Installer                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux*)
    PLATFORM="linux"
    ;;
  Darwin*)
    PLATFORM="macos"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    PLATFORM="windows"
    ;;
  *)
    echo "❌ Unsupported OS: $OS"
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64|amd64)
    ARCH="x64"
    ;;
  arm64|aarch64)
    ARCH="arm64"
    ;;
  *)
    echo "❌ Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

echo "📦 Detected: $PLATFORM-$ARCH"
echo ""

# Set installation directory
if [ -w "/usr/local/bin" ]; then
  INSTALL_DIR="/usr/local/bin"
else
  INSTALL_DIR="$HOME/.local/bin"
  mkdir -p "$INSTALL_DIR"
fi

# Download URL (update with your actual release URL)
REPO="your-username/incident-commander"
VERSION="latest"
BINARY_NAME="ic-$PLATFORM-$ARCH"
DOWNLOAD_URL="https://github.com/$REPO/releases/$VERSION/download/$BINARY_NAME"

echo "📥 Downloading from: $DOWNLOAD_URL"
echo "📂 Installing to: $INSTALL_DIR/ic"
echo ""

# Download binary
if command -v curl &> /dev/null; then
  curl -fsSL "$DOWNLOAD_URL" -o "$INSTALL_DIR/ic"
elif command -v wget &> /dev/null; then
  wget -q "$DOWNLOAD_URL" -O "$INSTALL_DIR/ic"
else
  echo "❌ Neither curl nor wget found. Please install one of them."
  exit 1
fi

# Make executable
chmod +x "$INSTALL_DIR/ic"

# Verify installation
if [ -x "$INSTALL_DIR/ic" ]; then
  echo "✅ Successfully installed!"
  echo ""
  
  # Check if in PATH
  if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then
    echo "🎉 Ready to use: ic --version"
  else
    echo "⚠️  Add to your PATH:"
    echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
    echo ""
    echo "Add this to ~/.bashrc or ~/.zshrc to make it permanent:"
    echo "  echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.bashrc"
  fi
  
  echo ""
  echo "📚 Get started:"
  echo "  1. Get API key: https://your-app.com → Profile → API Keys"
  echo "  2. Configure: ic config --endpoint https://your-app.com --key <key>"
  echo "  3. Analyze: ic analyze logs.txt"
  echo "  4. Watch: ic watch /var/log/app.log"
  echo ""
  echo "📖 Documentation: https://github.com/$REPO"
else
  echo "❌ Installation failed"
  exit 1
fi
