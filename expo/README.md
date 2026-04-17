# Functional Wiehl Fitness Tracker

Single-Studio Fitness-Tracker-App für Functional Wiehl.

Siehe [CLAUDE.md](./CLAUDE.md) für Architektur, Tech-Stack und Befehle.

## Quick Start

```bash
bun install
bun run server      # Backend starten (Port 3000)
bun run start       # Expo Dev-Server mit Tunnel
bun test            # Unit-Tests
bun run typecheck   # TypeScript prüfen
```

## Deployment

- **iOS**: `bun run build:ios-prod` → EAS Build → App Store
- **Web**: `bun run deploy` → Hetzner

Siehe `deployment-guide.md` für vollständige Anleitung.
