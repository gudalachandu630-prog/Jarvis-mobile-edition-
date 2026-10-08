// ============================================================
// J.A.R.V.I.S MOBILE EDITION
// COMPLETE SCRIPT.JS
// Gemini + Memory + Vision + Voice + 15 Tools + Buttons
// ============================================================


// ===== 1. API KEY =====

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
  API_KEY = prompt("Enter your Gemini API Key:");
  if (API_KEY) {
    localStorage.setItem("jarvis_key", API_KEY);
  }
}

const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest"
];


// ===== 2. GET HTML ELEMENTS =====

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");


// ===== 3. MEMORY =====

let MEMORY = [];

try {
  const storedMemory =
    JSON.parse(localStorage.getItem("jarvis_memory") || "[]");

  if (Array.isArray(storedMemory)) {
    MEMORY = storedMemory.filter(
      m =>
        m &&
        (m.role === "user" || m.role === "model") &&
        typeof m.text === "string"
    );
  }
} catch (e) {
  MEMORY = [];
}

function saveMemory() {
  localStorage.setItem(
    "jarvis_memory",
    JSON.stringify(MEMORY)
  );
}


// Show previous memory

MEMORY.forEach(m => {
  add(
    (m.role === "user" ? "YOU: " : "J.A.R.V.I.S: ") + m.text,
    m.role === "user" ? "user" : "ai"
  );
});


// ===== 4. SAFE FETCH =====

async function fetchToolJson(
  url,
  options = {},
  timeoutMs = 10000
) {
  const controller =
    typeof AbortController === "function"
      ? new AbortController()
      : null;

  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetch(url, {
      ...options,
      ...(controller ? { signal: controller.signal } : {})
    });

    if (!response.ok) {
      throw new Error("Request failed: " + response.status);
    }

    return await response.json();

  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}


// ============================================================
// 5. TOOLS — THE HANDS
// ============================================================

