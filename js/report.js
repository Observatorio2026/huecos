// =====================================================================
// FORMULARIO "REPORTA TU HUECO"
// =====================================================================

window.modoReporteActivo = false;
let coordenadasSeleccionadas = null; // { lat, lng }
let archivoFotoSeleccionado = null;

const modalReporte = document.getElementById("modalReporte");
const btnAbrirReporte = document.getElementById("btnAbrirReporte");
const formReporte = document.getElementById("formReporte");
const mensajeFormulario = document.getElementById("mensajeFormulario");
const coordTexto = document.getElementById("coordTexto");
const inputDireccion = document.getElementById("inputDireccion");
const inputFoto = document.getElementById("inputFoto");
const previewFoto = document.getElementById("previewFoto");
const textoZonaFoto = document.getElementById("textoZonaFoto");
const btnUsarGPS = document.getElementById("btnUsarGPS");
const btnEnviarReporte = document.getElementById("btnEnviarReporte");

function abrirModalReporte() {
    modalReporte.hidden = false;
    window.modoReporteActivo = true;
}

function cerrarModalReporte() {
    modalReporte.hidden = true;
    window.modoReporteActivo = false;
    resetearFormulario();
    quitarMarcadorSeleccion();
}

function resetearFormulario() {
    formReporte.reset();
    coordenadasSeleccionadas = null;
    archivoFotoSeleccionado = null;
    coordTexto.textContent = "Sin ubicación seleccionada";
    previewFoto.style.display = "none";
    previewFoto.src = "";
    textoZonaFoto.style.display = "inline";
    mensajeFormulario.innerHTML = "";
}

btnAbrirReporte.addEventListener("click", abrirModalReporte);

document.querySelectorAll("[data-cerrar-modal]").forEach((btn) => {
    btn.addEventListener("click", cerrarModalReporte);
});
modalReporte.addEventListener("click", (e) => {
    if (e.target === modalReporte) cerrarModalReporte();
});

// ---- 1. Foto ----
inputFoto.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    archivoFotoSeleccionado = file;

    const lector = new FileReader();
    lector.onload = (ev) => {
        previewFoto.src = ev.target.result;
        previewFoto.style.display = "block";
        textoZonaFoto.style.display = "none";
    };
    lector.readAsDataURL(file);
});

// ---- 2. Coordenadas: click en mapa ----
// Esta función es invocada desde map.js cuando el usuario toca el mapa
function onSeleccionUbicacion(lat, lng) {
    coordenadasSeleccionadas = { lat, lng };
    coordTexto.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    geocodificarInverso(lat, lng);
}

// ---- 2. Coordenadas: botón GPS ----
btnUsarGPS.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
        mostrarMensaje("Tu navegador no soporta geolocalización.", "error");
        return;
    }
    btnUsarGPS.disabled = true;
    btnUsarGPS.textContent = "Obteniendo ubicación...";

    navigator.geolocation.getCurrentPosition(
        (posicion) => {
            const { latitude, longitude } = posicion.coords;
            colocarMarcadorSeleccion(latitude, longitude);
            mapa.setView([latitude, longitude], 18);
            btnUsarGPS.disabled = false;
            btnUsarGPS.textContent = "📍 Usar mi ubicación";
        },
        (error) => {
            console.error(error);
            mostrarMensaje(
                "No se pudo obtener tu ubicación. Verifica los permisos de localización del navegador.",
                "error"
            );
            btnUsarGPS.disabled = false;
            btnUsarGPS.textContent = "📍 Usar mi ubicación";
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
});

// Geocodificación inversa (Nominatim/OpenStreetMap) — solo para sugerir dirección
async function geocodificarInverso(lat, lng) {
    try {
        const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`
        );
        const data = await resp.json();
        if (data && data.display_name && !inputDireccion.value) {
            inputDireccion.value = data.display_name;
        }
    } catch (err) {
        console.warn("Geocodificación inversa no disponible:", err);
    }
}

function mostrarMensaje(texto, tipo) {
    const clase = tipo === "error" ? "mensaje-error" : "mensaje-exito";
    mensajeFormulario.innerHTML = `<div class="${clase}">${texto}</div>`;
}

// ---- Envío del formulario ----
formReporte.addEventListener("submit", async (e) => {
    e.preventDefault();
    mensajeFormulario.innerHTML = "";

    if (!coordenadasSeleccionadas) {
        mostrarMensaje("Selecciona la ubicación del hueco en el mapa o usa el botón de GPS.", "error");
        return;
    }

    const descripcion = document.getElementById("inputDescripcion").value.trim();
    if (!descripcion) {
        mostrarMensaje("La descripción del hueco es obligatoria.", "error");
        return;
    }

    btnEnviarReporte.disabled = true;
    btnEnviarReporte.innerHTML = '<span class="spinner"></span> Enviando...';

    try {
        let fotoUrl = null;
        if (archivoFotoSeleccionado) {
            fotoUrl = await subirFoto(archivoFotoSeleccionado);
        }

        await crearReporteHueco({
            lat: coordenadasSeleccionadas.lat,
            lng: coordenadasSeleccionadas.lng,
            direccion: inputDireccion.value.trim(),
            descripcion,
            comentario: document.getElementById("inputComentario").value.trim(),
            fotoUrl,
        });

        mostrarMensaje("✅ Reporte enviado. ¡Gracias por ayudar a mejorar las vías del municipio!", "exito");
        await cargarHuecos();

        setTimeout(() => {
            cerrarModalReporte();
        }, 1600);
    } catch (err) {
        console.error(err);
        mostrarMensaje("Ocurrió un error al enviar el reporte. Intenta nuevamente.", "error");
    } finally {
        btnEnviarReporte.disabled = false;
        btnEnviarReporte.textContent = "Enviar reporte";
    }
});
