import { auth } from "@/auth";

/**
 * ログイン中のユーザー ID を返す。
 * DEMO_MODE=true のときはログイン不要で、全アクセスを DEMO_USER_ID の
 * デモアカウントとして扱う（審査員への一時公開用）。
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (process.env.DEMO_MODE === "true") {
    return process.env.DEMO_USER_ID ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}
