#!/bin/bash
# Podman startup script for ClovaLink

# Start podman machine if not running
if ! podman machine inspect podman-machine-default --format "{{.State}}" 2>/dev/null | grep -q "running"; then
    echo "🚀 Starting Podman machine..."
    podman machine start
else
    echo "✅ Podman machine is already running"
fi

# Export Docker socket for compose compatibility
export DOCKER_HOST='unix:///var/folders/z0/69n2_wrs087g82y3gzhfl0240000gn/T/podman/podman-machine-default-api.sock'

# Start containers
echo "🐳 Starting ClovaLink containers..."
podman compose -f podman-compose.yml up -d

echo ""
echo "✅ ClovaLink is running!"
echo "🌐 Access at: http://localhost:3000"
echo ""
echo "📋 Useful commands:"
echo "  ./podman-stop.sh              # Stop containers"
echo "  podman compose logs -f        # View all logs"
echo "  podman compose logs -f app    # View app logs only"
echo "  podman compose ps             # Check container status"
echo "  podman compose restart        # Restart containers"
echo ""

