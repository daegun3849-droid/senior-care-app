import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { NextRequest, NextResponse } from 'next/server';

const buildPrompt = (rawText: string) => {
  const todayKr = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  return `오늘 날짜(참고): ${todayKr}
사용자 입력: "${rawText.trim()}"

위 내용에서 일정을 추출하세요. 일정이 여러 개면 배열로, 하나면 배열 1개로 반환합니다.
마크다운·코드펜스·설명 없이 JSON 배열만 출력하세요.

형식:
[
  {"title":"짧은 제목","desc":"상세(장소·시간·메모)","start":"YYYY-MM-DDTHH:mm","end":"YYYY-MM-DDTHH:mm"},
  {"title":"짧은 제목2","desc":"상세2","start":"YYYY-MM-DDTHH:mm","end":"YYYY-MM-DDTHH:mm"}
]

규칙:
- 날짜가 없으면 오늘(한국 날짜) 기준
- end는 start보다 이후(없으면 start + 1시간)
- 반드시 배열([]) 형태로만 출력`;
};

const generateWithGroq = async (apiKey: string, prompt: string): Promise<string> => {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(errBody.error?.message ?? `Groq HTTP ${res.status}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Groq 응답이 비어 있습니다.');
  return text;
};

const generateWithGoogle = async (prompt: string): Promise<string> => {
  const { text } = await generateText({
    model: google('gemini-1.5-flash'),
    prompt,
  });
  return text;
};

const extractJsonArray = (text: string) => {
  // 배열 형태 추출
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fall through */ }
  }
  // 단일 객체면 배열로 감싸기
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return [JSON.parse(objMatch[0])];
    } catch { /* fall through */ }
  }
  return null;
};

/**
 * 자연어 → 일정 JSON 배열 (Groq 우선, 없으면 Google Gemini)
 * 여러 일정이 감지되면 배열 여러 개 반환
 */
export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const rawText =
      typeof body.rawText === 'string'
        ? body.rawText
        : typeof body.text === 'string'
          ? body.text
          : '';

    if (!rawText.trim()) {
      return NextResponse.json({ error: '입력 문장이 필요합니다.' }, { status: 400 });
    }

    const prompt = buildPrompt(rawText);
    const groqKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
    const hasGoogle = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    let aiText: string;

    if (groqKey) {
      try {
        aiText = await generateWithGroq(groqKey, prompt);
      } catch (groqErr) {
        console.error('[ai-parse-todo] Groq 실패:', groqErr);
        if (!hasGoogle) {
          const message = groqErr instanceof Error ? groqErr.message : 'Groq 호출에 실패했습니다.';
          return NextResponse.json({ error: message }, { status: 502 });
        }
        aiText = await generateWithGoogle(prompt);
      }
    } else if (hasGoogle) {
      aiText = await generateWithGoogle(prompt);
    } else {
      return NextResponse.json(
        { error: 'AI 키가 없습니다. GROQ_API_KEY 또는 GOOGLE_GENERATIVE_AI_API_KEY를 설정해 주세요.' },
        { status: 503 },
      );
    }

    const parsed = extractJsonArray(aiText);
    if (!parsed || parsed.length === 0) {
      return NextResponse.json({ error: 'AI 응답을 파싱할 수 없습니다.' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error('[ai-parse-todo]', error);
    const message = error instanceof Error ? error.message : '분석에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
