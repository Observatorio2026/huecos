// =====================================================================
// MAPA PRINCIPAL DEL GEOVISOR
// =====================================================================

let mapa;
let capaMarcadores;
let marcadorSeleccion = null; // marcador temporal mientras se llena el formulario

// Colores y etiquetas de estado, y formatearFecha() están en js/utils.js

// Tesela 1x1 transparente en base64, usada como fallback si alguna tesela
// puntual falla dentro del rango de zoom nativo (evita el ícono de "imagen rota").
const TESELA_TRANSPARENTE =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7";

function initMapa() {
    mapa = L.map("mapa", {
        zoomControl: false,
    }).setView(MAPA_CENTRO, MAPA_ZOOM_INICIAL);

    L.control.zoom({ position: "bottomright" }).addTo(mapa);

    // ---- Basemap único: Satelital (Esri World Imagery + etiquetas de referencia) ----
    // Se deja un solo mapa base a propósito, para no confundir a la ciudadanía
    // con selectores de capas. Es satelital "híbrido": imagen + nombres de vías.
    //
    // IMPORTANTE sobre zoom:
    // maxZoom      = hasta qué nivel deja acercarse el usuario en el mapa.
    // maxNativeZoom = hasta qué nivel existen teselas reales en el servidor de Esri
    //                 para esta zona. Más allá de ese nivel, Leaflet NO pide teselas
    //                 nuevas (evita el error/cuadro en blanco) y en su lugar reutiliza
    //                 y escala la última tesela real disponible, es decir, "pixela"
    //                 la imagen en vez de romperse.
    // Para La Ceja del Tambo (zona rural/semiurbana), la resolución real de Esri
    // suele agotarse alrededor del zoom 17-18. Ajusta MAX_ZOOM_NATIVO_SATELITE
    // si notas que tu zona sí tiene mejor resolución disponible (prueba subiendo
    // el valor de a 1 en 1 hasta que empiecen a verse teselas en blanco).
    const MAX_ZOOM_NATIVO_SATELITE = 18;
    const MAX_ZOOM_MAPA = 20;

    const esriSatelital = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
            maxZoom: MAX_ZOOM_MAPA,
            maxNativeZoom: MAX_ZOOM_NATIVO_SATELITE,
            errorTileUrl: TESELA_TRANSPARENTE,
        }
    );

    const esriEtiquetas = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
            attribution: "Esri Reference Layer",
            maxZoom: MAX_ZOOM_MAPA,
            maxNativeZoom: MAX_ZOOM_NATIVO_SATELITE,
            pane: "shadowPane",
        }
    );

    esriSatelital.addTo(mapa);
    esriEtiquetas.addTo(mapa);

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

    const tamanoTag = hueco.tamano
        ? `<span class="tamano-badge">${ETIQUETA_TAMANO[hueco.tamano] || hueco.tamano}</span>`
        : "";
    const materialTexto = hueco.material
        ? `<p class="popup-dato">🧱 ${ETIQUETA_MATERIAL[hueco.material] || hueco.material}</p>`
        : "";

    const confirmacionesTexto =
        hueco.confirmaciones && hueco.confirmaciones > 1
            ? `<p class="popup-dato">🔁 Confirmado por ${hueco.confirmaciones} personas</p>`
            : "";

    return `
    <div class="popup-hueco">
        ${foto}
        <div class="popup-badges">
            ${tamanoTag}
        </div>
        <p class="popup-direccion">${hueco.direccion || "Dirección no especificada"}</p>
        <p class="popup-descripcion">${hueco.descripcion || ""}</p>
        ${materialTexto}
        ${confirmacionesTexto}
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
    if (!total) return; // el contador no está presente en esta página
    total.textContent = huecos.length;
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
