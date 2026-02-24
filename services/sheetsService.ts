
import { Agent, UserRole, InboxNotification } from "../types";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7d1GqCkxSDU1jbLUh2vyxP1jxgQGw_lwP4Z6vlIbc0-ZHmUweWMaLHweAGbJN8WNs/exec";

// --- CONFIGURACIÓN DE MAPEOS RESILIENTES ---
const MAPPINGS: any = {
  'ID': ['id', 'id cédula', 'cedula', 'identificación', 'id cedula'],
  'NOMBRE': ['name', 'nombre', 'nombre completo', 'nombre_completo'],
  'PIN': ['pin', 'contraseña/pin', 'password', 'acceso', 'pin de acceso'],
  'RANGO': ['rank', 'rango'],
  // IMPORTANTE: Variantes con ESPACIO van PRIMERO — el spreadsheet tiene columnas
  // legacy 'PUNTOS XP'/'PUNTOS BIBLIA' (con datos reales) Y columnas nuevas
  // 'XP'/'PUNTOS_BIBLIA' (con datos incompletos). indexOf retorna la primera.
  'XP': ['puntos xp', 'xp', 'experiencia', 'puntos'],
  'NIVEL_ACCESO': ['accesslevel', 'nivel de acceso', 'cargo', 'rol', 'cargo', 'nivel_acceso'],
  'FOTO_URL': ['photourl', 'foto', 'imagen', 'foto url', 'foto_url'],
  'ROL': ['role', 'rol', 'función'],
  'TALENTO': ['talent', 'talento', 'área', 'habilidad'],
  'BAUTIZADO': ['baptismstatus', 'bautizado'],
  'ESTADO': ['status', 'estado'],
  'BIBLIA': ['puntos biblia', 'bible', 'biblia', 'puntos_biblia'],
  'APUNTES': ['puntos apuntes', 'notes', 'apuntes', 'puntos_apuntes', 'libretas'],
  'LIDERAZGO': ['puntos liderazgo', 'leadership', 'liderazgo', 'puntos_liderazgo'],
  'WHATSAPP': ['whatsapp', 'teléfono', 'celular', 'felefono', 'telefono', 'tel\u00C3\u00A9fono'],
  'FECHA_NACIMIENTO': ['birthday', 'fecha de nacimiento', 'nacimiento', 'fecha_nacimiento'],
  'FECHA_INGRESO': ['joineddate', 'fecha de ingreso', 'ingreso', 'fecha_ingreso'],
  'RELACION_CON_DIOS': ['relationshipwithgod', 'relacion con dios', 'compromiso', 'relacion_con_dios'],
  'PREGUNTA': ['securityquestion', 'pregunta_seguridad', 'pregunta'],
  'RESPUESTA': ['securityanswer', 'respuesta_seguridad', 'respuesta'],
  'MUST_CHANGE': ['mustchangepassword', 'cambio_obligatorio_pin', 'cambio', 'must_change'],
  'STATS': ['tacticalstats', 'stats_json', 'stats'],
  'SUMMARY': ['tacticalsummary', 'tactor_summary', 'summary'],
  'LAST_UPDATE': ['lastaiupdate', 'last_ai_update', 'update'],
  'BIOMETRIC': ['biometric_credential', 'biometric'],
  'STREAK': ['streak_count', 'streak'],
  'TASKS': ['tasks_json', 'tasks'],
  'LAST_ATTENDANCE': ['last_attendance', 'última asistencia'],
  'LAST_COURSE': ['last_course', 'último curso'],
  'LAST_STREAK_DATE': ['last_completed_date', 'laststreakdate', 'racha_fecha'],
  'NOTIF_PREFS': ['notif_prefs', 'notif_prefs_json', 'preferencias_notif', 'notif_prefs']
};

/**
 * @description Mapea datos crudos (independiente del formato) a la interfaz Agent.
 */
