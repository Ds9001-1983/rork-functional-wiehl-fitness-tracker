# Functional Wiehl Fitness Tracker

## Projekt-Uebersicht
Single-Studio Fitness-Tracker App fuer Functional Wiehl.
Sprache der UI: Deutsch (de-DE).
Bei Bedarf kann die App auf einem separaten Server fuer ein anderes Studio deployt werden.

## Tech Stack
- **Frontend**: Expo 53 + React 19 + React Native 0.79.7 + TypeScript
- **Backend**: Hono + tRPC v11 auf Bun (`backend/hono.ts`)
- **Datenbank**: PostgreSQL (16+ Tabellen, mit In-Memory-Fallback)
- **Auth**: bcryptjs + JWT (7 Tage Ablauf) + E-Mail-Reset (Resend API)
- **State Management**: @nkzw/create-context-hook + AsyncStorage
- **Styling**: NativeWind (Dark Theme, `useColors()` Hook fuer Design Tokens)
- **Routing**: Expo Router (File-based, 40+ Screens)
- **API Client**: @tanstack/react-query + @trpc/react-query
- **Icons**: lucide-react-native
- **Validation**: Zod v4
- **Serialisierung**: superjson
- **Error Tracking**: Sentry (`lib/sentry.ts`, @sentry/react-native auf iOS, Web-Fallback)
- **Push Notifications**: expo-notifications (iOS nativ) + Web Push API (Browser) + Expo Push API (Backend)
- **Image Picker**: expo-image-picker (iOS nativ) + File Input (Web)
- **Testing**: bun test (built-in runner)
- **Native Builds**: EAS Build (Expo Application Services) fuer iOS
- **Deployment**: PM2 + Nginx + Bun auf Hetzner CX22 (Web) + App Store via EAS Submit (iOS)

## Wichtige Befehle
```bash
bun run server              # Backend starten (Port 3000, via backend-server.ts)
bun test                    # Tests ausfuehren (__tests__/)
bun run build-web           # Web-Build mit Expo (patch-metro + expo export)
bun run build:ios-preview   # iOS Preview-Build via EAS (TestFlight/intern)
bun run build:ios-prod      # iOS Production-Build via EAS (App Store)
bun run submit:ios          # iOS App Store Submit via EAS
bun run deploy              # Vollstaendiges Web-Deployment (deploy.sh)
bun run start               # Expo Dev-Server mit Tunnel
bun run start-web           # Expo Web Dev-Server mit Tunnel
bun run start-web-dev       # Web Dev-Server mit Debug-Logging
```

