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

function normaliseOcr(text) {
  return String(text || "")
    .replace(/[|{}[\]<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCandidatesFromOcr(ocrText) {
  const raw = String(ocrText || "");
  const lines = raw
    .split(/\n|\\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const flat = normaliseOcr(raw);

  const yearMatch =
    flat.match(/\b(1[4-9]\d{2}|20\d{2})(?:\s*[–-]\s*(\d{1,4}))?\b/) ||
    flat.match(/\b(1[4-9]\d{2}|20\d{2})\b/);

  const year = yearMatch ? yearMatch[0].trim() : "";

  const museumWords =
    /(museum|gallery|louvre|national gallery|tate|orsay|orangerie|metropolitan|moma|british museum|미술관|박물관|루브르|오르세|내셔널 갤러리)/i;

  const museumLine =
    lines.find((line) => museumWords.test(line)) ||
    "";

  const artistPattern =
    /([A-Z][a-zA-ZÀ-ÿ.'-]+(?:\s+[A-Z][a-zA-ZÀ-ÿ.'-]+){1,4})\s*(?:\(|,)?\s*(?:French|Italian|Spanish|Dutch|German|British|American|Flemish|Venetian|active|born|b\.|d\.|[0-9]{4})/i;

  const artistFromPattern = flat.match(artistPattern)?.[1] || "";

  const likelyArtistLine =
    lines.find((line) => {
      const hasName = /[A-Z][a-zA-ZÀ-ÿ.'-]+(?:\s+[A-Z][a-zA-ZÀ-ÿ.'-]+)+/.test(
        line
      );
      const hasBio =
        /(French|Italian|Spanish|Dutch|German|British|American|Flemish|Venetian|active|born|died|b\.|d\.|\d{4})/i.test(
          line
        );
      return hasName && hasBio;
    }) || "";

  const artist =
    cleanField(artistFromPattern) ||
    cleanField(
      likelyArtistLine
        .replace(/\(.+?\)/g, "")
        .replace(/\b(French|Italian|Spanish|Dutch|German|British|American|Flemish|Venetian)\b.*$/i, "")
        .replace(/\b(active|born|died|b\.|d\.).*$/i, "")
        .replace(/\d{4}.*$/g, "")
        .trim()
    );

  const metadataWords =
    /(French|Italian|Spanish|Dutch|German|British|American|Flemish|Venetian|active|born|died|oil|canvas|panel|paper|wood|bronze|marble|collection|museum|gallery|louvre|national|gift|bequest|purchased|acquired|작가|작품|소장|미술관|박물관)/i;

  const possibleTitleLines = lines.filter((line) => {
    if (line.length < 3) return false;
    if (artist && line.toLowerCase().includes(artist.toLowerCase())) return false;
    if (metadataWords.test(line)) return false;

    const hasLetters = /[A-Za-z가-힣]/.test(line);
    const notTooLong = line.length <= 80;

    return hasLetters && notTooLong;
  });

  let title = cleanField(possibleTitleLines[0] || "");

  if (!title) {
    const titleBeforeYear = flat.match(
      /([A-Z][A-Za-zÀ-ÿ'’\-]+(?:\s+[A-Za-zÀ-ÿ'’\-]+){0,6}),?\s*(?:1[4-9]\d{2}|20\d{2})/
    )?.[1];

    title = cleanField(titleBeforeYear || "");
  }

  if (!title && flat) {
    title = cleanField(
      flat
        .replace(artist, "")
        .split(/\s+/)
        .slice(0, 7)
        .join(" ")
    );
  }

  return {
    title,
    artist,
    year,
    museum: cleanField(museumLine),
    ocr: flat,
  };
}

function specificFallbackFromOcr(ocrText) {
  const c = extractCandidatesFromOcr(ocrText);

  const title = c.title || "인식된 작품";
  const artist = c.artist || "";
  const year = c.year || "";
  const museum = c.museum || "";

  const subject = artist ? `${artist}의 「${title}」` : `「${title}」`;

  return {
    title,
    artist,
    year,
    museum,
    summary: `${subject}은 캡션에서 인식된 정보를 바탕으로 작품의 주제, 화면 구성, 표현 방식을 중심으로 감상할 수 있는 작품입니다.`,
    simpleExplanation: `${subject}을 감상할 때는 먼저 제목이 암시하는 장면이나 소재를 화면에서 찾아보는 것이 좋습니다. 캡션에서 인식된 정보에 따르면 이 작품은 특정 인물, 풍경, 신화적 장면, 혹은 일상적 순간을 시각적으로 구성한 작품으로 볼 수 있습니다. 화면에서 가장 눈에 띄는 대상이 어디에 배치되어 있는지, 그 주변의 색과 명암이 어떤 분위기를 만드는지 살펴보세요. 작품의 제목은 보통 화면 속 핵심 사건이나 인물을 이해하는 중요한 단서가 됩니다. 또한 제작연도와 소장처 정보가 함께 보이면, 이 작품이 어떤 시대적 흐름과 전시 맥락 안에 있는지도 함께 생각할 수 있습니다. 이 작품은 단순히 대상을 보여주는 것이 아니라, 작가가 그 대상을 어떤 시선과 분위기로 해석했는지를 보여준다는 점에서 감상 가치가 있습니다.`,
    artistDescription: artist
      ? `${artist}로 인식된 작가명을 기준으로 작품을 이해할 수 있습니다. 작가의 세부 양식은 작품의 붓질, 색감, 인물 표현, 구도에서 드러납니다. 인물이 사실적으로 표현되었는지, 색채가 강하게 강조되었는지, 화면이 정적인지 동적인지를 보면 작가가 속한 미술사적 흐름을 추정할 수 있습니다. 따라서 작가 이름만 보는 것보다, 작품 속 표현 방식과 함께 연결해서 보는 것이 더 중요합니다.`
      : "",
    artistIntention: `이 작품에서 작가는 단순히 대상을 기록하기보다, 특정한 분위기와 시선을 전달하려 했을 가능성이 큽니다. 제목으로 보이는 “${title}”은 작품의 핵심 주제나 장면을 이해하는 출발점입니다. 화면의 중심부, 빛이 닿는 부분, 인물이나 사물의 방향을 따라가면 작가가 관람자에게 무엇을 먼저 보게 하고 싶었는지 알 수 있습니다. 특히 색감과 구도는 작가가 감정, 긴장감, 아름다움, 상징성을 전달하는 주요 장치로 작동합니다.`,
    background: `${year ? `${year} 전후의 제작 시기` : "제작 시기"}와 ${museum ? `${museum} 소장 정보` : "전시 맥락"}를 함께 보면 이 작품을 더 구체적으로 이해할 수 있습니다. 미술관 캡션은 작품명, 작가명, 연도, 재료, 소장처를 통해 작품의 역사적 위치를 알려줍니다. 이 정보들은 작품이 어느 시대의 미술 흐름과 연결되는지, 어떤 문화적 배경에서 만들어졌는지를 파악하는 단서가 됩니다. 전시장에서는 같은 공간의 다른 작품들과 비교하면서 이 작품의 주제와 표현 방식이 어떤 차이를 보이는지 살펴보는 것이 좋습니다.`,
    viewingPoints: [
      `작품명 「${title}」이 화면 속 어떤 대상이나 장면과 연결되는지 확인해보세요.`,
      "가장 밝은 부분과 가장 어두운 부분이 관람자의 시선을 어디로 이끄는지 살펴보세요.",
      "인물이나 사물의 자세, 방향, 배치가 어떤 분위기를 만드는지 관찰해보세요.",
      "캡션의 작가명, 제작연도, 소장처 정보와 작품의 표현 방식을 함께 연결해보세요.",
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

    const body = await request.json();
    const { ocrText, userProfile, question } = body;

    const safeOcrText =
      ocrText && String(ocrText).trim().length > 0
        ? String(ocrText).trim()
        : "museum artwork caption";

    const candidates = extractCandidatesFromOcr(safeOcrText);
    const isQuestionMode = Boolean(question && question.trim());

    if (!apiKey) {
      return Response.json(specificFallbackFromOcr(safeOcrText));
    }

    const prompt = `
너는 미술관 현장에서 관람객에게 설명하는 전문 도슨트다.

아래 OCR 텍스트는 사용자가 카메라로 작품 캡션을 촬영해 인식한 결과다.
OCR에는 오타, 누락, 줄바꿈 오류, 외국어 혼합이 있을 수 있다.

[OCR 원문]
"""
${safeOcrText}
"""

[앱이 OCR에서 먼저 추정한 후보]
- 작품명 후보: ${candidates.title || ""}
- 작가명 후보: ${candidates.artist || ""}
- 제작연도 후보: ${candidates.year || ""}
- 소장처 후보: ${candidates.museum || ""}

[사용자]
- 지식 수준: ${userProfile?.level || "미술 입문자"}
- 선호 취향: ${userProfile?.taste || "쉽고 감성적인 설명"}
- 연령대: ${userProfile?.age || "20-30대"}

[질문]
${question || "없음"}

절대 규칙:
1. OCR 텍스트와 후보 정보를 기준으로, 매번 다른 작품을 판단해야 한다.
2. 특정 작품으로 고정해서 설명하지 마라.
3. 일반적인 미술 감상법만 쓰지 마라.
4. 반드시 OCR에서 추정되는 작품명과 작가명에 맞춰 구체적으로 설명해라.
5. OCR에 Titian, Tiziano, Ingres, Monet, Van Gogh, Renoir, Picasso 등 작가명이 보이면 해당 작가의 실제 미술사적 특징을 반영해라.
6. OCR에 Bacchus, Ariadne, Odalisque, Water Lilies, Red Boats 등 제목 단어가 보이면 그 제목의 주제와 장면을 중심으로 설명해라.
7. "확인 필요", "미상", "unknown", "정보 없음" 같은 표현은 절대 쓰지 마라.
8. 모르는 필드는 빈 문자열 ""로 둬라.
9. 하지만 작품명과 작가명은 후보에서 추정 가능하면 반드시 채워라.
10. 반드시 JSON만 출력해라. 마크다운이나 코드블록은 쓰지 마라.

해설 기준:
- simpleExplanation: 최소 6문장. 그 작품의 주제, 화면 구성, 인물/대상, 분위기를 구체적으로 설명
- artistDescription: 최소 4문장. 그 작가의 미술사적 특징 설명
- artistIntention: 최소 4문장. 그 작품에서 작가가 보여주려 한 의도 설명
- background: 최소 4문장. 제작 시기, 미술사적 흐름, 사회·문화적 배경 설명
- viewingPoints: 구체적 감상 포인트 4개

출력 JSON:
{
  "title": "작품명",
  "artist": "작가명",
  "year": "제작연도 또는 빈 문자열",
  "museum": "소장처 또는 빈 문자열",
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
          temperature: 0.12,
          max_tokens: 1900,
        }),
      }
    );

    const result = await openRouterResponse.json();

    if (!openRouterResponse.ok) {
      return Response.json(specificFallbackFromOcr(safeOcrText));
    }

    const raw = result?.choices?.[0]?.message?.content || "";
    const parsed = extractJson(raw);

    if (!parsed) {
      return Response.json(specificFallbackFromOcr(safeOcrText));
    }

    const fallback = specificFallbackFromOcr(safeOcrText);

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

    return Response.json({
      title: cleaned.title || candidates.title || fallback.title,
      artist: cleaned.artist || candidates.artist || fallback.artist,
      year: cleaned.year || candidates.year || "",
      museum: cleaned.museum || candidates.museum || "",
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
    return Response.json(specificFallbackFromOcr(""));
  }
}