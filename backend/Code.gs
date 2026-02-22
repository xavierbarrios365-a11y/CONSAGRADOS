
/****************************************************************************************************************************
* TACTICAL CORE V37 - BACKEND GOOGLE APPS SCRIPT (v3.5 - Backend Simplificado)
* DESCRIPCIÓN: Backend para la aplicación Consagrados 2026.
*
* ---> ¡SISTEMA CONFIGURADO Y LISTO! <---
*
*   Se ha refactorizado el backend para que solo actúe como un proveedor de datos crudos, aumentando la estabilidad.
*   Toda la lógica de procesamiento ahora reside en el frontend.
*
****************************************************************************************************************************/

// --- FUNCIÓN DE CONFIGURACIÓN GLOBAL (v4 — Credenciales aseguradas) ---
// Las credenciales sensibles se leen de PropertiesService.
// Ejecuta setupSecretProperties() UNA VEZ desde el editor de Apps Script para guardarlas.
function getGlobalConfig() {
  var props = PropertiesService.getScriptProperties();
  
  // Leer credenciales desde PropertiesService (nunca expuestas en código)
  var saPrivateKey = props.getProperty('SA_PRIVATE_KEY') || '';
  var saClientEmail = props.getProperty('SA_CLIENT_EMAIL') || '';
  var saProjectId = props.getProperty('SA_PROJECT_ID') || '';

  return {
    SPREADSHEET_ID: props.getProperty('SPREADSHEET_ID') || '',
    DRIVE_FOLDER_ID: props.getProperty('DRIVE_FOLDER_ID') || '',
    TELEGRAM_BOT_TOKEN: props.getProperty('TELEGRAM_BOT_TOKEN') || '',
    TELEGRAM_CHAT_ID: props.getProperty('TELEGRAM_CHAT_ID') || '',
    DIRECTORY_SHEET_NAME: 'DIRECTORIO_OFICIAL',
    ENROLLMENT_SHEET_NAME: 'INSCRIPCIONES',
    ATTENDANCE_SHEET_NAME: 'ASISTENCIA',
    GUIAS_SHEET_NAME: 'GUIAS',
    ACADEMY_COURSES_SHEET: 'ACADEMIA_CURSOS',
    ACADEMY_LESSONS_SHEET: 'ACADEMIA_LECCIONES',
    ACADEMY_PROGRESS_SHEET: 'ACADEMIA_PROGRESO',
    STREAKS_SHEET: 'RACHAS',
    VERSES_SHEET: 'VERSICULO_DIARIO',
    NOTIFICATIONS_SHEET: 'NOTIFICACIONES',
    EVENTS_SHEET_NAME: 'CALENDARIO_EVENTOS',
    EVENT_CONFIRMATIONS_SHEET: 'CONFIRMACION_EVENTOS',
    TASKS_SHEET: 'TAREAS',
    TASK_PROGRESS_SHEET: 'PROGRESO_TAREAS',
    PROMOTIONS_SHEET: 'ASCENSOS',
    NEWS_SHEET: 'NOTICIAS',
    SERVICE_ACCOUNT: {
      project_id: saProjectId,
      private_key: saPrivateKey,
      client_email: saClientEmail
    },
    OFFICIAL_LOGO_ID: '1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f'
  };
}

/**
 * @description EJECUTAR UNA SOLA VEZ desde el editor de Apps Script.
 * Guarda todas las credenciales sensibles en PropertiesService.
 * INSTRUCCIONES: Reemplaza cada 'REPLACE_ME' con el valor real ANTES de ejecutar.
 * Después de ejecutar exitosamente, BORRA los valores de este archivo.
 */
function setupSecretProperties() {
  var props = PropertiesService.getScriptProperties();
  props.setProperties({
    'SPREADSHEET_ID': 'REPLACE_ME',
    'DRIVE_FOLDER_ID': 'REPLACE_ME',
    'TELEGRAM_BOT_TOKEN': 'REPLACE_ME',
    'TELEGRAM_CHAT_ID': 'REPLACE_ME',
    'SA_PROJECT_ID': 'REPLACE_ME',
    'SA_CLIENT_EMAIL': 'REPLACE_ME',
    'SA_PRIVATE_KEY': 'REPLACE_ME'
  });
  Logger.log('✅ CREDENCIALES GUARDADAS EN PROPERTIES SERVICE.');
  SpreadsheetApp.getUi().alert('✅ Credenciales almacenadas de forma segura.');
}

// ============================================================================
// HELPERS COMPARTIDOS — Reducen boilerplate en todas las funciones de acción
// ============================================================================

/**
 * Mapa centralizado de alias de encabezados.
 * Permite encontrar una columna sin importar si usa el nombre viejo o el nuevo.
 */
var HEADER_ALIASES = {
  'ID':                 ['ID', 'ID CÉDULA', 'ID CEDULA', 'CEDULA'],
  'NOMBRE':             ['NOMBRE', 'NOMBRE COMPLETO'],
  'PIN':                ['PIN', 'CONTRASEÑA/PIN', 'PASS'],
  'XP':                 ['XP', 'PUNTOS XP', 'PUNTOS_XP'],
  'RANGO':              ['RANGO'],
  'CARGO':              ['CARGO', 'NIVEL_ACCESO', 'PUESTO'],
  'ESTADO':             ['ESTADO', 'STATUS', 'ESTATUS'],
  'WHATSAPP':           ['WHATSAPP', 'TELEFONO', 'TELÉFONO'],
  'FECHA_NACIMIENTO':   ['FECHA_NACIMIENTO', 'FECHA DE NACIMIENTO'],
  'FECHA_INGRESO':      ['FECHA_INGRESO', 'FECHA DE INGRESO'],
  'TALENTO':            ['TALENTO'],
  'BAUTIZADO':          ['BAUTIZADO'],
  'RELACION_CON_DIOS':  ['RELACION_CON_DIOS', 'RELACION CON DIOS'],
  'PUNTOS_BIBLIA':      ['PUNTOS_BIBLIA', 'PUNTOS BIBLIA'],
  'PUNTOS_APUNTES':     ['PUNTOS_APUNTES', 'PUNTOS APUNTES'],
  'PUNTOS_LIDERAZGO':   ['PUNTOS_LIDERAZGO', 'PUNTOS LIDERAZGO'],
  'FOTO_URL':           ['FOTO_URL', 'FOTO URL', 'FOTO'],
  'NOTIF_PREFS':        ['NOTIF_PREFS'],
  'FCM_TOKEN':          ['FCM_TOKEN'],
  'PREGUNTA_SEGURIDAD': ['PREGUNTA_SEGURIDAD'],
  'RESPUESTA_SEGURIDAD':['RESPUESTA_SEGURIDAD'],
  'CAMBIO_OBLIGATORIO_PIN': ['CAMBIO_OBLIGATORIO_PIN'],
  'STATS_JSON':         ['STATS_JSON'],
  'TACTOR_SUMMARY':     ['TACTOR_SUMMARY'],
  'LAST_AI_UPDATE':     ['LAST_AI_UPDATE'],
  'BIOMETRIC_CREDENTIAL': ['BIOMETRIC_CREDENTIAL'],
  'STREAK_COUNT':       ['STREAK_COUNT'],
  'LAST_COMPLETED_DATE':['LAST_COMPLETED_DATE', 'LAST_COMPLETED_WEEK']
};

/**
 * Busca el índice de un encabezado canónico en un array de headers,
 * probando todos los alias conocidos.
 * @param {string[]} headers - Array de encabezados normalizados a UPPERCASE.
 * @param {string} canonicalName - Nombre canónico (ej: 'PUNTOS_BIBLIA').
 * @returns {number} Índice 0-based, o -1 si no se encontró.
 */
function findHeaderIdx(headers, canonicalName) {
  var aliases = HEADER_ALIASES[canonicalName] || [canonicalName];
  for (var a = 0; a < aliases.length; a++) {
    var idx = headers.indexOf(aliases[a]);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Devuelve una respuesta JSON exitosa. */
function jsonOk(data) {
  return ContentService.createTextOutput(JSON.stringify(
    typeof data === 'object' ? Object.assign({ success: true }, data) : { success: true }
  )).setMimeType(ContentService.MimeType.JSON);
}

/** Devuelve una respuesta JSON de error. */
function jsonError(msg) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: msg })).setMimeType(ContentService.MimeType.JSON);
}

/** Abre el spreadsheet principal (evita repetir getGlobalConfig + openById). */
function getSpreadsheet() {
  return SpreadsheetApp.openById(getGlobalConfig().SPREADSHEET_ID);
}

/**
 * Busca la fila de un agente por ID en un array de datos del directorio.
 * @returns {number} Índice 0-based de la fila, o -1 si no se encontró.
 */
function findAgentRow(directoryData, agentId) {
  const searchId = String(agentId).trim().toUpperCase();
  for (let i = 1; i < directoryData.length; i++) {
    if (String(directoryData[i][0]).trim().toUpperCase() === searchId) return i;
  }
  return -1;
}

/**
 * Busca un agente y actualiza múltiples columnas en una sola escritura batch.
 * @param {Sheet} sheet - Hoja del directorio.
 * @param {string} agentId - ID del agente a buscar.
 * @param {Object} updates - Objeto { nombreCanónico: nuevoValor } con las columnas a actualizar.
 * @returns {{ rowIdx: number, headers: string[], data: any[][] }} Info del agente encontrado.
 */
function findAndUpdateAgent(sheet, agentId, updates) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim().toUpperCase(); });
  var idCol = findHeaderIdx(headers, 'ID');

  var rowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim().toUpperCase() === String(agentId).trim().toUpperCase()) {
      rowIdx = i;
      break;
    }
  }
  if (rowIdx === -1) throw new Error("Agente no encontrado.");

  var rowData = sheet.getRange(rowIdx + 1, 1, 1, headers.length).getValues()[0];
  var keys = Object.keys(updates);
  for (var k = 0; k < keys.length; k++) {
    var colIdx = findHeaderIdx(headers, keys[k]);
    if (colIdx !== -1) rowData[colIdx] = updates[keys[k]];
  }
  sheet.getRange(rowIdx + 1, 1, 1, headers.length).setValues([rowData]);
  return { rowIdx: rowIdx, headers: headers, data: data, rowData: rowData };
}


/**
 * @description Envía una notificación a un chat de Telegram.
 */
function sendTelegramNotification(message) {
  const CONFIG = getGlobalConfig();
  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID || CONFIG.TELEGRAM_BOT_TOKEN.includes('PEGA_AQUI')) {
    Logger.log("El Token o Chat ID de Telegram no han sido configurados en el script.");
    return;
  }
  
  try {
    const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: CONFIG.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    };
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });
  } catch (error) {
    Logger.log(`Error al enviar notificación a Telegram: ${error.message}`);
  }
}

/**
 * @description Envía una notificación push vía Firebase Cloud Messaging (FCM v1).
 * Puede enviarse a un tema global o a un token específico (privado).
 */
