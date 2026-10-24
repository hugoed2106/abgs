import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB_dMC7Zn26DW7TwYBguIS3LftiqvWja0c",
    authDomain: "ep-abgs.firebaseapp.com",
    projectId: "ep-abgs",
    storageBucket: "ep-abgs.firebasestorage.app",
    messagingSenderId: "429605777822",
    appId: "1:429605777822:web:4cae1294e06a6dbd87e68f"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ID de la colección en Firestore. La clave de localStorage se construye con él.
export const COLLECTION_ID = "YA130425";
export const UNLOCK_KEY = `${COLLECTION_ID}-unlocked-v1`;