const mapToAgent = (getV: (key: string) => any, id: string): Agent => {
  const realId = (id && id !== "undefined" && id !== "null" && id !== "") ? id : (String(getV('ID')) || "PENDIENTE");
  const access = String(getV('NIVEL_ACCESO') || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let role = UserRole.STUDENT;

  if (realId.includes('20389331') || access.includes("DIRECTOR")) role = UserRole.DIRECTOR;
  else if (realId.includes('4251') || access.includes("LIDER") || access.includes("LEADER") || access.includes("LÍDER")) role = UserRole.LEADER;

  const formatDate = (val: any) => {
    if (!val || val === 'N/A' || val === '') return 'N/A';
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('es-VE', { timeZone: 'America/Caracas' });
  };

  const biblePoints = parseInt(getV('BIBLIA'), 10) || 0;
  const notesPoints = parseInt(getV('APUNTES'), 10) || 0;
  const leadershipPoints = parseInt(getV('LIDERAZGO'), 10) || 0;
  // FIX #1: Use backend XP column when available (quiz/attendance add XP independently)
  const rawXp = parseInt(getV('XP'), 10) || 0;
  const sumXp = biblePoints + notesPoints + leadershipPoints;
  const totalXp = Math.max(rawXp, sumXp);

  return {
    id: realId,
    name: getV('NOMBRE') || "AGENTE DESCONOCIDO",
    photoUrl: getV('FOTO_URL') || "",
    rank: getV('RANGO') || "RECLUTA",
    role: getV('ROL') || "OPERATIVO",
    talent: getV('TALENTO') || "PENDIENTE",
    baptismStatus: getV('BAUTIZADO') || "NO",
    status: getV('ESTADO') || "ACTIVO",
    xp: totalXp,
    bible: biblePoints,
    notes: notesPoints,
    leadership: leadershipPoints,
    userRole: role,
    pin: String(getV('PIN') || "").trim(),
    idSignature: `V37-SIG-${realId}`,
    joinedDate: formatDate(getV('FECHA_INGRESO')),
    birthday: formatDate(getV('FECHA_NACIMIENTO')),
    whatsapp: getV('WHATSAPP') || "S/D",
    relationshipWithGod: getV('RELACION_CON_DIOS') || "PENDIENTE",
    accessLevel: getV('NIVEL_ACCESO') || "ESTUDIANTE",
    securityQuestion: getV('PREGUNTA') || "",
    securityAnswer: getV('RESPUESTA') || "",
    mustChangePassword: String(getV('MUST_CHANGE')).toUpperCase() === 'SI',
    tacticalStats: (() => {
      try {
        const stats = getV('STATS');
        return stats ? JSON.parse(stats) : undefined;
      } catch (e) { return undefined; }
    })(),
    tacticalSummary: getV('SUMMARY') || "",
    lastAiUpdate: getV('LAST_UPDATE') || "",
    biometricCredential: getV('BIOMETRIC') || "",
    streakCount: parseInt(getV('STREAK')) || 0,
    lastStreakDate: getV('LAST_STREAK_DATE') || "",
    lastAttendance: getV('LAST_ATTENDANCE') || "",
    // FIX #5: Wrap in try/catch to prevent malformed JSON from crashing agent loading
    weeklyTasks: (() => {
      try { const t = getV('TASKS'); return t ? JSON.parse(t) : []; }
      catch (e) { return []; }
    })(),
    notifPrefs: (() => {
      try {
        const prefs = getV('NOTIF_PREFS');
        return prefs ? JSON.parse(prefs) : { read: [], deleted: [] };
      } catch (e) { return { read: [], deleted: [] }; }
    })(),
    lastCourse: getV('LAST_COURSE') || ""
  };
};

// Función para hacer solicitudes POST al backend de Apps Script
const postToAction = async (action: string, data: any) => {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, data }),
    redirect: 'follow'
  });

  if (!response.ok && response.status !== 0) {
    throw new Error(`Error en la solicitud a la API: ${response.statusText}`);
  }
  return response.json();
};

export const fetchNotifications = async (): Promise<InboxNotification[]> => {
  const data = await postToAction('get_notifications', {});
  return data.success ? data.data : [];
};

let _lastSyncErrorTime = 0;
let _syncErrorLogged = false;
const SYNC_BACKOFF_MS = 5 * 60 * 1000;

/** Call this to force the next fetch to bypass backoff (e.g. after a manual action). */
export const resetSyncBackoff = () => { _lastSyncErrorTime = 0; _syncErrorLogged = false; };

