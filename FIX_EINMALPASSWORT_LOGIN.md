# Fix: Einmalpasswort-Login

**Branch:** `claude/fix-otp-generation-HbKl0`
**Commit:** `7d48032 fix(auth): Einmalpasswort-Login korrigieren`
**Datum:** 2026-05-19

## Problem

Kunden konnten sich mit dem vom Trainer generierten Starter-Passwort
("Einmalpasswort") nicht zuverlässig anmelden. Die Verifizierung des
Codes hat drei reale Bugs ergeben — der eigentliche bcrypt-Pfad in der
Datenbank funktioniert korrekt, die Fehler lagen davor.

## Verifizierte Bugs

### 1. E-Mail-Case-Sensitivity (Hauptursache)
- Beim Anlegen wurde die E-Mail im Frontend mit `.trim().toLowerCase()`
  versendet (`expo/app/(trainer-tabs)/index.tsx:92`), aber **nicht** im
  Backend nachnormalisiert.
- Beim Login wurde die E-Mail **roh** ans Backend geschickt
  (`expo/app/login.tsx:67`, `expo/hooks/use-auth.tsx:89`).
- Die Backend-Query `SELECT * FROM users WHERE email = $1`
  (`expo/backend/trpc/routes/auth/login.ts:43-46`) vergleicht
  case-sensitive → tippt der Kunde `Max@Example.com`, in der DB steht
  aber `max@example.com`, schlägt der Login mit `USER_NOT_INVITED`
  fehl.

### 2. Verwechselbare Zeichen im Starter-Passwort
- `expo/app/(trainer-tabs)/index.tsx:59-70` generierte Passwörter aus
  dem vollen Alphabet `A-Z0-9` inklusive `0`, `O`, `1`, `I`, `l` und
  shuffelte mit `Math.random()`.
- Kunden lasen Zeichen falsch ab → `INVALID_PASSWORD`.
- Ein zweiter Generator in `expo/app/trainer.tsx:29-39` und der
  Backend-Generator in `expo/backend/storage.ts:957` nutzten bereits
  ein reduziertes Alphabet — drei unterschiedliche Implementierungen
  insgesamt.

### 3. In-Memory-Login verglich Plaintext
- Der Fallback-Pfad ohne DB
  (`expo/backend/trpc/routes/auth/login.ts:21-39`) machte
  `client.starterPassword !== password` (Plaintext-Vergleich).
- Inkonsistent zum DB-Pfad (`bcrypt.compare`), und Trainer-/Admin-Logins
  funktionierten in diesem Modus gar nicht.

## Umgesetzte Änderungen

### Neue Datei: `expo/lib/starter-password.ts`
Gemeinsame Util-Funktion `generateStarterPassword(length = 8)`:
- Alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ohne `0`, `O`, `1`, `I`, `l`)
- Nutzt `globalThis.crypto.getRandomValues` mit `Math.random`-Fallback

### `expo/app/login.tsx:67`
```ts
const normalizedEmail = email.trim().toLowerCase();
const loggedIn = await login(normalizedEmail, password.trim());
```

### `expo/hooks/use-auth.tsx:73-92`
Belt-and-Suspenders: zusätzliche Normalisierung im Auth-Hook, bevor der
tRPC-Call rausgeht.

### `expo/backend/trpc/routes/auth/login.ts:14`
Serverseitige Normalisierung (Defense in Depth):
```ts
const email = input.email.trim().toLowerCase();
```

### `expo/backend/trpc/routes/auth/login.ts:21-66`
In-Memory-Pfad auf `bcrypt.compare` umgestellt, identisch zum DB-Pfad.
Lookup geht jetzt über `storage.users.findByEmail`, Profildaten kommen
aus `storage.clients` (für Clients) bzw. direkt aus dem User-Record
(für Trainer/Admin).

### `expo/backend/trpc/routes/clients/create.ts:19-44`
E-Mail, Telefon und Name werden serverseitig normalisiert und
getrimmt, bevor Duplikatsprüfung und Insert laufen.

### `expo/app/(trainer-tabs)/index.tsx`
Inline-Generator entfernt, Import aus `@/lib/starter-password`.

### `expo/app/trainer.tsx`
Inline-Generator entfernt, Import aus `@/lib/starter-password`.

## Verifikation

- **Tests:** `bun test __tests__/` → 38/38 grün.
- **Typecheck:** `bun run typecheck` zeigt nur pre-existing Fehler in
  anderen Dateien (per `git stash`-Vergleich bestätigt). Keine neuen
  TS-Fehler durch die Änderungen.

## Manueller End-to-End-Test (empfohlen)

1. Trainer legt Testkunden mit `Test.User@Example.COM` an.
2. Logout.
3. Login mit `Test.User@Example.COM` (Großschreibung) +
   Starter-Passwort → muss funktionieren.
4. Erneut mit `test.user@example.com` + ` test.user@example.com `
   (Whitespace) testen → muss ebenfalls funktionieren.
5. Generiertes Starter-Passwort enthält keine Zeichen aus
   `{0, O, 1, I, l}`.
6. Nach erstem Login → Redirect auf `change-password`-Screen.

## Geänderte Dateien

| Datei | Art |
|-------|-----|
| `expo/lib/starter-password.ts` | neu |
| `expo/app/login.tsx` | geändert |
| `expo/hooks/use-auth.tsx` | geändert |
| `expo/backend/trpc/routes/auth/login.ts` | geändert |
| `expo/backend/trpc/routes/clients/create.ts` | geändert |
| `expo/app/(trainer-tabs)/index.tsx` | geändert |
| `expo/app/trainer.tsx` | geändert |
