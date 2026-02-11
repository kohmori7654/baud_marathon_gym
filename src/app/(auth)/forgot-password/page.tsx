'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Loader2, Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { resetPassword } from '../actions';

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const result = await resetPassword(formData);

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
                    <div className="mx-auto w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center">
                        <KeyRound className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-bold text-white">
                            パスワードをお忘れの方
                        </CardTitle>
                        <CardDescription className="text-slate-400 mt-2">
                            ご登録のメールアドレスを入力してください。<br />
                            パスワード再設定用のリンクをお送りします。
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
                                        送信中...
                                    </>
                                ) : (
                                    'リセットリンクを送信'
                                )}
                            </Button>

                            <Link href="/login" className="flex items-center text-sm text-slate-400 hover:text-white transition-colors">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                ログイン画面に戻る
                            </Link>
                        </CardFooter>
                    </form>
                ) : (
                    <CardContent className="space-y-6 pt-4">
                        <Alert className="bg-emerald-900/20 border-emerald-800 text-emerald-300">
                            <AlertDescription>
                                パスワード再設定用のメールを送信しました。メール内のリンクから新しいパスワードを設定してください。
                            </AlertDescription>
                        </Alert>
                        <Button asChild className="w-full" variant="outline">
                            <Link href="/login">ログイン画面に戻る</Link>
                        </Button>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