export const fetchAgentsFromSheets = async (): Promise<Agent[]> => {
  if (_lastSyncErrorTime && (Date.now() - _lastSyncErrorTime < SYNC_BACKOFF_MS)) return [];

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?timestamp=${new Date().getTime()}`);
    if (!response.ok) throw new Error(`HTTP ERROR: ${response.status}`);

    let result;
    try {
      result = await response.json();
    } catch (e) {
      console.error("Failed to parse JSON response:", await response.text());
      throw new Error("Respuesta inválida del servidor.");
    }

    if (result.error) throw new Error(`Error del backend: ${result.error}`);

    _lastSyncErrorTime = 0;
    _syncErrorLogged = false;

    const rawContent = Array.isArray(result) ? result : (result.data || []);
    if (!Array.isArray(rawContent) || rawContent.length === 0) return [];

    const isMatrix = Array.isArray(rawContent[0]);

    if (isMatrix) {
      const rawHeaders = rawContent[0].map((h: any) => String(h).trim().toLowerCase());
      const rows = rawContent.slice(1);

      return rows.map((row: any[]): Agent => {
        const getV = (key: string) => {
          const variants = [...(MAPPINGS[key] || []), key.toLowerCase(), key];
          for (const v of variants) {
            const idx = rawHeaders.indexOf(v.toLowerCase());
            if (idx !== -1 && row[idx] !== undefined) return row[idx];
          }
          return '';
        };
        const idVal = String(getV('ID'));
        return mapToAgent(getV, idVal);
      });
    } else {
      return rawContent.map((item: any): Agent => {
        const getV = (key: string) => {
          const variants = [...(MAPPINGS[key] || []), key.toLowerCase(), key];
          for (const v of variants) {
            if (item[v] !== undefined) return item[v];
            const match = Object.keys(item).find(k => k.toLowerCase().trim() === v.toLowerCase());
            if (match) return item[match];
          }
          return '';
        };
        const idVal = String(getV('ID'));
        return mapToAgent(getV, idVal);
      });
    }
  } catch (error) {
    _lastSyncErrorTime = Date.now();
    return [];
  }
};

export const uploadImage = async (base64File: string, file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const response = await postToAction('upload_image', {
      file: base64File,
      mimeType: file.type,
      filename: file.name
    });
    return response.success ? { success: true, url: response.url } : { success: false, error: response.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const enrollAgent = async (formData: any): Promise<{ success: boolean; error?: string }> => {
  try { return await postToAction('enroll_agent', formData); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const submitTransaction = async (rawString: string, type: 'ASISTENCIA' | 'SALIDA' | 'IDENTIFICACION' = 'IDENTIFICACION', referidoPor?: string) => {
  try {
    return await postToAction('register_id_scan', {
      scannedId: rawString,
      location: 'CORE_V37_NODE',
      type: type,
      timestamp: new Date().toISOString(),
      referidoPor
    });
  } catch (error: any) { return { success: false, error: error.message }; }
};

export const reconstructDatabase = async () => {
  try { return await postToAction('reconstruct_db', {}); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const updateAgentPoints = async (agentId: string, type: 'BIBLIA' | 'APUNTES' | 'LIDERAZGO', points: number) => {
  try {
    return await postToAction('update_agent_points', {
      agentId,
      type,
      points
    });
  } catch (error: any) { return { success: false, error: error.message }; }
};

export const getSecurityQuestion = async (agentId: string) => {
  try { return await postToAction('get_security_question', { agentId }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const resetPasswordWithAnswer = async (agentId: string, answer: string) => {
  try { return await postToAction('reset_password_with_answer', { agentId, answer }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const updateAgentPin = async (agentId: string, newPin: string, question?: string, answer?: string) => {
  try { return await postToAction('update_user_password', { agentId, newPin, question, answer }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

// Aliases and Guides Module
export const uploadFile = uploadImage;

export const fetchGuides = async (userRole: UserRole) => {
  try {
    const response = await postToAction('get_guides', { userRole });
    return response.success ? response.data : [];
  } catch (error: any) { return []; }
};

export const deductPercentagePoints = async (agentId: string, percentage: number) => {
  try { return await postToAction('deduct_percentage_points', { agentId, percentage }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const uploadGuideMetadata = async (name: string, type: 'ESTUDIANTE' | 'LIDER', url: string) => {
  try { return await postToAction('upload_guide', { name, type, url }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const deleteGuide = async (guideId: string) => {
  try { return await postToAction('delete_guide', { guideId }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const updateAgentPhoto = async (agentId: string, photoUrl: string) => {
  try { return await postToAction('update_agent_photo', { agentId, photoUrl }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const fetchVisitorRadar = async () => {
  try {
    const response = await postToAction('get_visitor_radar', {});
    return response.success ? response.data : [];
  } catch (error: any) { return []; }
};

export const fetchAcademyData = async (agentId?: string) => {
  try {
    const response = await postToAction('get_academy_data', { agentId });
    return response.success ? response.data : { courses: [], lessons: [], progress: [] };
  } catch (error: any) { return { courses: [], lessons: [], progress: [] }; }
};

export const submitQuizResult = async (agentId: string, lessonId: string, score: number) => {
  try { return await postToAction('submit_quiz_result', { agentId, lessonId, score }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const saveBulkAcademyData = async (data: { courses: any[], lessons: any[] }) => {
  try { return await postToAction('save_bulk_academy_data', data); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const updateAgentAiProfile = async (agentId: string, stats: any, summary: string) => {
  try {
    return await postToAction('update_tactical_stats', {
      agentId,
      stats: JSON.stringify(stats),
      summary,
      lastUpdate: new Date().toISOString()
    });
  } catch (error: any) { return { success: false, error: error.message }; }
};

export const deleteAcademyCourse = async (courseId: string) => {
  try { return await postToAction('delete_academy_course', { courseId }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const deleteAcademyLesson = async (lessonId: string) => {
  try { return await postToAction('delete_academy_lesson', { lessonId }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const resetStudentAttempts = async (agentId: string, courseId?: string, lessonId?: string) => {
  try { return await postToAction('reset_student_attempts', { agentId, courseId, lessonId }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const sendAgentCredentials = async (agentId: string) => {
  try { return await postToAction('send_agent_credentials', { agentId }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const bulkSendCredentials = async () => {
  try { return await postToAction('bulk_send_credentials', {}); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const registerBiometrics = async (agentId: string, credential: string) => {
  try { return await postToAction('register_biometrics', { agentId, credential }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const verifyBiometrics = async (agentId: string) => {
  try { return await postToAction('verify_biometrics', { agentId }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const fetchDailyVerse = async () => {
  try { return await postToAction('get_daily_verse', {}); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const updateAgentStreaks = async (agentId: string, isWeekComplete: boolean, tasks: any[], agentName?: string) => {
  try { return await postToAction('update_streaks', { agentId, isWeekComplete, tasks, agentName }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const broadcastNotification = async (title: string, message: string) => {
  try { return await postToAction('send_broadcast_notification', { title, message }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const updateNotifPrefs = async (agentId: string, prefs: { read: string[]; deleted: string[] }) => {
  try { return await postToAction('update_notif_prefs', { agentId, prefs }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const syncFcmToken = async (agentId: string, token: string) => {
  try { return await postToAction('sync_fcm_token', { agentId, token }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const confirmDirectorAttendance = async (agentId: string, agentName: string) => {
  try { return await postToAction('confirm_director_attendance', { agentId, agentName }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const createEvent = async (eventData: { title: string; date: string; time: string; description: string }) => {
  return postToAction('create_event', eventData);
};

export const fetchActiveEvents = async () => {
  const res = await postToAction('get_active_events', {});
  return res.success ? res.data : [];
};

export const confirmEventAttendance = async (data: { agentId: string; agentName: string; eventId: string; eventTitle: string }) => {
  return postToAction('confirm_event_attendance', data);
};

export const fetchUserEventConfirmations = async (agentId: string) => {
  const res = await postToAction('get_user_confirmations', { agentId });
  return res.success ? res.confirmations : [];
};

export const deleteEvent = async (eventId: string) => {
  return postToAction('delete_event', { eventId });
};

export const applyAbsencePenalties = async () => {
  try { return await postToAction('apply_absence_penalties', {}); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const activateVisitorAsAgent = async (visitorId: string, formData: any) => {
  try { return await postToAction('activate_visitor_as_agent', { visitorId, formData }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

export const deleteAgent = async (agentId: string) => {
  try { return await postToAction('delete_agent', { agentId }); }
  catch (error: any) { return { success: false, error: error.message }; }
};

// system of Promotion
export const fetchTasks = async () => {
  const res = await postToAction('get_tasks', {});
  return res.success ? res.tasks : [];
};

export const createTask = async (data: { title: string; description: string; area: string; requiredLevel: string; xpReward: number; maxSlots: number }) => {
  return postToAction('create_task', data);
};

export const deleteTask = async (taskId: string) => {
  return postToAction('delete_task', { taskId });
};

export const submitTaskCompletion = async (taskId: string, agentId: string, agentName: string) => {
  return postToAction('submit_task_completion', { taskId, agentId, agentName });
};

export const verifyTask = async (data: { taskId: string; agentId: string; agentName: string; verifiedBy: string; xpReward: number; taskTitle: string }) => {
  return postToAction('verify_task', data);
};

export const fetchPromotionStatus = async (agentId: string) => {
  return postToAction('get_promotion_status', { agentId });
};

export const promoteAgentAction = async (data: { agentId: string; agentName: string; newRank: string; xp: number; certificates: number }) => {
  return postToAction('promote_agent', data);
};

export const fetchNewsFeed = async () => {
  const res = await postToAction('get_news_feed', {});
  return res.success ? res.news : [];
};

export const fetchTaskProgress = async (agentId: string) => {
  return postToAction('get_promotion_status', { agentId });
};

export const fetchTaskRecruits = async () => {
  try {
    const res = await postToAction('get_task_recruits', {});
    return res.success ? res.recruits : [];
  } catch (error: any) { return []; }
};

export const removeRecruitFromTask = async (taskId: string, agentId: string) => {
  return postToAction('remove_recruit_from_task', { taskId, agentId });
};

export const fetchBadges = async () => {
  try {
    const res = await postToAction('get_badges', {});
    return res.success ? res.badges : [];
  } catch (error: any) { return []; }
};

export const reconcileXP = async () => {
  try { return await postToAction('reconcile_xp', {}); }
  catch (error: any) { return { success: false, error: error.message }; }
};
