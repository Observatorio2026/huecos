# Geovisor de Reporte de Huecos — La Ceja del Tambo

Aplicación web estática (HTML/CSS/JS puro, sin frameworks ni build step) para que
la ciudadanía reporte huecos en las vías del municipio y la Secretaría de
Planeación los gestione desde un panel administrativo.

## Arquitectura

```
reporte-huecos/
├── index.html          Geovisor público (mapa + formulario de reporte)
├── admin.html           Panel administrativo (login + dashboard)
├── css/
│   ├── styles.css       Estilos base compartidos
│   └── admin.css        Estilos exclusivos del panel admin
├── js/
│   ├── config.js         Configuración (URL/llave de Supabase)
│   ├── utils.js          Constantes y utilidades compartidas
│   ├── supabaseClient.js Cliente Supabase + funciones de datos
│   ├── map.js            Lógica del mapa público (Leaflet)
│   ├── report.js         Lógica del formulario "Reporta tu hueco"
│   └── admin.js          Lógica del panel administrativo
└── sql/
    └── schema.sql        Esquema completo de base de datos (PostGIS + RLS)
```

**Stack técnico:**
- **Frontend:** HTML5, CSS3, JavaScript vanilla (ES2020+)
- **Mapas:** Leaflet.js 1.9.4
- **Basemap satelital:** Esri World Imagery (sin necesidad de API key)
- **Backend:** Supabase (PostgreSQL + PostGIS + Auth + Storage)
- **Exportación:** SheetJS (xlsx) en el navegador
- **Hosting:** cualquier hosting estático (Netlify, GitHub Pages, Vercel)

## 1. Configurar Supabase

