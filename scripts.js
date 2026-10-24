import {
    addDoc,
    collection,
    getDocs,
    limit,
    query,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { db, COLLECTION_ID, UNLOCK_KEY } from "./fb-app.js";
import { alCambiarSesion, cerrarSesion, iniciarSesion } from "./auth.js";

(function () {
    const MOBILE_BREAKPOINT = 768;

    function updateOrientationClass() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isMobilePortrait = width <= MOBILE_BREAKPOINT && height > width;
        document.body.classList.toggle('is-mobile-portrait', isMobilePortrait);
    }

    window.addEventListener('resize', updateOrientationClass);
    window.addEventListener('orientationchange', updateOrientationClass);
    document.addEventListener('DOMContentLoaded', updateOrientationClass);
    updateOrientationClass();
})();

(function () {
    const bar = document.getElementById("bar");
    const home = document.getElementById("home");

    if (!bar || !home) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            bar.classList.toggle("hidden", entry.isIntersecting);
        });
    }, {
        threshold: 0.2
    });

    observer.observe(home);
})();

/* ---------- Cuenta y envío de datos a Firebase ---------- */
(function () {
    const form = document.getElementById("contact-form");
    if (!form) return;

    const verDatos = document.getElementById("ver-datos");
    const status = document.getElementById("form-status");
    const submitBtn = form.querySelector(".submit-button");
    const estadoCuenta = document.getElementById("cuenta-estado");
    const btnLogin = document.getElementById("btn-login");
    const btnLogout = document.getElementById("btn-logout");

    let usuario = null;

    // localStorage puede fallar (modo privado, bloqueado, etc.)
    function unlock() {
        try {
            localStorage.setItem(UNLOCK_KEY, "1");
        } catch (e) {
            console.warn("No se pudo guardar la clave en localStorage", e);
        }
    }

    function lock() {
        try {
            localStorage.removeItem(UNLOCK_KEY);
        } catch (e) { /* sin acceso a localStorage */ }
    }

    function setStatus(text, type) {
        status.textContent = text;
        status.className = "form-status" + (type ? " " + type : "");
    }

    function mensajeLogin(error) {
        if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
            return "Inicio de sesión cancelado.";
        }
        if (error.code === "auth/popup-blocked") {
            return "El navegador bloqueó la ventana emergente. Permítela e inténtalo de nuevo.";
        }
        return "No se pudo iniciar sesión. Inténtalo de nuevo.";
    }

    function pintarCuenta() {
        if (usuario) {
            estadoCuenta.textContent = "Sesión iniciada como " + usuario.email;
            btnLogin.hidden = true;
            btnLogout.hidden = false;
        } else {
            estadoCuenta.textContent = "Inicia sesión con Google para enviar tus datos y consultarlos después desde cualquier dispositivo.";
            btnLogin.hidden = false;
            btnLogout.hidden = true;
        }
    }

    // "Ver mis datos" solo se ve si la cuenta tiene envíos (la clave es solo un recordatorio local)
    async function actualizarVerDatos() {
        verDatos.hidden = true;
        if (!usuario) {
            lock();
            return;
        }
        const uid = usuario.uid;
        try {
            const consulta = query(collection(db, COLLECTION_ID), where("uid", "==", uid), limit(1));
            const snapshot = await getDocs(consulta);
            if (!usuario || usuario.uid !== uid) return; // la sesión cambió mientras consultaba
            if (snapshot.empty) {
                lock();
            } else {
                unlock();
                verDatos.hidden = false;
            }
        } catch (error) {
            console.error("No se pudo comprobar si hay datos:", error);
        }
    }

    btnLogin.addEventListener("click", async function () {
        setStatus("", "");
        try {
            await iniciarSesion();
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
            setStatus(mensajeLogin(error), "error");
        }
    });

    btnLogout.addEventListener("click", function () {
        cerrarSesion();
        setStatus("", "");
    });

    alCambiarSesion(function (user) {
        usuario = user;
        pintarCuenta();
        actualizarVerDatos();
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const datos = {
            nombre: form.nombre.value.trim(),
            correo: form.correo.value.trim(),
            numero: form.numero.value.trim(),
            mensaje: form.mensaje.value.trim()
        };

        submitBtn.disabled = true;
        setStatus("Enviando...", "");

        try {
            let user = usuario;

            // Sin sesión: se pide iniciar sesión con Google y luego se envía
            if (!user) {
                setStatus("Inicia sesión con Google para enviar tus datos...", "");
                try {
                    user = await iniciarSesion();
                } catch (error) {
                    console.error("Error al iniciar sesión:", error);
                    setStatus(mensajeLogin(error), "error");
                    return;
                }
                setStatus("Enviando...", "");
            }

            await addDoc(collection(db, COLLECTION_ID), {
                ...datos,
                uid: user.uid,
                email: user.email,
                createdAt: serverTimestamp()
            });

            usuario = user;
            unlock();
            verDatos.hidden = false;
            form.reset();
            setStatus("¡Datos enviados correctamente! Puedes consultarlos en «Ver mis datos».", "ok");
        } catch (error) {
            console.error("Error al enviar los datos:", error);
            setStatus("No se pudieron enviar los datos. Inténtalo de nuevo.", "error");
        } finally {
            submitBtn.disabled = false;
        }
    });
})();
