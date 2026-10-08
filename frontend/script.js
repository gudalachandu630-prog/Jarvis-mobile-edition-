// ============================================================
// J.A.R.V.I.S — EPISODE 7
// Full working version + Voice Input + Voice Output
// ============================================================

const MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest"
];

const MEMORY_KEY = "jarvis_memory";

// ============================================================
// ELEMENTS
// ============================================================

const chat = document.getElementById("chat");
const msg = document.getElementById("msg");

const sendBtn =
    document.getElementById("send-btn") ||
    document.getElementById("send") ||
    document.querySelector('button[type="submit"]');

const micBtn = document.getElementById("mic-btn");
const camBtn = document.getElementById("cam-btn");
const clearBtn = document.getElementById("clear-btn");
const imgInput = document.getElementById("img-input");

// ============================================================
// MEMORY
// ============================================================

function getMemory() {
    try {
        return JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]");
    } catch {
        return [];
    }
}

function saveMemory(role, text) {
    const memory = getMemory();

    memory.push({
        role: role,
        text: String(text),
        time: new Date().toISOString()
    });

    // Keep memory from becoming too large
    if (memory.length > 30) {
        memory.splice(0, memory.length - 30);
    }

    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}

function clearMemory() {
    localStorage.removeItem(MEMORY_KEY);

    if (chat) {
        chat.innerHTML = "";
    }

    addMessage("J.A.R.V.I.S", "Memory cleared.");
    speakJarvis("Memory cleared.");
}

// ============================================================
// CHAT DISPLAY
// ============================================================

function addMessage(sender, text) {
    if (!chat) return;

    const box = document.createElement("div");

    box.className =
        sender.toLowerCase().includes("user")
            ? "user-message"
            : "jarvis-message";

    box.textContent = `${sender}: ${text}`;

    chat.appendChild(box);
    chat.scrollTop = chat.scrollHeight;
}

// ============================================================
// J.A.R.V.I.S VOICE OUTPUT
// ============================================================

let jarvisVoice = null;

function loadJarvisVoice() {
    if (!("speechSynthesis" in window)) {
        console.log("Speech synthesis is not supported.");
        return;
    }

    const voices = window.speechSynthesis.getVoices();

    if (!voices.length) return;

    jarvisVoice =
        voices.find(v => /en-IN/i.test(v.lang)) ||
        voices.find(v => /en-US/i.test(v.lang)) ||
        voices.find(v => /^en/i.test(v.lang)) ||
        voices[0];

    console.log("J.A.R.V.I.S voice:", jarvisVoice.name);
}

if ("speechSynthesis" in window) {
    loadJarvisVoice();

    window.speechSynthesis.onvoiceschanged = () => {
        loadJarvisVoice();
    };
}

function speakJarvis(text) {
    if (!("speechSynthesis" in window)) {
        console.log("Speech synthesis not supported.");
        return;
    }

    if (!text) return;

    const cleanText = String(text)
        .replace(/^J\.A\.R\.V\.I\.S\s*:\s*/i, "")
        .replace(/\*/g, "")
        .replace(/```[\s\S]*?```/g, "")
        .trim();

    if (!cleanText) return;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(cleanText);

    if (jarvisVoice) {
        speech.voice = jarvisVoice;
        speech.lang = jarvisVoice.lang;
    } else {
        speech.lang = "en-IN";
    }

    // J.A.R.V.I.S-style voice
    speech.rate = 0.92;
    speech.pitch = 0.85;
    speech.volume = 1.0;

    window.speechSynthesis.speak(speech);
}

// ============================================================
// API KEY
// ============================================================

function getApiKey() {
    let key = localStorage.getItem("jarvis_key");

    if (!key) {
        key = prompt("Enter your Gemini API key:");

        if (key) {
            localStorage.setItem("jarvis_key", key.trim());
        }
    }

    return key;
}

// ============================================================
// OPEN / SEARCH TOOLS
// ============================================================

function openUrl(url) {
    window.open(url, "_blank");
}

function googleSearch(query) {
    openUrl(
        "https://www.google.com/search?q=" +
        encodeURIComponent(query)
    );
}

function youtubeSearch(query) {
    openUrl(
        "https://www.youtube.com/results?search_query=" +
        encodeURIComponent(query)
    );
}

function youtubePlay(query) {
    openUrl(
        "https://www.youtube.com/results?search_query=" +
        encodeURIComponent(query)
    );
}

function wikipediaSearch(query) {
    openUrl(
        "https://en.wikipedia.org/wiki/Special:Search?search=" +
        encodeURIComponent(query)
    );
}

// ============================================================
// BASIC TOOLS
// ============================================================

function getTime() {
    return new Date().toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit"
    });
}

