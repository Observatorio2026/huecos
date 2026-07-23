// =====================================================================
// PANEL ADMINISTRATIVO
// =====================================================================

let mapaAdmin;
let capaMarcadoresAdmin;
let listaHuecosCompleta = [];

const vistaLogin = document.getElementById("vistaLogin");
const vistaDashboard = document.getElementById("vistaDashboard");
const formLogin = document.getElementById("formLogin");
const mensajeLogin = document.getElementById("mensajeLogin");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

const modalDetalle = document.getElementById("modalDetalle");
const cuerpoModalDetalle = document.getElementById("cuerpoModalDetalle");

// ---------------------------------------------------------------------
// AUTENTICACIÓN
// ---------------------------------------------------------------------
async function verificarSesion() {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
        mostrarDashboard();
    } else {
        mostrarLogin();
    }
}

function mostrarLogin() {
    vistaLogin.style.display = "flex";
    vistaDashboard.style.display = "none";
    btnLogout.style.display = "none";
}

function mostrarDashboard() {
    vistaLogin.style.display = "none";
    vistaDashboard.style.display = "block";
    btnLogout.style.display = "inline-flex";
    if (!mapaAdmin) initMapaAdmin();
    cargarReportesAdmin();
}

formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    mensajeLogin.innerHTML = "";
    btnLogin.disabled = true;
    btnLogin.textContent = "Ingresando...";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        mensajeLogin.innerHTML = `<div class="mensaje-error">Credenciales incorrectas o usuario no autorizado.</div>`;
        btnLogin.disabled = false;
        btnLogin.textContent = "Ingresar";
        return;
    }

    btnLogin.textContent = "Ingresar";
    btnLogin.disabled = false;
    mostrarDashboard();
});

btnLogout.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    mostrarLogin();
});

// ---------------------------------------------------------------------
// MAPA ADMINISTRATIVO
// ---------------------------------------------------------------------
function initMapaAdmin() {
    mapaAdmin = L.map("mapaAdmin").setView(MAPA_CENTRO, MAPA_ZOOM_INICIAL);

    L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Tiles &copy; Esri", maxZoom: 20, maxNativeZoom: 18 }
    ).addTo(mapaAdmin);

    capaMarcadoresAdmin = L.layerGroup().addTo(mapaAdmin);
}

function iconoEstadoAdmin(estado) {
    const color = COLOR_ESTADO[estado] || "#494E57";
    return L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid #FAFAF8;box-shadow:0 2px 5px rgba(0,0,0,0.35);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
}

function refrescarMapaAdmin(huecos) {
    capaMarcadoresAdmin.clearLayers();
    huecos.forEach((h) => {
        if (h.lat == null || h.lng == null) return;
        const m = L.marker([h.lat, h.lng], { icon: iconoEstadoAdmin(h.estado) });
        m.on("click", () => abrirDetalle(h.id));
        m.addTo(capaMarcadoresAdmin);
    });
}

// ---------------------------------------------------------------------
// CARGA Y RENDER DE REPORTES
// ---------------------------------------------------------------------
async function cargarReportesAdmin() {
    try {
        listaHuecosCompleta = await obtenerHuecos();
        actualizarTarjetasResumen(listaHuecosCompleta);
        refrescarMapaAdmin(listaHuecosCompleta);
        renderizarLista();
    } catch (err) {
        console.error("Error cargando reportes:", err);
    }
}

function actualizarTarjetasResumen(huecos) {
    document.getElementById("numTotal").textContent = huecos.length;
    document.getElementById("numPendiente").textContent = huecos.filter((h) => h.estado === "pendiente").length;
    document.getElementById("numProceso").textContent = huecos.filter((h) => h.estado === "en_proceso").length;
    document.getElementById("numReparado").textContent = huecos.filter((h) => h.estado === "reparado").length;
}

function renderizarLista() {
    const filtroEstado = document.getElementById("filtroEstado").value;
    const busqueda = document.getElementById("filtroBusqueda").value.trim().toLowerCase();

    let huecosFiltrados = listaHuecosCompleta;

    if (filtroEstado !== "todos") {
        huecosFiltrados = huecosFiltrados.filter((h) => h.estado === filtroEstado);
    }
    if (busqueda) {
        huecosFiltrados = huecosFiltrados.filter(
            (h) =>
                (h.direccion || "").toLowerCase().includes(busqueda) ||
                (h.descripcion || "").toLowerCase().includes(busqueda)
        );
    }

    const contenedor = document.getElementById("listaReportes");
    if (huecosFiltrados.length === 0) {
        contenedor.innerHTML = `<p style="color:var(--asfalto-500);font-size:0.85rem;text-align:center;padding:2rem 0">No hay reportes que coincidan con el filtro.</p>`;
        return;
    }

    contenedor.innerHTML = huecosFiltrados
        .map(
            (h) => `
        <div class="tarjeta-reporte" data-id="${h.id}">
            <img src="${h.foto_url || "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="%23C7CBD1"/></svg>')}" alt="">
            <div class="info">
                <div class="direccion">${h.direccion || "Sin dirección"}</div>
                <div class="descripcion">${h.descripcion || ""}</div>
                <div class="fecha">${formatearFecha(h.fecha_reporte)}</div>
            </div>
            <span class="estado-badge estado-${h.estado}-bg">${ETIQUETA_ESTADO[h.estado] || h.estado}</span>
        </div>`
        )
        .join("");

    contenedor.querySelectorAll(".tarjeta-reporte").forEach((el) => {
        el.addEventListener("click", () => abrirDetalle(el.dataset.id));
    });
}

