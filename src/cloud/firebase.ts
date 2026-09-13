/**
 * Firebase wird erst geladen, wenn es gebraucht wird. Das Spiel läuft ohne Konto
 * vollständig, und das Bundle bleibt klein: Wer nie anmeldet, lädt das SDK nie.
 */
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

export interface FirebaseBundle {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  api: {
    signInWithEmailAndPassword: typeof import('firebase/auth').signInWithEmailAndPassword;
    createUserWithEmailAndPassword: typeof import('firebase/auth').createUserWithEmailAndPassword;
    signInWithPopup: typeof import('firebase/auth').signInWithPopup;
    signOut: typeof import('firebase/auth').signOut;
    sendPasswordResetEmail: typeof import('firebase/auth').sendPasswordResetEmail;
    onAuthStateChanged: typeof import('firebase/auth').onAuthStateChanged;
    GoogleAuthProvider: typeof import('firebase/auth').GoogleAuthProvider;
    doc: typeof import('firebase/firestore').doc;
    getDoc: typeof import('firebase/firestore').getDoc;
    setDoc: typeof import('firebase/firestore').setDoc;
    deleteDoc: typeof import('firebase/firestore').deleteDoc;
    runTransaction: typeof import('firebase/firestore').runTransaction;
  };
}

let bundle: Promise<FirebaseBundle> | null = null;

export function loadFirebase(): Promise<FirebaseBundle> {
  bundle ??= (async () => {
    const [appMod, authMod, storeMod] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const app = appMod.getApps().length > 0 ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
    return {
      app,
      auth: authMod.getAuth(app),
      db: storeMod.getFirestore(app),
      api: {
        signInWithEmailAndPassword: authMod.signInWithEmailAndPassword,
        createUserWithEmailAndPassword: authMod.createUserWithEmailAndPassword,
        signInWithPopup: authMod.signInWithPopup,
        signOut: authMod.signOut,
        sendPasswordResetEmail: authMod.sendPasswordResetEmail,
        onAuthStateChanged: authMod.onAuthStateChanged,
        GoogleAuthProvider: authMod.GoogleAuthProvider,
        doc: storeMod.doc,
        getDoc: storeMod.getDoc,
        setDoc: storeMod.setDoc,
        deleteDoc: storeMod.deleteDoc,
        runTransaction: storeMod.runTransaction,
      },
    };
  })();
  return bundle;
}

export function accountName(user: User): string {
  return user.displayName ?? user.email ?? 'Angemeldet';
}

/** Firebase-Fehlercodes als Sätze, die erklären, was zu tun ist. */
export function describeAuthError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Diese E-Mail-Adresse sieht nicht richtig aus.';
    case 'auth/missing-password':
      return 'Bitte gib ein Passwort ein.';
    case 'auth/weak-password':
      return 'Das Passwort braucht mindestens sechs Zeichen.';
    case 'auth/email-already-in-use':
      return 'Für diese Adresse gibt es schon ein Konto. Melde dich stattdessen an.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-Mail oder Passwort stimmen nicht.';
    case 'auth/too-many-requests':
      return 'Zu viele Versuche. Warte einen Moment und versuche es dann noch einmal.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Die Anmeldung wurde abgebrochen.';
    case 'auth/popup-blocked':
      return 'Der Browser hat das Anmeldefenster blockiert. Erlaube Pop-ups für diese Seite.';
    case 'auth/unauthorized-domain':
      return 'Diese Adresse ist in der Firebase-Konsole nicht als erlaubte Domain eingetragen.';
    case 'auth/network-request-failed':
      return 'Keine Verbindung. Das Spiel läuft weiter, der Abgleich wartet.';
    case 'auth/operation-not-allowed':
      return 'Diese Anmeldeart ist im Firebase-Projekt nicht aktiviert.';
    case 'permission-denied':
      return 'Die Datenbank hat den Zugriff abgelehnt. Prüfe die Firestore-Regeln.';
    case 'unavailable':
      return 'Die Cloud ist gerade nicht erreichbar. Das Spiel läuft lokal weiter.';
    default:
      return 'Das hat nicht geklappt. Versuche es später noch einmal.';
  }
}
