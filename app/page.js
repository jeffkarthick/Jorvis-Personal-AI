 "use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("ta-IN");

  useEffect(() => {
    setName(localStorage.getItem("ai_name") || "");
    setLanguage(localStorage.getItem("ai_language") || "ta-IN");
    setMessages(JSON.parse(localStorage.getItem("ai_messages") || "[]"));
  }, []);

  function saveMessages(next) {
    setMessages(next);
    localStorage.setItem("ai_messages", JSON.stringify(next));
  }

  function speak(message) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(message);
      u.lang = /[\u0B80-\u0BFF]/.test(message) ? "ta-IN" : "en-IN";
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
  }

  function respond(input) {
    const q = input.toLowerCase().trim();
    let answer;

    if (q.startsWith("my name is ")) {
      const n = input.slice(11).trim();
      localStorage.setItem("ai_name", n);
      setName(n);
      answer = `Nice to meet you, ${n}. I will remember your name on this device.`;
    } else if (q.includes("என் பெயர்")) {
      const n = input.replace(/என் பெயர்|என்பது|என்று/gi, "").trim();
      if (n) {
        localStorage.setItem("ai_name", n);
        setName(n);
        answer = `சரி ${n}. உங்கள் பெயரை இந்த போனில் நினைவில் வைத்துக்கொள்கிறேன்.`;
      } else {
        answer = "உங்கள் பெயரை சொல்லுங்கள்.";
      }
    } else if (q.includes("what is my name") || q.includes("என் பெயர் என்ன")) {
      answer = name ? `உங்கள் பெயர் ${name}.` : "நீங்கள் இன்னும் உங்கள் பெயரை சொல்லவில்லை.";
    } else if (q.includes("hello") || q.includes("hi") || q.includes("வணக்கம்")) {
      answer = name ? `வணக்கம் ${name}. நான் எப்படி உதவலாம்?` : "வணக்கம். நான் எப்படி உதவலாம்?";
    } else if (q.includes("time") || q.includes("நேரம்")) {
      answer = q.includes("நேரம்")
        ? `இப்போதைய நேரம் ${new Date().toLocaleTimeString("ta-IN", {hour: "numeric", minute: "2-digit"})}.`
        : `The current time is ${new Date().toLocaleTimeString([], {hour: "numeric", minute: "2-digit"})}.`;
    } else if (q.includes("date") || q.includes("today") || q.includes("தேதி") || q.includes("இன்று")) {
      answer = q.includes("தேதி") || q.includes("இன்று")
        ? `இன்று ${new Date().toLocaleDateString("ta-IN", {weekday: "long", year: "numeric", month: "long", day: "numeric"})}.`
        : `Today is ${new Date().toLocaleDateString([], {weekday: "long", year: "numeric", month: "long", day: "numeric"})}.`;
    } else if (q.includes("clear memory") || q.includes("நினைவுகளை அழி")) {
      localStorage.removeItem("ai_name");
      setName("");
      answer = "சரி. இந்த போனில் சேமித்த பெயரை அழித்துவிட்டேன்.";
    } else {
      answer = /[\u0B80-\u0BFF]/.test(input)
        ? "இப்போதைக்கு நான் basic commands மட்டும் handle செய்கிறேன். அடுத்த version-ல் real AI brain connect செய்யலாம்."
        : "I can currently handle basic free commands like your name, date, time, greetings, and local memory. The AI API can be connected later.";
    }

    const next = [
      ...messages,
      { role: "user", text: input },
      { role: "assistant", text: answer }
    ].slice(-30);

    saveMessages(next);
    speak(answer);
  }

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported by this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const value = event.results[0][0].transcript;
      setText(value);
      respond(value);
    };

    recognition.start();
  }

  return (
    <main className="page">
      <section className="card">
        <div className="top">
          <div>
            <div className="eyebrow">PERSONAL AI</div>
            <h1>My Assistant</h1>
            <p>Free starter version • Tamil + English • Your data stays in this browser.</p>
          </div>
          <div className="orb">AI</div>
        </div>

        <div className="chat">
          {messages.length === 0 ? (
            <div className="empty">
              <strong>Ready.</strong>
              <span>Try “What is the time?”, “நேரம் என்ன?”, or “என் பெயர் Jeff”.</span>
            </div>
          ) : messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.text}
            </div>
          ))}
        </div>

        <div className="controls">
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              localStorage.setItem("ai_language", e.target.value);
            }}
            aria-label="Voice language"
            style={{background:"#111",color:"#fff",border:"1px solid #333",borderRadius:"15px",padding:"0 10px"}}
          >
            <option value="ta-IN">Tamil</option>
            <option value="en-IN">English</option>
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                const value = text.trim();
                setText("");
                respond(value);
              }
            }}
            placeholder="Talk to your assistant..."
          />
          <button className={listening ? "mic active" : "mic"} onClick={startVoice}>
            {listening ? "Listening…" : "🎙️"}
          </button>
          <button
            className="send"
            onClick={() => {
              if (!text.trim()) return;
              const value = text.trim();
              setText("");
              respond(value);
            }}
          >
            Send
          </button>
        </div>

        <div className="hint">
          Free now: voice input + voice replies + local memory. AI API and advanced lock-screen automation can be added later.
        </div>
      </section>
    </main>
  );
}