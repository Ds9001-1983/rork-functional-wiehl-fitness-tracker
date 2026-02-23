import { Badge } from '@/types/gamification';

export const badges: Badge[] = [
  // === Konsistenz-Badges ===
  {
    id: 'streak-7',
    name: '7-Tage-Serie',
    description: '7 Tage in Folge trainiert',
    icon: '\uD83D\uDD25',
    category: 'consistency',
    criteria: { type: 'streak', threshold: 7 },
  },
  {
    id: 'streak-30',
    name: 'Monats-Warrior',
    description: '30 Tage in Folge trainiert',
    icon: '\uD83D\uDD25',
    category: 'consistency',
    criteria: { type: 'streak', threshold: 30 },
  },
  {
    id: 'streak-90',
    name: 'Quartal-Champion',
    description: '90 Tage in Folge trainiert',
    icon: '\uD83D\uDD25',
    category: 'consistency',
    criteria: { type: 'streak', threshold: 90 },
  },
  {
    id: 'streak-365',
    name: 'Jahres-Legende',
    description: '365 Tage in Folge trainiert',
    icon: '\u2B50',
    category: 'consistency',
    criteria: { type: 'streak', threshold: 365 },
  },
  {
    id: 'week-3',
    name: 'Dranbleiber',
    description: '3 Wochen mindestens 3x trainiert',
    icon: '\uD83D\uDCAA',
    category: 'consistency',
    criteria: { type: 'week_streak', threshold: 3 },
  },

  // === Meilenstein-Badges ===
  {
    id: 'workout-1',
    name: 'Erster Schritt',
    description: 'Erstes Workout abgeschlossen',
    icon: '\uD83C\uDFAF',
    category: 'milestone',
    criteria: { type: 'workout_count', threshold: 1 },
  },
  {
    id: 'workout-10',
    name: 'Am Ball',
    description: '10 Workouts abgeschlossen',
    icon: '\uD83D\uDCAA',
    category: 'milestone',
    criteria: { type: 'workout_count', threshold: 10 },
  },
  {
    id: 'workout-25',
    name: 'Routiniert',
    description: '25 Workouts abgeschlossen',
    icon: '\uD83C\uDFC5',
    category: 'milestone',
    criteria: { type: 'workout_count', threshold: 25 },
  },
  {
    id: 'workout-50',
    name: 'Halbhundert',
    description: '50 Workouts abgeschlossen',
    icon: '\uD83C\uDFC6',
    category: 'milestone',
    criteria: { type: 'workout_count', threshold: 50 },
  },
  {
    id: 'workout-100',
    name: 'Centurion',
    description: '100 Workouts abgeschlossen',
    icon: '\uD83D\uDC51',
    category: 'milestone',
    criteria: { type: 'workout_count', threshold: 100 },
  },
  {
    id: 'workout-500',
    name: 'Titan',
    description: '500 Workouts abgeschlossen',
    icon: '\uD83D\uDC8E',
    category: 'milestone',
    criteria: { type: 'workout_count', threshold: 500 },
  },

  // === Performance-Badges ===
  {
    id: 'pr-1',
    name: 'Neuer Rekord',
    description: 'Ersten persoenlichen Rekord aufgestellt',
    icon: '\u26A1',
    category: 'performance',
    criteria: { type: 'personal_record_count', threshold: 1 },
  },
  {
    id: 'pr-5',
    name: 'Rekordjaeger',
    description: '5 persoenliche Rekorde aufgestellt',
    icon: '\u26A1',
    category: 'performance',
    criteria: { type: 'personal_record_count', threshold: 5 },
  },
  {
    id: 'pr-20',
    name: 'Bestleistungs-Maschine',
    description: '20 persoenliche Rekorde aufgestellt',
    icon: '\uD83C\uDF1F',
    category: 'performance',
    criteria: { type: 'personal_record_count', threshold: 20 },
  },
  {
    id: 'volume-1000',
    name: 'Tonne bewegt',
    description: '1.000 kg Gesamtvolumen',
    icon: '\uD83C\uDFCB\uFE0F',
    category: 'performance',
    criteria: { type: 'total_volume_kg', threshold: 1000 },
  },
  {
    id: 'volume-10000',
    name: '10-Tonnen-Klub',
    description: '10.000 kg Gesamtvolumen',
    icon: '\uD83D\uDE80',
    category: 'performance',
    criteria: { type: 'total_volume_kg', threshold: 10000 },
  },
  {
    id: 'volume-100000',
    name: '100-Tonnen-Legende',
    description: '100.000 kg Gesamtvolumen',
    icon: '\uD83C\uDF0B',
    category: 'performance',
    criteria: { type: 'total_volume_kg', threshold: 100000 },
  },

  // === Spezial-Badges ===
  {
    id: 'early-bird',
    name: 'Fruehaufsteher',
    description: 'Workout vor 7 Uhr morgens',
    icon: '\uD83C\uDF05',
    category: 'special',
    criteria: { type: 'early_bird', threshold: 1 },
  },
  {
    id: 'night-owl',
    name: 'Nachteule',
    description: 'Workout nach 21 Uhr',
    icon: '\uD83C\uDF19',
    category: 'special',
    criteria: { type: 'night_owl', threshold: 1 },
  },
];

export function getBadgeById(id: string): Badge | undefined {
  return badges.find(b => b.id === id);
}
