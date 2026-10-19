# AACII - Systems in motion

Next.js foundation for the AACII digital systems studio. Section and treatment components are intentionally minimal stubs for their assigned workers.

Use Node v24.11.1 and npm. The architecture and ownership contracts are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Asset provenance is in [docs/ASSETS.md](docs/ASSETS.md).

## Commands

- npm run dev -- --port 3000
- npm run lint
- npm run typecheck
- npm run build
- npm run check
- npm run start -- --port 3000

Set NEXT_PUBLIC_SITE_URL for the canonical origin. VERCEL_PROJECT_PRODUCTION_URL is the secondary source; local development defaults to http://localhost:3000.

Shared content exports: site, hero, experimental, contact and footer in site.ts; navigation, manifesto, projects and projectsCopy, capabilities and capabilitiesCopy in their matching data files.

FullscreenShader exports ShaderFrame with state, delta, time and uniforms. R3F owns and disposes its geometry, material and renderer, including forceContextLoss. Consumers update their uniforms through onFrame.

No browser or shader runtime QA was performed during foundation delivery.
