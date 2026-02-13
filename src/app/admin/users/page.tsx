import Link from 'next/link';
import { getUsers } from './actions';
import { EditUserDialog } from './edit-user-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Users,
    ArrowLeft,
    Plus,
    Shield,
    User as UserIcon,
    UserCog,
    Upload
} from 'lucide-react';
import { UserFilters } from './user-filters';

const DEPARTMENTS = [
    '第一技術部',
    '第二技術部',
    '第三技術部',
    '第四技術部',
    '第五技術部',
    '第六技術部',
    'その他',
];

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedSearchParams = await searchParams;
    const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
    const limit = 20;
    const departmentFilter = typeof resolvedSearchParams.department === 'string' ? resolvedSearchParams.department : undefined;
    const supporterFilter = typeof resolvedSearchParams.supporter === 'string' ? resolvedSearchParams.supporter : undefined;

    const { users, totalPages, supporters } = await getUsers(page, limit, {
        department: departmentFilter,
        supporterId: supporterFilter,
    });

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <Badge className="bg-red-500/20 text-red-400 border-0"><Shield className="w-3 h-3 mr-1" />管理者</Badge>;
            case 'supporter':
                return <Badge className="bg-amber-500/20 text-amber-400 border-0"><UserCog className="w-3 h-3 mr-1" />サポーター</Badge>;
            default:
                return <Badge className="bg-blue-500/20 text-blue-400 border-0"><UserIcon className="w-3 h-3 mr-1" />受験者</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Users className="w-6 h-6" />
                                ユーザー管理
                            </h1>
                            <p className="text-slate-400">
                                ユーザー一覧 (Page {page} of {totalPages})
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Link href="/admin/assignments/import">
                            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                                <UserCog className="w-4 h-4 mr-2" />
                                サポーター割当CSV
                            </Button>
                        </Link>
                        <Link href="/admin/users/import">
                            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                                <Upload className="w-4 h-4 mr-2" />
                                一括インポート
                            </Button>
                        </Link>
                        <Link href="/admin/users/new">
                            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                                <Plus className="w-4 h-4 mr-2" />
                                新規登録
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filter UI */}
                <UserFilters
                    departments={DEPARTMENTS}
                    supporters={supporters}
                    currentDepartment={departmentFilter}
                    currentSupporter={supporterFilter}
                />

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-700 hover:bg-transparent">
                                    <TableHead className="text-slate-400">メールアドレス</TableHead>
                                    <TableHead className="text-slate-400">表示名</TableHead>
                                    <TableHead className="text-slate-400">ロール</TableHead>
                                    <TableHead className="text-slate-400">所属部</TableHead>
                                    <TableHead className="text-slate-400">サポーター</TableHead>
                                    <TableHead className="text-slate-400">対象試験</TableHead>
                                    <TableHead className="text-slate-400">登録日</TableHead>
                                    <TableHead className="text-slate-400 text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users?.map((user) => (
                                    <TableRow key={user.id} className="border-slate-700 hover:bg-slate-800/50">
                                        <TableCell className="text-white font-medium">
                                            {user.email}
                                        </TableCell>
                                        <TableCell className="text-slate-300">
                                            {user.display_name || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {getRoleBadge(user.role)}
                                        </TableCell>
                                        <TableCell className="text-slate-300 text-sm">
                                            {user.department || '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-300 text-sm">
                                            {user.supporter_name || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {user.target_exam ? (
                                                <Badge variant="outline" className={
                                                    user.target_exam === 'ENCOR' ? 'border-blue-500/50 text-blue-400' :
                                                        user.target_exam === 'ENARSI' ? 'border-purple-500/50 text-purple-400' :
                                                            'border-emerald-500/50 text-emerald-400'
                                                }>
                                                    {user.target_exam === 'ENCOR' ? 'Core ENCOR' :
                                                        user.target_exam === 'ENARSI' ? 'Conce ENARSI' :
                                                            (user.target_exam === 'BOTH' ? 'Core ENCOR & Conce ENARSI' : '未設定')}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-500">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-400">
                                            {new Date(user.created_at).toLocaleDateString('ja-JP')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <EditUserDialog user={user} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!users || users.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                                            ユーザーが見つかりません
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    baseUrl="/admin/users"
                />
            </div>
        </div>
    );
}
