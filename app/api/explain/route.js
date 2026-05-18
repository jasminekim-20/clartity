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

  const titleBeforeYearMatches = [
    ...flat.matchAll(
      /([A-Z][A-Za-zÀ-ÿ'’\-]+(?:\s+(?:and|of|the|The|A|An|de|la|le|les|des|du|[A-Z][A-Za-zÀ-ÿ'’\-]+)){0,9}),?\s*(1[4-9]\d{2}|20\d{2})(?:\s*[–-]\s*\d{1,4})?/g
    ),
  ];

  let title = "";

  if (titleBeforeYearMatches.length > 0) {
    const candidates = titleBeforeYearMatches
      .map((m) => cleanField(m[1]))
      .filter(Boolean)
      .filter((t) => {
        if (!artist) return true;
        return !t.toLowerCase().includes(artist.toLowerCase());
      });

    title = candidates[candidates.length - 1] || "";
  }

  if (!title) {
    const metadataWords =
      /(active|born|died|oil|canvas|panel|paper|wood|bronze|marble|collection|museum|gallery|louvre|national|gift|bequest|purchased|acquired|작가|작품|소장|미술관|박물관|French|Italian|Spanish|Dutch|German|British|American|medium|dimensions|credit)/i;

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
  }

  let captionBody = flat;

  [title, artist, year, museumLine].forEach((part) => {
    if (part) {
      captionBody = captionBody.replace(part, " ");
    }
  });

  captionBody = captionBody
    .replace(
      /\b(active|born|died|French|Italian|Spanish|Dutch|German|British|American|Venetian|Flemish)\b/gi,
      " "
    )
    .replace(/\b(1[4-9]\d{2}|20\d{2})(?:\s*[–-]\s*\d{1,4})?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title,
    artist,
    year,
    museum: cleanField(museumLine),
    captionBody,
    ocr: flat,
  };
}

