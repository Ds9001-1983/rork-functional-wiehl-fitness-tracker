# Functional Wiehl Fitness App – 20 Feature-Vorschläge
## Priorisierte Feature-Liste für Claude Code Implementation

**Projekt:** Functional Wiehl Fitness Tracker
**Erstellt:** 17. Februar 2026
**Ziel:** Production-ready App für Apple App Store und Google Play Store
**Erster Kunde:** Functional Wiehl (Fitnessstudio in Wiehl)
**Drei Benutzerrollen:** Admin, Trainer, Kunde
**Tech-Stack:** React Native / Expo mit tRPC-Backend auf Hetzner

**Bereits implementiert:** Kunden werden ausschließlich vom Trainer angelegt (Name, Nachname, Telefonnummer, E-Mail). Der Kunde erhält per E-Mail einen Zugangscode. Dieses System steht und muss nicht mehr angefasst werden.

---

## FEATURE 1: Template-Instanz-Trainingsplan-System

**Bereich:** Trainer + Kunde | **Priorität:** KRITISCH

### Was es tut:
Der Trainer erstellt Trainingspläne als wiederverwendbare Templates. Beim Zuweisen an Kunden wird pro Kunde eine individuelle Kopie (Instanz) erstellt. Jede Instanz kann individuell angepasst werden ohne Template oder andere Kunden zu beeinflussen.

### Datenmodell:
```typescript
interface TrainingPlanTemplate {
  id: string;
  trainerId: string;
  name: string;
  description: string;
  category: string;
  exercises: TemplateExercise[];
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateExercise {
  id: string;
  exerciseId: string;
  order: number;
  sets: number;
  reps: string;
  weight?: string;
  restSeconds: number;
  notes?: string;
  supersetGroup?: string;
  youtubeVideoId?: string;
}

interface TrainingPlanInstance {
  id: string;
  templateId: string;
  clientId: string;
  trainerId: string;
  name: string;
  exercises: InstanceExercise[];
  isActive: boolean;
  assignedAt: Date;
  customizedAt?: Date;
  customizedFields: string[];
}

interface InstanceExercise extends TemplateExercise {
  isCustomized: boolean;
  originalFromTemplate?: TemplateExercise;
}
```

### Trainer-UI-Flows:

**Template erstellen:** "+" -> "Neuer Trainingsplan" -> Name + Kategorie -> Übungen aus DB hinzufügen (Suche + Filter) -> Pro Übung: Sätze, Reps, Gewicht, Pause, Notiz, Video -> Drag-and-Drop sortieren -> Speichern.

**Plan zuweisen (Gruppe):** Template öffnen -> "Zuweisen" -> Kundenliste mit Checkboxen -> Mehrere wählen -> Instanzen werden erstellt -> Optional direkt individualisieren.

**Plan individualisieren:** Kundenprofil -> Plan antippen -> Individuelle Version sehen -> Abweichungen farblich markiert (orangener Rand) -> Übung antippen zum Ändern/Tauschen/Entfernen -> Speichern löst Push aus.

**Template-Änderung propagieren:** Template ändern -> Dialog: "Alle nicht-individualisierten Kunden" / "Nur Template" / "Alle überschreiben" (mit Warnung).

---

## FEATURE 2: Smart Workout-Tracking mit Auto-Fill

**Bereich:** Kunde | **Priorität:** KRITISCH

### Was es tut:
Kunde loggt Sätze, Wiederholungen, Gewichte. System füllt automatisch Werte vom letzten Workout vor. Nur bestätigen oder anpassen.

### Datenmodell:
```typescript
interface WorkoutSession {
  id: string;
  clientId: string;
  planInstanceId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'abandoned';
  exerciseLogs: ExerciseLog[];
  totalDuration: number;
  mood?: 'great' | 'good' | 'okay' | 'tired' | 'bad';
}

interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
  skipped: boolean;
  skipReason?: string;
}

interface SetLog {
  setNumber: number;
  targetReps: number;
  actualReps?: number;
  targetWeight?: number;
  actualWeight?: number;
  completed: boolean;
  isPersonalRecord: boolean;
  timestamp: Date;
}
```

### UX-Flow:
1. "Workout starten" auf Heute-Screen
2. Erste Übung: Video oben, Satz-Tabelle unten
3. Vorausgefüllte Werte vom letzten Mal
4. Häkchen bestätigen ODER Werte ändern
5. Pause-Timer startet automatisch
6. Wisch links = nächste Übung
7. PR erkannt = Confetti
8. Ende: Zusammenfassung + Mood-Emoji
9. "Abschließen" -> Sync

### Technisch:
- Wake Lock (Bildschirm bleibt an)
- Min. 48px Touch-Targets
- Offline-fähig mit Background-Sync
- Landscape für Tablets

---

## FEATURE 3: "Heute"-Screen als App-Einstieg