async function handleTools(text) {

  const t = text.toLowerCase();


  // ===== TOOL 1 — TIME =====

  if (
    /\btime\b/.test(t) ||
    t.includes("సమయం") ||
    t.includes("టైమ్")
  ) {
    return (
      "The time is " +
      new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit"
      }) +
      " IST, Boss."
    );
  }


  // ===== TOOL 2 — WEATHER =====

  if (
    t.includes("weather") ||
    t.includes("వాతావరణం")
  ) {

    if (!navigator.geolocation) {
      return "I need location permission for weather, Boss.";
    }

    return new Promise(resolve => {

      navigator.geolocation.getCurrentPosition(
        async position => {

          try {

            const url =
              "https://api.open-meteo.com/v1/forecast" +
              "?latitude=" +
              position.coords.latitude +
              "&longitude=" +
              position.coords.longitude +
              "&current_weather=true";

            const data = await fetchToolJson(url);

            const temperature =
              data?.current_weather?.temperature ??
              data?.current?.temperature_2m;

            if (
              temperature === undefined ||
              temperature === null
            ) {
              throw new Error("Weather unavailable");
            }

            resolve(
              "It is " +
              temperature +
              " degrees Celsius now, Boss."
            );

          } catch (e) {

            resolve("Weather service error, Boss.");

          }

        },

        () => {
          resolve(
            "I need location permission for weather, Boss."
          );
        },

        {
          timeout: 10000,
          maximumAge: 300000
        }
      );

    });
  }


  // ===== TOOL 3 — TIMER =====

  if (
    t.includes("timer") ||
    t.includes("టైమర్")
  ) {

    const match = t.match(
      /(\d+(?:\.\d+)?)\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h)/i
    );

    if (!match) {
      return 'Timer format: say "timer 5 minutes".';
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    if (!Number.isFinite(amount) || amount <= 0) {
      return "Timer duration must be greater than zero.";
    }

    const factor =
      /^(h|hr|hrs|hour|hours)/.test(unit)
        ? 3600000
        : /^(s|sec|secs|second|seconds)/.test(unit)
        ? 1000
        : 60000;

    const duration = amount * factor;

    if (duration > 86400000) {
      return "Timer limit is 24 hours.";
    }

    setTimeout(() => {
      speak(
        "Timer completed! " +
        amount +
        " " +
        unit +
        " finished."
      );
    }, duration);

    return (
      "Timer set for " +
      amount +
      " " +
      unit +
      "."
    );
  }


  // ===== TOOL 4 — TRANSLATE =====

  if (/^\s*translate\b/i.test(text)) {

    const query = text
      .replace(/^\s*translate(?:\s+this)?\b/i, "")
      .trim();

    if (!query) {
      return 'Translate format: say "translate <text>".';
    }

    try {

      const url =
        "https://api.mymemory.translated.net/get?q=" +
        encodeURIComponent(query) +
        "&langpair=en|te";

      const data = await fetchToolJson(url);

      const translated =
        data?.responseData?.translatedText;

      if (!translated) {
        throw new Error("Translation unavailable");
      }

      return "In Telugu: " + translated;

    } catch (e) {

      return "Translate error, Boss.";
    }
  }


  // ===== TOOL 5 — YOUTUBE =====

  if (
    /^\s*(?:open\s+youtube|youtube\s+open)\s*$/i.test(text)
  ) {

    window.open(
      "https://youtube.com",
      "_blank",
      "noopener,noreferrer"
    );

    return "Opening YouTube, Boss.";
  }


  // YouTube search / play

  const playMatch = text.match(
    /^\s*play\s+(.+?)\s*$/i
  );

  const youtubeMatch = text.match(
    /^\s*youtube(?:\s+search)?(?:\s+for)?\s+(.+?)\s*$/i
  );

  const searchYoutubeMatch = text.match(
    /^\s*search\s+(?:on\s+)?youtube(?:\s+for)?\s+(.+?)\s*$/i
  );

  const videoQuery =
    playMatch?.[1] ||
    youtubeMatch?.[1] ||
    searchYoutubeMatch?.[1];

  if (videoQuery) {

    window.open(
      "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(videoQuery),
      "_blank",
      "noopener,noreferrer"
    );

    return (
      "Searching YouTube for " +
      videoQuery +
      ", Boss."
    );
  }


  // ===== TOOL 6 — GOOGLE SEARCH =====

  if (
    /^\s*(?:open\s+google|google\s+open)\s*$/i.test(text)
  ) {

    window.open(
      "https://google.com",
      "_blank",
      "noopener,noreferrer"
    );

    return "Opening Google, Boss.";
  }


  const googleSearch = text.match(
    /^\s*(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s+(.+?)\s*$/i
  );

  if (googleSearch) {

    const query = googleSearch[1].trim();

    window.open(
      "https://www.google.com/search?q=" +
      encodeURIComponent(query),
      "_blank",
      "noopener,noreferrer"
    );

    return (
      "Searching Google for " +
      query +
      ", Boss."
    );
  }


  // ===== TOOL 7 — WIKIPEDIA SEARCH =====

  const searchMatch = text.match(
    /^\s*(?:search|look up)\s+(?:for\s+)?(.+?)\s*$/i
  );

  if (searchMatch) {

    const query = searchMatch[1].trim();

    try {

      const url =
        "https://en.wikipedia.org/w/api.php" +
        "?action=query" +
        "&list=search" +
        "&srlimit=1" +
        "&srsearch=" +
        encodeURIComponent(query) +
        "&format=json" +
        "&origin=*";

      const data = await fetchToolJson(url);

      const result =
        data?.query?.search?.[0];

      if (!result) {
        return "I could not find that, Boss.";
      }

      const snippet = String(
        result.snippet || ""
      )
        .replace(/<[^>]*>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

      return (
        "Wikipedia summary: " +
        result.title +
        (snippet ? ". " + snippet : "")
      );

    } catch (e) {

      return "Search error, Boss.";
    }
  }


  // ===== TOOL 8 — DICE =====

  if (/\bdice\b/i.test(t)) {

    return (
      "You rolled " +
      (Math.floor(Math.random() * 6) + 1) +
      ", Boss."
    );
  }


  // ===== TOOL 9 — COIN =====

  if (/\bcoin\b/i.test(t)) {

    return Math.random() < 0.5
      ? "Heads, Boss."
      : "Tails, Boss.";
  }


  // ===== TOOL 10 — JOKE =====

  if (/\bjoke\b/i.test(t)) {

    try {

      const data = await fetchToolJson(
        "https://official-joke-api.appspot.com/random_joke"
      );

      if (
        typeof data?.setup !== "string" ||
        typeof data?.punchline !== "string"
      ) {
        throw new Error("Invalid joke");
      }

      return (
        data.setup +
        " ... " +
        data.punchline
      );

    } catch (e) {

      const jokes = [
        [
          "Why did the computer go to the doctor?",
          "It had a virus."
        ],
        [
          "Why was the math book sad?",
          "It had too many problems."
        ]
      ];

      const joke =
        jokes[Math.floor(Math.random() * jokes.length)];

      return joke[0] + " ... " + joke[1];
    }
  }


  // ===== TOOL 11 — QUOTE =====

  if (
    t.includes("quote") ||
    t.includes("motivate")
  ) {

    try {

      const data = await fetchToolJson(
        "https://dummyjson.com/quotes/random"
      );

      if (
        typeof data?.quote !== "string" ||
        typeof data?.author !== "string"
      ) {
        throw new Error("Invalid quote");
      }

      return (
        data.quote +
        " — by " +
        data.author
      );

    } catch (e) {

      return (
        "A small step today is still progress. " +
        "— by J.A.R.V.I.S"
      );
    }
  }


  // ===== TOOL 12 — NEWS =====

  if (/\bnews\b/i.test(t)) {

    try {

      const ids = await fetchToolJson(
        "https://hacker-news.firebaseio.com/v0/topstories.json"
      );

      if (!Array.isArray(ids)) {
        throw new Error("No news");
      }

      const stories = await Promise.all(
        ids.slice(0, 8).map(id =>
          fetchToolJson(
            "https://hacker-news.firebaseio.com/v0/item/" +
            id +
            ".json"
          ).catch(() => null)
        )
      );

      const titles = stories
        .filter(item => typeof item?.title === "string")
        .slice(0, 3);

      if (!titles.length) {
        throw new Error("No stories");
      }

      return (
        "Top tech news: " +
        titles
          .map(
            (item, index) =>
              index +
              1 +
              ". " +
              item.title +
              "."
          )
          .join(" ")
      );

    } catch (e) {

      return "News service error, Boss.";
    }
  }


  // ===== TOOL 13 — CURRENCY USD → INR =====

  if (
    t.includes("dollar") ||
    t.includes("usd") ||
    t.includes("exchange")
  ) {

    const amountMatch =
      t.match(/[-+]?\d+(?:\.\d+)?/);

    const amount = amountMatch
      ? Number(amountMatch[0])
      : 1;

    if (!Number.isFinite(amount) || amount <= 0) {
      return "Enter a dollar amount greater than zero.";
    }

    try {

      const data = await fetchToolJson(
        "https://open.er-api.com/v6/latest/USD"
      );

      const rate =
        Number(data?.rates?.INR);

      if (!Number.isFinite(rate)) {
        throw new Error("Rate unavailable");
      }

      return (
        amount +
        " US dollars is about " +
        Math.round(amount * rate) +
        " Indian rupees, Boss."
      );

    } catch (e) {

      return "Currency service error, Boss.";
    }
  }


  // ===== TOOL 14 — WORD MEANING =====

  if (t.includes("meaning")) {

    const match = text.match(
      /\bmeaning(?:\s+of)?\s+(.+)$/i
    );

    const word = match?.[1]
      ?.trim()
      .replace(/[?.!]+$/, "");

    if (!word) {
      return 'Meaning format: say "meaning of <word>".';
    }

    try {

      const data = await fetchToolJson(
        "https://api.dictionaryapi.dev/api/v2/entries/en/" +
        encodeURIComponent(word),
        {},
        7000
      );

      const definition =
        data?.[0]?.meanings?.[0]
          ?.definitions?.[0]?.definition;

      if (definition) {
        return (
          word +
          " means: " +
          definition
        );
      }

    } catch (e) {}

    return (
      "Could not retrieve the word meaning right now."
    );
  }


  // ===== TOOL 15 — BITCOIN / CRYPTO =====

  if (
    t.includes("bitcoin") ||
    t.includes("crypto")
  ) {

    try {

      const data = await fetchToolJson(
        "https://api.coingecko.com/api/v3/simple/price" +
        "?ids=bitcoin&vs_currencies=usd,inr"
      );

      const usd =
        Number(data?.bitcoin?.usd);

      const inr =
        Number(data?.bitcoin?.inr);

      if (
        !Number.isFinite(usd) ||
        !Number.isFinite(inr)
      ) {
        throw new Error("Crypto unavailable");
      }

      return (
        "Bitcoin is " +
        usd +
        " dollars, " +
        inr +
        " rupees, Boss."
      );

    } catch (e) {

      return "Crypto service error, Boss.";
    }
  }


  // No tool matched

  return null;
}


// ============================================================
// 6. GEMINI BRAIN
// ============================================================

async function callGemini(prompt) {

  if (!API_KEY) {
    throw new Error(
      "Gemini API key is missing. Reload the page and enter your key."
    );
  }

  const contents = MEMORY
    .slice(-12)
    .map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

  contents.push({
    role: "user",
    parts: [{ text: prompt }]
  });


  let lastError;

  for (const model of MODELS) {

    try {

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent?key=" +
        encodeURIComponent(API_KEY),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({

            systemInstruction: {
              parts: [{
                text:
                  "You are J.A.R.V.I.S, a friendly personal AI assistant. " +
                  "Reply naturally in Telugu-English mix when appropriate. " +
                  "Keep replies concise, conversational and easy to speak aloud. " +
                  "Do not repeatedly call the user Boss."
              }]
            },

            contents: contents

          })
        }
      );

      const data = await response.json();

      if (data.error) {

        lastError =
          new Error(
            data.error.message ||
            "Gemini request failed."
          );

        continue;
      }

      const reply =
        data?.candidates?.[0]?.content?.parts
          ?.map(part => part.text)
          .filter(Boolean)
          .join("\n");

      if (!reply) {
        throw new Error(
          "Gemini returned an empty response."
        );
      }

      return reply;

    } catch (e) {

      lastError = e;
    }
  }

  throw (
    lastError ||
    new Error("Gemini request failed.")
  );
}


