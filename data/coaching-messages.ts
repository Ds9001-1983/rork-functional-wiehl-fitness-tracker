// Coaching-Nachrichten basierend auf dem Transtheoretischen Modell (TTM)
// und den 4 Ton-Profilen aus der Fitness-App-Recherche

export type CoachingTone = 'motivator' | 'competitor' | 'scientist' | 'buddy';

export interface CoachingMessage {
  trigger: string;
  tone: CoachingTone;
  messages: string[];
}

// === Workout-Abschluss Nachrichten ===
export const workoutCompleteMessages: Record<CoachingTone, string[]> = {
  motivator: [
    'Super gemacht! Jedes Workout zaehlt.',
    'Du bist auf dem richtigen Weg! Weiter so.',
    'Toll, dass du heute trainiert hast. Dein Koerper dankt es dir!',
    'Starke Leistung! Du wirst jeden Tag besser.',
  ],
  competitor: [
    'Abgehakt! Morgen wird noch besser.',
    'Gutes Workout. Aber da geht noch was, oder?',
    'Erledigt! Schaffst du morgen mehr?',
    'Nicht schlecht. Jetzt dranbleiben und uebertrumpfen!',
  ],
  scientist: [
    'Workout protokolliert. Deine Konsistenz ist der Schluessel zum Erfolg.',
    'Training abgeschlossen. Denk an ausreichend Protein fuer die Regeneration.',
    'Daten gespeichert. Regelmaessiges Training verbessert nachweislich Kraft und Ausdauer.',
    'Workout erfasst. Achte auf mindestens 48h Pause fuer die trainierten Muskelgruppen.',
  ],
  buddy: [
    'Yeah, geschafft! Das war ein gutes Training!',
    'Boom! Wieder ein Workout im Kasten!',
    'Nice, du hast es durchgezogen! Respekt!',
    'Laeuft bei dir! Morgen gleiche Zeit?',
  ],
};

// === Streak-Nachrichten ===
export const streakMessages: Record<CoachingTone, Record<string, string[]>> = {
  motivator: {
    new_streak: ['Du hast eine neue Serie gestartet! Bleib dran!'],
    streak_3: ['3 Tage in Folge! Du baust dir eine tolle Gewohnheit auf.'],
    streak_7: ['Eine ganze Woche! Deine Disziplin zahlt sich aus.'],
    streak_30: ['30 Tage! Das ist eine echte Leistung. Sei stolz auf dich!'],
    streak_lost: ['Kein Stress – morgen geht es weiter. Jeder Tag ist ein neuer Start.'],
  },
  competitor: {
    new_streak: ['Serie gestartet. Mal sehen, wie weit du kommst!'],
    streak_3: ['3 Tage. Gut, aber das ist erst der Anfang.'],
    streak_7: ['7 Tage – respektabel. Jetzt nicht nachlassen!'],
    streak_30: ['30 Tage am Stueck! Du bist eine Maschine!'],
    streak_lost: ['Serie gerissen. Steh auf und starte eine neue – noch laenger!'],
  },
  scientist: {
    new_streak: ['Neue Trainingsroutine erkannt. Konsistenz ist der beste Praediktor fuer Erfolg.'],
    streak_3: ['3 Tage Aktivitaet. Studien zeigen: nach 21 Tagen wird es zur Gewohnheit.'],
    streak_7: ['7 Tage konsistent. Dein Koerper beginnt sich anzupassen.'],
    streak_30: ['30-Tage-Marke erreicht. Hormonell optimierte Regeneration nach regelmaessigem Training.'],
    streak_lost: ['Trainingsunterbrechung registriert. 1-2 Tage Pause beeinflussen die Fitness minimal.'],
  },
  buddy: {
    new_streak: ['Hey, neue Serie! Lass uns die mal richtig lang machen!'],
    streak_3: ['3 Tage, laeuft! Weiter gehts!'],
    streak_7: ['Eine Woche! Du rockst das!'],
    streak_30: ['30 Tage?! Du bist nicht aufzuhalten!'],
    streak_lost: ['Passiert jedem mal. Komm, morgen starten wir durch!'],
  },
};

// === Badge-Freischaltung ===
export const badgeUnlockMessages: Record<CoachingTone, string[]> = {
  motivator: [
    'Neues Abzeichen freigeschaltet! Du machst tolle Fortschritte!',
    'Glueckwunsch zum neuen Badge! Jedes Abzeichen zeigt deinen Einsatz.',
  ],
  competitor: [
    'Badge freigeschaltet! Wie viele schaffst du noch?',
    'Neues Abzeichen! Sammle sie alle!',
  ],
  scientist: [
    'Meilenstein erreicht. Badge als visuelle Erfolgsdokumentation freigeschaltet.',
    'Achievement unlocked. Gamification-Elemente steigern nachweislich die Motivation.',
  ],
  buddy: [
    'Whoa, neuer Badge! Zeig den mal rum!',
    'Geil, freigeschaltet! Du sammelst die wie nix!',
  ],
};

// === Level-Up ===
export const levelUpMessages: Record<CoachingTone, string[]> = {
  motivator: [
    'Level Up! Dein Einsatz zahlt sich aus!',
    'Neues Level erreicht! Du wirst immer staerker!',
  ],
  competitor: [
    'Level Up! Das naechste Level wartet schon!',
    'Aufgestiegen! Wie schnell schaffst du das naechste?',
  ],
  scientist: [
    'Level-Aufstieg. Deine kumulierten Trainingseinheiten zeigen stetigen Fortschritt.',
    'Neues Erfahrungslevel. Progression ist der Schluessel zu langfristigen Ergebnissen.',
  ],
  buddy: [
    'LEVEL UP! Du bist der Hammer!',
    'Boom, neues Level! Das muessen wir feiern!',
  ],
};

// === Re-Engagement (inaktive Nutzer) ===
export const reEngagementMessages: Record<CoachingTone, string[]> = {
  motivator: [
    'Wir vermissen dich! Ein kurzes Workout reicht schon.',
    'Dein naechstes Training wartet auf dich. Du schaffst das!',
  ],
  competitor: [
    'Pause vorbei? Zeit, wieder Gas zu geben!',
    'Deine Konkurrenz trainiert. Du auch?',
  ],
  scientist: [
    'Laengere Inaktivitaet kann zu Muskelabbau fuehren. Schon 20 Minuten helfen.',
    'Deine Fitness baut sich schneller ab als auf. Heute waere ein guter Tag.',
  ],
  buddy: [
    'Hey, alles klar bei dir? Komm, ein kleines Workout tut gut!',
    'Lange nicht gesehen! Lust auf ein schnelles Training?',
  ],
};

// Helper: get random message from array
export function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}
