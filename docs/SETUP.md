# CCNP Study App セットアップガイド

このドキュメントでは、アプリケーションのセットアップ手順を説明します。

## 前提条件

- Node.js 18以上
- npm または yarn
- Supabaseアカウント（無料で作成可能）

---

## Step 1: Supabaseプロジェクトの作成

### 1.1 Supabaseにサインアップ

1. [https://supabase.com](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインイン（推奨）またはメールで登録

### 1.2 新規プロジェクトを作成

1. ダッシュボードで「New Project」をクリック
2. 以下の情報を入力:
   - **Name**: `ccnp-study-app`（任意の名前）
   - **Database Password**: 強力なパスワードを設定（後で使用するので保存）
   - **Region**: `Northeast Asia (Tokyo)` を選択（日本からのアクセスに最適）
3. 「Create new project」をクリック
4. プロジェクトの作成完了まで約2分待つ

---

## Step 2: データベースマイグレーションの適用

### 2.1 SQLエディタを開く

1. Supabaseダッシュボード（https://supabase.com/dashboard）にアクセス
2. 作成したプロジェクトをクリックして開く
3. 左サイドバーから **「SQL Editor」** をクリック（`</>`アイコン）

![SQL Editorの場所]
```
左サイドバー:
├── Table Editor （テーブルアイコン）
├── SQL Editor   ← ★ここをクリック
├── Database
└── ...
```

### 2.2 新しいクエリを作成

1. SQL Editorが開いたら、右上の **「+ New query」** ボタンをクリック
2. 空白のエディタ画面が表示される

### 2.3 マイグレーションファイルの内容をコピー

1. ローカルのプロジェクトフォルダで以下のファイルを開く:
   ```
   /home/takamim/.gemini/antigravity/scratch/baud_marathon_gym/supabase/migrations/001_init_schema.sql
   ```

2. ファイルの **全内容** をコピー（`Ctrl+A` → `Ctrl+C`）

   > 💡 **ヒント**: VSCodeで開いている場合は `Ctrl+A` で全選択、`Ctrl+C` でコピー

### 2.4 SQLを実行

1. Supabase SQL Editorにコピーした内容を **貼り付け**（`Ctrl+V`）

2. 右下の **「Run」** ボタン（または `Ctrl+Enter`）をクリック

3. 実行結果が表示される:
   ```
   Success. No rows returned
   ```
   これが表示されれば成功です。

### 2.5 テーブル作成を確認

1. 左サイドバーから **「Table Editor」** をクリック
2. 以下の6つのテーブルが表示されていることを確認:

| テーブル名 | 説明 |
|-----------|------|
| `users` | ユーザー情報 |
| `questions` | 問題データ |
| `options` | 選択肢データ |
| `exam_sessions` | 試験セッション |
| `session_answers` | 回答履歴 |
| `supporter_assignments` | サポーター割り当て |

> ⚠️ **テーブルが表示されない場合:**
> - ブラウザをリロード（F5）
> - 左上のスキーマ選択が「public」になっているか確認
> - SQLエディタでエラーが出ていないか確認

---

## Step 3: 環境変数の設定

### 3.1 Supabase APIキーの取得

#### 3.1.1 Project Settingsを開く

1. Supabaseダッシュボードで、左サイドバー最下部の **「Project Settings」**（⚙️歯車アイコン）をクリック

```
左サイドバー:
├── ...（上部メニュー）
├── ...
└── Project Settings ← ★ここをクリック（歯車アイコン）
```

#### 3.1.2 API設定ページを開く

1. 左メニューから **「API」** をクリック

```
Project Settings:
├── General
├── API          ← ★ここをクリック
├── Database
└── ...
```

#### 3.1.3 必要な値をコピー

API設定ページに以下の2つの値があります。それぞれをコピーしてメモ帳などに一時保存してください:

**① Project URL**
```
場所: 「Project URL」セクション
形式: https://xxxxxxxxxx.supabase.co
```
右側のコピーボタン（📋）をクリックしてコピー

**② anon public キー**
```
場所: 「Project API keys」セクション → 「anon」「public」のラベルがついた行
形式: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...（非常に長い文字列）
```
右側の **「Reveal」** をクリックして表示し、コピーボタン（📋）をクリック

> ⚠️ **注意**: `service_role` キーではなく `anon` キーをコピーしてください

### 3.2 .env.local ファイルの作成

#### 3.2.1 ターミナルでファイルを作成

```bash
# プロジェクトディレクトリに移動
cd /home/takamim/.gemini/antigravity/scratch/baud_marathon_gym

# .env.local ファイルを作成
touch .env.local
```

#### 3.2.2 ファイルを編集

VSCodeまたはお好みのエディタで `.env.local` を開き、以下の内容を記入:

```bash
# ===================================
# Supabase 設定
# ===================================

# Project URL（Step 3.1.3 でコピーした①の値）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co

# anon public キー（Step 3.1.3 でコピーした②の値）
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 3.2.3 記入例（実際の値に置き換え）

```bash
# 例（これは架空の値です。実際のプロジェクトの値を使用してください）
NEXT_PUBLIC_SUPABASE_URL=https://abcd1234efgh5678.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2QxMjM0ZWZnaDU2NzgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 3.3 設定の確認

#### ファイルが正しく保存されているか確認:

```bash
cat .env.local
```

以下のように表示されればOK:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

> 💡 **セキュリティ注意:**
> - `.env.local` は `.gitignore` に含まれているため、Gitにコミットされません
> - このファイルの内容を他人と共有しないでください
> - 本番環境では別の設定方法を使用します

---

## Step 4: 開発サーバーの起動

### 4.1 依存関係のインストール

```bash
cd /home/takamim/.gemini/antigravity/scratch/baud_marathon_gym
npm install
```

### 4.2 開発サーバーを起動

```bash
npm run dev
```

### 4.3 アプリケーションにアクセス

ブラウザで以下のURLにアクセス:
```
http://localhost:3000
```

---

## Step 5: 初期ユーザーの作成

### 5.1 サインアップ

1. http://localhost:3000/login にアクセス
2. 「登録」タブをクリック
3. メールアドレスとパスワードを入力して登録

### 5.2 管理者ユーザーの設定（オプション）

最初のユーザーを管理者にするには:

1. Supabaseダッシュボードで「Table Editor」→「users」を開く
2. 作成したユーザーの行を選択
3. `role` を `admin` に変更して保存

---

## トラブルシューティング

### 「Invalid API key」エラー
- `.env.local` のAPIキーが正しくコピーされているか確認
- 開発サーバーを再起動（`Ctrl+C` で停止後、`npm run dev`）

### テーブルが見つからないエラー
- SQLマイグレーションが正常に実行されたか確認
- SQLエディタで再度マイグレーションを実行

### ログインできない
- Supabaseダッシュボードの「Authentication」→「Users」でユーザーが作成されているか確認
- パスワードが正しいか確認

---

## 次のステップ

セットアップ完了後:
1. 管理者として問題データをインポート（`/admin/import`）
2. ユーザーを追加（`/admin/users`）
3. 試験を開始（`/exam`）
