# Functional Wiehl Fitness Tracker

## Projekt-Uebersicht
Fitness-Tracker App fuer das Fitnessstudio "Functional Wiehl". Entwickelt von SUPERBAND Marketing.
Sprache der UI: Deutsch (de-DE). Zukunft: B2B SaaS White-Label Plattform fuer Fitnessstudios.

## Tech Stack
- **Frontend**: Expo 53 + React 19 + React Native 0.79.7 + TypeScript
- **Backend**: Hono + tRPC v11 auf Bun (`backend/hono.ts`)
- **Datenbank**: PostgreSQL (mit In-Memory-Fallback)
- **Auth**: bcrypt + JWT + E-Mail-Reset (Resend API)
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
  (admin-tabs)/         # Admin-Dashboard (Stats, Users, System)
  active-workout.tsx    # Aktives Workout mit Timer
  workout-detail/[id].tsx  # Workout-Detail-Ansicht
  routines.tsx          # Routinen-Verwaltung (sortierbar)
  onboarding.tsx        # 3-Schritt Wizard (Ziel, Level, Trainingstage)
  leaderboard.tsx       # Studio-Rangliste nach XP
  challenges.tsx        # Studio-Challenges (Trainer erstellt, Mitglieder treten bei)
  body-measurements.tsx # Koerpermasse-Tracking + Trends
  reset-password.tsx    # Token-basierter Passwort-Reset
backend/
  hono.ts               # Hono Server Entry (Bun.serve)
  storage.ts             # Zentrale Daten-Abstraktion (11 Tabellen, DB + Memory)
  trpc/
    app-router.ts        # Alle tRPC Routes (31 Prozeduren)
    create-context.ts    # tRPC Context, JWT, Role-Middleware
    routes/              # Einzelne tRPC Prozeduren
hooks/
  use-auth.tsx           # Auth mit Server-Sync + Reset
  use-workouts.tsx       # Workouts, Plans, Routinen, Records, MuscleVolume
  use-clients.tsx        # Client-Management (Trainer)
  use-gamification.tsx   # XP, Badges, Streaks, Levels (Server-Sync)
components/
  RestTimer.tsx          # Rest-Timer (konfigurierbar, Play/Pause, Vibration)
  WorkoutSetRow.tsx      # Set-Eingabe mit Typen (Normal/Warmup/Dropset/Failure)
  ConfirmDialog.tsx      # Bestaetigung fuer destruktive Aktionen
  StatusBanner.tsx       # Erfolg/Fehler-Feedback
  OfflineBanner.tsx      # Netzwerk-Status-Indikator
data/
  exercises.ts           # 80+ Uebungen (8 Kategorien, deutsch)
  badges.ts              # 18 Badges (4 Kategorien)
  coaching-messages.ts   # 4 Ton-Profile (Motivator/Competitor/Scientist/Buddy)
constants/
  colors.ts              # Design Tokens (Colors, Spacing, BorderRadius)
types/
  workout.ts             # Workout, Exercise, BodyMeasurement, PersonalRecord
  gamification.ts        # XP, Levels, Badges, Streaks
__tests__/
  storage.test.ts        # 19 Storage-Layer Tests
```

## tRPC API Routes (31 Prozeduren)
- `auth.login` / `auth.updatePassword` / `auth.requestReset` / `auth.resetPassword`
- `clients.create` / `clients.list` / `clients.delete` / `clients.update`
- `invitations.create` / `invitations.list`
- `workouts.create` / `workouts.list` / `workouts.update` / `workouts.delete`
- `plans.create` / `plans.list` / `plans.update` / `plans.delete` / `plans.assign`
- `profile.update`
- `admin.stats` / `admin.users` (adminProcedure geschuetzt)
- `measurements.create` / `measurements.list`
- `gamification.get` / `gamification.sync` / `gamification.leaderboard`
- `routines.create` / `routines.list` / `routines.update` / `routines.delete`
- `challenges.create` / `challenges.list` / `challenges.join` / `challenges.progress`

## DB-Tabellen (11)
`users`, `clients`, `invitations`, `workouts`, `workout_plans`,
`password_reset_tokens`, `body_measurements`, `gamification`,
`routines`, `challenges`, `challenge_progress`

## Architektur-Entscheidungen
- **Provider Pattern**: AuthProvider > ClientsProvider > WorkoutProvider > GamificationProvider
- **Dual Storage**: PostgreSQL primaer, AsyncStorage als lokaler Fallback
- **Client-Erstellung**: Erstellt IMMER sowohl `users`- als auch `clients`-Tabellen-Eintraege
- **tRPC**: Alle Routes nutzen `storage`-Abstraktion (nie direkt DB)
- **Role Middleware**: `publicProcedure`, `protectedProcedure`, `trainerProcedure`, `adminProcedure`
- **Gamification**: Server-Sync mit AsyncStorage-Fallback (Leaderboard benoetigt Server-Daten)
- **PM2**: IMMER `Bun.serve()` explizit verwenden (kein `export default`)
- **postinstall**: Fuehrt `patch-metro-exports.js` automatisch aus

## Bekannte Einschraenkungen
- Push-Notifications: Noch nicht implementiert
- Mobile Builds: Nicht getestet (nur Web)
- Multi-Tenant: Noch nicht implementiert (aktuell Single-Studio)
- Passwort-Reset E-Mail: Braucht RESEND_API_KEY in .env

## Server
- **Domain**: app.functional-wiehl.de (SSL via Nginx)
- **IP**: 128.140.71.33
- **DB**: fitness_app / app_user
- **App-Dir**: /var/www/fitness-app
