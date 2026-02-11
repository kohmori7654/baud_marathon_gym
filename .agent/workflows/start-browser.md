
---
description: WSL環境でChromeをデバッグモードで起動する
---
# Chrome起動 (WSL/Debian版)

WSL環境に適した正しいコマンドでChromeを起動します。

## 実行コマンド
```bash
# 既存のプロセスをクリーンアップ
pkill -f chrome || true

# 正しいオプションで起動 (Snap版ではなくapt版を使用)
google-chrome-stable --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir=~/chrome-data-debug &

# 起動待ち
sleep 3
```
