'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { updateUserPassword } from '../actions';

export default function UpdatePasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) {
            setError('パスワードが一致しません');
            setIsLoading(false);
            return;
        }

        try {
            const result = await updateUserPassword(formData);

            if (result?.error) {
                setError(result.error);
            } else {
                setSuccess(true);
            }
        } catch {
            setError('予期せぬエラーが発生しました。');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                        <Lock className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-bold text-white">
                            新しいパスワードの設定
                        </CardTitle>
                        <CardDescription className="text-slate-400 mt-2">
                            新しいパスワードを入力してください
                        </CardDescription>
                    </div>
                </CardHeader>

                {!success ? (
                    <form action={handleSubmit}>
                        <CardContent className="space-y-4">
                            {error && (
                                <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-300">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-300">
                                    新しいパスワード
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-slate-300">
                                    パスワード（確認）
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-4">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        更新中...
                                    </>
                                ) : (
                                    'パスワードを更新'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                ) : (
                    <CardContent className="space-y-6 pt-4">
                        <div className="text-center space-y-2">
                            <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-medium text-white">パスワードを更新しました</h3>
                            <p className="text-slate-400 text-sm">
                                新しいパスワードでログインしてください
                            </p>
                        </div>
                        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                            <Link href="/login">ログイン画面へ</Link>
                        </Button>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
