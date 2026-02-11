import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DashboardNav } from '@/components/dashboard-nav';
import type { User } from '@/types/database';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Use admin client (service role) to bypass RLS and check user role
    const adminClient = createAdminClient();

    // Select all fields for DashboardNav compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userData } = await (adminClient.from('users') as any)
        .select('*')
        .eq('id', user.id)
        .single();

    if (!userData || (userData as User).role !== 'admin') {
        redirect('/dashboard');
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <DashboardNav user={userData as User} />
            <main className="container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
