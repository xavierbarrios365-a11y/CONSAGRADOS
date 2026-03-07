/**
 * Migration Script: Google Drive Photos → Cloudinary
 * 
 * This script reads all agents from Supabase, downloads their Google Drive
 * profile photos, uploads them to Cloudinary, and updates the DB with the
 * new URLs.
 * 
 * Usage: node scripts/migrate_photos_to_cloudinary.mjs
 */

import { createClient } from '@supabase/supabase-js';

// --- CONFIG ---
const SUPABASE_URL = 'https://dnzrnpslfabowgtikora.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';
const CLOUDINARY_CLOUD_NAME = 'dko8viuwt';
const CLOUDINARY_UPLOAD_PRESET = 'consagrados';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

// --- HELPERS ---

/**
 * Extracts a Google Drive file ID from various URL formats.
 */
function extractDriveFileId(url) {
    if (!url || typeof url !== 'string') return null;

    // Skip non-Drive URLs
    if (url.includes('cloudinary.com') || url.includes('ui-avatars.com') || url.includes('supabase.co')) {
        return null; // Already migrated or not a Drive URL
    }

    const driveRegex = /(?:id=|\/d\/|file\/d\/|open\?id=|uc\?id=|\/file\/d\/|preview\/d\/|open\?id=)([\w-]{25,100})/;
    const match = url.match(driveRegex);

    if (match && match[1]) return match[1];

    // Raw file ID (no URL structure)
    if (url.length >= 25 && !url.includes('/') && !url.includes('.') && !url.includes(':')) {
        return url;
    }

    return null;
}

/**
 * Downloads an image from Google Drive's lh3 endpoint.
 */
async function downloadFromDrive(fileId) {
    const url = `https://lh3.googleusercontent.com/d/${fileId}=w800`;
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Download failed (${res.status}): ${url}`);
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();
    return { buffer: Buffer.from(buffer), contentType };
}

/**
 * Uploads a buffer to Cloudinary using the unsigned preset.
 */
async function uploadToCloudinary(buffer, contentType, agentName) {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: contentType });
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const safeName = agentName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    formData.append('file', blob, `${safeName}.${ext}`);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'consagrados/profiles');

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Cloudinary upload failed: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return data.secure_url;
}

// --- MAIN ---
async function main() {
    console.log('🔄 MIGRACIÓN DE FOTOS: Google Drive → Cloudinary');
    console.log('='.repeat(60));

    // 1. Get all agents
    const { data: agents, error } = await supabase
        .from('agentes')
        .select('id, nombre, foto_url');

    if (error) {
        console.error('❌ Error fetching agents:', error.message);
        process.exit(1);
    }

    console.log(`📋 Total agentes: ${agents.length}`);

    const stats = { skipped: 0, migrated: 0, failed: 0 };
    const results = [];

    for (const agent of agents) {
        const fileId = extractDriveFileId(agent.foto_url);

        if (!fileId) {
            stats.skipped++;
            console.log(`⏭️  ${agent.nombre}: NO es URL de Drive, saltado`);
            continue;
        }

        try {
            // Download from Drive
            console.log(`⬇️  ${agent.nombre}: Descargando de Drive (${fileId.substring(0, 15)}...)`);
            const { buffer, contentType } = await downloadFromDrive(fileId);

            // Upload to Cloudinary
            console.log(`⬆️  ${agent.nombre}: Subiendo a Cloudinary...`);
            const newUrl = await uploadToCloudinary(buffer, contentType, agent.nombre);

            // Update Supabase
            const { error: updateError } = await supabase
                .from('agentes')
                .update({ foto_url: newUrl })
                .eq('id', agent.id);

            if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

            stats.migrated++;
            results.push({ id: agent.id, name: agent.nombre, oldUrl: agent.foto_url, newUrl });
            console.log(`✅  ${agent.nombre}: Migrado → ${newUrl.substring(0, 60)}...`);

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 500));

        } catch (err) {
            stats.failed++;
            results.push({ id: agent.id, name: agent.nombre, error: err.message });
            console.error(`❌  ${agent.nombre}: ${err.message}`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log(`   ✅ Migrados: ${stats.migrated}`);
    console.log(`   ⏭️  Saltados: ${stats.skipped}`);
    console.log(`   ❌ Fallidos: ${stats.failed}`);
    console.log('='.repeat(60));

    if (stats.failed > 0) {
        console.log('\n⚠️  AGENTES CON ERRORES:');
        results.filter(r => r.error).forEach(r => {
            console.log(`   - ${r.name} (${r.id}): ${r.error}`);
        });
    }
}

main().catch(console.error);
