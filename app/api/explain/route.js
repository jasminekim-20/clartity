import Openrouter from "openrouter";

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
      "Clartity explain API is running. Use POST to generate artwork explanation.",
  });
}

export async function POST(request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "OPENROUTER_API_KEY가 설정되지 않았습니다. .env.local 또는 Vercel Environment Variables를 확인하세요.",
        },
        { status: 500 }
      );
    }

    const client = new Openrouter({
      apiKey,
    });

    const { ocrText, userProfile, question } = await request.json();

    if (!ocrText || ocrText.trim().length < 3) {
      return Response.json(
        {
          error: "OCR 텍스트가 너무 짧습니다. 작품 캡션을 다시 촬영해주세요.",
        },
        { status: 400 }
      );
    }

    const isQuestionMode = Boolean(question && question.trim());

    const prompt = `
너는 박물관·미술관 현장에서 사용하는 AI 작품 해설 도슨트다.

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
OCR 텍스트를 바탕으로 실제 작품을 추정하고, 그 작품에 맞는 해설을 생성한다.

절대 규칙:
1. 특정 작품을 임의로 고정하지 마라.
2. OCR 텍스트에 근거해서 작품명, 작가명, 제작연도, 소장처를 추정해라.
3. 확실하지 않은 정보는 지어내지 말고 "확인 필요"라고 적어라.
4. 단, OCR 텍스트에 유명 작품명/작가명이 일부라도 보이면 미술사 지식을 활용해 합리적으로 보정해라.
5. 미술 기초지식이 없는 20-30대도 이해할 수 있게 설명해라.
6. 설명은 너무 학술적으로 쓰지 말고, 실제 전시장 앞에서 도슨트가 말하듯 자연스럽게 써라.
7. 사용자가 질문했다면 answer 필드에 질문에 대한 직접 답변을 써라.
8. 반드시 JSON만 출력해라. 마크다운, 코드블록, 설명문은 출력하지 마라.

반드시 포함할 내용:
- 간단한 작품 해설
- 작가 설명
- 작가의 의도
- 작품의 배경 설명
- 감상 포인트

출력 JSON 형식:
{
  "title": "작품명 또는 확인 필요",
  "artist": "작가명 또는 확인 필요",
  "year": "제작연도 또는 확인 필요",
  "museum": "미술관/소장처 또는 확인 필요",
  "summary": "작품을 한 문장으로 쉽게 요약",
  "simpleExplanation": "간단한 작품 해설. 무엇을 그린 작품인지 쉽게 설명",
  "artistDescription": "작가 설명. 작가가 어떤 사람이고 어떤 미술사적 특징이 있는지 설명",
  "artistIntention": "작가의 의도. 이 작품에서 작가가 무엇을 보여주려 했는지 설명",
  "background": "작품의 배경 설명. 제작 시기, 미술사적 흐름, 소재의 의미 등을 설명",
  "viewingPoints": ["감상 포인트 1", "감상 포인트 2", "감상 포인트 3"],
  "answer": "${isQuestionMode ? "사용자 질문에 대한 직접 답변" : ""}",
  "confidence": "높음/보통/낮음"
}
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = response.output_text;
    const parsed = extractJson(raw);

    if (!parsed) {
      return Response.json({
        title: "확인 필요",
        artist: "확인 필요",
        year: "확인 필요",
        museum: "확인 필요",
        summary: "OCR 결과를 바탕으로 작품 정보를 분석했습니다.",
        simpleExplanation: raw || "AI 해설을 생성했지만 JSON 변환에 실패했습니다.",
        artistDescription: "추가 확인이 필요합니다.",
        artistIntention: "추가 확인이 필요합니다.",
        background: "추가 확인이 필요합니다.",
        viewingPoints: [
          "캡션의 작품명과 작가명을 다시 확인해보세요.",
          "작품의 색감, 구도, 재료를 중심으로 감상해보세요.",
          "전시실의 시대·작가 설명과 함께 보면 이해가 쉬워집니다.",
        ],
        answer: isQuestionMode ? raw : "",
        confidence: "낮음",
      });
    }

    return Response.json({
      title: parsed.title || "확인 필요",
      artist: parsed.artist || "확인 필요",
      year: parsed.year || "확인 필요",
      museum: parsed.museum || "확인 필요",
      summary: parsed.summary || "OCR 결과를 바탕으로 작품 정보를 분석했습니다.",
      simpleExplanation:
        parsed.simpleExplanation ||
        parsed.explanation ||
        "작품 설명을 생성하지 못했습니다.",
      artistDescription: parsed.artistDescription || "확인 필요",
      artistIntention: parsed.artistIntention || "확인 필요",
      background: parsed.background || "확인 필요",
      viewingPoints: Array.isArray(parsed.viewingPoints)
        ? parsed.viewingPoints
        : [
            "작품의 색감과 구도를 중심으로 감상해보세요.",
            "캡션의 작가명과 제작연도를 확인해보세요.",
            "작품이 놓인 전시 맥락을 함께 보면 좋습니다.",
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