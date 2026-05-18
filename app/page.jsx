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
  };

  const displayMeta = (item) => {
    if (!item) return "";

    const museum = cleanValue(item.museum);
    const year = cleanValue(item.year);

    return [museum, year].filter(Boolean).join(" · ");
  };

  const normalizeOcrText = (text) => {
    if (!text) return "";

    return String(text)
      .replace(/[|{}[\]<>]/g, " ")
      .replace(/[^\S\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/([A-Za-z])\s+([.,;:])/g, "$1$2")
      .trim();
  };

  const extractBasicInfoFromOcr = (ocrText) => {
    const raw = String(ocrText || "");
    const flat = normalizeOcrText(raw);

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
        artist = cleanValue(match[1]);
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

      artist = cleanValue(
        artistLine
          .replace(/\(.+?\)/g, "")
          .replace(
            /\b(active|born|died|b\.|d\.|French|Italian|Spanish|Dutch|German|British|American|Venetian|Flemish)\b.*$/i,
            ""
          )
          .replace(/\d{4}.*$/g, "")
          .trim()
      );
    }

    const knownTitlePattern =
      /(Bacchus\s+and\s+Ariadne|La\s+Grande\s+Odalisque|Water\s+Lilies|Red\s+Boats,?\s+Argenteuil|Starry\s+Night|Mona\s+Lisa|The\s+Kiss|The\s+Birth\s+of\s+Venus|Girl\s+with\s+a\s+Pearl\s+Earring)/i;

    let title = cleanValue(flat.match(knownTitlePattern)?.[1] || "");

    if (!title) {
      const metadataWords =
        /(active|born|died|oil|canvas|panel|paper|wood|bronze|marble|collection|museum|gallery|louvre|national|gift|bequest|purchased|acquired|작가|작품|소장|미술관|박물관|French|Italian|Spanish|Dutch|German|British|American)/i;

      const possibleTitleLine =
        lines.find((line) => {
          if (line.length < 3) return false;
          if (line.length > 90) return false;
          if (artist && line.toLowerCase().includes(artist.toLowerCase()))
            return false;
          if (metadataWords.test(line)) return false;
          if (!/[A-Za-z가-힣]/.test(line)) return false;
          return true;
        }) || "";

      title = cleanValue(possibleTitleLine);
    }

    if (!title) {
      const beforeYear = flat.match(
        /([A-Z][A-Za-zÀ-ÿ'’\-]+(?:\s+[A-Za-zÀ-ÿ'’\-]+){0,6}),?\s*(?:1[4-9]\d{2}|20\d{2})/
      )?.[1];

      title = cleanValue(beforeYear || "");
    }

    return {
      title,
      artist,
      year,
      museum: cleanValue(museumLine),
      summary: "",
      simpleExplanation: "",
      artistDescription: "",
      artistIntention: "",
      background: "",
      viewingPoints: [],
      answer: "",
      confidence: "",
    };
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
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
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraOn(false);
  };

  const preprocessCanvas = (ctx, width, height) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      gray = (gray - 128) * 1.25 + 128;

      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const createOcrCanvas = () => {
    const video = videoRef.current;
    const baseCanvas = canvasRef.current;

    if (!video || !baseCanvas) return null;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) return null;

    const baseCtx = baseCanvas.getContext("2d");

    baseCanvas.width = videoWidth;
    baseCanvas.height = videoHeight;
    baseCtx.drawImage(video, 0, 0, videoWidth, videoHeight);

    const region = {
      x: videoWidth * 0.02,
      y: videoHeight * 0.06,
      w: videoWidth * 0.96,
      h: videoHeight * 0.78,
      scaleW: 1000,
    };

    const ocrCanvas = document.createElement("canvas");
    const scale = region.scaleW / region.w;
    const width = region.scaleW;
    const height = Math.max(1, Math.round(region.h * scale));

    ocrCanvas.width = width;
    ocrCanvas.height = height;

    const ocrCtx = ocrCanvas.getContext("2d");

    ocrCtx.fillStyle = "#ffffff";
    ocrCtx.fillRect(0, 0, width, height);

    ocrCtx.drawImage(
      baseCanvas,
      region.x,
      region.y,
      region.w,
      region.h,
      0,
      0,
      width,
      height
    );

    preprocessCanvas(ocrCtx, width, height);

    return ocrCanvas;
  };

  const mergeArtworkData = (apiData, ocrData) => {
    const safeApi = apiData || {};
    const safeOcr = ocrData || {};

    return {
      title: cleanValue(safeApi.title) || cleanValue(safeOcr.title),
      artist: cleanValue(safeApi.artist) || cleanValue(safeOcr.artist),
      year: cleanValue(safeApi.year) || cleanValue(safeOcr.year),
      museum: cleanValue(safeApi.museum) || cleanValue(safeOcr.museum),
      summary: cleanValue(safeApi.summary),
      simpleExplanation:
        cleanValue(safeApi.simpleExplanation) || cleanValue(safeApi.explanation),
      artistDescription: cleanValue(safeApi.artistDescription),
      artistIntention: cleanValue(safeApi.artistIntention),
      background: cleanValue(safeApi.background),
      viewingPoints: Array.isArray(safeApi.viewingPoints)
        ? safeApi.viewingPoints.map(cleanValue).filter(Boolean)
        : [],
      answer: cleanValue(safeApi.answer),
      confidence: cleanValue(safeApi.confidence),
    };
  };

  const captureAndOCR = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setOcrLoading(true);
    setAiLoading(false);
    setOcrText("");
    setArtwork(null);
    setChat([]);

    let finalOcrText = "";

    try {
      const ocrCanvas = createOcrCanvas();

      if (ocrCanvas) {
        const result = await Tesseract.recognize(ocrCanvas, "eng+kor+fra", {
          logger: (m) => console.log(m),
          tessedit_pageseg_mode: "6",
        });

        finalOcrText = normalizeOcrText(result?.data?.text || "");
      }

      if (!finalOcrText || finalOcrText.length < 2) {
        finalOcrText = "museum artwork caption title artist";
      }

      setOcrText(finalOcrText);
      setOcrLoading(false);
      setAiLoading(true);

      const ocrCandidate = extractBasicInfoFromOcr(finalOcrText);

      let apiData = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch("/api/explain", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ocrText: finalOcrText,
            userProfile,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseData = await response.json();

        if (response.ok) {
          apiData = responseData;
        }
      } catch (apiError) {
        console.error(apiError);
      }

      const merged = mergeArtworkData(apiData, ocrCandidate);

      setArtwork(merged);

      setChat([
        {
          role: "ai",
          text: "작품 정보를 분석했습니다. 궁금한 점을 이어서 질문해보세요.",
        },
      ]);

      setScreen("explain");
    } catch (error) {
      console.error(error);

      const ocrCandidate = extractBasicInfoFromOcr(finalOcrText);
      setOcrText(finalOcrText || "museum artwork caption");
      setArtwork(ocrCandidate);
      setScreen("explain");
    } finally {
      setOcrLoading(false);
      setAiLoading(false);
    }
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
          ocrText: ocrText || "museum artwork caption",
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
            "해당 작품 정보가 충분히 생성되지 않았습니다.",
        },
      ]);
    } catch (error) {
      console.error(error);

      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text: "답변을 생성하지 못했습니다.",
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
            </div>
          )}

          <div className="top-bar">
            <button className="icon-btn">‹</button>

            <div className="app-pill">
              <span className="app-dot" />
              Clartatity
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
            캡션 OCR <span>⌄</span>
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
            <div className="badge">✨ AI Caption Guide</div>

            <h1>{cleanValue(artwork.title) || "작품 해설"}</h1>

            {(cleanValue(artwork.artist) || displayMeta(artwork)) && (
              <p className="artist-line">
                {cleanValue(artwork.artist) && (
                  <>
                    <b>{cleanValue(artwork.artist)}</b>
                    <br />
                  </>
                )}
                {displayMeta(artwork)}
              </p>
            )}

            {cleanValue(artwork.summary) && (
              <p className="summary">{cleanValue(artwork.summary)}</p>
            )}
          </section>

          {(cleanValue(artwork.title) ||
            cleanValue(artwork.artist) ||
            cleanValue(artwork.year) ||
            cleanValue(artwork.museum)) && (
            <section className="detected-info-box">
              <div className="section-title">인식된 작품 정보</div>

              {cleanValue(artwork.title) && (
                <div className="info-row">
                  <span>작품명</span>
                  <strong>{cleanValue(artwork.title)}</strong>
                </div>
              )}

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
          )}

          {cleanValue(artwork.simpleExplanation) && (
            <section className="explain-card">
              <div className="section-title">작품 해설</div>
              <p>{cleanValue(artwork.simpleExplanation)}</p>
            </section>
          )}

          {cleanValue(artwork.artistDescription) && (
            <section className="explain-card">
              <div className="section-title">작가 설명</div>
              <p>{cleanValue(artwork.artistDescription)}</p>
            </section>
          )}

          {cleanValue(artwork.artistIntention) && (
            <section className="explain-card">
              <div className="section-title">작가의 의도</div>
              <p>{cleanValue(artwork.artistIntention)}</p>
            </section>
          )}

          {cleanValue(artwork.background) && (
            <section className="explain-card">
              <div className="section-title">배경 설명</div>
              <p>{cleanValue(artwork.background)}</p>
            </section>
          )}

          {artwork.viewingPoints?.filter(cleanValue).length > 0 && (
            <section className="explain-card">
              <div className="section-title">감상 포인트</div>

              <div className="viewing-points">
                {artwork.viewingPoints.filter(cleanValue).map((point, index) => (
                  <div key={index} className="viewing-point">
                    <span>{index + 1}</span>
                    <p>{cleanValue(point)}</p>
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
          line-height: 1.85;
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