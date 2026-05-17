"use client";

import { useState } from "react";

export default function Home() {
  const [tab, setTab] = useState("scan");
  const [isScanning, setIsScanning] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "작품 캡션을 인식하면, 당신의 지식 수준과 감상 취향에 맞춰 쉽게 해설해드릴게요.",
    },
  ]);

  const userProfile = {
    level: "미술 입문자",
    taste: "감성적이고 스토리 중심의 설명 선호",
    age: "20-30대 관람객",
  };

  const artwork = {
    title: "수련 연못",
    artist: "Claude Monet",
    museum: "오르세 미술관",
    year: "1899",
    medium: "Oil on canvas",
    caption:
      "Claude Monet, Water Lily Pond, 1899, Musée d’Orsay. Monet explored light, atmosphere, and the passing of time through his Water Lilies series.",
  };

  const startScan = () => {
    setIsScanning(true);
    setHasResult(false);

    setTimeout(() => {
      setIsScanning(false);
      setHasResult(true);
      setMessages([
        {
          role: "ai",
          text: "캡션을 인식했어요. 이 작품은 클로드 모네의 「수련 연못」입니다. 이제 작품 설명을 쉽게 풀어드릴게요.",
        },
      ]);
    }, 1500);
  };

  const sendQuestion = () => {
    if (!question.trim()) return;

    const userText = question;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText },
      {
        role: "ai",
        text:
          "좋은 질문이에요. 이 작품은 단순히 연못을 그린 그림이라기보다, 빛이 시간에 따라 어떻게 달라지는지를 보여주려는 작품입니다. 모네는 대상을 정확히 묘사하기보다, 그 순간의 분위기와 인상을 포착하려 했어요.",
      },
    ]);

    setQuestion("");
  };

  return (
    <main className="app">
      <section className="phone">
        <Header tab={tab} />

        {tab === "scan" && (
          <ScanPage
            artwork={artwork}
            userProfile={userProfile}
            startScan={startScan}
            isScanning={isScanning}
            hasResult={hasResult}
            messages={messages}
            question={question}
            setQuestion={setQuestion}
            sendQuestion={sendQuestion}
          />
        )}

        {tab === "archive" && <ArchivePage />}

        {tab === "ticket" && <TicketPage artwork={artwork} />}

        <BottomNav tab={tab} setTab={setTab} />
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #edf7f8;
          color: #171729;
          font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
            "Pretendard", "Noto Sans KR", sans-serif;
        }

        .app {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 28px;
          background:
            radial-gradient(circle at 20% 10%, #f4eaff 0, transparent 28%),
            radial-gradient(circle at 90% 0%, #e0fbff 0, transparent 26%),
            #edf7f8;
        }

        .phone {
          width: 430px;
          height: 860px;
          background: #fff;
          border-radius: 42px;
          box-shadow: 0 24px 70px rgba(67, 55, 120, 0.18);
          overflow: hidden;
          position: relative;
          border: 8px solid #111;
        }

        .header {
          padding: 28px 26px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .back,
        .help {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid #eee;
          background: #fff;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .brand {
          text-align: center;
          line-height: 1.1;
        }

        .brand-name {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .brand-sub {
          margin-top: 4px;
          font-size: 11px;
          color: #8f8ca3;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .page {
          height: calc(100% - 154px);
          overflow-y: auto;
          padding: 8px 24px 28px;
        }

        .page::-webkit-scrollbar {
          display: none;
        }

        .hero {
          margin-top: 10px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 999px;
          background: #f4efff;
          color: #7b51e8;
          font-size: 13px;
          font-weight: 700;
        }

        h1 {
          margin: 14px 0 8px;
          font-size: 38px;
          line-height: 1.05;
          letter-spacing: -0.06em;
        }

        .desc {
          margin: 0;
          color: #66657a;
          font-size: 16px;
          line-height: 1.55;
        }

        .camera-card {
          margin-top: 24px;
          background: linear-gradient(145deg, #f8f4ff, #ffffff 42%, #f2feff);
          border: 1px solid #ebe7f6;
          border-radius: 30px;
          padding: 18px;
          box-shadow: 0 16px 45px rgba(115, 96, 180, 0.12);
        }

        .camera-frame {
          height: 230px;
          border-radius: 24px;
          background:
            linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.35)),
            url("https://images.unsplash.com/photo-1577720643272-265f09367456?q=80&w=1200&auto=format&fit=crop");
          background-size: cover;
          background-position: center;
          position: relative;
          overflow: hidden;
        }

        .caption-box {
          position: absolute;
          left: 22px;
          right: 22px;
          bottom: 22px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(10px);
          font-size: 12px;
          line-height: 1.45;
          color: #222;
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16);
        }

        .scan-line {
          position: absolute;
          left: 20px;
          right: 20px;
          top: 50%;
          height: 2px;
          background: #7bdff2;
          box-shadow: 0 0 20px #7bdff2;
          animation: scan 1.4s ease-in-out infinite;
        }

        @keyframes scan {
          0% {
            transform: translateY(-80px);
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(80px);
            opacity: 0.3;
          }
        }

        .camera-actions {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .btn {
          border: none;
          border-radius: 18px;
          padding: 15px 16px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .btn-primary {
          color: #fff;
          background: linear-gradient(135deg, #7357ff, #bd43ff);
          box-shadow: 0 12px 24px rgba(126, 87, 255, 0.26);
        }

        .btn-ghost {
          background: #f6f4fb;
          color: #4e4b63;
        }

        .profile-card,
        .result-card,
        .chat-card,
        .archive-card,
        .ticket-wrap {
          margin-top: 18px;
          background: #fff;
          border: 1px solid #eceaf3;
          border-radius: 28px;
          padding: 20px;
          box-shadow: 0 14px 35px rgba(33, 27, 74, 0.07);
        }

        .section-title {
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 14px;
          letter-spacing: -0.04em;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          padding: 9px 12px;
          border-radius: 999px;
          background: #f3f1fb;
          color: #675f88;
          font-size: 13px;
          font-weight: 700;
        }

        .art-mini {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 12px;
          border-radius: 20px;
          background: #fbfaff;
          border: 1px solid #f0edf8;
        }

        .thumb {
          width: 82px;
          height: 82px;
          border-radius: 18px;
          background: url("https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=900&auto=format&fit=crop");
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
        }

        .art-title {
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .art-meta {
          color: #757188;
          font-size: 13px;
          line-height: 1.55;
        }

        .explain {
          margin-top: 16px;
          padding: 18px;
          border-radius: 22px;
          background: linear-gradient(145deg, #fbf7ef, #fff);
          border: 1px solid #f1e7d6;
        }

        .explain h3 {
          margin: 0 0 8px;
          font-size: 21px;
          letter-spacing: -0.04em;
        }

        .explain p {
          margin: 0;
          font-size: 15px;
          line-height: 1.7;
          color: #4e4b58;
        }

        .point-list {
          margin-top: 14px;
          display: grid;
          gap: 10px;
        }

        .point {
          display: flex;
          gap: 10px;
          font-size: 14px;
          line-height: 1.55;
          color: #47445a;
        }

        .dot {
          width: 8px;
          height: 8px;
          background: #9b6cff;
          border-radius: 50%;
          margin-top: 7px;
          flex-shrink: 0;
        }

        .chat-list {
          display: grid;
          gap: 10px;
        }

        .bubble {
          max-width: 86%;
          padding: 13px 15px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.55;
        }

        .bubble.ai {
          background: #f5f3fb;
          color: #3d394f;
          border-top-left-radius: 6px;
        }

        .bubble.user {
          margin-left: auto;
          background: #171729;
          color: #fff;
          border-top-right-radius: 6px;
        }

        .chat-input {
          margin-top: 14px;
          display: flex;
          gap: 8px;
        }

        .chat-input input {
          flex: 1;
          border: 1px solid #eceaf3;
          border-radius: 16px;
          padding: 13px 14px;
          outline: none;
          font-size: 14px;
        }

        .send {
          width: 48px;
          border: none;
          border-radius: 16px;
          background: #8d62ff;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .archive-hero {
          padding: 22px;
          border-radius: 30px;
          background: linear-gradient(135deg, #ffe889, #b46cff, #68e3bd);
          color: #111;
          margin-top: 12px;
          position: relative;
          overflow: hidden;
        }

        .archive-hero h1 {
          margin: 0;
          font-size: 35px;
        }

        .archive-hero p {
          margin: 8px 0 0;
          font-size: 15px;
          line-height: 1.5;
          color: rgba(0, 0, 0, 0.68);
        }

        .calendar {
          margin-top: 18px;
          background: #fff;
          border-radius: 28px;
          padding: 18px;
          border: 1px solid #eeeaf5;
          box-shadow: 0 12px 32px rgba(33, 27, 74, 0.06);
        }

        .calendar-title {
          text-align: center;
          font-size: 24px;
          font-weight: 900;
          margin-bottom: 18px;
        }

        .days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          text-align: center;
        }

        .day-name {
          font-size: 12px;
          color: #8d899e;
          margin-bottom: 8px;
        }

        .day {
          height: 42px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 14px;
          font-size: 14px;
          position: relative;
        }

        .day.active {
          border: 2px solid #9569ff;
          color: #7d55ea;
          font-weight: 900;
          background: #faf7ff;
        }

        .day.dotday::after {
          content: "";
          width: 5px;
          height: 5px;
          background: #22c99a;
          border-radius: 50%;
          position: absolute;
          bottom: 5px;
        }

        .record-card {
          margin-top: 16px;
          display: flex;
          gap: 14px;
          padding: 14px;
          border-radius: 24px;
          background: #fff;
          border: 1px solid #eceaf3;
          box-shadow: 0 12px 30px rgba(33, 27, 74, 0.07);
        }

        .record-img {
          width: 104px;
          height: 104px;
          border-radius: 20px;
          background: url("https://images.unsplash.com/photo-1580136579312-94651dfd596d?q=80&w=900&auto=format&fit=crop");
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
        }

        .record-info h3 {
          margin: 6px 0 5px;
          font-size: 17px;
          line-height: 1.25;
        }

        .record-info p {
          margin: 0;
          color: #706d80;
          font-size: 13px;
          line-height: 1.45;
        }

        .rating {
          margin-top: 10px;
          font-weight: 900;
          color: #171729;
        }

        .ticket-page-title {
          text-align: center;
          margin-top: 10px;
        }

        .ticket-page-title h1 {
          font-family: Georgia, serif;
          font-size: 38px;
          letter-spacing: -0.03em;
          margin-bottom: 6px;
        }

        .ticket-page-title p {
          margin: 0;
          color: #777184;
          font-size: 14px;
        }

        .ticket {
          margin: 24px auto 0;
          width: 310px;
          min-height: 430px;
          background: #f6efe2;
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 20px 46px rgba(73, 51, 25, 0.18);
          position: relative;
          font-family: Georgia, "Times New Roman", serif;
          border: 1px solid #e3d7c2;
        }

        .ticket::before,
        .ticket::after {
          content: "";
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #fff;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .ticket::before {
          top: -12px;
        }

        .ticket::after {
          bottom: -12px;
        }

        .ticket-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #b9aa91;
          padding-bottom: 10px;
          font-size: 13px;
          letter-spacing: 0.08em;
        }

        .ticket-img {
          margin-top: 14px;
          height: 165px;
          border-radius: 10px;
          background: url("https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?q=80&w=900&auto=format&fit=crop");
          background-size: cover;
          background-position: center;
        }

        .ticket h2 {
          margin: 18px 0 10px;
          font-size: 28px;
          font-weight: 500;
        }

        .ticket-row {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px dotted #b7a78c;
          padding: 8px 0;
          font-size: 14px;
        }

        .barcode {
          margin-top: 18px;
          height: 42px;
          background: repeating-linear-gradient(
            90deg,
            #111 0,
            #111 2px,
            transparent 2px,
            transparent 5px
          );
          opacity: 0.82;
        }

        .style-list {
          margin-top: 24px;
        }

        .style-list h3 {
          font-size: 19px;
          margin-bottom: 12px;
          font-family: Georgia, serif;
        }

        .style-chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .style-chips span {
          padding: 9px 14px;
          border-radius: 999px;
          border: 1px solid #d7c9b7;
          font-size: 13px;
          white-space: nowrap;
        }

        .share-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 20px;
        }

        .brown {
          background: #5d4b38;
          color: #fff;
        }

        .outline {
          background: transparent;
          color: #4c3f32;
          border: 1px solid #5d4b38;
        }

        .bottom-nav {
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 18px;
          height: 78px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid #f0edf4;
          border-radius: 34px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          box-shadow: 0 14px 35px rgba(30, 25, 68, 0.12);
        }

        .nav-item {
          border: none;
          background: transparent;
          color: #6d697a;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .nav-item.active {
          color: #171729;
        }

        .nav-icon {
          font-size: 21px;
        }

        .plus {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #111;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 520px) {
          .app {
            padding: 0;
          }

          .phone {
            width: 100vw;
            height: 100vh;
            border-radius: 0;
            border: none;
          }

          .page {
            height: calc(100vh - 154px);
          }
        }
      `}</style>
    </main>
  );
}

function Header({ tab }) {
  const title =
    tab === "scan" ? "Clartatity" : tab === "archive" ? "Records" : "Archive Pass";

  return (
    <div className="header">
      <button className="back">‹</button>
      <div className="brand">
        <div className="brand-name">{title}</div>
        <div className="brand-sub">Museum AI Guide</div>
      </div>
      <button className="help">?</button>
    </div>
  );
}

function ScanPage({
  artwork,
  userProfile,
  startScan,
  isScanning,
  hasResult,
  messages,
  question,
  setQuestion,
  sendQuestion,
}) {
  return (
    <div className="page">
      <section className="hero">
        <div className="eyebrow">✨ OCR Caption Guide</div>
        <h1>
          작품 캡션을
          <br />
          AI 해설로.
        </h1>
        <p className="desc">
          박물관·미술관에서 작품 캡션을 촬영하면, 사용자의 지식 수준과
          취향에 맞춰 쉽게 작품을 설명합니다.
        </p>
      </section>

      <section className="camera-card">
        <div className="camera-frame">
          {isScanning && <div className="scan-line" />}
          <div className="caption-box">
            Claude Monet, Water Lily Pond, 1899, Musée d’Orsay.
            <br />
            Caption recognition area
          </div>
        </div>

        <div className="camera-actions">
          <button className="btn btn-primary" onClick={startScan}>
            {isScanning ? "인식 중..." : "캡션 OCR 인식"}
          </button>
          <button className="btn btn-ghost">갤러리에서 선택</button>
        </div>
      </section>

      <section className="profile-card">
        <div className="section-title">임의 설정된 사용자 프로필</div>
        <div className="chips">
          <span className="chip">{userProfile.level}</span>
          <span className="chip">{userProfile.taste}</span>
          <span className="chip">{userProfile.age}</span>
        </div>
      </section>

      {hasResult && (
        <>
          <section className="result-card">
            <div className="section-title">인식된 작품</div>

            <div className="art-mini">
              <div className="thumb" />
              <div>
                <div className="art-title">{artwork.title}</div>
                <div className="art-meta">
                  {artwork.artist}
                  <br />
                  {artwork.museum} · {artwork.year}
                </div>
              </div>
            </div>

            <div className="explain">
              <h3>쉽게 말하면, 이 작품은 ‘빛의 순간’을 그린 그림이에요.</h3>
              <p>
                모네는 연못 자체를 정확하게 묘사하려 한 것이 아니라, 물 위에
                비치는 빛과 공기, 시간이 흐르며 달라지는 분위기를 포착하려
                했습니다. 그래서 이 그림은 “무엇을 그렸는가”보다 “그 순간이
                어떻게 느껴지는가”가 더 중요한 작품입니다.
              </p>

              <div className="point-list">
                <div className="point">
                  <span className="dot" />
                  <span>
                    <b>작가의 의도:</b> 대상을 선명하게 설명하기보다 순간의
                    인상과 분위기를 표현하려 했습니다.
                  </span>
                </div>
                <div className="point">
                  <span className="dot" />
                  <span>
                    <b>감상 포인트:</b> 가까이서 보면 붓질이 흩어져 보이지만,
                    멀리서 보면 빛과 물결이 자연스럽게 합쳐집니다.
                  </span>
                </div>
                <div className="point">
                  <span className="dot" />
                  <span>
                    <b>입문자용 해석:</b> “잘 그린 풍경화”라기보다, 지금 이
                    순간의 공기와 감정을 저장한 그림에 가깝습니다.
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="chat-card">
            <div className="section-title">작품에 대해 질문하기</div>

            <div className="chat-list">
              {messages.map((m, i) => (
                <div key={i} className={`bubble ${m.role}`}>
                  {m.text}
                </div>
              ))}
            </div>

            <div className="chat-input">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="예: 왜 이 작품이 유명해?"
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendQuestion();
                }}
              />
              <button className="send" onClick={sendQuestion}>
                ↑
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ArchivePage() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="page">
      <section className="archive-hero">
        <h1>
          Record
          <br />
          Calendar
        </h1>
        <p>날짜별로 내가 본 작품과 전시 기록을 아카이빙합니다.</p>
      </section>

      <section className="calendar">
        <div className="calendar-title">May 2026</div>

        <div className="days">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div className="day-name" key={d}>
              {d}
            </div>
          ))}

          {days.map((day) => (
            <div
              key={day}
              className={`day ${day === 12 ? "active" : ""} ${
                [5, 18, 25].includes(day) ? "dotday" : ""
              }`}
            >
              {day}
            </div>
          ))}
        </div>
      </section>

      <section className="record-card">
        <div className="record-img" />
        <div className="record-info">
          <p>May 12 · 오르세 미술관</p>
          <h3>Claude Monet — Water Lily Pond</h3>
          <p>빛과 시간의 변화가 인상 깊었던 작품</p>
          <div className="rating">★ 4.8</div>
        </div>
      </section>

      <section className="archive-card">
        <div className="section-title">아카이빙 기능 예시</div>
        <div className="point-list">
          <div className="point">
            <span className="dot" />
            <span>인식한 작품과 AI 해설을 자동 저장</span>
          </div>
          <div className="point">
            <span className="dot" />
            <span>방문한 전시·미술관별 기록 확인</span>
          </div>
          <div className="point">
            <span className="dot" />
            <span>추후 감상 티켓으로 공유 가능</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function TicketPage({ artwork }) {
  return (
    <div className="page">
      <section className="ticket-page-title">
        <h1>Archiving Ticket</h1>
        <p>내가 본 작품을 감성 티켓으로 공유해보세요.</p>
      </section>

      <section className="ticket-wrap">
        <div className="ticket">
          <div className="ticket-top">
            <span>MUSEUM ARCHIVE</span>
            <span>ADMIT ONE</span>
          </div>

          <div className="ticket-img" />

          <h2>{artwork.title}</h2>

          <div className="ticket-row">
            <span>Artist</span>
            <strong>{artwork.artist}</strong>
          </div>
          <div className="ticket-row">
            <span>Museum</span>
            <strong>{artwork.museum}</strong>
          </div>
          <div className="ticket-row">
            <span>Date</span>
            <strong>2026.05.12</strong>
          </div>
          <div className="ticket-row">
            <span>Rating</span>
            <strong>★ 4.8</strong>
          </div>

          <div className="barcode" />
        </div>

        <div className="style-list">
          <h3>Explore More Styles</h3>
          <div className="style-chips">
            <span>All</span>
            <span>Vintage</span>
            <span>Minimal</span>
            <span>Collage</span>
            <span>Monotone</span>
          </div>
        </div>

        <div className="share-row">
          <button className="btn brown">친구와 공유</button>
          <button className="btn outline">스토리 저장</button>
        </div>
      </section>
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${tab === "scan" ? "active" : ""}`}
        onClick={() => setTab("scan")}
      >
        <span className="nav-icon">⌂</span>
        <span>홈</span>
      </button>

      <button
        className={`nav-item ${tab === "archive" ? "active" : ""}`}
        onClick={() => setTab("archive")}
      >
        <span className="nav-icon">▣</span>
        <span>기록</span>
      </button>

      <button className="nav-item" onClick={() => setTab("scan")}>
        <span className="plus">+</span>
      </button>

      <button
        className={`nav-item ${tab === "ticket" ? "active" : ""}`}
        onClick={() => setTab("ticket")}
      >
        <span className="nav-icon">✦</span>
        <span>티켓</span>
      </button>

      <button className="nav-item">
        <span className="nav-icon">○</span>
        <span>마이</span>
      </button>
    </nav>
  );
}