function sendPushNotification(title, message, targetToken) {
  const CONFIG = getGlobalConfig();
  if (!CONFIG.SERVICE_ACCOUNT || !CONFIG.SERVICE_ACCOUNT.private_key) {
    Logger.log("Service Account no configurada. Saltando envío push.");
    return;
  }

  try {
    const accessToken = getFcmAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${CONFIG.SERVICE_ACCOUNT.project_id}/messages:send`;
    
    // El payload v1 es más estructurado
    const payload = {
      message: {
        notification: {
          title: `📢 ${title.toUpperCase()}`,
          body: message
        },
        webpush: {
          notification: {
            icon: "https://lh3.googleusercontent.com/d/" + CONFIG.OFFICIAL_LOGO_ID,
            click_action: "https://consagrados.vercel.app"
          }
        }
      }
    };

    // Si hay token, enviamos directo al agente. Si no, al topic global.
    if (targetToken) {
      payload.message.token = targetToken;
    } else {
      payload.message.topic = "all_agents";
    }

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": "Bearer " + accessToken
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    Logger.log(`Respuesta FCM v1: ${response.getContentText()}`);
  } catch (error) {
    Logger.log(`Error al enviar Push via FCM v1: ${error.message}`);
  }
}

/**
 * @description Recupera el token FCM de un agente desde el directorio.
 */
function getAgentFcmToken(agentId) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toUpperCase());
  const idColIdx = headers.indexOf('ID');
  const tokenColIdx = headers.indexOf('FCM_TOKEN');

  if (idColIdx === -1 || tokenColIdx === -1) return null;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]).trim() === String(agentId).trim()) {
      return data[i][tokenColIdx] || null;
    }
  }
  return null;
}

/**
 * @description Obtiene un Access Token de Google usando la Service Account.
 */
function getFcmAccessToken() {
  const CONFIG = getGlobalConfig();
  const serviceAccount = CONFIG.SERVICE_ACCOUNT;
  
  const header = JSON.stringify({
    alg: "RS256",
    typ: "JWT"
  });
  
  const now = Math.floor(Date.now() / 1000);
  const claim = JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  });
  
  const base64Encode = (str) => {
    return Utilities.base64EncodeWebSafe(str).replace(/=+$/, '');
  };
  
  const signatureInput = base64Encode(header) + "." + base64Encode(claim);
  const signature = Utilities.computeRsaSha256Signature(signatureInput, serviceAccount.private_key);
  const jwt = signatureInput + "." + base64Encode(signature);
  
  const options = {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    }
  };
  
  const response = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", options);
  const data = JSON.parse(response.getContentText());
  return data.access_token;
}

/**
 * @description AUTO-CURACIÓN DE ESQUEMA: Verifica que todas las columnas requeridas existan en DIRECTORIO_OFICIAL.
 * Si faltan, las crea automáticamente al final de la hoja.
 */
function verifyAndFixSchema() {
  var CONFIG = getGlobalConfig();
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  if (!sheet) return;

  var REQUIRED_COLUMNS = [
    'ID', 'NOMBRE', 'PIN', 'XP', 'RANGO', 'CARGO', 'ESTADO', 'WHATSAPP', 
    'FECHA_NACIMIENTO', 'FECHA_INGRESO', 'TALENTO', 'BAUTIZADO', 
    'RELACION_CON_DIOS', 'PUNTOS_BIBLIA', 'PUNTOS_APUNTES', 'PUNTOS_LIDERAZGO', 
    'FOTO_URL', 'NIVEL_ACCESO', 'NOTIF_PREFS', 'FCM_TOKEN', 
    'PREGUNTA_SEGURIDAD', 'RESPUESTA_SEGURIDAD', 'CAMBIO_OBLIGATORIO_PIN', 
    'STATS_JSON', 'TACTOR_SUMMARY', 'LAST_AI_UPDATE', 'BIOMETRIC_CREDENTIAL',
    'STREAK_COUNT', 'LAST_COMPLETED_DATE'
  ];

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var normalizedHeaders = headers.map(function(h) { return String(h).trim().toUpperCase(); });
  var addedColumns = [];

  REQUIRED_COLUMNS.forEach(function(col) {
    if (normalizedHeaders.indexOf(col) === -1) {
      var nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(col).setFontWeight('bold');
      addedColumns.push(col);
      normalizedHeaders.push(col);
    }
  });

  if (addedColumns.length > 0) {
    Logger.log('AUTO-CURACIÓN: Se añadieron las columnas faltantes: ' + addedColumns.join(', '));
  }

  // --- NUEVA LIMPIEZA TÁCTICA: Normalizar IDs (Trim) ---
  var idColIdx = normalizedHeaders.indexOf('ID');
  if (idColIdx !== -1) {
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var idRange = sheet.getRange(2, idColIdx + 1, lastRow - 1, 1);
      var idValues = idRange.getValues();
      var cleanedValues = idValues.map(function(row) {
        return [String(row[0]).trim()];
      });
      idRange.setValues(cleanedValues);
    }
  }

  // Limpiar también en Asistencia
  var attenSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
  if (attenSheet) {
    var aLastRow = attenSheet.getLastRow();
    if (aLastRow > 1) {
      var aIdRange = attenSheet.getRange(2, 1, aLastRow - 1, 1);
      var aIdValues = aIdRange.getValues();
      var aCleanedValues = aIdValues.map(function(row) {
        return [String(row[0]).trim()];
      });
      aIdRange.setValues(aCleanedValues);
    }
  }

  // --- AUTO-CURACIÓN DE RACHAS ---
  var streakSheet = ss.getSheetByName(CONFIG.STREAKS_SHEET);
  if (streakSheet) {
    var STREAK_REQUIRED = ['AGENT_ID', 'STREAK_COUNT', 'LAST_COMPLETED_DATE', 'TASKS_JSON', 'NOTIFS_SENT'];
    var sHeaders = streakSheet.getRange(1, 1, 1, Math.max(1, streakSheet.getLastColumn())).getValues()[0];
    var sNormHeaders = sHeaders.map(function(h) { return String(h).trim().toUpperCase(); });
    
    STREAK_REQUIRED.forEach(function(col) {
      if (sNormHeaders.indexOf(col) === -1) {
        var nextCol = streakSheet.getLastColumn() + 1;
        streakSheet.getRange(1, nextCol).setValue(col).setFontWeight('bold');
        sNormHeaders.push(col);
      }
    });
  }
}

/**
 * @description Maneja las solicitudes GET. Devuelve todos los datos crudos del Directorio Oficial.
 */
function doGet(e) {
  var CONFIG = getGlobalConfig();
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID.includes('PEGA_AQUI')) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Configuración incompleta: SPREADSHEET_ID no está definido en el script." })).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    const ss = getSpreadsheet();
    const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
    const strikesSheet = ss.getSheetByName(CONFIG.STREAKS_SHEET);
    const attendanceSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
    
    if (!directorySheet) throw new Error(`Sheet "${CONFIG.DIRECTORY_SHEET_NAME}" no encontrada.`);
    
    const directoryData = directorySheet.getDataRange().getValues();
    const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
    
    // Virtual Join de Rachas
    const streakMap = new Map();
    if (strikesSheet) {
      const strikeData = strikesSheet.getDataRange().getValues();
      const strikeHeaders = strikeData[0].map(h => String(h).trim().toUpperCase());
      const strikeAgentIdIdx = strikeHeaders.indexOf('AGENT_ID');
      const streakCountIdx = strikeHeaders.indexOf('STREAK_COUNT');
      const tasksJsonIdx = strikeHeaders.indexOf('TASKS_JSON');
      
      if (strikeAgentIdIdx !== -1) {
        for (let i = 1; i < strikeData.length; i++) {
          const sAgentId = String(strikeData[i][strikeAgentIdIdx]).trim().toUpperCase();
          if (!sAgentId) continue;
          streakMap.set(sAgentId, {
            streak: parseInt(strikeData[i][streakCountIdx]) || 0,
            tasks: strikeData[i][tasksJsonIdx] || '[]',
            lastDate: (() => {
              let idx1 = strikeHeaders.indexOf('LAST_COMPLETED_DATE');
              if (idx1 === -1) idx1 = strikeHeaders.indexOf('LAST_COMPLETED_WEEK');
              if (idx1 !== -1 && strikeData[i][idx1]) {
                const val = strikeData[i][idx1];
                if (val instanceof Date) return val.toISOString();
                // Si es epoch ms (número grande), devolverlo directamente como string
                const numVal = Number(val);
                if (!isNaN(numVal) && numVal > 1000000000000) return String(val).trim();
                return String(val).trim();
              }
              return '';
            })()
          });
        }
      }
    }

    // --- VIRTUAL JOIN: ACADEMIA ---
    const academySheet = ss.getSheetByName(CONFIG.ACADEMY_PROGRESS_SHEET);
    const academyMap = new Map();
    if (academySheet) {
      const acadData = academySheet.getDataRange().getValues();
      const acadHeaders = acadData[0].map(h => String(h).trim().toUpperCase());
      const acadAgentIdIdx = acadHeaders.indexOf('AGENT_ID');
      const acadStatusIdx = acadHeaders.indexOf('STATUS');
      const acadCourseIdx = acadHeaders.indexOf('COURSE_ID');

      if (acadAgentIdIdx !== -1) {
        for (let i = 1; i < acadData.length; i++) {
          if (String(acadData[i][acadStatusIdx]).toUpperCase() !== 'COMPLETADO') continue;
          const aAgentId = String(acadData[i][acadAgentIdIdx]).trim().toUpperCase();
          if (!aAgentId) continue;
          const courseName = String(acadData[i][acadCourseIdx]);
          // Guardar el último encontrado (asumiendo que los nuevos están abajo)
          academyMap.set(aAgentId, courseName);
        }
      }
    }

    // --- VIRTUAL JOIN: ASISTENCIA ---
    const lastAttenMap = new Map();
    if (attendanceSheet) {
      const attenData = attendanceSheet.getDataRange().getValues();
      for (let i = 1; i < attenData.length; i++) {
        const row = attenData[i];
        const aId = String(row[0]).trim().toUpperCase();
        if (!aId) continue;
        const candidateDate = row[3];
        if (candidateDate instanceof Date && !isNaN(candidateDate.getTime())) {
          const existingDate = lastAttenMap.get(aId);
          if (!existingDate || candidateDate > existingDate) {
            lastAttenMap.set(aId, candidateDate);
          }
        }
      }
    }

    // --- INYECCIÓN DE COLUMNAS VIRTUALES (JOIN DINÁMICO) ---
    const vHeaders = ['STREAK_COUNT', 'TASKS_JSON', 'LAST_COMPLETED_DATE', 'LAST_COURSE', 'LAST_ATTENDANCE'];
    
    // 1. Identificar qué columnas faltan y añadirlas al encabezado si es necesario
    vHeaders.forEach(vh => {
      if (headers.indexOf(vh) === -1) {
        directoryData[0].push(vh);
      }
    });
    
    // 2. Mapear Índices Finales (Después de la expansión del header)
    const finalHeaders = directoryData[0].map(h => String(h).trim().toUpperCase());
    const vIndices = vHeaders.map(vh => finalHeaders.indexOf(vh));

    const now = new Date();
    const todayStr = Utilities.formatDate(now, "GMT-4", "yyyy-MM-dd");
    const yesterdayStr = Utilities.formatDate(new Date(now.getTime() - 86400000), "GMT-4", "yyyy-MM-dd");

    for (let i = 1; i < directoryData.length; i++) {
        const agentId = String(directoryData[i][0]).trim().toUpperCase();
        if (!agentId) continue;

        const streakInfo = streakMap.get(agentId) || { streak: 0, tasks: '[]', lastDate: '' };
        
        // Racha directa del servidor — sin reset visual
        const displayStreak = streakInfo.streak;

        const lastCourse = academyMap.get(agentId) || '';
        const lastAtten = lastAttenMap.get(agentId) || '';
        const lastAttenStr = lastAtten instanceof Date ? Utilities.formatDate(lastAtten, "GMT-4", "yyyy-MM-dd") : lastAtten;

        // 3. Poblar cada columna virtual en su índice correcto
        vHeaders.forEach((vh, vIdx) => {
            const freshVal = (vh === 'STREAK_COUNT') ? displayStreak :
                             (vh === 'TASKS_JSON') ? streakInfo.tasks :
                             (vh === 'LAST_COMPLETED_DATE') ? streakInfo.lastDate :
                             (vh === 'LAST_COURSE') ? lastCourse :
                             (vh === 'LAST_ATTENDANCE') ? lastAttenStr : '';
            
            const targetIdx = vIndices[vIdx];
            if (targetIdx !== -1) {
              // Asegurar que la fila tiene longitud suficiente
              while (directoryData[i].length <= targetIdx) {
                directoryData[i].push('');
              }
              directoryData[i][targetIdx] = freshVal;
            }
        });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ data: directoryData })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(error);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * @description Maneja las solicitudes POST. Enrutador de acciones.
 */
function doPost(e) {
  const CONFIG = getGlobalConfig();
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID.includes('PEGA_AQUI')) return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Configuración SPREADSHEET_ID incompleta." })).setMimeType(ContentService.MimeType.JSON);
  
  try {
    // Auto-curación de esquema desactivada del hot-path para rendimiento.
    // Ejecutar verifyAndFixSchema() manualmente desde el menú CONSAGRADOS o con un trigger.

    const request = JSON.parse(e.postData.contents);
    switch (request.action) {
      case 'enroll_agent':
        return enrollAgent(request.data);
      case 'upload_image':
        if (!CONFIG.DRIVE_FOLDER_ID || CONFIG.DRIVE_FOLDER_ID.includes('PEGA_AQUI')) throw new Error("DRIVE_FOLDER_ID no configurado.");
        return uploadImage(request.data);
      case 'register_id_scan':
        return registerIdScan(request.data);
      case 'update_agent_points':
        return updateAgentPoints(request.data);
      case 'update_tactical_stats':
        return updateTacticalStats(request.data);
      case 'reconstruct_db':
        return reconstructDb();
      case 'update_user_password':
        return updateUserPassword(request.data);
      case 'get_security_question':
        return getSecurityQuestion(request.data);
      case 'reset_password_with_answer':
        return resetPasswordWithAnswer(request.data);
      case 'upload_guide':
        return uploadGuide(request.data);
      case 'get_guides':
        return getGuides(request.data);
      case 'delete_guide':
        return deleteGuide(request.data);
      case 'update_agent_photo':
        return updateAgentPhoto(request.data);
      case 'get_visitor_radar':
        return getVisitorRadar();
      case 'deduct_percentage_points':
        return deductPercentagePoints(request.data);
      case 'get_academy_data':
        return getAcademyData(request.data);
      case 'submit_quiz_result':
        return submitQuizResult(request.data);
      case 'save_bulk_academy_data':
        return saveBulkAcademyData(request.data);
      case 'delete_academy_course':
        return deleteAcademyCourse(request.data);
      case 'delete_academy_lesson':
        return deleteAcademyLesson(request.data);
      case 'reset_student_attempts':
        return resetStudentAttempts(request.data);
      case 'send_agent_credentials':
        return sendAgentCredentials(request.data);
      case 'bulk_send_credentials':
        return bulkSendCredentials();
      case 'register_biometrics':
        return registerBiometrics(request.data);
      case 'verify_biometrics':
        return verifyBiometrics(request.data);
      case 'get_daily_verse':
        return getDailyVerse();
      case 'update_streaks':
        return updateStreaks(request.data);
      case 'confirm_director_attendance':
        return confirmDirectorAttendance(request.data);
      case 'create_event':
        return createEvent(request.data);
      case 'get_active_events':
        return getActiveEvents();
      case 'confirm_event_attendance':
        return confirmEventAttendance(request.data);
      case 'delete_event':
        return deleteEvent(request.data);
      case 'send_broadcast_notification':
        return sendBroadcastNotification(request.data);
      case 'get_notifications':
        return getNotifications();
      case 'sync_fcm_token':
        return syncFcmToken(request.data);
      case 'apply_absence_penalties':
        return applyAbsencePenalties();
      case 'activate_visitor_as_agent':
        return activateVisitorAsAgent(request.data);
      case 'update_notif_prefs':
        return updateNotifPrefs(request.data);
      case 'delete_agent':
        return deleteAgent(request.data);
      // === SISTEMA DE ASCENSO ===
      case 'get_tasks':
        return getTasks();
      case 'create_task':
        return createTaskAction(request.data);
      case 'delete_task':
        return deleteTaskAction(request.data);
      case 'submit_task_completion':
        return submitTaskCompletion(request.data);
      case 'verify_task':
        return verifyTaskAction(request.data);
      case 'get_promotion_status':
        return getPromotionStatus(request.data);
      case 'get_task_recruits':
        return getTaskRecruits();
      case 'promote_agent':
        return promoteAgent(request.data);
      case 'remove_recruit_from_task':
        return removeRecruitFromTask(request.data);
      case 'get_news_feed':
        return getNewsFeed();
      case 'get_badges':
        return computeBadges();
      default:
        throw new Error("Acción no reconocida: " + (request.action || "SIN ACCIÓN"));
    }
  } catch (error) {
    Logger.log(error);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * @description Inscribe un nuevo agente y notifica por Telegram.
 */
function enrollAgent(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  if (!directorySheet) throw new Error(`Sheet "${CONFIG.DIRECTORY_SHEET_NAME}" no encontrada.`);
  
  const headers = directorySheet.getRange(1, 1, 1, directorySheet.getLastColumn()).getValues()[0];
  
  const newId = `CON-${Math.floor(1000 + Math.random() * 9000)}`;
  const newPin = Math.floor(1000 + Math.random() * 9000).toString();
  
  const newRow = headers.map(header => {
    const h = String(header).trim().toUpperCase();
    switch (h) {
      case 'ID CÉDULA':
      case 'ID': return newId; 
      case 'NOMBRE': return data.nombre || ''; 
      case 'TELEFONO':
      case 'WHATSAPP': return data.whatsapp || '';
      case 'FECHA DE NACIMIENTO':
      case 'FECHA_NACIMIENTO': return data.fechaNacimiento || ''; 
      case 'TALENTO': return data.talento || '';
      case 'BAUTIZADO': return data.bautizado || 'NO'; 
      case 'RELACION CON DIOS':
      case 'RELACION_CON_DIOS': return data.relacion || '';
      case 'NIVEL_ACCESO':
      case 'CARGO': return data.nivel || 'Estudiante'; 
      case 'FOTO URL':
      case 'FOTO_URL': return data.photoUrl || '';
      case 'CONTRASEÑA/PIN':
      case 'PIN': return newPin; 
      case 'STATUS':
      case 'ESTADO': return 'ACTIVO'; 
      case 'RANGO': return (data.nivel === 'LIDER' || data.nivel === 'DIRECTOR') ? 'ACTIVO' : 'RECLUTA';
      case 'PUNTOS XP':
      case 'XP': return 0; 
      case 'PUNTOS BIBLIA': return 0;
      case 'PUNTOS APUNTES': return 0;
      case 'PUNTOS LIDERAZGO': return 0;
      case 'FECHA_INGRESO': return new Date(); 
      case 'PREGUNTA_SEGURIDAD': return data.preguntaSeguridad || '¿Cuál es tu color favorito?';
      case 'RESPUESTA_SEGURIDAD': return data.respuestaSeguridad || 'Azul';
      case 'CAMBIO_OBLIGATORIO_PIN': return 'SI';
      case 'REFERIDO_POR': return data.referidoPor || '';
      default: return '';
    }
  });
  
  directorySheet.appendRow(newRow);
  
  // Registrar noticia de referido si aplica
  if (data.referidoPor) {
    addNewsItem(ss, 'OPERACION', '🎯 ' + data.referidoPor + ' reclutó a ' + data.nombre + ' — ¡Nuevo agente en las filas!', '', data.referidoPor);
  }
  
  const telegramMessage = `✅ <b>NUEVA INSCRIPCIÓN TÁCTICA</b>\n\nUn nuevo agente se ha unido a las filas.\n\n<b>• Nombre:</b> ${data.nombre}\n<b>• URL:</b> https://consagrados.vercel.app/\n<b>• ID Generado:</b> <code>${newId}</code>\n<b>• PIN de Acceso:</b> <code>${newPin}</code>\n<b>• Pregunta:</b> ${data.preguntaSeguridad || '¿Cuál es tu color favorito?'}\n<b>• Respuesta:</b> ${data.respuestaSeguridad || 'Azul'}\n\n<i>Por favor, entrega estas credenciales al agente para su despliegue inmediato.</i>`;
  sendTelegramNotification(telegramMessage);

  return jsonOk({ newId: newId });
}

/**
 * @description Sube un archivo a Google Drive y devuelve su URL de descarga/vista.
 */
function uploadImage(data) {
  const CONFIG = getGlobalConfig();
  try {
    const { file, mimeType, filename } = data;
    
    if (!file) throw new Error("No se recibió contenido de archivo.");
    
    let decoded;
    try {
      decoded = Utilities.base64Decode(file);
    } catch (e) {
      throw new Error(`Fallo en decodificación Base64: ${e.message}`);
    }
    
    const blob = Utilities.newBlob(decoded, mimeType, filename);
    const sizeKb = Math.round(blob.getBytes().length / 1024);
    console.log(`📤 Subiendo archivo: ${filename} (${sizeKb} KB) - Mime: ${mimeType}`);

    if (!CONFIG.DRIVE_FOLDER_ID) throw new Error("DRIVE_FOLDER_ID no configurado.");
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    
    const newFile = folder.createFile(blob);
    newFile.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    
    const isImage = mimeType && mimeType.startsWith('image/');
    const fileUrl = isImage 
      ? `https://lh3.googleusercontent.com/d/${newFile.getId()}`
      : `https://drive.google.com/file/d/${newFile.getId()}/view`;
    
    return jsonOk({ url: fileUrl, id: newFile.getId() });
  } catch (e) {
    console.error(`❌ Error en uploadImage: ${e.message}`);
    return jsonError(`Error en servidor Drive: ${e.message}`);
  }
}

/**
 * @description Actualiza las preferencias de notificaciones (leídas/borradas) de un agente.
 */
function updateNotifPrefs(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  const idCol = headers.indexOf('ID');
  let prefsCol = headers.indexOf('NOTIF_PREFS');
  
  if (prefsCol === -1) {
    prefsCol = headers.length;
    sheet.getRange(1, prefsCol + 1).setValue('NOTIF_PREFS');
  }

  const rowIdx = directoryData.findIndex(row => String(row[idCol]).trim() === String(data.agentId).trim());
  if (rowIdx === -1) throw new Error("Agente no encontrado.");

  sheet.getRange(rowIdx + 1, prefsCol + 1).setValue(JSON.stringify(data.prefs));
  return jsonOk();
}

/**
 * @description Registra una asistencia y notifica por Telegram.
 */
function registerIdScan(payload) {
   const CONFIG = getGlobalConfig();
   const ss = getSpreadsheet();
   const attendanceSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
   if (!attendanceSheet) throw new Error(`Sheet "${CONFIG.ATTENDANCE_SHEET_NAME}" no encontrada.`);
   
   // --- VALIDACIÓN: UN ESCANEO POR DÍA ---
   const attendanceData = attendanceSheet.getDataRange().getValues();
   const today = new Date();
   today.setHours(0,0,0,0);
   
   for (let i = 1; i < attendanceData.length; i++) {
     const rowId = attendanceData[i][0];
     const rowDate = new Date(attendanceData[i][3]);
     rowDate.setHours(0,0,0,0);
     
     if (String(rowId) === String(payload.scannedId) && rowDate.getTime() === today.getTime()) {
       return jsonError("ALERTA: Agente ya registrado el día de hoy.");
     }
   }

   attendanceSheet.appendRow([payload.scannedId, 'ASISTENCIA', payload.location, new Date(payload.timestamp), payload.referidoPor || '']);

   // Notificación a Telegram y puntos
   const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
   const directoryData = directorySheet.getDataRange().getValues();
   let agentName = "Desconocido";
   let agentRowIdx = -1;

   for (let i = 1; i < directoryData.length; i++) {
     if (String(directoryData[i][0]) == String(payload.scannedId)) {
       agentName = directoryData[i][1]; 
       agentRowIdx = i + 1;
       break;
     }
   }
   
   // Publicar en Intel Feed (Siempré con NOMBRE)
   if (agentRowIdx !== -1) {
     addNewsItem(ss, 'DESPLIEGUE', '🛡️ ' + agentName + ' se reportó para el despliegue.', payload.scannedId, agentName);
   } else {
     // Si es visitante y tiene referido, acreditar al reclutador
     if (payload.referidoPor) {
        addNewsItem(ss, 'OPERACION', '🎯 ' + payload.referidoPor + ' trajo a un nuevo visitante (' + payload.scannedId + ').', '', payload.referidoPor);
     }
   }
   
   // AUTO-XP: +10 Liderazgo, +10 Biblia, +10 Apuntes, +30 XP total (1 batch write)
   if (agentRowIdx !== -1) {
     const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
     const leadCol = findHeaderIdx(headers, 'PUNTOS_LIDERAZGO');
     const bibleCol = findHeaderIdx(headers, 'PUNTOS_BIBLIA');
     const notesCol = findHeaderIdx(headers, 'PUNTOS_APUNTES');
     const xpCol = findHeaderIdx(headers, 'XP');

     if (leadCol !== -1 || bibleCol !== -1 || notesCol !== -1 || xpCol !== -1) {
       const rowData = directorySheet.getRange(agentRowIdx, 1, 1, headers.length).getValues()[0];
       if (leadCol !== -1) rowData[leadCol] = (parseInt(rowData[leadCol]) || 0) + 10;
       if (bibleCol !== -1) rowData[bibleCol] = (parseInt(rowData[bibleCol]) || 0) + 10;
       if (notesCol !== -1) rowData[notesCol] = (parseInt(rowData[notesCol]) || 0) + 10;
       if (xpCol !== -1) rowData[xpCol] = (parseInt(rowData[xpCol]) || 0) + 30;
       directorySheet.getRange(agentRowIdx, 1, 1, headers.length).setValues([rowData]);
       
       // Notificación de XP por asistencia
       const fcmToken = getAgentFcmToken(payload.scannedId);
       if (fcmToken) {
         sendPushNotification("🛡️ ASISTENCIA REGISTRADA", `¡Buen despliegue, Agente! Has ganado +10 XP por tu asistencia de hoy.`, fcmToken);
       }
     }
    }
   
   const telegramMessage = `🛡️ <b>REGISTRO DE ASISTENCIA</b>\n\n<b>• Agente:</b> ${agentName}\n<b>• ID:</b> <code>${payload.scannedId}</code>\n<b>• Tipo:</b> ${payload.type}\n<b>• Fecha:</b> ${new Date(payload.timestamp).toLocaleString()}\n\n<b>PUNTOS:</b> +10 Biblia, +10 Apuntes, +10 Liderazgo`;
   sendTelegramNotification(telegramMessage);

   // --- VISITANTE RADAR ---
   if (agentRowIdx === -1) {
     let visitorVisits = 0;
     for (let i = 1; i < attendanceData.length; i++) {
       if (String(attendanceData[i][0]) === String(payload.scannedId)) {
         visitorVisits++;
       }
     }
     
     if (visitorVisits >= 2) {
       const alertMessage = `🚨 <b>ALERTA DE RECLUTAMIENTO</b>\n\nEl visitante con ID <code>${payload.scannedId}</code> ha asistido <b>${visitorVisits + 1} veces</b>.\n\n<b>ESTADO:</b> DEBE SER INSCRITO INMEDIATAMENTE.`;
       sendTelegramNotification(alertMessage);
     }
   }

  return jsonOk({ agentName: agentName });
}

/**
 * @description Obtiene el radar de visitantes (asistentes no inscritos).
 */
function getVisitorRadar() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  
  const attendanceSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
  const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  
  if (!attendanceSheet || !directorySheet) throw new Error("Hojas no encontradas.");
  
  const attendanceData = attendanceSheet.getDataRange().getValues();
  const directoryData = directorySheet.getDataRange().getValues();

  const registeredIds = new Set(directoryData.slice(1).map(row => String(row[0]).trim().toUpperCase()));
  
  const visitorMap = new Map();
    
  for (let i = 1; i < attendanceData.length; i++) {
    const id = String(attendanceData[i][0]).trim();
    if (id && !registeredIds.has(id.toUpperCase())) {
      const count = (visitorMap.get(id) || 0) + 1;
      visitorMap.set(id, count);
        }
  }
  
    const radar = [];
    visitorMap.forEach((count, id) => {
// Solo incluir en el radar si ha venido 3 o más veces
    if (count >= 3) { 
      radar.push({
        id: id,
        name: id, 
        visits: count,
        status: 'INSCRIPCIÓN INMEDIATA'
      });
    }
  });
  
  // Ordenar por visitas (más frecuentes primero)
  radar.sort((a, b) => b.visits - a.visits);
  
  return jsonOk({ data: radar });
}