function getDate() {
    return new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function rollDice() {
    return String(Math.floor(Math.random() * 6) + 1);
}

function flipCoin() {
    return Math.random() < 0.5 ? "Heads" : "Tails";
}

function tellJoke() {
    const jokes = [
        "Why did the computer go to the doctor? Because it had a virus.",
        "Why was the math book sad? Because it had too many problems.",
        "What do computers eat? Microchips."
    ];

    return jokes[Math.floor(Math.random() * jokes.length)];
}

function tellQuote() {
    const quotes = [
        "Stay curious and keep learning.",
        "Small steps every day create big results.",
        "The best way to learn is to keep trying."
    ];

    return quotes[Math.floor(Math.random() * quotes.length)];
}

// ============================================================
// TIMER
// ============================================================

function startTimer(seconds) {
    setTimeout(() => {
        addMessage("J.A.R.V.I.S", "Timer finished.");
        speakJarvis("Timer finished.");
    }, seconds * 1000);

    return `Timer started for ${seconds} seconds.`;
}

// ============================================================
// BITCOIN
// ============================================================

async function getBitcoinPrice() {
    try {
        const response = await fetch(
            "https://api.coindesk.com/v1/bpi/currentprice/USD.json"
        );

        const data = await response.json();

        return `Bitcoin price is approximately ${data.bpi.USD.rate} USD.`;
    } catch {
        return "I could not get the Bitcoin price right now.";
    }
}

// ============================================================
// TOOL PROCESSOR
// ============================================================

async function runTool(command) {
    const text = command.toLowerCase().trim();

    if (
        text.includes("open youtube") &&
        !text.includes("search")
    ) {
        openUrl("https://www.youtube.com/");
        return "Opening YouTube.";
    }

    if (
        text.includes("open google") &&
        !text.includes("search")
    ) {
        openUrl("https://www.google.com/");
        return "Opening Google.";
    }

    if (text.startsWith("google search ")) {
        const query = command.substring(14).trim();
        googleSearch(query);
        return `Searching Google for ${query}.`;
    }

    if (text.startsWith("search google for ")) {
        const query = command.substring(18).trim();
        googleSearch(query);
        return `Searching Google for ${query}.`;
    }

    if (text.startsWith("youtube search ")) {
        const query = command.substring(15).trim();
        youtubeSearch(query);
        return `Searching YouTube for ${query}.`;
    }

    if (text.includes("youtube") && text.includes("play")) {
        const query = command
            .replace(/youtube/i, "")
            .replace(/play/i, "")
            .trim();

        youtubePlay(query);

        return `Opening YouTube results for ${query}.`;
    }

    if (text.startsWith("wikipedia ")) {
        const query = command.substring(10).trim();
        wikipediaSearch(query);
        return `Opening Wikipedia for ${query}.`;
    }

    if (
        text.includes("what time") ||
        text === "time" ||
        text.includes("current time")
    ) {
        return `The current time is ${getTime()}.`;
    }

    if (
        text.includes("today's date") ||
        text.includes("what date") ||
        text === "date"
    ) {
        return `Today is ${getDate()}.`;
    }

    if (text.includes("roll dice") || text.includes("roll a dice")) {
        return `The dice shows ${rollDice()}.`;
    }

    if (
        text.includes("flip coin") ||
        text.includes("toss coin")
    ) {
        return `The result is ${flipCoin()}.`;
    }

    if (text.includes("tell me a joke") || text === "joke") {
        return tellJoke();
    }

    if (text.includes("give me a quote") || text === "quote") {
        return tellQuote();
    }

    if (text.includes("bitcoin")) {
        return await getBitcoinPrice();
    }

    // Timer example:
    // "timer 10"
    const timerMatch = text.match(/timer\s+(\d+)/);

    if (timerMatch) {
        const seconds = Number(timerMatch[1]);

        if (seconds > 0 && seconds <= 3600) {
            return startTimer(seconds);
        }
    }

    return null;
}

// ============================================================
// GEMINI API
// ============================================================

async function callGeminiRaw(prompt, model) {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error("Gemini API key is missing.");
    }

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ]
        })
    });

    if (!response.ok) {
        throw new Error(
            `Gemini API error: ${response.status}`
        );
    }

    const data = await response.json();

    return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I could not generate a response."
    );
}

// ============================================================
// GEMINI WITH MODEL FALLBACK
// ============================================================

async function callGemini(prompt) {
    let lastError = null;

    for (const model of MODELS) {
        try {
            return await callGeminiRaw(prompt, model);
        } catch (error) {
            console.log(`Model failed: ${model}`, error);
            lastError = error;
        }
    }

    throw lastError || new Error("All Gemini models failed.");
}

// ============================================================
// AGENT MODE
// ============================================================

