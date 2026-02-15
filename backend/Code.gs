
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
    EVENTS_SHEET_NAME: 'CALENDARIO_EVENTOS',
    SERVICE_ACCOUNT: {
      "project_id": "consagrados-c2d78",
      "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDNq6kEzfZMRDLP\nDvSGS3cLuUnf5zFbwFZppBtEyvyKTxL8m80E0BV8rQYmAlaSdG1vEd8bCsqiVp1Y\nVrFc/05yPCUdNRBJjj+6fj6hfq4rGKgm1nq4Wy3SaOAkFNPUS6hO6Ucx4q6+zk7q\n32KdJMfiXOv2cj3nHyBspbq1XG2Leg2zJaxY741Tan8bfnHjLsV29Q4NAVHopEsc\nYaqEQLSzAYA6yIwMe2qJqwbYJPny8Hsh9gKbb9QTTggEIeI5QrPT/KH6fE3nXRfh\n3gX4Kg8OgQ9cWoBompqj55PM9rdkhGHQA1HN0ylV2Fjykfj0Jq+dPhn2oM3UKn+W\nvhJLortDAgMBAAECggEAXOHiUe4mBilifMo3OhMIrz29lCWXz+Tb4ZegTQAS7u9p\nFrXR8BN9MLH/LdkuebOk3F1I0bCc9JWDN6rnLKWMKuDorfkR4vYf57wt0scgJwxa\nnDeOcoWS+wwr9X+GbsDAQOrvISNLYZZQY5gAtBExSBRI6CKNvDv9a7Ooz1Dvk+X5\n129n2U7vOm9oOWcWI4ysjID0L3TfO6jEMBIlH4cxBM4jZXf3v1NYH6IMZxPKI86D\nD97OHngSm8DJQdmVApDsI9Bnt70HHQlSSFDkeien4r3au+7rL1dUuo4wpw7+BcxT\nuSlfFpXldDDSjtLXSjoCKkULJ0gBfUUQurMR+9iYqQKBgQD9S8ULmkpvnYtmbI7H\n6EKrfrB7YPPM0bEpGM/ZBOAuUTlQ+Mx23r+pWgHcOCttyT1+bsaFA8s2OwSJGUjw\nKoGSmX8EgzfPJ1K6+OZTvqC1pPDfXjWMV9PaGmsTkGL2SXuP1RSstee5oav8D617\ns+i0k+406ngIqOg0NcJNVyyKHwKBgQDP3bxEZW1QNjmVAS6MzMCygKzYfMzKHe4O\nkjtj/1XdLhLhUf3n6cPAZjY9bYmp/Wzd1csc6gufhAdV4ObhkgL0ieWy6lw/fKpi\nkeiYjXP8DfnEov1w+s+OhJDBncH1mfReRXJxtzNooLNo+QXx1CNEeiJ7JgdTD+MW\n0VV58DWyXQKBgHNUXJO73MiVYzNvmlNLXY/YT2Ld8iQAFjowIfMeVTTBpudHYVF+\neqYRZWdv69ZBGs7GgX1vDMfUd2w1JxCzSewGF99mH7MipHide8IFugb64vHRY3BT\nTRKxlK+DvouFSc1jp9Y7vRa4liZevQ7mC76s3HkbiSvoPFIJaD7uwkjhAoGAeDzF\nyzZ0TeKf2j4NxCooCNj/olZGS1+WtV0G96fZ7g/ZofZAjaadsawuEchLykWqdINX\ncwk64fGIILfwNWi1RuiBMsX3yE1/bXcC+UNRZOpcoM67FWAvMTwjU6vCZyO/w8we\nEAMtvIbAYKczNhhEsjaHvX5Y3EYjUK6T5+330Y0CgYBsDgDMB0TT7+VggQA5FipB\nDpWe17uO8iIzv7HPTIlcX5m8ZB8pWiaSIm7mHyxkh/n27haLvSLvsNJm5lZni7Zf\nR3k8S2doGXfBBwkr/AahG2e52gbrQiSvd6+pROuIwQvNkTdvNi753o5BpAsgdo/V\nM8tnG9QAfWnKCnaT1eH3Yg==\n-----END PRIVATE KEY-----\n",
      "client_email": "firebase-adminsdk-fbsvc@consagrados-c2d78.iam.gserviceaccount.com"
    },
    OFFICIAL_LOGO_ID: '1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f',
    EVENTS_SHEET_NAME: 'CALENDARIO_EVENTOS'
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
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
    const attendanceSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
    
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
      
      directoryData[0].push('STREAK_COUNT', 'TASKS_JSON');
      for (let i = 1; i < directoryData.length; i++) {
        const agentId = String(directoryData[i][0]);
        const streakInfo = streakMap.get(agentId) || { streak: 0, tasks: '[]' };
        directoryData[i].push(streakInfo.streak, streakInfo.tasks);
      }
    }

    // Virtual Join de Asistencia (Última Fecha)
    if (attendanceSheet) {
      const attenData = attendanceSheet.getDataRange().getValues();
      const lastAttenMap = new Map();
      for (let i = 1; i < attenData.length; i++) {
        const aId = String(attenData[i][0]);
        const aDate = attenData[i][3];
        lastAttenMap.set(aId, aDate); // Se sobreescribe con el último encontrado
      }
      
      directoryData[0].push('LAST_ATTENDANCE');
      for (let i = 1; i < directoryData.length; i++) {
        const agentId = String(directoryData[i][0]);
        const lastDate = lastAttenMap.get(agentId) || '';
        directoryData[i].push(lastDate);
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
  
  if (!file) throw new Error("No se recibió contenido de archivo.");
  
  const decoded = Utilities.base64Decode(file);
  const blob = Utilities.newBlob(decoded, mimeType, filename);
  
  // Loguear tamaño para monitoreo de cuota (Límite sugerido: 10MB para estabilidad en Apps Script)
  const sizeKb = Math.round(blob.getBytes().length / 1024);
  console.log(`📤 Subiendo archivo: ${filename} (${sizeKb} KB) - Mime: ${mimeType}`);

  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  if (!folder) throw new Error("La carpeta de destino en Drive no fue encontrada. Verifique DRIVE_FOLDER_ID.");

  const newFile = folder.createFile(blob);
  newFile.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
  
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
        
        // Notificación de XP por asistencia
        const fcmToken = getAgentFcmToken(payload.scannedId);
        if (fcmToken) {
          sendPushNotification("🛡️ ASISTENCIA REGISTRADA", `¡Buen despliegue, Agente! Has ganado +10 XP por tu asistencia de hoy.`, fcmToken);
        }
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
 * @description Aplica penalizaciones de -5 XP por semanas de inasistencia (Prioriza Domingos).
 */
function applyAbsencePenalties() {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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

  return ContentService.createTextOutput(JSON.stringify({ success: true, agentsPenalized: totalDeductions })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Convierte un visitante en agente, rescatando su XP acumulado.
 */
function activateVisitorAsAgent(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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

    // Notificación de XP si es un cambio positivo o negativo
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

  const fcmToken = getAgentFcmToken(data.agentId);
  if (fcmToken) {
    sendPushNotification("🚨 PENALIZACIÓN EXTRAORDINARIA", `Se ha aplicado una reducción del ${data.percentage}% en todos tus méritos por infracción de protocolo.`, fcmToken);
  }

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
    .addItem('⏰ Activar Versículo Diario', 'setupDailyVerseTrigger')
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
  
  const title = "📚 NUEVO RECURSO DISPONIBLE";
  const msg = `Se ha publicado una nueva guía (${data.type}): ${data.name}.`;
  sendPushNotification(title, msg);

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

      // Notificación Push
      const fcmToken = getAgentFcmToken(data.agentId);
      if (fcmToken) {
        sendPushNotification("🎓 LECCIÓN SUPERADA", `Has aprobado "${lesson[3]}" con éxito. Recompensa: +${xpReward} XP.`, fcmToken);
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

  const rowIdx = values.findIndex(row => String(row[agentIdIdx]).trim().toUpperCase() === String(data.agentId).trim().toUpperCase());
  
  const today = new Date();
  const todayStr = Utilities.formatDate(today, "GMT-4", "yyyy-MM-dd");
  
  let streakCount = 0;
  let lastDate = "";

  if (rowIdx !== -1) {
    streakCount = parseInt(values[rowIdx][streakIdx]) || 0;
    lastDate = String(values[rowIdx][lastDateIdx]);
    
    // Si hoy completó la tarea y no se había registrado hoy
    if (lastDate !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = Utilities.formatDate(yesterday, "GMT-4", "yyyy-MM-dd");
      
      // Si la última vez fue ayer, +1. Si no, racha = 1.
      if (lastDate === yesterdayStr) {
        streakCount += 1;
      } else {
        streakCount = 1;
      }
      lastDate = todayStr;
      
      sendPushNotification("🔥 ¡RACHA INCREMENTADA!", `Has completado tus tareas de hoy. ¡Tu racha ahora es de ${streakCount} días!`);

      // --- HITOS DE XP (Cada 5 días) ---
      if (streakCount % 5 === 0) {
        let bonusXP = 0;
        if (streakCount === 5) bonusXP = 5;
        else if (streakCount >= 10 && streakCount < 20) bonusXP = 7.5;
        else if (streakCount >= 20) bonusXP = 10;

        if (bonusXP > 0) {
          try {
            const dirSheet = ss.getSheetByName(CONFIG.DIRECTORY_SHEET_NAME);
            const dirData = dirSheet.getDataRange().getValues();
            const dirHeaders = dirData[0].map(h => String(h).trim().toUpperCase());
            const leadColIdx = (dirHeaders.indexOf('PUNTOS LIDERAZGO') + 1);
            const idColIdx = dirHeaders.indexOf('ID');

            const agentRowIdx = dirData.findIndex(row => String(row[idColIdx]).trim().toUpperCase() === String(data.agentId).trim().toUpperCase());
            if (agentRowIdx !== -1 && leadColIdx > 0) {
              const currentLead = parseInt(dirSheet.getRange(agentRowIdx + 1, leadColIdx).getValue()) || 0;
              dirSheet.getRange(agentRowIdx + 1, leadColIdx).setValue(currentLead + bonusXP);
              
              sendPushNotification("⭐ BONO DE RACHA", `¡Excelente constancia! Has ganado +${bonusXP} XP extra por tu hito de ${streakCount} días.`);
            }
          } catch (e) {
            console.error("Error acreditando bono de racha:", e);
          }
        }
      }
    }
    
    const row = [data.agentId, streakCount, lastDate, JSON.stringify(data.tasks || [])];
    sheet.getRange(rowIdx + 1, 1, 1, row.length).setValues([row]);
  } else {
    // Nuevo registro: Primera racha
    streakCount = 1;
    lastDate = todayStr;
    sheet.appendRow([data.agentId, streakCount, lastDate, JSON.stringify(data.tasks || [])]);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true, streak: streakCount })).setMimeType(ContentService.MimeType.JSON);
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


/**
 * @description Sincroniza el token de FCM de un agente y lo suscribe al tema masivo.
 */
function syncFcmToken(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, subscription: subscriptionStatus })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Agente no encontrado" })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Confirma asistencia manual para Directores.
 */
function confirmDirectorAttendance(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
    return ContentService.createTextOutput(JSON.stringify({ success: true, alreadyDone: true })).setMimeType(ContentService.MimeType.JSON);
  }

  // Registrar asistencia
  sheet.appendRow([
    data.agentId,
    data.agentName,
    fecha,
    hora,
    'DIRECTOR_CONFIRM',
    'CONFIRMADO MANUALMENTE'
  ]);

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Función programada para enviar el versículo diario a una hora clave.
 * Debe configurarse un disparador (trigger) de tiempo en Apps Script.
 */
function scheduledDailyVerseNotification() {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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

  return ContentService.createTextOutput(JSON.stringify({ success: true, eventId: eventId })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Obtiene los eventos activos (pendientes o de hoy).
 */
function getActiveEvents() {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.EVENTS_SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);

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

  return ContentService.createTextOutput(JSON.stringify({ success: true, data: data })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Confirma asistencia a un evento específico.
 */
function confirmEventAttendance(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET_NAME);
  if (!sheet) throw new Error("Hoja de asistencia no encontrada");

  const now = new Date();
  const fecha = Utilities.formatDate(now, "GMT-4", "yyyy-MM-dd");
  const hora = Utilities.formatDate(now, "GMT-4", "HH:mm:ss");

  // Registro de asistencia
  sheet.appendRow([
    data.agentId,
    data.agentName,
    fecha,
    hora,
    'EVENT_CONFIRM',
    `EVENTO: ${data.eventTitle} (ID: ${data.eventId})`
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

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Elimina un evento.
 */
function deleteEvent(data) {
  const CONFIG = getGlobalConfig();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.EVENTS_SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Hoja de eventos no encontrada" })).setMimeType(ContentService.MimeType.JSON);

  const values = sheet.getDataRange().getValues();
  const idColIdx = values[0].indexOf('ID');
  
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idColIdx]).trim() === String(data.eventId).trim()) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Evento no encontrado" })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * @description Función de prueba para verificar la configuración de notificaciones push (FCM v1).
 */
function testPush() {
  const result = sendPushNotification("PRUEBA TÁCTICA", "Si recibes esto, la configuración de FCM v1 es correcta y el sistema está listo.");
  return "Ejecución completada. Revisa los logs para confirmar el éxito del envío.";
}
