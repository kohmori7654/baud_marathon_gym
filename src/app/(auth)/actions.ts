'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function login(formData: FormData) {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    };

    const { error, data: authData } = await supabase.auth.signInWithPassword(data);

    if (error) {
        return { error: error.message };
    }

    if (authData.user) {
        // Fetch user role using admin client
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: userData } = await (supabaseAdmin.from('users') as any)
            .select('role')
            .eq('id', authData.user.id)
            .single();

        if (userData?.role === 'admin') {
            revalidatePath('/', 'layout');
            redirect('/admin');
        } else if (userData?.role === 'supporter') {
            revalidatePath('/', 'layout');
            redirect('/supporter');
        }
    }

    revalidatePath('/', 'layout');
    redirect('/dashboard');
}

export async function signup(formData: FormData) {
    const supabase = await createClient();

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    };

    const { error } = await supabase.auth.signUp(data);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/', 'layout');
    redirect('/dashboard');
}

export async function signout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath('/', 'layout');
    redirect('/login');
}

export async function resetPassword(formData: FormData) {
    const supabase = await createClient();
    const email = formData.get('email') as string;

    // Get the base URL for the callback
    // In production this should be set in Supabase dashboard, but we can also specify it
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/update-password`,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

export async function updateUserPassword(formData: FormData) {
    const supabase = await createClient();
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.updateUser({
        password: password
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}
