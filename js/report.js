// =====================================================================
// FORMULARIO "REPORTA TU HUECO"
// =====================================================================

window.modoReporteActivo = false;
let coordenadasSeleccionadas = null; // { lat, lng }
let archivoFotoSeleccionado = null;
let tamanoSeleccionado = null;

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
const botonesSegmento = document.querySelectorAll("#grupoTamano .segmento");
const inputMaterial = document.getElementById("inputMaterial");
const instruccionInicial = document.getElementById("instruccionInicial");
const pantallaAgradecimiento = document.getElementById("pantallaAgradecimiento");
const btnReportarOtro = document.getElementById("btnReportarOtro");
const btnCerrarAgradecimiento = document.getElementById("btnCerrarAgradecimiento");

function abrirModalReporte() {
    modalReporte.hidden = false;
    window.modoReporteActivo = true;
    volverAlFormulario();
}

function cerrarModalReporte() {
    modalReporte.hidden = true;
    window.modoReporteActivo = false;
    resetearFormulario();
    volverAlFormulario();
    quitarMarcadorSeleccion();
}

function mostrarAgradecimiento(esDuplicado) {
    formReporte.hidden = true;
    instruccionInicial.hidden = true;
    mensajeFormulario.innerHTML = "";
    pantallaAgradecimiento.hidden = false;

    const titulo = document.getElementById("tituloAgradecimiento");
    const texto = document.getElementById("textoAgradecimiento");
    if (!titulo || !texto) return; // por si index.html no tiene estos ids todavía

    if (esDuplicado) {
        titulo.textContent = "¡Ya teníamos ese hueco en el radar!";
        texto.textContent =
            "Alguien más ya lo había reportado. Sumamos tu confirmación, y eso ayuda a priorizarlo para reparación.";
    } else {
        titulo.textContent = "¡Gracias por tu reporte!";
        texto.textContent =
            "Tu hueco ya quedó registrado en el geovisor y será tenido en cuenta por el Laboratorio de Ciudad del Municipio de La Ceja.";
    }
}

function volverAlFormulario() {
    pantallaAgradecimiento.hidden = true;
    formReporte.hidden = false;
    instruccionInicial.hidden = false;
}

btnCerrarAgradecimiento.addEventListener("click", cerrarModalReporte);
btnReportarOtro.addEventListener("click", () => {
    resetearFormulario();
    volverAlFormulario();
});

function resetearFormulario() {
    formReporte.reset();
    coordenadasSeleccionadas = null;
    archivoFotoSeleccionado = null;
    tamanoSeleccionado = null;
    coordTexto.textContent = "Sin ubicación seleccionada";
    previewFoto.style.display = "none";
    previewFoto.src = "";
    textoZonaFoto.style.display = "inline";
    textoZonaFoto.textContent = textoZonaFotoOriginal;
    mensajeFormulario.innerHTML = "";
    botonesSegmento.forEach((btn) => btn.classList.remove("seleccionado"));
}

btnAbrirReporte.addEventListener("click", abrirModalReporte);

document.querySelectorAll("[data-cerrar-modal]").forEach((btn) => {
    btn.addEventListener("click", cerrarModalReporte);
});
modalReporte.addEventListener("click", (e) => {
    if (e.target === modalReporte) cerrarModalReporte();
});

// ---- 1. Foto ----
const textoZonaFotoOriginal = textoZonaFoto.textContent;

function mostrarPreview(archivo) {
    const lector = new FileReader();
    lector.onload = (ev) => {
        previewFoto.src = ev.target.result;
        previewFoto.style.display = "block";
        textoZonaFoto.style.display = "none";
        textoZonaFoto.textContent = textoZonaFotoOriginal;
    };
    lector.readAsDataURL(archivo);
}

inputFoto.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Mientras se comprime, mostramos un texto de espera en vez de la foto
    previewFoto.style.display = "none";
    textoZonaFoto.style.display = "inline";
    textoZonaFoto.textContent = "⏳ Optimizando foto...";

    try {
        const archivoComprimido = await comprimirImagen(file);
        console.log(
            `Foto comprimida: ${(file.size / 1024).toFixed(0)}KB -> ${(archivoComprimido.size / 1024).toFixed(0)}KB`
        );
        archivoFotoSeleccionado = archivoComprimido;
        mostrarPreview(archivoComprimido);
    } catch (err) {
        // Si algo falla comprimiendo (formato raro, navegador viejo, etc.),
        // no bloqueamos el reporte: seguimos con el archivo original.
        console.warn("No se pudo comprimir la foto, se usará el archivo original:", err);
        archivoFotoSeleccionado = file;
        mostrarPreview(file);
    }
});

// ---- 4. Tamaño del hueco (selector segmentado) ----
botonesSegmento.forEach((btn) => {
    btn.addEventListener("click", () => {
        botonesSegmento.forEach((b) => b.classList.remove("seleccionado"));
        btn.classList.add("seleccionado");
        tamanoSeleccionado = btn.dataset.valor;
    });
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

    if (!tamanoSeleccionado) {
        mostrarMensaje("Selecciona el tamaño aproximado del hueco.", "error");
        return;
    }

    btnEnviarReporte.disabled = true;
    btnEnviarReporte.innerHTML = '<span class="spinner"></span> Enviando...';

    try {
        // Antes de crear un reporte nuevo, verificamos si ya existe uno
        // muy cerca (radio de 15 metros) para no duplicar el mismo hueco.
        const cercano = await buscarHuecoCercano(
            coordenadasSeleccionadas.lat,
            coordenadasSeleccionadas.lng,
            15
        );

        if (cercano) {
            await confirmarHueco(cercano.id);
            await cargarHuecos();
            mostrarAgradecimiento(true);
        } else {
            let fotoUrl = null;
            if (archivoFotoSeleccionado) {
                fotoUrl = await subirFoto(archivoFotoSeleccionado);
            }

            await crearReporteHueco({
                lat: coordenadasSeleccionadas.lat,
                lng: coordenadasSeleccionadas.lng,
                direccion: inputDireccion.value.trim(),
                descripcion,
                tamano: tamanoSeleccionado,
                material: inputMaterial.value || null,
                comentario: document.getElementById("inputComentario").value.trim(),
                fotoUrl,
            });

            await cargarHuecos();
            mostrarAgradecimiento(false);
        }
    } catch (err) {
        console.error(err);
        mostrarMensaje("Ocurrió un error al enviar el reporte. Intenta nuevamente.", "error");
    } finally {
        btnEnviarReporte.disabled = false;
        btnEnviarReporte.textContent = "Enviar reporte";
    }
});
