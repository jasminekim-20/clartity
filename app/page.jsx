"use client";

import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [screen, setScreen] = useState("camera");
  const [mode, setMode] = useState("camera");

  const [cameraOn, setCameraOn] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [ocrText, setOcrText] = useState("");
  const [artwork, setArtwork] = useState(null);

  const [questionOpen, setQuestionOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);

  const userProfile = {
    level: "미술 입문자",
    taste: "감성적·스토리 중심 설명 선호",
    age: "20-30대 관람객",
  };

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const cleanValue = (value) => {
    if (!value) return "";

    return String(value)
      .replace(/\(확인 필요\)/g, "")
      .replace(/\[확인 필요\]/g, "")
      .replace(/확인 필요/g, "")
      .replace(/정보 없음/g, "")
      .replace(/미상/g, "")
      .replace(/unknown/gi, "")
      .replace(/n\/a/gi, "")
      .replace(/null/gi, "")
      .replace(/undefined/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const normalizeText = (text) => {
    return String(text || "")
      .replace(/[|{}[\]<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const extractBasicInfo = (text) => {
    const raw = normalizeText(text);

    const yearMatch = raw.match(
      /\b(1[4-9]\d{2}|20\d{2})(?:\s*[–-]\s*\d{1,4})?\b/
    );

    const year = yearMatch ? yearMatch[0] : "";

    const knownTitleMatch = raw.match(
      /(Bacchus\s+and\s+Ariadne|La\s+Grande\s+Odalisque|Mona\s+Lisa|Water\s+Lilies|Red\s+Boats,?\s+Argenteuil|The\s+Starry\s+Night|Girl\s+with\s+a\s+Pearl\s+Earring|The\s+Birth\s+of\s+Venus|The\s+Kiss)/i
    );

    let title = knownTitleMatch ? knownTitleMatch[1] : "";

    const artistMatch = raw.match(
      /(Titian|Tiziano|Leonardo\s+da\s+Vinci|Claude\s+Monet|Jean[-\s]Auguste[-\s]Dominique\s+Ingres|Ingres|Vincent\s+van\s+Gogh|Van\s+Gogh|Vermeer|Picasso|Renoir|Degas|Rembrandt|Caravaggio|Botticelli|Raphael|Michelangelo|Matisse|Manet|Cézanne|Cezanne|Gauguin)/i
    );

    let artist = artistMatch ? artistMatch[1] : "";

    if (!title) {
      const beforeYear = raw.match(
        /([A-Z][A-Za-zÀ-ÿ'’\-]+(?:\s+(?:and|of|the|The|A|An|de|la|le|les|des|du|[A-Z][A-Za-zÀ-ÿ'’\-]+)){0,8}),?\s*(?:1[4-9]\d{2}|20\d{2})/
      )?.[1];

      title = beforeYear || "";
    }

    if (!artist) {
      const artistPattern = raw.match(
        /([A-Z][a-zA-ZÀ-ÿ.'-]+(?:\s+[A-Z][a-zA-ZÀ-ÿ.'-]+){0,4})\s*\((?:[A-Za-zÀ-ÿ\s.'-]+)\)/
      );

      artist = artistPattern?.[1] || "";
    }

    const museumMatch = raw.match(
      /(Louvre Museum|National Gallery|Musée d'Orsay|Musee d'Orsay|Tate|MoMA|Metropolitan Museum|Rijksmuseum|Prado Museum|Uffizi Gallery|루브르|오르세 미술관|내셔널 갤러리)/i
    );

    const museum = museumMatch ? museumMatch[1] : "";

    return {
      title: cleanValue(title) || "인식된 작품",
      artist: cleanValue(artist),
      year: cleanValue(year),
      museum: cleanValue(museum),
    };
  };

  const buildInstantArtwork = (text) => {
    const info = extractBasicInfo(text);
    const subject = info.artist
      ? `${info.artist}의 「${info.title}」`
      : `「${info.title}」`;

    return {
      title: info.title,
      artist: info.artist,
      year: info.year,
      museum: info.museum,
      confidence: "보통",

      summary: `${subject}은 작품의 장면, 색채, 구도, 배경 처리, 표현 기법을 중심으로 감상할 수 있는 작품입니다.`,

      simpleExplanation:
        `${subject}은 먼저 작품 제목이 가리키는 장면이나 인물을 중심으로 이해하는 것이 좋습니다. ` +
        `화면에서 가장 중요한 대상이 어디에 놓여 있는지 보면 작품의 전체 구도가 드러납니다. ` +
        `배경은 단순한 장식이 아니라 중심 인물이나 사건을 돋보이게 만드는 장치로 작동합니다. ` +
        `색채가 밝고 선명하면 장면의 생동감이 커지고, 어둡고 깊은 색이 많으면 극적인 긴장감이 생깁니다. ` +
        `인물의 자세와 시선은 작품 속 사건의 방향을 알려주는 중요한 단서입니다. ` +
        `공간 표현에서는 전경과 배경의 거리감, 빛이 닿는 위치, 사물이 겹쳐지는 방식이 깊이를 만듭니다. ` +
        `작가가 선명한 윤곽을 강조했는지, 경계를 부드럽게 흐렸는지에 따라 작품의 분위기도 달라집니다. ` +
        `따라서 이 작품은 무엇이 그려졌는지만 보는 것이 아니라, 작가가 색채·빛·구도·공간을 통해 그 장면을 어떻게 해석했는지를 보는 것이 핵심입니다.`,

      artistDescription: info.artist
        ? `${info.artist}의 작품을 볼 때는 작가가 빛, 색채, 선, 구도를 어떻게 사용하는지 주목해야 합니다. ` +
          `작가는 대상을 단순히 똑같이 옮기는 것이 아니라 자신만의 시각적 언어로 장면의 분위기와 의미를 재구성합니다. ` +
          `인물의 윤곽을 선명하게 강조하는 작가도 있고, 반대로 경계를 부드럽게 흐려 공기감과 심리적 분위기를 만드는 작가도 있습니다. ` +
          `색채를 강하게 대비시키면 장면은 극적으로 보이고, 부드러운 색의 전환은 인물과 배경을 자연스럽게 연결합니다. ` +
          `${info.artist}라는 작가명을 기준으로 보면, 이 작품은 작가가 즐겨 사용한 표현 방식과 미술사적 특징을 함께 살펴볼 필요가 있습니다.`
        : `작가명이 완전히 특정되지 않더라도, 작품의 표현 방식에서는 작가적 특징을 읽을 수 있습니다. ` +
          `선이 또렷한지, 색채가 강조되는지, 빛과 그림자가 극적으로 대비되는지, 배경이 사실적인지 상징적인지 살펴보는 것이 중요합니다. ` +
          `작가는 대상을 그대로 재현하는 것이 아니라 자신의 시대적 감각과 미적 기준으로 화면을 구성합니다. ` +
          `따라서 구도, 색채, 원근감, 붓질은 작가의 의도를 읽는 핵심 단서가 됩니다.`,

      artistIntention:
        `${subject}에서 작가는 관람자가 특정한 인물, 사건, 분위기에 집중하도록 화면을 구성했을 가능성이 큽니다. ` +
        `중심 대상의 위치는 우연히 정해진 것이 아니라 작품의 의미를 가장 효과적으로 전달하기 위한 선택입니다. ` +
        `배경의 색감과 명암은 장면의 감정적 온도를 조절합니다. ` +
        `어두운 배경은 인물이나 사건을 더 극적으로 부각하고, 흐릿한 배경은 공간을 깊게 만들거나 신비로운 분위기를 줄 수 있습니다. ` +
        `작가는 이러한 시각 장치를 통해 관람자가 단순히 그림을 보는 것이 아니라, 작품 속 장면의 긴장감과 분위기를 느끼도록 의도했습니다.`,

      background:
        `${info.year ? `${info.year} 전후에 제작된 ` : ""}${subject}은 작품명, 작가명, 제작연도, 소장처 정보를 함께 볼 때 더 정확히 이해됩니다. ` +
        `제작연도는 이 작품이 어떤 미술사적 흐름 안에 있는지 보여주는 단서입니다. ` +
        `작품이 신화, 종교, 초상, 풍경, 역사적 사건 중 무엇을 다루는지에 따라 배경 해석도 달라집니다. ` +
        `예를 들어 신화적 장면이라면 등장인물의 몸짓과 상징물이 중요하고, 초상화라면 인물의 시선·손·의상·배경이 사회적 의미를 가집니다. ` +
        `따라서 이 작품은 단순한 이미지가 아니라, 특정 시대의 미적 기준과 작가의 표현 전략이 결합된 결과물로 보아야 합니다.`,

      viewingPoints: [
        "배경의 색감이 중심 인물이나 대상을 어떻게 돋보이게 하는지 보세요.",
        "인물이나 대상의 윤곽이 또렷한지, 흐릿하게 처리되었는지 확인해보세요.",
        "원근감이 배경을 깊게 만드는지, 혹은 화면을 평면적으로 보이게 하는지 살펴보세요.",
        "작가가 빛, 색채, 구도, 시선 중 무엇을 가장 강하게 사용했는지 비교해보세요.",
      ],

      answer: "",
    };
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraOn(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
    } catch (error) {
      console.error(error);
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraOn(false);
  };

  const captureAndOCR = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setOcrLoading(true);
    setAiLoading(false);
    setOcrText("");
    setArtwork(null);
    setChat([]);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let text = "";

    try {
      const result = await Tesseract.recognize(canvas, "eng+kor+fra+jpn", {
        logger: (m) => console.log(m),
      });

      text = result?.data?.text?.trim() || "";
    } catch (ocrError) {
      console.error(ocrError);
    }

    if (!text || text.length < 2) {
      text = "museum artwork caption title artist";
    }

    setOcrText(text);
    setOcrLoading(false);
    setAiLoading(true);

    let data = null;

    try {
      const apiPromise = fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ocrText: text,
          userProfile,
        }),
      });

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(null), 18000);
      });

      const response = await Promise.race([apiPromise, timeoutPromise]);

      if (response) {
        const responseData = await response.json();

        if (response.ok) {
          data = responseData;
        }
      }
    } catch (apiError) {
      console.error(apiError);
    }

    if (!data) {
      data = buildInstantArtwork(text);
    }

    setArtwork(data);

    setChat([
      {
        role: "ai",
        text: `「${data.title || "인식된 작품"}」에 대한 작품 해설을 준비했어요.`,
      },
    ]);

    setAiLoading(false);
    setScreen("explain");
  };

  const askQuestion = async () => {
    if (!question.trim()) return;

    const userQuestion = question.trim();

    setChat((prev) => [
      ...prev,
      {
        role: "user",
        text: userQuestion,
      },
    ]);

    setQuestion("");

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ocrText: ocrText || `${artwork?.title || ""} ${artwork?.artist || ""}`,
          userProfile,
          question: userQuestion,
        }),
      });

      const data = await response.json();

      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text:
            data.answer ||
            data.simpleExplanation ||
            data.explanation ||
            data.summary ||
            "이 작품은 색채, 구도, 배경 처리, 작가의 표현 기법을 중심으로 감상하면 좋습니다.",
        },
      ]);
    } catch (error) {
      console.error(error);

      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text: "이 작품은 색채, 구도, 배경 처리, 작가의 표현 기법을 중심으로 감상하면 좋습니다.",
        },
      ]);
    }
  };

  return (
    <main className="app">
      {screen === "camera" && (
        <section className="camera-screen">
          <video
            ref={videoRef}
            className="camera-video"
            playsInline
            muted
            autoPlay
          />

          <canvas ref={canvasRef} style={{ display: "none" }} />

          {!cameraOn && (
            <div className="camera-fallback">
              <p>카메라를 불러오는 중입니다.</p>
              <button onClick={startCamera}>카메라 다시 켜기</button>
            </div>
          )}

          <div className="top-bar">
            <button className="icon-btn">‹</button>

            <div className="app-pill">
              <span className="app-dot" />
              Clartity
            </div>

            <button className="icon-btn">?</button>
          </div>

          <div className="scan-guide">
            <div className="corner top-left" />
            <div className="corner top-right" />
            <div className="corner bottom-left" />
            <div className="corner bottom-right" />
          </div>

          {ocrLoading && (
            <div className="loading-toast">캡션 글자를 읽는 중입니다...</div>
          )}

          {aiLoading && (
            <div className="loading-toast">작품 해설을 생성 중입니다...</div>
          )}

          <div className="language-pill">
            캡션 인식 <span>⌄</span>
            <b>→</b>
            맞춤 해설 <span>⌄</span>
          </div>

          <div className="camera-controls">
            <button className="round-control">▧</button>

            <button className="shutter" onClick={captureAndOCR}>
              <span />
            </button>

            <button className="round-control">⌁</button>
          </div>

          <nav className="bottom-tabs">
            <button
              className={mode === "translate" ? "active" : ""}
              onClick={() => setMode("translate")}
            >
              <span>▣</span>
              번역
            </button>

            <button
              className={mode === "camera" ? "active" : ""}
              onClick={() => setMode("camera")}
            >
              <span>●</span>
              카메라
            </button>

            <button
              className={mode === "chat" ? "active" : ""}
              onClick={() => {
                setMode("chat");
                setQuestionOpen(true);
              }}
            >
              <span>👥</span>
              대화
            </button>

            <button
              className={mode === "save" ? "active" : ""}
              onClick={() => setMode("save")}
            >
              <span>★</span>
              저장
            </button>
          </nav>
        </section>
      )}

      {screen === "explain" && artwork && (
        <section className="explain-screen">
          <header className="explain-header">
            <button
              onClick={() => {
                setScreen("camera");
                setTimeout(() => startCamera(), 300);
              }}
            >
              ‹
            </button>

            <div>
              <div className="explain-title-mini">AI 작품 해설</div>
              <div className="explain-sub-mini">OCR Caption Based Guide</div>
            </div>

            <button onClick={() => setQuestionOpen(true)}>?</button>
          </header>

          <section className="artwork-hero">
            <div className="badge">✨ 분석 신뢰도 {artwork.confidence || "보통"}</div>

            <h1>{cleanValue(artwork.title) || "인식된 작품"}</h1>

            <p className="artist-line">
              {cleanValue(artwork.artist) && (
                <>
                  <b>{cleanValue(artwork.artist)}</b>
                  <br />
                </>
              )}
              {[cleanValue(artwork.museum), cleanValue(artwork.year)]
                .filter(Boolean)
                .join(" · ")}
            </p>

            <p className="summary">
              {cleanValue(artwork.summary) ||
                "작품의 색채, 구도, 배경 처리, 표현 기법을 중심으로 감상할 수 있습니다."}
            </p>
          </section>

          <section className="detected-info-box">
            <div className="section-title">인식된 작품 정보</div>

            <div className="info-row">
              <span>작품명</span>
              <strong>{cleanValue(artwork.title) || "인식된 작품"}</strong>
            </div>

            {cleanValue(artwork.artist) && (
              <div className="info-row">
                <span>작가</span>
                <strong>{cleanValue(artwork.artist)}</strong>
              </div>
            )}

            {cleanValue(artwork.year) && (
              <div className="info-row">
                <span>제작연도</span>
                <strong>{cleanValue(artwork.year)}</strong>
              </div>
            )}

            {cleanValue(artwork.museum) && (
              <div className="info-row">
                <span>소장처</span>
                <strong>{cleanValue(artwork.museum)}</strong>
              </div>
            )}
          </section>

          <section className="explain-card">
            <div className="section-title">작품 해설</div>
            <p>
              {cleanValue(artwork.simpleExplanation) ||
                cleanValue(artwork.explanation) ||
                "이 작품은 색채, 구도, 배경 처리, 작가의 표현 기법을 중심으로 감상하면 좋습니다."}
            </p>
          </section>

          <section className="explain-card">
            <div className="section-title">작가 설명</div>
            <p>
              {cleanValue(artwork.artistDescription) ||
                "작가의 표현 방식은 화면의 구도, 색채, 빛, 인물 묘사에서 드러납니다. 작품의 윤곽 처리, 배경 표현, 색의 대비를 함께 보면 작가적 특징을 파악할 수 있습니다."}
            </p>
          </section>

          <section className="explain-card">
            <div className="section-title">작가의 의도</div>
            <p>
              {cleanValue(artwork.artistIntention) ||
                "작가는 관람자의 시선을 특정 인물이나 장면에 집중시키기 위해 구도, 빛, 색채를 조절했습니다. 화면 속 중심 대상과 배경의 관계를 함께 보면 작품의 의도가 더 잘 보입니다."}
            </p>
          </section>

          <section className="explain-card">
            <div className="section-title">배경 설명</div>
            <p>
              {cleanValue(artwork.background) ||
                "작품의 제작연도, 소장처, 주제는 작품을 이해하는 중요한 맥락입니다. 같은 시대의 미술 흐름과 비교하면 이 작품의 색채, 구도, 표현 방식이 왜 선택되었는지 더 잘 이해할 수 있습니다."}
            </p>
          </section>

          {artwork.viewingPoints?.length > 0 && (
            <section className="explain-card">
              <div className="section-title">감상 포인트</div>

              <div className="viewing-points">
                {artwork.viewingPoints.map((point, index) => (
                  <div key={index} className="viewing-point">
                    <span>{index + 1}</span>
                    <p>{point}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="bottom-action-area">
            <button
              className="ghost-action"
              onClick={() => setQuestionOpen(true)}
            >
              AI에게 질문
            </button>
            <button className="primary-action">기록에 저장</button>
          </div>
        </section>
      )}

      {questionOpen && (
        <div className="chat-sheet">
          <div className="sheet-handle" />

          <div className="sheet-header">
            <div>
              <h3>작품에 대해 질문하기</h3>
              <p>인식된 작품 정보를 바탕으로 답변합니다.</p>
            </div>
            <button onClick={() => setQuestionOpen(false)}>×</button>
          </div>

          <div className="chat-list">
            {chat.length === 0 && (
              <div className="bubble ai">
                작품을 인식한 뒤 궁금한 점을 질문할 수 있어요.
              </div>
            )}

            {chat.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                {m.text}
              </div>
            ))}
          </div>

          <div className="question-box">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="예: 이 작품은 왜 유명해?"
              onKeyDown={(e) => {
                if (e.key === "Enter") askQuestion();
              }}
            />
            <button onClick={askQuestion}>↑</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
            "Pretendard", "Noto Sans KR", sans-serif;
          background: #000;
        }

        button {
          cursor: pointer;
          font-family: inherit;
        }

        .app {
          width: 100vw;
          min-height: 100vh;
          background: #000;
          color: #fff;
          overflow: hidden;
        }

        .camera-screen {
          width: 100vw;
          height: 100vh;
          position: relative;
          overflow: hidden;
          background: #000;
        }

        .camera-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: #000;
        }

        .camera-screen::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.48) 0%,
            rgba(0, 0, 0, 0.08) 28%,
            rgba(0, 0, 0, 0.04) 52%,
            rgba(0, 0, 0, 0.76) 100%
          );
          pointer-events: none;
        }

        .top-bar {
          position: absolute;
          z-index: 5;
          top: 22px;
          left: 18px;
          right: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .icon-btn {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: none;
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
          backdrop-filter: blur(18px);
          font-size: 24px;
        }

        .app-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.58);
          backdrop-filter: blur(18px);
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .app-dot {
          width: 8px;
          height: 8px;
          background: #4ee6c0;
          border-radius: 50%;
          box-shadow: 0 0 12px #4ee6c0;
        }

        .scan-guide {
          position: absolute;
          z-index: 3;
          left: 34px;
          right: 34px;
          top: 25%;
          height: 210px;
          pointer-events: none;
        }

        .corner {
          position: absolute;
          width: 42px;
          height: 42px;
          border-color: rgba(255, 255, 255, 0.95);
        }

        .top-left {
          left: 0;
          top: 0;
          border-top: 4px solid;
          border-left: 4px solid;
          border-radius: 14px 0 0 0;
        }

        .top-right {
          right: 0;
          top: 0;
          border-top: 4px solid;
          border-right: 4px solid;
          border-radius: 0 14px 0 0;
        }

        .bottom-left {
          left: 0;
          bottom: 0;
          border-bottom: 4px solid;
          border-left: 4px solid;
          border-radius: 0 0 0 14px;
        }

        .bottom-right {
          right: 0;
          bottom: 0;
          border-bottom: 4px solid;
          border-right: 4px solid;
          border-radius: 0 0 14px 0;
        }

        .loading-toast {
          position: absolute;
          z-index: 9;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          padding: 14px 20px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.74);
          backdrop-filter: blur(16px);
          font-size: 17px;
          font-weight: 800;
          white-space: nowrap;
        }

        .language-pill {
          position: absolute;
          z-index: 7;
          left: 50%;
          bottom: 178px;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 20px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(18px);
          font-size: 16px;
          font-weight: 800;
          white-space: nowrap;
        }

        .language-pill span {
          color: #b7b3c9;
        }

        .camera-controls {
          position: absolute;
          z-index: 7;
          left: 0;
          right: 0;
          bottom: 82px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 62px;
        }

        .round-control {
          width: 70px;
          height: 70px;
          border-radius: 999px;
          border: none;
          background: rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(18px);
          color: #fff;
          font-size: 28px;
        }

        .shutter {
          width: 96px;
          height: 96px;
          border-radius: 999px;
          border: none;
          background: rgba(255, 255, 255, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(18px);
        }

        .shutter span {
          width: 62px;
          height: 62px;
          border-radius: 999px;
          background: #fff;
          display: block;
        }

        .bottom-tabs {
          position: absolute;
          z-index: 7;
          left: 0;
          right: 0;
          bottom: 18px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          padding: 0 18px;
        }

        .bottom-tabs button {
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.58);
          display: flex;
          flex-direction: column;
          gap: 5px;
          align-items: center;
          font-size: 13px;
          font-weight: 800;
        }

        .bottom-tabs button span {
          font-size: 28px;
        }

        .bottom-tabs button.active {
          color: #61dff3;
        }

        .camera-fallback {
          position: absolute;
          z-index: 20;
          inset: 0;
          background: #111;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 14px;
          color: #fff;
          padding: 20px;
          text-align: center;
        }

        .camera-fallback button {
          border: none;
          border-radius: 999px;
          padding: 12px 18px;
          background: #fff;
          color: #111;
          font-weight: 900;
        }

        .explain-screen {
          min-height: 100vh;
          background:
            radial-gradient(circle at 20% 0%, #f4e8ff 0, transparent 30%),
            radial-gradient(circle at 90% 0%, #defaff 0, transparent 26%),
            #fbfbff;
          color: #171729;
          padding: 22px 22px 110px;
          overflow-y: auto;
        }

        .explain-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 26px;
        }

        .explain-header button {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 1px solid #edeaf4;
          background: rgba(255, 255, 255, 0.9);
          color: #171729;
          font-size: 24px;
          box-shadow: 0 8px 22px rgba(40, 35, 80, 0.08);
        }

        .explain-title-mini {
          text-align: center;
          font-weight: 900;
          font-size: 18px;
          letter-spacing: -0.04em;
        }

        .explain-sub-mini {
          text-align: center;
          margin-top: 3px;
          font-size: 10px;
          color: #8c89a0;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .artwork-hero {
          padding: 24px;
          border-radius: 32px;
          background: linear-gradient(145deg, #ffffff, #f8f3ff);
          border: 1px solid #eeeaf8;
          box-shadow: 0 18px 45px rgba(60, 45, 100, 0.1);
        }

        .badge {
          display: inline-flex;
          padding: 8px 12px;
          border-radius: 999px;
          background: #f0eaff;
          color: #7254e8;
          font-size: 13px;
          font-weight: 900;
        }

        .artwork-hero h1 {
          margin: 16px 0 10px;
          font-size: 38px;
          line-height: 1.1;
          letter-spacing: -0.07em;
        }

        .artist-line {
          margin: 0;
          color: #625f73;
          font-size: 16px;
          line-height: 1.55;
        }

        .summary {
          margin: 18px 0 0;
          font-size: 19px;
          line-height: 1.55;
          font-weight: 800;
          letter-spacing: -0.04em;
        }

        .detected-info-box,
        .explain-card {
          margin-top: 18px;
          padding: 20px;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid #eeeaf4;
          box-shadow: 0 14px 35px rgba(40, 35, 80, 0.07);
        }

        .section-title {
          margin-bottom: 12px;
          color: #7254e8;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 13px 0;
          border-bottom: 1px solid #eeeaf4;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-row span {
          color: #8a869c;
          font-size: 14px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .info-row strong {
          color: #171729;
          font-size: 15px;
          font-weight: 900;
          text-align: right;
          line-height: 1.4;
        }

        .explain-card p {
          margin: 0;
          color: #444153;
          font-size: 16px;
          line-height: 1.75;
        }

        .viewing-points {
          display: grid;
          gap: 12px;
        }

        .viewing-point {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .viewing-point span {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #efeaff;
          color: #7254e8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .viewing-point p {
          margin: 0;
          color: #444153;
          font-size: 16px;
          line-height: 1.65;
        }

        .bottom-action-area {
          position: fixed;
          left: 20px;
          right: 20px;
          bottom: 24px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .ghost-action,
        .primary-action {
          border: none;
          border-radius: 22px;
          padding: 17px 14px;
          font-size: 16px;
          font-weight: 900;
          box-shadow: 0 14px 35px rgba(45, 35, 90, 0.18);
        }

        .ghost-action {
          background: #fff;
          color: #7254e8;
          border: 1px solid #e8e0ff;
        }

        .primary-action {
          background: linear-gradient(135deg, #7357ff, #bd43ff);
          color: #fff;
        }

        .chat-sheet {
          position: fixed;
          z-index: 30;
          left: 0;
          right: 0;
          bottom: 0;
          height: 58vh;
          padding: 12px 20px 24px;
          border-radius: 30px 30px 0 0;
          background: rgba(255, 255, 255, 0.96);
          color: #171729;
          backdrop-filter: blur(20px);
          box-shadow: 0 -20px 50px rgba(0, 0, 0, 0.24);
          display: flex;
          flex-direction: column;
        }

        .sheet-handle {
          width: 46px;
          height: 5px;
          border-radius: 999px;
          background: #d5d2df;
          margin: 0 auto 14px;
        }

        .sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .sheet-header h3 {
          margin: 0;
          font-size: 22px;
          letter-spacing: -0.04em;
        }

        .sheet-header p {
          margin: 5px 0 0;
          color: #777184;
          font-size: 13px;
        }

        .sheet-header button {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: none;
          background: #f1eff7;
          font-size: 22px;
        }

        .chat-list {
          flex: 1;
          overflow-y: auto;
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bubble {
          max-width: 84%;
          padding: 13px 15px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.55;
        }

        .bubble.ai {
          background: #f3f1fb;
          color: #333044;
          border-top-left-radius: 6px;
        }

        .bubble.user {
          align-self: flex-end;
          background: #171729;
          color: #fff;
          border-top-right-radius: 6px;
        }

        .question-box {
          display: flex;
          gap: 8px;
          margin-top: 14px;
        }

        .question-box input {
          flex: 1;
          border: 1px solid #e7e4ef;
          border-radius: 18px;
          padding: 14px;
          outline: none;
          font-size: 15px;
        }

        .question-box button {
          width: 50px;
          border-radius: 18px;
          border: none;
          background: #7d55ea;
          color: #fff;
          font-size: 20px;
          font-weight: 900;
        }

        @media (min-width: 700px) {
          .app,
          .camera-screen,
          .explain-screen {
            width: 430px;
            height: 860px;
            min-height: 860px;
            margin: 24px auto;
            border-radius: 42px;
            border: 8px solid #111;
            overflow: hidden;
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
          }

          .chat-sheet {
            left: 50%;
            right: auto;
            width: 430px;
            transform: translateX(-50%);
            bottom: 24px;
            border-radius: 30px;
          }

          body {
            background: #eef8f9;
          }
        }
      `}</style>
    </main>
  );
}