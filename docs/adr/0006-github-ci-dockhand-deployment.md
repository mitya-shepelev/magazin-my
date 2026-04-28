# ADR-0006: GitHub CI And Dockhand Production Deployment

**Status:** Accepted  
**Date:** 2026-04-28

## Context

The project needs a clear delivery path from local development to production. The repository is hosted on GitHub, while production deployment should run through Dockhand because it works well with Compose and stack files.

## Decision

Use GitHub as the source of truth for code, CI configuration, PR review, and deployment definitions. Use Dockhand to deploy production from repository-managed Compose/stack files.

Production deployment definition lives in:

- `deploy/dockhand/compose.prod.yml`
- `docs/DEPLOYMENT.md` for environment variable reference

Normal delivery flow:

1. Develop locally with Docker Desktop for infrastructure.
2. Create feature branches from `dev`.
3. Open PRs into `dev`.
4. Run GitHub Actions CI and review before merge.
5. Create release PRs from `dev` into `main`.
6. Dockhand deploys the production stack from the GitHub repository.

## Consequences

- Deployment configuration is versioned with the application.
- Production changes are reviewable through PRs.
- Dockhand does not become the place where undocumented production drift accumulates.
- Secrets stay in Dockhand or GitHub environment settings, not in committed files.
- CI must stay green before branch protection can safely block merges.
- Compose/stack files need to be kept compatible with Dockhand's supported runtime behavior.
