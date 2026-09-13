/**
 * Firebase-Konfiguration. Diese Werte sind öffentlich, sie stehen in jedem
 * ausgelieferten Bundle. Geschützt wird nicht durch Geheimhaltung, sondern durch
 * die Regeln in firestore.rules und durch die erlaubten Domains in der Firebase-Konsole.
 * Wer ein eigenes Projekt nutzen will, setzt die VITE_FIREBASE_-Variablen beim Build.
 */
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env['VITE_FIREBASE_API_KEY'] ?? 'AIzaSyDxQnAcN56wHpXQGdtF9f_xDReuBmxOlTc',
  authDomain: env['VITE_FIREBASE_AUTH_DOMAIN'] ?? 'game-e87e0.firebaseapp.com',
  projectId: env['VITE_FIREBASE_PROJECT_ID'] ?? 'game-e87e0',
  storageBucket: env['VITE_FIREBASE_STORAGE_BUCKET'] ?? 'game-e87e0.firebasestorage.app',
  messagingSenderId: env['VITE_FIREBASE_MESSAGING_SENDER_ID'] ?? '418328972375',
  appId: env['VITE_FIREBASE_APP_ID'] ?? '1:418328972375:web:4d87b2f44bd0735fe5e712',
};

/** Ein Dokument je Konto. Der Pfad steht so auch in firestore.rules. */
export const SAVE_COLLECTION = 'spielstaende';