## Projektstruktur
```
app/                        # Expo Router Screens (File-based routing)
  _layout.tsx               # Root-Layout mit Provider-Chain + Role-basiertem Routing
  index.tsx                 # Entry-Point (Redirect)
  login.tsx                 # Login-Screen
  +not-found.tsx            # 404-Handler
  (tabs)/                   # Client-Tabs: index(Dashboard), exercises, calendar, stats, profile
  (trainer-tabs)/           # Trainer-Tabs: index(Dashboard), plans, profile, client-progress/[id]
  (admin-tabs)/             # Admin-Tabs: index(Dashboard), users, system, profile
  active-workout.tsx        # Aktives Workout mit Timer
  workout-detail/[id].tsx   # Workout-Detail-Ansicht
  plan-detail/[id].tsx      # Plan-Detail-Ansicht
  routines.tsx              # Routinen-Verwaltung (sortierbar, Server-Sync)
  onboarding.tsx            # 3-Schritt Wizard (Ziel, Level, Trainingstage) + Auto-Routing
  leaderboard.tsx           # Rangliste nach XP
  challenges.tsx            # Challenges-System
  body-measurements.tsx     # Koerpermasse-Tracking + Trends
  notifications.tsx         # In-App Benachrichtigungen (Bell-Icon + FlatList)
  reset-password.tsx        # Token-basierter Passwort-Reset
  change-password.tsx       # Passwort aendern
  trainer.tsx               # Trainer Center
  customer-management.tsx   # Kundenverwaltung
  schedule-training.tsx     # Training planen
  training-units-selection.tsx  # Trainingseinheiten auswaehlen
  exercise-select.tsx       # Uebung auswaehlen
  progress-photos.tsx       # Fortschrittsfotos
  plate-calculator.tsx      # Hantelrechner
  chat/index.tsx            # Chat-Liste
  chat/[userId].tsx         # Chat-Thread
  privacy-policy.tsx        # Datenschutz
backend/
  hono.ts                   # Hono API-App (CORS, tRPC-Mount, Rate-Limiting)
  storage.ts                # Zentrale Daten-Abstraktion (16+ Tabellen, DB + Memory, ~92KB)
  push-sender.ts            # Expo Push API Integration (native iOS Push-Versand)
  middleware/
    rate-limit.ts           # API- und Login-Rate-Limiting
  trpc/
    app-router.ts           # 17 Router, 55+ Prozeduren
    create-context.ts       # tRPC Context, JWT, 4 Role-Middlewares
    routes/                 # Einzelne tRPC Prozeduren (nach Domain organisiert)
      auth/                 # login, update-password, request-reset, reset-password
      clients/              # create, list, delete, update, progress
      invitations/          # create, list
      workouts/             # create, list, update, delete
      plans/                # create, list, update, delete, assign, instantiate, ai-generate, mesocycles
      routines/             # create, list, update, delete
      gamification/         # get, sync, leaderboard
      challenges/           # create, list, join, progress, refresh-progress
      notifications/        # list, mark-read, mark-all-read, unread-count, subscribe-push, unsubscribe-push
      chat/                 # send, list, unread-count, conversations
      photos/               # upload, list, delete
      measurements/         # create, list
      profile/              # update
      admin/                # stats, users
      studios/              # get, update
      privacy/              # consent, export-data, delete-account
      example/hi/           # Test-Route
backend-server.ts           # Main Bun.serve() Entry-Point (Port 3000, Static-Serving, SPA-Fallback, Health-Check)
hooks/
  use-auth.tsx              # Auth mit Server-Sync + Reset + Role-Switching
  use-workouts.tsx          # Workouts, Plans, Routinen (Server-Sync), Records, MuscleVolume
  use-clients.tsx           # Client-Management (Trainer)
  use-gamification.tsx      # XP, Badges, Streaks, Levels (Server-Sync)
  use-notifications.tsx     # In-App Benachrichtigungen (Server-Sync, Polling 15s Web / 60s iOS, native Push-Listener)
  use-colors.ts             # useColors() Hook - liefert Design Tokens fuer alle Screens
components/
  RestTimer.tsx             # Rest-Timer (konfigurierbar, Play/Pause, Vibration)
  WorkoutSetRow.tsx         # Set-Eingabe mit Typen (Normal/Warmup/Dropset/Failure)
  ConfirmDialog.tsx         # Bestaetigung fuer destruktive Aktionen
  StatusBanner.tsx          # Erfolg/Fehler-Feedback
  OfflineBanner.tsx         # Netzwerk-Status-Indikator
  LoadingScreen.tsx         # Ladebildschirm
  ErrorBoundary.tsx         # Error Boundary Wrapper
  StatsCard.tsx             # Statistik-Karte
  ExerciseCard.tsx          # Uebungs-Karte
  ExerciseGroup.tsx         # Uebungs-Gruppen (Superset, Circuit, Dropset)
  ExerciseProgressChart.tsx # Fortschritts-Diagramm
  YouTubePlayer.tsx         # YouTube Video-Player
  PlateCalculator.tsx       # Hantelscheiben-Rechner
  ScrollableNumberInput.tsx # Scroll-Nummern-Eingabe
  InstallBanner.tsx         # PWA-Install-Prompt
  PlanPdfExport.tsx         # PDF-Export fuer Plaene
  AiPlanPreview.tsx         # KI-generierter Plan-Vorschau
  MesocycleTimeline.tsx     # Mesozyklus-Visualisierung
data/
  exercises.ts              # 80+ Uebungen (8 Kategorien, deutsch, mit YouTube-Links)
  badges.ts                 # 18 Badges (4 Kategorien: consistency, milestone, performance, special)
  coaching-messages.ts      # 4 Ton-Profile (Motivator/Competitor/Scientist/Buddy)
  workout-templates.ts      # Vordefinierte Workout-Vorlagen
constants/
  colors.ts                 # Design Tokens (Colors, Brand, Spacing, BorderRadius)
types/
  workout.ts                # Workout, Exercise, BodyMeasurement, PersonalRecord, User, UserStats, calculate1RM()
  gamification.ts           # XP, Levels(15), Badges, Streaks, XP_REWARDS, LEVEL_THRESHOLDS, LEVEL_NAMES
lib/
  trpc.ts                   # tRPC Client Setup
  sync-queue.ts             # Offline Sync Queue
  sentry.ts                 # Error Tracking (@sentry/react-native auf iOS, Web-Fallback)
  push-notifications.ts     # Native Push-Token Registrierung (expo-notifications + expo-device)
scripts/
  patch-metro-exports.js    # Metro Bundler Export-Fix (postinstall)
  backup-db.sh              # Datenbank-Backup Script
  setup-backup-cron.sh      # Cron-Setup fuer Backups
__tests__/
  storage.test.ts           # Storage-Layer Tests
  routes.test.ts            # tRPC Route Tests
```

