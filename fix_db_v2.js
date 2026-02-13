
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase URL or Service Role Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function fixDatabaseV2() {
    try {
        console.log('Connecting to Supabase via Service Role Key...');

        // 1. Find user by email
        // Note: listUsers() is paginated, but for local dev with few users, page 1 is enough.
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error('Error listing users:', listError);
            return;
        }

        const adminUser = users.find(u => u.email === 'admin@example.com');

        if (!adminUser) {
            console.error('User admin@example.com not found. Creating one...');
            // Create user if not exists
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: 'admin@example.com',
                password: 'password123',
                email_confirm: true,
                user_metadata: { role: 'admin' },
                app_metadata: { role: 'admin' } // Important for Supabase RLS policies often check app_metadata
            });

            if (createError) {
                console.error('Error creating user:', createError);
                return;
            }
            console.log('Created admin user:', newUser.user.id);

            // Also upsert profile
            await upsertProfile(newUser.user.id);
        } else {
            console.log('Found admin user:', adminUser.id);

            // Update metadata just in case
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                adminUser.id,
                {
                    user_metadata: { ...adminUser.user_metadata, role: 'admin' },
                    app_metadata: { ...adminUser.app_metadata, role: 'admin' }
                }
            );

            if (updateError) {
                console.error('Error updating user metadata:', updateError);
            } else {
                console.log('Updated user metadata with admin role.');
            }

            // Upsert profile
            await upsertProfile(adminUser.id);
        }

        console.log('Fix complete. You should be able to login as admin@example.com.');

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

async function upsertProfile(userId) {
    console.log('Upserting profile for user:', userId);

    const { error } = await supabase.from('profiles').upsert({
        id: userId,
        email: 'admin@example.com',
        role: 'admin',
        display_name: 'Admin User',
        updated_at: new Date().toISOString()
    });

    if (error) {
        console.error('Error upserting profile:', error);
    } else {
        console.log('Profile upserted successfully.');
    }
}

fixDatabaseV2();
