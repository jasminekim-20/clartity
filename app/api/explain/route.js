function extractAnswer(text) {
  if (!text) return null;

  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed.answer || parsed.text || null;
  } catch {
    return cleaned;
  }
}

export async function POST(request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "OPENROUTER_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const { ocrText, userProfile, question, chatHistory } = await request.json();

    if (!question || !question.trim()) {
      return Response.json(
        { error: "질문을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!ocrText || ocrText.trim().length < 3) {
      return Response.json(
        { error: "먼저 작품 캡션을 인식해주세요." },
        { status: 400 }
      );
    }

    // 이전 대화 내역을 messages 배열로 변환
    const historyMessages = (chatHistory || [])
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text,
      }));

    const systemPrompt = `너는 미술관·박물관 AI 도슨트다.
아래는 사용자가 OCR로 인식한 작품 캡션 텍스트다.

[인식된 캡션]
"""
${ocrText}
"""

[사용자 프로필]
- 지식 수준: ${userProfile?.level || "미술 입문자"}
- 선호 취향: ${userProfile?.taste || "감성적·스토리 중심 설명 선호"}
- 연령대: ${userProfile?.age || "20-30대"}

규칙:
1. 캡션에서 추정한 작품과 작가 정보를 바탕으로 답변해라.
2. 확실하지 않은 정보는 "확인이 필요하지만"이라고 전제하고 답해라.
3. 미술 입문자도 이해할 수 있게, 전시장 도슨트처럼 친근하게 설명해라.
4. 답변은 2-4문장으로 간결하게, 대화 맥락을 이어가며 답해라.
5. 마크다운 없이 평문으로만 답해라.`;

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
            { role: "system", content: systemPrompt },
            ...historyMessages,
            { role: "user", content: question },
          ],
          temperature: 0.5,
          max_tokens: 500,
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
    const answer = extractAnswer(raw) || raw || "답변을 생성하지 못했습니다.";

    return Response.json({ answer });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error.message || "질문 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}