## Konfigurations-Dateien (Root)
- `app.json` - Expo Konfiguration (Bundle-IDs, Splash-Screen, Plugins, iOS Permissions, Privacy Manifest)
- `eas.json` - EAS Build Konfiguration (development/preview/production Profile, App Store Submit)
- `babel.config.js` - Babel Preset (babel-preset-expo)
- `metro.config.js` - Metro Bundler Konfiguration
- `tsconfig.json` - TypeScript (strict, `@/*` Path-Alias)
- `ecosystem.config.js` - PM2 Konfiguration (Bun-Interpreter, Logs in ./logs/)
- `nginx-config.conf` - Nginx Reverse-Proxy Konfiguration
- `deploy.sh` / `deploy-to-hetzner.sh` - Deployment Scripts
- `.env.example` - Vorlage fuer Umgebungsvariablen

## tRPC API Routes (17 Router, 55+ Prozeduren)

### auth (4)
`login` / `updatePassword` / `requestReset` / `resetPassword`

### clients (5)
`create` (trainerProcedure) / `list` (protectedProcedure) / `delete` / `update` / `progress`

### invitations (2)
`create` (trainerProcedure) / `list` (trainerProcedure)

### workouts (4)
`create` (protectedProcedure) / `list` (protectedProcedure) / `update` / `delete`

### plans (7)
`create` (trainerProcedure) / `list` (protectedProcedure) / `update` / `delete` / `assign` / `instantiate` / `aiGenerate`

### mesocycles (4)
`create` / `list` / `update` / `delete`

### routines (4)
`create` / `list` / `update` / `delete`

### profile (1)
`update`

### admin (2)
`stats` (adminProcedure) / `users` (adminProcedure)

### measurements (2)
`create` / `list`

### gamification (3)
`get` / `sync` / `leaderboard`

### challenges (5)
`create` (trainerProcedure) / `list` / `join` / `progress` / `refreshProgress`

### notifications (6)
`list` / `markRead` / `markAllRead` / `unreadCount` / `subscribePush` / `unsubscribePush`

### chat (4)
`send` / `list` / `unreadCount` / `conversations`

### photos (3)
`upload` / `list` / `delete`

### studios (2)
`get` (protectedProcedure) / `update` (adminProcedure)

### privacy (3)
`consent` / `exportData` / `deleteAccount`

### example (1)
`hi` (Test-Route)

