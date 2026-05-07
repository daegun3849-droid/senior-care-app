import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

/**
 * AI 할 일 분석 API
 * 사용자가 입력한 문장에서 제목, 상세내용, 시작/마감 시간을 추출합니다.
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "프롬프트가 없습니다." }, { status: 400 });
    }

    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: `
        사용자 입력: "${prompt}"
        
        위 문장에서 다음 정보를 추출해서 반드시 순수한 JSON 형식으로만 응답해줘.
        형식: { 
          "title": "할 일 제목", 
          "description": "장소나 메모 등 상세 내용", 
          "start_time": "YYYY-MM-DDTHH:mm", 
          "end_time": "YYYY-MM-DDTHH:mm" 
        }
        
        - 연도 정보가 없으면 현재 연도(2026년)를 기준으로 해줘.
        - 시간 정보가 없으면 시작은 현재 시간, 마감은 시작 1시간 후로 설정해줘.
        - JSON 외에 다른 설명이나 마크다운( \`\`\`json )은 절대 포함하지 마.
      `,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error("AI 분석 API 오류:", error);
    const message = error instanceof Error ? error.message : '분석에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
