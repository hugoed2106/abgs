import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { db, COLLECTION_ID, UNLOCK_KEY } from "./fb-app.js";
import { getUser } from "./auth.js";

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

/* ---------- Envío de datos a Firebase ---------- */
(function () {
    const form = document.getElementById("contact-form");
    if (!form) return;

    const verDatos = document.getElementById("ver-datos");
    const status = document.getElementById("form-status");
    const submitBtn = form.querySelector(".submit-button");

    // localStorage puede fallar (modo privado, bloqueado, etc.)
    function isUnlocked() {
        try {
            return localStorage.getItem(UNLOCK_KEY) === "1";
        } catch (e) {
            return false;
        }
    }

    function unlock() {
        try {
            localStorage.setItem(UNLOCK_KEY, "1");
        } catch (e) {
            console.warn("No se pudo guardar la clave en localStorage", e);
        }
    }

    // "Ver mis datos" solo se ve si la clave existe
    function refreshVerDatos() {
        if (verDatos) verDatos.hidden = !isUnlocked();
    }

    function setStatus(text, type) {
        status.textContent = text;
        status.className = "form-status" + (type ? " " + type : "");
    }

    refreshVerDatos();

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
            const user = await getUser();

            await addDoc(collection(db, COLLECTION_ID), {
                ...datos,
                uid: user.uid,
                createdAt: serverTimestamp()
            });

            unlock();
            refreshVerDatos();
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
