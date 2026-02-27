function migrateStreaksToSupabase() {
    var SUPABASE_URL = 'https://dnzrnpslfabowgtikora.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('RACHAS');

    if (!sheet) {
        Logger.log("❌ No se encontró la hoja RACHAS");
        return;
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0].map(function (h) { return String(h).trim().toUpperCase(); });

    var agentIdIdx = headers.indexOf('AGENT_ID');
    var streakCountIdx = headers.indexOf('STREAK_COUNT');
    var tasksJsonIdx = headers.indexOf('TASKS_JSON');
    var lastDateIdx = headers.indexOf('LAST_COMPLETED_DATE');
    if (lastDateIdx === -1) lastDateIdx = headers.indexOf('LAST_COMPLETED_WEEK');

    if (agentIdIdx === -1 || streakCountIdx === -1) {
        Logger.log("❌ Faltan columnas requeridas en RACHAS");
        return;
    }

    // Agrupar rachas por ID base (ej. "V-20389331" -> "20389331")
    // Tomaremos la racha MÁXIMA que encontremos para cada ID.
    var bestStreaks = {}; // id -> { streak, date, tasks }

    for (var i = 1; i < data.length; i++) {
        var rawId = String(data[i][agentIdIdx]).trim().toUpperCase();
        if (!rawId) continue;

        // Normalizar ID (quitar V-, sahelxbm -> 20389331, etc)
        var normalId = rawId.replace(/^V-*/i, '').trim();
        if (normalId === 'SAHELXBM' || normalId === 'DAVIDJMB99' || normalId === 'SOLISBETHBM') {
            // En Supabase sus IDs reales probablemente sean los numéricos o CON-xxx. 
            // Vamos a intentar hacer el update buscando por nombre también o mapeo duro
            if (normalId === 'SAHELXBM') normalId = '20389331';
            // Agregaremos más adelante una lógica de búsqueda.
        }

        var streak = parseInt(data[i][streakCountIdx]) || 0;
        var tasks = data[i][tasksJsonIdx] ? String(data[i][tasksJsonIdx]) : '[]';

        var lastDate = '';
        if (lastDateIdx !== -1 && data[i][lastDateIdx]) {
            var val = data[i][lastDateIdx];
            if (val instanceof Date) lastDate = val.toISOString();
            else lastDate = String(val).trim();
        }

        if (!bestStreaks[normalId] || streak > bestStreaks[normalId].streak) {
            bestStreaks[normalId] = {
                streak: streak,
                date: lastDate,
                tasks: tasks,
                originalId: rawId
            };
        }
    }

    Logger.log("✅ Encontradas " + Object.keys(bestStreaks).length + " rachas únicas a migrar.");

    // Para cada racha, hacer PATCH a Supabase
    var success = 0;
    var keys = Object.keys(bestStreaks);

    for (var k = 0; k < keys.length; k++) {
        var id = keys[k];
        var info = bestStreaks[id];
        var parsedTasks = [];
        try { parsedTasks = JSON.parse(info.tasks); } catch (e) { }

        var payload = {
            streak_count: info.streak,
            last_streak_date: info.date,
            weekly_tasks: parsedTasks
        };

        // Intentamos por ID exacto (eq.id) o si es el ID original (ilike.id)
        // Usamos el endpoint REST de Supabase con `eq.id=id`
        var url = SUPABASE_URL + '/rest/v1/agentes?id=ilike.%25' + encodeURIComponent(id) + '%25';

        var options = {
            method: "PATCH",
            contentType: "application/json",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": "Bearer " + SUPABASE_KEY,
                "Prefer": "return=minimal"
            },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        };

        try {
            var response = UrlFetchApp.fetch(url, options);
            if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
                success++;
            } else {
                Logger.log("⚠️ Falló update para " + id + ": " + response.getContentText());
            }
        } catch (e) {
            Logger.log("❌ Error fatal con " + id + ": " + e.message);
        }
    }

    Logger.log("🎯 COMPLETADO. Rachas inyectadas a Supabase: " + success);
}
