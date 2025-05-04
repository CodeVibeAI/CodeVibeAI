#!/bin/bash

# CodeVibeAI Development Environment Setup Script for macOS
# This script sets up the development environment for CodeVibeAI,
# a vibe coding IDE based on Theia, integrated with Context7 and Claude APIs.

set -e  # Exit immediately if a command exits with a non-zero status

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print section headers
print_section() {
    echo "==============================================="
    echo "  $1"
    echo "==============================================="
}

# Function to print status messages
print_status() {
    echo "→ $1"
}

# Function to print error messages and exit
print_error() {
    echo "❌ ERROR: $1" >&2
    exit 1
}

# Check if running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
    print_error "This script is only compatible with macOS"
fi

print_section "Setting up CodeVibeAI Development Environment"

# Install Homebrew if not already installed
if ! command_exists brew; then
    print_status "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || print_error "Failed to install Homebrew"
    
    # Add Homebrew to PATH
    if [[ -f ~/.zshrc ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -f ~/.bash_profile ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.bash_profile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    print_status "Homebrew is already installed. Updating..."
    brew update || print_error "Failed to update Homebrew"
fi

# Install Docker Desktop if not already installed
if ! command_exists docker; then
    print_status "Installing Docker Desktop..."
    brew install --cask docker || print_error "Failed to install Docker Desktop"
    print_status "Please start Docker Desktop manually after installation"
else
    print_status "Docker is already installed"
fi

# Install Node.js 18.x LTS if not already installed or if version is different
if ! command_exists node; then
    print_status "Installing Node.js 18.x LTS..."
    brew install node@18 || print_error "Failed to install Node.js"
    
    echo 'export PATH="/opt/homebrew/opt/node@18/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/opt/node@18/bin:$PATH"
else
    NODE_VERSION=$(node -v)
    if [[ ! "$NODE_VERSION" =~ ^v18\. ]]; then
        print_status "Current Node.js version is $NODE_VERSION. Installing Node.js 18.x LTS..."
        brew unlink node
        brew install node@18 || print_error "Failed to install Node.js 18.x"
        brew link --overwrite --force node@18
        
        echo 'export PATH="/opt/homebrew/opt/node@18/bin:$PATH"' >> ~/.zshrc
        export PATH="/opt/homebrew/opt/node@18/bin:$PATH"
    else
        print_status "Node.js $NODE_VERSION is already installed"
    fi
fi

# Install git if not already installed
if ! command_exists git; then
    print_status "Installing git..."
    brew install git || print_error "Failed to install git"
else
    print_status "git is already installed"
fi

# Install yarn if not already installed
if ! command_exists yarn; then
    print_status "Installing yarn..."
    npm install -g yarn || print_error "Failed to install yarn"
else
    print_status "yarn is already installed"
fi

# Create project directory structure
print_section "Creating CodeVibeAI project structure"

PROJECT_ROOT="$PWD/codevibeai-theia"
print_status "Creating project root at: $PROJECT_ROOT"

if [ -d "$PROJECT_ROOT" ]; then
    read -p "Directory already exists. Overwrite? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Skipping directory creation"
    else
        rm -rf "$PROJECT_ROOT"
        mkdir -p "$PROJECT_ROOT"
    fi
else
    mkdir -p "$PROJECT_ROOT"
fi

# Create project subdirectories
if [ -d "$PROJECT_ROOT" ]; then
    cd "$PROJECT_ROOT"
    
    for dir in packages extensions examples docs scripts; do
        print_status "Creating $dir/ directory"
        mkdir -p "$dir"
    done
    
    # Create a basic README file
    cat > README.md << 'EOF'
# CodeVibeAI

A vibe coding IDE based on Theia, integrated with Context7 and Claude APIs.

## Project Structure

- `packages/`: Core modules
- `extensions/`: Theia extensions
- `examples/`: Example applications
- `docs/`: Documentation
- `scripts/`: Utility scripts

## Development Setup

Run the `setup-codevibeai.sh` script to set up your development environment.
EOF

    print_status "Created basic README.md file"
    
    # Create a basic package.json file
    cat > package.json << 'EOF'
{
  "private": true,
  "name": "codevibeai-root",
  "version": "0.1.0",
  "engines": {
    "node": ">=18.0.0"
  },
  "workspaces": [
    "packages/*",
    "extensions/*",
    "examples/*"
  ],
  "scripts": {
    "prepare": "yarn run build",
    "build": "lerna run build",
    "clean": "lerna run clean",
    "start": "echo \"Add start script here\"",
    "test": "echo \"Add test script here\""
  },
  "devDependencies": {
    "lerna": "^6.0.0"
  }
}
EOF

    print_status "Created basic package.json file"
    
    print_status "Initializing git repository"
    git init
    
    # Create a basic .gitignore file
    cat > .gitignore << 'EOF'
# Node.js
node_modules/
npm-debug.log
yarn-error.log
yarn-debug.log

# Build output
lib/
dist/
.theia/
*.vsix

# IDE files
.idea/
.vscode/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# macOS
.DS_Store
.AppleDouble
.LSOverride
._*

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
EOF

    print_status "Created basic .gitignore file"
    
    print_section "Installation Complete"
    print_status "CodeVibeAI development environment has been set up successfully!"
    print_status "Project created at: $PROJECT_ROOT"
    print_status "Next steps:"
    print_status "1. cd $PROJECT_ROOT"
    print_status "2. yarn install"
    print_status "3. Start developing!"
else
    print_error "Failed to create project directory structure"
fi