import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials missing. Parallel sync will be disabled.');
}

// BLINDAJE NUCLEAR: Eliminar TODAS las claves de Supabase Auth del localStorage
// para garantizar que el cliente SIEMPRE use el rol 'anon' y nunca 'authenticated'.
// Esto previene errores 401/403 "permission denied" en TODAS las tablas.
if (typeof window !== 'undefined') {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
            keysToRemove.push(key);
        }
    }
    if (keysToRemove.length > 0) {
        console.warn(`🧹 Limpiando ${keysToRemove.length} claves de sesión Supabase zombi`);
        keysToRemove.forEach(k => localStorage.removeItem(k));
    }
}

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
