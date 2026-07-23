// =====================================================================
// CLIENTE SUPABASE (compartido)
// Requiere que config.js y el script CDN de @supabase/supabase-js
// se hayan cargado antes que este archivo.
// =====================================================================

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Sube una foto al bucket de Storage y retorna la URL pública.
 * @param {File} file - Archivo de imagen (desde <input type="file">)
 * @returns {Promise<string|null>} URL pública o null si no hay archivo
 */
async function subirFoto(file) {
    if (!file) return null;

    const extension = file.name.split(".").pop();
    const nombreArchivo = `hueco_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;

    const { error } = await supabaseClient
        .storage
        .from(STORAGE_BUCKET)
        .upload(nombreArchivo, file, {
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        console.error("Error subiendo foto:", error);
        throw error;
    }

    const { data } = supabaseClient
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(nombreArchivo);

    return data.publicUrl;
}

/**
 * Inserta un nuevo reporte de hueco en la base de datos.
 * @param {Object} reporte
 * @param {number} reporte.lat
 * @param {number} reporte.lng
 * @param {string} reporte.direccion
 * @param {string} reporte.descripcion
 * @param {string} reporte.comentario
 * @param {string|null} reporte.fotoUrl
 */
async function crearReporteHueco(reporte) {
    const puntoWKT = `SRID=4326;POINT(${reporte.lng} ${reporte.lat})`;

    const { data, error } = await supabaseClient
        .from("huecos")
        .insert([{
            geom: puntoWKT,
            direccion: reporte.direccion || null,
            descripcion: reporte.descripcion,
            comentario: reporte.comentario || null,
            foto_url: reporte.fotoUrl || null,
            estado: "pendiente",
        }])
        .select();

    if (error) {
        console.error("Error creando reporte:", error);
        throw error;
    }
    return data;
}

/**
 * Trae todos los huecos junto con lat/lng ya calculados (ST_Y / ST_X).
 */
async function obtenerHuecos() {
    const { data, error } = await supabaseClient.rpc("huecos_con_coordenadas");

    if (error) {
        // Fallback: si la función RPC no existe todavía, usamos la vista GeoJSON
        console.warn("RPC huecos_con_coordenadas no disponible, usando vista GeoJSON:", error.message);
        const { data: geojsonData, error: geojsonError } = await supabaseClient
            .from("huecos_geojson")
            .select("*");
        if (geojsonError) throw geojsonError;

        return geojsonData.map((row) => ({
            id: row.id,
            estado: row.estado,
            direccion: row.direccion,
            descripcion: row.descripcion,
            foto_url: row.foto_url,
            fecha_reporte: row.fecha_reporte,
            lat: row.geometry.coordinates[1],
            lng: row.geometry.coordinates[0],
        }));
    }
    return data;
}
