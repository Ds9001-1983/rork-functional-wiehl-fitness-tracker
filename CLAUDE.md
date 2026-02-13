# Functional Wiehl Fitness Tracker

## Projekt-Uebersicht
Multi-Tenant B2B SaaS Fitness-Tracker Plattform. Entwickelt von SUPERBAND Marketing.
Sprache der UI: Deutsch (de-DE). Functional Wiehl ist Studio #1.

## Tech Stack
- **Frontend**: Expo 53 + React 19 + React Native 0.79.7 + TypeScript
- **Backend**: Hono + tRPC v11 auf Bun (`backend/hono.ts`)
- **Datenbank**: PostgreSQL (14 Tabellen, mit In-Memory-Fallback)
- **Auth**: bcrypt + JWT (mit studioId) + E-Mail-Reset (Resend API)
- **Multi-Tenant**: studio_id auf allen Tabellen, JWT studioId, X-Studio-Id Header
- **State Management**: @nkzw/create-context-hook + AsyncStorage
- **Styling**: NativeWind (Dark Theme, per-Studio Branding moeglich)
- **Routing**: Expo Router (File-based)
- **Testing**: bun test (built-in runner)
- **Deployment**: PM2 + Nginx + Bun auf Hetzner CX22

## Wichtige Befehle
```bash
bun run server          # Backend starten (Port 3000)
bun test                # Tests ausfuehren (24 Tests)
bun run build-web       # Web-Build mit Expo
bun run deploy          # Vollstaendiges Deployment
```

## Projektstruktur
```
app/                    # Expo Router Screens (File-based routing)
  (tabs)/               # Haupt-Tabs: workout, exercises, calendar, stats, profile
  (trainer-tabs)/       # Trainer-spezifische Tabs
  (admin-tabs)/         # Admin-Dashboard (Stats, Users, System)
  (superadmin-tabs)/    # SUPERBAND Admin (Studios, Stats, Profil)
  active-workout.tsx    # Aktives Workout mit Timer
  workout-detail/[id].tsx  # Workout-Detail-Ansicht
  routines.tsx          # Routinen-Verwaltung (sortierbar, Server-Sync)
  onboarding.tsx        # 3-Schritt Wizard (Ziel, Level, Trainingstage) + Auto-Routing
  leaderboard.tsx       # Studio-Rangliste nach XP (studio-scoped)
  challenges.tsx        # Studio-Challenges (studio-scoped)
  body-measurements.tsx # Koerpermasse-Tracking + Trends
  notifications.tsx     # In-App Benachrichtigungen (Bell-Icon + FlatList)
  reset-password.tsx    # Token-basierter Passwort-Reset
backend/
  hono.ts               # Hono Server Entry (Bun.serve, CORS mit X-Studio-Id)
  storage.ts             # Zentrale Daten-Abstraktion (14 Tabellen, DB + Memory)
  trpc/
    app-router.ts        # Alle tRPC Routes (39 Prozeduren, 13 Router)
    create-context.ts    # tRPC Context, JWT mit studioId, 5 Role-Middlewares
    routes/              # Einzelne tRPC Prozeduren
      studios/           # Studio CRUD (get, update, list, create)
hooks/
  use-auth.tsx           # Auth mit Server-Sync + Reset + studioId
  use-workouts.tsx       # Workouts, Plans, Routinen (Server-Sync), Records, MuscleVolume
  use-clients.tsx        # Client-Management (Trainer)
  use-gamification.tsx   # XP, Badges, Streaks, Levels (Server-Sync)
  use-notifications.tsx  # In-App Benachrichtigungen (Server-Sync)
  use-studio.tsx         # Studio-Branding + Colors Context
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
  storage.test.ts        # 24 Storage-Layer Tests
```

## tRPC API Routes (39 Prozeduren, 13 Router)
- `auth.login` / `auth.updatePassword` / `auth.requestReset` / `auth.resetPassword`
- `clients.create` (trainerProcedure) / `clients.list` (protectedProcedure) / `clients.delete` / `clients.update`
- `invitations.create` (trainerProcedure) / `invitations.list` (trainerProcedure)
- `workouts.create` (protectedProcedure) / `workouts.list` (protectedProcedure) / `workouts.update` / `workouts.delete`
- `plans.create` (trainerProcedure) / `plans.list` (protectedProcedure) / `plans.update` / `plans.delete` / `plans.assign`
- `profile.update`
- `admin.stats` / `admin.users` (adminProcedure, studio-scoped)
- `measurements.create` / `measurements.list`
- `gamification.get` / `gamification.sync` / `gamification.leaderboard` (studio-scoped)
- `routines.create` / `routines.list` / `routines.update` / `routines.delete`
- `challenges.create` (trainerProcedure, studio-scoped) / `challenges.list` (studio-scoped) / `challenges.join` / `challenges.progress`
- `notifications.list` / `notifications.markRead` / `notifications.markAllRead` / `notifications.unreadCount`
- `studios.get` (protectedProcedure) / `studios.update` (adminProcedure) / `studios.list` (superadminProcedure) / `studios.create` (superadminProcedure)

## DB-Tabellen (14)
`users`, `clients`, `invitations`, `workouts`, `workout_plans`,
`password_reset_tokens`, `body_measurements`, `gamification`,
`routines`, `challenges`, `challenge_progress`, `notifications`,
`studios`, `studio_members`
- Alle Daten-Tabellen haben `studio_id` (DEFAULT 1 = Functional Wiehl)

## Architektur-Entscheidungen
- **Multi-Tenant**: studio_id auf allen Tabellen, JWT enthaelt studioId, Storage-Methoden filtern nach studioId
- **Provider Pattern**: AuthProvider > StudioProvider > ClientsProvider > WorkoutProvider > GamificationProvider > NotificationProvider
- **Dual Storage**: PostgreSQL primaer, AsyncStorage als lokaler Fallback
- **Client-Erstellung**: Erstellt IMMER sowohl `users`- als auch `clients`-Tabellen-Eintraege + studio_members
- **tRPC**: Alle Routes nutzen `storage`-Abstraktion (nie direkt DB)
- **Role Middleware**: `publicProcedure`, `protectedProcedure`, `trainerProcedure`, `adminProcedure`, `superadminProcedure`
- **Superadmin**: Kann X-Studio-Id Header setzen fuer Cross-Studio-Zugriff
- **Gamification**: Server-Sync mit AsyncStorage-Fallback (Leaderboard studio-scoped)
- **PM2**: IMMER `Bun.serve()` explizit verwenden (kein `export default`)
- **postinstall**: Fuehrt `patch-metro-exports.js` automatisch aus

## Bekannte Einschraenkungen
- Native Push-Notifications: In-App Notification Center implementiert (kein Service Worker / expo-notifications)
- Mobile Builds: Nicht getestet (nur Web)
- Passwort-Reset E-Mail: Braucht RESEND_API_KEY in .env
- Studio-Branding: Farben werden per-Studio gespeichert, aber UI nutzt noch nicht ueberall studioColors

## Server
- **Domain**: app.functional-wiehl.de (SSL via Nginx)
- **IP**: 128.140.71.33
- **DB**: fitness_app / app_user
- **App-Dir**: /var/www/fitness-app