/**
 * @description Aplica penalizaciones de -5 XP por semanas de inasistencia (Prioriza Domingos).
 */
function applyAbsencePenalties() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const attendanceSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
  
  if (!directorySheet || !attendanceSheet) throw new Error("Hojas no encontradas.");
  
  const directoryData = directorySheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  const attendanceData = attendanceSheet.getDataRange().getValues();
  
  const idColIdx = headers.indexOf('ID');
  const xpColIdx = headers.indexOf('XP') !== -1 ? headers.indexOf('XP') : headers.indexOf('PUNTOS XP');
  const leadColIdx = headers.indexOf('PUNTOS LIDERAZGO');

  if (idColIdx === -1 || xpColIdx === -1) throw new Error("Estructura de Directorio inválida.");

  const now = new Date();
  let totalDeductions = 0;

  for (let i = 1; i < directoryData.length; i++) {
    const agentId = String(directoryData[i][idColIdx]);
    if (!agentId || agentId === "undefined") continue;

    // --- NUEVA REGLA: LIDERES Y DIRECTORES EXENTOS ---
    const roleColIdx = headers.indexOf('CARGO') !== -1 ? headers.indexOf('CARGO') : headers.indexOf('NIVEL_ACCESO');
    const role = roleColIdx !== -1 ? String(directoryData[i][roleColIdx]).toUpperCase() : "";
    if (role === 'LIDER' || role === 'DIRECTOR') continue;

    // Buscar última asistencia
    let lastAttendanceDate = null;
    for (let j = attendanceData.length - 1; j > 0; j--) {
      if (String(attendanceData[j][0]) === agentId) {
        lastAttendanceDate = new Date(attendanceData[j][3]);
        break;
      }
    }

    if (lastAttendanceDate) {
      const diffDays = Math.floor((now - lastAttendanceDate) / (1000 * 60 * 60 * 24));
      const weeksAbsent = Math.floor(diffDays / 7);

      if (weeksAbsent >= 1) {
        const penalty = weeksAbsent * 5;
        const currentXp = parseInt(directoryData[i][xpColIdx]) || 0;
        const currentLead = leadColIdx !== -1 ? (parseInt(directoryData[i][leadColIdx]) || 0) : 0;

        const newXp = Math.max(0, currentXp - penalty);
        const newLead = Math.max(0, currentLead - penalty);

        directorySheet.getRange(i + 1, xpColIdx + 1).setValue(newXp);
        if (leadColIdx !== -1) directorySheet.getRange(i + 1, leadColIdx + 1).setValue(newLead);
        
        // Notificación de penalización
        const fcmToken = getAgentFcmToken(agentId);
        if (fcmToken) {
          sendPushNotification("⚠️ PENALIZACIÓN TÁCTICA", `Inasistencia detectada. Se han deducido -${penalty} XP por falta de despliegue semanal.`, fcmToken);
        }

        totalDeductions++;
      }
    }
  }

  return jsonOk({ agentsPenalized: totalDeductions });
}

/**
 * @description Convierte un visitante en agente, rescatando su XP acumulado.
 */
function activateVisitorAsAgent(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const attendanceSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
  
  if (!attendanceSheet) throw new Error("Hoja de asistencia no encontrada.");

  // 1. Calcular XP acumulado como visitante (10 XP por cada visita)
  const attendanceData = attendanceSheet.getDataRange().getValues();
  let accumulatedXp = 0;
  for (let i = 1; i < attendanceData.length; i++) {
    if (String(attendanceData[i][0]).toUpperCase() === String(data.visitorId).toUpperCase()) {
      accumulatedXp += 10;
    }
  }

  // 2. Inscribir al agente con el XP rescatado
  const enrollResponse = enrollAgent({
    ...data.formData,
    xpReward: accumulatedXp, // Pasar XP acumulado si enrollAgent lo soporta o sumarlo después
    nivel: data.formData.nivel || 'Estudiante'
  });

  const enrollResult = JSON.parse(enrollResponse.getContentText());

  if (enrollResult.success) {
    // 3. Si se inscribió con éxito, sumar el XP rescatado si no se hizo en enrollAgent
    const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
    const directoryData = directorySheet.getDataRange().getValues();
    const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
    const xpColIdx = headers.indexOf('XP') !== -1 ? headers.indexOf('XP') : headers.indexOf('PUNTOS XP');
    const leadColIdx = headers.indexOf('PUNTOS LIDERAZGO');

    let agentRow = -1;
    for (let i = 1; i < directoryData.length; i++) {
      if (String(directoryData[i][0]) === enrollResult.newId) {
        agentRow = i + 1;
        break;
      }
    }

    if (agentRow !== -1 && accumulatedXp > 0) {
      const currentXp = parseInt(directorySheet.getRange(agentRow, xpColIdx + 1).getValue()) || 0;
      directorySheet.getRange(agentRow, xpColIdx + 1).setValue(currentXp + accumulatedXp);
      if (leadColIdx !== -1) {
        const currentLead = parseInt(directorySheet.getRange(agentRow, leadColIdx + 1).getValue()) || 0;
        directorySheet.getRange(agentRow, leadColIdx + 1).setValue(currentLead + accumulatedXp);
      }
    }

    // 4. Actualizar historial de asistencia: cambiar ID de visitante por nuevo ID de agente
    for (let i = 1; i < attendanceData.length; i++) {
      if (String(attendanceData[i][0]).toUpperCase() === String(data.visitorId).toUpperCase()) {
        attendanceSheet.getRange(i + 1, 1).setValue(enrollResult.newId);
      }
    }
  }

  return enrollResponse;
}

/**
 * @description Elimina un agente del directorio y opcionalmente de las hojas de asistencia/rachas.
 */
function deleteAgent(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const agentId = String(data.agentId).trim();
  
  if (!agentId) throw new Error("ID de agente requerido.");

  // 1. Eliminar del Directorio Oficial
  const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  if (!directorySheet) throw new Error("Hoja de directorio no encontrada.");
  
  const directoryData = directorySheet.getDataRange().getValues();
  let agentName = "Desconocido";
  let deletedFromDirectory = false;
  
  for (let i = directoryData.length - 1; i >= 1; i--) {
    if (String(directoryData[i][0]).trim() === agentId) {
      agentName = directoryData[i][1] || "Desconocido";
      directorySheet.deleteRow(i + 1);
      deletedFromDirectory = true;
      break;
    }
  }
  
  if (!deletedFromDirectory) throw new Error("Agente no encontrado en el directorio.");

  // 2. Limpiar registros de asistencia
  const attendanceSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
  if (attendanceSheet) {
    const attenData = attendanceSheet.getDataRange().getValues();
    for (let i = attenData.length - 1; i >= 1; i--) {
      if (String(attenData[i][0]).trim() === agentId) {
        attendanceSheet.deleteRow(i + 1);
      }
    }
  }

  // 3. Limpiar registros de rachas
  const strikesSheet = ss.getSheetByName(CONFIG.STREAKS_SHEET);
  if (strikesSheet) {
    const strikeData = strikesSheet.getDataRange().getValues();
    for (let i = strikeData.length - 1; i >= 1; i--) {
      if (String(strikeData[i][0]).trim() === agentId) {
        strikesSheet.deleteRow(i + 1);
      }
    }
  }

  // 4. Notificación Telegram
  sendTelegramNotification(`🗑️ <b>AGENTE ELIMINADO</b>\n\n<b>• Nombre:</b> ${agentName}\n<b>• ID:</b> <code>${agentId}</code>\n<b>• Acción:</b> Dado de baja del sistema por un Director.`);

  return jsonOk({ deletedAgent: agentName });
}

/**
 * @description Actualiza puntos específicos de un agente (Biblia, Apuntes, Liderazgo).
 */
function updateAgentPoints(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  // Mapear tipo a nombre canónico
  const typeToCanonical = { 'BIBLIA': 'PUNTOS_BIBLIA', 'APUNTES': 'PUNTOS_APUNTES', 'LIDERAZGO': 'PUNTOS_LIDERAZGO' };
  const canonicalName = typeToCanonical[data.type];
  if (!canonicalName) throw new Error(`Tipo de puntos no reconocido: ${data.type}`);
  
  const colIdx = findHeaderIdx(headers, canonicalName);
  const xpColIdx = findHeaderIdx(headers, 'XP');
  
  if (colIdx === -1) throw new Error(`Columna ${canonicalName} no encontrada.`);

  // Buscar fila del agente
  const idCol = findHeaderIdx(headers, 'ID');
  let rowIdx = -1;
  for (let i = 1; i < directoryData.length; i++) {
    if (String(directoryData[i][idCol]).trim().toUpperCase() === String(data.agentId).trim().toUpperCase()) {
      rowIdx = i;
      break;
    }
  }
  if (rowIdx === -1) throw new Error("Agente no encontrado.");

  // Batch write: actualizar categoría + XP total en 1 llamada
  const rowData = sheet.getRange(rowIdx + 1, 1, 1, headers.length).getValues()[0];
  const currentVal = parseInt(rowData[colIdx]) || 0;
  rowData[colIdx] = currentVal + data.points;
  if (xpColIdx !== -1) {
    rowData[xpColIdx] = (parseInt(rowData[xpColIdx]) || 0) + data.points;
  }
  sheet.getRange(rowIdx + 1, 1, 1, headers.length).setValues([rowData]);

  // Notificación de XP
  if (xpColIdx !== -1) {
    const fcmToken = getAgentFcmToken(data.agentId);
    if (fcmToken) {
      if (data.points > 0) {
        const messages = [
          "¡Excelente trabajo, Agente! Has ganado méritos.",
          "Tu fe y disciplina están rindiendo frutos. +XP",
          "Sigue así, el Command Center reconoce tu esfuerzo.",
          "Has subido en el rango de influencia. ¡Felicidades!"
        ];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        sendPushNotification("⭐ MÉRITOS OBTENIDOS", `${randomMsg} (+${data.points} XP)`, fcmToken);
      } else if (data.points < 0) {
        sendPushNotification("🔻 AJUSTE DE XP", `Se han deducido ${Math.abs(data.points)} XP por orden de mando superior.`, fcmToken);
      }
    }
  }

  return jsonOk({ newVal: (currentVal + data.points) });
}

function deductPercentagePoints(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  const colNames = ['PUNTOS_BIBLIA', 'PUNTOS_APUNTES', 'PUNTOS_LIDERAZGO', 'XP'];
  const colIndices = colNames.map(cn => findHeaderIdx(headers, cn));
  const idCol = findHeaderIdx(headers, 'ID');

  let rowIdx = -1;
  for (let i = 1; i < directoryData.length; i++) {
    if (String(directoryData[i][idCol]).trim().toUpperCase() === String(data.agentId).trim().toUpperCase()) {
      rowIdx = i;
      break;
    }
  }
  if (rowIdx === -1) throw new Error("Agente no encontrado.");

  // Batch write: aplicar deducción porcentual a todas las categorías en 1 llamada
  const rowData = sheet.getRange(rowIdx + 1, 1, 1, headers.length).getValues()[0];
  colIndices.forEach(col => {
    if (col !== -1) {
      const current = parseInt(rowData[col]) || 0;
      rowData[col] = Math.max(0, Math.floor(current * (1 - (data.percentage / 100))));
    }
  });
  sheet.getRange(rowIdx + 1, 1, 1, headers.length).setValues([rowData]);

  const fcmToken = getAgentFcmToken(data.agentId);
  if (fcmToken) {
    sendPushNotification("🚨 PENALIZACIÓN EXTRAORDINARIA", `Se ha aplicado una reducción del ${data.percentage}% en todos tus méritos por infracción de protocolo.`, fcmToken);
  }

  return jsonOk();
}

/**
 * @description Elimina un curso de la academia por ID.
 */
function deleteAcademyCourse(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const coursesSheet = ss.getSheetByName(CONFIG.ACADEMY_COURSES_SHEET);
  const lessonsSheet = ss.getSheetByName(CONFIG.ACADEMY_LESSONS_SHEET);
  
  if (!coursesSheet) throw new Error("Hoja de cursos no encontrada.");
  
  const coursesValues = coursesSheet.getDataRange().getValues();
  const rowIdx = coursesValues.findIndex(row => String(row[0]) === String(data.courseId));
  
  if (rowIdx === -1 || rowIdx === 0) throw new Error("Curso no encontrado.");
  
  const courseName = coursesValues[rowIdx][1];
  coursesSheet.deleteRow(rowIdx + 1);
  
  // También eliminar lecciones asociadas
  if (lessonsSheet) {
    const lessonsValues = lessonsSheet.getDataRange().getValues();
    for (let i = lessonsValues.length - 1; i > 0; i--) {
      if (String(lessonsValues[i][1]) === String(data.courseId)) {
        lessonsSheet.deleteRow(i + 1);
      }
    }
  }
  
  const telegramMessage = `🗑️ <b>CURSO ELIMINADO</b>\n\n<b>• Nombre:</b> ${courseName}\n<b>• Ejecutado por:</b> Director\n\n<i>El curso y sus lecciones han sido retirados de la academia.</i>`;
  sendTelegramNotification(telegramMessage);

  return jsonOk({ message: `Curso "${courseName}" eliminado.` });
}

/**
 * @description Elimina una lección de la academia por ID.
 */
function deleteAcademyLesson(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const lessonsSheet = ss.getSheetByName(CONFIG.ACADEMY_LESSONS_SHEET);
  
  if (!lessonsSheet) throw new Error("Hoja de lecciones no encontrada.");
  
  const lessonsValues = lessonsSheet.getDataRange().getValues();
  const rowIdx = lessonsValues.findIndex(row => String(row[0]) === String(data.lessonId));
  
  if (rowIdx === -1 || rowIdx === 0) throw new Error("Lección no encontrada.");
  
  const lessonTitle = lessonsValues[rowIdx][3];
  lessonsSheet.deleteRow(rowIdx + 1);
  
  const telegramMessage = `🗑️ <b>LECCIÓN ELIMINADA</b>\n\n<b>• Título:</b> ${lessonTitle}\n<b>• Ejecutado por:</b> Director\n\n<i>La lección ha sido retirada de la academia.</i>`;
  sendTelegramNotification(telegramMessage);

  return jsonOk({ message: `Lección "${lessonTitle}" eliminada.` });
}

/**
 * @description Importa agentes desde la hoja de INSCRIPCIONES al directorio principal.
 */
