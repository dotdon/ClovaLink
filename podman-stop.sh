#!/bin/bash
# Podman stop script for ClovaLink

# Export Docker socket for compose compatibility
export DOCKER_HOST='unix:///var/folders/z0/69n2_wrs087g82y3gzhfl0240000gn/T/podman/podman-machine-default-api.sock'

echo "🛑 Stopping ClovaLink containers..."
podman compose -f podman-compose.yml down

echo ""
echo "✅ ClovaLink containers stopped"
echo ""
echo "📝 Note: Podman machine is still running."
echo "To stop it completely: podman machine stop"
echo ""

