"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("ta-IN");

  // Register offline service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          console.log("Jorvis offline mode ready");
        })
        .catch((error) => {
          console.log("Service worker registration failed:", error);
        });
    }

    // Load local memory
    const savedName = localStorage.getItem("ai_name") || "";
    const savedLanguage =
      localStorage.getItem("ai_language") || "ta-IN";
    const savedMessages = JSON.parse(
      localStorage.getItem("ai_messages") || "[]"
    );

    setName(savedName);
    setLanguage(savedLanguage);
    setMessages(savedMessages);
  }, []);

  // Save chat locally
  function saveMessages(next) {
    setMessages(next);
    localStorage.setItem("ai_messages", JSON.stringify(next));
  }

  // Offline voice reply
  function speak(message) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);

    // Tamil voice automatically for Tamil text
    if (/[\u0B80-\u0BFF]/.test(message)) {
      utterance.lang = "ta-IN";
    } else {
      utterance.lang = "en-IN";
    }

    utterance.rate = 0.95;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }

  // Basic offline command engine
  function respond(input) {
    const q = input.toLowerCase().trim();
    let answer;

    // -------------------------
    // NAME
    // -------------------------

    if (q.startsWith("my name is ")) {
      const n = input.slice(11).trim();

      localStorage.setItem("ai_name", n);
      setName(n);

      answer = `Nice to meet you, ${n}. I will remember your name on this device.`;
    }

    // Tamil name command
    else if (q.includes("என் பெயர்") && !q.includes("என்ன")) {
      const n = input
        .replace(/என் பெயர்|என்பது|என்று/gi, "")
        .trim();

      if (n) {
        localStorage.setItem("ai_name", n);
        setName(n);

        answer = `சரி ${n}. உங்கள் பெயரை இந்த போனில் நினைவில் வைத்துக்கொள்கிறேன்.`;
      } else {
        answer = "உங்கள் பெயரை சொல்லுங்கள்.";
      }
    }

    // Ask name
    else if (
      q.includes("what is my name") ||
      q.includes("என் பெயர் என்ன")
    ) {
      answer = name
        ? `உங்கள் பெயர் ${name}.`
        : "நீங்கள் இன்னும் உங்கள் பெயரை சொல்லவில்லை.";
    }

    // -------------------------
    // GREETING
    // -------------------------

    else if (
      q.includes("hello") ||
      q.includes("hi") ||
      q.includes("வணக்கம்")
    ) {
      answer = name
        ? `வணக்கம் ${name}. நான் எப்படி உதவலாம்?`
        : "வணக்கம். நான் Jorvis. எப்படி உதவலாம்?";
    }

    // -------------------------
    // TIME
    // -------------------------

    else if (
      q.includes("time") ||
      q.includes("நேரம்")
    ) {
      answer = q.includes("நேரம்")
        ? `இப்போதைய நேரம் ${new Date().toLocaleTimeString(
            "ta-IN",
            {
              hour: "numeric",
              minute: "2-digit",
            }
          )}.`
        : `The current time is ${new Date().toLocaleTimeString(
            [],
            {
              hour: "numeric",
              minute: "2-digit",
            }
          )}.`;
    }

    // -------------------------
    // DATE
    // -------------------------

    else if (
      q.includes("date") ||
      q.includes("today") ||
      q.includes("தேதி") ||
      q.includes("இன்று")
    ) {
      answer =
        q.includes("தேதி") || q.includes("இன்று")
          ? `இன்று ${new Date().toLocaleDateString(
              "ta-IN",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}.`
          : `Today is ${new Date().toLocaleDateString(
              [],
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}.`;
    }

    // -------------------------
    // CLEAR MEMORY
    // -------------------------

    else if (
      q.includes("clear memory") ||
      q.includes("நினைவுகளை அழி")
    ) {
      localStorage.removeItem("ai_name");
      localStorage.removeItem("ai_messages");

      setName("");
      setMessages([]);

      answer =
        "சரி. இந்த போனில் சேமித்த நினைவுகளை அழித்துவிட்டேன்.";
    }

    // -------------------------
    // OFFLINE FALLBACK
    // -------------------------

    else {
      answer = /[\u0B80-\u0BFF]/.test(input)
        ? "இந்த command-ஐ இன்னும் offline-ஆ புரிந்துகொள்ள கற்றுக்கொடுக்கவில்லை. Time, date, name அல்லது greeting முயற்சி செய்யுங்கள்."
        : "I am currently working in offline mode. Try commands for your name, time, date, or greetings.";
    }

    // Save conversation locally
    const next = [
      ...messages,
      {
        role: "user",
        text: input,
      },
      {
        role: "assistant",
        text: answer,
      },
    ].slice(-30);

    saveMessages(next);

    // Speak answer
    speak(answer);
  }

  // -------------------------
  // VOICE INPUT
  // -------------------------

  function startVoice() {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice input is not supported by this browser."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = language;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onresult = (event) => {
      const value =
        event.results[0][0].transcript;

      setText(value);

      respond(value);
    };

    recognition.start();
  }

  return (
    <main className="page">
      <section className="card">

        {/* HEADER */}
        <div className="top">
          <div>
            <div className="eyebrow">
              PERSONAL AI
            </div>

            <h1>Jorvis</h1>

            <p>
              Offline Personal Assistant • Tamil +
              English
            </p>
          </div>

          <div className="orb">
            AI
          </div>
        </div>

        {/* CHAT */}
        <div className="chat">
          {messages.length === 0 ? (
            <div className="empty">
              <strong>Ready.</strong>

              <span>
                Try “What is the time?”,
                “நேரம் என்ன?”, or
                “என் பெயர் Jeff”.
              </span>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`msg ${m.role}`}
              >
                {m.text}
              </div>
            ))
          )}
        </div>

        {/* CONTROLS */}
        <div className="controls">

          {/* LANGUAGE */}
          <select
            value={language}
            onChange={(e) => {
              const value = e.target.value;

              setLanguage(value);

              localStorage.setItem(
                "ai_language",
                value
              );
            }}
            aria-label="Voice language"
          >
            <option value="ta-IN">
              Tamil
            </option>

            <option value="en-IN">
              English
            </option>
          </select>

          {/* TEXT INPUT */}
          <input
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                text.trim()
              ) {
                const value = text.trim();

                setText("");

                respond(value);
              }
            }}
            placeholder="Talk to Jorvis..."
          />

          {/* VOICE */}
          <button
            className={
              listening
                ? "mic active"
                : "mic"
            }
            onClick={startVoice}
          >
            {listening
              ? "Listening…"
              : "🎙️"}
          </button>

          {/* SEND */}
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

        {/* STATUS */}
        <div className="hint">
          🟢 Offline mode • Local memory •
          Tamil + English voice
        </div>

      </section>
    </main>
  );
}