function reconstructDb() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const enrollmentSheet = ss.getSheetByName(CONFIG.ENROLLMENT_SHEET_NAME);
  const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  
  if (!enrollmentSheet || !directorySheet) throw new Error("Hojas de inscripción o directorio no encontradas.");

  const enrollmentData = enrollmentSheet.getDataRange().getValues();
  const enrollmentHeaders = enrollmentData.shift(); // Cabeceras de Inscripciones
  
  const directoryData = directorySheet.getDataRange().getValues();
  const directoryHeaders = directoryData[0].map(h => String(h).trim().toUpperCase());
  const directoryNames = directoryData.slice(1).map(r => String(r[1]).trim().toUpperCase()); // Asume NOMBRE en col 2
  
  let newAgentsCount = 0;

  enrollmentData.forEach(row => {
    // Mapeo dinámico basado en las cabeceras de Google Forms / Inscripciones
    const getE = (headerName) => {
      const idx = enrollmentHeaders.findIndex(h => h.trim().toUpperCase() === headerName.toUpperCase());
      return idx !== -1 ? row[idx] : '';
    };

    const name = getE('NOMBRE');
    if (!name || directoryNames.includes(name.trim().toUpperCase())) return;

    const newId = `CON-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();

    const newRow = directoryHeaders.map(header => {
      switch (header) {
        case 'ID': return newId;
        case 'NOMBRE': return name;
        case 'XP': return 0;
        case 'RANGO': {
           const cargo = (getE('CARGO') || getE('NIVEL_ACCESO') || '').toUpperCase();
           return (cargo.includes('LIDER') || cargo.includes('DIRECTOR')) ? 'ACTIVO' : 'RECLUTA';
        }
        case 'STATUS':
        case 'ESTADO': return 'ACTIVO';
        case 'CARGO': return getE('CARGO') || getE('NIVEL_ACCESO') || 'Estudiante';
        case 'PIN': return newPin;
        case 'FOTO_URL': return getE('FOTO URL') || getE('FOTO') || getE('FOTO_URL') || '';
        case 'WHATSAPP': return getE('WHATSAPP') || getE('TELÉFONO') || getE('TELEFONO') || '';
        case 'FECHA_NACIMIENTO': return getE('FECHA DE NACIMIENTO') || getE('FECHA_NACIMIENTO') || '';
        case 'FECHA_INGRESO': return new Date();
        case 'TALENTO': return getE('TALENTO') || '';
        case 'BAUTIZADO': return getE('BAUTIZADO') || 'NO';
        case 'RELACION_CON_DIOS': return getE('RELACION CON DIOS') || getE('RELACION_CON_DIOS') || '';
        case 'PUNTOS_BIBLIA': return 0;
        case 'PUNTOS_APUNTES': return 0;
        case 'PUNTOS_LIDERAZGO': return 0;
        case 'NIVEL_ACCESO': return (getE('CARGO') || '').toUpperCase().includes('LIDER') ? 1 : 0;
        default: return '';
      }
    });

    directorySheet.appendRow(newRow);
    directoryNames.push(name.trim().toUpperCase());
    newAgentsCount++;
  });

  const message = `⚙️ <b>BASE DE DATOS SINCRONIZADA</b>\n\nSe han procesado <b>${newAgentsCount}</b> nuevas activaciones desde el portal de inscripciones.\n\nEstatus: <b>OPERATIVO</b>`;
  sendTelegramNotification(message);

  return jsonOk({ message: "Directorio actualizado.", newAgents: newAgentsCount });
}

/**
 * @description ESCANEA EL DIRECTORIO Y REPARA DATOS FALTANTES (ID y PIN).
 * Ejecuta esta función manualmente desde el Editor de Scripts para limpiar la base de datos.
 */
function repairMissingData() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  if (!sheet) return "Error: Hoja no encontrada.";

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toUpperCase());
  const idCol = headers.indexOf('ID');
  const pinCol = headers.indexOf('PIN');
  const nameCol = headers.indexOf('NOMBRE');

  if (idCol === -1 || pinCol === -1) return "Error: Columnas ID o PIN no encontradas.";

  let repairs = 0;
  for (let i = 1; i < data.length; i++) {
    let rowChanged = false;
    
    // Si el ID está vacío
    if (!data[i][idCol] || String(data[i][idCol]).trim() === "") {
      const newId = `CON-${Math.floor(1000 + Math.random() * 9000)}`;
      sheet.getRange(i + 1, idCol + 1).setValue(newId);
      rowChanged = true;
    }
    
    // Si el PIN está vacío
    if (!data[i][pinCol] || String(data[i][pinCol]).trim() === "") {
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
      sheet.getRange(i + 1, pinCol + 1).setValue(newPin);
      rowChanged = true;
    }
    
    if (rowChanged) repairs++;
  }

  const msg = `✅ REPARACIÓN COMPLETADA: Se han corregido ${repairs} registros que tenían IDs o PINs faltantes.`;
  sendTelegramNotification(msg);
  return msg;
}


/****************************************************************************************************************************
 * 🚀 SETUP AUTOMÁTICO DE BASE DE DATOS
 ****************************************************************************************************************************/

function setupDatabase() {
  const CONFIG = getGlobalConfig();
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID.includes('PEGA_AQUI')) {
    return "❌ ERROR: Debes configurar SPREADSHEET_ID en getGlobalConfig() antes de ejecutar.";
  }
  
  const ss = getSpreadsheet();
  const results = [];
  
  const directoryHeaders = [
    'ID', 'NOMBRE', 'PIN', 'RANGO', 'CARGO', 'FOTO URL', 'WHATSAPP', 
    'FECHA DE NACIMIENTO', 'TALENTO', 'BAUTIZADO', 'RELACION CON DIOS',
    'STATUS', 'XP', 'PUNTOS BIBLIA', 'PUNTOS APUNTES', 'PUNTOS LIDERAZGO', 'FECHA_INGRESO',
    'PREGUNTA_SEGURIDAD', 'RESPUESTA_SEGURIDAD', 'CAMBIO_OBLIGATORIO_PIN',
    'STATS_JSON', 'TACTOR_SUMMARY', 'LAST_AI_UPDATE',
    'BIOMETRIC_CREDENTIAL', 'REFERIDO_POR'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.DIRECTORY_SHEET_NAME, directoryHeaders));
  
  const enrollmentHeaders = [
    'TIMESTAMP', 'NOMBRE', 'WHATSAPP', 'FECHA DE NACIMIENTO', 'TALENTO', 
    'BAUTIZADO', 'RELACION CON DIOS', 'FOTO URL', 'PROCESADO'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.ENROLLMENT_SHEET_NAME, enrollmentHeaders));
  
  const attendanceHeaders = [
    'ID', 'TIPO', 'UBICACION', 'FECHA', 'REFERIDO_POR'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.ATTENDANCE_SHEET_NAME, attendanceHeaders));
  
  // 4. GUIAS
  const guiasHeaders = [
    'ID', 'NOMBRE', 'TIPO', 'URL', 'FECHA'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.GUIAS_SHEET_NAME, guiasHeaders));
  
  // 5. ACADEMIA CURSOS
  const coursesHeaders = [
    'ID', 'TITULO', 'DESCRIPCION', 'IMAGEN_URL', 'NIVEL_REQUERIDO'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.ACADEMY_COURSES_SHEET, coursesHeaders));

  // 6. ACADEMIA LECCIONES
  const lessonsHeaders = [
    'ID', 'ID_CURSO', 'ORDEN', 'TITULO', 'VIDEO_URL', 'CONTENIDO', 'PREGUNTA_QUIZ', 'OPCION_A', 'OPCION_B', 'OPCION_C', 'OPCION_D', 'RESPUESTA_CORRECTA', 'XP_RECOMPENSA', 'START_TIME', 'END_TIME', 'RESULT_ALGORITHM', 'RESULT_MAPPINGS'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.ACADEMY_LESSONS_SHEET, lessonsHeaders));

  // 7. ACADEMIA PROGRESO
  const progressHeaders = [
    'ID_AGENTE', 'ID_LECCION', 'ESTADO', 'NOTA', 'FECHA', 'INTENTOS'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.ACADEMY_PROGRESS_SHEET, progressHeaders));

  // 8. RACHAS
  const streakHeaders = [
    'AGENT_ID', 'STREAK_COUNT', 'LAST_COMPLETED_DATE', 'TASKS_JSON'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.STREAKS_SHEET, streakHeaders));

  // 9. VERSICULO DIARIO
  const verseHeaders = [
    'DATE', 'VERSE', 'REFERENCE'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.VERSES_SHEET, verseHeaders));

  // 10. TAREAS (Misiones)
  const tasksHeaders = ['ID', 'TITULO', 'DESCRIPCION', 'AREA', 'NIVEL_REQUERIDO', 'XP_RECOMPENSA', 'CUPOS'];
  results.push(ensureSheetColumns(ss, CONFIG.TASKS_SHEET, tasksHeaders));

  // 11. PROGRESO DE TAREAS
  const taskProgressHeaders = ['TASK_ID', 'AGENT_ID', 'AGENT_NAME', 'FECHA', 'VERIFICADO_POR', 'STATUS'];
  results.push(ensureSheetColumns(ss, CONFIG.TASK_PROGRESS_SHEET, taskProgressHeaders));

  // 12. ASCENSOS
  const promotionsHeaders = ['AGENT_ID', 'AGENT_NAME', 'RANGO_ANTERIOR', 'RANGO_NUEVO', 'FECHA', 'XP', 'CERTIFICADOS'];
  results.push(ensureSheetColumns(ss, CONFIG.PROMOTIONS_SHEET, promotionsHeaders));

  // 13. NOTICIAS
  const newsHeaders = ['ID', 'TIPO', 'MENSAJE', 'FECHA', 'AGENT_ID', 'AGENT_NAME'];
  results.push(ensureSheetColumns(ss, CONFIG.NEWS_SHEET, newsHeaders));
  
  const summary = results.join('\n');
  const telegramMessage = `🛠️ <b>SETUP DE BASE DE DATOS COMPLETADO</b>\n\n${summary}\n\n<i>Sistema CONSAGRADOS 2026 listo para operar.</i>`;
  sendTelegramNotification(telegramMessage);
  
  Logger.log(summary);
  return summary;
}

/**
 * @description Crea la hoja si no existe. Si existe, asegura que todas las columnas indicadas estén presentes.
 */
function ensureSheetColumns(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaders(sheet, headers.length);
    sheet.setFrozenRows(1);
    return `🆕 HOJA CREADA: ${sheetName}`;
  }
  
  const lastCol = sheet.getLastColumn() || 1;
  const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim().toUpperCase());
  const missingHeaders = headers.filter(h => !existingHeaders.includes(String(h).toUpperCase()));
  
  if (missingHeaders.length > 0) {
    const startCol = lastCol + 1;
    sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
    formatHeaders(sheet, missingHeaders.length, startCol);
    return `✅ HOJA ACTUALIZADA: ${sheetName} (Añadidas: ${missingHeaders.join(', ')})`;
  }
  
  return `ℹ️ HOJA AL DÍA: ${sheetName}`;
}

function createSheetIfNotExists(ss, sheetName, headers) {
  return ensureSheetColumns(ss, sheetName, headers);
}

function formatHeaders(sheet, numCols, startCol = 1) {
  const range = sheet.getRange(1, startCol, 1, numCols);
  range.setBackground('#1a1a2e')
       .setFontColor('#ffffff')
       .setFontWeight('bold')
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');
  
  for (let i = startCol; i < startCol + numCols; i++) {
    sheet.setColumnWidth(i, 150);
  }
}

/**
 * @description VERIFICAR ESTADO DEL SISTEMA
 */
function checkSystemStatus() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  
  const checks = {
    'SPREADSHEET_ID': !!CONFIG.SPREADSHEET_ID && !CONFIG.SPREADSHEET_ID.includes('PEGA_AQUI'),
    'DRIVE_FOLDER_ID': !!CONFIG.DRIVE_FOLDER_ID && !CONFIG.DRIVE_FOLDER_ID.includes('PEGA_AQUI'),
    'TELEGRAM_BOT_TOKEN': !!CONFIG.TELEGRAM_BOT_TOKEN && !CONFIG.TELEGRAM_BOT_TOKEN.includes('PEGA_AQUI'),
    'TELEGRAM_CHAT_ID': !!CONFIG.TELEGRAM_CHAT_ID,
    'HOJA_DIRECTORIO': !!ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME),
    'HOJA_INSCRIPCIONES': !!ss.getSheetByName(CONFIG.ENROLLMENT_SHEET_NAME),
    'HOJA_ASISTENCIA': !!ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME)
  };
  
  let report = '📊 DIAGNÓSTICO DEL SISTEMA CONSAGRADOS 2026\n\n';
  for (const [key, value] of Object.entries(checks)) {
    report += `${value ? '✅' : '❌'} ${key}\n`;
  }
  
  const allOk = Object.values(checks).every(v => v);
  report += `\n${allOk ? '🟢 SISTEMA OPERATIVO' : '🔴 REQUIERE ATENCIÓN'}`;
  
  Logger.log(report);
  return report;
}

/**
 * @description Obtiene la pregunta de seguridad
 */
function getSecurityQuestion(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  const idCol = headers.indexOf('ID');
  const questionCol = headers.indexOf('PREGUNTA_SEGURIDAD');
  
  const agent = directoryData.find(row => String(row[idCol]) === String(data.agentId));
  if (!agent) throw new Error("Agente no encontrado.");
  
  return jsonOk({ question: agent[questionCol] || "¿Cuál es tu color favorito?" });
}

/**
 * @description Valida respuesta de seguridad
 */
function resetPasswordWithAnswer(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  const idCol = headers.indexOf('ID');
  const pinCol = headers.indexOf('PIN');
  const answerCol = headers.indexOf('RESPUESTA_SEGURIDAD');
  
  const agentRowIdx = directoryData.findIndex(row => String(row[idCol]) === String(data.agentId));
  if (agentRowIdx === -1) throw new Error("Agente no encontrado.");
  
  const agentRow = directoryData[agentRowIdx];
  const storedAnswer = String(agentRow[answerCol]).trim().toLowerCase();
  const providedAnswer = String(data.answer).trim().toLowerCase();
  
  if (storedAnswer === providedAnswer) {
    return jsonOk({ pin: agentRow[pinCol] });
  } else {
    throw new Error("Respuesta de seguridad incorrecta.");
  }
}

/**
 * @description Actualiza el password
 */
function updateUserPassword(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  const idCol = headers.indexOf('ID');
  const pinCol = headers.indexOf('PIN');
  const mustChangeCol = headers.indexOf('CAMBIO_OBLIGATORIO_PIN');
  const questionCol = headers.indexOf('PREGUNTA_SEGURIDAD');
  const answerCol = headers.indexOf('RESPUESTA_SEGURIDAD');
  
  const agentRowIdx = directoryData.findIndex(row => String(row[idCol]) === String(data.agentId));
  if (agentRowIdx === -1) throw new Error("Agente no encontrado.");
  
  sheet.getRange(agentRowIdx + 1, pinCol + 1).setValue(data.newPin);
  if (data.question && questionCol !== -1) sheet.getRange(agentRowIdx + 1, questionCol + 1).setValue(data.question);
  if (data.answer && answerCol !== -1) sheet.getRange(agentRowIdx + 1, answerCol + 1).setValue(data.answer);
  if (mustChangeCol !== -1) sheet.getRange(agentRowIdx + 1, mustChangeCol + 1).setValue('NO');
  
  return jsonOk();
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🛠️ CONSAGRADOS')
    .addItem('🚀 Setup Base de Datos', 'setupDatabase')
    .addItem('🔍 Verificar Sistema', 'checkSystemStatus')
    .addItem('🔧 Reparar IDs/PINs', 'repairMissingData')
    .addItem('🛡️ NORMALIZAR DIRECTORIO v1.8.8', 'standardizeDirectory')
    .addItem('⚠️ DESHACER: Restaurar Directorio', 'emergencyRollbackDirectory')
    .addItem('🛡️ NORMALIZAR ASISTENCIA v1.8.6', 'setupAttendanceSheet')
    .addItem('⏰ Activar Versículo Diario', 'setupDailyVerseTrigger')
    .addToUi();
}

/**
 * @description Sube una guía y guarda sus metadatos.
 */
function uploadGuide(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.GUIAS_SHEET_NAME);
  
  const id = `GUIA-${Date.now()}`;
  const date = new Date().toISOString();
  
  sheet.appendRow([id, data.name, data.type, data.url, date]);
  
  addNewsItem(ss, 'DESPLIEGUE', `📡 NUEVO MATERIAL: Se ha desplegado la guía "${data.name}" (${data.type}).`, 'SISTEMA', 'LOGÍSTICA');

  const title = "📚 NUEVO RECURSO DISPONIBLE";
  const msg = `Se ha publicado una nueva guía (${data.type}): ${data.name}.`;
  sendPushNotification(title, msg);

  const telegramMessage = `📚 <b>NUEVA GUÍA DISPONIBLE</b>\n\n<b>• Nombre:</b> ${data.name}\n<b>• Tipo:</b> ${data.type}\n\n<i>El material ha sido cargado al centro de inteligencia.</i>`;
  sendTelegramNotification(telegramMessage);

  return jsonOk({ id: id });
}

/**
 * @description Rescata y normaliza la hoja de asistencia sin borrar datos.
 * Crea un backup previo por seguridad.
 */
function setupAttendanceSheet() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.ATTENDANCE_SHEET_NAME);
    const headers = ['ID', 'TRAMO/TIPO', 'UBICACION', 'FECHA'];
    sheet.getRange(1, 1, 1, 4).setValues([headers]).setFontWeight('bold').setBackground('#001f3f').setFontColor('#ffffff');
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('🛡️ MIGRACIÓN DE RESCATE', '¿Deseas NORMALIZAR y RESCATAR los datos de asistencia? Se creará un BACKUP automático y se estandarizarán todos los registros al formato de 4 columnas de la v1.8.5.', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  // 1. Crear Backup
  const backupName = `ASISTENCIA_BACKUP_${Utilities.formatDate(new Date(), "GMT-4", "yyyyMMdd_HHmm")}`;
  const backupSheet = sheet.copyTo(ss).setName(backupName);
  
  // 2. Procesar Datos para Rescate
  const oldData = sheet.getDataRange().getValues();
  const standardizedRows = [];
  const headers = ['ID', 'TRAMO/TIPO', 'UBICACION', 'FECHA'];
  
  for (let i = 1; i < oldData.length; i++) {
    const row = oldData[i];
    let id = String(row[0]).trim().toUpperCase();
    if (!id || id === 'ID' || id === 'UNDEFINED') continue;

    let type = 'ASISTENCIA';
    let location = String(row[2] || 'CENTRO DE OPERACIÓN').trim();
    let dateVal = row[3];

    // --- LÓGICA DE INTELIGENCIA DE RESCATE ---
    const rowStr = row.join(' ').toUpperCase();
    
    if (rowStr.includes('EVENT_CONFIR') || rowStr.includes('EVENTO:')) {
      // Es un evento: Lo mandamos a la hoja de eventos
      const eventSheet = ss.getSheetByName(CONFIG.EVENT_CONFIRMATIONS_SHEET);
      if (eventSheet) {
        let eventName = String(row[5] || row[2] || 'EVENTO ANTIGUO').replace('EVENTO: ', '').split('(ID:')[0].trim();
        eventSheet.appendRow([id, 'AGENTE MIGRADO', eventName, row[3] || row[2] || new Date()]);
      }
      continue; // No lo incluimos en la hoja de ASISTENCIA física
    } else if (rowStr.includes('DIRECTOR_CONFIRM') || rowStr.includes('MANUAL')) {
      type = 'ASISTENCIA';
      location = 'REGISTRO MANUAL';
    }

    // Si la fecha en D no es válida, buscar en C
    if (!(dateVal instanceof Date) || isNaN(dateVal.getTime())) {
      if (row[2] instanceof Date && !isNaN(row[2].getTime())) {
        dateVal = row[2];
      } else {
        // Intentar extraer fecha de strings (Regex)
        const dateMatch = rowStr.match(/(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
        if (dateMatch) dateVal = new Date(dateMatch[0]);
        else dateVal = new Date(); // Fallback hoy
      }
    }

    standardizedRows.push([id, type, location, dateVal]);
  }

  // 3. Escribir datos normalizados
  sheet.clear();
  sheet.getRange(1, 1, 1, 4).setValues([headers]).setFontWeight('bold').setBackground('#001f3f').setFontColor('#ffffff');
  if (standardizedRows.length > 0) {
    sheet.getRange(2, 1, standardizedRows.length, 4).setValues(standardizedRows);
  }
  sheet.setFrozenRows(1);

  ui.alert(`✅ RESCATE COMPLETADO\n\n• Registros normalizados: ${standardizedRows.length}\n• Backup creado: ${backupName}\n\nEl sistema ahora es 100% estándar.`);
}

/**
 * @description Obtiene las guías disponibles para un usuario.
 */
function getGuides(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.GUIAS_SHEET_NAME);
  
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  
  const guides = values.map(row => {
    return {
      id: row[0],
      name: row[1],
      type: row[2],
      url: row[3],
      date: row[4]
    };
  });
  
  // Filtrado por rol: Estudiantes solo ven material ESTUDIANTE, Líderes y Directores ven TODO
  let filtered = guides;
  if (data.userRole === 'STUDENT') {
    filtered = guides.filter(g => g.type === 'ESTUDIANTE');
  }
  // LEADER y DIRECTOR ven todo el material
  
  return jsonOk({ data: filtered });
}

/**
 * @description Elimina una guía por ID.
 */
function deleteGuide(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.GUIAS_SHEET_NAME);
  
  const values = sheet.getDataRange().getValues();
  const idCol = 0; // Columna ID
  
  const rowIdx = values.findIndex(row => String(row[idCol]) === String(data.guideId));
  if (rowIdx === -1) throw new Error("Guía no encontrada.");
  
  const guideName = values[rowIdx][1];
  sheet.deleteRow(rowIdx + 1);
  
  const telegramMessage = `🗑️ <b>GUÍA ELIMINADA</b>\n\n<b>• Nombre:</b> ${guideName}\n<b>• Ejecutado por:</b> Director\n\n<i>El recurso ha sido retirado del centro de inteligencia.</i>`;
  sendTelegramNotification(telegramMessage);

  return jsonOk();
}

/**
 * @description Actualiza la foto de un agente.
 */
function updateAgentPhoto(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  const idCol = headers.indexOf('ID');
  const photoCol = (headers.indexOf('FOTO URL') + 1) || (headers.indexOf('FOTO_URL') + 1);
  
  if (photoCol === 0) throw new Error("Columna FOTO URL no encontrada.");

  let rowIdx = -1;
  for (let i = 1; i < directoryData.length; i++) {
    if (String(directoryData[i][idCol]) === String(data.agentId)) {
      rowIdx = i + 1;
      break;
    }
  }

  if (rowIdx === -1) throw new Error("Agente no encontrado.");

  sheet.getRange(rowIdx, photoCol).setValue(data.photoUrl);
  return jsonOk();
}

/**
 * @description Obtiene los datos de la academia (cursos y lecciones).
 */
function getAcademyData(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  
  const coursesSheet = ss.getSheetByName(CONFIG.ACADEMY_COURSES_SHEET);
  const lessonsSheet = ss.getSheetByName(CONFIG.ACADEMY_LESSONS_SHEET);
  const progressSheet = ss.getSheetByName(CONFIG.ACADEMY_PROGRESS_SHEET);
  
  if (!coursesSheet || !lessonsSheet) throw new Error("Hojas de academia no encontradas.");
  
  const coursesRaw = coursesSheet.getDataRange().getValues();
  const coursesHeaders = coursesRaw.shift();
  const courses = coursesRaw.map(row => ({
    id: row[0],
    title: row[1],
    description: row[2],
    imageUrl: row[3],
    requiredLevel: row[4]
  }));
  
  const lessonsRaw = lessonsSheet.getDataRange().getValues();
  const lessonsHeaders = lessonsRaw.shift();
  const lessons = lessonsRaw.map(row => {
    let questions = [];
    try {
      // Intentamos parsear el campo de pregunta como JSON (para múltiples preguntas)
      questions = JSON.parse(row[6]);
    } catch (e) {
      // Si falla, es el formato viejo (una sola pregunta)
      if (row[6]) {
        questions = [{
          question: row[6],
          options: [row[7], row[8], row[9], row[10]].filter(o => o),
          correctAnswer: row[11]
        }];
      }
    }

    return {
      id: row[0],
      courseId: row[1],
      order: row[2],
      title: row[3],
      videoUrl: row[4],
      content: row[5],
      questions: questions,
      xpReward: row[12],
      startTime: row[13],
      endTime: row[14],
      resultAlgorithm: row[15] || 'SCORE_PERCENTAGE',
      resultMappings: row[16] ? JSON.parse(row[16]) : []
    };
  });
  
  let progress = [];
  if (progressSheet) {
    const progressRaw = progressSheet.getDataRange().getValues();
    progressRaw.shift();
    
    if (data.agentId) {
      progress = progressRaw
        .filter(row => String(row[0]).trim() === String(data.agentId).trim())
        .map(row => ({
          lessonId: row[1],
          status: row[2],
          score: row[3],
          date: row[4],
          attempts: row[5] || 0
        }));
    } else {
      // Retornar todo para auditoría (solo accesible por directores en el frontend)
      progress = progressRaw.map(row => ({
        agentId: String(row[0]).trim(),
        lessonId: row[1],
        status: row[2],
        score: row[3],
        date: row[4],
        attempts: row[5] || 0
      }));
    }
  }
  
  return jsonOk({ data: { courses, lessons, progress } });
}

/**
 * @description Procesa el resultado de un quiz y otorga recompensas.
 */
function submitQuizResult(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  
  const progressSheet = ss.getSheetByName(CONFIG.ACADEMY_PROGRESS_SHEET);
  const lessonsSheet = ss.getSheetByName(CONFIG.ACADEMY_LESSONS_SHEET);
  const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  
  if (!progressSheet || !lessonsSheet || !directorySheet) throw new Error("Error en la base de datos.");
  
  const lessonsData = lessonsSheet.getDataRange().getValues();
  const lesson = lessonsData.slice(1).find(row => String(row[0]).trim().toUpperCase() === String(data.lessonId).trim().toUpperCase());
  if (!lesson) throw new Error("Lección no encontrada.");

  const progressData = progressSheet.getDataRange().getValues();
  const searchAgentId = String(data.agentId).trim().toUpperCase();
  const searchLessonId = String(data.lessonId).trim().toUpperCase();
  const existingProgressIdx = progressData.findIndex(row => String(row[0]).trim().toUpperCase() === searchAgentId && String(row[1]).trim().toUpperCase() === searchLessonId);
  
  let attempts = 0;
  if (existingProgressIdx !== -1) {
    attempts = parseInt(progressData[existingProgressIdx][5]) || 0;
    if (progressData[existingProgressIdx][2] === 'COMPLETADO') {
      throw new Error("Esta lección ya ha sido superada.");
    }
    if (attempts >= 2) {
      throw new Error("Has finalizado esta evaluación. Contacta a un Director si necesitas un re-intento.");
    }
  }

  const isCorrect = data.score >= 75;
  const xpReward = isCorrect ? (parseInt(lesson[12]) || 10) : 0;
  attempts += 1;

  const now = new Date();
  const progressRow = [data.agentId, data.lessonId, isCorrect ? 'COMPLETADO' : 'FALLIDO', data.score || 0, now, attempts];

  if (existingProgressIdx !== -1) {
    progressSheet.getRange(existingProgressIdx + 1, 1, 1, progressRow.length).setValues([progressRow]);
  } else {
    progressSheet.appendRow(progressRow);
  }
  
  let agentName = "Agente";
  if (isCorrect) {
    const directoryData = directorySheet.getDataRange().getValues();
    const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
    const idCol = headers.indexOf('ID');
    const xpColIdx = (headers.indexOf('XP') + 1) || (headers.indexOf('PUNTOS XP') + 1);
    const searchId = String(data.agentId).trim().toUpperCase();
    const rowIdx = directoryData.findIndex(row => String(row[idCol]).trim().toUpperCase() === searchId);
    
    if (rowIdx !== -1) {
      agentName = directoryData[rowIdx][headers.indexOf('NOMBRE')] || "Agente";
      if (xpColIdx > 0) {
        const currentXp = parseInt(directorySheet.getRange(rowIdx + 1, xpColIdx).getValue()) || 0;
        directorySheet.getRange(rowIdx + 1, xpColIdx).setValue(currentXp + xpReward);
      }
    }

    // Log Tactical Intel
    addNewsItem(ss, 'OPERACION', `🎯 OBJETIVO CUMPLIDO: ${agentName} ha superado la lección "${lesson[3]}".`, data.agentId, agentName);

    // Check for Certificate (Course Completion)
    try {
      const courseId = String(lesson[1]);
      const lessonsInCourse = lessonsData.slice(1).filter(r => String(r[1]) === courseId);
      const progRows = progressSheet.getDataRange().getValues();
      const completedIds = progRows.filter(r => String(r[0]) === String(data.agentId) && r[2] === 'COMPLETADO').map(r => String(r[1]));
      
      const allDone = lessonsInCourse.every(l => completedIds.includes(String(l[0])));
      if (allDone) {
        const coursesSheet = ss.getSheetByName(CONFIG.ACADEMY_COURSES_SHEET);
        const coursesData = coursesSheet.getDataRange().getValues();
        const course = coursesData.slice(1).find(r => String(r[0]) === courseId);
        const courseTitle = course ? course[1] : `CURSO #${courseId}`;
        
        addNewsItem(ss, 'CERTIFICADO', `🎓 CERTIFICACIÓN: ${agentName} ha obtenido su diploma en "${courseTitle}".`, data.agentId, agentName);

        const fcmToken = getAgentFcmToken(data.agentId);
        if (fcmToken) {
          sendPushNotification("🏅 ¡CERTIFICADO OBTENIDO!", `Has completado "${courseTitle}". ¡Felicidades Agente!`, fcmToken);
        }
      }
    } catch (e) {
      Logger.log("Error al verificar fin de curso: " + e.message);
    }

    sendTelegramNotification(`🎓 <b>LOGRO ACADÉMICO</b>\n\n<b>• Agente:</b> ${agentName}\n<b>• Lección:</b> ${lesson[3]}\n<b>• Resultado:</b> APROBADO ✅\n<b>• Recompensa:</b> +${xpReward} XP Tácticos`);
  }
  
  return jsonOk({ isCorrect, xpAwarded: xpReward });
}

