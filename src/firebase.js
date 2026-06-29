import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCNR8Q6L4ZhLOz7OFsb8sz2grPKKlOYb0g",
  authDomain: "fa-agent-studio.firebaseapp.com",
  projectId: "fa-agent-studio",
  storageBucket: "fa-agent-studio.firebasestorage.app",
  messagingSenderId: "750074793323",
  appId: "1:750074793323:web:d0c14513e83e745ac4902e",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export function signInWithGoogle() { return signInWithPopup(auth, provider); }
export function signOutUser() { return signOut(auth); }
export function onAuth(cb) { return onAuthStateChanged(auth, cb); }

// Stage 1: each user's agents are stored as one document at users/{uid}.
export async function loadUserAgents(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data().agents || []) : [];
  } catch (e) { console.error("Firestore load failed:", e); return []; }
}

export async function saveUserAgents(uid, agents) {
  try {
    await setDoc(doc(db, "users", uid), { agents, updatedAt: Date.now() }, { merge: true });
  } catch (e) { console.error("Firestore save failed:", e); }
}
