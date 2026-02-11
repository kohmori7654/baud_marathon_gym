import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manual env loading
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envVars: Record<string, string> = {};
if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8');
    content.split('\n').forEach(line => {
        // Simple parsing, handles "KEY=VALUE"
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join('=').trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            envVars[key] = value;
        }
    });
}

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase config in .env.local');
    // Ensure we don't proceed without config, but don't crash if imported, just exit
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    const email = 'admin@example.com';
    const password = 'password123';

    console.log(`Checking if user ${email} exists...`);
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        throw new Error(`Failed to list users: ${listError.message}`);
    }

    let userId = users.find(u => u.email === email)?.id;

    if (!userId) {
        console.log('Creating user...');
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        if (error) throw error;
        userId = data.user.id;
        console.log(`User created with ID: ${userId}`);
    } else {
        console.log('User already exists, updating password to ensure access...');
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password });
        if (updateError) throw updateError;
    }

    // Wait a bit for the trigger to fire and create public.users record
    console.log('Waiting for public.users trigger...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update role
    console.log('Updating role to admin in public.users...');
    const { error: updateError, count } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', userId);

    if (updateError) throw updateError;
    console.log('Role updated successfully!');
}

main().catch(console.error);
