const fs = require('fs');
const path = require('path');

// Get current directory
const __dirname = process.cwd();

// Trainer-Daten
const trainerData = {
  email: 'app@functional-wiehl.de',
  password: 'Ds9001Ds9001',
  role: 'trainer',
  name: 'Trainer',
  createdAt: new Date().toISOString()
};

// Pfad zur Trainer-Datei
const trainersPath = path.join(__dirname, 'backend', 'data', 'trainers.json');

// Stelle sicher, dass das Verzeichnis existiert
const dataDir = path.dirname(trainersPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Lade existierende Trainer oder erstelle leeres Array
let trainers = [];
if (fs.existsSync(trainersPath)) {
  try {
    const data = fs.readFileSync(trainersPath, 'utf8');
    trainers = JSON.parse(data);
  } catch (_error) {
    console.log('Erstelle neue Trainer-Datei...');
    trainers = [];
  }
}

// Prüfe ob Trainer bereits existiert
const existingTrainer = trainers.find(t => t.email === trainerData.email);
if (existingTrainer) {
  // Update existierenden Trainer
  existingTrainer.password = trainerData.password;
  existingTrainer.name = trainerData.name;
  console.log('Trainer-Daten aktualisiert:', trainerData.email);
} else {
  // Füge neuen Trainer hinzu
  trainers.push(trainerData);
  console.log('Neuer Trainer erstellt:', trainerData.email);
}

// Speichere Trainer-Daten
fs.writeFileSync(trainersPath, JSON.stringify(trainers, null, 2));
console.log('Trainer-Setup abgeschlossen!');
console.log('Login-Daten:');
console.log('Email:', trainerData.email);
console.log('Passwort:', trainerData.password);