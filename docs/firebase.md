# Firebase: Konten, Cloud-Spielstände und automatische Regeln

Loco läuft ohne Konto vollständig. Wer sich anmeldet, bekommt seinen Spielstand
zusätzlich in die Cloud gelegt und kann auf mehreren Geräten weiterspielen.

Dieses Dokument beschreibt, was im Repo steckt und was du einmalig in der Firebase-
Konsole und auf GitHub einrichten musst.

## Was im Repo liegt

| Datei | Wofür |
|---|---|
| `src/cloud/config.ts` | Die Firebase-Konfiguration des Projekts `game-e87e0` |
| `src/cloud/firebase.ts` | Lädt das Firebase-SDK erst, wenn es gebraucht wird |
| `src/cloud/account.svelte.ts` | Anmeldung, Abmeldung, Hoch- und Herunterladen des Spielstands |
| `src/cloud/sync.ts` | Entscheidet, welcher Stand gilt, wenn Gerät und Cloud auseinanderlaufen |
| `firestore.rules` | Die Zugriffsregeln der Datenbank |
| `tests/firestore.rules.test.ts` | Prüft die Regeln gegen den Emulator |
| `.github/workflows/firebase-rules.yml` | Veröffentlicht die Regeln, sobald sie auf `main` landen |

## Warum der API-Schlüssel im Code steht

Der Schlüssel in `src/cloud/config.ts` ist kein Geheimnis. Firebase-Web-Schlüssel stehen
in jedem ausgelieferten Bundle und lassen sich aus jedem Browser auslesen; das ist so
vorgesehen. Sie sagen nur, *welches* Projekt gemeint ist, nicht *wer* etwas darf.

Geschützt wird das Projekt durch zwei andere Dinge, und die sind wichtig:

1. **Die Firestore-Regeln** in `firestore.rules`. Sie sagen, dass jedes Konto nur seinen
   eigenen Spielstand lesen und schreiben darf und sonst nichts.
2. **Die erlaubten Domains** in der Firebase-Konsole. Eine Anmeldung funktioniert nur
   von Adressen, die dort eingetragen sind.

