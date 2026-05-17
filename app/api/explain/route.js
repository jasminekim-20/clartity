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

function cleanField(value) {
  if (!value) return "";

  let text = String(value).trim();

  text = text
    .replace(/\(확인 필요\)/g, "")
    .replace(/\[확인 필요\]/g, "")
    .replace(/확인 필요/g, "")
    .replace(/정보 없음/g, "")
    .replace(/소장처 정보 미상/g, "")
    .replace(/미상/g, "")
    .replace(/unknown/gi, "")
    .replace(/n\/a/gi, "")
    .replace(/null/gi, "")
    .replace(/undefined/gi, "")
    .trim();

  text = text.replace(/\s{2,}/g, " ").trim();

  if (
    text === "" ||
    text === "소장처 정보" ||
    text === "소장처" ||
    text === "제작연도" ||
    text === "작품명" ||
    text === "작가"
  ) {
    return "";
  }

  return text;
}

function cleanList(list) {
  if (!Array.isArray(list)) return [];

  return list.map(cleanField).filter(Boolean);
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
          error: "OPENROUTER_API_KEY가 설정되지 않았습니다.",
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
너는 미술관 현장에서 관람객에게 설명하는 전문 도슨트다.

아래 텍스트는 OCR로 인식한 작품 캡션이다.
OCR에는 오타, 누락, 줄바꿈 오류가 있을 수 있다.

[OCR 텍스트]
"""
${ocrText}
"""

[사용자]
- 지식 수준: ${userProfile?.level || "미술 입문자"}
- 선호 취향: ${userProfile?.taste || "쉽고 감성적인 설명"}
- 연령대: ${userProfile?.age || "20-30대"}

[질문]
${question || "없음"}

해야 할 일:
1. OCR에서 작품명, 작가명, 제작연도, 소장처를 정제해라.
2. OCR이 조금 틀려도 유명 작품/작가라면 미술사 지식으로 자연스럽게 보정해라.
3. "확인 필요", "미상", "정보 없음", "unknown" 같은 표현은 절대 쓰지 마라.
4. 모르는 필드는 빈 문자열 ""로 둬라.
5. 작품명과 작가명은 OCR에서 추정 가능하면 반드시 최대한 살려라.
6. 작품 해설은 입문자가 이해할 수 있게 구체적으로 작성해라.
7. 반드시 JSON만 출력해라.

해설 길이:
- summary: 한 문장
- simpleExplanation: 5~7문장
- artistDescription: 3~5문장
- artistIntention: 3~5문장
- background: 3~5문장
- viewingPoints: 4개

출력 JSON:
{
  "title": "작품명 또는 빈 문자열",
  "artist": "작가명 또는 빈 문자열",
  "year": "제작연도 또는 빈 문자열",
  "museum": "소장처 또는 빈 문자열",
  "summary": "작품 한 문장 요약",
  "simpleExplanation": "상세한 작품 해설",
  "artistDescription": "작가 설명",
  "artistIntention": "작가의 의도",
  "background": "작품 배경 설명",
  "viewingPoints": ["감상 포인트 1", "감상 포인트 2", "감상 포인트 3", "감상 포인트 4"],
  "answer": "${isQuestionMode ? "질문에 대한 직접 답변" : ""}",
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
          model: "z-ai/glm-4.5-air:free",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 1500,
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
        summary:
          "작품의 시각적 특징과 전시 맥락을 중심으로 감상할 수 있습니다.",
        simpleExplanation:
          raw ||
          "이 작품은 화면 구성, 색감, 인물 또는 소재의 배치를 중심으로 감상할 수 있습니다. 작품의 첫인상뿐 아니라 세부 표현을 함께 살펴보면 작가가 강조하려는 분위기와 주제가 더 잘 드러납니다.",
        artistDescription: "",
        artistIntention: "",
        background: "",
        viewingPoints: [
          "작품의 중심 인물이나 주요 대상을 먼저 살펴보세요.",
          "색감과 명암이 어떤 분위기를 만드는지 관찰해보세요.",
          "화면의 구도와 시선의 방향을 따라가보세요.",
          "작품이 놓인 시대적 배경과 연결해보세요.",
        ],
        answer: isQuestionMode ? raw : "",
        confidence: "낮음",
      });
    }

    return Response.json({
      title: cleanField(parsed.title),
      artist: cleanField(parsed.artist),
      year: cleanField(parsed.year),
      museum: cleanField(parsed.museum),
      summary:
        cleanField(parsed.summary) ||
        "작품의 시각적 특징과 전시 맥락을 중심으로 감상할 수 있습니다.",
      simpleExplanation:
        cleanField(parsed.simpleExplanation) ||
        cleanField(parsed.explanation) ||
        "이 작품은 화면 구성, 색감, 인물 또는 소재의 배치를 중심으로 감상할 수 있습니다.",
      artistDescription: cleanField(parsed.artistDescription),
      artistIntention: cleanField(parsed.artistIntention),
      background: cleanField(parsed.background),
      viewingPoints:
        cleanList(parsed.viewingPoints).length > 0
          ? cleanList(parsed.viewingPoints)
          : [
              "작품의 중심 인물이나 주요 대상을 먼저 살펴보세요.",
              "색감과 명암이 어떤 분위기를 만드는지 관찰해보세요.",
              "화면의 구도와 시선의 방향을 따라가보세요.",
              "작품이 놓인 시대적 배경과 연결해보세요.",
            ],
      answer: cleanField(parsed.answer),
      confidence: cleanField(parsed.confidence) || "보통",
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