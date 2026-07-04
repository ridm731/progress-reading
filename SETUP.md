# セットアップガイド

読書ログツール「progress-reading」を自分の環境で動かすための手順です。
所要時間の目安は 30分〜1時間。AIアシスタント(Claude や ChatGPT など)に
「このリポジトリの SETUP.md に従ってセットアップを手伝って」と頼むとスムーズです。

## 必要なもの

- Node.js 20 以上
- GitHub アカウント(Vercel 連携用)
- [Neon](https://neon.tech) アカウント(無料枠でOK)
- [Vercel](https://vercel.com) アカウント(無料枠でOK)
- Google アカウント(ログイン認証と Gemini API に使用)

## 手順1: コードの取得と依存関係のインストール

```bash
git clone <このリポジトリのURL>
cd progress-reading
npm install
cp .env.example .env.local
```

以降の手順で `.env.local` の各値を埋めていきます。

## 手順2: Neon でデータベースを作成

1. [Neon](https://console.neon.tech) で新しいプロジェクトを作成
2. ダッシュボードの **Connect** から **Connection string** をコピー
3. `.env.local` の `DATABASE_URL` に貼り付け
4. テーブルを作成(マイグレーション実行):

```bash
npx drizzle-kit migrate
```

Neon の Tables 画面に `books` `reading_sessions` `user` などのテーブルが
できていれば成功です。

## 手順3: Google OAuth の設定(いちばん間違えやすい所)

このアプリは Google アカウントでログインします。そのための
「OAuth クライアント」を Google Cloud Console で作成します。

1. [Google Cloud Console](https://console.cloud.google.com) で新しいプロジェクトを作成
2. **APIとサービス → OAuth 同意画面** を開き、以下で構成:
   - User Type: **外部(External)**
   - アプリ名などは任意でOK
   - 公開ステータスが「テスト中」の場合、**テストユーザー**に自分の Gmail を追加
     (これを忘れると自分でもログインできません)
3. **APIとサービス → 認証情報 → 認証情報を作成 → OAuth クライアント ID**:
   - アプリケーションの種類: **ウェブアプリケーション**
   - 承認済みのリダイレクト URI に次の **2つ** を追加:
     - `http://localhost:3000/api/auth/callback/google`(ローカル開発用)
     - `https://<あなたのアプリ名>.vercel.app/api/auth/callback/google`(本番用。手順6でURLが決まったら追加でもOK)
4. 発行された **クライアント ID** と **クライアント シークレット** を
   `.env.local` の `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` に設定
5. `.env.local` の `ALLOWED_EMAIL` に **自分の Gmail アドレス**を設定
   (このアドレス以外はログインを拒否する仕組みです)
6. `AUTH_SECRET` を生成して設定:

```bash
npx auth secret
# または: openssl rand -base64 32 の出力を AUTH_SECRET= に貼り付け
```

## 手順4: Gemini API キーの取得(任意)

読書セッションへのAIフィードバック機能に使います。スキップしても
それ以外の機能はすべて動きます。

1. [Google AI Studio](https://aistudio.google.com/apikey) で API キーを作成
2. `.env.local` の `GEMINI_API_KEY` に設定

無料枠で十分動きます(モデルは gemini-2.5-flash を使用)。

## 手順5: ローカルで動作確認

```bash
npm run dev
```

http://localhost:3000 を開き、自分の Google アカウントでログインして
本を1冊登録できれば成功です。

うまくいかないとき:
- **ログインが拒否される** → `ALLOWED_EMAIL` がログインに使った Gmail と一致しているか、OAuth 同意画面のテストユーザーに追加したかを確認
- **`redirect_uri_mismatch` エラー** → 手順3-3 のリダイレクト URI が `http://localhost:3000/api/auth/callback/google` と完全一致しているか確認
- **DBエラー** → `DATABASE_URL` の値と、`npx drizzle-kit migrate` を実行したかを確認

## 手順6: Vercel にデプロイ

1. このコードを自分の GitHub リポジトリに push
2. [Vercel](https://vercel.com/new) で **Import** からそのリポジトリを選択
3. **Environment Variables** に `.env.local` と同じ変数を登録。ただし:
   - `NEXTAUTH_URL` は本番URL(例 `https://あなたのアプリ名.vercel.app`)に変える
   - `USE_MOCK` `DEMO_MODE` は `false` のままか、登録しなくてOK
4. **Deploy** を実行
5. デプロイ後のURLを、手順3-3 のリダイレクト URI(本番用)として
   Google Cloud Console に追加

本番URLを開いてログイン・本の登録ができれば完了です🎉

## 補足

- データベースのテーブル構成を変えたいときは `db/schema.ts` を編集して
  `npx drizzle-kit generate` → `npx drizzle-kit migrate`
- 本家のアップデートを取り込むには `git pull`(fork した場合は upstream を設定)