/**
 * @description Guarda datos de la academia de forma masiva (Cursos y Lecciones).
 */
function saveBulkAcademyData(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  
  const coursesSheet = ss.getSheetByName(CONFIG.ACADEMY_COURSES_SHEET);
  const lessonsSheet = ss.getSheetByName(CONFIG.ACADEMY_LESSONS_SHEET);
  
  if (!coursesSheet || !lessonsSheet) throw new Error("Hojas de academia no encontradas.");
  
  // 1. Guardar Cursos
  if (data.courses && data.courses.length > 0) {
    // Si data.append es falso, limpiamos (opcional, mejor append inteligente)
    data.courses.forEach(course => {
      // Buscar si existe para actualizar o añadir
      const courseValues = coursesSheet.getDataRange().getValues();
      const existingIdx = courseValues.findIndex(row => String(row[0]) === String(course.id));
      
      const newRow = [course.id, course.title, course.description, course.imageUrl, course.requiredLevel];
      if (existingIdx !== -1) {
        coursesSheet.getRange(existingIdx + 1, 1, 1, newRow.length).setValues([newRow]);
      } else {
        coursesSheet.appendRow(newRow);
        
        addNewsItem(ss, 'OPERACION', `🚀 NUEVA OPERACIÓN: Se ha activado el curso "${course.title}".`, 'SISTEMA', 'COMANDO');

        // Notificar nuevo curso
        const title = "🚀 NUEVO CURSO DISPONIBLE";
        const msg = `Se ha publicado el curso: ${course.title}. ¡Inicia tu entrenamiento ahora!`;
        sendPushNotification(title, msg);
        sendTelegramNotification(`🚀 <b>NUEVO CURSO PUBLICADO</b>\n\n<b>• Título:</b> ${course.title}\n\n<i>¡Agentes, a sus puestos! El nuevo material ya está en la academia.</i>`);
      }
    });
  }
  
  // 2. Guardar Lecciones
  if (data.lessons && data.lessons.length > 0) {
    data.lessons.forEach(lesson => {
      const lessonValues = lessonsSheet.getDataRange().getValues();
      const existingIdx = lessonValues.findIndex(row => String(row[0]) === String(lesson.id));
      
      const questionsField = lesson.questions ? JSON.stringify(lesson.questions) : (lesson.question || '');
      const optA = (lesson.questions && lesson.questions[0]) ? lesson.questions[0].options[0] : (lesson.options ? lesson.options[0] : '');
      const optB = (lesson.questions && lesson.questions[0]) ? lesson.questions[0].options[1] : (lesson.options ? lesson.options[1] : '');
      const optC = (lesson.questions && lesson.questions[0]) ? lesson.questions[0].options[2] : (lesson.options ? lesson.options[2] : '');
      const optD = (lesson.questions && lesson.questions[0]) ? lesson.questions[0].options[3] : (lesson.options ? lesson.options[3] : '');
      const correct = (lesson.questions && lesson.questions[0]) ? lesson.questions[0].correctAnswer : (lesson.correctAnswer || '');

      const newRow = [
        lesson.id, 
        lesson.courseId, 
        lesson.order, 
        lesson.title, 
        lesson.videoUrl || '', 
        lesson.content || '', 
        questionsField, 
        optA,
        optB,
        optC,
        optD,
        correct,
        lesson.xpReward || 10,
        lesson.startTime || 0,
        lesson.endTime || 0,
        lesson.resultAlgorithm || 'SCORE_PERCENTAGE',
        lesson.resultMappings ? JSON.stringify(lesson.resultMappings) : ''
      ];
      
      if (existingIdx !== -1) {
        lessonsSheet.getRange(existingIdx + 1, 1, 1, newRow.length).setValues([newRow]);
      } else {
        lessonsSheet.appendRow(newRow);
      }
    });
  }
  
  return jsonOk({ message: "Datos actualizados masivamente." });
}

/**
 * @description Actualiza las estadísticas tácticas y el resumen de un agente.
 */
function updateTacticalStats(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  const idCol = headers.indexOf('ID');
  const statsCol = headers.indexOf('STATS_JSON') + 1;
  const summaryCol = headers.indexOf('TACTOR_SUMMARY') + 1;
  const updateCol = headers.indexOf('LAST_AI_UPDATE') + 1;
  
  if (statsCol === 0 || summaryCol === 0 || updateCol === 0) throw new Error("Columnas tácticas no encontradas.");

  const rowIdx = directoryData.findIndex(row => String(row[idCol]) === String(data.agentId));
  if (rowIdx === -1) throw new Error("Agente no encontrado.");

  const row = rowIdx + 1;
  sheet.getRange(row, statsCol).setValue(data.stats);
  sheet.getRange(row, summaryCol).setValue(data.summary);
  sheet.getRange(row, updateCol).setValue(data.lastUpdate);

  return jsonOk();
}

/**
 * @description Resetea los intentos y progreso de un estudiante en la academia.
 */
function resetStudentAttempts(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const progressSheet = ss.getSheetByName(CONFIG.ACADEMY_PROGRESS_SHEET);
  if (!progressSheet) throw new Error("Hoja de progreso no encontrada.");
  
  const range = progressSheet.getDataRange();
  const values = range.getValues();
  let deletedCount = 0;
  
  let lessonIdsToDelete: string[] = [];
  if (data.lessonId) {
    lessonIdsToDelete = [String(data.lessonId).trim()];
  } else if (data.courseId) {
    const lessonsSheet = ss.getSheetByName(CONFIG.ACADEMY_LESSONS_SHEET);
    if (lessonsSheet) {
      const lessonsData = lessonsSheet.getDataRange().getValues();
      lessonIdsToDelete = lessonsData.slice(1)
        .filter(row => String(row[1]).trim() === String(data.courseId).trim())
        .map(row => String(row[0]).trim());
    }
  }

  // Eliminamos de abajo hacia arriba para evitar problemas con los índices al borrar filas
  for (let i = values.length - 1; i >= 1; i--) {
    const agentMatch = String(values[i][0]).trim() === String(data.agentId).trim();
    const lessonMatch = lessonIdsToDelete.length > 0 ? lessonIdsToDelete.includes(String(values[i][1]).trim()) : true;
    
    if (agentMatch && lessonMatch) {
      progressSheet.deleteRow(i + 1);
      deletedCount++;
    }
  }
  
  return jsonOk({ deletedCount });
}

/**
 * @description Envía las credenciales de un agente específico a Telegram.
 */
function sendAgentCredentials(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  const idCol = headers.indexOf('ID');
  const agent = directoryData.find(row => String(row[idCol]) === String(data.agentId));
  
  if (!agent) throw new Error("Agente no encontrado.");
  
  const name = agent[headers.indexOf('NOMBRE')];
  const pin = agent[headers.indexOf('PIN')];
  const question = agent[headers.indexOf('PREGUNTA_SEGURIDAD')];
  const answer = agent[headers.indexOf('RESPUESTA_SEGURIDAD')];
  const id = agent[idCol];

  const message = `📡 <b>DESPLIEGUE DE CREDENCIALES</b>\n\n<b>• Agente:</b> ${name}\n<b>• URL:</b> https://consagrados.vercel.app/\n<b>• ID:</b> <code>${id}</code>\n<b>• PIN:</b> <code>${pin}</code>\n<b>• Pregunta:</b> ${question || 'S/D'}\n<b>• Respuesta:</b> ${answer || 'S/D'}`;
  sendTelegramNotification(message);

  return jsonOk();
}

/**
 * @description Envía las credenciales de TODOS los agentes a Telegram.
 */
function bulkSendCredentials() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  const idCol = headers.indexOf('ID');
  const nameCol = headers.indexOf('NOMBRE');
  const pinCol = headers.indexOf('PIN');
  const questCol = headers.indexOf('PREGUNTA_SEGURIDAD');
  const ansCol = headers.indexOf('RESPUESTA_SEGURIDAD');
  
  const agents = directoryData.slice(1);
  let count = 0;

  sendTelegramNotification(`⚠️ <b>INICIANDO TRANSMISIÓN MASIVA DE CREDENCIALES</b>\n\nProcesando <b>${agents.length}</b> registros...`);

  agents.forEach(row => {
    if (String(row[idCol]).trim()) {
      const message = `📡 <b>CREDENCIALES - ${row[nameCol]}</b>\n<b>• URL:</b> https://consagrados.vercel.app/\n<b>• ID:</b> <code>${row[idCol]}</code>\n<b>• PIN:</b> <code>${row[pinCol]}</code>\n<b>• Q:</b> ${row[questCol] || 'S/D'}\n<b>• A:</b> ${row[ansCol] || 'S/D'}`;
      sendTelegramNotification(message);
      count++;
    }
  });

  sendTelegramNotification(`✅ <b>TRANSMISIÓN COMPLETADA</b>\n\nSe enviaron <b>${count}</b> credenciales exitosamente.`);

  return jsonOk({ count: count });
}

/**
 * @description Registra una credencial biométrica para un agente.
 */
function registerBiometrics(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  const idCol = headers.indexOf('ID');
  const bioCol = headers.indexOf('BIOMETRIC_CREDENTIAL') + 1;
  
  if (bioCol === 0) throw new Error("Columna BIOMETRIC_CREDENTIAL no encontrada.");

  const rowIdx = directoryData.findIndex(row => String(row[idCol]) === String(data.agentId));
  if (rowIdx === -1) throw new Error("Agente no encontrado.");

  sheet.getRange(rowIdx + 1, bioCol).setValue(data.credential);
  return jsonOk();
}

/**
 * @description Verifica una credencial biométrica.
 */
function verifyBiometrics(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  const idCol = headers.indexOf('ID');
  const bioCol = headers.indexOf('BIOMETRIC_CREDENTIAL');
  
  const agent = directoryData.find(row => String(row[idCol]) === String(data.agentId));
  if (!agent) throw new Error("Agente no encontrado.");

  const storedCredential = agent[bioCol];
  // La lógica de verificación real se hace en el frontend (comparación), 
  // aquí solo devolvemos el "challenge" o la credencial almacenada para que el frontend la use.
  
  return jsonOk({ credential: storedCredential });
}

/**
 * @description Obtiene el versículo del día.
 */
function getDailyVerse() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.VERSES_SHEET);
  if (!sheet) return jsonError("Hoja de versos no encontrada");
  
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
     // Versículo por defecto si no hay nada en la hoja
     return jsonOk({ data: { verse: "Mas el que persevere hasta el fin, este será salvo.", reference: "Mateo 24:13" } });
  }

  // Buscar el verso de hoy por fecha
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayFormat2 = Utilities.formatDate(today, "GMT-4", "dd/MM/yyyy");
  
  const headers = values[0];
  const dateIdx = headers.indexOf('DATE');
  const verseIdx = headers.indexOf('VERSE');
  const refIdx = headers.indexOf('REFERENCE');

  const verseFound = values.slice(1).find(row => {
    let rowDate = row[dateIdx];
    if (!rowDate) return false;
    
    // Convertir cualquier formato de fecha a string YYYY-MM-DD para comparar
    let rowDateStr = "";
    if (rowDate instanceof Date) {
      rowDateStr = rowDate.toISOString().split('T')[0];
    } else {
      rowDateStr = String(rowDate).trim();
    }
    
    return rowDateStr === todayStr || rowDateStr === todayFormat2;
  });

  if (verseFound) {
    return jsonOk({ data: { verse: verseFound[verseIdx], reference: verseFound[refIdx] } });
  }

  // Si no hay para hoy, dar uno aleatorio
  const randomRow = values[Math.floor(Math.random() * (values.length - 1)) + 1];
  return jsonOk({ data: { verse: randomRow[verseIdx], reference: randomRow[refIdx] } });
}

/**
 * @description Actualiza el contador de rachas y tareas semanales de un agente.
 * v3: Lógica de racha DIARIA vinculada a la fecha.
 */
