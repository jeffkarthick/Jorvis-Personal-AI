"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("ta-IN");
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) =>
          console.log("Service worker error:", error)
        );
    }

    setName(localStorage.getItem("ai_name") || "");
    setLanguage(
      localStorage.getItem("ai_language") || "ta-IN"
    );

    setMessages(
      JSON.parse(
        localStorage.getItem("ai_messages") || "[]"
      )
    );

    setReminders(
      JSON.parse(
        localStorage.getItem("jorvis_reminders") || "[]"
      )
    );

    requestNotificationPermission();
  }, []);

  function requestNotificationPermission() {
    if (
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }

  function saveMessages(next) {
    setMessages(next);
    localStorage.setItem(
      "ai_messages",
      JSON.stringify(next)
    );
  }

  function saveReminders(next) {
    setReminders(next);

    localStorage.setItem(
      "jorvis_reminders",
      JSON.stringify(next)
    );
  }

  function speak(message) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(message);

    u.lang = /[\u0B80-\u0BFF]/.test(message)
      ? "ta-IN"
      : "en-IN";

    u.rate = 0.95;
    u.pitch = 1;

    window.speechSynthesis.speak(u);
  }

  // --------------------------------
  // REMINDER PARSER
  // --------------------------------

  function parseReminder(input) {
    const q = input.toLowerCase();

    const reminderWords = [
      "remind",
      "reminder",
      "நினைவுபடுத்த",
      "ஞாபகப்படுத்த",
      "remind பண்ணு",
      "reminder வை",
      "reminder வைக்க",
    ];

    const isReminder = reminderWords.some((word) =>
      q.includes(word)
    );

    if (!isReminder) return null;

    let hour = null;
    let minute = 0;

    // 4:30 PM / 4 PM
    const englishTime = q.match(
      /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/
    );

    // 4 மணி / 4 மணிக்கு
    const tamilTime = q.match(
      /\b(\d{1,2})(?::(\d{2}))?\s*மணி(?:க்கு)?/
    );

    if (englishTime) {
      hour = Number(englishTime[1]);
      minute = Number(englishTime[2] || 0);

      const period = englishTime[3];

      if (period === "pm" && hour < 12) {
        hour += 12;
      }

      if (period === "am" && hour === 12) {
        hour = 0;
      }
    } else if (tamilTime) {
      hour = Number(tamilTime[1]);
      minute = Number(tamilTime[2] || 0);
    }

    if (hour === null) {
      return null;
    }

    const now = new Date();
    const reminderDate = new Date(now);

    reminderDate.setHours(hour);
    reminderDate.setMinutes(minute);
    reminderDate.setSeconds(0);
    reminderDate.setMilliseconds(0);

    // "tomorrow" / "நாளைக்கு"
    if (
      q.includes("tomorrow") ||
      q.includes("நாளைக்கு") ||
      q.includes("நாளை")
    ) {
      reminderDate.setDate(
        reminderDate.getDate() + 1
      );
    }

    // If selected time already passed today,
    // automatically move it to tomorrow.
    else if (reminderDate <= now) {
      reminderDate.setDate(
        reminderDate.getDate() + 1
      );
    }

    let title = input;

    title = title
      .replace(
        /\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi,
        ""
      )
      .replace(
        /\b\d{1,2}(?::\d{2})?\s*மணி(?:க்கு)?/gi,
        ""
      )
      .replace(/remind me/gi, "")
      .replace(/remind/gi, "")
      .replace(/reminder/gi, "")
      .replace(/tomorrow/gi, "")
      .replace(/நாளைக்கு/g, "")
      .replace(/நாளை/g, "")
      .replace(/நினைவுபடுத்த/g, "")
      .replace(/ஞாபகப்படுத்த/g, "")
      .replace(/remind பண்ணு/gi, "")
      .replace(/reminder வை/gi, "")
      .replace(/reminder வைக்க/gi, "")
      .replace(/பண்ணு/g, "")
      .replace(/பண்ண/g, "")
      .trim();

    if (!title) {
      title = "Jorvis reminder";
    }

    return {
      title,
      date: reminderDate,
    };
  }

  // --------------------------------
  // CREATE REMINDER
  // --------------------------------

  function createReminder(title, date) {
    const reminder = {
      id: Date.now(),
      title,
      time: date.getTime(),
      completed: false,
    };

    const next = [
      ...reminders,
      reminder,
    ];

    saveReminders(next);

    scheduleReminderNotification(reminder);

    return reminder;
  }

  // --------------------------------
  // NOTIFICATION
  // --------------------------------

  function scheduleReminderNotification(reminder) {
    const delay =
      reminder.time - Date.now();

    if (delay <= 0) return;

    if ("Notification" in window) {
      if (
        Notification.permission === "default"
      ) {
        Notification.requestPermission();
      }
    }

    // Browser timers are best-effort.
    // They may stop when iOS suspends the PWA.
    setTimeout(() => {
      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Jorvis Reminder", {
          body: reminder.title,
        });
      }

      speak(
        `Reminder. ${reminder.title}`
      );
    }, delay);
  }

  // --------------------------------
  // MAIN COMMAND ENGINE
  // --------------------------------

  function respond(input) {
    const q = input.toLowerCase().trim();

    let answer;

    // REMINDER
    const reminder = parseReminder(input);

    if (reminder) {
      const created = createReminder(
        reminder.title,
        reminder.date
      );

      const formatted =
        reminder.date.toLocaleTimeString(
          "ta-IN",
          {
            hour: "numeric",
            minute: "2-digit",
          }
        );

      answer =
        `சரி. ${formatted}க்கு reminder வைத்துவிட்டேன்: ${created.title}.`;
    }

    // NAME
    else if (q.startsWith("my name is ")) {
      const n = input
        .slice(11)
        .trim();

      localStorage.setItem(
        "ai_name",
        n
      );

      setName(n);

      answer =
        `Nice to meet you, ${n}. I will remember your name on this device.`;
    }

    // TAMIL NAME
    else if (
      q.includes("என் பெயர்") &&
      !q.includes("என்ன")
    ) {
      const n = input
        .replace(
          /என் பெயர்|என்பது|என்று/gi,
          ""
        )
        .trim();

      if (n) {
        localStorage.setItem(
          "ai_name",
          n
        );

        setName(n);

        answer =
          `சரி ${n}. உங்கள் பெயரை நினைவில் வைத்துக்கொண்டேன்.`;
      } else {
        answer =
          "உங்கள் பெயரை சொல்லுங்கள்.";
      }
    }

    // ASK NAME
    else if (
      q.includes("what is my name") ||
      q.includes("என் பெயர் என்ன")
    ) {
      answer = name
        ? `உங்கள் பெயர் ${name}.`
        : "நீங்கள் இன்னும் உங்கள் பெயரை சொல்லவில்லை.";
    }

    // GREETING
    else if (
      q.includes("hello") ||
      q.includes("hi") ||
      q.includes("வணக்கம்")
    ) {
      answer = name
        ? `வணக்கம் ${name}. நான் எப்படி உதவலாம்?`
        : "வணக்கம். நான் Jorvis. எப்படி உதவலாம்?";
    }

    // TIME
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

    // DATE
    else if (
      q.includes("date") ||
      q.includes("today") ||
      q.includes("தேதி") ||
      q.includes("இன்று")
    ) {
      answer =
        q.includes("தேதி") ||
        q.includes("இன்று")
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

    // CLEAR MEMORY
    else if (
      q.includes("clear memory") ||
      q.includes("நினைவுகளை அழி")
    ) {
      localStorage.removeItem(
        "ai_name"
      );

      localStorage.removeItem(
        "ai_messages"
      );

      setName("");
      setMessages([]);

      answer =
        "சரி. இந்த போனில் சேமித்த நினைவுகளை அழித்துவிட்டேன்.";
    }

    // FALLBACK
    else {
      answer =
        /[\u0B80-\u0BFF]/.test(input)
          ? "இந்த command-ஐ இன்னும் offline-ஆ புரிந்துகொள்ளவில்லை. Reminder, time, date, name அல்லது greeting முயற்சி செய்யுங்கள்."
          : "I am currently working in offline mode. Try a reminder, name, time, date, or greeting command.";
    }

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

    speak(answer);
  }

  // --------------------------------
  // VOICE
  // --------------------------------

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

    const recognition =
      new SpeechRecognition();

    recognition.lang = language;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () =>
      setListening(true);

    recognition.onend = () =>
      setListening(false);

    recognition.onerror = () =>
      setListening(false);

    recognition.onresult = (event) => {
      const value =
        event.results[0][0]
          .transcript;

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
            <div className="eyebrow">
              PERSONAL AI
            </div>

            <h1>Jorvis</h1>

            <p>
              Offline Personal Assistant •
              Tamil + English
            </p>
          </div>

          <div className="orb">
            AI
          </div>
        </div>

        <div className="chat">
          {messages.length === 0 ? (
            <div className="empty">
              <strong>Ready.</strong>

              <span>
                Try “4 PM reminder to call
                Arun” or “நாளைக்கு 4 மணிக்கு
                Arun-க்கு call பண்ண remind
                பண்ணு”.
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

        <div className="controls">

          <select
            value={language}
            onChange={(e) => {
              const value =
                e.target.value;

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
                const value =
                  text.trim();

                setText("");

                respond(value);
              }
            }}
            placeholder="Talk to Jorvis..."
          />

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

          <button
            className="send"
            onClick={() => {
              if (!text.trim()) return;

              const value =
                text.trim();

              setText("");

              respond(value);
            }}
          >
            Send
          </button>
        </div>

        <div className="hint">
          🟢 Offline mode • Local memory •
          Tamil + English • Reminders
        </div>

      </section>
    </main>
  );
}