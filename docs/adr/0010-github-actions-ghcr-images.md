# ADR-0010: Publish Production Docker Images From GitHub Actions To GHCR

**Status:** Accepted  
**Date:** 2026-04-30

## Context

Dockhand can build Compose services from the repository, but production hosts should not spend deploy time and CPU on repeatable application builds. Builds also need a clear artifact trail so a deployed version can be tied to a Git commit and rolled back without rebuilding source code.

The project has three application-owned runtime artifacts:

- Next.js application image
- Prisma migration runner image
- WebSocket server image

PostgreSQL and Redis remain official upstream images.

## Decision

GitHub Actions builds the project-owned Docker images on pull requests and publishes them to GitHub Container Registry on pushes to `dev` and `main`:

- `ghcr.io/mitya-shepelev/magazin-my-app:<tag>`
- `ghcr.io/mitya-shepelev/magazin-my-migrate:<tag>`
- `ghcr.io/mitya-shepelev/magazin-my-ws:<tag>`

Images are tagged by branch (`dev`, `main`) and by commit (`sha-<short-sha>`).

Dockhand production Compose uses GHCR images by default and no longer builds the application images on the deployment host. Production normally uses the `main` tags. Staging can use `dev` tags or exact `sha-<short-sha>` tags.

## Consequences

Deploys are faster and more predictable because Dockhand pulls prebuilt artifacts instead of building them.

Rollback is clearer because a stack can pin all three project images to matching `sha-<short-sha>` tags.

GitHub Actions and GHCR become part of the production release path, so package permissions and registry access must be maintained. If packages are private, Dockhand needs read credentials for `ghcr.io`.
