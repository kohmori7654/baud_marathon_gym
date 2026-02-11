import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export default function Loading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="text-slate-400" disabled>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <FileQuestion className="w-6 h-6" />
                                問題管理
                            </h1>
                            <Skeleton className="h-4 w-32 mt-1" />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </div>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-0">
                        <div className="p-4 border-b border-slate-700">
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-4 p-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="space-y-3 border-b border-slate-800 pb-4 last:border-0">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-6 w-3/4" />
                                        <div className="flex gap-2">
                                            <Skeleton className="h-6 w-16 rounded-full" />
                                            <Skeleton className="h-6 w-16 rounded-full" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-4 w-1/2" />
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
