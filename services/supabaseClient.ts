import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials missing. Parallel sync will be disabled.');
}

// BLINDAJE: Limpiar cualquier sesión zombi de Supabase Auth en localStorage.
// persistSession:false solo previene NUEVAS sesiones. Si hay una vieja, sigue enviando
// el JWT "authenticated" y Supabase bloquea las peticiones con 400/401.
if (typeof window !== 'undefined') {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            // Preservar las keys que NO son de auth
            if (key.includes('auth-token') || key.includes('auth.')) {
                keysToRemove.push(key);
            }
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
}

// Only create the client if we have the credentials, or pass dummy ones if empty 
// (though createClient will throw if url is empty, so we need to handle it)
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);

// Doble blindaje: Forzar signOut por si queda alguna sesión en memoria
supabase.auth.signOut().catch(() => { });
