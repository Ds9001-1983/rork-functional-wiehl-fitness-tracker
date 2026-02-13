# Functional Wiehl Fitness Tracker

## Projekt-Uebersicht
Fitness-Tracker App fuer das Fitnessstudio "Functional Wiehl". Entwickelt von SUPERBAND Marketing.
Sprache der UI: Deutsch (de-DE).

## Tech Stack
- **Frontend**: Expo 53 + React 19 + React Native 0.79.7 + TypeScript
- **Backend**: Hono + tRPC v11 auf Bun (`backend/hono.ts`)
- **Datenbank**: PostgreSQL (mit In-Memory-Fallback)
- **Auth**: bcrypt + JWT
- **State Management**: @nkzw/create-context-hook + AsyncStorage
- **Styling**: NativeWind (Dark Theme, Accent: #FF6B35)
- **Routing**: Expo Router (File-based)
- **Testing**: bun test (built-in runner)
- **Deployment**: PM2 + Nginx + Bun auf Hetzner CX22

## Wichtige Befehle
```bash
bun run server          # Backend starten (Port 3000)
bun test                # Tests ausfuehren (19 Tests)
bun run build-web       # Web-Build mit Expo
bun run deploy          # Vollstaendiges Deployment
```

## Projektstruktur
```
app/                    # Expo Router Screens (File-based routing)
  (tabs)/               # Haupt-Tabs: workout, exercises, calendar, stats, profile
  (trainer-tabs)/       # Trainer-spezifische Tabs
  active-workout.tsx    # Aktives Workout mit Timer
  workout-detail/[id].tsx  # Workout-Detail-Ansicht
  routines.tsx          # Routinen-Verwaltung
backend/
  hono.ts               # Hono Server Entry (Bun.serve)
  storage.ts             # Zentrale Daten-Abstraktion (DB + Memory)
  trpc/
    app-router.ts        # Alle tRPC Routes
    create-context.ts    # tRPC Context & Router Factory
    routes/              # Einzelne tRPC Prozeduren
hooks/
  use-auth.tsx           # Auth mit Server-Sync
  use-workouts.tsx       # Workouts, Plans, Routinen, Records, MuscleVolume
  use-clients.tsx        # Client-Management (Trainer)
components/
  RestTimer.tsx          # Rest-Timer (Countdown, Play/Pause, Vibration)
  WorkoutSetRow.tsx      # Set-Eingabe mit Typen (Normal/Warmup/Dropset/Failure)
  ConfirmDialog.tsx      # Bestaetigung fuer destruktive Aktionen
  StatusBanner.tsx       # Erfolg/Fehler-Feedback
  OfflineBanner.tsx      # Netzwerk-Status-Indikator
data/
  exercises.ts           # 80+ Uebungen (8 Kategorien, deutsch)
constants/
  colors.ts              # Design Tokens (Colors, Spacing, BorderRadius)
__tests__/
  storage.test.ts        # 19 Storage-Layer Tests
scripts/
  patch-metro-exports.js # Metro exports-Fix fuer Node 22
```

## tRPC API Routes
- `auth.login` / `auth.updatePassword`
- `clients.create` / `clients.list` / `clients.delete` / `clients.update`
- `invitations.create` / `invitations.list`
- `workouts.create` / `workouts.list` / `workouts.update` / `workouts.delete`
- `plans.create` / `plans.list` / `plans.update` / `plans.delete` / `plans.assign`
- `profile.update`
- `admin.stats` / `admin.users`

## Architektur-Entscheidungen
- **Provider Pattern**: AuthProvider > ClientsProvider > WorkoutProvider (verschachtelt in _layout.tsx)
- **Dual Storage**: PostgreSQL primaer, AsyncStorage als lokaler Fallback
- **Client-Erstellung**: Erstellt IMMER sowohl `users`- als auch `clients`-Tabellen-Eintraege
- **tRPC**: Alle Routes nutzen `storage`-Abstraktion (nie direkt DB)
- **PM2**: IMMER `Bun.serve()` explizit verwenden (kein `export default`)
- **postinstall**: Fuehrt `patch-metro-exports.js` automatisch aus

## Bekannte Einschraenkungen
- Passwort-Reset: Nur Platzhalter (kein E-Mail-Service)
- Push-Notifications: Nicht implementiert
- Mobile Builds: Nicht getestet (nur Web)

## Server
- **Domain**: app.functional-wiehl.de (SSL via Nginx)
- **IP**: 128.140.71.33
- **DB**: fitness_app / app_user
- **App-Dir**: /var/www/fitness-app
