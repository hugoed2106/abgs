import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { app } from "./fb-app.js";

export const auth = getAuth(app);

// Inicia sesión con Google (abre una ventana emergente) y devuelve el usuario.
export async function iniciarSesion() {
    const proveedor = new GoogleAuthProvider();
    proveedor.setCustomParameters({ prompt: "select_account" });
    const credencial = await signInWithPopup(auth, proveedor);
    return credencial.user;
}

export function cerrarSesion() {
    return signOut(auth);
}

// Avisa cada vez que cambia la sesión. Entrega el usuario o null.
// Las sesiones anónimas antiguas se tratan como "sin sesión".
export function alCambiarSesion(callback) {
    return onAuthStateChanged(auth, function (user) {
        callback(user && !user.isAnonymous ? user : null);
    });
}
