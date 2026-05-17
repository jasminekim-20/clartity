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

function normalizeOcr(text) {
  return String(text || "")
    .replace(/[|{}[\]<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCandidatesFromOcr(ocrText) {
  const raw = String(ocrText || "");
  const flat = normalizeOcr(raw);

  const lines = raw
    .split(/\n|\\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const yearMatch = flat.match(/\b(1[4-9]\d{2}|20\d{2})(?:\s*[–-]\s*\d{1,4})?\b/);
  const year = yearMatch ? yearMatch[0] : "";

  const museumLine =
    lines.find((line) =>
      /(museum|gallery|louvre|national gallery|tate|orsay|orangerie|metropolitan|moma|미술관|박물관|루브르|오르세|내셔널)/i.test(
        line
      )
    ) || "";

  let artist = "";

  const artistPatterns = [
    /([A-Z][a-zA-ZÀ-ÿ.'-]+(?:\s+[A-Z][a-zA-ZÀ-ÿ.'-]+){0,4})\s*\((?:[A-Za-zÀ-ÿ\s.'-]+)\)/,
    /([A-Z][a-zA-ZÀ-ÿ.'-]+(?:\s+[A-Z][a-zA-ZÀ-ÿ.'-]+){0,4})\s*(?:,|\s)\s*(?:active|born|died|b\.|d\.|French|Italian|Spanish|Dutch|German|British|American|Venetian|Flemish|\d{4})/i,
  ];

  for (const pattern of artistPatterns) {
    const match = flat.match(pattern);
    if (match?.[1]) {
      artist = cleanField(match[1]);
      break;
    }
  }

  if (!artist) {
    const artistLine =
      lines.find((line) =>
        /(Titian|Tiziano|Ingres|Monet|Manet|Renoir|Van Gogh|Gogh|Picasso|Matisse|Rembrandt|Vermeer|Degas|Cézanne|Cezanne|Gauguin|Raphael|Michelangelo|Leonardo|Botticelli|Caravaggio)/i.test(
          line
        )
      ) || "";

    artist = cleanField(
      artistLine
        .replace(/\(.+?\)/g, "")
        .replace(/\b(active|born|died|b\.|d\.|French|Italian|Spanish|Dutch|German|British|American|Venetian|Flemish)\b.*$/i, "")
        .replace(/\d{4}.*$/g, "")
        .trim()
    );
  }

  const metadataWords =
    /(active|born|died|oil|canvas|panel|paper|wood|bronze|marble|collection|museum|gallery|louvre|national|gift|bequest|purchased|acquired|작가|작품|소장|미술관|박물관|French|Italian|Spanish|Dutch|German|British|American)/i;

  const possibleTitleLines = lines.filter((line) => {
    if (line.length < 3) return false;
    if (line.length > 90) return false;
    if (artist && line.toLowerCase().includes(artist.toLowerCase())) return false;
    if (metadataWords.test(line)) return false;
    if (!/[A-Za-z가-힣]/.test(line)) return false;
    return true;
  });

  let title = cleanField(possibleTitleLines[0] || "");

  if (!title) {
    const knownTitlePattern =
      /(Bacchus\s+and\s+Ariadne|La\s+Grande\s+Odalisque|Water\s+Lilies|Red\s+Boats,?\s+Argenteuil|Starry\s+Night|Mona\s+Lisa|The\s+Kiss|The\s+Birth\s+of\s+Venus|Girl\s+with\s+a\s+Pearl\s+Earring)/i;

    const knownTitle = flat.match(knownTitlePattern)?.[1] || "";
    title = cleanField(knownTitle);
  }

  if (!title) {
    const beforeYear = flat.match(
      /([A-Z][A-Za-zÀ-ÿ'’\-]+(?:\s+[A-Za-zÀ-ÿ'’\-]+){0,6}),?\s*(?:1[4-9]\d{2}|20\d{2})/
    )?.[1];

    title = cleanField(beforeYear || "");
  }

  return {
    title,
    artist,
    year,
    museum: cleanField(museumLine),
    ocr: flat,
  };
}

function weakFallback(ocrText) {
  const c = extractCandidatesFromOcr(ocrText);

  return {
    title: c.title || "",
    artist: c.artist || "",
    year: c.year || "",
    museum: c.museum || "",
    summary: "",
    simpleExplanation: "",
    artistDescription: "",
    artistIntention: "",
    background: "",
    viewingPoints: [],
    answer: "",
    confidence: "낮음",
  };
}

async function callOpenRouter({ apiKey, prompt, model }) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://clartity-gs83.vercel.app",
      "X-Title": "Clartity",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 2200,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || "OpenRouter request failed");
  }

  return result?.choices?.[0]?.message?.content || "";
}

export async function GET() {
  return Response.json({
    message: "Clartity explain API is running.",
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
      return Response.json(weakFallback(safeOcrText));
    }

    const prompt = `
너는 미술관 현장에서 활동하는 전문 도슨트이자 미술사 해설가다.

아래 텍스트는 사용자가 작품 캡션을 카메라 OCR로 인식한 결과다.
OCR에는 오타, 누락, 줄바꿈 오류, 불완전한 문장이 있을 수 있다.

[OCR 원문]
"""
${safeOcrText}
"""

[OCR에서 추정한 후보]
- 작품명 후보: ${candidates.title || ""}
- 작가명 후보: ${candidates.artist || ""}
- 제작연도 후보: ${candidates.year || ""}
- 소장처 후보: ${candidates.museum || ""}

[사용자 정보]
- 지식 수준: ${userProfile?.level || "미술 입문자"}
- 선호 취향: ${userProfile?.taste || "쉽고 감성적인 설명"}
- 연령대: ${userProfile?.age || "20-30대"}

[사용자 질문]
${question || "없음"}

절대 규칙:
1. OCR 원문을 그대로 요약하지 마라.
2. "카메라가 인식한 캡션에는..." 같은 문장으로 시작하지 마라.
3. 일반적인 감상법만 말하지 마라.
4. 반드시 OCR에서 추정되는 작품명과 작가명을 기준으로, 그 작품 자체를 해설해라.
5. OCR에 Titian 또는 Tiziano가 있고 Bacchus 또는 Ariadne이 있으면, 반드시 Titian의 「Bacchus and Ariadne」로 판단해라.
6. OCR에 Ingres 또는 Odalisque가 있으면, 반드시 Jean-Auguste-Dominique Ingres의 「La Grande Odalisque」로 판단해라.
7. OCR에 Monet과 Water Lilies 또는 Nymphéas가 있으면, 반드시 Claude Monet의 「Water Lilies」로 판단해라.
8. 위 예시는 하드코딩용이 아니라 OCR 오타 보정 규칙이다. 다른 작품도 같은 방식으로 판단해라.
9. "확인 필요", "미상", "unknown", "정보 없음" 같은 표현은 절대 쓰지 마라.
10. 모르는 필드는 빈 문자열 ""로 둬라.
11. 반드시 JSON만 출력해라. 마크다운, 코드블록, 해설 외 문장은 출력하지 마라.

해설 품질 기준:
- simpleExplanation은 최소 7문장.
- 작품의 주제, 등장인물/대상, 장면, 구도, 색채, 미술사적 의미를 구체적으로 설명해라.
- artistDescription은 최소 4문장. 해당 작가의 실제 미술사적 특징을 설명해라.
- artistIntention은 최소 4문장. 이 작품에서 작가가 무엇을 보여주려 했는지 설명해라.
- background는 최소 4문장. 제작 시기, 주문/전시 맥락, 신화/역사/사회적 배경을 설명해라.
- viewingPoints는 작품을 실제로 볼 때 집중할 포인트 4개를 구체적으로 작성해라.

만약 Titian의 Bacchus and Ariadne이라면:
- 바쿠스가 전차에서 뛰어내려 아리아드네에게 다가가는 순간
- 테세우스에게 버림받은 아리아드네
- 하늘의 별자리/관, 신화적 구원과 사랑
- 베네치아 회화의 색채와 역동성
이 내용을 반드시 포함해라.

출력 JSON:
{
  "title": "작품명",
  "artist": "작가명",
  "year": "제작연도 또는 빈 문자열",
  "museum": "소장처 또는 빈 문자열",
  "summary": "작품 한 문장 요약",
  "simpleExplanation": "해당 작품 자체에 대한 구체적 작품 해설",
  "artistDescription": "해당 작가에 대한 구체적 설명",
  "artistIntention": "해당 작품에서의 작가 의도",
  "background": "작품 배경 설명",
  "viewingPoints": ["감상 포인트 1", "감상 포인트 2", "감상 포인트 3", "감상 포인트 4"],
  "answer": "${isQuestionMode ? "사용자 질문에 대한 직접 답변" : ""}",
  "confidence": "높음/보통/낮음"
}
`;

    let raw = "";

    try {
      raw = await callOpenRouter({
        apiKey,
        prompt,
        model: "z-ai/glm-4.5-air:free",
      });
    } catch {
      raw = await callOpenRouter({
        apiKey,
        prompt,
        model: "openrouter/free",
      });
    }

    const parsed = extractJson(raw);

    if (!parsed) {
      return Response.json(weakFallback(safeOcrText));
    }

    const cleaned = {
      title: cleanField(parsed.title),
      artist: cleanField(parsed.artist),
      year: cleanField(parsed.year),
      museum: cleanField(parsed.museum),
      summary: cleanField(parsed.summary),
      simpleExplanation: cleanField(parsed.simpleExplanation || parsed.explanation),
      artistDescription: cleanField(parsed.artistDescription),
      artistIntention: cleanField(parsed.artistIntention),
      background: cleanField(parsed.background),
      viewingPoints: cleanList(parsed.viewingPoints),
      answer: cleanField(parsed.answer),
      confidence: cleanField(parsed.confidence) || "보통",
    };

    return Response.json({
      title: cleaned.title || candidates.title || "",
      artist: cleaned.artist || candidates.artist || "",
      year: cleaned.year || candidates.year || "",
      museum: cleaned.museum || candidates.museum || "",
      summary: cleaned.summary,
      simpleExplanation: cleaned.simpleExplanation,
      artistDescription: cleaned.artistDescription,
      artistIntention: cleaned.artistIntention,
      background: cleaned.background,
      viewingPoints: cleaned.viewingPoints,
      answer: cleaned.answer,
      confidence: cleaned.confidence,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      title: "",
      artist: "",
      year: "",
      museum: "",
      summary: "",
      simpleExplanation: "",
      artistDescription: "",
      artistIntention: "",
      background: "",
      viewingPoints: [],
      answer: "",
      confidence: "낮음",
    });
  }
}