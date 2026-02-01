
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

// --- FUNCIÓN DE CONFIGURACIÓN GLOBAL ---
function getGlobalConfig() {
  return {
    SPREADSHEET_ID: '1Zz4a_Gbom0bSEQNZpc-Dmgaoy0VogCnJFEIHuIee4bo',
    DRIVE_FOLDER_ID: '1iVpCg1ZcbJcrh-txxeO-vciw686zrm-N',
    TELEGRAM_BOT_TOKEN: '8514450878:AAElk5X4n2YvnHEiK7K1ZlmmtoekIlQ-IhA',
    TELEGRAM_CHAT_ID: '1009537014',
    DIRECTORY_SHEET_NAME: 'DIRECTORIO_OFICIAL',
    ENROLLMENT_SHEET_NAME: 'INSCRIPCIONES',
    ATTENDANCE_SHEET_NAME: 'ASISTENCIA',
    GUIAS_SHEET_NAME: 'GUIAS'
  };
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
 * @description Maneja las solicitudes GET. Devuelve todos los datos crudos del Directorio Oficial.
 */
function doGet(e) {
  const CONFIG = getGlobalConfig();
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID.includes('PEGA_AQUI')) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Configuración incompleta: SPREADSHEET_ID no está definido en el script." })).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
    if (!sheet) throw new Error(`Sheet "${CONFIG.DIRECTORY_SHEET_NAME}" no encontrada.`);
    
    // Simplificado: Solo devuelve los datos crudos. El frontend hará el procesamiento.
    const data = sheet.getDataRange().getValues();
    
    return ContentService.createTextOutput(JSON.stringify({ data: data })).setMimeType(ContentService.MimeType.JSON);
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
      default:
        throw new Error("Acción no reconocida.");
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
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
      default: return '';
    }
  });
  
  directorySheet.appendRow(newRow);
  
  const telegramMessage = `✅ <b>NUEVA INSCRIPCIÓN TÁCTICA</b>\n\nUn nuevo agente se ha unido a las filas.\n\n<b>• Nombre:</b> ${data.nombre}\n<b>• ID Generado:</b> <code>${newId}</code>\n<b>• PIN de Acceso:</b> <code>${newPin}</code>\n\n<i>Por favor, entrega estas credenciales al agente para su despliegue inmediato.</i>`;
  sendTelegramNotification(telegramMessage);

  return ContentService.createTextOutput(JSON.stringify({ success: true, newId: newId })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Sube una imagen a Google Drive.
 */
function uploadImage(data) {
  const CONFIG = getGlobalConfig();
  const { file, mimeType, filename } = data;
  const decoded = Utilities.base64Decode(file);
  const blob = Utilities.newBlob(decoded, mimeType, filename);
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  if (!folder) throw new Error("La carpeta de destino en Drive no fue encontrada.");

  const newFile = folder.createFile(blob);
  newFile.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
  const fileUrl = `https://lh3.googleusercontent.com/d/${newFile.getId()}`;
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, url: fileUrl })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Registra una asistencia y notifica por Telegram.
 */
