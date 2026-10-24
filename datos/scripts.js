import { collection, getDocs } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { db, COLLECTION_ID } from "../fb-app.js";
import { auth } from "../auth.js";

// Cuentas autorizadas. La seguridad real está en firestore.rules (mismas cuentas).
const ADMIN_EMAILS = [
    "hugo.ed2106@gmail.com",
    "h.eliass1017@gmail.com"
];

const $ = function (id) { return document.getElementById(id); };

const vistas = {
    carga: $("vista-carga"),
    login: $("vista-login"),
    denegado: $("vista-denegado"),
    panel: $("vista-panel")
};

function mostrar(nombre) {
    Object.keys(vistas).forEach(function (clave) {
        vistas[clave].hidden = clave !== nombre;
    });
}

/* ---------- Utilidades ---------- */
function normalizar(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function dos(n) {
    return String(n).padStart(2, "0");
}

// dd/mm/aaaa hh:mm
function formatearFecha(fecha) {
    return dos(fecha.getDate()) + "/" + dos(fecha.getMonth() + 1) + "/" + fecha.getFullYear() +
        " " + dos(fecha.getHours()) + ":" + dos(fecha.getMinutes());
}

function esAdmin(user) {
    return !!(user && !user.isAnonymous && user.email &&
        ADMIN_EMAILS.indexOf(user.email.toLowerCase()) !== -1);
}

/* ---------- Estado ---------- */
let registros = [];
let orden = { clave: "fecha", dir: "desc" };

/* ---------- Carga de datos ---------- */
async function cargarDatos() {
    $("resumen").textContent = "Cargando datos...";
    $("filas").replaceChildren();

    try {
        const snapshot = await getDocs(collection(db, COLLECTION_ID));

        registros = snapshot.docs.map(function (doc) {
            const d = doc.data();
            const fecha = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : null;
            const fechaTxt = fecha ? formatearFecha(fecha) : "";
            const registro = {
                id: doc.id,
                uid: d.uid || "",
                nombre: d.nombre || "",
                correo: d.correo || "",
                numero: d.numero || "",
                mensaje: d.mensaje || "",
                fecha: fecha,
                fechaTxt: fechaTxt
            };
            registro.busqueda = {
                nombre: normalizar(registro.nombre),
                fecha: normalizar(fechaTxt),
                id: normalizar(registro.id),
                uid: normalizar(registro.uid)
            };
            registro.busqueda.todo = [
                registro.busqueda.nombre,
                registro.busqueda.fecha,
                registro.busqueda.id,
                registro.busqueda.uid,
                normalizar(registro.correo),
                normalizar(registro.numero),
                normalizar(registro.mensaje)
            ].join(" ");
            return registro;
        });

        pintar();
    } catch (error) {
        console.error("Error al cargar los datos:", error);
        registros = [];
        $("resumen").textContent = "No se pudieron cargar los datos. Revisa que las reglas de Firestore incluyan tu cuenta.";
        $("resumen").className = "resumen error";
    }
}

/* ---------- Filtrar, ordenar y pintar ---------- */
function filtrar() {
    const campo = $("campo").value;
    const consulta = normalizar($("buscar").value.trim());
    const desdeVal = $("desde").value;
    const hastaVal = $("hasta").value;
    const desde = desdeVal ? new Date(desdeVal + "T00:00:00") : null;
    const hasta = hastaVal ? new Date(hastaVal + "T23:59:59.999") : null;

    return registros.filter(function (r) {
        if (consulta && r.busqueda[campo].indexOf(consulta) === -1) return false;
        if (desde && (!r.fecha || r.fecha < desde)) return false;
        if (hasta && (!r.fecha || r.fecha > hasta)) return false;
        return true;
    });
}

function ordenar(lista) {
    const factor = orden.dir === "asc" ? 1 : -1;
    const clave = orden.clave;

    return lista.slice().sort(function (a, b) {
        if (clave === "fecha") {
            const ta = a.fecha ? a.fecha.getTime() : 0;
            const tb = b.fecha ? b.fecha.getTime() : 0;
            return (ta - tb) * factor;
        }
        return String(a[clave]).localeCompare(String(b[clave]), "es", { sensitivity: "base" }) * factor;
    });
}

function celda(texto, clase) {
    const td = document.createElement("td");
    td.textContent = texto || "—";
    if (clase) td.className = clase;
    return td;
}

function fila(r) {
    const tr = document.createElement("tr");
    tr.append(
        celda(r.fechaTxt, "col-fecha"),
        celda(r.nombre),
        celda(r.correo, "col-correo"),
        celda(r.numero, "col-numero"),
        celda(r.mensaje, "col-mensaje"),
        celda(r.id, "col-id"),
        celda(r.uid, "col-id")
    );
    return tr;
}

function marcarEncabezados() {
    document.querySelectorAll("th[data-clave]").forEach(function (th) {
        const activo = th.dataset.clave === orden.clave;
        th.setAttribute("aria-sort", activo ? (orden.dir === "asc" ? "ascending" : "descending") : "none");
    });
}

function pintar() {
    const filtrados = ordenar(filtrar());

    $("filas").replaceChildren.apply($("filas"), filtrados.map(fila));
    marcarEncabezados();

    const resumen = $("resumen");
    resumen.className = "resumen";
    if (registros.length === 0) {
        resumen.textContent = "Aún no hay datos enviados.";
    } else if (filtrados.length === 0) {
        resumen.textContent = "Ningún resultado coincide con la búsqueda (" + registros.length + " en total).";
    } else {
        resumen.textContent = "Mostrando " + filtrados.length + " de " + registros.length + " registros.";
    }
}

/* ---------- Eventos del panel ---------- */
["buscar", "campo", "desde", "hasta"].forEach(function (id) {
    $(id).addEventListener("input", pintar);
});

$("btn-limpiar").addEventListener("click", function () {
    $("buscar").value = "";
    $("campo").value = "todo";
    $("desde").value = "";
    $("hasta").value = "";
    pintar();
});

$("btn-actualizar").addEventListener("click", cargarDatos);

document.querySelectorAll("th button[data-clave]").forEach(function (boton) {
    boton.addEventListener("click", function () {
        const clave = boton.dataset.clave;
        if (orden.clave === clave) {
            orden.dir = orden.dir === "asc" ? "desc" : "asc";
        } else {
            orden = { clave: clave, dir: clave === "fecha" ? "desc" : "asc" };
        }
        pintar();
    });
});

/* ---------- Sesión ---------- */
$("btn-login").addEventListener("click", async function () {
    const error = $("login-error");
    error.textContent = "";

    try {
        const proveedor = new GoogleAuthProvider();
        proveedor.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(auth, proveedor);
    } catch (e) {
        if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return;
        console.error("Error al iniciar sesión:", e);
        error.textContent = e.code === "auth/popup-blocked"
            ? "El navegador bloqueó la ventana emergente. Permítela e inténtalo de nuevo."
            : "No se pudo iniciar sesión. Inténtalo de nuevo.";
    }
});

$("btn-salir").addEventListener("click", function () {
    signOut(auth);
});

onAuthStateChanged(auth, function (user) {
    const conSesion = !!user && !user.isAnonymous;
    $("sesion").hidden = !conSesion;

    if (!conSesion) {
        mostrar("login");
        return;
    }

    $("usuario").textContent = user.email || "";

    if (esAdmin(user)) {
        mostrar("panel");
        cargarDatos();
    } else {
        $("correo-denegado").textContent = user.email || "";
        mostrar("denegado");
    }
});
