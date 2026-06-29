import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where,
} from "firebase/firestore";

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

// The admin can approve org-wide publishing and curate the shared library.
export const ADMIN_EMAIL = "pankaj.rai@flick2know.com";
export const isAdminEmail = (email) => (email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

export function signInWithGoogle() { return signInWithPopup(auth, provider); }
export function signOutUser() { return signOut(auth); }
export function onAuth(cb) { return onAuthStateChanged(auth, cb); }

const agentsCol = collection(db, "agents");
const stripMeta = (a) => { const { _id, _ownerUid, _ownerName, _ownerEmail, _visibility, _orgStatus, ...bp } = a; return bp; };
const toItem = (d) => {
  const x = d.data();
  return { ...(x.blueprint || {}), _id: d.id, _ownerUid: x.ownerUid, _ownerName: x.ownerName, _ownerEmail: x.ownerEmail, _visibility: x.visibility || "personal", _orgStatus: x.orgStatus || "none" };
};

// One-time migration of Stage-1 blob (users/{uid}.agents) into individual agent docs.
async function migrateIfNeeded(user) {
  try {
    const uref = doc(db, "users", user.uid);
    const snap = await getDoc(uref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.migrated || !Array.isArray(data.agents) || data.agents.length === 0) return;
    for (const bp of data.agents) {
      await addDoc(agentsCol, {
        ownerUid: user.uid, ownerName: user.displayName || "", ownerEmail: user.email || "",
        visibility: "personal", orgStatus: "none", blueprint: bp,
        createdAt: bp._createdAt || Date.now(), updatedAt: Date.now(),
      });
    }
    await setDoc(uref, { migrated: true }, { merge: true });
  } catch (e) { console.error("Migration failed:", e); }
}

// Returns this user's own agents + all org-shared agents (deduped).
export async function loadAllAgents(user) {
  await migrateIfNeeded(user);
  const out = new Map();
  try {
    const mine = await getDocs(query(agentsCol, where("ownerUid", "==", user.uid)));
    mine.forEach(d => out.set(d.id, toItem(d)));
  } catch (e) { console.error("load mine failed:", e); }
  try {
    const org = await getDocs(query(agentsCol, where("visibility", "==", "org")));
    org.forEach(d => { if (!out.has(d.id)) out.set(d.id, toItem(d)); });
  } catch (e) { console.error("load org failed:", e); }
  return Array.from(out.values()).sort((a, b) => (b._createdAt || 0) - (a._createdAt || 0));
}

export async function createAgent(user, bp) {
  const ref = await addDoc(agentsCol, {
    ownerUid: user.uid, ownerName: user.displayName || "", ownerEmail: user.email || "",
    visibility: "personal", orgStatus: "none", blueprint: stripMeta(bp),
    createdAt: bp._createdAt || Date.now(), updatedAt: Date.now(),
  });
  return ref.id;
}
export async function updateAgentBlueprint(id, bp) {
  await updateDoc(doc(db, "agents", id), { blueprint: stripMeta(bp), updatedAt: Date.now() });
}
export async function deleteAgentDoc(id) { await deleteDoc(doc(db, "agents", id)); }

// Employee asks for org-wide; visibility stays personal until an admin approves.
export async function requestOrg(id) { await updateDoc(doc(db, "agents", id), { orgStatus: "pending" }); }

// Admin actions.
export async function approveOrg(id) { await updateDoc(doc(db, "agents", id), { visibility: "org", orgStatus: "approved" }); }
export async function rejectOrg(id) { await updateDoc(doc(db, "agents", id), { orgStatus: "rejected" }); }
export async function unpublishOrg(id) { await updateDoc(doc(db, "agents", id), { visibility: "personal", orgStatus: "none" }); }
export async function loadPendingRequests() {
  try {
    const q = await getDocs(query(agentsCol, where("orgStatus", "==", "pending")));
    return q.docs.map(toItem);
  } catch (e) { console.error("load pending failed:", e); return []; }
}

// User directory — records each person on login so the admin can see who's using it.
export async function upsertUserProfile(user) {
  try {
    await setDoc(doc(db, "users", user.uid), {
      email: user.email || "", name: user.displayName || "", photo: user.photoURL || "",
      lastSeen: Date.now(),
    }, { merge: true });
  } catch (e) { console.error("upsertUserProfile failed:", e); }
}

export async function loadAllUsers() {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(u => u.email)
      .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  } catch (e) { console.error("loadAllUsers failed:", e); return []; }
}