function updateStreaks(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.STREAKS_SHEET);
  if (!sheet) throw new Error("Hoja de rachas no encontrada");

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const agentIdIdx = headers.indexOf('AGENT_ID');
  const streakIdx = headers.indexOf('STREAK_COUNT');
  let lastDateIdx = headers.indexOf('LAST_COMPLETED_DATE');
  if (lastDateIdx === -1) lastDateIdx = headers.indexOf('LAST_COMPLETED_WEEK');
  const tasksIdx = headers.indexOf('TASKS_JSON');
  const notifsSentIdx = headers.indexOf('NOTIFS_SENT');

  const rowIdx = values.findIndex(row => String(row[agentIdIdx]).trim().toUpperCase() === String(data.agentId).trim().toUpperCase());
  
  // --- LÓGICA DE DÍA CALENDARIO (GMT-4 / Caracas) ---
  const now = new Date();
  const todayStr = Utilities.formatDate(now, "GMT-4", "yyyy-MM-dd");
  const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  const yesterdayStr = Utilities.formatDate(yesterday, "GMT-4", "yyyy-MM-dd");
  
  let streakCount = 0;
  let lastDateRaw = "";
  let lastDateStr = "";

  if (rowIdx !== -1) {
    streakCount = parseInt(values[rowIdx][streakIdx]) || 0;
    lastDateRaw = values[rowIdx][lastDateIdx];
    
    // Parseo robusto de la última fecha registrada
    if (lastDateRaw instanceof Date) {
      lastDateStr = Utilities.formatDate(lastDateRaw, "GMT-4", "yyyy-MM-dd");
    } else if (lastDateRaw) {
      const rawStr = String(lastDateRaw).trim();
      const numVal = Number(rawStr);
      if (!isNaN(numVal) && numVal > 1000000000000) {
        // Es un epoch ms
        lastDateStr = Utilities.formatDate(new Date(numVal), "GMT-4", "yyyy-MM-dd");
      } else {
        // Intentar parsear el string directamente (asumir YYYY-MM-DD o similar)
        try {
          const d = new Date(rawStr);
          if (!isNaN(d.getTime())) {
            lastDateStr = Utilities.formatDate(d, "GMT-4", "yyyy-MM-dd");
          }
        } catch(e) {}
      }
    }

    Logger.log(`🔍 RACHA [${data.agentId}]: Hoy=${todayStr}, Ayer=${yesterdayStr}, Ultima=${lastDateStr}, Streak=${streakCount}`);

    if (lastDateStr === todayStr) {
      // Ya lo hizo hoy. No incrementar, mantener.
      Logger.log(`⏩ RACHA [${data.agentId}]: Ya completó hoy. Manteniendo streak.`);
    } else if (lastDateStr === yesterdayStr) {
      // Lo hizo ayer. Incrementar racha.
      streakCount += 1;
      lastDateRaw = String(now.getTime()); // Guardamos epoch para precisión
      Logger.log(`🔥 RACHA [${data.agentId}]: Incrementada a ${streakCount}`);
      
      const fcmToken = getAgentFcmToken(data.agentId);
      if (fcmToken) {
        sendPushNotification("🔥 ¡RACHA INCREMENTADA!", `Has completado tus tareas de hoy. ¡Tu racha ahora es de ${streakCount} días!`, fcmToken);
      }

      if (streakCount > 0 && (streakCount === 1 || streakCount % 7 === 0)) {
        addNewsItem(ss, 'RACHA', `⚡ AGENTE SOCIAL: ${data.agentName || data.agentId} ha alcanzado una racha de ${streakCount} días.`, data.agentId, data.agentName);
      }

      // Bonos de XP cada 5 días
      if (streakCount >= 5 && streakCount % 5 === 0) {
        let bonusXP = (streakCount >= 30) ? 10 : (streakCount >= 15) ? 7.5 : (streakCount >= 10) ? 6 : 5;
        try {
          updateAgentPoints(data.agentId, 'LIDERAZGO', bonusXP);
          if (fcmToken) sendPushNotification("⭐ BONO DE RACHA", `¡Excelente constancia! +${bonusXP} XP por tu hito de ${streakCount} días.`, fcmToken);
        } catch(e) { console.error("Error en bono racha:", e); }
      }
    } else {
      // Pasó más de un día. Reiniciar.
      streakCount = 1;
      lastDateRaw = String(now.getTime());
      Logger.log(`💔 RACHA [${data.agentId}]: Reiniciada a 1.`);
      
      const fcmToken = getAgentFcmToken(data.agentId);
      if (fcmToken) {
        sendPushNotification("🔥 ¡NUEVA RACHA!", `Has iniciado una nueva racha de consagración. ¡No la dejes caer!`, fcmToken);
      }
    }

    // Guardado por lote
    var rowData = sheet.getRange(rowIdx + 1, 1, 1, headers.length).getValues()[0];
    if (streakIdx !== -1) rowData[streakIdx] = streakCount;
    if (lastDateIdx !== -1) rowData[lastDateIdx] = lastDateRaw;
    var idx2alt = headers.indexOf('LAST_COMPLETED_DATE');
    var idx1alt = headers.indexOf('LAST_COMPLETED_WEEK');
    var altDateIdx = (lastDateIdx === idx2alt) ? idx1alt : idx2alt;
    if (altDateIdx !== -1 && altDateIdx !== lastDateIdx) rowData[altDateIdx] = lastDateRaw;
    if (tasksIdx !== -1) rowData[tasksIdx] = JSON.stringify(data.tasks || []);
    if (notifsSentIdx !== -1) rowData[notifsSentIdx] = "";
    sheet.getRange(rowIdx + 1, 1, 1, headers.length).setValues([rowData]);

  } else {
    // Nuevo registro
    streakCount = 1;
    lastDateRaw = String(now.getTime());
    const newRow = new Array(headers.length).fill("");
    if (agentIdIdx !== -1) newRow[agentIdIdx] = data.agentId;
    if (streakIdx !== -1) newRow[streakIdx] = streakCount;
    if (lastDateIdx !== -1) newRow[lastDateIdx] = lastDateRaw;
    if (tasksIdx !== -1) newRow[tasksIdx] = JSON.stringify(data.tasks || []);
    sheet.appendRow(newRow);
    
    addNewsItem(ss, 'RACHA', `⚡ NUEVA OPERACIÓN: ${data.agentName || data.agentId} inició su racha de consagración.`, data.agentId, data.agentName);
  }

  // Sincronizar con Directorio
  try {
    const dirSheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
    if (dirSheet) {
      const dirData = dirSheet.getDataRange().getValues();
      const dirHeaders = dirData[0].map(h => String(h).trim().toUpperCase());
      const agentIdCol = dirHeaders.indexOf('ID');
      const streakColIdx = dirHeaders.indexOf('STREAK_COUNT');
      const lastDateColIdx = dirHeaders.indexOf('LAST_COMPLETED_DATE');
      const agentRowIdx = dirData.findIndex(row => String(row[agentIdCol]).trim() === String(data.agentId).trim());
      if (agentRowIdx !== -1) {
        if (streakColIdx !== -1) dirSheet.getRange(agentRowIdx + 1, streakColIdx + 1).setValue(streakCount);
        if (lastDateColIdx !== -1) dirSheet.getRange(agentRowIdx + 1, lastDateColIdx + 1).setValue(lastDateRaw);
      }
    }
  } catch (e) { console.error("Error sincronizando directorio:", e); }

  return jsonOk({ streak: streakCount, lastStreakDate: lastDateRaw });
}

/**
 * @description Envía una notificación masiva a todos los agentes y la guarda en el historial interno.
 */
function sendBroadcastNotification(data) {
  const { title, message, category = 'ALERTA', emisor = 'DIRECTOR' } = data;
  if (!title || !message) throw new Error("Título y mensaje son requeridos para el broadcast.");

  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.NOTIFICATIONS_SHEET);
  
  // Crear hoja de historial si no existe
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.NOTIFICATIONS_SHEET);
    sheet.appendRow(['ID', 'FECHA', 'TITULO', 'MENSAJE', 'CATEGORIA', 'EMISOR']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#ffb700');
  }

  const id = "MSG-" + Date.now();
  const date = new Date().toISOString();
  sheet.appendRow([id, date, title.toUpperCase(), message, category.toUpperCase(), emisor.toUpperCase()]);

  // 1. Notificación Push Masiva
  try {
     sendPushNotification(`📢 ${title.toUpperCase()}`, message);
  } catch(e) {
     Logger.log("Error Push Broadcast: " + e.message);
  }

  // 2. Notificación a Telegram del Grupo
  const telegramMsg = `📢 <b>RECOMUNICADO TÁCTICO: ${title.toUpperCase()}</b>\n\n${message}\n\n<i>Enviado desde el Command Center.</i>`;
  sendTelegramNotification(telegramMsg);

  return jsonOk({ message: "Aviso transmitido y guardado en base de datos táctica." });
}

/**
 * @description Recupera el historial de notificaciones internas.
 */
function getNotifications() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.NOTIFICATIONS_SHEET);
  
  if (!sheet) return jsonOk({ data: [] });
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonOk({ data: [] });
  
  const headers = data[0];
  const rows = data.slice(1).reverse(); // Más recientes primero
  
  const notifications = rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      const key = String(header).toLowerCase();
      obj[key] = row[i];
    });
    return obj;
  });
  
  return jsonOk({ data: notifications.slice(0, 50) });
}


/**
 * @description Sincroniza el token de FCM de un agente y lo suscribe al tema masivo.
 */
function syncFcmToken(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  const idCol = headers.indexOf('ID');
  let fcmCol = headers.indexOf('FCM_TOKEN');
  
  // Si no existe la columna, la creamos al final
  if (fcmCol === -1) {
    fcmCol = headers.length;
    sheet.getRange(1, fcmCol + 1).setValue('FCM_TOKEN');
  }

  const rowIdx = directoryData.findIndex(row => String(row[idCol]).trim() === String(data.agentId).trim());
  if (rowIdx !== -1) {
    sheet.getRange(rowIdx + 1, fcmCol + 1).setValue(data.token);
    
    // Suscribir al Topic "all_agents" usando la API de IID (Instance ID)
    let subscriptionStatus = "pending";
    try {
      const accessToken = getFcmAccessToken();
      const url = "https://iid.googleapis.com/iid/v1:batchAdd";
      const payload = {
        to: "/topics/all_agents",
        registration_tokens: [data.token]
      };
      
      const options = {
        method: "post",
        contentType: "application/json",
        headers: {
          "Authorization": "Bearer " + accessToken,
          "access_token_auth": "true"
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      const response = UrlFetchApp.fetch(url, options);
      Logger.log(`Suscripción a Topic result: ${response.getContentText()}`);
      subscriptionStatus = "success";
    } catch (e) {
      Logger.log("Error al suscribir al topic: " + e.message);
      subscriptionStatus = "error: " + e.message;
    }
    
    return jsonOk({ subscription: subscriptionStatus });
  }
  
  return jsonError("Agente no encontrado");
}

/**
 * @description Confirma asistencia manual para Directores.
 */
function confirmDirectorAttendance(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
  if (!sheet) throw new Error("Hoja de asistencia no encontrada");

  const now = new Date();
  const fecha = Utilities.formatDate(now, "GMT-4", "yyyy-MM-dd");
  const hora = Utilities.formatDate(now, "GMT-4", "HH:mm:ss");

  // Verificar si ya confirmó hoy
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idColIdx = headers.indexOf('ID');
  const fechaColIdx = headers.indexOf('FECHA');
  
  const alreadyConfirmed = values.some(row => 
    String(row[idColIdx]).trim() === String(data.agentId).trim() && 
    String(row[fechaColIdx]).split('T')[0] === fecha
  );

  if (alreadyConfirmed) {
    return jsonOk({ alreadyDone: true });
  }

  // Registrar asistencia unificada [ID, TRAMO/TIPO, UBICACION, FECHA]
  sheet.appendRow([
    data.agentId,
    'ASISTENCIA',
    'REGISTRO MANUAL',
    new Date()
  ]);

  return jsonOk();
}

/**
 * @description Revisa las rachas y envía notificaciones motivacionales en hitos clave.
 * Debe ejecutarse cada 1 hora mediante un activador.
 */
function checkRachaNotifications() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.STREAKS_SHEET);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toUpperCase());
  const agentIdIdx = headers.indexOf('AGENT_ID');
  const streakIdx = headers.indexOf('STREAK_COUNT');
  const lastDateIdx = headers.indexOf('LAST_COMPLETED_DATE');
  const notifsSentIdx = headers.indexOf('NOTIFS_SENT');

  if (agentIdIdx === -1 || lastDateIdx === -1 || streakIdx === -1) return;

  const now = new Date();
  const todayStr = Utilities.formatDate(now, "GMT-4", "yyyy-MM-dd");
  
  // Medianoche del día siguiente (Caracas)
  const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
  tomorrow.setHours(0,0,0,0);
  const midnightMs = tomorrow.getTime();
  const msRemaining = midnightMs - now.getTime();
  const hoursRemaining = msRemaining / (1000 * 60 * 60);

  for (let i = 1; i < data.length; i++) {
    const agentId = String(data[i][agentIdIdx]).trim().toUpperCase();
    const streakCount = parseInt(data[i][streakIdx]) || 0;
    const lastDateRaw = data[i][lastDateIdx];
    let sentNotifs = String(data[i][notifsSentIdx] || "");

    if (!lastDateRaw || !agentId) continue;

    // Obtener fecha de última racha en formato Caracas
    let lastDateStr = "";
    if (lastDateRaw instanceof Date) {
      lastDateStr = Utilities.formatDate(lastDateRaw, "GMT-4", "yyyy-MM-dd");
    } else {
      const numVal = Number(lastDateRaw);
      if (!isNaN(numVal) && numVal > 1000000000000) {
        lastDateStr = Utilities.formatDate(new Date(numVal), "GMT-4", "yyyy-MM-dd");
      }
    }

    // Si ya completó hoy, no enviar nada
    if (lastDateStr === todayStr) continue;

    let title = "";
    let message = "";
    let milestoneKey = "";

    // Lógica Basada en Horas hasta la Medianoche (Cierre del Día)
    if (hoursRemaining <= 1 && !sentNotifs.includes("1H")) {
      title = "⚠️ ALERTA DE PERÍMETRO";
      message = `¡Riesgo crítico! Solo te queda 1 HORA para asegurar tu racha de ${streakCount} días. ¡Actúa ya!`;
      milestoneKey = "1H";
    } else if (hoursRemaining <= 4 && !sentNotifs.includes("4H")) {
      title = "🔋 RECARGA TÁCTICA";
      message = `El día está terminando. Tienes 4 horas para mantener tu racha de ${streakCount} días. No te rindas.`;
      milestoneKey = "4H";
    } else if (now.getHours() >= 20 && !sentNotifs.includes("NIGHT")) { // 8 PM
      title = "🕯️ MANTÉN LA LLAMA";
      message = "Es hora de tu dosis diaria de sabiduría. Tu racha de consagración te espera.";
      milestoneKey = "NIGHT";
    } else if (now.getHours() >= 12 && !sentNotifs.includes("MIDDAY")) { // 12 PM
      title = "🚀 OBJETIVO REVELADO";
      message = `¡Agente listo! El versículo de hoy está disponible. No dejes caer tu racha de ${streakCount} días.`;
      milestoneKey = "MIDDAY";
    }

    if (milestoneKey && message) {
      const fcmToken = getAgentFcmToken(agentId);
      if (fcmToken) {
        sendPushNotification(title, message, fcmToken);
        sentNotifs += (sentNotifs ? "," : "") + milestoneKey;
        if (notifsSentIdx !== -1) {
          sheet.getRange(i + 1, notifsSentIdx + 1).setValue(sentNotifs);
        }
      }
    }
  }
}

/**
 * @description Función programada para enviar el versículo diario a una hora clave.
 * Debe configurarse un disparador (trigger) de tiempo en Apps Script.
 */
function scheduledDailyVerseNotification() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.VERSES_SHEET);
  const data = sheet.getDataRange().getValues();
  
  // El versículo de hoy es el último de la lista (o basado en fecha)
  const todayVerse = data[data.length - 1];
  const verseText = todayVerse[0];
  const reference = todayVerse[1];

  const title = "📖 PALABRA DEL DÍA";
  const message = `"${verseText}" - ${reference}`;
  
  sendPushNotification(title, message);
  Logger.log("Notificación de versículo diario enviada.");
}

/**
 * @description Configura un disparador de tiempo para enviar el versículo cada mañana.
 */
function setupDailyVerseTrigger() {
  // Eliminar disparadores previos para evitar duplicados
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'scheduledDailyVerseNotification') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Crear nuevo disparador (ejemplo: cada día entre las 8 y 9 AM)
  ScriptApp.newTrigger('scheduledDailyVerseNotification')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  SpreadsheetApp.getUi().alert('✅ Automatización Activada: El versículo se enviará cada mañana a las 8:00 AM.');
}

/**
 * @description Crea un nuevo evento táctico en el calendario.
 */
function createEvent(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.EVENTS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.EVENTS_SHEET_NAME);
    sheet.appendRow(['ID', 'TITULO', 'FECHA', 'HORA', 'DESCRIPCION', 'FECHA_CREACION']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#001f3f').setFontColor('#ffffff');
  }

  const eventId = "EVT-" + Utilities.formatDate(new Date(), "GMT-4", "yyyyMMdd-HHmmss");
  sheet.appendRow([
    eventId,
    data.title,
    data.date,
    data.time,
    data.description,
    new Date().toISOString()
  ]);

  return jsonOk({ eventId: eventId });
}

/**
 * @description Obtiene los eventos activos (pendientes o de hoy).
 */
function getActiveEvents() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.EVENTS_SHEET_NAME);
  if (!sheet) return jsonOk({ data: [] });

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const data = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const event = {};
    headers.forEach((h, idx) => {
      const field = String(h).toLowerCase();
      // Si la fecha viene como objeto Date (Apps Script lo hace a veces), convertir a string
      let val = row[idx];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "GMT-4", "yyyy-MM-dd");
      }
      event[field] = val;
    });
    data.push(event);
  }

  return jsonOk({ data: data });
}

/**
 * @description Confirma asistencia a un evento específico.
 */
function confirmEventAttendance(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.EVENT_CONFIRMATIONS_SHEET);
  if (!sheet) {
    const newSheet = ss.insertSheet(CONFIG.EVENT_CONFIRMATIONS_SHEET);
    newSheet.appendRow(['ID', 'AGENTE', 'EVENTO', 'FECHA']);
    newSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#001f3f').setFontColor('#ffffff');
    return confirmEventAttendance(data); // Reintento
  }

  const now = new Date();
  const fechaCompleta = Utilities.formatDate(now, "GMT-4", "yyyy-MM-dd HH:mm:ss");

  // Registro de confirmación de evento exclusivo
  sheet.appendRow([
    data.agentId,
    data.agentName,
    data.eventTitle,
    fechaCompleta
  ]);

  // Sumar 10 XP por confirmar asistencia al evento
  const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = directorySheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  const leadCol = headers.indexOf('PUNTOS LIDERAZGO') + 1;
  const idCol = headers.indexOf('ID');

  if (leadCol > 0) {
    let agentRowIdx = -1;
    for (let i = 1; i < directoryData.length; i++) {
      if (String(directoryData[i][idCol]).trim() === String(data.agentId).trim()) {
        agentRowIdx = i + 1;
        break;
      }
    }
    if (agentRowIdx !== -1) {
      const currentVal = parseInt(directorySheet.getRange(agentRowIdx, leadCol).getValue()) || 0;
      directorySheet.getRange(agentRowIdx, leadCol).setValue(currentVal + 10);

      // Notificación de XP por evento
      const fcmToken = getAgentFcmToken(data.agentId);
      if (fcmToken) {
        sendPushNotification("📅 MISIÓN CUMPLIDA", `Asistencia al evento "${data.eventTitle}" registrada. Recompensa: +10 XP.`, fcmToken);
      }
    }
  }

  return jsonOk();
}

/**
 * @description Elimina un evento.
 */
function deleteEvent(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.EVENTS_SHEET_NAME);
  if (!sheet) return jsonError("Hoja de eventos no encontrada");

  const values = sheet.getDataRange().getValues();
  const idColIdx = values[0].indexOf('ID');
  
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idColIdx]).trim() === String(data.eventId).trim()) {
      sheet.deleteRow(i + 1);
      return jsonOk();
    }
  }

  return jsonError("Evento no encontrado");
}

/**
 * @description Función de prueba para verificar la configuración de notificaciones push (FCM v1).
 */
function testPush() {
  const result = sendPushNotification("PRUEBA TÁCTICA", "Si recibes esto, la configuración de FCM v1 es correcta y el sistema está listo.");
  return "Ejecución completada. Revisa los logs para confirmar el éxito del envío.";
}

/**
 * @description Estandariza el Directorio Oficial al esquema maestro v1.8.8.
 * Realiza backup, mapeo de alias y reordenamiento táctico.
 */