**Bereich:** Kunde | **Priorität:** KRITISCH

### Was es tut:
Startscreen beantwortet "Was mache ich heute?" Klare Handlungsaufforderung.

### Layout:
- Begrüßung mit Name + Tageszeit
- Heutiges Workout groß mit "STARTEN"-Button (Übungsanzahl + geschätzte Dauer)
- Aktueller Streak
- Letzte 2-3 Aktivitäten
- Coach-Message (TTM-basiert aus unserer Recherche)
- Bottom Navigation: Home / Pläne / Stats / Profil

### Logik:
- Trainingstag: Workout prominent
- Ruhetag: "Regeneration" + Mobility-Tipps
- Überfällig: Sanfter Nudge ohne Schuldgefühl
- Greeting nach Tageszeit

---

## FEATURE 4: Übungsdatenbank mit YouTube-Video-Integration

**Bereich:** Trainer + Kunde | **Priorität:** HOCH

### Was es tut:
Zentrale Übungsdatenbank mit Embedded YouTube-Videos vom Functional Wiehl Kanal.

### Datenmodell:
```typescript
interface Exercise {
  id: string;
  name: string;
  category: 'brust' | 'ruecken' | 'schultern' | 'bizeps' | 'trizeps' | 'beine' | 'core' | 'cardio' | 'mobility' | 'ganzkoerper' | 'functional';
  muscleGroups: string[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  youtubeVideoId?: string;
  thumbnailUrl?: string;
  instructions: string;
  commonMistakes?: string;
  alternatives?: string[];
  isCustom: boolean;
  createdBy?: string;
}
```

### Umsetzung:
- react-native-youtube-iframe für Embedded-Playback
- Nicht downloaden (YouTube ToS), nur embedden
- Thumbnail-Cache
- Auto-Play stumm beim Öffnen
- Trainer kann eigene Übungen + Videos hinzufügen
- Filter: Kategorie / Muskelgruppe / Equipment
- Kanal: https://www.youtube.com/@FunctionalWiehl/videos

---

## FEATURE 5: Intelligenter Pause-Timer

**Bereich:** Kunde | **Priorität:** HOCH

### Was es tut:
Auto-Timer nach jedem Satz. Pro Übung konfigurierbar durch Trainer.

### Umsetzung:
```typescript
interface TimerConfig {
  defaultRestSeconds: number;
  exerciseOverrides: { [exerciseId: string]: number };
  vibrationPattern: 'single' | 'double' | 'long';
  soundEnabled: boolean;
  countdownAlert: number;
  autoStart: boolean;
}
```

### UX:
- Großer Kreis-Countdown
- Vibration 10s vorher (sanft) + bei 0 (deutlich)
- "+30s" / "-30s" Quick-Buttons
- Läuft bei gesperrtem Screen weiter
- Vorschau nächste Übung unter Timer

---

## FEATURE 6: Personal Record Tracking + Celebration

**Bereich:** Kunde | **Priorität:** HOCH

### Was es tut:
Automatische PR-Erkennung (max Gewicht, max Reps, max Volumen) mit Celebration.

### Datenmodell:
```typescript
interface PersonalRecord {
  id: string;
  clientId: string;
  exerciseId: string;
  type: 'max_weight' | 'max_reps' | 'max_volume';
  value: number;
  previousRecord?: number;
  achievedAt: Date;
  workoutSessionId: string;
}
```

### UX:
- Echtzeit-Erkennung im Workout
- Konfetti + "Neuer Rekord!" (2s Overlay)
- Haptisches Feedback
- Goldene Markierung im Verlauf
- Trainer sieht alle PRs seiner Kunden

---

## FEATURE 7: Trainer-Dashboard mit Kunden-Übersicht

**Bereich:** Trainer | **Priorität:** HOCH

### Was es tut:
Überblick: Wer aktiv, wer braucht Aufmerksamkeit, wer hat Erfolge.

### Ampelsystem:
- Grün: Aktiv letzte 7 Tage
- Gelb: Aktiv 7-14 Tage her
- Rot: Inaktiv 14+ Tage

### Sektionen:
- "Brauchen Aufmerksamkeit" oben (inaktive, auslaufende Pläne)
- "Erfolge" (PRs, Meilensteine)
- Aktivitäts-Feed
- Tap auf Kunde = Detail mit History + Plänen

---

## FEATURE 8: Workout-Verlauf + Fortschritts-Charts

**Bereich:** Kunde + Trainer | **Priorität:** HOCH

### Was es tut:
Verständliche Fortschritts-Visualisierung, kontextualisiert.

### Ansichten:
- Trainingskalender-Heatmap (GitHub-Style)
- Pro Übung: Gewichtsverlauf Linie-Chart
- Monats-Summary: "12 Workouts, 2 PRs, 8.5t bewegt"
- Vormonats-Vergleich: "+23% Volumen"

