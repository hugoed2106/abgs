import {
    getAuth,
    onAuthStateChanged,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { app } from "./fb-app.js";

export const auth = getAuth(app);

// Devuelve el usuario actual; si no hay sesión, inicia una anónima.
// Ese uid es el que enlaza los datos enviados con "Ver mis datos".
export function getUser() {
    return new Promise(function (resolve, reject) {
        const unsubscribe = onAuthStateChanged(auth, async function (user) {
            unsubscribe();
            if (user) {
                resolve(user);
                return;
            }
            try {
                const credential = await signInAnonymously(auth);
                resolve(credential.user);
            } catch (error) {
                reject(error);
            }
        }, reject);
    });
}