Wer ein eigenes Firebase-Projekt nutzen will, setzt beim Build die Variablen
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` und
`VITE_FIREBASE_APP_ID`. Ohne diese Variablen gelten die Werte aus dem Code.

## Schritt 1: Erlaubte Domains eintragen

Ohne diesen Schritt schlägt die Google-Anmeldung mit
«Diese Adresse ist in der Firebase-Konsole nicht als erlaubte Domain eingetragen» fehl.

1. Firebase-Konsole öffnen, Projekt **game-e87e0**.
2. Links auf **Authentication**, dann Reiter **Einstellungen**, Abschnitt
   **Autorisierte Domains**.
3. Diese Einträge müssen dort stehen:
   - `localhost` für die Entwicklung
   - `locogame.netlify.app` für die Netlify-Adresse
   - `loco.alae.app` für die eigene Domain

Die eigene Domain muss auch dann eingetragen sein, wenn die DNS-Prüfung noch läuft.
Sobald sie greift, funktioniert die Anmeldung dort ohne weiteres Zutun.

Deploy-Vorschauen von Netlify haben wechselnde Adressen und lassen sich nicht sinnvoll
eintragen. Zum Ausprobieren der Anmeldung nimm `localhost` oder eine der beiden
Hauptadressen.

## Schritt 2: Dienstkonto für die GitHub Action erstellen

Die Action braucht einen Schlüssel, mit dem sie die Regeln veröffentlichen darf.

1. Firebase-Konsole, Zahnrad oben links, **Projekteinstellungen**.
2. Reiter **Dienstkonten**.
3. Knopf **Neuen privaten Schlüssel generieren**, dann **Schlüssel generieren**.
   Es lädt eine JSON-Datei herunter. Diese Datei ist ein echtes Geheimnis: Sie gehört
   nicht ins Repository und nicht in einen Chat.

## Schritt 3: Den Schlüssel als GitHub-Secret hinterlegen

1. Auf GitHub das Repository **vonallmenalain/Game** öffnen.
2. **Settings**, links **Secrets and variables**, darunter **Actions**.
3. Knopf **New repository secret**.
4. Name: `FIREBASE_SERVICE_ACCOUNT`
5. Secret: den **kompletten Inhalt** der heruntergeladenen JSON-Datei, von der
   ersten geschweiften Klammer bis zur letzten. Datei im Texteditor öffnen, alles
   markieren, kopieren, einfügen.
6. **Add secret**.

Danach kannst du die JSON-Datei auf deinem Rechner löschen. Brauchst du sie später
wieder, generierst du einfach einen neuen Schlüssel.

## Schritt 4: Die Action laufen lassen

1. Auf GitHub Reiter **Actions**, links **Firestore-Regeln**.
2. Rechts **Run workflow**, Branch `main`, dann **Run workflow**.

Die Action prüft zuerst die Regeln gegen den Emulator und veröffentlicht sie danach.
Ob es geklappt hat, siehst du in der Firebase-Konsole unter **Firestore**, Reiter
**Regeln**: Dort muss dann der Inhalt von `firestore.rules` stehen, nicht mehr
`allow read, write: if false`.

### Schritt 5: Dem Dienstkonto die nötigen Rollen geben

Das frisch erzeugte Dienstkonto darf noch nicht genug. Beim ersten Lauf meldet die
Action darum so etwas:

```
Error: Request to https://serviceusage.googleapis.com/v1/projects/game-e87e0/services/
firestore.googleapis.com had HTTP Error: 403, Permission denied to get service
```

Das ist kein Fehler im Schlüssel, sondern eine fehlende Rolle. Die Firebase-CLI prüft
vor dem Veröffentlichen, ob die Firestore-Schnittstelle aktiv ist, und dafür braucht
sie eine eigene Berechtigung.

1. [Google-Cloud-Konsole](https://console.cloud.google.com/iam-admin/iam) öffnen,
   oben das Projekt **game-e87e0** wählen.
2. Links **IAM**, in der Liste das Konto suchen, das mit `firebase-adminsdk` beginnt
   und auf `@game-e87e0.iam.gserviceaccount.com` endet.
3. Am Zeilenende auf den Stift klicken, dann zweimal **Weitere Rolle hinzufügen**:
   - **Firebase Rules Admin**, damit es die Regeln schreiben darf
   - **Service Usage Consumer**, damit es die Schnittstellen-Prüfung machen darf
4. **Speichern**. Es dauert bis zu einer Minute, bis die Rollen greifen.
5. Die Action noch einmal starten: Reiter **Actions**, **Firestore-Regeln**,
   **Run workflow**.

Wer es kurz halten will, kann stattdessen die Rolle **Editor** vergeben. Die deckt
alles ab, gibt dem Konto aber deutlich mehr Rechte als nötig. Die beiden Rollen oben
sind die sparsamere Wahl.

## So änderst du die Regeln künftig

Die Regeln gehen sofort live, sobald sie auf `main` liegen. Darum:

1. Auf einem Branch `firestore.rules` ändern.
2. Passenden Test in `tests/firestore.rules.test.ts` ergänzen, damit belegt ist, was
   erlaubt und was verboten sein soll.
3. Lokal prüfen mit `npm run test:rules`. Das startet den Firestore-Emulator und
   braucht Java; auf dem Rechner reicht eine übliche Java-Installation.
4. Pull Request öffnen, prüfen lassen, mergen. Die Action veröffentlicht die Regeln.

Ein manueller Klick in der Firebase-Konsole bleibt möglich, wird aber beim nächsten
Lauf der Action überschrieben. Die Datei im Repository ist die Wahrheit.

## Was in der Datenbank landet

Ein Dokument je Konto, in der Sammlung `spielstaende`, unter der Konto-Kennung als
Dokumentname:

| Feld | Inhalt |
|---|---|
| `json` | Der Spielstand als Text, dasselbe Format wie beim Export als Datei |
| `playedSeconds` | Gespielte Sekunden, dient dem Vergleich zweier Geräte |
| `km` | Kilometerstand, nur zur Anzeige in der Rückfrage |
| `version` | Version des Spielstand-Formats |
| `aktualisiert` | Wanduhr des letzten Hochladens |
| `geraet` | Grobe Geräteart, etwa «Android» oder «Mac» |

Personendaten stehen dort nicht drin. E-Mail-Adresse und Name liegen bei Firebase
Authentication, nicht in der Datenbank.

## Wann hoch- und heruntergeladen wird

- Alle zwei Minuten, solange das Spiel offen und jemand angemeldet ist.
- Beim Wechsel in den Hintergrund, etwa wenn du die App schliesst.
- Beim Anmelden wird verglichen, wer weiter ist.

Verglichen wird die **gespielte Zeit**, nicht die Uhrzeit. Sie wächst nur durch Spielen
und lügt nicht, wenn ein Gerät falsch gestellt ist.

- Ist die Cloud mehr als eine Minute weiter, fragt das Spiel nach und zeigt beide Stände
  mit Kilometer und Spielzeit.
- Ist das Gerät weiter, wird ungefragt hochgeladen. Dabei geht nichts verloren.
- Liegen beide gleichauf, passiert nichts.

## Kosten

Der kostenlose Spark-Tarif erlaubt 20 000 Schreibvorgänge pro Tag. Ein Gerät schreibt
höchstens einmal alle zwei Minuten, also rund 720 pro Tag bei durchgehendem Spielen.
Das reicht für viele Spieler, bevor der Tarif überhaupt eine Rolle spielt.