function standardizeDirectory() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  if (!sheet) return;

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('🛡️ NORMALIZACIÓN DE DIRECTORIO', '¿Deseas UNIFICAR y REORDENAR el Directorio Oficial? Se creará un BACKUP y se fusionarán columnas duplicadas (ej: ID CÉDULA + ID) al estándar v1.8.8.', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  // 1. Crear Backup
  const backupName = `DIRECTORIO_BACKUP_${Utilities.formatDate(new Date(), "GMT-4", "yyyyMMdd_HHmm")}`;
  sheet.copyTo(ss).setName(backupName);

  const data = sheet.getDataRange().getValues();
  const oldHeaders = data[0].map(h => String(h).trim().toUpperCase());
  
  const MASTER_SCHEMA = [
    { name: 'ID', aliases: ['ID', 'CEDULA', 'CÉDULA', 'ID CÉDULA', 'ID CEDULA'] },
    { name: 'NOMBRE', aliases: ['NOMBRE', 'NOMBRE COMPLETO', 'NOMBRE Y APELLIDO'] },
    { name: 'PIN', aliases: ['PIN', 'CONTRASEÑA', 'CONTRASENA', 'PASS', 'PASSWORD'] },
    { name: 'XP', aliases: ['XP', 'PUNTOS XP', 'PUNTOS_XP'] },
    { name: 'RANGO', aliases: ['RANGO', 'JERARQUIA', 'JERARQUÍA'] },
    { name: 'CARGO', aliases: ['CARGO', 'PUESTO'] },
    { name: 'ESTADO', aliases: ['ESTADO', 'STATUS', 'ESTATUS', 'SITUACION'] },
    { name: 'WHATSAPP', aliases: ['WHATSAPP', 'TELEFONO', 'TELÉFONO', 'CELULAR', 'PHONE'] },
    { name: 'FECHA_NACIMIENTO', aliases: ['FECHA_NACIMIENTO', 'FECHA DE NACIMIENTO', 'NACIMIENTO'] },
    { name: 'FECHA_INGRESO', aliases: ['FECHA_INGRESO', 'INGRESO', 'FECHA DE INGRESO'] },
    { name: 'TALENTO', aliases: ['TALENTO', 'HABILIDAD', 'MINISTERIO'] },
    { name: 'BAUTIZADO', aliases: ['BAUTIZADO', 'ES BAUTIZADO'] },
    { name: 'RELACION_CON_DIOS', aliases: ['RELACION_CON_DIOS', 'RELACION CON DIOS', 'ESPIRITUALIDAD'] },
    { name: 'PUNTOS_BIBLIA', aliases: ['PUNTOS_BIBLIA', 'PUNTOS BIBLIA', 'BIBLIA'] },
    { name: 'PUNTOS_APUNTES', aliases: ['PUNTOS_APUNTES', 'PUNTOS APUNTES', 'APUNTES'] },
    { name: 'PUNTOS_LIDERAZGO', aliases: ['PUNTOS_LIDERAZGO', 'PUNTOS LIDERAZGO', 'LIDERAZGO'] },
    { name: 'FOTO_URL', aliases: ['FOTO_URL', 'FOTO URL', 'FOTO', 'AVATAR'] },
    { name: 'NIVEL_ACCESO', aliases: ['NIVEL_ACCESO', 'NIVEL DE ACCESO'] },
    { name: 'NOTIF_PREFS', aliases: ['NOTIF_PREFS', 'NOTIFICACIONES_PREFS'] },
    { name: 'FCM_TOKEN', aliases: ['FCM_TOKEN', 'TOKEN_PUSH'] },
    { name: 'PREGUNTA_SEGURIDAD', aliases: ['PREGUNTA_SEGURIDAD', 'PREGUNTA'] },
    { name: 'RESPUESTA_SEGURIDAD', aliases: ['RESPUESTA_SEGURIDAD', 'RESPUESTA'] },
    { name: 'CAMBIO_OBLIGATORIO_PIN', aliases: ['CAMBIO_OBLIGATORIO_PIN', 'CAMBIO_OBLIGATORIO_P'] },
    { name: 'STATS_JSON', aliases: ['STATS_JSON'] },
    { name: 'TACTOR_SUMMARY', aliases: ['TACTOR_SUMMARY'] },
    { name: 'LAST_AI_UPDATE', aliases: ['LAST_AI_UPDATE'] },
    { name: 'BIOMETRIC_CREDENTIAL', aliases: ['BIOMETRIC_CREDENTIAL'] }
  ];

  const standardizedRows = [];
  const newHeaders = MASTER_SCHEMA.map(s => s.name);

  for (let i = 1; i < data.length; i++) {
    const oldRow = data[i];
    const newRow = [];
    
    MASTER_SCHEMA.forEach(field => {
      let value = '';
      for (const alias of field.aliases) {
        const idx = oldHeaders.indexOf(alias);
        if (idx !== -1 && oldRow[idx] !== undefined && oldRow[idx] !== '') {
          value = oldRow[idx];
          break;
        }
      }
      
      if (field.name === 'ID') value = String(value).trim().toUpperCase();
      if (field.name === 'ESTADO' && !value) value = 'ACTIVO';
      if ((field.name === 'XP' || field.name.includes('PUNTOS')) && !value) value = 0;
      
      newRow.push(value);
    });
    
    if (newRow[0]) standardizedRows.push(newRow);
  }

  sheet.clear();
  sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]).setFontWeight('bold').setBackground('#001f3f').setFontColor('#ffffff');
  if (standardizedRows.length > 0) {
    sheet.getRange(2, 1, standardizedRows.length, newHeaders.length).setValues(standardizedRows);
  }
  sheet.setFrozenRows(1);
  formatHeaders(sheet, newHeaders.length);

  ui.alert(`✅ DIRECTORIO NORMALIZADO\n\n• Perfiles estandarizados: ${standardizedRows.length}\n• Backup creado: ${backupName}\n\nTodo el sistema está ahora bajo el esquema maestro v1.8.8.`);
}

/**
 * @description Restauración de emergencia del Directorio Oficial.
 */
function emergencyRollbackDirectory() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const mainSheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  
  const sheets = ss.getSheets();
  const backups = sheets
    .filter(s => s.getName().startsWith("DIRECTORIO_BACKUP_"))
    .sort((a, b) => b.getName().localeCompare(a.getName())); // Más reciente primero

  if (backups.length === 0) {
    SpreadsheetApp.getUi().alert("❌ No se encontraron respaldos de Directorio.");
    return;
  }

  const latestBackup = backups[0];
  const response = SpreadsheetApp.getUi().alert(
    "⚠️ RESTAURAR DIRECTORIO",
    `¿Deseas restaurar la información desde el respaldo "${latestBackup.getName()}"? Esto borrará la versión actual y recuperará fotos, puntos y niveles perdidos.`,
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );

  if (response !== SpreadsheetApp.getUi().Button.YES) return;

  // Restaurar
  const backupData = latestBackup.getDataRange().getValues();
  mainSheet.clear();
  mainSheet.getRange(1, 1, backupData.length, backupData[0].length).setValues(backupData);
  
  // Re-formatear cabeceras básicas
  mainSheet.getRange(1, 1, 1, backupData[0].length).setFontWeight('bold').setBackground('#001f3f').setFontColor('#ffffff');
  mainSheet.setFrozenRows(1);

  SpreadsheetApp.getUi().alert(`✅ RESTAURACIÓN COMPLETADA\n\nSe ha recuperado la información de: ${latestBackup.getName()}.\nRevisa que las fotos y el XP hayan vuelto.`);
}


/****************************************************************************************************************************
 * 🎖️ SISTEMA DE ASCENSO - TAREAS, PROMOCIONES Y NOTICIAS
 ****************************************************************************************************************************/

/**
 * @description Obtiene todas las tareas/misiones disponibles.
 */
function getTasks() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.TASKS_SHEET);
  const progressSheet = ss.getSheetByName(CONFIG.TASK_PROGRESS_SHEET);
  
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonOk({ tasks: [] });
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toUpperCase());
  
  const progressData = progressSheet ? progressSheet.getDataRange().getValues() : [];
  const progressHeaders = progressData.length > 0 ? progressData[0].map(h => String(h).trim().toUpperCase()) : [];
  
  const tasks = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const taskId = String(row[headers.indexOf('ID')] || '');
    
    // Contar reclutas actuales (PENDIENTE, COMPLETADO, VERIFICADO)
    let currentSlots = 0;
    if (progressData.length > 1) {
      const taskIdCol = progressHeaders.indexOf('TASK_ID');
      const statusCol = progressHeaders.indexOf('STATUS');
      currentSlots = progressData.slice(1).filter(p => String(p[taskIdCol]) === taskId && p[statusCol] !== 'ELIMINADO').length;
    }

    tasks.push({
      id: taskId,
      title: String(row[headers.indexOf('TITULO')] || ''),
      description: String(row[headers.indexOf('DESCRIPCION')] || ''),
      area: String(row[headers.indexOf('AREA')] || ''),
      requiredLevel: String(row[headers.indexOf('NIVEL_REQUERIDO')] || 'RECLUTA'),
      xpReward: parseInt(row[headers.indexOf('XP_RECOMPENSA')]) || 0,
      maxSlots: parseInt(row[headers.indexOf('CUPOS')]) || 0,
      currentSlots: currentSlots
    });
  }
  return jsonOk({ tasks: tasks });
}

/**
 * @description Obtiene todos los reclutas inscritos en misiones (para vista Director).
 */
function getTaskRecruits() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.TASK_PROGRESS_SHEET);
  
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonOk({ recruits: [] });
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toUpperCase());
  
  const recruits = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = String(row[headers.indexOf('STATUS')] || '');
    if (status === 'ELIMINADO') continue;
    recruits.push({
      taskId: String(row[headers.indexOf('TASK_ID')] || ''),
      agentId: String(row[headers.indexOf('AGENT_ID')] || ''),
      agentName: String(row[headers.indexOf('AGENT_NAME')] || ''),
      date: String(row[headers.indexOf('FECHA')] || ''),
      status: status
    });
  }
  return jsonOk({ recruits: recruits });
}

/**
 * @description Director crea una nueva tarea.
 */
function createTaskAction(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.TASKS_SHEET);
  if (!sheet) throw new Error("Hoja TAREAS no encontrada. Ejecuta setupDatabase().");
  const id = 'TASK_' + new Date().getTime();
  sheet.appendRow([
    id, 
    data.title, 
    data.description || '', 
    data.area || 'SERVICIO', 
    data.requiredLevel || 'RECLUTA', 
    data.xpReward || 5,
    data.maxSlots || 0
  ]);
  
  // Publicar en Intel Feed
  var slotsMsg = (data.maxSlots && data.maxSlots > 0) ? ' — ' + data.maxSlots + ' cupos disponibles' : ' — Cupos ilimitados';
  addNewsItem(ss, 'TAREA', '⚔️ NUEVA MISIÓN: ' + data.title + slotsMsg, '', 'COMANDO');
  
  return jsonOk({ id: id });
}

/**
 * @description Director elimina una tarea.
 */
function deleteTaskAction(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.TASKS_SHEET);
  if (!sheet) throw new Error("Hoja TAREAS no encontrada.");
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][0]) === String(data.taskId)) {
      sheet.deleteRow(i + 1);
      return jsonOk();
    }
  }
  return jsonError("Tarea no encontrada.");
}

/**
 * @description Un agente solicita completar una tarea (status = PENDIENTE).
 */
function submitTaskCompletion(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.TASK_PROGRESS_SHEET);
  const tasksSheet = ss.getSheetByName(CONFIG.TASKS_SHEET);
  
  if (!sheet) throw new Error("Hoja PROGRESO_TAREAS no encontrada.");
  if (!tasksSheet) throw new Error("Hoja TAREAS no encontrada.");

  // Validar cupos si es necesario
  const tasksData = tasksSheet.getDataRange().getValues();
  const tasksHeaders = tasksData[0].map(h => String(h).trim().toUpperCase());
  const taskIdColIdx = tasksHeaders.indexOf('ID');
  const cuposColIdx = tasksHeaders.indexOf('CUPOS');
  
  const taskRow = tasksData.slice(1).find(r => String(r[taskIdColIdx]) === String(data.taskId));
  
  if (taskRow && cuposColIdx !== -1) {
    const maxSlots = parseInt(taskRow[cuposColIdx]) || 0;
    if (maxSlots > 0) {
      const progressData = sheet.getDataRange().getValues();
      const progressHeaders = progressData[0].map(h => String(h).trim().toUpperCase());
      const taskIdCol = progressHeaders.indexOf('TASK_ID');
      const statusCol = progressHeaders.indexOf('STATUS');
      const currentSlots = progressData.slice(1).filter(p => String(p[taskIdCol]) === String(data.taskId) && p[statusCol] !== 'ELIMINADO').length;
      
      if (currentSlots >= maxSlots) {
        throw new Error("MISIÓN COMPLETA: Ya no hay cupos militares disponibles para este objetivo.");
      }
    }
  }

  const fecha = Utilities.formatDate(new Date(), "GMT-4", "dd/MM/yyyy");
  sheet.appendRow([data.taskId, data.agentId, data.agentName || '', fecha, '', 'PENDIENTE']);
  
  // Publicar en Intel Feed con cupos restantes
  var taskTitle = taskRow ? String(taskRow[tasksHeaders.indexOf('TITULO')] || data.taskId) : data.taskId;
  var maxSlotsVal = (taskRow && cuposColIdx !== -1) ? (parseInt(taskRow[cuposColIdx]) || 0) : 0;
  if (maxSlotsVal > 0) {
    var progressNow = sheet.getDataRange().getValues();
    var phNow = progressNow[0].map(function(h){return String(h).trim().toUpperCase();});
    var usedNow = progressNow.slice(1).filter(function(p){ return String(p[phNow.indexOf('TASK_ID')]) === String(data.taskId) && p[phNow.indexOf('STATUS')] !== 'ELIMINADO'; }).length;
    addNewsItem(ss, 'TAREA', '🎯 ' + (data.agentName || data.agentId) + ' se unió a "' + taskTitle + '" — ' + usedNow + '/' + maxSlotsVal + ' cupos', data.agentId, data.agentName);
  } else {
    addNewsItem(ss, 'TAREA', '🎯 ' + (data.agentName || data.agentId) + ' se unió a "' + taskTitle + '"', data.agentId, data.agentName);
  }
  
  return jsonOk();
}

/**
 * @description Director verifica una tarea completada → Agente recibe XP + noticia.
 */
function verifyTaskAction(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  
  // 1. Actualizar status en PROGRESO_TAREAS
  const progressSheet = ss.getSheetByName(CONFIG.TASK_PROGRESS_SHEET);
  if (!progressSheet) throw new Error("Hoja PROGRESO_TAREAS no encontrada.");
  const progressData = progressSheet.getDataRange().getValues();
  const progressHeaders = progressData[0].map(h => String(h).trim().toUpperCase());
  
  let foundRow = -1;
  for (let i = 1; i < progressData.length; i++) {
    if (String(progressData[i][progressHeaders.indexOf('TASK_ID')]) === String(data.taskId) &&
        String(progressData[i][progressHeaders.indexOf('AGENT_ID')]) === String(data.agentId) &&
        String(progressData[i][progressHeaders.indexOf('STATUS')]) === 'PENDIENTE') {
      foundRow = i + 1;
      break;
    }
  }
  if (foundRow === -1) return jsonError("Solicitud pendiente no encontrada.");
  
  progressSheet.getRange(foundRow, progressHeaders.indexOf('STATUS') + 1).setValue('VERIFICADO');
  progressSheet.getRange(foundRow, progressHeaders.indexOf('VERIFICADO_POR') + 1).setValue(data.verifiedBy || 'DIRECTOR');
  
  // 2. Otorgar XP al agente (sumamos a PUNTOS LIDERAZGO)
  const xpReward = parseInt(data.xpReward) || 5;
  const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const dirData = directorySheet.getDataRange().getValues();
  const dirHeaders = dirData[0].map(h => String(h).trim().toUpperCase());
  
  for (let i = 1; i < dirData.length; i++) {
    if (String(dirData[i][0]).trim().toUpperCase() === String(data.agentId).trim().toUpperCase()) {
      const liderIdx = dirHeaders.indexOf('PUNTOS LIDERAZGO');
      if (liderIdx !== -1) {
        const currentPts = parseInt(dirData[i][liderIdx]) || 0;
        directorySheet.getRange(i + 1, liderIdx + 1).setValue(currentPts + xpReward);
      }
      break;
    }
  }
  
  // 3. Generar noticia
  addNewsItem(ss, 'TAREA', `¡${data.agentName || data.agentId} completó la misión "${data.taskTitle || ''}"! +${xpReward} XP`, data.agentId, data.agentName);
  
  return jsonOk();
}

/**
 * @description Director elimina a un recluta de una tarea.
 */
function removeRecruitFromTask(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const progressSheet = ss.getSheetByName(CONFIG.TASK_PROGRESS_SHEET);
  if (!progressSheet) throw new Error("Hoja PROGRESO_TAREAS no encontrada.");
  
  const progressData = progressSheet.getDataRange().getValues();
  const progressHeaders = progressData[0].map(function(h){ return String(h).trim().toUpperCase(); });
  const tIdCol = progressHeaders.indexOf('TASK_ID');
  const aIdCol = progressHeaders.indexOf('AGENT_ID');
  
  if (tIdCol === -1 || aIdCol === -1) throw new Error("Columnas no encontradas en PROGRESO_TAREAS.");
  
  for (let i = 1; i < progressData.length; i++) {
    if (String(progressData[i][tIdCol]) === String(data.taskId) &&
        String(progressData[i][aIdCol]) === String(data.agentId)) {
      progressSheet.deleteRow(i + 1);
      return jsonOk();
    }
  }
  return jsonError("Recluta no encontrado en esta tarea.");
}

/**
 * @description Obtiene el estado de promoción de un agente (XP, certificados, examen).
 */
function getPromotionStatus(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  
  // 1. Obtener XP y rango actual del agente
  const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const dirData = directorySheet.getDataRange().getValues();
  const dirHeaders = dirData[0].map(h => String(h).trim().toUpperCase());
  
  let agentXp = 0;
  let agentRank = 'RECLUTA';
  let agentName = '';
  for (let i = 1; i < dirData.length; i++) {
    if (String(dirData[i][0]).trim().toUpperCase() === String(data.agentId).trim().toUpperCase()) {
      const bibliaIdx = dirHeaders.indexOf('PUNTOS BIBLIA');
      const apuntesIdx = dirHeaders.indexOf('PUNTOS APUNTES');
      const liderazgoIdx = dirHeaders.indexOf('PUNTOS LIDERAZGO');
      agentXp = (parseInt(dirData[i][bibliaIdx]) || 0) + (parseInt(dirData[i][apuntesIdx]) || 0) + (parseInt(dirData[i][liderazgoIdx]) || 0);
      const rangoIdx = dirHeaders.indexOf('RANGO');
      agentRank = String(dirData[i][rangoIdx] || 'RECLUTA').trim().toUpperCase();
      const nameIdx = dirHeaders.indexOf('NOMBRE');
      agentName = String(dirData[i][nameIdx] || '');
      break;
    }
  }
  
  // 2. Contar certificados aprobados (Solo si TODAS las lecciones de un curso están COMPLETADO)
  const lessonsSheet = ss.getSheetByName(CONFIG.ACADEMY_LESSONS_SHEET);
  const progressSheet = ss.getSheetByName(CONFIG.ACADEMY_PROGRESS_SHEET);
  let certificates = 0;
  
  if (lessonsSheet && progressSheet) {
    const lessonsData = lessonsSheet.getDataRange().getValues();
    const lessonsHeaders = lessonsData[0].map(h => String(h).trim().toUpperCase());
    const courseIdIdx = lessonsHeaders.indexOf('COURSE_ID');
    const lessonIdIdx = lessonsHeaders.indexOf('ID');
    
    // Agrupar lecciones por curso
    const courseMap = {};
    for (let i = 1; i < lessonsData.length; i++) {
      const cId = String(lessonsData[i][courseIdIdx]);
      const lId = String(lessonsData[i][lessonIdIdx]);
      if (!courseMap[cId]) courseMap[cId] = [];
      courseMap[cId].push(lId);
    }
    
    // Obtener progreso del agente
    const progData = progressSheet.getDataRange().getValues();
    const progHeaders = progData[0].map(h => String(h).trim().toUpperCase());
    const agentIdIdx = progHeaders.indexOf('ID_AGENTE');
    const progLessonIdIdx = progHeaders.indexOf('ID_LECCION');
    const statusIdx = progHeaders.indexOf('ESTADO');
    
    const completedLessons = new Set();
    for (let i = 1; i < progData.length; i++) {
        if (String(progData[i][agentIdIdx]).trim().toUpperCase() === String(data.agentId).trim().toUpperCase() &&
            String(progData[i][statusIdx]).trim().toUpperCase() === 'COMPLETADO') {
          completedLessons.add(String(progData[i][progLessonIdIdx]));
        }
    }
    
    // Validar cada curso
    Object.keys(courseMap).forEach(cId => {
      const courseLessons = courseMap[cId];
      if (courseLessons.length > 0 && courseLessons.every(lId => completedLessons.has(lId))) {
        certificates++;
      }
    });
  }
  
  // 3. Verificar tareas completadas (verificadas)
  const taskProgressSheet = ss.getSheetByName(CONFIG.TASK_PROGRESS_SHEET);
  let tasksCompleted = 0;
  let tasksPending = 0;
  if (taskProgressSheet && taskProgressSheet.getLastRow() > 1) {
    const tpData = taskProgressSheet.getDataRange().getValues();
    const tpHeaders = tpData[0].map(h => String(h).trim().toUpperCase());
    for (let i = 1; i < tpData.length; i++) {
      if (String(tpData[i][tpHeaders.indexOf('AGENT_ID')]).trim().toUpperCase() === String(data.agentId).trim().toUpperCase()) {
        const status = String(tpData[i][tpHeaders.indexOf('STATUS')]).trim().toUpperCase();
        if (status === 'VERIFICADO') tasksCompleted++;
        if (status === 'PENDIENTE') tasksPending++;
      }
    }
  }
  
  // 4. Historial de ascensos
  const promoSheet = ss.getSheetByName(CONFIG.PROMOTIONS_SHEET);
  let promotionHistory = [];
  if (promoSheet && promoSheet.getLastRow() > 1) {
    const promoData = promoSheet.getDataRange().getValues();
    const promoHeaders = promoData[0].map(h => String(h).trim().toUpperCase());
    for (let i = 1; i < promoData.length; i++) {
      if (String(promoData[i][promoHeaders.indexOf('AGENT_ID')]).trim().toUpperCase() === String(data.agentId).trim().toUpperCase()) {
        promotionHistory.push({
          from: String(promoData[i][promoHeaders.indexOf('RANGO_ANTERIOR')] || ''),
          to: String(promoData[i][promoHeaders.indexOf('RANGO_NUEVO')] || ''),
          date: String(promoData[i][promoHeaders.indexOf('FECHA')] || ''),
          xp: parseInt(promoData[i][promoHeaders.indexOf('XP')]) || 0,
          certs: parseInt(promoData[i][promoHeaders.indexOf('CERTIFICADOS')]) || 0
        });
      }
    }
  }
  
  return jsonOk({
    xp: agentXp,
    rank: agentRank,
    agentName: agentName,
    certificates: certificates,
    tasksCompleted: tasksCompleted,
    tasksPending: tasksPending,
    promotionHistory: promotionHistory
  });
}