### 1.1. Crear proyecto
Si ya tienes un proyecto Supabase (por ejemplo, el que usas para Geo-Ceja),
puedes reutilizarlo; solo necesitas ejecutar el script SQL en un esquema/tabla
nueva. Si prefieres aislar este proyecto, crea uno nuevo en
[supabase.com](https://supabase.com).

### 1.2. Ejecutar el esquema
1. Ve a **SQL Editor** en el dashboard de Supabase.
2. Pega el contenido completo de `sql/schema.sql`.
3. Ejecuta (**Run**). Esto crea:
   - La tabla `huecos` con columna geométrica PostGIS (`geom`, tipo `Point, 4326`).
   - Índices espaciales y de estado.
   - Políticas RLS (lectura/inserción pública, edición/eliminación solo para
     administradores autenticados).
   - La función RPC `huecos_con_coordenadas()` que expone lat/lng ya calculados.
   - El bucket de Storage `fotos-huecos` (público) con sus políticas.

### 1.3. Crear usuario(s) administrador(es)
Ve a **Authentication > Users > Add user** y crea un usuario con correo y
contraseña para cada funcionario que deba acceder al panel administrativo.
No se necesita ningún paso adicional en SQL: cualquier usuario autenticado
en Supabase Auth queda automáticamente autorizado para editar/eliminar
reportes, según las políticas RLS ya definidas.

### 1.4. Obtener las credenciales del proyecto
En **Project Settings > API** copia:
- **Project URL**
- **anon public key** (⚠️ nunca la `service_role`, esa es privada y NO debe
  usarse en el frontend)

## 2. Configurar el frontend

Edita `js/config.js`:

```javascript
const SUPABASE_URL = "https://tu-proyecto.supabase.co";
const SUPABASE_ANON_KEY = "tu-llave-anon-publica";
```

Opcionalmente ajusta el centro inicial del mapa (`MAPA_CENTRO`) si quieres
enfocarlo en un corregimiento o barrio específico.

## 3. Probar en local

No requiere instalación de dependencias. Basta con servir la carpeta con
cualquier servidor estático, por ejemplo:

```bash
npx serve reporte-huecos
# o
python3 -m http.server --directory reporte-huecos 8080
```

Luego abre `http://localhost:8080` (geovisor) y
`http://localhost:8080/admin.html` (panel administrativo).

> Nota: abrir `index.html` con doble clic (protocolo `file://`) puede fallar
> por restricciones CORS del navegador; siempre pruébalo con un servidor local.

## 4. Desplegar

### Opción A: Netlify
1. Arrastra la carpeta `reporte-huecos` a [app.netlify.com/drop](https://app.netlify.com/drop), o
2. Conecta el repositorio de GitHub y define `reporte-huecos` como carpeta de publicación (no requiere build command).

### Opción B: GitHub Pages
1. Sube la carpeta a un repositorio.
2. Settings > Pages > selecciona la rama y carpeta raíz (o `/docs` si renombras la carpeta).

## 5. Flujo funcional

### Geovisor público (`index.html`)
1. Carga el mapa satelital (híbrido Esri) centrado en el municipio.
2. Consulta todos los huecos vía la función RPC `huecos_con_coordenadas()`.
3. Cada hueco aparece como un punto de color según su estado:
   🔴 pendiente · 🟠 en proceso · 🟢 reparado.
4. Al tocar un punto se abre un popup con foto, dirección, coordenadas,
   fecha de reporte y estado.
5. Botón **"Reporta tu hueco"** abre un formulario que permite:
   - Tomar/subir una foto (usa `capture="environment"` para abrir la cámara
     trasera en móviles).
   - Ubicar el punto tocando el mapa, o mediante el botón **"Usar mi
     ubicación"** (solicita permiso de geolocalización al navegador).
   - Autocompletar (editable) la dirección vía geocodificación inversa
     (Nominatim/OpenStreetMap).
   - Escribir descripción (obligatoria) y comentario adicional (opcional).
6. Al enviar, la foto se sube a Supabase Storage y el registro se inserta
   en la tabla `huecos` con estado inicial `pendiente`.

### Panel administrativo (`admin.html`)
1. Login con correo/contraseña (Supabase Auth).
2. Tarjetas resumen: total, pendientes, en proceso, reparados.
3. Mapa administrativo con todos los puntos.
4. Lista filtrable por estado y por texto (dirección/descripción).
5. Al seleccionar un reporte (desde la lista o el mapa) se abre un modal con:
   - Foto en tamaño completo, dirección, coordenadas, fechas.
   - Selector de **estado** (pendiente / en proceso / reparado).
   - Campo de **notas internas** (uso exclusivo administrativo, no visible
     para el ciudadano).
   - Botones **Guardar cambios** y **Eliminar reporte**.
6. Botón **Exportar XLSX**: descarga todos los reportes filtrados/visibles
   en un archivo Excel, útil para informes de seguimiento o el Observatorio
   Municipal.

## 6. Seguridad (RLS)

| Acción                     | Anónimo (ciudadano) | Autenticado (admin) |
|----------------------------|:--------------------:|:--------------------:|
| Ver reportes                | ✅                    | ✅                    |
| Crear reporte                | ✅                    | ✅                    |
| Cambiar estado / notas        | ❌                    | ✅                    |
| Eliminar reporte              | ❌                    | ✅                    |
| Subir foto                   | ✅ (solo al bucket `fotos-huecos`) | ✅ |

La seguridad reside en las políticas de PostgreSQL (RLS), no en el frontend:
aunque la `anon key` es pública por diseño, ningún usuario sin sesión puede
modificar o borrar registros.

## 7. Posibles extensiones futuras

- Notificación por correo al ciudadano cuando su hueco cambia de estado
  (Supabase Edge Functions + servicio de email transaccional).
- Roles diferenciados en el panel admin (ej. solo lectura vs. edición) usando
  una tabla `perfiles` vinculada a `auth.users`.
- Priorización automática según densidad de reportes por sector (clustering
  espacial con PostGIS `ST_ClusterKMeans` o `ST_ClusterDBSCAN`).
- Integración con el geoportal Geo-Ceja como una capa adicional (WMS/GeoJSON)
  para cruzar huecos con capas de vías, POT o mantenimiento vial.
- App móvil ligera (PWA) con `manifest.json` y *service worker* para reporte
  offline con sincronización posterior.
