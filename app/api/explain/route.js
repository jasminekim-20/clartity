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

  const yearMatch = flat.match(
    /\b(1[4-9]\d{2}|20\d{2})(?:\s*[–-]\s*\d{1,4})?\b/
  );

  const year = yearMatch ? yearMatch[0] : "";

  const museumLine =
    lines.find((line) =>
      /(museum|gallery|louvre|national gallery|tate|orsay|orangerie|metropolitan|moma|rijksmuseum|prado|uffizi|미술관|박물관|루브르|오르세|내셔널)/i.test(
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

  const metadataWords =
    /(active|born|died|oil|canvas|panel|paper|wood|bronze|marble|collection|museum|gallery|louvre|national|gift|bequest|purchased|acquired|작가|작품|소장|미술관|박물관|French|Italian|Spanish|Dutch|German|British|American|medium|dimensions|credit)/i;

  let title = "";

  const possibleTitleLine =
    lines.find((line) => {
      if (line.length < 3) return false;
      if (line.length > 90) return false;
      if (artist && line.toLowerCase().includes(artist.toLowerCase())) {
        return false;
      }
      if (metadataWords.test(line)) return false;
      if (!/[A-Za-z가-힣]/.test(line)) return false;
      return true;
    }) || "";

  title = cleanField(possibleTitleLine);

  if (!title) {
    const beforeYear = flat.match(
      /([A-Z][A-Za-zÀ-ÿ'’\-]+(?:\s+[A-Za-zÀ-ÿ'’\-]+){0,7}),?\s*(?:1[4-9]\d{2}|20\d{2})/
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

function emptyResultFromOcr(ocrText) {
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

function buildPrompt({ safeOcrText, candidates, userProfile, question }) {
  const isQuestionMode = Boolean(question && question.trim());

  return `
너는 미술관 현장에서 작품을 해설하는 전문 도슨트이자 미술사 해설가다.

아래 텍스트는 사용자가 작품 캡션을 카메라 OCR로 인식한 결과다.
OCR에는 오타, 누락, 줄바꿈 오류, 외국어 혼합이 있을 수 있다.

[OCR 원문]
"""
${safeOcrText}
"""

[OCR에서 1차 추정한 후보]
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

가장 중요한 목표:
OCR 원문과 후보 정보를 바탕으로 실제 작품을 추정하고, 그 작품 자체에 대한 구체적인 해설을 작성해라.

절대 금지:
1. OCR 원문을 그대로 본문에 복붙하지 마라.
2. “카메라가 인식한 캡션에는…”으로 시작하지 마라.
3. “작품명은 보통…”, “화면에서 중심 대상을 보세요…” 같은 일반론을 쓰지 마라.
4. 아무 작품에나 붙일 수 있는 추상적인 해설을 쓰지 마라.
5. “확인 필요”, “미상”, “unknown”, “정보 없음” 같은 표현을 쓰지 마라.
6. 마크다운, 코드블록, JSON 외 설명문을 출력하지 마라.

반드시 해야 할 일:
1. OCR에 보이는 작가명, 작품명, 제작연도, 소장처를 최대한 보정해라.
2. OCR이 틀렸어도 유명 작가명/작품명 일부가 보이면 미술사 지식으로 자연스럽게 보정해라.
3. 해설은 반드시 해당 작품의 주제, 장면, 등장인물/대상, 구도, 색채, 미술사적 의미를 포함해야 한다.
4. 작가 설명은 반드시 해당 작가의 실제 미술사적 특징을 설명해야 한다.
5. 작가의 의도는 반드시 그 작품에서 작가가 무엇을 보여주려 했는지 설명해야 한다.
6. 배경 설명은 반드시 그 작품의 제작 맥락, 시대적 흐름, 주제의 배경을 설명해야 한다.
7. 모르는 필드는 빈 문자열 ""로 둬라. 단, 해설 본문은 빈 값으로 두지 말고 가능한 범위에서 작품별로 작성해라.

출력 JSON 형식:
{
  "title": "작품명",
  "artist": "작가명",
  "year": "제작연도 또는 빈 문자열",
  "museum": "소장처 또는 빈 문자열",
  "summary": "해당 작품의 핵심을 한 문장으로 요약",
  "simpleExplanation": "해당 작품 자체에 대한 구체적인 작품 해설. 최소 7문장",
  "artistDescription": "해당 작가에 대한 구체적인 설명. 최소 4문장",
  "artistIntention": "해당 작품에서의 작가 의도. 최소 4문장",
  "background": "작품의 제작 배경, 시대적 배경, 주제 배경. 최소 4문장",
  "viewingPoints": ["해당 작품 감상 포인트 1", "해당 작품 감상 포인트 2", "해당 작품 감상 포인트 3", "해당 작품 감상 포인트 4"],
  "answer": "${isQuestionMode ? "사용자 질문에 대한 직접 답변" : ""}",
  "confidence": "높음/보통/낮음"
}
`;
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
      temperature: 0.08,
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

    if (!apiKey) {
      return Response.json(emptyResultFromOcr(safeOcrText));
    }

    const prompt = buildPrompt({
      safeOcrText,
      candidates,
      userProfile,
      question,
    });

    const models = [
      "z-ai/glm-4.5-air:free",
      "qwen/qwen3-235b-a22b:free",
      "openrouter/free",
    ];

    let parsed = null;

    for (const model of models) {
      try {
        const raw = await callOpenRouter({
          apiKey,
          prompt,
          model,
        });

        parsed = extractJson(raw);

        if (
          parsed &&
          (parsed.simpleExplanation ||
            parsed.artistDescription ||
            parsed.artistIntention ||
            parsed.background)
        ) {
          break;
        }
      } catch (error) {
        console.error(error);
      }
    }

    if (!parsed) {
      return Response.json(emptyResultFromOcr(safeOcrText));
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
    return Response.json(emptyResultFromOcr(""));
  }
}