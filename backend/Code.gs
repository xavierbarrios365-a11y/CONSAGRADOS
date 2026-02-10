
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
    GUIAS_SHEET_NAME: 'GUIAS',
    ACADEMY_COURSES_SHEET: 'ACADEMIA_CURSOS',
    ACADEMY_LESSONS_SHEET: 'ACADEMIA_LECCIONES',
    ACADEMY_PROGRESS_SHEET: 'ACADEMIA_PROGRESO',
    STREAKS_SHEET: 'RACHAS',
    VERSES_SHEET: 'VERSICULO_DIARIO',
    NOTIFICATIONS_SHEET: 'NOTIFICACIONES',
    ONESIGNAL_APP_ID: 'c05267b7-737a-4f55-b692-3c2fe2d20677',
    ONESIGNAL_REST_API_KEY: '8ccEyat7we65m1kdya83cl6nge' // Actualizado desde captura de pantalla
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
 * @description Envía una notificación push vía OneSignal.
 */
function sendPushNotification(title, message) {
  const CONFIG = getGlobalConfig();
  if (!CONFIG.ONESIGNAL_APP_ID || !CONFIG.ONESIGNAL_REST_API_KEY) {
    Logger.log("Configuración de OneSignal incompleta.");
    return;
  }

  try {
    const url = "https://onesignal.com/api/v1/notifications";
    const payload = {
      app_id: CONFIG.ONESIGNAL_APP_ID,
      headings: { "en": title, "es": title },
      contents: { "en": message, "es": message },
      included_segments: ["Subscribed Users"]
    };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": "Basic " + CONFIG.ONESIGNAL_REST_API_KEY
      },
      payload: JSON.stringify(payload)
    };

    UrlFetchApp.fetch(url, options);
  } catch (error) {
    Logger.log(`Error al enviar Push Notification: ${error.message}`);
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
    const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
    const strikesSheet = ss.getSheetByName(CONFIG.STREAKS_SHEET);
    
    if (!directorySheet) throw new Error(`Sheet "${CONFIG.DIRECTORY_SHEET_NAME}" no encontrada.`);
    
    const directoryData = directorySheet.getDataRange().getValues();
    const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
    
    // Virtual Join de Rachas
    if (strikesSheet) {
      const strikeData = strikesSheet.getDataRange().getValues();
      const strikeHeaders = strikeData[0].map(h => String(h).trim().toUpperCase());
      const strikeAgentIdIdx = strikeHeaders.indexOf('AGENT_ID');
      const streakCountIdx = strikeHeaders.indexOf('STREAK_COUNT');
      const tasksJsonIdx = strikeHeaders.indexOf('TASKS_JSON');
      
      const streakMap = new Map();
      if (strikeAgentIdIdx !== -1) {
        for (let i = 1; i < strikeData.length; i++) {
          streakMap.set(String(strikeData[i][strikeAgentIdIdx]), {
            streak: strikeData[i][streakCountIdx] || 0,
            tasks: strikeData[i][tasksJsonIdx] || '[]'
          });
        }
      }
      
      // Inyectar columnas virtuales en la respuesta
      directoryData[0].push('STREAK_COUNT', 'TASKS_JSON');
      for (let i = 1; i < directoryData.length; i++) {
        const agentId = String(directoryData[i][0]);
        const streakInfo = streakMap.get(agentId) || { streak: 0, tasks: '[]' };
        directoryData[i].push(streakInfo.streak, streakInfo.tasks);
      }
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
      case 'send_broadcast_notification':
        return sendBroadcastNotification(request.data);
      case 'get_notifications':
        return getNotifications();
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
  
  const telegramMessage = `✅ <b>NUEVA INSCRIPCIÓN TÁCTICA</b>\n\nUn nuevo agente se ha unido a las filas.\n\n<b>• Nombre:</b> ${data.nombre}\n<b>• URL:</b> https://consagrados.vercel.app/\n<b>• ID Generado:</b> <code>${newId}</code>\n<b>• PIN de Acceso:</b> <code>${newPin}</code>\n<b>• Pregunta:</b> ${data.preguntaSeguridad || '¿Cuál es tu color favorito?'}\n<b>• Respuesta:</b> ${data.respuestaSeguridad || 'Azul'}\n\n<i>Por favor, entrega estas credenciales al agente para su despliegue inmediato.</i>`;
  sendTelegramNotification(telegramMessage);

  return ContentService.createTextOutput(JSON.stringify({ success: true, newId: newId })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Sube un archivo a Google Drive y devuelve su URL de descarga/vista.
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
  
  // Para imágenes, usar el proxy de imágenes de Google para mejor visualización.
  // Para otros archivos (PDF, DOC, etc.), usar el link de descarga directa.
  const isImage = mimeType && mimeType.startsWith('image/');
  const fileUrl = isImage 
    ? `https://lh3.googleusercontent.com/d/${newFile.getId()}`
    : `https://drive.google.com/uc?export=download&id=${newFile.getId()}`;
  
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
   
   // AUTO-XP: +10 por asistencia -> Sumar a Liderazgo para visualización frontal
   if (agentRowIdx !== -1) {
     const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
     const leadCol = headers.indexOf('PUNTOS LIDERAZGO') + 1;
     if (leadCol > 0) {
       const currentVal = parseInt(directorySheet.getRange(agentRowIdx, leadCol).getValue()) || 0;
       directorySheet.getRange(agentRowIdx, leadCol).setValue(currentVal + 10);
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
 * @description Obtiene el radar de visitantes (asistentes no inscritos).
 */
function getVisitorRadar() {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
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
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: radar })).setMimeType(ContentService.MimeType.JSON);
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

    // Notificación de XP si es un cambio positivo
    if (data.points > 0) {
      // Evitar notificaciones duplicadas en un corto periodo (opcional, pero buena práctica)
      const messages = [
        "¡Excelente trabajo, Agente! Has ganado méritos.",
        "Tu fe y disciplina están rindiendo frutos. +XP",
        "Sigue así, el Command Center reconoce tu esfuerzo.",
        "Has subido en el rango de influencia. ¡Felicidades!"
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      sendPushNotification("⭐ MÉRITOS OBTENIDOS", `${randomMsg} (+${data.points} XP)`);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true, newVal: (currentVal + data.points) })).setMimeType(ContentService.MimeType.JSON);
}

function deductPercentagePoints(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  const xpColIdx = (headers.indexOf('XP') + 1) || (headers.indexOf('PUNTOS XP') + 1);
  const bibliaColIdx = headers.indexOf('PUNTOS BIBLIA') + 1;
  const apuntesColIdx = headers.indexOf('PUNTOS APUNTES') + 1;
  const liderazgoColIdx = headers.indexOf('PUNTOS LIDERAZGO') + 1;

  let rowIdx = -1;
  for (let i = 1; i < directoryData.length; i++) {
    if (String(directoryData[i][0]) === String(data.agentId)) {
      rowIdx = i + 1;
      break;
    }
  }

  if (rowIdx === -1) throw new Error("Agente no encontrado.");

  const categories = [bibliaColIdx, apuntesColIdx, liderazgoColIdx, xpColIdx];
  categories.forEach(col => {
    if (col > 0) {
      const current = parseInt(sheet.getRange(rowIdx, col).getValue()) || 0;
      const newValue = Math.max(0, Math.floor(current * (1 - (data.percentage / 100))));
      sheet.getRange(rowIdx, col).setValue(newValue);
    }
  });

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Elimina un curso de la academia por ID.
 */
function deleteAcademyCourse(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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

  return ContentService.createTextOutput(JSON.stringify({ success: true, message: `Curso "${courseName}" eliminado.` })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Elimina una lección de la academia por ID.
 */
function deleteAcademyLesson(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const lessonsSheet = ss.getSheetByName(CONFIG.ACADEMY_LESSONS_SHEET);
  
  if (!lessonsSheet) throw new Error("Hoja de lecciones no encontrada.");
  
  const lessonsValues = lessonsSheet.getDataRange().getValues();
  const rowIdx = lessonsValues.findIndex(row => String(row[0]) === String(data.lessonId));
  
  if (rowIdx === -1 || rowIdx === 0) throw new Error("Lección no encontrada.");
  
  const lessonTitle = lessonsValues[rowIdx][3];
  lessonsSheet.deleteRow(rowIdx + 1);
  
  const telegramMessage = `🗑️ <b>LECCIÓN ELIMINADA</b>\n\n<b>• Título:</b> ${lessonTitle}\n<b>• Ejecutado por:</b> Director\n\n<i>La lección ha sido retirada de la academia.</i>`;
  sendTelegramNotification(telegramMessage);

  return ContentService.createTextOutput(JSON.stringify({ success: true, message: `Lección "${lessonTitle}" eliminada.` })).setMimeType(ContentService.MimeType.JSON);
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
    'PREGUNTA_SEGURIDAD', 'RESPUESTA_SEGURIDAD', 'CAMBIO_OBLIGATORIO_PIN',
    'STATS_JSON', 'TACTOR_SUMMARY', 'LAST_AI_UPDATE',
    'BIOMETRIC_CREDENTIAL'
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
    'AGENT_ID', 'STREAK_COUNT', 'LAST_COMPLETED_WEEK', 'TASKS_JSON'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.STREAKS_SHEET, streakHeaders));

  // 9. VERSICULO DIARIO
  const verseHeaders = [
    'DATE', 'VERSE', 'REFERENCE'
  ];
  results.push(ensureSheetColumns(ss, CONFIG.VERSES_SHEET, verseHeaders));
  
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

/**
 * @description Obtiene los datos de la academia (cursos y lecciones).
 */
function getAcademyData(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
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
        agentId: row[0],
        lessonId: row[1],
        status: row[2],
        score: row[3],
        date: row[4]
      }));
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    data: { courses, lessons, progress } 
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Procesa el resultado de un quiz y otorga recompensas.
 */
function submitQuizResult(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
  const progressSheet = ss.getSheetByName(CONFIG.ACADEMY_PROGRESS_SHEET);
  const lessonsSheet = ss.getSheetByName(CONFIG.ACADEMY_LESSONS_SHEET);
  const directorySheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  
  if (!progressSheet || !lessonsSheet || !directorySheet) throw new Error("Error en la base de datos.");
  
  // 1. Validar lección y límites de intentos
  const lessonsData = lessonsSheet.getDataRange().getValues();
  const lesson = lessonsData.slice(1).find(row => String(row[0]) === String(data.lessonId));
  if (!lesson) throw new Error("Lección no encontrada.");

  const progressData = progressSheet.getDataRange().getValues();
  const existingProgressIdx = progressData.findIndex(row => String(row[0]) === String(data.agentId) && String(row[1]) === String(data.lessonId));
  
  let attempts = 0;
  if (existingProgressIdx !== -1) {
    attempts = parseInt(progressData[existingProgressIdx][5]) || 0;
    if (progressData[existingProgressIdx][2] === 'COMPLETADO') {
      throw new Error("Esta lección ya ha sido superada.");
    }
    if (attempts >= 1) { // Límite de 1 intento
      throw new Error("Has finalizado esta evaluación. Contacta a un Director si necesitas un re-intento.");
    }
  }

  const isCorrect = data.score >= 60;
  const xpReward = isCorrect ? (parseInt(lesson[12]) || 10) : 0;
  attempts += 1;

  // 2. Guardar/Actualizar progreso
  const now = new Date();
  const progressRow = [
    data.agentId,
    data.lessonId,
    isCorrect ? 'COMPLETADO' : 'FALLIDO',
    data.score || 0,
    now,
    attempts
  ];

  if (existingProgressIdx !== -1) {
    progressSheet.getRange(existingProgressIdx + 1, 1, 1, progressRow.length).setValues([progressRow]);
  } else {
    progressSheet.appendRow(progressRow);
  }
  
  // 3. Otorgar XP si es correcto
  let agentName = "Agente";
  if (isCorrect && xpReward > 0) {
    const directoryData = directorySheet.getDataRange().getValues();
    const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
    const idCol = headers.indexOf('ID');
    const xpColIdx = (headers.indexOf('XP') + 1) || (headers.indexOf('PUNTOS XP') + 1);
    const leadershipColIdx = (headers.indexOf('PUNTOS LIDERAZGO') + 1) || (headers.indexOf('LIDERAZGO') + 1);
    
    const rowIdx = directoryData.findIndex(row => String(row[idCol]) === String(data.agentId));
    if (rowIdx !== -1) {
      agentName = directoryData[rowIdx][headers.indexOf('NOMBRE')] || "Agente";
      // Sumar al XP total
      if (xpColIdx > 0) {
        const currentXp = parseInt(directorySheet.getRange(rowIdx + 1, xpColIdx).getValue()) || 0;
        directorySheet.getRange(rowIdx + 1, xpColIdx).setValue(currentXp + xpReward);
      }
      // Sumar a Liderazgo/Academia (usando columna de Liderazgo por ahora)
      if (leadershipColIdx > 0) {
        const currentLead = parseInt(directorySheet.getRange(rowIdx + 1, leadershipColIdx).getValue()) || 0;
        directorySheet.getRange(rowIdx + 1, leadershipColIdx).setValue(currentLead + xpReward);
      }
    }
  }
  
  // 4. Notificar a Telegram
  if (isCorrect) {
    const lessonTitle = lesson[3];
    const telegramMessage = `🎓 <b>LOGRO ACADÉMICO</b>\n\n<b>• Agente:</b> ${agentName}\n<b>• Lección:</b> ${lessonTitle}\n<b>• Resultado:</b> APROBADO ✅\n<b>• Recompensa:</b> +${xpReward} XP Tácticos`;
    sendTelegramNotification(telegramMessage);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    isCorrect, 
    xpAwarded: xpReward 
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Guarda datos de la academia de forma masiva (Cursos y Lecciones).
 */
function saveBulkAcademyData(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
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
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Datos actualizados masivamente." })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Actualiza las estadísticas tácticas y el resumen de un agente.
 */
function updateTacticalStats(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Resetea los intentos y progreso de un estudiante en la academia.
 */
function resetStudentAttempts(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const progressSheet = ss.getSheetByName(CONFIG.ACADEMY_PROGRESS_SHEET);
  if (!progressSheet) throw new Error("Hoja de progreso no encontrada.");
  
  const range = progressSheet.getDataRange();
  const values = range.getValues();
  let deletedCount = 0;
  
  // Eliminamos de abajo hacia arriba para evitar problemas con los índices al borrar filas
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(data.agentId)) {
      progressSheet.deleteRow(i + 1);
      deletedCount++;
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    deletedCount 
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Envía las credenciales de un agente específico a Telegram.
 */
function sendAgentCredentials(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Envía las credenciales de TODOS los agentes a Telegram.
 */
function bulkSendCredentials() {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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

  return ContentService.createTextOutput(JSON.stringify({ success: true, count: count })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Registra una credencial biométrica para un agente.
 */
function registerBiometrics(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
  const directoryData = sheet.getDataRange().getValues();
  const headers = directoryData[0].map(h => String(h).trim().toUpperCase());
  
  const idCol = headers.indexOf('ID');
  const bioCol = headers.indexOf('BIOMETRIC_CREDENTIAL') + 1;
  
  if (bioCol === 0) throw new Error("Columna BIOMETRIC_CREDENTIAL no encontrada.");

  const rowIdx = directoryData.findIndex(row => String(row[idCol]) === String(data.agentId));
  if (rowIdx === -1) throw new Error("Agente no encontrado.");

  sheet.getRange(rowIdx + 1, bioCol).setValue(data.credential);
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Verifica una credencial biométrica.
 */
function verifyBiometrics(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
  
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    credential: storedCredential 
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Obtiene el versículo del día.
 */
function getDailyVerse() {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.VERSES_SHEET);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Hoja de versos no encontrada" })).setMimeType(ContentService.MimeType.JSON);
  
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
     // Versículo por defecto si no hay nada en la hoja
     return ContentService.createTextOutput(JSON.stringify({ 
       success: true, 
       data: { verse: "Mas el que persevere hasta el fin, este será salvo.", reference: "Mateo 24:13" } 
     })).setMimeType(ContentService.MimeType.JSON);
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
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      data: { verse: verseFound[verseIdx], reference: verseFound[refIdx] } 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Si no hay para hoy, dar uno aleatorio
  const randomRow = values[Math.floor(Math.random() * (values.length - 1)) + 1];
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    data: { verse: randomRow[verseIdx], reference: randomRow[refIdx] } 
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Actualiza el contador de rachas y tareas semanales de un agente.
 * v3: Lógica de racha DIARIA vinculada a la fecha.
 */
function updateStreaks(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.STREAKS_SHEET);
  if (!sheet) throw new Error("Hoja de rachas no encontrada");

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const agentIdIdx = headers.indexOf('AGENT_ID');
  const streakIdx = headers.indexOf('STREAK_COUNT');
  const lastDateIdx = headers.indexOf('LAST_COMPLETED_DATE'); 
  const tasksIdx = headers.indexOf('TASKS_JSON');

  const rowIdx = values.findIndex(row => String(row[agentIdIdx]) === String(data.agentId));
  
  const today = new Date();
  const todayStr = Utilities.formatDate(today, "GMT-4", "yyyy-MM-dd");
  
  const streakData = {
    AGENT_ID: data.agentId,
    STREAK_COUNT: 0,
    LAST_COMPLETED_DATE: '',
    TASKS_JSON: JSON.stringify(data.tasks || [])
  };

  if (rowIdx !== -1) {
    streakData.STREAK_COUNT = parseInt(values[rowIdx][streakIdx]) || 0;
    streakData.LAST_COMPLETED_DATE = String(values[rowIdx][lastDateIdx]);
    
    // Si hoy completó la tarea y no se había registrado hoy
    if (streakData.LAST_COMPLETED_DATE !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = Utilities.formatDate(yesterday, "GMT-4", "yyyy-MM-dd");
      
      // Si la última vez fue ayer, +1. Si no, racha = 1.
      if (streakData.LAST_COMPLETED_DATE === yesterdayStr) {
        streakData.STREAK_COUNT += 1;
      } else {
        streakData.STREAK_COUNT = 1;
      }
      streakData.LAST_COMPLETED_DATE = todayStr;
      
      sendPushNotification("🔥 ¡RACHA INCREMENTADA!", `Has completado tus tareas de hoy. ¡Tu racha ahora es de ${streakData.STREAK_COUNT} días!`);

      // --- HITOS DE XP (Cada 5 días) ---
      if (streakData.STREAK_COUNT % 5 === 0) {
        let bonusXP = 0;
        if (streakData.STREAK_COUNT === 5) bonusXP = 5;
        else if (streakData.STREAK_COUNT >= 10 && streakData.STREAK_COUNT < 20) bonusXP = 7.5;
        else if (streakData.STREAK_COUNT >= 20) bonusXP = 10;

        if (bonusXP > 0) {
          try {
            const dirSheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
            const dirData = dirSheet.getDataRange().getValues();
            const dirHeaders = dirData[0].map(h => String(h).trim().toUpperCase());
            const leadColIdx = (dirHeaders.indexOf('PUNTOS LIDERAZGO') + 1);
            const idColIdx = dirHeaders.indexOf('ID');

            const agentRowIdx = dirData.findIndex(row => String(row[idColIdx]) === String(data.agentId));
            if (agentRowIdx !== -1 && leadColIdx > 0) {
              const currentLead = parseInt(dirSheet.getRange(agentRowIdx + 1, leadColIdx).getValue()) || 0;
              dirSheet.getRange(agentRowIdx + 1, leadColIdx).setValue(currentLead + bonusXP);
              
              sendPushNotification("⭐ BONO DE RACHA", `¡Excelente constancia! Has ganado +${bonusXP} XP extra por tu hito de ${streakData.STREAK_COUNT} días.`);
            }
          } catch (e) {
            console.error("Error acreditando bono de racha:", e);
          }
        }
      }
    }
    
    const row = [streakData.AGENT_ID, streakData.STREAK_COUNT, streakData.LAST_COMPLETED_DATE, streakData.TASKS_JSON];
    sheet.getRange(rowIdx + 1, 1, 1, row.length).setValues([row]);
  } else {
    // Nuevo registro: Primera racha
    streakData.STREAK_COUNT = 1;
    streakData.LAST_COMPLETED_DATE = todayStr;
    sheet.appendRow([streakData.AGENT_ID, streakData.STREAK_COUNT, streakData.LAST_COMPLETED_DATE, streakData.TASKS_JSON]);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true, streak: streakData.STREAK_COUNT })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Envía una notificación masiva a todos los agentes y la guarda en el historial interno.
 */
function sendBroadcastNotification(data) {
  const { title, message, category = 'ALERTA', emisor = 'DIRECTOR' } = data;
  if (!title || !message) throw new Error("Título y mensaje son requeridos para el broadcast.");

  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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

  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: "Aviso transmitido y guardado en base de datos táctica." 
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Recupera el historial de notificaciones internas.
 */
function getNotifications() {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.NOTIFICATIONS_SHEET);
  
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
  
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
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: notifications.slice(0, 50) })).setMimeType(ContentService.MimeType.JSON);
}


