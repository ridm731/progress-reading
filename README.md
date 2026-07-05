# 📖 読書ログ (progress-reading)

本との記録を、ここに残そう。読書の進捗・セッション記録・AIフィードバックをひとつにまとめた読書ログツールです。

## 主な機能

- **本棚管理** — 積読・読書中・読了のステータスで本を管理
- **セッション記録** — 読んだ範囲・時間・メモ・引用を記録
- **AIフィードバック** — Gemini による読書セッションへのコメント、本ごとの振り返り生成
- **Google ログイン** — 自分のアカウントだけで安全に利用

## 自分の環境で動かすには

👉 **[SETUP.md](SETUP.md)** に手順をまとめています(所要 30分〜1時間)。

必要なもの: GitHub / Vercel / Neon / Google アカウント(すべて無料枠でOK)。
AIアシスタントに「このリポジトリの SETUP.md に従ってセットアップを手伝って」と頼むとスムーズです。

## 技術スタック

Next.js (App Router) / TypeScript / Tailwind CSS / NextAuth (Google OAuth) / Drizzle ORM / Neon (PostgreSQL) / Gemini API / Vercel