## DB-Tabellen (16+)
- `users` - Benutzerkonten (id, email, password_hash, role, passwordChanged, createdAt, consentedAt, privacyVersion)
- `clients` - Kundenprofile (id, userId, name, email, phone, role, joinDate, starterPassword, passwordChanged, avatar, stats JSON)
- `invitations` - Einladungscodes (code, name, email, createdAt)
- `workouts` - Absolvierte Workouts (id, userId, name, date, duration, exercises JSON, completed, createdBy)
- `workout_plans` - Plan-Vorlagen (id, name, description, exercises JSON, createdBy, assignedTo JSON, schedule JSON, templateId, isInstance, assignedUserId)
- `password_reset_tokens` - Reset-Tokens (token, userId, expiresAt)
- `body_measurements` - Koerpermasse (id, userId, date, weight, bodyFat, chest, waist, hips, bicep, thigh, calf, neck, shoulders)
- `gamification` - XP/Level (userId, xp, level, badges JSON, currentStreak, longestStreak, streakFreezes, lastActiveDate)
- `routines` - Routinen (id, userId, name, description, exercises JSON, folder, lastUsed, timesUsed)
- `challenges` - Challenge-Definitionen (id, name, description, createdBy, startDate, endDate, criteria JSON, leaderboard JSON)
- `challenge_progress` - Challenge-Fortschritt (userId, challengeId, progress JSON, currentRank, joinedAt)
- `notifications` - Benachrichtigungen (id, userId, title, body, type, read, data JSON, createdAt)
- `studios` - Studio-Branding (id, name, location, logoUrl, colors JSON, settings JSON)
- `push_subscriptions` - Push-Abonnements Web + iOS (userId, endpoint, p256dh, auth)
- `chat_messages` - Chat-Nachrichten (id, senderId, recipientId, message, read, createdAt)
- `mesocycles` - Trainingszyklen (id, planId, name, weekNumber, focusAreas JSON, notes)
- `progress_photos` - Fortschrittsfotos (id, userId, url, date, caption)

## Umgebungsvariablen (.env)
```
NODE_ENV=production
BACKEND_PORT=3000

# PostgreSQL
DATABASE_URL=postgresql://app_user:PASSWORD@localhost:5432/fitness_app
PGHOST=localhost
PGPORT=5432
PGUSER=app_user
PGPASSWORD=...
PGDATABASE=fitness_app

# Security
JWT_SECRET=random_string

# URLs
CORS_ORIGIN=https://app.functional-wiehl.de
API_BASE_URL=https://app.functional-wiehl.de/api
EXPO_PUBLIC_API_BASE_URL=https://app.functional-wiehl.de

# Optional: E-Mail (Passwort-Reset)
RESEND_API_KEY=...

# Optional: Error Tracking
SENTRY_DSN=...
```

## Provider-Chain (app/_layout.tsx)
```
trpc.Provider
  QueryClientProvider
    GestureHandlerRootView
      View (maxWidth: 768, zentriert)
        AuthProvider
          ClientsProvider
            WorkoutProvider
              GamificationProvider
                NotificationProvider
                  ErrorBoundary
                    OfflineBanner
                    RootLayoutNav (Stack)
```

## Role-basiertes Routing
- `client` -> `(tabs)/` (Dashboard, Exercises, Calendar, Stats, Profile)
- `trainer` -> `(trainer-tabs)/` (Dashboard, Plans, Profile, Client-Progress)
- `admin` -> `(admin-tabs)/` (Dashboard, Users, System, Profile)

