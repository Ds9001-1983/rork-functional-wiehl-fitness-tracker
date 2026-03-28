import { Exercise } from '@/types/workout';

export const exercises: Exercise[] = [
  // Chest
  {
    id: 'bench-press',
    name: 'Bankdrücken',
    category: 'chest',
    equipment: 'Langhantel',
    muscleGroups: ['Brust', 'Trizeps', 'Schultern'],
    instructions: 'Lege dich auf die Bank, greife die Stange schulterbreit und drücke sie kontrolliert nach oben.'
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Schrägbankdrücken mit Kurzhanteln',
    category: 'chest',
    equipment: 'Kurzhanteln',
    muscleGroups: ['Obere Brust', 'Schultern', 'Trizeps'],
  },
  {
    id: 'cable-fly',
    name: 'Kabelzug Fliegende',
    category: 'chest',
    equipment: 'Kabelzug',
    muscleGroups: ['Brust'],
  },
  
  // Back
  {
    id: 'deadlift',
    name: 'Kreuzheben',
    category: 'back',
    equipment: 'Langhantel',
    muscleGroups: ['Unterer Rücken', 'Gesäß', 'Beinbeuger', 'Trapez'],
  },
  {
    id: 'pull-up',
    name: 'Klimmzüge',
    category: 'back',
    equipment: 'Klimmzugstange',
    muscleGroups: ['Latissimus', 'Bizeps', 'Mittlerer Rücken'],
  },
  {
    id: 'barbell-row',
    name: 'Langhantelrudern',
    category: 'back',
    equipment: 'Langhantel',
    muscleGroups: ['Latissimus', 'Mittlerer Rücken', 'Bizeps'],
  },
  
  // Legs
  {
    id: 'squat',
    name: 'Kniebeuge',
    category: 'legs',
    equipment: 'Langhantel',
    muscleGroups: ['Quadrizeps', 'Gesäß', 'Beinbeuger'],
  },
  {
    id: 'leg-press',
    name: 'Beinpresse',
    category: 'legs',
    equipment: 'Beinpresse',
    muscleGroups: ['Quadrizeps', 'Gesäß'],
  },
  {
    id: 'romanian-deadlift',
    name: 'Rumänisches Kreuzheben',
    category: 'legs',
    equipment: 'Langhantel',
    muscleGroups: ['Beinbeuger', 'Gesäß', 'Unterer Rücken'],
  },
  
  // Shoulders
  {
    id: 'overhead-press',
    name: 'Schulterdrücken',
    category: 'shoulders',
    equipment: 'Langhantel',
    muscleGroups: ['Schultern', 'Trizeps'],
  },
  {
    id: 'lateral-raise',
    name: 'Seitheben',
    category: 'shoulders',
    equipment: 'Kurzhanteln',
    muscleGroups: ['Seitliche Schultern'],
  },
  
  // Arms
  {
    id: 'barbell-curl',
    name: 'Langhantel Curls',
    category: 'arms',
    equipment: 'Langhantel',
    muscleGroups: ['Bizeps'],
  },
  {
    id: 'tricep-dips',
    name: 'Dips',
    category: 'arms',
    equipment: 'Dip-Station',
    muscleGroups: ['Trizeps', 'Untere Brust'],
  },
  
  // Core
  {
    id: 'plank',
    name: 'Plank',
    category: 'core',
    equipment: 'Körpergewicht',
    muscleGroups: ['Core', 'Bauch'],
  },
  {
    id: 'hanging-leg-raise',
    name: 'Beinheben hängend',
    category: 'core',
    equipment: 'Klimmzugstange',
    muscleGroups: ['Untere Bauchmuskeln', 'Hüftbeuger'],
  },
];

export const exerciseCategories = [
  { id: 'chest', name: 'Brust', icon: '💪' },
  { id: 'back', name: 'Rücken', icon: '🔙' },
  { id: 'legs', name: 'Beine', icon: '🦵' },
  { id: 'shoulders', name: 'Schultern', icon: '🤷' },
  { id: 'arms', name: 'Arme', icon: '💪' },
  { id: 'core', name: 'Core', icon: '🎯' },
  { id: 'cardio', name: 'Cardio', icon: '🏃' },
  { id: 'full-body', name: 'Ganzkörper', icon: '🏋️' },
];