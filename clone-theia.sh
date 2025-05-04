#!/bin/bash

# Script to clone and set up the Theia fork for CodeVibeAI
# This script clones the forked Theia repository and sets up the upstream

set -e  # Exit immediately if a command exits with a non-zero status

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

print_section "Setting up CodeVibeAI Theia Fork"

# Verify GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    print_status "GitHub CLI not found. Installing..."
    brew install gh || print_error "Failed to install GitHub CLI"
    
    print_status "Please authenticate with GitHub:"
    gh auth login
fi

# Check if user is authenticated with GitHub
if ! gh auth status &> /dev/null; then
    print_status "Please authenticate with GitHub:"
    gh auth login || print_error "GitHub authentication failed"
fi

# Verify if the organization exists
print_status "Checking if CodeVibeAI organization exists..."
if ! gh api orgs/CodeVibeAI &> /dev/null; then
    print_error "CodeVibeAI organization not found. Please create it first at https://github.com/organizations/plan"
fi

# Check if the fork already exists
print_status "Checking if fork already exists..."
if gh api repos/CodeVibeAI/theia &> /dev/null; then
    print_status "Fork already exists at https://github.com/CodeVibeAI/theia"
else
    print_status "Creating fork of eclipse-theia/theia in CodeVibeAI organization..."
    gh repo fork eclipse-theia/theia --org CodeVibeAI --clone=false || print_error "Failed to create fork"
fi

# Clone the repository
CLONE_DIR="codevibeai-theia"
if [ -d "$CLONE_DIR" ]; then
    print_status "Directory $CLONE_DIR already exists"
    read -p "Do you want to remove it and clone again? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$CLONE_DIR" || print_error "Failed to remove existing directory"
    else
        print_error "Aborting as directory already exists"
    fi
fi

print_status "Cloning the fork..."
git clone https://github.com/CodeVibeAI/theia.git "$CLONE_DIR" || print_error "Clone failed"

# Change to the cloned directory
cd "$CLONE_DIR" || print_error "Failed to change to directory $CLONE_DIR"
print_status "Successfully cloned to $(pwd)"

# Add upstream repository
print_status "Adding upstream repository..."
git remote add upstream https://github.com/eclipse-theia/theia.git || print_error "Failed to add upstream remote"

# Fetch all refs from both remotes
print_status "Fetching all refs from remotes..."
git fetch --all --tags || print_error "Failed to fetch refs"

# Get the latest tag
print_status "Finding latest tag..."
LATEST_TAG=$(git describe --tags `git rev-list --tags --max-count=1`)
if [ -z "$LATEST_TAG" ]; then
    print_error "Failed to find the latest tag"
fi

print_status "Latest tag is $LATEST_TAG"

# Checkout the latest tag
print_status "Checking out the latest tag..."
git checkout "$LATEST_TAG" || print_error "Failed to checkout tag $LATEST_TAG"

# Create a branch from the tag
BRANCH_NAME="codevibeai-dev"
print_status "Creating development branch '$BRANCH_NAME' from tag $LATEST_TAG..."
git checkout -b "$BRANCH_NAME" || print_error "Failed to create branch $BRANCH_NAME"

print_section "Setup Complete"
print_status "Theia has been successfully cloned and set up for CodeVibeAI"
print_status "Current directory: $(pwd)"
print_status "Current branch: $(git branch --show-current)"
print_status "Based on tag: $LATEST_TAG"
print_status ""
print_status "Next steps:"
print_status "1. Make your modifications"
print_status "2. Push your changes: git push -u origin $BRANCH_NAME"
print_status "3. Start development with: yarn"