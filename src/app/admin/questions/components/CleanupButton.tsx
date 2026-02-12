'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { cleanupOrphanedImages } from '../actions';
import { useRouter } from 'next/navigation';

export function CleanupButton() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleCleanup = async () => {
        if (!confirm('未使用の画像を削除しますか？\n\nSupabase Storageにあるが、現在データベースで参照されていない画像が対象です。\nこの操作は取り消せません。')) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await cleanupOrphanedImages();

            if (result.error) {
                alert(`エラーが発生しました: ${result.error}`);
            } else {
                const sizeMB = (result.spaceReclaimed / 1024 / 1024).toFixed(2);
                alert(`クリーンアップ完了\n\n削除された画像: ${result.deletedCount}枚\n削減された容量: ${sizeMB} MB`);
                router.refresh();
            }
        } catch (e: any) {
            alert(`予期せぬエラーが発生しました: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            onClick={handleCleanup}
            disabled={isLoading}
            className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
            title="未使用画像の削除"
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
                <Trash2 className="w-4 h-4 mr-2" />
            )}
            ゴミ箱
        </Button>
    );
}