### Tech: victory-native oder react-native-chart-kit

---

## FEATURE 9: Push-Notifications mit intelligentem Timing

**Bereich:** Kunde | **Priorität:** HOCH

### Typen:
- plan_updated / workout_reminder / streak_at_risk / personal_record / weekly_summary / inactivity_nudge / trainer_message / milestone

### Regeln:
- Reminder zur gelernten Trainingszeit
- Streak-at-Risk abends am letzten Tag
- Inactivity: 5d -> 10d -> 14d (dann Schluss)
- Max 1/Tag (außer Trainer-Messages)
- Ruhezeit 22:00-07:00

### Tech: expo-notifications + Hetzner Cron + FCM/APNs

---

## FEATURE 10: Offline-First Workout-Modus

**Bereich:** Kunde | **Priorität:** HOCH

### Was es tut:
Workout komplett ohne Internet. Studios = oft schlechter Empfang.

### Architektur:
```typescript
interface SyncQueue {
  pendingUploads: {
    id: string;
    type: 'workout_session' | 'set_log' | 'mood_log';
    data: any;
    createdAt: Date;
    retryCount: number;
  }[];
  lastSyncedAt: Date;
}
```

### Ablauf:
- App-Start: Plan + Übungen + letzte Werte lokal cachen
- Offline: In MMKV/SQLite, Sync-Queue füllen
- Online: Queue FIFO abarbeiten, Client-wins bei Konflikten

### Tech: react-native-mmkv + expo-sqlite + netinfo

---

## FEATURE 11: Trainingsplan-Kalender / Wochenansicht

**Bereich:** Kunde | **Priorität:** MITTEL-HOCH

### Was es tut:
Mo-So Ansicht mit geplanten Trainings + Status.

### Datenmodell:
```typescript
interface WeeklySchedule {
  planInstanceId: string;
  schedule: {
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    workoutName: string;
    isRestDay: boolean;
    isOptional: boolean;
  }[];
  flexMode: boolean;
}
```

### UX: Status-Icons pro Tag, Flex-Modus verschiebt automatisch, Tap = Workout starten.

---

## FEATURE 12: Übungs-Tausch-Vorschläge

**Bereich:** Kunde | **Priorität:** MITTEL

### Was es tut:
Gerät belegt? Übung nicht möglich? App schlägt Alternativen mit gleichem Muskelgruppen-Fokus vor.

### Umsetzung:
- Alternatives-Array pro Übung mit matchScore (0-100)
- Button "Kann ich nicht / Gerät belegt"
- Top 3 Alternativen
- Tausch nur für diese Session (Plan bleibt)
- Optional: "Immer tauschen" aktualisiert Instanz
- Trainer sieht Tausch im Log

---

## FEATURE 13: Supersatz + Circuit-Support

**Bereich:** Trainer + Kunde | **Priorität:** MITTEL

### Was es tut:
Übungen zu Supersätzen (2er) oder Circuits (3+) gruppieren.

### UX:
- Gruppierte Übungen visuell zusammen
- Auto-Wechsel zwischen Übungen im Supersatz
- Pause nur zwischen Durchgängen
- supersetGroup-Feld: gleicher String = zusammen

---

## FEATURE 14: Trainer-Feedback pro Workout

**Bereich:** Trainer | **Priorität:** MITTEL

### Datenmodell:
```typescript
interface TrainerFeedback {
  id: string;
  trainerId: string;
  clientId: string;
  workoutSessionId: string;
  message: string;
  exerciseNotes?: { exerciseId: string; note: string }[];
  createdAt: Date;
  readByClient: boolean;
}
```

### UX:
- Trainer: "Feedback geben" pro Workout + Quick-Emoji-Reaktion
- Kunde: Badge bei ungelesem Feedback + Push + sichtbar unter Workout

---

## FEATURE 15: Körpermaße-Tracking

**Bereich:** Kunde + Trainer | **Priorität:** MITTEL

### Datenmodell:
```typescript
interface BodyMeasurement {
  id: string;
  clientId: string;
  date: Date;
  weight?: number;
  bodyFat?: number;
  measurements?: {
    chest?: number; waist?: number; hips?: number;
    bicepsLeft?: number; bicepsRight?: number;
    thighLeft?: number; thighRight?: number;
  };
}
```

### UX:
- Wöchentliche Erinnerung
- Minimum: nur Gewicht, Rest optional
- Charts über Zeit
- Trainer sieht Daten

---

## FEATURE 16: Warm-Up + Cool-Down Routinen

**Bereich:** Trainer + Kunde | **Priorität:** MITTEL

### Umsetzung:
```typescript
interface WarmUpRoutine {
  exercises: {
    name: string;
    durationSeconds: number;
    youtubeVideoId?: string;
    instructions: string;
  }[];
}
```

