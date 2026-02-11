
import Link from 'next/link';
import { CreateUserForm } from './create-user-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function NewUserPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Link href="/admin/users">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white mr-2">
                                <ArrowLeft className="w-6 h-6" />
                            </Button>
                        </Link>
                        <UserPlus className="w-6 h-6" />
                        新規ユーザー登録
                    </h1>
                    <p className="text-slate-400 mt-2 ml-16">
                        新しいユーザーを手動で作成します。作成後、ユーザーにメールアドレスとパスワードを通知してください。
                    </p>
                </div>

                <CreateUserForm />
            </div>
        </div>
    );
}
