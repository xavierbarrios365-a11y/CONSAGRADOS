/**
 * CONSAGRADOS 2026 - WEBHOOK RECEPTOR DE SUPABASE
 * 
 * PROPÓSITO:
 * Este archivo debe pegarse en un nuevo archivo dentro de tu editor de **Google Apps Script**.
 * (Ejemplo: Archivo -> Nuevo -> Script -> Nómbralo 'WebhookSupabase.gs')
 * 
 * FUNCIONALIDAD:
 * Supabase enviará una petición HTTP POST automática a este script cada vez que tu tabla
 * de 'agentes' reciba un UPDATE o INSERT. Este script tomará esa data y buscará al 
 * agente en tu pestaña "CONSAGRADOS" para actualizar sus puntos y perfil en tiempo real.
 * 
 * INSTRUCCIONES:
 * 1. Pega este código en un nuevo archivo .gs
 * 2. Guarda el proyecto.
 * 3. Haz click en Iniciar Implementación -> Nueva Implementación -> Aplicación Web.
 * 4. Nivel de acceso: Cualquier persona (Any).
 * 5. Cópia la URL web resultante (terminará en /exec). ¡Esa es nuestra URL del Webhook!
 */

const SHEET_NAME_AGENTES = "CONSAGRADOS";

function doPost(e) {
  try {
    // 1. Recibir la DATA JSON que envía Supabase por debajo
    const postData = JSON.parse(e.postData.contents);
    
    // Supabase envía el tipo de acción (INSERT, UPDATE, DELETE) y el nuevo registro (record)
    const action = postData.type;
    const record = postData.record;
    
    // Solo nos interesa cuando un agente es actualizado (para mantener sincronía de puntos/rol)
    if (action === 'UPDATE' && record) {
      if (!record.id) throw new Error("ID de agente perdido en la actualización.");
      
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAME_AGENTES);
      
      if (!sheet) throw new Error("No se encontró la pestaña CONSAGRADOS");
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0]; 
      
      // Encontrar la fila del agente buscando su ID en la columna "ID"
      const idColIndex = headers.findIndex(h => h.toString().trim().toUpperCase() === "ID");
      let rowIndexFound = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idColIndex]).trim() === String(record.id).trim()) {
           rowIndexFound = i + 1; // +1 porque las filas en Sheets son 1-indexed (la base 0 la tiene el array)
           break;
        }
      }
      
      // Si el agente existe, procedemos a actualizar sus columnas
      if (rowIndexFound > -1) {
        // Diccionario de columnas (Headers del Sheet) VS el valor de Supabase
        const columnsToUpdate = {
          "NOMBRE": record.nombre || "AGENTE DESCONOCIDO", // Asegurar actualización de nombre
          "XP": record.xp || 0,
          "RANGO": record.rango || "RECLUTA",
          "ROL": record.cargo || "ESTUDIANTE", // Frontend envía cargo como role en Supabase
          "WHATSAPP": record.whatsapp || "",
          "PIN": record.pin || "",
          "FOTO_URL": record.foto_url || "",
          "TALENTO": record.talent || "PENDIENTE",
          "ESTADO": record.status || "ACTIVO",
          "BAUTIZADO": record.baptism_status || "NO",
          "NIVEL_ACCESO": record.cargo || "ESTUDIANTE", // 'cargo' de Supabase va a 'NIVEL_ACCESO' en Sheet
          "BIBLIA": record.bible || 0,
          "APUNTES": record.notes || 0,
          "LIDERAZGO": record.leadership || 0,
          "FECHA_INGRESO": record.joined_date || "",
          "FECHA_NACIMIENTO": record.birthday || "",
          "RELACION_CON_DIOS": record.relationship_with_god || "",
          "PREGUNTA": record.security_question || "",
          "RESPUESTA": record.security_answer || "",
          "MUST_CHANGE": record.must_change_password ? "SI" : "NO",
          "BIOMETRIC": record.biometric_credential || "",
          "STREAK": record.streak_count || 0,
          "LAST_STREAK_DATE": record.last_streak_date || "",
          "LAST_ATTENDANCE": record.last_attendance || "",
          "LAST_COURSE": record.last_course || "",
          "TASKS": record.weekly_tasks ? JSON.stringify(record.weekly_tasks) : "[]",
          "NOTIF_PREFS": record.notif_prefs ? JSON.stringify(record.notif_prefs) : '{"read":[],"deleted":[]}',
          "STATS": record.tactical_stats ? JSON.stringify(record.tactical_stats) : "",
          "SUMMARY": record.tactor_summary || "", 
          "PENDING_AI": record.is_ai_profile_pending ? "SI" : "NO"
        };
        
        // Efectuar la escritura masiva solo en las columnas mapeadas
        for (const [headerName, newValue] of Object.entries(columnsToUpdate)) {
          const colIndex = headers.findIndex(h => h.toString().trim().toUpperCase() === headerName.toUpperCase());
          if (colIndex > -1) {
             sheet.getRange(rowIndexFound, colIndex + 1).setValue(newValue);
          }
        }
        
        return ContentService.createTextOutput(JSON.stringify({"success": true, "message": "Fila actualizada correctamente como espejo."}))
                             .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({"success": false, "message": "Agente no encontrado en Sheets"}))
                             .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Ignoramos inserciones o borrados por ahora para mayor seguridad
    return ContentService.createTextOutput(JSON.stringify({"success": true, "message": "Ignoring non-update action."}))
                         .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({"success": false, "error": err.message}))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
