const url = "https://dnzrnpslfabowgtikora.supabase.co/rest/v1/agentes?select=id,nombre,xp,rango,cargo,foto_url,status,talent,user_role,joined_date,bible,notes,leadership,streak_count,last_attendance,last_streak_date,weekly_tasks,pin,whatsapp,baptism_status,birthday,relationship_with_god,must_change_password,is_ai_profile_pending,tactical_stats,tactor_summary,iq_level&limit=1";

fetch(url, {
    headers: {
        'apikey': 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7',
        'Authorization': 'Bearer sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7'
    }
}).then(res => res.json()).then(data => {
    console.log(data);
}).catch(err => {
    console.error("Error:", err);
});
