"use client";

import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [mode, setMode] = useState("camera");
  const [showResult, setShowResult] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);

  const artwork = {
    title: "수련 연못",
    artist: "Claude Monet",
    museum: "오르세 미술관",
    year: "1899",
    explanation:
      "클로드 모네는 ‘수련’ 연작을 통해 빛과 시간의 변화를 탐구했습니다. 이 작품은 자연의 고요함과 순간의 아름다움을 담고 있어요.",
    intention:
      "모네는 연못을 정확히 묘사하기보다, 물 위에 비친 빛과 공기의 흐름처럼 순간적으로 변하는 인상을 포착하려 했습니다.",
  };

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
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
      alert("카메라 접근 권한을 허용해주세요.");
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
    setShowResult(false);
    setOcrText("");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const result = await Tesseract.recognize(canvas, "eng+kor+fra", {
        logger: (m) => console.log(m),
      });

      const text = result.data.text.trim();

      setOcrText(
        text ||
          "Claude Monet explore les variations de la lumière et du temps à travers sa série des Nymphéas."
      );

      setShowResult(true);

      setChat([
        {
          role: "ai",
          text: "캡션을 인식했어요. 이 작품은 클로드 모네의 「수련 연못」으로 추정됩니다.",
        },
      ]);
    } catch (error) {
      console.error(error);
      alert("OCR 인식 중 오류가 발생했습니다.");
    } finally {
      setOcrLoading(false);
    }
  };

  const askQuestion = () => {
    if (!question.trim()) return;

    const q = question.trim();

    let answer =
      "이 작품은 자연을 그대로 복사한 그림이라기보다, 빛과 공기, 시간의 흐름이 만들어내는 순간의 느낌을 보여주는 작품입니다.";

    if (q.includes("의도") || q.includes("작가")) {
      answer = artwork.intention;
    }

    if (q.includes("왜") || q.includes("유명")) {
      answer =
        "이 작품이 유명한 이유는 모네가 ‘대상을 정확히 그리는 방식’보다 ‘순간의 인상과 분위기를 그리는 방식’을 보여줬기 때문입니다. 이것이 인상주의의 핵심과 연결됩니다.";
    }

    setChat((prev) => [
      ...prev,
      {
        role: "user",
        text: q,
      },
      {
        role: "ai",
        text: answer,
      },
    ]);

    setQuestion("");
  };

  return (
    <main className="camera-app">
      <video ref={videoRef} className="camera-video" playsInline muted autoPlay />
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
          Clartatity
        </div>

        <button className="icon-btn">?</button>
      </div>

      <div className="scan-guide">
        <div className="corner top-left" />
        <div className="corner top-right" />
        <div className="corner bottom-left" />
        <div className="corner bottom-right" />

        <div className="guide-text">작품 캡션을 이 영역에 맞춰주세요</div>
      </div>

      {ocrLoading && (
        <div className="loading-toast">캡션을 읽는 중입니다...</div>
      )}

      {showResult && (
        <>
          <div className="caption-card original">
            <div className="card-label">OCR 인식 캡션</div>
            <p>
              {ocrText ||
                "Claude Monet explore les variations de la lumière et du temps à travers sa série des Nymphéas."}
            </p>
          </div>

          <div className="caption-card translated">
            <div className="card-label">AI 맞춤 해설</div>
            <h2>{artwork.title}</h2>
            <p>
              <b>{artwork.artist}</b> · {artwork.museum} · {artwork.year}
            </p>
            <p>{artwork.explanation}</p>

            <div className="mini-actions">
              <button onClick={() => setQuestionOpen(true)}>AI에게 질문</button>
              <button>기록 저장</button>
            </div>
          </div>
        </>
      )}

      {questionOpen && (
        <div className="chat-sheet">
          <div className="sheet-handle" />
          <div className="sheet-header">
            <div>
              <h3>작품에 대해 질문하기</h3>
              <p>미술 입문자 기준으로 쉽게 답변합니다.</p>
            </div>
            <button onClick={() => setQuestionOpen(false)}>×</button>
          </div>

          <div className="chat-list">
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
              placeholder="예: 왜 이 작품이 유명해?"
              onKeyDown={(e) => {
                if (e.key === "Enter") askQuestion();
              }}
            />
            <button onClick={askQuestion}>↑</button>
          </div>
        </div>
      )}

      <div className="language-pill">
        프랑스어 <span>⌄</span>
        <b>→</b>
        한국어 <span>⌄</span>
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
          즐겨찾기
        </button>
      </nav>

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

        .camera-app {
          width: 100vw;
          height: 100vh;
          position: relative;
          overflow: hidden;
          background: #000;
          color: #fff;
        }

        .camera-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: #000;
        }

        .camera-app::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.42) 0%,
            rgba(0, 0, 0, 0.08) 28%,
            rgba(0, 0, 0, 0.04) 52%,
            rgba(0, 0, 0, 0.72) 100%
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
          border-color: rgba(105, 229, 239, 0.95);
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

        .guide-text {
          position: absolute;
          left: 50%;
          bottom: -42px;
          transform: translateX(-50%);
          white-space: nowrap;
          padding: 9px 14px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.58);
          backdrop-filter: blur(14px);
          font-size: 13px;
          font-weight: 700;
        }

        .loading-toast {
          position: absolute;
          z-index: 9;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          padding: 14px 20px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(16px);
          font-size: 18px;
          font-weight: 800;
        }

        .caption-card {
          position: absolute;
          z-index: 6;
          max-width: 320px;
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.9);
          color: #171729;
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
        }

        .caption-card.original {
          top: 17%;
          left: 18px;
          max-width: 270px;
        }

        .caption-card.translated {
          right: 18px;
          top: 42%;
        }

        .card-label {
          margin-bottom: 8px;
          color: #6f5de8;
          font-size: 12px;
          font-weight: 900;
        }

        .caption-card h2 {
          margin: 0 0 8px;
          font-size: 24px;
          letter-spacing: -0.05em;
        }

        .caption-card p {
          margin: 0 0 8px;
          color: #343243;
          font-size: 14px;
          line-height: 1.55;
        }

        .mini-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }

        .mini-actions button {
          border: none;
          border-radius: 12px;
          padding: 10px 8px;
          background: #f1edff;
          color: #6f51e8;
          font-size: 13px;
          font-weight: 900;
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

        .chat-sheet {
          position: absolute;
          z-index: 12;
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
        }

        .camera-fallback button {
          border: none;
          border-radius: 999px;
          padding: 12px 18px;
          background: #fff;
          color: #111;
          font-weight: 900;
        }

        @media (min-width: 700px) {
          .camera-app {
            width: 430px;
            height: 860px;
            border-radius: 42px;
            border: 8px solid #111;
            margin: 24px auto;
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
          }

          body {
            background: #eef8f9;
          }
        }
      `}</style>
    </main>
  );
}