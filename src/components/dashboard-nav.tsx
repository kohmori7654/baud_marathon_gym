'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BookOpen,
    LayoutDashboard,
    ClipboardList,
    BarChart3,
    Settings,
    LogOut,
    Shield,
    Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User } from '@/types/database';
import { signout } from '@/app/(auth)/actions';

interface DashboardNavProps {
    user: User | null;
}

const navItems = [
    { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { href: '/exam', label: '試験開始', icon: ClipboardList },
    { href: '/history', label: '履歴', icon: BookOpen },
    { href: '/stats', label: '統計', icon: BarChart3 },
];


const adminNavItems = [
    { href: '/admin', label: '管理', icon: Shield },
];

const supporterNavItems = [
    { href: '/supporter', label: '担当受験者', icon: Users },
];

export function DashboardNav({ user }: DashboardNavProps) {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/80 backdrop-blur-lg">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-white hidden sm:block">
                            Baudroie Marathon Gym
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`
                      gap-2 text-sm
                      ${isActive
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                            }
                    `}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        <span className="hidden md:inline">{item.label}</span>
                                    </Button>
                                </Link>
                            );
                        })}

                        {/* Supporter links */}
                        {user?.role === 'supporter' && supporterNavItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`
                      gap-2 text-sm
                      ${isActive
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                            }
                    `}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        <span className="hidden md:inline">{item.label}</span>
                                    </Button>
                                </Link>
                            );
                        })}

                        {/* Admin links */}
                        {user?.role === 'admin' && adminNavItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`
                      gap-2 text-sm
                      ${isActive
                                                ? 'bg-amber-500/20 text-amber-400'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                            }
                    `}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        <span className="hidden md:inline">{item.label}</span>
                                    </Button>
                                </Link>
                            );
                        })}

                        {/* User menu */}
                        <div className="ml-4 flex items-center gap-2">
                            <span className="text-sm text-slate-400 hidden lg:block">
                                {user?.email}
                            </span>
                            <form action={signout}>
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                >
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </nav>
                </div>
            </div>
        </header>
    );
}
