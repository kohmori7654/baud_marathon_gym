
const { Client } = require('pg');

const dbConfig = {
    connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres',
};

async function fixDatabase() {
    const client = new Client(dbConfig);

    try {
        await client.connect();
        console.log('Connected to database.');

        // 1. Grant admin role to admin@example.com
        // First, finding the user id from auth.users is tricky via pg driver directly on 'postgres' db 
        // if we don't have permissions or search_path set correctly, but usually postgres user has access.
        // auth.users is in a separate schema.
        console.log('Fixing admin permissions...');

        // Find user ID for admin@example.com
        const userRes = await client.query("SELECT id FROM auth.users WHERE email = 'admin@example.com'");
        if (userRes.rows.length === 0) {
            console.error('User admin@example.com not found in auth.users');
        } else {
            const userId = userRes.rows[0].id;
            console.log(`Found user ID: ${userId}`);

            // Upsert profile with admin role
            // We use ON CONFLICT to update if exists
            const updateProfileQuery = `
                INSERT INTO public.profiles (id, email, role, display_name)
                VALUES ($1, 'admin@example.com', 'admin', 'Admin User')
                ON CONFLICT (id) DO UPDATE
                SET role = 'admin';
            `;
            await client.query(updateProfileQuery, [userId]);
            console.log('Admin role granted.');
        }

        // 2. Remove problematic triggers
        console.log('Removing problematic triggers...');
        await client.query("DROP TRIGGER IF EXISTS set_display_id_trigger ON public.questions");
        await client.query("DROP TRIGGER IF EXISTS trg_set_display_id ON public.questions");
        await client.query("DROP FUNCTION IF EXISTS public.set_display_id()");
        await client.query("DROP FUNCTION IF EXISTS public.assign_display_id()");
        console.log('Triggers removed.');

        // 3. Patch existing NULL display_ids
        console.log('Patching existing NULL display_ids...');

        // ENCOR
        const encorPatch = `
        DO $$
        DECLARE
            r RECORD;
            next_id INT;
        BEGIN
            SELECT COALESCE(MAX(display_id), 0) + 1 INTO next_id FROM public.questions WHERE exam_type = 'ENCOR';
            FOR r IN SELECT id FROM public.questions WHERE exam_type = 'ENCOR' AND display_id IS NULL ORDER BY created_at ASC LOOP
                UPDATE public.questions SET display_id = next_id WHERE id = r.id;
                next_id := next_id + 1;
            END LOOP;
        END $$;
        `;
        await client.query(encorPatch);

        // ENARSI
        const enarsiPatch = `
        DO $$
        DECLARE
            r RECORD;
            next_id INT;
        BEGIN
            SELECT COALESCE(MAX(display_id), 0) + 1 INTO next_id FROM public.questions WHERE exam_type = 'ENARSI';
            FOR r IN SELECT id FROM public.questions WHERE exam_type = 'ENARSI' AND display_id IS NULL ORDER BY created_at ASC LOOP
                UPDATE public.questions SET display_id = next_id WHERE id = r.id;
                next_id := next_id + 1;
            END LOOP;
        END $$;
        `;
        await client.query(enarsiPatch);
        console.log('Data patched.');

    } catch (err) {
        console.error('Error executing DB fix:', err);
    } finally {
        await client.end();
        console.log('Disconnected.');
    }
}

fixDatabase();
