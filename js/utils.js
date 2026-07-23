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

function formatearFecha(fechaISO) {
    if (!fechaISO) return "—";
    const f = new Date(fechaISO);
    return (
        f.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }) +
        " " +
        f.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    );
}