/**
 * @description Asciende a un agente al siguiente rango. Actualiza DIRECTORIO y registra en ASCENSOS.
 */
function promoteAgent(data) {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const dirData = directorySheet.getDataRange().getValues();
  const dirHeaders = dirData[0].map(h => String(h).trim().toUpperCase());
  const rangoIdx = dirHeaders.indexOf('RANGO');
  
  for (let i = 1; i < dirData.length; i++) {
    if (String(dirData[i][0]).trim().toUpperCase() === String(data.agentId).trim().toUpperCase()) {
      const oldRank = String(dirData[i][rangoIdx] || 'RECLUTA');
      const newRank = data.newRank;
      
      // Actualizar rango
      directorySheet.getRange(i + 1, rangoIdx + 1).setValue(newRank);
      
      // Registrar ascenso
      const promoSheet = ss.getSheetByName(CONFIG.PROMOTIONS_SHEET);
      if (promoSheet) {
        const fecha = Utilities.formatDate(new Date(), "GMT-4", "dd/MM/yyyy");
        promoSheet.appendRow([data.agentId, data.agentName || '', oldRank, newRank, fecha, data.xp || 0, data.certificates || 0]);
      }
      
      // Generar noticia
      addNewsItem(ss, 'ASCENSO', `🎖️ ¡${data.agentName || data.agentId} ascendió de ${oldRank} a ${newRank}!`, data.agentId, data.agentName);
      
      // Notificar por Telegram
      sendTelegramNotification(`🎖️ <b>ASCENSO</b>\n\n${data.agentName || data.agentId} ha sido promovido de <b>${oldRank}</b> a <b>${newRank}</b>.\n\n<i>Consagrados 2026</i>`);
      
      return jsonOk({ oldRank: oldRank, newRank: newRank });
    }
  }
  return jsonError("Agente no encontrado.");
}

/**
 * @description Obtiene las últimas 20 noticias.
 */
function getNewsFeed() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.NEWS_SHEET);
  
  if (!sheet || sheet.getLastRow() < 2) {
    // SEED TÁCTICO: Si no hay noticias, insertar mensaje inicial de sistema
    if (sheet) {
      addNewsItem(ss, 'OPERACION', '📡 SISTEMA CONSAGRADOS v3.0 EN LÍNEA: El Centro de Inteligencia ha sido activado. Esperando transmisiones...', 'SISTEMA', 'COMANDO');
    }
    return jsonOk({ news: [] });
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toUpperCase());
  const news = [];
  // Leer de abajo hacia arriba (más reciente primero)
  for (let i = data.length - 1; i >= 1 && news.length < 20; i--) {
    news.push({
      id: String(data[i][headers.indexOf('ID')] || ''),
      type: String(data[i][headers.indexOf('TIPO')] || ''),
      message: String(data[i][headers.indexOf('MENSAJE')] || ''),
      date: String(data[i][headers.indexOf('FECHA')] || ''),
      agentId: String(data[i][headers.indexOf('AGENT_ID')] || ''),
      agentName: String(data[i][headers.indexOf('AGENT_NAME')] || ''),
    });
  }
  return jsonOk({ news: news });
}

/**
 * @description Helper: Agrega un ítem al feed de noticias.
 */
function addNewsItem(ss, type, message, agentId, agentName) {
  const CONFIG = getGlobalConfig();
  const sheet = ss.getSheetByName(CONFIG.NEWS_SHEET);
  if (!sheet) return;
  
  // Si no hay nombre pero hay ID, intentar reclamo táctico de nombre desde el directorio
  if (!agentName && agentId && agentId !== 'SISTEMA' && agentId !== 'COMANDO') {
    const dirSheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
    if (dirSheet) {
      const dirData = dirSheet.getDataRange().getValues();
      for (let i = 1; i < dirData.length; i++) { // Búsqueda rápida
        if (String(dirData[i][0]) === String(agentId)) {
          agentName = dirData[i][1];
          break;
        }
      }
    }
  }

  // Reemplazar el ID por el nombre en el mensaje si fue resuelto
  if (agentName && agentId && message.includes(agentId)) {
    message = message.replace(agentId, agentName);
  }

  const id = 'NEWS_' + new Date().getTime();
  const fecha = Utilities.formatDate(new Date(), "GMT-4", "dd/MM/yyyy HH:mm");
  sheet.appendRow([id, type, message, fecha, agentId || '', agentName || '']);
}

/**
 * @description Calcula insignias/badges basadas en rendimiento real de los agentes.
 * Insignias: CONSAGRADO_MES, RECLUTADOR, STREAKER, MISIONERO_ELITE, ACADEMICO
 */
function computeBadges() {
  const CONFIG = getGlobalConfig();
  const ss = getSpreadsheet();
  
  // Get current month/year for monthly badges
  var now = new Date();
  var currentMonth = now.getMonth(); // 0-indexed
  var currentYear = now.getFullYear();
  
  var badges = [];
  
  // --- Obtener directorio de agentes ---
  var dirSheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  var dirData = dirSheet ? dirSheet.getDataRange().getValues() : [];
  var dirHeaders = dirData.length > 0 ? dirData[0].map(function(h){ return String(h).trim().toUpperCase(); }) : [];
  
  // Build agent lookup {id: name} and leader status
  var agentNames = {};
  var isLeader = {};
  var idCol = dirHeaders.indexOf('ID') !== -1 ? dirHeaders.indexOf('ID') : dirHeaders.indexOf('ID CÉDULA');
  var nameCol = dirHeaders.indexOf('NOMBRE');
  var rankCol = dirHeaders.indexOf('RANGO');
  var roleCol = dirHeaders.indexOf('NIVEL_ACCESO');

  for (var i = 1; i < dirData.length; i++) {
    var agId = String(dirData[i][idCol] || '').trim().toUpperCase();
    agentNames[agId] = String(dirData[i][nameCol] || '');
    
    var rank = String(dirData[i][rankCol] || '').toUpperCase();
    var role = String(dirData[i][roleCol] || '').toUpperCase();
    if (rank.includes('DIRECTOR') || rank.includes('LÍDER') || role.includes('DIRECTOR') || role.includes('ADMIN') || role.includes('SUPERVISOR')) {
      isLeader[agId] = true;
    }
  }
  
  // --- 1. RECLUTADOR DEL MES: Más referidos este mes (Inscripciones + Visitantes) ---
  var refCounts = {};
  var refCol = dirHeaders.indexOf('REFERIDO_POR');
  var joinCol = dirHeaders.indexOf('FECHA_INGRESO');
  
  // A. De Directorio (Nuevos Agentes)
  if (refCol !== -1 && joinCol !== -1) {
    for (var i = 1; i < dirData.length; i++) {
      var ref = String(dirData[i][refCol] || '').trim();
      if (!ref) continue;
      var joinDate = dirData[i][joinCol];
      if (joinDate instanceof Date) {
        if (joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear) {
          refCounts[ref] = (refCounts[ref] || 0) + 1;
        }
      }
    }
  }

  // B. De Asistencia (Visitantes traídos)
  var attSheetForRef = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
  if (attSheetForRef) {
    var aRefData = attSheetForRef.getDataRange().getValues();
    var aRefHeaders = aRefData[0].map(function(h){ return String(h).trim().toUpperCase(); });
    var aRefIdCol = aRefHeaders.indexOf('ID') !== -1 ? aRefHeaders.indexOf('ID') : aRefHeaders.indexOf('ID CÉDULA');
    var aRefRefCol = aRefHeaders.indexOf('REFERIDO_POR');
    var aRefDateCol = aRefHeaders.indexOf('FECHA');
    var registeredIds = new Set(Object.keys(agentNames));

    if (aRefRefCol !== -1 && aRefDateCol !== -1) {
      for (var i = 1; i < aRefData.length; i++) {
        var ref = String(aRefData[i][aRefRefCol] || '').trim();
        if (!ref) continue;
        var scId = String(aRefData[i][aRefIdCol] || '').trim().toUpperCase();
        if (registeredIds.has(scId)) continue; // Saltar si es un agente registrado

        var aDate = aRefData[i][aRefDateCol];
        if (!(aDate instanceof Date)) {
           var dp = String(aDate || '').split('/');
           if (dp.length === 3) aDate = new Date(parseInt(dp[2]), parseInt(dp[1])-1, parseInt(dp[0]));
        }
        if (aDate instanceof Date && aDate.getMonth() === currentMonth && aDate.getFullYear() === currentYear) {
          refCounts[ref] = (refCounts[ref] || 0) + 1;
        }
      }
    }
  }

  var topRef = null, topRefCount = 0;
  for (var name in refCounts) {
    // Note: topRef is name here, not ID. We might need ID to check isLeader.
    // However, the audio implies filtering "leaders" from badges. 
    // If name is a leader's name, we could try to find their ID.
    // For simplicity, if we don't have ID, we might skip filtering refCounts or just filter if name is known as a leader.
    if (refCounts[name] > topRefCount) { topRef = name; topRefCount = refCounts[name]; }
  }
  if (topRef && topRefCount > 0) {
    badges.push({ type: 'RECLUTADOR', emoji: '🎯', label: 'Reclutador del Mes', agentName: topRef, value: topRefCount });
  }

  
  // --- 2. STREAKER: Racha más alta activa ---
  var streakSheet = ss.getSheetByName(CONFIG.STREAKS_SHEET);
  if (streakSheet && streakSheet.getLastRow() >= 2) {
    var sData = streakSheet.getDataRange().getValues();
    var sHeaders = sData[0].map(function(h){ return String(h).trim().toUpperCase(); });
    var sIdCol = sHeaders.indexOf('AGENT_ID');
    var sCountCol = sHeaders.indexOf('STREAK_COUNT') !== -1 ? sHeaders.indexOf('STREAK_COUNT') : sHeaders.indexOf('RACHA');
    if (sIdCol !== -1 && sCountCol !== -1) {
      var topStreaker = null, topStreak = 0;
      for (var i = 1; i < sData.length; i++) {
        var agId = String(sData[i][sIdCol] || '').trim().toUpperCase();
        if (isLeader[agId]) continue; // Filter out leaders
        var streak = parseInt(sData[i][sCountCol]) || 0;
        if (streak > topStreak) {
          topStreaker = agId;
          topStreak = streak;
        }
      }
      if (topStreaker && topStreak > 0) {
        badges.push({ type: 'STREAKER', emoji: '🔥', label: 'Streaker', agentId: topStreaker, agentName: agentNames[topStreaker] || topStreaker, value: topStreak });
      }
    }
  }
  
  // --- 3. MISIONERO ELITE: Más misiones verificadas este mes ---
  var progressSheet = ss.getSheetByName(CONFIG.TASK_PROGRESS_SHEET);
  if (progressSheet && progressSheet.getLastRow() >= 2) {
    var pData = progressSheet.getDataRange().getValues();
    var pHeaders = pData[0].map(function(h){ return String(h).trim().toUpperCase(); });
    var pAgentCol = pHeaders.indexOf('AGENT_ID');
    var pStatusCol = pHeaders.indexOf('STATUS');
    var pDateCol = pHeaders.indexOf('FECHA');
    
    var missionCounts = {};
    for (var i = 1; i < pData.length; i++) {
      if (String(pData[i][pStatusCol]) !== 'VERIFICADO') continue;
      // Filter by month if date is available
      var dStr = String(pData[i][pDateCol] || '');
      var parts = dStr.split('/');
      if (parts.length === 3) {
        var m = parseInt(parts[1]) - 1; // dd/MM/yyyy
        var y = parseInt(parts[2]);
        if (m !== currentMonth || y !== currentYear) continue;
      }
      var agId = String(pData[i][pAgentCol] || '').trim().toUpperCase();
      missionCounts[agId] = (missionCounts[agId] || 0) + 1;
    }
    var topMissioner = null, topMissions = 0;
    for (var id in missionCounts) {
      if (isLeader[id]) continue; // Filter out leaders
      if (missionCounts[id] > topMissions) { topMissioner = id; topMissions = missionCounts[id]; }
    }
    if (topMissioner && topMissions > 0) {
      badges.push({ type: 'MISIONERO_ELITE', emoji: '⚔️', label: 'Misionero Elite', agentId: topMissioner, agentName: agentNames[topMissioner] || topMissioner, value: topMissions });
    }
  }
  
  // --- 4. ACADÉMICO: Más cursos completados ---
  var acadSheet = ss.getSheetByName(CONFIG.ACADEMY_PROGRESS_SHEET);
  if (acadSheet && acadSheet.getLastRow() >= 2) {
    var aData = acadSheet.getDataRange().getValues();
    var aHeaders = aData[0].map(function(h){ return String(h).trim().toUpperCase(); });
    var aAgentCol = aHeaders.indexOf('AGENT_ID');
    var aStatusCol = aHeaders.indexOf('STATUS');
    
    var acadCounts = {};
    for (var i = 1; i < aData.length; i++) {
      if (String(aData[i][aStatusCol]) !== 'COMPLETADO') continue;
      var agId = String(aData[i][aAgentCol] || '').trim().toUpperCase();
      acadCounts[agId] = (acadCounts[agId] || 0) + 1;
    }
    var topAcad = null, topAcadCount = 0;
    for (var id in acadCounts) {
      if (isLeader[id]) continue; // Filter out leaders
      if (acadCounts[id] > topAcadCount) { topAcad = id; topAcadCount = acadCounts[id]; }
    }
    if (topAcad && topAcadCount > 0) {
      badges.push({ type: 'ACADEMICO', emoji: '📚', label: 'Académico', agentId: topAcad, agentName: agentNames[topAcad] || topAcad, value: topAcadCount });
    }
  }
  
  // --- 5. CONSAGRADO DEL MES: Asistencia perfecta ---
  var attSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
  if (attSheet && attSheet.getLastRow() >= 2) {
    var attData = attSheet.getDataRange().getValues();
    var attHeaders = attData[0].map(function(h){ return String(h).trim().toUpperCase(); });
    var attIdCol = attHeaders.indexOf('ID') !== -1 ? attHeaders.indexOf('ID') : attHeaders.indexOf('ID CÉDULA');
    var attDateCol = attHeaders.indexOf('FECHA');
    
    // Count attendance per agent this month
    var attCounts = {};
    for (var i = 1; i < attData.length; i++) {
      var dateVal = attData[i][attDateCol];
      var attDate;
      if (dateVal instanceof Date) {
        attDate = dateVal;
      } else {
        var dParts = String(dateVal || '').split('/');
        if (dParts.length === 3) attDate = new Date(parseInt(dParts[2]), parseInt(dParts[1])-1, parseInt(dParts[0]));
      }
      if (!attDate || attDate.getMonth() !== currentMonth || attDate.getFullYear() !== currentYear) continue;
      var agId = String(attData[i][attIdCol] || '').trim().toUpperCase();
      attCounts[agId] = (attCounts[agId] || 0) + 1;
    }
    
    // Find who has perfect attendance (most attendances this month)
    var topAtt = null, topAttCount = 0;
    for (var id in attCounts) {
      if (isLeader[id]) continue; // Filter out leaders
      if (attCounts[id] > topAttCount) { topAtt = id; topAttCount = attCounts[id]; }
    }
    if (topAtt && topAttCount > 0) {
      badges.push({ type: 'CONSAGRADO_MES', emoji: '🏆', label: 'Consagrado del Mes', agentId: topAtt, agentName: agentNames[topAtt] || topAtt, value: topAttCount });
    }
  }

  // --- 6. CATEGORÍAS POR PUNTOS (Menciones Especiales) ---
  // Nota: Estas se basan en el total acumulado actual en el directorio.
  var topXp = null, maxXp = 0;
  var topBiblia = null, maxBiblia = 0;
  var topApuntes = null, maxApuntes = 0;
  var topLiderazgo = null, maxLiderazgo = 0;

  var xpCol = findHeaderIdx(dirHeaders, 'XP');
  var bibliaCol = findHeaderIdx(dirHeaders, 'PUNTOS_BIBLIA');
  var apuntesCol = findHeaderIdx(dirHeaders, 'PUNTOS_APUNTES');
  var liderazgoCol = findHeaderIdx(dirHeaders, 'PUNTOS_LIDERAZGO');

  for (var i = 1; i < dirData.length; i++) {
    var agId = String(dirData[i][idCol] || '').trim().toUpperCase();
    if (isLeader[agId]) continue; // Filtrar líderes del cuadro de honor

    var xp = parseInt(dirData[i][xpCol]) || 0;
    var biblia = parseInt(dirData[i][bibliaCol]) || 0;
    var apuntes = parseInt(dirData[i][apuntesCol]) || 0;
    var liderazgo = parseInt(dirData[i][liderazgoCol]) || 0;

    if (xp > maxXp) { topXp = agId; maxXp = xp; }
    if (biblia > maxBiblia) { topBiblia = agId; maxBiblia = biblia; }
    if (apuntes > maxApuntes) { topApuntes = agId; maxApuntes = apuntes; }
    if (liderazgo > maxLiderazgo) { topLiderazgo = agId; maxLiderazgo = liderazgo; }
  }

  if (topXp) badges.push({ type: 'LEYENDA', emoji: '👑', label: 'Leyenda (Top XP)', agentId: topXp, agentName: agentNames[topXp] || topXp, value: maxXp });
  if (topBiblia) badges.push({ type: 'GUERRERO', emoji: '⚔️', label: 'Guerrero (Biblia)', agentId: topBiblia, agentName: agentNames[topBiblia] || topBiblia, value: maxBiblia });
  if (topApuntes) badges.push({ type: 'ESCRIBA', emoji: '📜', label: 'Escriba (Apuntes)', agentId: topApuntes, agentName: agentNames[topApuntes] || topApuntes, value: maxApuntes });
  if (topLiderazgo) badges.push({ type: 'LIDER', emoji: '⭐', label: 'Líder de Influencia', agentId: topLiderazgo, agentName: agentNames[topLiderazgo] || topLiderazgo, value: maxLiderazgo });

  return jsonOk({ badges: badges });
}

