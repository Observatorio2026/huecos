// =====================================================================
// UTILIDADES COMPARTIDAS (index.html y admin.html)
// =====================================================================

const COLOR_ESTADO = {
    pendiente: "#E0522E",
    en_proceso: "#E0A324",
    reparado: "#2E9E6D",
};

const ETIQUETA_ESTADO = {
    pendiente: "Pendiente",
    en_proceso: "En proceso",
    reparado: "Reparado",
};

const ETIQUETA_TAMANO = {
    pequeno: "🔸 Pequeño",
    mediano: "🔶 Mediano",
    grande: "🟠 Grande",
};

const ETIQUETA_MATERIAL = {
    asfalto: "Asfalto",
    concreto_rigido: "Concreto rígido",
    adoquin: "Adoquín",
    destapado: "Vía destapada",
    otro: "Otro material",
};

function formatearFecha(fechaISO) {
    if (!fechaISO) return "—";
    const f = new Date(fechaISO);
    return (
        f.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }) +
        " " +
        f.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    );
}

// =====================================================================
// COMPRESIÓN DE IMÁGENES (antes de subirlas a Supabase Storage)
// =====================================================================
// Las fotos que salen directo de la cámara de un celular suelen pesar
// varios MB. Esto las redimensiona a un ancho máximo y las reexporta
// como JPEG con menor calidad, todo en el navegador (sin librerías).
//
// @param {File} archivo       - archivo original (de <input type="file">)
// @param {number} maxAncho    - ancho máximo en píxeles (alto se ajusta proporcional)
// @param {number} calidad     - calidad JPEG de 0 a 1
// @returns {Promise<File>}    - nuevo archivo JPEG comprimido
function comprimirImagen(archivo, maxAncho = 1280, calidad = 0.72) {
    return new Promise((resolve, reject) => {
        if (!archivo || !archivo.type.startsWith("image/")) {
            reject(new Error("El archivo no es una imagen"));
            return;
        }

        const lector = new FileReader();

        lector.onload = (eventoLectura) => {
            const imagen = new Image();

            imagen.onload = () => {
                let ancho = imagen.width;
                let alto = imagen.height;

                if (ancho > maxAncho) {
                    alto = Math.round(alto * (maxAncho / ancho));
                    ancho = maxAncho;
                }

                const canvas = document.createElement("canvas");
                canvas.width = ancho;
                canvas.height = alto;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(imagen, 0, 0, ancho, alto);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error("No se pudo generar la imagen comprimida"));
                            return;
                        }
                        const nombreBase = archivo.name.replace(/\.[^.]+$/, "");
                        const archivoComprimido = new File([blob], `${nombreBase}.jpg`, {
                            type: "image/jpeg",
                        });
                        resolve(archivoComprimido);
                    },
                    "image/jpeg",
                    calidad
                );
            };

            imagen.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada"));
            imagen.src = eventoLectura.target.result;
        };

        lector.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado"));
        lector.readAsDataURL(archivo);
    });
}
