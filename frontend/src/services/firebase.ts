import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// --- DEINE CONFIG VON FIREBASE HIER EINTRAGEN ---
const firebaseConfig = {
  apiKey: "AIzaSyB6sttzydLl1kZd3bE7Suzr_862MIBk3PI",
  authDomain: "lumi-ki.firebaseapp.com",
  projectId: "lumi-ki",
  storageBucket: "lumi-ki.firebasestorage.app",
  messagingSenderId: "626497851298",
  appId: "1:626497851298:web:17b809eb62b850bd772cfb"
};

// Initialize Firebase only if not already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
};
