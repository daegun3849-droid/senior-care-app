import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const POST = async (req: NextRequest) => {
  try {
    const { text: rawText } = await req.json();
    if (!rawText) return NextResponse.json({ error: '내용이 없습니다.' }, { status: 400 });

    const prompt = `당신은 핵심 정보를 추출하는 일정 관리 비서입니다. 
텍스트를 분석해서 아래 JSON 양식의 빈칸을 채워주세요. 마크다운 기호(\`\`\`)는 절대 쓰지 마세요.
{
  "title": "일정의 핵심 제목 (짧게)",
  "location": "장소 (없으면 '미정')",
  "time": "시간 (없으면 '미정')",
  "summary": "핵심 내용 요약"
}
분석할 텍스트: "${rawText}"`;

    const { text: aiResponse } = await generateText({
      model: google('gemini-1.5-flash'),
      prompt,
    });

    const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON 파싱 실패');

    const rawResult = JSON.parse(jsonMatch[0]);
    const formattedContent = `장소 : ${rawResult.location || '미정'}\n시간 : ${rawResult.time || '미정'}\n내용 : ${rawResult.summary || '없음'}`;

    return NextResponse.json({
      title: rawResult.title || '새 일정',
      content: formattedContent
    });

  } catch (error: any) {
    console.error('[API 에러]:', error);
    return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
};