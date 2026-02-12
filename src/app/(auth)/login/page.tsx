'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Loader2, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { login, signup } from '../actions';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        try {
            const action = isSignUp ? signup : login;
            const result = await action(formData);

            if (result?.error) {
                setError(result.error);
            }
        } catch (e) {
            // Next.js redirect throws an error, so we need to ignore it
            if ((e as Error).message === 'NEXT_REDIRECT' || (e as Error).message.includes('NEXT_REDIRECT')) {
                throw e;
            }
            console.error(e);
            setError('予期せぬエラーが発生しました。');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-white">
                            BMG - Baudroie Marathon Gym
                        </CardTitle>
                        <CardDescription className="text-slate-400 mt-2">
                            CCNA / CCNP対策
                        </CardDescription>
                    </div>
                </CardHeader>

                <form action={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-300">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">
                                メールアドレス
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    required
                                    className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">
                                パスワード
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
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 transition-all duration-200 shadow-lg shadow-emerald-500/20"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    処理中...
                                </>
                            ) : isSignUp ? (
                                '新規登録'
                            ) : (
                                'ログイン'
                            )}
                        </Button>

                        <div className="text-center mt-2">
                            <Link
                                href="/forgot-password"
                                className="text-sm text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                                パスワードをお忘れですか？
                            </Link>
                        </div>

                        <div className="text-center">
                            <Link
                                href="https://docs.google.com/forms/d/e/1FAIpQLSdf5LiDD3llmNtWiXUu8grAmcekxj2A1BrZtPtFjN0IL4jx5A/viewform?usp=header"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-slate-500 hover:text-emerald-400 transition-colors flex items-center justify-center gap-1"
                            >
                                <span className="underline">改修依頼/バグ報告はこちら</span>
                            </Link>
                        </div>

                        {/* Signup link removed as per request */}
                        {/* 
                            <button
                                type="button"
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-sm text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                                {isSignUp
                                    ? 'すでにアカウントをお持ちの方はこちら'
                                    : '新規アカウント作成はこちら'}
                            </button>
                            */}
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
