import fs from 'fs';
import pg from 'pg';
const { Client } = pg;

const connectionString = "postgresql://postgres.dnzrnpslfabowgtikora:PbNMjhiYDbLxqMza@aws-1-us-east-2.pooler.supabase.com:6543/postgres";

const files = [
    "update_iq_rpc.sql",
    "game_expansion.sql",
    "fix_notifications_schema.sql",
    "fix_academy_delete_permissions.sql",
    "fix_agentes_permissions.sql",
    "supabase_secure_rpcs.sql"
];

async function runScripts() {
    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();
        console.log("Connected to Supabase.");

        for (const file of files) {
            if (fs.existsSync(file)) {
                console.log(`Running script: ${file}`);
                const sql = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
                await client.query(sql);
                console.log(`Successfully applied: ${file}`);
            } else {
                console.log(`File not found, skipping: ${file}`);
            }
        }
    } catch (err) {
        console.error("Error executing scripts:", err);
    } finally {
        await client.end();
        console.log("Connection closed.");
    }
}

runScripts();
