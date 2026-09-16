 "use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setName(localStorage.getItem("ai_name") || "");
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
    } else if (q.includes("what is my name")) {
      answer = name ? `Your name is ${name}.` : "You haven't told me your name yet.";
    } else if (q.includes("hello") || q.includes("hi")) {
      answer = name ? `Hello ${name}. How can I help?` : "Hello. How can I help?";
    } else if (q.includes("time")) {
      answer = `The current time is ${new Date().toLocaleTimeString([], {hour: "numeric", minute: "2-digit"})}.`;
    } else if (q.includes("date") || q.includes("today")) {
      answer = `Today is ${new Date().toLocaleDateString([], {weekday: "long", year: "numeric", month: "long", day: "numeric"})}.`;
    } else if (q.includes("clear memory")) {
      localStorage.removeItem("ai_name");
      setName("");
      answer = "I cleared the saved name from this device.";
    } else {
      answer = "I can currently handle basic free commands like your name, date, time, greetings, and local memory. The AI API can be connected later when you have budget.";
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
    recognition.lang = "en-IN";
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
            <p>Free starter version • Your data stays in this browser.</p>
          </div>
          <div className="orb">AI</div>
        </div>

        <div className="chat">
          {messages.length === 0 ? (
            <div className="empty">
              <strong>Ready.</strong>
              <span>Try “What is the time?” or “My name is Jeff”.</span>
            </div>
          ) : messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.text}
            </div>
          ))}
        </div>

        <div className="controls">
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