## Architektur-Entscheidungen
- **Single-Studio**: Eine Installation = ein Studio. Bei Bedarf separate Server-Instanz deployen
- **Dual Storage**: PostgreSQL primaer, AsyncStorage als lokaler Fallback, Sync-Queue fuer Offline-Mutationen (`lib/sync-queue.ts`)
- **Client-Erstellung**: Erstellt IMMER sowohl `users`- als auch `clients`-Tabellen-Eintraege
- **tRPC**: Alle Routes nutzen `storage`-Abstraktion (nie direkt DB)
- **Role Middleware**: `publicProcedure`, `protectedProcedure`, `trainerProcedure`, `adminProcedure`
- **Gamification**: Server-Sync mit AsyncStorage-Fallback. XP-System: Workout=100, Set=10, PR=50, Badge=25. 15 Levels (Anfaenger bis Unsterblich)
- **Studio-Branding**: `useColors()` Hook liefert Design Tokens, Screens nutzen `createStyles(Colors)` Pattern
- **Challenges**: Fortschritt wird automatisch aus Workout-Daten berechnet (`challenges.refreshProgress`), Leaderboard pro Challenge
- **Template-Instance System (Plans)**: templateId=null ist Template, sonst Instanz. isInstance boolean. assignedUserId pro Instanz
- **PM2**: IMMER `Bun.serve()` explizit verwenden (kein `export default`), da PM2 ueber require() laedt
- **postinstall**: Fuehrt `scripts/patch-metro-exports.js` automatisch aus
- **Max-Width**: App auf 768px begrenzt und zentriert (Mobile-optimiert)
- **Health-Check**: GET `/health` liefert Status + Uptime
- **Debug-Routes**: GET `/api/debug/routes` listet alle tRPC-Prozeduren
- **SPA-Fallback**: `backend-server.ts` serviert `dist/index.html` fuer alle Nicht-API-Routes
- **Rate-Limiting**: `backend/middleware/rate-limit.ts` schuetzt API und Login
- **Notifications**: Dual-System: native Push (iOS via expo-notifications + Expo Push API) + Polling-Fallback (15s Web, 60s iOS)
- **Push-Token Flow**: App-Start -> `registerForPushNotificationsAsync()` -> Token an Backend -> Backend nutzt `push-sender.ts` via Expo Push API
- **Streak Freezes**: Max 2 pro Woche (`MAX_STREAK_FREEZES = 2`)
- **1RM Berechnung**: Epley-Formel in `types/workout.ts` (`calculate1RM()`)

## Gamification Details
- **XP Rewards**: Workout=100, Set=10, PR=50, Badge=25
- **15 Levels**: Anfaenger(0) -> Einsteiger(100) -> Fortgeschritten(300) -> ... -> Unsterblich(150000)
- **18 Badges**: 4 Kategorien (consistency, milestone, performance, special)
- **Streaks**: Tages-Streaks mit max. 2 Freezes/Woche
- **Coaching**: 4 Ton-Profile (Motivator, Competitor, Scientist, Buddy)

## Uebungs-Kategorien (8)
chest, back, legs, shoulders, arms, core, cardio, full-body (80+ Uebungen mit YouTube-Links)

## Set-Typen
normal, warmup, dropset, failure

## iOS App Store
- **Bundle Identifier**: `de.functional-wiehl.app`
- **URL-Scheme**: `functional-wiehl` (Deep-Links)
- **Min. iOS**: 16.0 (deploymentTarget)
- **EAS Profile**: development (Simulator), preview (TestFlight intern), production (App Store)
- **Plugins**: expo-router, expo-font, expo-web-browser, expo-notifications, expo-image-picker, expo-build-properties, @sentry/react-native
- **Privacy Manifest**: UserDefaults (CA92.1) + SystemBootTime (35F9.1) deklariert
- **Permissions**: Kamera, Fotobibliothek, Push-Notifications (in app.json konfiguriert)
- **EAS Submit**: `eas.json` enthaelt Platzhalter fuer appleId, ascAppId, appleTeamId (muessen ersetzt werden)

## Bekannte Einschraenkungen
- Passwort-Reset E-Mail: Braucht RESEND_API_KEY in .env
- Web-Push VAPID Key: Platzhalter in `app/(tabs)/profile.tsx` (muss durch echten Key ersetzt werden)
- PlanPdfExport: Nur auf Web verfuegbar (rendert `null` auf iOS)
- Native Builds: Erfordern EAS CLI (`npm install -g eas-cli`) + Apple Developer Account

## Server (Produktion)
- **Domain**: app.functional-wiehl.de (SSL via Nginx)
- **IP**: 128.140.71.33
- **DB**: fitness_app / app_user
- **App-Dir**: /var/www/fitness-app
- **PM2 App-Name**: fitness-api
- **Logs**: ./logs/ (err.log, out.log, combined.log)
- **Interpreter**: /root/.bun/bin/bun
- **Max Memory**: 1G (PM2 auto-restart)