async function agentMode(command) {
    const lower = command.toLowerCase();

    if (
        lower.includes("time") ||
        lower.includes("date")
    ) {
        return `The current time is ${getTime()} and today is ${getDate()}.`;
    }

    if (
        lower.includes("search") ||
        lower.includes("google")
    ) {
        googleSearch(command);
        return "I opened Google search for your request.";
    }

    if (lower.includes("youtube")) {
        youtubeSearch(command);
        return "I opened YouTube search for your request.";
    }

    return null;
}

// ============================================================
// MAIN MESSAGE PROCESSOR
// ============================================================

async function processMessage(command) {
    command = String(command || "").trim();

    if (!command) return;

    addMessage("USER", command);
    saveMemory("user", command);

    // Stop speaking if user starts a new command
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    // --------------------------------------------------------
    // Normal tools
    // --------------------------------------------------------

    try {
        const toolResult = await runTool(command);

        if (toolResult) {
            addMessage("J.A.R.V.I.S", toolResult);
            saveMemory("assistant", toolResult);

            // MAKE J.A.R.V.I.S TALK
            speakJarvis(toolResult);

            return;
        }
    } catch (error) {
        console.error(error);
    }

    // --------------------------------------------------------
    // Agent mode
    // --------------------------------------------------------

    try {
        const agentResult = await agentMode(command);

        if (agentResult) {
            addMessage("J.A.R.V.I.S", agentResult);
            saveMemory("assistant", agentResult);

            // MAKE J.A.R.V.I.S TALK
            speakJarvis(agentResult);

            return;
        }
    } catch (error) {
        console.error(error);
    }

    // --------------------------------------------------------
    // Gemini
    // --------------------------------------------------------

    try {
        const memory = getMemory()
            .slice(-10)
            .map(item => `${item.role}: ${item.text}`)
            .join("\n");

        const prompt = `
You are J.A.R.V.I.S, a helpful personal AI assistant.

Answer naturally and clearly.
Keep normal answers reasonably short because your answer will be spoken aloud.

Previous conversation:
${memory}

Current user command:
${command}

Respond directly to the user.
        `;

        const answer = await callGemini(prompt);

        addMessage("J.A.R.V.I.S", answer);
        saveMemory("assistant", answer);

        // MAKE J.A.R.V.I.S TALK
        speakJarvis(answer);

    } catch (error) {
        console.error(error);

        const errorMessage =
            "I am having trouble connecting to my AI system right now.";

        addMessage("J.A.R.V.I.S", errorMessage);
        speakJarvis(errorMessage);
    }
}

// ============================================================
// SEND BUTTON
// ============================================================

if (sendBtn) {
    sendBtn.addEventListener("click", () => {
        const command = msg?.value.trim();

        if (!command) return;

        msg.value = "";
        processMessage(command);
    });
}

// ============================================================
// ENTER KEY
// ============================================================

if (msg) {
    msg.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();

            const command = msg.value.trim();

            if (!command) return;

            msg.value = "";
            processMessage(command);
        }
    });
}

// ============================================================
// CLEAR MEMORY BUTTON
// ============================================================

if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        clearMemory();
    });
}

// ============================================================
// CAMERA BUTTON
// ============================================================

if (camBtn && imgInput) {
    camBtn.addEventListener("click", () => {
        imgInput.click();
    });

    imgInput.addEventListener("change", () => {
        const file = imgInput.files?.[0];

        if (!file) return;

        addMessage(
            "J.A.R.V.I.S",
            `Image selected: ${file.name}`
        );

        speakJarvis("Image selected.");
    });
}

// ============================================================
// VOICE INPUT — MICROPHONE
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition && micBtn) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    micBtn.addEventListener("click", () => {

        try {
            recognition.start();
            micBtn.textContent = "🔴";
        } catch (error) {
            console.log("Microphone already active.");
        }

    });

    recognition.onresult = event => {

        const transcript =
            event.results[0][0].transcript;

        if (msg) {
            msg.value = transcript;
        }

        micBtn.textContent = "🎤";

        processMessage(transcript);
    };

    recognition.onerror = event => {

        console.log(
            "Speech recognition error:",
            event.error
        );

        micBtn.textContent = "🎤";
    };

    recognition.onend = () => {
        micBtn.textContent = "🎤";
    };

} else {
    console.log(
        "Speech recognition is not supported in this browser."
    );
}

// ============================================================
// STARTUP
// ============================================================

console.log("================================");
console.log("J.A.R.V.I.S Episode 7 loaded.");
console.log("Voice input: READY");
console.log(
    "Voice output:",
    "speechSynthesis" in window ? "READY" : "NOT SUPPORTED"
);
console.log("Tools: READY");
console.log("Memory: READY");
console.log("================================");
