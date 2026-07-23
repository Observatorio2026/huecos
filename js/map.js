// =====================================================================
// MAPA PRINCIPAL DEL GEOVISOR
// =====================================================================

let mapa;
let capaMarcadores;
let marcadorSeleccion = null; // marcador temporal mientras se llena el formulario

// Colores y etiquetas de estado, y formatearFecha() están en js/utils.js

function initMapa() {
    mapa = L.map("mapa", {
        zoomControl: false,
    }).setView(MAPA_CENTRO, MAPA_ZOOM_INICIAL);

    L.control.zoom({ position: "bottomright" }).addTo(mapa);

    // ---- Basemaps ----
    // Satelital (Esri World Imagery) — no requiere API key, uso libre con atribución.
    const esriSatelital = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
            maxZoom: 20,
            maxNativeZoom: 18,
        }
    );

    // Etiquetas de referencia (calles/nombres) para modo "híbrido" sobre satélite
    const esriEtiquetas = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
            attribution: "Esri Reference Layer",
            maxZoom: 20,
            pane: "shadowPane",
        }
    );

    const capaHibrida = L.layerGroup([esriSatelital, esriEtiquetas]);

    // Callejero (OpenStreetMap) como alternativa
    const osmCallejero = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
    });

    capaHibrida.addTo(mapa);

    L.control.layers(
        {
            "Satelital (híbrido)": capaHibrida,
            "Satelital puro": esriSatelital,
            "Callejero": osmCallejero,
        },
        {},
        { position: "topright", collapsed: true }
    ).addTo(mapa);

    capaMarcadores = L.layerGroup().addTo(mapa);

    // Click en el mapa: si el modo reporte está activo, coloca/mueve el marcador temporal
    mapa.on("click", (e) => {
        if (window.modoReporteActivo) {
            colocarMarcadorSeleccion(e.latlng.lat, e.latlng.lng);
        }
    });

    cargarHuecos();
}

function iconoEstado(estado) {
    const color = COLOR_ESTADO[estado] || "#494E57";
    return L.divIcon({
        className: "",
        html: `<div style="
            width: 22px; height: 22px; border-radius: 50%;
            background: ${color}; border: 3px solid #FAFAF8;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        "></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
    });
}

function contenidoPopup(hueco) {
    const foto = hueco.foto_url
        ? `<img src="${hueco.foto_url}" alt="Foto del hueco reportado">`
        : `<img src="data:image/svg+xml;utf8,${encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%23C7CBD1"/></svg>'
          )}" alt="Sin foto disponible">`;

    return `
    <div class="popup-hueco">
        ${foto}
        <span class="estado-badge estado-${hueco.estado}-bg">${ETIQUETA_ESTADO[hueco.estado] || hueco.estado}</span>
        <p class="popup-direccion">${hueco.direccion || "Dirección no especificada"}</p>
        <p class="popup-descripcion">${hueco.descripcion || ""}</p>
        <p class="popup-dato">📍 ${Number(hueco.lat).toFixed(6)}, ${Number(hueco.lng).toFixed(6)}</p>
        <p class="popup-dato">🗓 ${formatearFecha(hueco.fecha_reporte)}</p>
    </div>`;
}

async function cargarHuecos() {
    try {
        const huecos = await obtenerHuecos();
        capaMarcadores.clearLayers();

        huecos.forEach((hueco) => {
            if (hueco.lat == null || hueco.lng == null) return;
            const marker = L.marker([hueco.lat, hueco.lng], { icon: iconoEstado(hueco.estado) });
            marker.bindPopup(contenidoPopup(hueco));
            marker.addTo(capaMarcadores);
        });

        actualizarContadorHuecos(huecos);
    } catch (err) {
        console.error("No se pudieron cargar los huecos:", err);
    }
}

function actualizarContadorHuecos(huecos) {
    const total = document.getElementById("contadorTotal");
    const pendiente = document.getElementById("contadorPendiente");
    const proceso = document.getElementById("contadorProceso");
    const reparado = document.getElementById("contadorReparado");
    if (!total) return; // el contador no está presente en esta página

    total.textContent = huecos.length;
    pendiente.textContent = huecos.filter((h) => h.estado === "pendiente").length;
    proceso.textContent = huecos.filter((h) => h.estado === "en_proceso").length;
    reparado.textContent = huecos.filter((h) => h.estado === "reparado").length;
}

function colocarMarcadorSeleccion(lat, lng) {
    if (marcadorSeleccion) {
        marcadorSeleccion.setLatLng([lat, lng]);
    } else {
        marcadorSeleccion = L.marker([lat, lng], {
            icon: L.divIcon({
                className: "",
                html: `<div style="
                    width: 26px; height: 26px; border-radius: 50% 50% 50% 0;
                    background: #FFC53D; border: 3px solid #1B1D21;
                    transform: rotate(-45deg);
                "></div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 26],
            }),
        }).addTo(mapa);
    }
    if (typeof onSeleccionUbicacion === "function") {
        onSeleccionUbicacion(lat, lng);
    }
}

function quitarMarcadorSeleccion() {
    if (marcadorSeleccion) {
        mapa.removeLayer(marcadorSeleccion);
        marcadorSeleccion = null;
    }
}

document.addEventListener("DOMContentLoaded", initMapa);
