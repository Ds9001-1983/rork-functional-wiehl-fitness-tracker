# Functional Wiehl Fitness Tracker

## Projekt-Uebersicht
Single-Studio Fitness-Tracker App fuer Functional Wiehl.
Sprache der UI: Deutsch (de-DE).
Bei Bedarf kann die App auf einem separaten Server fuer ein anderes Studio deployt werden.

## Tech Stack
- **Frontend**: Expo 53 + React 19 + React Native 0.79.7 + TypeScript
- **Backend**: Hono + tRPC v11 auf Bun (`backend/hono.ts`)
- **Datenbank**: PostgreSQL (12 Tabellen, mit In-Memory-Fallback)
- **Auth**: bcrypt + JWT + E-Mail-Reset (Resend API)
- **State Management**: @nkzw/create-context-hook + AsyncStorage
- **Styling**: NativeWind (Dark Theme, `useColors()` Hook fuer Design Tokens)
- **Routing**: Expo Router (File-based)
- **Testing**: bun test (built-in runner)
- **Deployment**: PM2 + Nginx + Bun auf Hetzner CX22

## Wichtige Befehle
```bash
bun run server          # Backend starten (Port 3000)
bun test                # Tests ausfuehren
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
  routines.tsx          # Routinen-Verwaltung (sortierbar, Server-Sync)
  onboarding.tsx        # 3-Schritt Wizard (Ziel, Level, Trainingstage) + Auto-Routing
  leaderboard.tsx       # Rangliste nach XP
  challenges.tsx        # Challenges
  body-measurements.tsx # Koerpermasse-Tracking + Trends
  notifications.tsx     # In-App Benachrichtigungen (Bell-Icon + FlatList)
  reset-password.tsx    # Token-basierter Passwort-Reset
backend/
  hono.ts               # Hono Server Entry (Bun.serve, CORS)
  storage.ts             # Zentrale Daten-Abstraktion (12 Tabellen, DB + Memory)
  trpc/
    app-router.ts        # Alle tRPC Routes (35 Prozeduren, 13 Router)
    create-context.ts    # tRPC Context, JWT, 4 Role-Middlewares
    routes/              # Einzelne tRPC Prozeduren
      studios/           # Studio-Branding (get, update)
hooks/
  use-auth.tsx           # Auth mit Server-Sync + Reset
  use-workouts.tsx       # Workouts, Plans, Routinen (Server-Sync), Records, MuscleVolume
  use-clients.tsx        # Client-Management (Trainer)
  use-gamification.tsx   # XP, Badges, Streaks, Levels (Server-Sync)
  use-notifications.tsx  # In-App Benachrichtigungen (Server-Sync)
  use-colors.ts          # useColors() Hook - liefert Design Tokens fuer alle Screens
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
  storage.test.ts        # Storage-Layer Tests
```

## tRPC API Routes (35 Prozeduren, 13 Router)
- `auth.login` / `auth.updatePassword` / `auth.requestReset` / `auth.resetPassword`
- `clients.create` (trainerProcedure) / `clients.list` (protectedProcedure) / `clients.delete` / `clients.update` / `clients.progress`
- `invitations.create` (trainerProcedure) / `invitations.list` (trainerProcedure)
- `workouts.create` (protectedProcedure) / `workouts.list` (protectedProcedure) / `workouts.update` / `workouts.delete`
- `plans.create` (trainerProcedure) / `plans.list` (protectedProcedure) / `plans.update` / `plans.delete` / `plans.assign` / `plans.instantiate`
- `profile.update`
- `admin.stats` / `admin.users` (adminProcedure)
- `measurements.create` / `measurements.list`
- `gamification.get` / `gamification.sync` / `gamification.leaderboard`
- `routines.create` / `routines.list` / `routines.update` / `routines.delete`
- `challenges.create` (trainerProcedure) / `challenges.list` / `challenges.join` / `challenges.progress` / `challenges.refreshProgress`
- `notifications.list` / `notifications.markRead` / `notifications.markAllRead` / `notifications.unreadCount`
- `studios.get` (protectedProcedure) / `studios.update` (adminProcedure)

## DB-Tabellen (12)
`users`, `clients`, `invitations`, `workouts`, `workout_plans`,
`password_reset_tokens`, `body_measurements`, `gamification`,
`routines`, `challenges`, `challenge_progress`, `notifications`,
`studios`

## Architektur-Entscheidungen
- **Single-Studio**: Eine Installation = ein Studio. Bei Bedarf separate Server-Instanz deployen
- **Provider Pattern**: AuthProvider > ClientsProvider > WorkoutProvider > GamificationProvider > NotificationProvider
- **Dual Storage**: PostgreSQL primaer, AsyncStorage als lokaler Fallback
- **Client-Erstellung**: Erstellt IMMER sowohl `users`- als auch `clients`-Tabellen-Eintraege
- **tRPC**: Alle Routes nutzen `storage`-Abstraktion (nie direkt DB)
- **Role Middleware**: `publicProcedure`, `protectedProcedure`, `trainerProcedure`, `adminProcedure`
- **Gamification**: Server-Sync mit AsyncStorage-Fallback
- **Studio-Branding**: `useColors()` Hook liefert Design Tokens, Screens nutzen `createStyles(Colors)` Pattern
- **Challenges**: Fortschritt wird automatisch aus Workout-Daten berechnet (`challenges.refreshProgress`), Leaderboard pro Challenge
- **PM2**: IMMER `Bun.serve()` explizit verwenden (kein `export default`)
- **postinstall**: Fuehrt `patch-metro-exports.js` automatisch aus

## Bekannte Einschraenkungen
- Native Push-Notifications: In-App Notification Center implementiert (kein Service Worker / expo-notifications)
- Mobile Builds: Nicht getestet (nur Web)
- Passwort-Reset E-Mail: Braucht RESEND_API_KEY in .env

## Server
- **Domain**: app.functional-wiehl.de (SSL via Nginx)
- **IP**: 128.140.71.33
- **DB**: fitness_app / app_user
- **App-Dir**: /var/www/fitness-app
