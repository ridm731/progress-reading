import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { readingSessions } from "@/db/schema";
import { eq } from "drizzle-orm";

function buildPrompt(mode: string, impression: string | null, quotes: string[], allImpressions: string[]): string {
  if (mode === "today") {
    return `あなたは読書コーチです。ユーザーが今日の読書セッションの感想を書きました。
感想に対して、共感・励まし・気づきを促すフィードバックを200文字以内で書いてください。

感想: ${impression ?? "（感想なし）"}
${quotes.length > 0 ? `引用した一文:\n${quotes.map((q) => `・${q}`).join("\n")}` : ""}

フィードバック（日本語で）:`;
  }

  if (mode === "recap") {
    return `あなたは読書コーチです。ユーザーのここまでの読書記録を要約してください。
各セッションの感想を元に、読んだ内容の流れと、ユーザーが共鳴しているテーマを300文字以内でまとめてください。

セッション記録:
${allImpressions.map((imp, i) => `セッション${i + 1}: ${imp}`).join("\n")}

要約（日本語で）:`;
  }

  return `あなたは読書コーチです。ユーザーが本を読み終えました。
全セッションの感想を振り返り、この本の総評と今後に活かせる気づきを300文字以内で書いてください。

セッション記録:
${allImpressions.map((imp, i) => `セッション${i + 1}: ${imp}`).join("\n")}

総評（日本語で）:`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { mode, impression, quotes: quoteTexts, allImpressions } = body;

    const prompt = buildPrompt(mode, impression, quoteTexts ?? [], allImpressions ?? []);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini error:", err);
      return NextResponse.json({ error: "Gemini API error" }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const text: string = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // today モードのみセッションに保存（recap/review はセッション横断なので保存しない）
    if (mode === "today" && id !== "book") {
      await db
        .update(readingSessions)
        .set({ aiFeedback: text })
        .where(eq(readingSessions.id, id));
    }

    return NextResponse.json({ success: true, text });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