// ============================================================
// 7. TOOL REPLY → TELUGU/ENGLISH
// ============================================================

function telugishToolReply(r) {

  if (r.startsWith("The time is ")) {
    return (
      "ఇప్పుడు టైమ్ " +
      r.slice(13).replace(", Boss.", "") +
      "."
    );
  }

  if (r.startsWith("It is ")) {
    const parts = r.split(" ");
    return "ఇప్పుడు " + parts[2] + "°C ఉంది.";
  }

  if (r.startsWith("Timer set for ")) {
    return (
      "సరే, " +
      r.slice(14).replace(/\.$/, "") +
      "కి timer పెట్టాను."
    );
  }

  if (r.startsWith("Timer format:")) {
    return (
      'Timer set చేయడానికి "timer 5 minutes" ' +
      "లాగా చెప్పు."
    );
  }

  if (r.startsWith("You rolled ")) {
    return (
      "డైస్‌లో " +
      r.split(" ")[2].replace(",", "") +
      " వచ్చింది!"
    );
  }

  if (r === "Heads, Boss.") {
    return "కాయిన్‌లో Heads వచ్చింది!";
  }

  if (r === "Tails, Boss.") {
    return "కాయిన్‌లో Tails వచ్చింది!";
  }

  if (r.startsWith("Wikipedia summary:")) {
    return (
      "Wikipediaలో సారాంశం: " +
      r.slice(19)
    );
  }

  if (r.startsWith("Top tech news:")) {
    return (
      "ఇవాళ్టి top tech headlines: " +
      r.slice(15)
    );
  }

  if (r.startsWith("In Telugu:")) {
    return "తెలుగులో: " + r.slice(11);
  }

  if (r.includes(" US dollars is about ")) {
    const parts =
      r.split(" US dollars is about ");

    return (
      "$" +
      parts[0] +
      " అంటే సుమారుగా ₹" +
      parts[1].split(" Indian rupees")[0] +
      " అవుతుంది."
    );
  }

  if (r.includes(" means: ")) {
    const parts = r.split(" means: ");

    return (
      parts[0] +
      " అంటే: " +
      parts.slice(1).join(" means: ")
    );
  }

  if (r.startsWith("Bitcoin is ")) {

    const parts =
      r.slice(11).split(" dollars, ");

    return (
      "Bitcoin ధర ఇప్పుడు $" +
      parts[0] +
      " (సుమారు ₹" +
      parts[1].split(" rupees")[0] +
      ")."
    );
  }

  if (r.startsWith("Opening YouTube")) {
    return "YouTube ఓపెన్ చేస్తున్నాను.";
  }

  if (r.startsWith("Opening Google")) {
    return "Google ఓపెన్ చేస్తున్నాను.";
  }

  if (r.startsWith("Searching Google for ")) {
    return (
      "Googleలో " +
      r.slice(21).replace(", Boss.", "") +
      " కోసం వెతుకుతున్నాను."
    );
  }

  if (r.startsWith("Searching YouTube for ")) {
    return (
      "YouTubeలో " +
      r.slice(22).replace(", Boss.", "") +
      " కోసం వెతుకుతున్నాను."
    );
  }

  if (r.startsWith("Could not retrieve")) {
    return (
      "ఈ పదానికి meaning ఇప్పుడే దొరకలేదు."
    );
  }

  if (r.startsWith("News service error")) {
    return "News service ఇప్పుడు పని చేయట్లేదు.";
  }

  if (r.startsWith("Translate error")) {
    return "Translation ఇప్పుడు దొరకట్లేదు.";
  }

  if (r.startsWith("Currency service error")) {
    return "Exchange rate ఇప్పుడు దొరకట్లేదు.";
  }

  if (r.startsWith("Crypto service error")) {
    return "Crypto price ఇప్పుడు దొరకట్లేదు.";
  }

  if (r.startsWith("Search error")) {
    return "Search service ఇప్పుడు పని చేయట్లేదు.";
  }

  if (r.endsWith(", Boss.")) {
    return r.slice(0, -7) + ".";
  }

  return r;
}


// ============================================================
// 8. MAIN ASK FUNCTION
// ============================================================

async function askGemini(prompt) {

  add(
    "J.A.R.V.I.S: Thinking...",
    "ai"
  );

  try {

    let toolReply =
      await handleTools(prompt);

    if (toolReply) {

      const finalReply =
        telugishToolReply(toolReply);

      MEMORY.push({
        role: "user",
        text: prompt
      });

      MEMORY.push({
        role: "model",
        text: finalReply
      });

      saveMemory();

      chat.lastChild.innerText =
        "J.A.R.V.I.S: " +
        finalReply;

      speak(finalReply);

      return;
    }


    // If no tool matched → Gemini

    const reply =
      await callGemini(prompt);

    MEMORY.push({
      role: "user",
      text: prompt
    });

    MEMORY.push({
      role: "model",
      text: reply
    });

    saveMemory();

    chat.lastChild.innerText =
      "J.A.R.V.I.S
