
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUser } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
    email: z.string().email({ message: '有効なメールアドレスを入力してください' }),
    password: z.string().min(8, { message: 'パスワードは8文字以上である必要があります' }),
    displayName: z.string().optional(),
    role: z.enum(['examinee', 'supporter', 'admin']),
    targetExam: z.enum(['ENCOR', 'ENARSI', 'BOTH']),
});

export function CreateUserForm() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
            displayName: '',
            role: 'examinee',
            targetExam: 'ENCOR',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        setError(null);

        try {
            const result = await createUser({
                email: values.email,
                password: values.password,
                displayName: values.displayName || undefined,
                role: values.role,
                targetExam: values.targetExam,
            });

            if (result.error) {
                setError(result.error);
            } else {
                router.push('/admin/users');
                router.refresh();
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : '予期せぬエラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white">新規ユーザー登録</CardTitle>
                <CardDescription className="text-slate-400">
                    新しいユーザーアカウントを作成します。
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-6 bg-red-900/50 border-red-900 text-red-200">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>エラー</AlertTitle>
                        <AlertDescription>
                            {error}
                        </AlertDescription>
                    </Alert>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">メールアドレス</FormLabel>
                                    <FormControl>
                                        <Input placeholder="user@example.com" className="bg-slate-900/50 border-slate-700 text-white" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">パスワード</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="********" className="bg-slate-900/50 border-slate-700 text-white" {...field} />
                                    </FormControl>
                                    <FormDescription className="text-slate-500">
                                        8文字以上で設定してください
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="displayName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">表示名 (任意)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="山田 太郎" className="bg-slate-900/50 border-slate-700 text-white" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">ロール</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                                                    <SelectValue placeholder="ロールを選択" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                                <SelectItem value="examinee">受験者 (Examinee)</SelectItem>
                                                <SelectItem value="supporter">サポーター (Supporter)</SelectItem>
                                                <SelectItem value="admin">管理者 (Admin)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="targetExam"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">対象試験</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                                                    <SelectValue placeholder="試験を選択" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                                <SelectItem value="ENCOR">Core ENCOR</SelectItem>
                                                <SelectItem value="ENARSI">Conce ENARSI</SelectItem>
                                                <SelectItem value="BOTH">両方</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                登録する
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
