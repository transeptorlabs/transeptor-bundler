#!/usr/bin/env bash

set -e

REQUIRED_NODE_VERSION="22.14.0"
REQUIRED_YARN_VERSION="4.7.0"
REQUIRED_FORGE_VERSION="1.1.0"

function check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "❌ $1 is not installed."
    exit 1
  fi
}

function check_version() {
  local name=$1
  local current=$2
  local required=$3

  if [ "$(printf "%s\n%s" "$required" "$current" | sort -V | head -n1)" != "$required" ]; then
    echo "❌ $name version $current is too old. Required: $required"
    exit 1
  else
    echo "✅ $name version $current"
  fi
}

echo "🔍 Checking development environment prerequisites..."

check_command node
NODE_VERSION=$(node -v | sed 's/v//')
check_version "Node.js" "$NODE_VERSION" "$REQUIRED_NODE_VERSION"

check_command yarn
YARN_VERSION=$(yarn -v)
check_version "Yarn" "$YARN_VERSION" "$REQUIRED_YARN_VERSION"

check_command git
GIT_VERSION=$(git --version | awk '{print $3}')
echo "✅ Git version $GIT_VERSION (no strict version requirement)"

check_command docker
check_command docker compose

DOCKER_COMPOSE_VERSION=$(docker compose version --short)
echo "✅ Docker Compose v2 detected (version $DOCKER_COMPOSE_VERSION)"

check_command forge
FORGE_VERSION=$(forge --version | head -n1 | awk '{print $2}')
check_version "Foundry (forge)" "$FORGE_VERSION" "$REQUIRED_FORGE_VERSION"

echo "🎉 All prerequisites met!"