### Flow: Vor Workout -> Warm-Up (überspringbar, timer-basiert) -> Hauptworkout -> Cool-Down (optional mit Stretching-Videos).

---

## FEATURE 17: Trainings-Zyklen / Programme

**Bereich:** Trainer | **Priorität:** MITTEL

### Datenmodell:
```typescript
interface TrainingProgram {
  id: string;
  trainerId: string;
  name: string;
  durationWeeks: number;
  phases: {
    weekStart: number;
    weekEnd: number;
    planTemplateId: string;
    progressionRules?: {
      exerciseId: string;
      weeklyWeightIncrease?: number;
      weeklyRepIncrease?: number;
    }[];
  }[];
}
```

### UX: Einmalig erstellen, Kunden zuweisen, App wechselt Pläne automatisch, progressive Überladung eingerechnet.

---

## FEATURE 18: Quick-Log Cardio + freies Training

**Bereich:** Kunde | **Priorität:** MITTEL

### UX:
- Aktivität wählen: Laufen / Rad / Schwimmen / Gym frei / Yoga / Sonstiges
- Dauer eingeben
- Intensität (3 Emoji-Stufen)
- Optionale Notiz
- Zählt für Streak
- Trainer sieht es im Feed

---

## FEATURE 19: Onboarding-Tour für Neukunden

**Bereich:** Kunde | **Priorität:** MITTEL

### 4 Screens:
1. "Willkommen bei Functional Wiehl! Dein Trainer hat alles vorbereitet."
2. "Dein Trainingsplan" (zeigt zugewiesenen Plan)
3. "Tracke deinen Fortschritt" (Beispiel-Chart)
4. "Los gehts!" -> Heute-Screen

### Regeln: Überspringbar, nur 1x, max 4 Screens, Studio-Logo personalisierbar.

---

## FEATURE 20: DSGVO-Konformität + Datenexport

**Bereich:** Admin + Kunde | **Priorität:** HOCH (rechtlich)

### API:
```typescript
// GET  /api/client/:id/data-export  -> JSON/CSV
// DELETE /api/client/:id/data-delete -> Komplettlöschung

interface DataExport {
  personalData: { name: string; email: string; phone: string; createdAt: Date };
  workoutHistory: WorkoutSession[];
  bodyMeasurements: BodyMeasurement[];
  personalRecords: PersonalRecord[];
  exportedAt: Date;
}
```

### Anforderungen:
- Datenschutz-Checkbox beim ersten Login (nicht vorausgewählt)
- "Daten exportieren" im Profil
- "Konto löschen" mit Bestätigung
- AVV zwischen SUPERBAND und Studio
- Impressum + Datenschutz verlinkt
- Hetzner Deutschland = Standortvorteil
- HTTPS + bcrypt, kein Drittanbieter-Tracking

---

## IMPLEMENTIERUNGS-REIHENFOLGE

### Phase 1 – MVP (muss zum Launch stehen):
1. Feature 1: Template-Instanz-Trainingsplan-System
2. Feature 2: Smart Workout-Tracking mit Auto-Fill
3. Feature 3: "Heute"-Screen
4. Feature 4: Übungsdatenbank + YouTube-Videos
5. Feature 5: Pause-Timer
6. Feature 10: Offline-First Modus
7. Feature 20: DSGVO-Konformität

### Phase 2 – Launch-Ready:
8. Feature 7: Trainer-Dashboard
9. Feature 9: Push-Notifications
10. Feature 6: Personal Record Tracking
11. Feature 8: Fortschritts-Charts
12. Feature 19: Onboarding-Tour

### Phase 3 – Post-Launch:
13. Feature 11: Trainingsplan-Kalender
14. Feature 14: Trainer-Feedback
15. Feature 15: Körpermaße-Tracking
16. Feature 18: Quick-Log Cardio

### Phase 4 – Premium:
17. Feature 12: Übungs-Tausch-Vorschläge
18. Feature 13: Supersatz/Circuit
19. Feature 16: Warm-Up/Cool-Down
20. Feature 17: Trainings-Zyklen

---

## HINWEISE FÜR CLAUDE CODE

- Tech-Stack: React Native / Expo mit tRPC, Backend Node.js auf Hetzner
- CLAUDE.md im Projekt-Root enthält projektspezifische Anweisungen
- Kunden-Erstellung durch Trainer + E-Mail-Zugangscode ist FERTIG
- YouTube-Videos: https://www.youtube.com/@FunctionalWiehl/videos
- Alle UI-Texte auf Deutsch
- App-Name: "Functional Wiehl"
- Architektur: Multi-Tenant-fähig bauen für spätere Skalierung
- Apple Developer Account vorhanden, EAS Build nutzen
- DRINGEND: .env aus Git-History entfernen, Credentials rotieren
