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

function fallbackFromOcr(ocrText) {
  const cleaned = cleanField(
    String(ocrText || "")
      .replace(/\s+/g, " ")
      .trim()
  );

  const words = cleaned.split(" ").filter(Boolean);

  const yearMatch = cleaned.match(/\b(1[3-9]\d{2}|20\d{2})\b/);
  const year = yearMatch ? yearMatch[0] : "";

  const possibleTitle = words
    .filter(
      (word) =>
        !/^(oil|canvas|museum|gallery|collection|artist|title|born|died|active|french|italian|spanish|british|american)$/i.test(
          word
        )
    )
    .slice(0, 7)
    .join(" ");

  const possibleArtist = words
    .filter((word) => /^[A-Z][A-Za-zÀ-ÿ'-]{2,}$/.test(word))
    .slice(0, 4)
    .join(" ");

  return {
    title: possibleTitle || "인식된 작품",
    artist: possibleArtist,
    year,
    museum: "",
    summary: `${possibleTitle || "이 작품"}은 캡션에서 인식된 정보를 바탕으로 감상할 수 있는 작품입니다.`,
    simpleExplanation: `캡션에서 인식된 핵심 정보는 “${cleaned.slice(
      0,
      180
    )}”입니다. 이 정보를 기준으로 작품명, 작가명, 제작 시기, 전시 맥락을 연결해 감상할 수 있습니다. 작품을 볼 때는 먼저 화면에서 가장 눈에 띄는 대상과 전체 구도를 살펴보는 것이 좋습니다. 이후 색감, 명암, 인물의 자세, 배경의 구성 등을 함께 보면 작품이 전달하려는 분위기가 더 잘 드러납니다. 캡션의 일부가 정확하지 않더라도, 인식된 제목과 작가명으로 보이는 단어를 중심으로 작품의 주제와 표현 방식을 추정할 수 있습니다.`,
    artistDescription: possibleArtist
      ? `${possibleArtist}로 인식된 작가명을 기준으로 작품을 이해할 수 있습니다. 작가의 세부 정보가 완전히 인식되지 않더라도, 작품의 표현 방식과 주제에서 미술사적 단서를 찾을 수 있습니다. 인물 표현, 색감, 구도, 재료를 함께 보면 작가가 어떤 방식으로 대상을 해석했는지 파악하기 쉽습니다.`
      : "",
    artistIntention:
      "작가는 작품 속 대상이나 장면을 단순히 기록하기보다, 특정한 분위기와 시선을 전달하려 했을 가능성이 큽니다. 작품의 중심부, 빛이 닿는 부분, 인물이나 사물의 방향을 따라가면 작가가 강조하고 싶은 지점을 찾을 수 있습니다. 캡션의 제목 단어와 화면 속 표현을 연결해 보면 작품의 의도가 더 선명해집니다.",
    background:
      "이 작품은 캡션에 포함된 제작연도, 소장처, 작가명 같은 정보를 함께 볼 때 더 잘 이해할 수 있습니다. 전시장에서는 같은 공간의 다른 작품들과 비교해 시대적 흐름과 주제의 차이를 살펴보는 것이 좋습니다. 작품의 재료와 표현 방식도 제작 배경을 이해하는 중요한 단서가 됩니다.",
    viewingPoints: [
      "캡션에서 작품명으로 보이는 단어와 화면 속 중심 대상을 연결해보세요.",
      "작가명으로 보이는 고유명사를 기준으로 작품의 시대와 양식을 추정해보세요.",
      "색감, 명암, 인물의 자세, 사물의 배치를 함께 살펴보세요.",
      "주변 작품과 비교해 이 작품만의 분위기와 표현 방식을 찾아보세요.",
    ],
    answer: "",
    confidence: "보통",
  };
}

export async function GET() {
  return Response.json({
    message: "Clartity explain API is running with OpenRouter.",
  });
}

export async function POST(request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    const { ocrText, userProfile, question } = await request.json();

    const safeOcrText =
      ocrText && String(ocrText).trim().length > 0
        ? String(ocrText).trim()
        : "museum artwork caption";

    if (!apiKey) {
      return Response.json(fallbackFromOcr(safeOcrText));
    }

    const isQuestionMode = Boolean(question && question.trim());

    const prompt = `
너는 미술관 현장에서 관람객에게 설명하는 전문 도슨트다.

아래 텍스트는 사용자가 카메라 OCR로 인식한 작품 캡션이다.
OCR 텍스트에는 오타, 누락, 줄바꿈 오류, 외국어 혼합이 있을 수 있다.

[OCR 텍스트]
"""
${safeOcrText}
"""

[사용자]
- 지식 수준: ${userProfile?.level || "미술 입문자"}
- 선호 취향: ${userProfile?.taste || "쉽고 감성적인 설명"}
- 연령대: ${userProfile?.age || "20-30대"}

[질문]
${question || "없음"}

중요:
- 특정 작품을 고정해서 설명하지 마라.
- OCR 텍스트마다 다른 작품으로 판단해야 한다.
- OCR 안에 보이는 작품명, 작가명, 제작연도, 소장처를 최대한 정제해라.
- OCR이 약간 틀렸더라도 유명 작품명/작가명이 보이면 자연스럽게 보정해라.
- 제목이나 작가명이 일부만 보이면 가장 가능성 높은 이름으로 정리해라.
- 절대 "확인 필요", "미상", "unknown", "정보 없음"이라고 쓰지 마라.
- 모르는 필드는 빈 문자열 ""로 둬라.
- 하지만 작품명과 작가명은 OCR에서 조금이라도 추정 가능하면 반드시 채워라.
- 해설은 일반론이 아니라, 추정된 그 작품의 제목/작가/주제에 맞춰 구체적으로 작성해라.
- 반드시 JSON만 출력해라. 마크다운이나 코드블록은 쓰지 마라.

해설 기준:
- summary: 작품의 핵심을 한 문장으로 요약
- simpleExplanation: 최소 6문장. 작품의 주제, 화면 구성, 인물/대상, 분위기, 관람 포인트를 구체적으로 설명
- artistDescription: 최소 4문장. 작가가 어떤 미술사적 특징을 가진 인물인지 설명
- artistIntention: 최소 4문장. 작가가 이 작품에서 무엇을 보여주려 했는지 설명
- background: 최소 4문장. 제작 시기, 미술사적 흐름, 사회·문화적 배경 설명
- viewingPoints: 구체적인 감상 포인트 4개

출력 JSON:
{
  "title": "OCR에서 추정한 작품명. 없으면 빈 문자열",
  "artist": "OCR에서 추정한 작가명. 없으면 빈 문자열",
  "year": "제작연도. 없으면 빈 문자열",
  "museum": "소장처/미술관. 없으면 빈 문자열",
  "summary": "작품 한 문장 요약",
  "simpleExplanation": "그 작품에 대한 구체적 작품 해설",
  "artistDescription": "그 작가에 대한 구체적 설명",
  "artistIntention": "그 작품에서의 작가 의도",
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
          temperature: 0.15,
          max_tokens: 1800,
        }),
      }
    );

    const result = await openRouterResponse.json();

    if (!openRouterResponse.ok) {
      return Response.json(fallbackFromOcr(safeOcrText));
    }

    const raw = result?.choices?.[0]?.message?.content || "";
    const parsed = extractJson(raw);

    if (!parsed) {
      return Response.json(fallbackFromOcr(safeOcrText));
    }

    const cleaned = {
      title: cleanField(parsed.title),
      artist: cleanField(parsed.artist),
      year: cleanField(parsed.year),
      museum: cleanField(parsed.museum),
      summary: cleanField(parsed.summary),
      simpleExplanation: cleanField(
        parsed.simpleExplanation || parsed.explanation
      ),
      artistDescription: cleanField(parsed.artistDescription),
      artistIntention: cleanField(parsed.artistIntention),
      background: cleanField(parsed.background),
      viewingPoints: cleanList(parsed.viewingPoints),
      answer: cleanField(parsed.answer),
      confidence: cleanField(parsed.confidence) || "보통",
    };

    const fallback = fallbackFromOcr(safeOcrText);

    return Response.json({
      title: cleaned.title || fallback.title,
      artist: cleaned.artist || fallback.artist,
      year: cleaned.year || fallback.year,
      museum: cleaned.museum,
      summary: cleaned.summary || fallback.summary,
      simpleExplanation:
        cleaned.simpleExplanation || fallback.simpleExplanation,
      artistDescription:
        cleaned.artistDescription || fallback.artistDescription,
      artistIntention: cleaned.artistIntention || fallback.artistIntention,
      background: cleaned.background || fallback.background,
      viewingPoints:
        cleaned.viewingPoints.length > 0
          ? cleaned.viewingPoints
          : fallback.viewingPoints,
      answer: cleaned.answer,
      confidence: cleaned.confidence,
    });
  } catch (error) {
    console.error(error);
    return Response.json(fallbackFromOcr(""));
  }
}