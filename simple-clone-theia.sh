#!/bin/bash

# Simplified script to clone and set up the Theia fork for CodeVibeAI
# This assumes GitHub authentication is already set up

set -e  # Exit immediately if a command exits with a non-zero status

echo "=== Cloning and setting up Theia for CodeVibeAI ==="

# Clone the repository
CLONE_DIR="codevibeai-theia"
if [ -d "$CLONE_DIR" ]; then
    echo "Directory $CLONE_DIR already exists"
    read -p "Do you want to remove it and clone again? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$CLONE_DIR"
    else
        echo "Aborting as directory already exists"
        exit 1
    fi
fi

echo "Cloning the fork from https://github.com/CodeVibeAI/theia.git..."
git clone https://github.com/CodeVibeAI/theia.git "$CLONE_DIR" || {
    echo "Clone failed. Make sure the fork exists at https://github.com/CodeVibeAI/theia"
    echo "If not, go to https://github.com/eclipse-theia/theia and fork it to the CodeVibeAI organization"
    exit 1
}

# Change to the cloned directory
cd "$CLONE_DIR" || {
    echo "Failed to change to directory $CLONE_DIR"
    exit 1
}
echo "Successfully cloned to $(pwd)"

# Add upstream repository
echo "Adding upstream repository..."
git remote add upstream https://github.com/eclipse-theia/theia.git

# Fetch all refs from both remotes
echo "Fetching all refs from remotes..."
git fetch --all --tags

# Get the latest tag
echo "Finding latest tag..."
LATEST_TAG=$(git describe --tags `git rev-list --tags --max-count=1`)
if [ -z "$LATEST_TAG" ]; then
    echo "Failed to find the latest tag"
    exit 1
fi

echo "Latest tag is $LATEST_TAG"

# Checkout the latest tag
echo "Checking out the latest tag..."
git checkout "$LATEST_TAG"

# Create a branch from the tag
BRANCH_NAME="codevibeai-dev"
echo "Creating development branch '$BRANCH_NAME' from tag $LATEST_TAG..."
git checkout -b "$BRANCH_NAME"

echo "=== Setup Complete ==="
echo "Theia has been successfully cloned and set up for CodeVibeAI"
echo "Current directory: $(pwd)"
echo "Current branch: $(git branch --show-current)"
echo "Based on tag: $LATEST_TAG"
echo ""
echo "Next steps:"
echo "1. Make your modifications"
echo "2. Push your changes: git push -u origin $BRANCH_NAME"
echo "3. Start development with: yarn"