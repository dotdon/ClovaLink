# Migration to Podman - Complete ✅

ClovaLink has been **fully migrated** from Docker to Podman.

## What Changed

### Removed Docker Files
- ❌ `docker-compose.yml` 
- ❌ `docker-compose.prod.yml`
- ❌ `Dockerfile`
- ❌ `docker-entrypoint.sh`
- ❌ `nginx.conf`
- ❌ `DOCKER_SETUP.md`

### Added Podman Files
- ✅ `podman-compose.yml` - Development configuration
- ✅ `podman-compose.prod.yml` - Production configuration
- ✅ `podman-start.sh` - Easy startup script
- ✅ `podman-stop.sh` - Easy stop script
- ✅ `PODMAN_SETUP.md` - Complete Podman guide

### Updated Documentation
- ✅ `README.md` - Updated for Podman-only setup
- ✅ `.gitignore` - Added `.envrc` exclusion

## Why Podman?

1. **Better Security** - Rootless containers by default
2. **No Daemon** - Simpler architecture, less overhead
3. **Docker Compatible** - Same commands, same workflows
4. **Better Performance** - Especially on macOS
5. **OCI Compliant** - Works with all standard container images

## Quick Start

```bash
# First time setup
podman machine init
podman machine start

# Start ClovaLink
./podman-start.sh

# Stop ClovaLink
./podman-stop.sh
```

## Benefits Over Docker

- ✅ Fixed filesystem permission errors on macOS
- ✅ Faster file watching with optimized volumes
- ✅ No daemon process consuming resources
- ✅ More secure default configuration
- ✅ Simpler troubleshooting

## Migration Notes

All existing data in volumes is preserved:
- `postgres_data` - Database data
- `node_modules_cache` - NPM packages
- `next_cache` - Next.js build cache (new!)
- `uploads` - User uploaded files

## Configuration Improvements

The new `podman-compose.yml` includes:
- Dedicated volume for `.next` cache (fixes macOS errors)
- `delegated` mount mode for better performance
- `WATCHPACK_POLLING=true` for reliable file watching
- Optimized health checks
- Better restart policies

## Resources

- [PODMAN_SETUP.md](PODMAN_SETUP.md) - Complete setup guide
- [README.md](README.md) - Updated quick start
- [Podman Documentation](https://podman.io/)

---

**Migration completed**: November 11, 2025
**Status**: ✅ Production Ready

