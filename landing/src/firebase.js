import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDfYebKZtMKAsnQBCxvR7So5BXKVkLJF-M",
  authDomain: "app-tppperu.firebaseapp.com",
  projectId: "app-tppperu",
  storageBucket: "app-tppperu.firebasestorage.app",
  messagingSenderId: "589627968387",
  appId: "1:589627968387:web:2b687fc21eaa1cc53f44b6",
  measurementId: "G-TP05WLW7GP"
};

const app = initializeApp(firebaseConfig);
// En Astro, analytics solo corre en el cliente
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export default app;
