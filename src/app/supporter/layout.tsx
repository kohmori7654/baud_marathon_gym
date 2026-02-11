import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { DashboardNav } from '@/components/dashboard-nav';
import { User } from '@/types/database';

export default async function SupporterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Role check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userData } = await (supabase.from('users') as any)
        .select('*')
        .eq('id', user.id)
        .single();

    const userRole = (userData as User)?.role;

    if (userRole !== 'supporter' && userRole !== 'admin') {
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
