function extractJson(text) {
  if (!text) return null;

  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function GET() {
  return Response.json({
    message:
      "Clartity explain API is running with OpenRouter. Use POST to generate artwork explanation.",
  });
}

export async function POST(request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "OPENROUTER_API_KEY가 설정되지 않았습니다. 환경변수를 확인하세요.",
        },
        { status: 500 }
      );
    }

    const { ocrText, userProfile, question } = await request.json();

    if (!ocrText || ocrText.trim().length < 3) {
      return Response.json(
        {
          error: "캡션 텍스트가 충분히 인식되지 않았습니다.",
        },
        { status: 400 }
      );
    }

    const isQuestionMode = Boolean(question && question.trim());

    const prompt = `
너는 박물관·미술관 현장에서 관람객에게 설명하는 전문 도슨트다.

아래 텍스트는 사용자가 카메라 OCR로 인식한 작품 캡션이다.
OCR 텍스트에는 오타, 줄바꿈 오류, 외국어 혼합, 일부 누락이 있을 수 있다.

[OCR 캡션 텍스트]
"""
${ocrText}
"""

[사용자 프로필]
- 지식 수준: ${userProfile?.level || "미술 입문자"}
- 선호 취향: ${userProfile?.taste || "쉽고 감성적인 설명"}
- 연령대: ${userProfile?.age || "20-30대"}

[사용자 질문]
${question || "없음. 작품 기본 해설을 생성해라."}

역할:
OCR 텍스트를 바탕으로 실제 작품을 추정하고, 관람객에게 제공할 작품 해설을 생성한다.

중요 규칙:
1. 특정 작품을 임의로 고정하지 마라.
2. OCR 텍스트에 근거해서 작품명, 작가명, 제작연도, 소장처를 정제해라.
3. 불확실한 정보는 "확인 필요"라고 쓰지 말고 빈 문자열 ""로 둬라.
4. "확인 필요", "미상", "정보 없음", "unknown" 같은 표현은 절대 출력하지 마라.
5. OCR 텍스트에 유명 작품명/작가명이 일부라도 보이면 미술사 지식을 활용해 자연스럽게 보정해라.
6. 사용자에게 OCR 원문은 보여주지 않을 것이므로, 정제된 작품 정보와 해설만 출력해라.
7. 설명은 너무 짧게 쓰지 말고, 실제 전시장 도슨트처럼 충분히 상세하게 작성해라.
8. 미술 기초지식이 없는 20-30대가 이해할 수 있게 쉽게 풀어써라.
9. 사용자가 질문했다면 answer 필드에 질문에 대한 직접 답변을 써라.
10. 반드시 JSON만 출력해라. 마크다운, 코드블록, 설명문은 출력하지 마라.

해설 작성 기준:
- simpleExplanation: 최소 5문장. 작품이 무엇을 보여주는지, 화면 구성, 인물/소재, 첫인상을 설명.
- artistDescription: 최소 4문장. 작가의 특징, 활동 시기, 미술사적 위치를 설명.
- artistIntention: 최소 4문장. 작가가 이 작품을 통해 무엇을 강조했는지 설명.
- background: 최소 4문장. 제작 시기, 당시 미술사 흐름, 사회·문화적 배경을 설명.
- viewingPoints: 구체적 감상 포인트 4개.

출력 JSON 형식:
{
  "title": "작품명. 불확실하면 빈 문자열",
  "artist": "작가명. 불확실하면 빈 문자열",
  "year": "제작연도. 불확실하면 빈 문자열",
  "museum": "미술관/소장처. 불확실하면 빈 문자열",
  "summary": "작품을 한 문장으로 쉽게 요약",
  "simpleExplanation": "상세한 작품 해설",
  "artistDescription": "상세한 작가 설명",
  "artistIntention": "상세한 작가의 의도 설명",
  "background": "상세한 작품 배경 설명",
  "viewingPoints": ["감상 포인트 1", "감상 포인트 2", "감상 포인트 3", "감상 포인트 4"],
  "answer": "${isQuestionMode ? "사용자 질문에 대한 직접 답변" : ""}",
  "confidence": "높음/보통/낮음"
}
`;

    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://clartity-gs83.vercel.app",
          "X-Title": "Clartity",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.25,
        }),
      }
    );

    const result = await openRouterResponse.json();

    if (!openRouterResponse.ok) {
      return Response.json(
        {
          error:
            result?.error?.message ||
            result?.message ||
            "OpenRouter API 요청에 실패했습니다.",
        },
        { status: openRouterResponse.status }
      );
    }

    const raw = result?.choices?.[0]?.message?.content || "";
    const parsed = extractJson(raw);

    if (!parsed) {
      return Response.json({
        title: "",
        artist: "",
        year: "",
        museum: "",
        summary: "작품의 시각적 특징과 전시 맥락을 바탕으로 감상해볼 수 있습니다.",
        simpleExplanation:
          raw ||
          "이 작품은 화면 구성과 표현 방식을 중심으로 감상할 수 있습니다.",
        artistDescription: "",
        artistIntention: "",
        background: "",
        viewingPoints: [
          "작품의 중심 인물이나 주요 대상을 먼저 살펴보세요.",
          "색감과 명암이 어떤 분위기를 만드는지 관찰해보세요.",
          "화면의 구도와 시선의 방향을 따라가보세요.",
          "작품이 전시된 공간의 설명과 함께 연결해보세요.",
        ],
        answer: isQuestionMode ? raw : "",
        confidence: "낮음",
      });
    }

    return Response.json({
      title: parsed.title || "",
      artist: parsed.artist || "",
      year: parsed.year || "",
      museum: parsed.museum || "",
      summary:
        parsed.summary ||
        "작품의 시각적 특징과 전시 맥락을 바탕으로 감상해볼 수 있습니다.",
      simpleExplanation:
        parsed.simpleExplanation ||
        parsed.explanation ||
        "이 작품은 화면 구성과 표현 방식을 중심으로 감상할 수 있습니다.",
      artistDescription: parsed.artistDescription || "",
      artistIntention: parsed.artistIntention || "",
      background: parsed.background || "",
      viewingPoints: Array.isArray(parsed.viewingPoints)
        ? parsed.viewingPoints
        : [
            "작품의 중심 인물이나 주요 대상을 먼저 살펴보세요.",
            "색감과 명암이 어떤 분위기를 만드는지 관찰해보세요.",
            "화면의 구도와 시선의 방향을 따라가보세요.",
            "작품이 전시된 공간의 설명과 함께 연결해보세요.",
          ],
      answer: parsed.answer || "",
      confidence: parsed.confidence || "보통",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error: error.message || "작품 해설 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}   