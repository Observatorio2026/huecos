// =====================================================================
// CONFIGURACIÓN DE SUPABASE
// =====================================================================
// Reemplaza estos dos valores con los de tu proyecto Supabase.
// Los encuentras en: Supabase Dashboard > Project Settings > API
//
//   SUPABASE_URL      -> "Project URL"
//   SUPABASE_ANON_KEY -> "anon public" key (NUNCA uses la "service_role" aquí)
//
// Estas llaves son públicas por diseño (se ejecutan en el navegador del
// ciudadano); la seguridad real la dan las políticas RLS definidas en
// sql/schema.sql, no el secreto de esta llave.
// =====================================================================

const SUPABASE_URL = "https://ppyoppdzfrfcivtknrgu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweW9wcGR6ZnJmY2l2dGtucmd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNzI2NjIsImV4cCI6MjA5OTY0ODY2Mn0.uD2Y7JRbYZj7eN_5G400HxaRSJf2D8rnoytqo5x1ioY";

// Nombre del bucket de Storage donde se guardan las fotos de los huecos
const STORAGE_BUCKET = "fotos-huecos";

// Centro inicial del mapa (La Ceja del Tambo, Antioquia)
const MAPA_CENTRO = [6.0311, -75.4294];
const MAPA_ZOOM_INICIAL = 15;
