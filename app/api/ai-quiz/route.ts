/**
 * AI 일일 퀴즈 생성 API
 * 오늘 날짜를 시드로 어르신 맞춤 인지 자극 퀴즈를 생성합니다.
 * 유형: 속담 빈칸, 사자성어, 계절 상식, 옛날 노래 가사
 */
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const variantSeed = searchParams.get("r") ?? "";

  const prompt = `
오늘 날짜: ${date}
문제 무작위 시드(반복 방지용): ${variantSeed || "(시드 없음)"}
당신은 노인복지관 어르신(70대 이상) 대상 인지 자극 퀴즈 출제 전문가입니다.

아래 JSON 형식으로 퀴즈 **딱 1문제**만 만드세요.
- 유형은 매번 하나만 골라 다양하게 쓸 것 (속담 빈칸 / 사자성어 / 계절·생활 상식 / 옛 노래 가사).
- 같은 날이라도 시드 코드가 바뀌면 **속담도 문제도 보기 정담도 전부 새로** 작성할 것 (이미 자주 나온 "가는 말이 고와야…" 속담만 반복 금지).
- 난이도: 쉬움. 보기 4개 중 정답 1개.
- 반드시 JSON만 출력 (설명 문장 금지)

{
  "type": "속담|사자성어|상식|노래",
  "question": "문제 텍스트 (빈칸은 ___ 로 표시)",
  "hint": "힌트 한 줄",
  "choices": ["보기1", "보기2", "보기3", "보기4"],
  "answer": "정답 텍스트",
  "explanation": "정답 해설 한 줄"
}
`.trim();

  try {
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
      maxOutputTokens: 400,
    });

    // JSON 블록 파싱 (마크다운 코드펜스 제거)
    const cleaned = text.replace(/```json|```/g, "").trim();
    const quiz = JSON.parse(cleaned);

    return NextResponse.json({ quiz, date });
  } catch (e) {
    console.error("퀴즈 생성 실패:", e);
    // 폴백 퀴즈 (API 실패 시)
    return NextResponse.json({
      quiz: {
        type: "속담",
        question: "가는 말이 고와야 ___도 곱다",
        hint: "내가 먼저 잘 해야 상대방도 잘 해준다는 뜻이에요",
        choices: ["오는 말", "하는 말", "쓰는 말", "듣는 말"],
        answer: "오는 말",
        explanation: "내가 남에게 좋게 대해야 남도 나에게 좋게 대한다는 뜻입니다.",
      },
      date,
    });
  }
};