function buildEmergencyExplanation(ocrText) {
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

    summary: `${subject}은 화면의 구도, 색채, 배경 처리, 표현 기법을 중심으로 감상할 수 있는 작품입니다.`,

    simpleExplanation:
      `${subject}은 작품의 제목과 캡션 정보를 바탕으로 장면의 주제와 시각적 구성을 함께 읽어야 합니다. ` +
      `먼저 화면에서 가장 중요한 인물이나 대상이 어디에 놓여 있는지 살펴보면 작품의 중심 구조가 보입니다. ` +
      `배경은 단순한 장식이 아니라 작품의 분위기를 조절하는 장치로 작동합니다. ` +
      `색채가 어둡고 차분하다면 인물이나 사건의 긴장감을 강화하고, 밝고 부드럽다면 장면을 안정적이고 서정적으로 보이게 합니다. ` +
      `구도 역시 중요합니다. 인물이 정면을 향하는지, 몸이 비틀려 있는지, 시선이 어디로 향하는지에 따라 작품의 감정이 달라집니다. ` +
      `공간 표현에서는 전경과 배경의 거리감, 빛이 닿는 위치, 사물이 겹쳐지는 방식이 작품의 깊이를 만듭니다. ` +
      `따라서 이 작품은 단순히 무엇이 그려졌는지보다, 작가가 그 대상을 어떤 색채·구도·빛의 방식으로 해석했는지를 보는 것이 핵심입니다.`,

    artistDescription: artist
      ? `${artist}의 작품을 볼 때는 작가가 빛, 색채, 선, 구도를 어떻게 사용하는지 살펴보는 것이 중요합니다. ` +
        `작가는 단순히 대상을 사실적으로 옮기는 것이 아니라, 자신만의 시각적 언어로 장면을 재구성합니다. ` +
        `인물의 윤곽을 또렷하게 강조하는 작가도 있고, 반대로 경계를 흐리게 만들어 공기감과 분위기를 강조하는 작가도 있습니다. ` +
        `색채를 강하게 대비시키면 장면이 극적으로 보이고, 부드러운 색 변화는 인물이나 공간을 더 자연스럽게 연결합니다. ` +
        `${artist}의 이름이 캡션에서 인식된 만큼, 이 작품은 작가의 대표적인 표현 방식과 연결해 감상하는 것이 좋습니다.`
      : `이 작품은 작가명이 완전히 특정되지 않더라도 화면의 표현 방식에서 작가적 특징을 읽을 수 있습니다. ` +
        `선이 뚜렷한지, 색채가 강조되는지, 빛과 그림자가 극적으로 대비되는지, 배경이 사실적인지 상징적인지 살펴보는 것이 중요합니다. ` +
        `작가는 대상을 그대로 재현하는 것이 아니라, 자신의 시대적 감각과 미적 기준으로 화면을 구성합니다. ` +
        `따라서 구도, 색채, 원근감, 붓질은 작가의 의도를 읽는 핵심 단서가 됩니다.`,

    artistIntention:
      `${subject}에서 작가는 관람자가 특정한 장면이나 대상에 시선을 집중하도록 화면을 구성했을 가능성이 큽니다. ` +
      `중심 인물이나 대상의 위치는 우연히 정해진 것이 아니라, 작품의 의미를 가장 효과적으로 전달하기 위한 선택입니다. ` +
      `배경의 색감과 명암은 장면의 감정적 온도를 조절합니다. ` +
      `어두운 배경은 인물이나 사건을 더 극적으로 부각하고, 흐릿한 배경은 공간을 깊게 만들거나 신비로운 분위기를 줄 수 있습니다. ` +
      `작가는 이러한 시각 장치를 통해 관람자가 단순히 그림을 보는 것이 아니라, 작품 속 장면의 긴장감과 분위기를 느끼도록 의도했습니다.`,

    background:
      `${year ? `${year}에 제작된 ` : ""}${subject}은 작품명, 작가명, 제작연도, 소장처 정보를 함께 볼 때 더 정확히 이해됩니다. ` +
      `제작연도는 이 작품이 어떤 시대적 미술 흐름 안에 있는지 보여주는 단서입니다. ` +
      `작품이 신화, 종교, 초상, 풍경, 역사적 사건 중 무엇을 다루는지에 따라 배경 해석도 달라집니다. ` +
      `예를 들어 신화적 장면이라면 등장인물의 몸짓과 상징물이 중요하고, 초상화라면 인물의 시선·손·의상·배경이 사회적 의미를 가집니다. ` +
      `${museum ? `${museum} 소장 정보는 이 작품이 현재 어떤 전시 맥락에서 보존되고 있는지도 보여줍니다. ` : ""}` +
      `따라서 이 작품은 단순한 이미지가 아니라, 특정 시대의 미적 기준과 작가의 표현 전략이 결합된 결과물로 보아야 합니다.`,

    viewingPoints: [
      "배경의 색감이 인물이나 중심 대상을 어떻게 돋보이게 하는지 보세요.",
      "인물이나 대상의 윤곽이 또렷한지, 흐릿하게 처리되었는지 확인해보세요.",
      "원근감이 배경을 깊게 만드는지, 혹은 화면을 평면적으로 보이게 하는지 살펴보세요.",
      "작가가 빛, 색채, 구도, 시선 중 무엇을 가장 강하게 사용했는지 비교해보세요.",
    ],

    answer: "",
    confidence: "보통",
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
- 캡션 설명문 후보: ${candidates.captionBody || ""}

[사용자 정보]
- 지식 수준: ${userProfile?.level || "미술 입문자"}
- 선호 취향: ${userProfile?.taste || "쉽고 감성적인 설명"}
- 연령대: ${userProfile?.age || "20-30대"}

[사용자 질문]
${question || "없음"}

목표:
OCR 원문과 후보 정보를 바탕으로 실제 작품을 추정하고, 그 작품만의 특징적인 해설을 작성해라.

해설 스타일:
사용자는 단순한 감상법이 아니라, 아래 예시 같은 작품별 해석을 원한다.

예시:
모나리자라면:
- 스푸마토: 입가와 눈가의 경계를 흐리게 칠해 미소가 보는 각도에 따라 다르게 느껴지게 함
- 대기 원근법: 배경의 산과 길을 푸르고 흐릿하게 처리해 깊은 공간감을 만듦
- 황금비율과 구도: 인물의 얼굴과 손이 안정적인 삼각형 구도를 형성함
- 인물의 시선: 정면을 바라보는 듯하지만 고정되지 않아 관람자와 심리적 긴장감을 만듦
- 다빈치의 특징: 해부학적 관찰, 빛의 부드러운 전환, 과학적 시각이 결합됨

즉, 어떤 작품이든 반드시 다음처럼 설명해야 한다:
1. 이 작품의 핵심 장면 또는 주제
2. 색채와 배경 처리
3. 구도와 원근법
4. 작가가 사용한 대표 기법 또는 양식
5. 인물·사물·상징의 의미
6. 왜 이 작품이 미술사적으로 중요한지

절대 금지:
1. OCR 원문을 그대로 본문에 복붙하지 마라.
2. “카메라가 인식한 캡션에는…”으로 시작하지 마라.
3. “작품명은 보통…”, “화면에서 중심 대상을 보세요…” 같은 일반론을 쓰지 마라.
4. “작가는 단순히 대상을 기록하기보다…” 같은 아무 작품에나 붙는 문장을 쓰지 마라.
5. “확인 필요”, “미상”, “unknown”, “정보 없음” 같은 표현을 쓰지 마라.
6. 마크다운, 코드블록, JSON 외 설명문을 출력하지 마라.

반드시 해야 할 일:
1. OCR에 보이는 작가명, 작품명, 제작연도, 소장처를 최대한 보정해라.
2. OCR이 틀렸어도 유명 작가명/작품명 일부가 보이면 미술사 지식으로 자연스럽게 보정해라.
3. summary는 작품별 핵심 특징을 담은 한 문장으로 써라.
4. simpleExplanation에는 반드시 다음 요소를 포함해라:
   - 이 작품에 무엇이 그려졌는지
   - 화면 구도
   - 색채와 배경 처리
   - 원근법 또는 공간 처리
   - 작품에서 특히 유명하거나 중요한 부분
5. artistDescription에는 반드시 해당 작가의 실제 대표 기법이나 양식적 특징을 포함해라.
6. artistIntention에는 반드시 그 작품에서 작가가 어떤 효과를 의도했는지 구체적으로 써라.
7. background에는 반드시 그 작품의 제작 맥락, 시대적 배경, 주제의 배경을 써라.
8. 모든 해설 필드는 반드시 채워라. 빈 문자열로 두지 마라.

출력 JSON 형식:
{
  "title": "작품명",
  "artist": "작가명",
  "year": "제작연도 또는 빈 문자열",
  "museum": "소장처 또는 빈 문자열",
  "summary": "해당 작품의 핵심을 한 문장으로 요약. 작품별 특징 포함",
  "simpleExplanation": "해당 작품 자체에 대한 구체적인 작품 해설. 최소 8문장. 색채, 배경, 구도, 원근법, 기법, 상징 포함",
  "artistDescription": "해당 작가의 실제 대표 기법, 양식, 미술사적 특징. 최소 5문장",
  "artistIntention": "해당 작품에서의 작가 의도. 최소 5문장",
  "background": "작품의 제작 배경, 시대적 배경, 주제 배경. 최소 5문장",
  "viewingPoints": [
    "작품별 핵심 포인트 1",
    "작품별 핵심 포인트 2",
    "작품별 핵심 포인트 3",
    "작품별 핵심 포인트 4"
  ],
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
      temperature: 0.05,
      max_tokens: 2600,
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
    const fallback = buildEmergencyExplanation(safeOcrText);

    if (!apiKey) {
      return Response.json(fallback);
    }

    const prompt = buildPrompt({
      safeOcrText,
      candidates,
      userProfile,
      question,
    });

    const models = [
      "qwen/qwen3-235b-a22b:free",
      "z-ai/glm-4.5-air:free",
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
          parsed.simpleExplanation &&
          parsed.artistDescription &&
          parsed.artistIntention &&
          parsed.background
        ) {
          break;
        }
      } catch (error) {
        console.error(error);
      }
    }

    if (!parsed) {
      return Response.json(fallback);
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
      title: cleaned.title || candidates.title || fallback.title,
      artist: cleaned.artist || candidates.artist || fallback.artist,
      year: cleaned.year || candidates.year || fallback.year,
      museum: cleaned.museum || candidates.museum || fallback.museum,
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
      answer: cleaned.answer || fallback.answer,
      confidence: cleaned.confidence || fallback.confidence,
    });
  } catch (error) {
    console.error(error);
    return Response.json(buildEmergencyExplanation(""));
  }
}