document.getElementById("filtroEstado").addEventListener("change", renderizarLista);
document.getElementById("filtroBusqueda").addEventListener("input", renderizarLista);
document.getElementById("btnRefrescar").addEventListener("click", cargarReportesAdmin);

// ---------------------------------------------------------------------
// MODAL DE DETALLE / EDICIÓN
// ---------------------------------------------------------------------
function abrirDetalle(id) {
    const h = listaHuecosCompleta.find((x) => String(x.id) === String(id));
    if (!h) return;

    cuerpoModalDetalle.innerHTML = `
        <img class="detalle-foto" src="${h.foto_url || "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23C7CBD1"/></svg>')}" alt="Foto del hueco">

        <div class="detalle-fila"><span class="etiqueta">Dirección</span><span class="valor">${h.direccion || "—"}</span></div>
        <div class="detalle-fila"><span class="etiqueta">Coordenadas</span><span class="valor">${Number(h.lat).toFixed(6)}, ${Number(h.lng).toFixed(6)}</span></div>
        <div class="detalle-fila"><span class="etiqueta">Fecha de reporte</span><span class="valor">${formatearFecha(h.fecha_reporte)}</span></div>
        <div class="detalle-fila"><span class="etiqueta">Última actualización</span><span class="valor">${formatearFecha(h.fecha_actualizacion)}</span></div>

        <div class="campo" style="margin-top:1rem">
            <label>Descripción</label>
            <p style="font-size:0.85rem">${h.descripcion || "—"}</p>
        </div>
        ${h.comentario ? `<div class="campo"><label>Comentario del ciudadano</label><p style="font-size:0.85rem">${h.comentario}</p></div>` : ""}

        <div class="campo">
            <label for="selectEstado">Estado del reporte</label>
            <select id="selectEstado">
                <option value="pendiente" ${h.estado === "pendiente" ? "selected" : ""}>Pendiente</option>
                <option value="en_proceso" ${h.estado === "en_proceso" ? "selected" : ""}>En proceso</option>
                <option value="reparado" ${h.estado === "reparado" ? "selected" : ""}>Reparado</option>
            </select>
        </div>

        <div class="campo">
            <label for="notasAdmin">Notas internas (uso administrativo)</label>
            <textarea id="notasAdmin" placeholder="Ej: Programado para reparación semana del 20 de julio">${h.notas_admin || ""}</textarea>
        </div>

        <div id="mensajeDetalle"></div>

        <div style="display:flex; gap:0.6rem; margin-top:0.8rem">
            <button id="btnGuardarDetalle" class="btn btn-institucional" style="flex:1">💾 Guardar cambios</button>
            <button id="btnEliminarDetalle" class="btn btn-peligro">🗑 Eliminar</button>
        </div>
    `;

    document.getElementById("btnGuardarDetalle").addEventListener("click", () => guardarCambiosDetalle(h.id));
    document.getElementById("btnEliminarDetalle").addEventListener("click", () => eliminarReporte(h.id));

    modalDetalle.hidden = false;
}

document.querySelectorAll("[data-cerrar-detalle]").forEach((btn) => {
    btn.addEventListener("click", () => (modalDetalle.hidden = true));
});
modalDetalle.addEventListener("click", (e) => {
    if (e.target === modalDetalle) modalDetalle.hidden = true;
});

async function guardarCambiosDetalle(id) {
    const nuevoEstado = document.getElementById("selectEstado").value;
    const notas = document.getElementById("notasAdmin").value.trim();
    const mensajeDetalle = document.getElementById("mensajeDetalle");
    const btnGuardar = document.getElementById("btnGuardarDetalle");

    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";

    const { error } = await supabaseClient
        .from("huecos")
        .update({ estado: nuevoEstado, notas_admin: notas })
        .eq("id", id);

    if (error) {
        mensajeDetalle.innerHTML = `<div class="mensaje-error">Error al guardar: ${error.message}</div>`;
        btnGuardar.disabled = false;
        btnGuardar.textContent = "💾 Guardar cambios";
        return;
    }

    mensajeDetalle.innerHTML = `<div class="mensaje-exito">Cambios guardados correctamente.</div>`;
    btnGuardar.disabled = false;
    btnGuardar.textContent = "💾 Guardar cambios";
    await cargarReportesAdmin();
    setTimeout(() => (modalDetalle.hidden = true), 900);
}

async function eliminarReporte(id) {
    if (!confirm("¿Seguro que deseas eliminar este reporte de forma permanente?")) return;

    const { error } = await supabaseClient.from("huecos").delete().eq("id", id);
    if (error) {
        alert("Error al eliminar: " + error.message);
        return;
    }
    modalDetalle.hidden = true;
    await cargarReportesAdmin();
}

// ---------------------------------------------------------------------
// EXPORTAR A XLSX
// ---------------------------------------------------------------------
document.getElementById("btnExportar").addEventListener("click", () => {
    const datos = listaHuecosCompleta.map((h) => ({
        ID: h.id,
        Estado: ETIQUETA_ESTADO[h.estado] || h.estado,
        Direccion: h.direccion || "",
        Descripcion: h.descripcion || "",
        Comentario: h.comentario || "",
        Notas_Admin: h.notas_admin || "",
        Latitud: h.lat,
        Longitud: h.lng,
        Fecha_Reporte: formatearFecha(h.fecha_reporte),
        Fecha_Actualizacion: formatearFecha(h.fecha_actualizacion),
        URL_Foto: h.foto_url || "",
    }));

    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Huecos");
    XLSX.writeFile(libro, `reportes_huecos_${new Date().toISOString().slice(0, 10)}.xlsx`);
});

// ---------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", verificarSesion);
