# Podman Setup for ClovaLink

ClovaLink uses **Podman** as its container runtime. This document covers installation, usage, and troubleshooting.

## Why Podman?

Podman is a daemonless container engine with several advantages:
- **Better security** - Rootless containers by default
- **No daemon required** - Simpler architecture
- **OCI compliant** - Works with standard container images
- **Docker compatible** - Uses same commands and compose files
- **Better performance** - Especially on macOS

## Quick Start

### 1. Start ClovaLink with Podman

```bash
./podman-start.sh
```

This script will:
- Start the Podman machine if not running
- Launch all ClovaLink containers
- Display the access URL and useful commands

### 2. Stop ClovaLink

```bash
./podman-stop.sh
```

## Manual Commands

If you prefer manual control:

```bash
# Start Podman machine (first time only)
podman machine init
podman machine start

# Set Docker socket environment variable
export DOCKER_HOST='unix:///var/folders/z0/69n2_wrs087g82y3gzhfl0240000gn/T/podman/podman-machine-default-api.sock'

# Start containers
podman compose up -d

# View logs
podman compose logs -f

# Stop containers
podman compose down

# Stop Podman machine (optional)
podman machine stop
```

## Persistent Configuration

To avoid setting `DOCKER_HOST` every time, add this to your shell profile:

### For Zsh (default on macOS):

Add to `~/.zshrc`:
```bash
# Podman Docker compatibility
export DOCKER_HOST='unix:///var/folders/z0/69n2_wrs087g82y3gzhfl0240000gn/T/podman/podman-machine-default-api.sock'

# Optional: Create docker alias to use podman
alias docker='podman'
```

### For Bash:

Add to `~/.bash_profile` or `~/.bashrc`:
```bash
# Podman Docker compatibility
export DOCKER_HOST='unix:///var/folders/z0/69n2_wrs087g82y3gzhfl0240000gn/T/podman/podman-machine-default-api.sock'

# Optional: Create docker alias to use podman
alias docker='podman'
```

Then reload your shell:
```bash
source ~/.zshrc  # or source ~/.bash_profile
```

## Useful Commands

```bash
# Check Podman machine status
podman machine ls

# View container status
podman compose ps

# View all logs
podman compose logs -f

# View specific service logs
podman compose logs -f app
podman compose logs -f db

# Restart containers
podman compose restart

# Rebuild containers
podman compose up -d --build

# Enter app container shell
podman compose exec app bash

# Run Prisma commands
podman compose exec app npx prisma studio
podman compose exec app npx prisma db push
```

## Compose File

ClovaLink uses `podman-compose.yml` for its configuration. Key features:

- **Optimized volumes**: Dedicated cache volumes prevent filesystem conflicts
- **Delegated mounting**: Better performance on macOS
- **File watching**: Enabled via `WATCHPACK_POLLING`
- **Health checks**: Automatic container health monitoring

## Troubleshooting

### Machine not starting
```bash
podman machine stop
podman machine rm
podman machine init
podman machine start
```

### Containers not accessible
Make sure the `DOCKER_HOST` environment variable is set (only needed if not using scripts):
```bash
export DOCKER_HOST='unix:///var/folders/z0/69n2_wrs087g82y3gzhfl0240000gn/T/podman/podman-machine-default-api.sock'
```

Or add to your shell profile permanently (see instructions above).

### Volume permission issues
The `podman-compose.yml` includes optimizations:
- Dedicated volume for `.next` cache
- `delegated` mount option for better macOS performance
- `WATCHPACK_POLLING=true` for file watching
- Named volumes for node_modules and postgres data

### Port already in use
If port 3000 or 5432 is already in use:
```bash
# Find process using port
lsof -i :3000
lsof -i :5432

# Kill the process or change ports in podman-compose.yml
```

### Slow startup
First startup is slow due to npm install. Subsequent startups are faster thanks to:
- Volume caching for node_modules
- `.installed` flag to skip reinstalls

## Performance Tips

1. **Keep Podman machine running** - Starting/stopping frequently is slow
2. **Allocate adequate resources**:
   ```bash
   podman machine stop
   podman machine set --cpus 4 --memory 4096
   podman machine start
   ```
3. **Clean up old containers/volumes** periodically:
   ```bash
   podman system prune -a
   ```

## Advanced Configuration

### Production Deployment

Use `podman-compose.prod.yml` for production:
```bash
export DOCKER_HOST='unix:///var/folders/z0/69n2_wrs087g82y3gzhfl0240000gn/T/podman/podman-machine-default-api.sock'
podman compose -f podman-compose.prod.yml up -d
```

### Custom Podman Machine

Create a machine with specific resources:
```bash
podman machine init --cpus 4 --memory 8192 --disk-size 100 clovalink-machine
podman machine start clovalink-machine
```