function registerIdScan(payload) {
   const CONFIG = getGlobalConfig();
   const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
       return ContentService.createTextOutput(JSON.stringify({ 
         success: false, 
         error: "ALERTA: Agente ya registrado el día de hoy." 
       })).setMimeType(ContentService.MimeType.JSON);
     }
   }

   attendanceSheet.appendRow([payload.scannedId, payload.type, payload.location, new Date(payload.timestamp)]);

   // Notificación a Telegram
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
   
   // AUTO-XP: +10 por asistencia
   if (agentRowIdx !== -1) {
     const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
     const xpCol = headers.indexOf('XP') + 1 || headers.indexOf('PUNTOS XP') + 1;
     if (xpCol > 0) {
       const currentXp = parseInt(directorySheet.getRange(agentRowIdx, xpCol).getValue()) || 0;
       directorySheet.getRange(agentRowIdx, xpCol).setValue(currentXp + 10);
     }
   }
   
   const telegramMessage = `🛡️ <b>REGISTRO DE ASISTENCIA</b>\n\n<b>• Agente:</b> ${agentName}\n<b>• ID:</b> <code>${payload.scannedId}</code>\n<b>• Tipo:</b> ${payload.type}\n<b>• Fecha:</b> ${new Date(payload.timestamp).toLocaleString()}`;
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

  return ContentService.createTextOutput(JSON.stringify({ success: true, agentName: agentName })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Actualiza puntos específicos de un agente (Biblia, Apuntes, Liderazgo).
 */
function updateAgentPoints(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  let colName = '';
  switch(data.type) {
    case 'BIBLIA': colName = 'PUNTOS BIBLIA'; break;
    case 'APUNTES': colName = 'PUNTOS APUNTES'; break;
    case 'LIDERAZGO': colName = 'PUNTOS LIDERAZGO'; break;
  }
  
  const colIdx = headers.indexOf(colName) + 1;
  const xpColIdx = (headers.indexOf('XP') + 1) || (headers.indexOf('PUNTOS XP') + 1);
  
  if (colIdx === 0) throw new Error(`Columna ${colName} no encontrada.`);

  let rowIdx = -1;
  for (let i = 1; i < directoryData.length; i++) {
    if (String(directoryData[i][0]) === String(data.agentId)) {
      rowIdx = i + 1;
      break;
    }
  }

  if (rowIdx === -1) throw new Error("Agente no encontrado.");

  const currentVal = parseInt(sheet.getRange(rowIdx, colIdx).getValue()) || 0;
  sheet.getRange(rowIdx, colIdx).setValue(currentVal + data.points);
  
  // También sumamos al XP total
  if (xpColIdx > 0) {
    const currentXp = parseInt(sheet.getRange(rowIdx, xpColIdx).getValue()) || 0;
    sheet.getRange(rowIdx, xpColIdx).setValue(currentXp + data.points);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}


/**
 * @description Importa agentes desde la hoja de INSCRIPCIONES al directorio principal.
 */
function reconstructDb() {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
        case 'ID CÉDULA':
        case 'ID': return newId;
        case 'NOMBRE': return name;
        case 'RANGO': {
           const cargo = (getE('CARGO') || getE('NIVEL_ACCESO') || '').toUpperCase();
           return (cargo.includes('LIDER') || cargo.includes('DIRECTOR')) ? 'ACTIVO' : 'RECLUTA';
        }
        case 'STATUS':
        case 'ESTADO': return 'ACTIVO';
        case 'CARGO':
        case 'NIVEL_ACCESO': return getE('CARGO') || getE('NIVEL_ACCESO') || 'Estudiante';
        case 'CONTRASEÑA/PIN':
        case 'PIN': return newPin;
        case 'FOTO URL':
        case 'FOTO_URL': return getE('FOTO URL') || getE('FOTO') || '';
        case 'TELEFONO':
        case 'WHATSAPP': return getE('WHATSAPP') || getE('TELÉFONO') || '';
        case 'FECHA DE NACIMIENTO':
        case 'FECHA_NACIMIENTO': return getE('FECHA DE NACIMIENTO') || getE('FECHA_NACIMIENTO') || '';
        case 'TALENTO': return getE('TALENTO') || '';
        case 'BAUTIZADO': return getE('BAUTIZADO') || 'NO';
        case 'RELACION CON DIOS':
        case 'RELACION_CON_DIOS': return getE('RELACION CON DIOS') || '';
        case 'PUNTOS XP':
        case 'XP': return 0;
        case 'PUNTOS BIBLIA': return 0;
        case 'PUNTOS APUNTES': return 0;
        case 'PUNTOS LIDERAZGO': return 0;
        case 'FECHA_INGRESO': return new Date();
        default: return '';
      }
    });

    directorySheet.appendRow(newRow);
    directoryNames.push(name.trim().toUpperCase());
    newAgentsCount++;
  });

  const message = `⚙️ <b>BASE DE DATOS SINCRONIZADA</b>\n\nSe han procesado <b>${newAgentsCount}</b> nuevas activaciones desde el portal de inscripciones.\n\nEstatus: <b>OPERATIVO</b>`;
  sendTelegramNotification(message);

  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Directorio actualizado.", newAgents: newAgentsCount })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description ESCANEA EL DIRECTORIO Y REPARA DATOS FALTANTES (ID y PIN).
 * Ejecuta esta función manualmente desde el Editor de Scripts para limpiar la base de datos.
 */
function repairMissingData() {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const results = [];
  
  const directoryHeaders = [
    'ID', 'NOMBRE', 'PIN', 'RANGO', 'CARGO', 'FOTO URL', 'WHATSAPP', 
    'FECHA DE NACIMIENTO', 'TALENTO', 'BAUTIZADO', 'RELACION CON DIOS',
    'STATUS', 'XP', 'PUNTOS BIBLIA', 'PUNTOS APUNTES', 'PUNTOS LIDERAZGO', 'FECHA_INGRESO',
    'PREGUNTA_SEGURIDAD', 'RESPUESTA_SEGURIDAD', 'CAMBIO_OBLIGATORIO_PIN'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.DIRECTORY_SHEET_NAME, directoryHeaders));
  
  const enrollmentHeaders = [
    'TIMESTAMP', 'NOMBRE', 'WHATSAPP', 'FECHA DE NACIMIENTO', 'TALENTO', 
    'BAUTIZADO', 'RELACION CON DIOS', 'FOTO URL', 'PROCESADO'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.ENROLLMENT_SHEET_NAME, enrollmentHeaders));
  
  const attendanceHeaders = [
    'ID', 'TIPO', 'UBICACION', 'FECHA'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.ATTENDANCE_SHEET_NAME, attendanceHeaders));
  
  // 4. GUIAS
  const guiasHeaders = [
    'ID', 'NOMBRE', 'TIPO', 'URL', 'FECHA'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.GUIAS_SHEET_NAME, guiasHeaders));
  
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
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
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
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  const idCol = headers.indexOf('ID');
  const questionCol = headers.indexOf('PREGUNTA_SEGURIDAD');
  
  const agent = directoryData.find(row => String(row[idCol]) === String(data.agentId));
  if (!agent) throw new Error("Agente no encontrado.");
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    question: agent[questionCol] || "¿Cuál es tu color favorito?" 
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Valida respuesta de seguridad
 */
function resetPasswordWithAnswer(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      pin: agentRow[pinCol] 
    })).setMimeType(ContentService.MimeType.JSON);
  } else {
    throw new Error("Respuesta de seguridad incorrecta.");
  }
}

/**
 * @description Actualiza el password
 */
function updateUserPassword(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
  
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🛠️ CONSAGRADOS')
    .addItem('🚀 Setup Base de Datos', 'setupDatabase')
    .addItem('🔍 Verificar Sistema', 'checkSystemStatus')
    .addItem('🔧 Reparar IDs/PINs', 'repairMissingData')
    .addToUi();
}

/**
 * @description Sube una guía y guarda sus metadatos.
 */
function uploadGuide(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.GUIAS_SHEET_NAME);
  
  const id = `GUIA-${Date.now()}`;
  const date = new Date().toISOString();
  
  sheet.appendRow([id, data.name, data.type, data.url, date]);
  
  const telegramMessage = `📚 <b>NUEVA GUÍA DISPONIBLE</b>\n\n<b>• Nombre:</b> ${data.name}\n<b>• Tipo:</b> ${data.type}\n\n<i>El material ha sido cargado al centro de inteligencia.</i>`;
  sendTelegramNotification(telegramMessage);

  return ContentService.createTextOutput(JSON.stringify({ success: true, id: id })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Obtiene las guías disponibles para un usuario.
 */
function getGuides(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
  
  // Filtrado por rol (a menos que sea DIRECTOR)
  let filtered = guides;
  if (data.userRole === 'STUDENT') {
    filtered = guides.filter(g => g.type === 'ESTUDIANTE');
  } else if (data.userRole === 'LEADER') {
    filtered = guides.filter(g => g.type === 'LIDER');
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: filtered })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Elimina una guía por ID.
 */
function deleteGuide(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.GUIAS_SHEET_NAME);
  
  const values = sheet.getDataRange().getValues();
  const idCol = 0; // Columna ID
  
  const rowIdx = values.findIndex(row => String(row[idCol]) === String(data.guideId));
  if (rowIdx === -1) throw new Error("Guía no encontrada.");
  
  const guideName = values[rowIdx][1];
  sheet.deleteRow(rowIdx + 1);
  
  const telegramMessage = `🗑️ <b>GUÍA ELIMINADA</b>\n\n<b>• Nombre:</b> ${guideName}\n<b>• Ejecutado por:</b> Director\n\n<i>El recurso ha sido retirado del centro de inteligencia.</i>`;
  sendTelegramNotification(telegramMessage);

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Actualiza la foto de un agente.
 */
function updateAgentPhoto(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

