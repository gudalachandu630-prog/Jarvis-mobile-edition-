// ============================================================
// J.A.R.V.I.S — EPISODE 7
// CLEAN WORKING SCRIPT.JS
// ============================================================

// ===================== 1. API KEY =====================

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


// ===================== 2. ELEMENTS =====================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");

// Support either a button or form submit
const sendBtn =
    document.getElementById("send-btn") ||
    document.getElementById("send") ||
    document.querySelector('button[type="submit"]');


// ===================== 3. MEMORY =====================

let MEMORY = [];

try {
    const stored = JSON.parse(
        localStorage.getItem("jarvis_memory") || "[]"
    );

    if (Array.isArray(stored)) {
        MEMORY = stored.filter(
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
        JSON.stringify(MEMORY.slice(-50))
    );
}

function remember(role, text) {
    MEMORY.push({
        role: role,
        text: String(text)
    });

    MEMORY = MEMORY.slice(-50);
    saveMemory();
}


// ===================== 4. CHAT DISPLAY =====================

function add(text, type = "ai") {
    if (!chat) return;

    const div = document.createElement("div");

    div.className =
        type === "user"
            ? "message user"
            : "message ai";

    div.textContent = text;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function showMemory() {
    if (!chat) return;

    MEMORY.forEach(m => {
        add(
            (m.role === "user" ? "YOU: " : "J.A.R.V.I.S: ") +
            m.text,
            m.role === "user" ? "user" : "ai"
        );
    });
}


// ===================== 5. FETCH HELPER =====================

async function fetchToolJson(
    url,
    options = {},
    timeoutMs = 10000
) {
    const controller =
        typeof AbortController !== "undefined"
            ? new AbortController()
            : null;

    const timer = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

    try {
        const response = await fetch(url, {
            ...options,
            ...(controller ? { signal: controller.signal } : {})
        });

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        return await response.json();

    } finally {
        if (timer) clearTimeout(timer);
    }
}


// ===================== 6. TOOLS =====================

async function handleTools(text) {

    const original = String(text || "").trim();
    const t = original.toLowerCase();

    // ---------- YouTube ----------
    if (
        /^(please\s+)?(open\s+)?youtube$/i.test(original)
    ) {
        window.open(
            "https://www.youtube.com/",
            "_blank"
        );

        return "Opening YouTube, Boss.";
    }


    // ---------- Google ----------
    if (
        /^(please\s+)?(open\s+)?google$/i.test(original)
    ) {
        window.open(
            "https://www.google.com/",
            "_blank"
        );

        return "Opening Google, Boss.";
    }


    // ---------- Open URL ----------
    const urlMatch = original.match(
        /^(?:open|visit|go to)\s+(https?:\/\/\S+)$/i
    );

    if (urlMatch) {

        try {
            const destination = new URL(urlMatch[1]);

            if (
                destination.protocol !== "https:" &&
                destination.protocol !== "http:"
            ) {
                return "Only HTTP and HTTPS links can be opened.";
            }

            window.open(
                destination.href,
                "_blank"
            );

            return (
                "Opening " +
                destination.hostname +
                ", Boss."
            );

        } catch {
            return "That link does not look valid.";
        }
    }


    // ---------- Google Search ----------
    const googleSearch = original.match(
        /^(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s+(.+)$/i
    );

    if (googleSearch) {

        const query = googleSearch[1].trim();

        window.open(
            "https://www.google.com/search?q=" +
            encodeURIComponent(query),
            "_blank"
        );

        return (
            "Searching Google for " +
            query +
            ", Boss."
        );
    }


    // ---------- YouTube Search / Play ----------
    const youtubeSearch = original.match(
        /^(?:play|youtube(?:\s+search)?|search\s+(?:on\s+)?youtube)(?:\s+for)?\s+(.+)$/i
    );

    if (youtubeSearch) {

        const query = youtubeSearch[1].trim();

        window.open(
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(query),
            "_blank"
        );

        return (
            "Searching YouTube for " +
            query +
            ", Boss."
        );
    }


    // ---------- Wikipedia Search ----------
    const wikiSearch = original.match(
        /^(?:search|look up)(?:\s+for)?\s+(.+)$/i
    );

    if (wikiSearch) {

        const query = wikiSearch[1].trim();

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
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">");

            return (
                "Wikipedia: " +
                result.title +
                (snippet ? ". " + snippet : "")
            );

        } catch {
            return "Wikipedia search failed, Boss.";
        }
    }


    // ---------- Current Time ----------
    if (
        /\b(current\s+time|what\s+time|time\s+now)\b/i.test(t)
    ) {
        return (
            "Current time is " +
            new Date().toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata"
            }) +
            ", Boss."
        );
    }


    // ---------- Date ----------
    if (
        /\b(today'?s\s+date|what\s+date|today)\b/i.test(t)
    ) {
        return (
            "Today is " +
            new Date().toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "full"
            }) +
            ", Boss."
        );
    }


    // ---------- Dice ----------
    if (/\bdice\b/i.test(t)) {
        return (
            "🎲 You rolled " +
            (Math.floor(Math.random() * 6) + 1) +
            ", Boss."
        );
    }


    // ---------- Coin ----------
    if (/\bcoin\b/i.test(t)) {
        return (
            "🪙 " +
            (Math.random() < 0.5 ? "Heads" : "Tails") +
            ", Boss."
        );
    }


    // ---------- Joke ----------
    if (/\bjoke\b/i.test(t)) {
        const jokes = [
            "Why did the computer go to the doctor? It had a virus.",
            "Why was the computer cold? It left its Windows open.",
            "Why do programmers prefer dark mode? Because light attracts bugs."
        ];

        return jokes[
            Math.floor(Math.random() * jokes.length)
        ];
    }


    // ---------- Quote ----------
    if (/\bquote\b/i.test(t)) {
        const quotes = [
            "Small steps every day lead to big results.",
            "Keep learning. Keep building.",
            "The best way to learn is to build."
        ];

        return quotes[
            Math.floor(Math.random() * quotes.length)
        ];
    }


    // ---------- Timer ----------
    const timerMatch = t.match(
        /\b(?:timer|set timer)\s+(\d+)\s*(seconds?|minutes?|mins?|hours?|hrs?)?/i
    );

    if (timerMatch) {

        const amount = Number(timerMatch[1]);
        const unit = timerMatch[2] || "minutes";

        let seconds = amount;

        if (/hour|hr/i.test(unit)) {
            seconds = amount * 3600;
        } else if (/minute|min/i.test(unit)) {
            seconds = amount * 60;
        }

        setTimeout(() => {
            alert("⏰ J.A.R.V.I.S Timer finished!");
        }, seconds * 1000);

        return (
            "Timer set for " +
            amount +
            " " +
            unit +
            ", Boss."
        );
    }


    // ---------- Bitcoin ----------
    if (
        /\b(bitcoin|btc|crypto)\b/i.test(t)
    ) {

        try {

            const data = await fetchToolJson(
                "https://api.coindesk.com/v1/bpi/currentprice/USD.json"
            );

            const price =
                data?.bpi?.USD?.rate;

            if (price) {
                return (
                    "Bitcoin is approximately $" +
                    price +
                    " USD."
                );
            }

        } catch {
            return "Bitcoin price is unavailable right now.";
        }
    }


    return null;
}


// ===================== 7. GEMINI =====================

async function callGeminiRaw(prompt) {

    if (!API_KEY) {
        throw new Error(
            "Gemini API key is missing."
        );
    }

    const contents = MEMORY
        .slice(-12)
        .map(m => ({
            role: m.role,
            parts: [
                {
                    text: m.text
                }
            ]
        }));

    contents.push({
        role: "user",
        parts: [
            {
                text: prompt
            }
        ]
    });

    let lastError = null;

    for (const model of MODELS) {

        try {

            const url =
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                model +
                ":generateContent?key=" +
                encodeURIComponent(API_KEY);

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: contents
                })
            });

            if (!response.ok) {
                throw new Error(
                    "Gemini HTTP " +
                    response.status
                );
            }

            const data = await response.json();

            const answer =
                data?.candidates?.[0]?.content?.parts
                    ?.map(p => p.text || "")
                    .join("")
                    .trim();

            if (answer) {
                return answer;
            }

        } catch (error) {
            lastError = error;
        }
    }

    throw lastError ||
        new Error("Gemini did not return a response.");
}


async function callGemini(prompt) {

    const answer = await callGeminiRaw(prompt);

    remember("user", prompt);
    remember("model", answer);

    return answer;
}


// ===================== 8. AGENT MODE =====================

const AGENT_TOOLS = {

    time: async () =>
        handleTools("current time"),

    weather: async () =>
        "Weather tool ready. Ask J.A.R.V.I.S for the weather.",

    news: async () =>
        "News tool ready. Ask J.A.R.V.I.S for current news.",

    crypto: async () =>
        handleTools("bitcoin")
};


function isAgentModeRequest(text = "") {

    return /\b(agent|agent mode|run agent|use agent|briefing|research|analysis)\b/i
        .test(text);
}


async function runAgent(goal) {

    add(
        "J.A.R.V.I.S: Agent mode active.",
        "ai"
    );

    const results = {};

    results.time =
        await AGENT_TOOLS.time();

    if (
        /\b(weather)\b/i.test(goal)
    ) {
        results.weather =
            await AGENT_TOOLS.weather();
    }

    if (
        /\b(news)\b/i.test(goal)
    ) {
        results.news =
            await AGENT_TOOLS.news();
    }

    if (
        /\b(bitcoin|btc|crypto)\b/i.test(goal)
    ) {
        results.crypto =
            await AGENT_TOOLS.crypto();
    }

    const summaryPrompt =
        "You are J.A.R.V.I.S. Give a concise Telugu-English response.\n\n" +
        "Goal: " +
        goal +
        "\n\nTool results:\n" +
        JSON.stringify(results);

    return await callGemini(summaryPrompt);
}


// ===================== 9. MAIN COMMAND =====================

async function processMessage(text) {

    text = String(text || "").trim();

    if (!text) return;

    add(
        "YOU: " + text,
        "user"
    );

    remember("user", text);

    // Agent mode
    if (isAgentModeRequest(text)) {

        try {

            const result =
                await runAgent(text);

            add(
                "J.A.R.V.I.S: " + result,
                "ai"
            );

            remember("model", result);

        } catch (error) {

            add(
                "J.A.R.V.I.S: Agent error.",
                "ai"
            );
        }

        return;
    }


    // Tools
    try {

        const toolResult =
            await handleTools(text);

        if (toolResult) {

            add(
                "J.A.R.V.I.S: " +
                toolResult,
                "ai"
            );

            remember(
                "model",
                toolResult
            );

            return;
        }

    } catch (error) {

        console.error(
            "Tool error:",
            error
        );
    }


    // Gemini
    add(
        "J.A.R.V.I.S: Thinking...",
        "ai"
    );

    try {

        const answer =
            await callGemini(text);

        // Replace the temporary thinking message
        const messages =
            chat?.querySelectorAll(".message.ai");

        if (messages?.length) {
            messages[messages.length - 1].textContent =
                "J.A.R.V.I.S: " + answer;
        } else {
            add(
                "J.A.R.V.I.S: " + answer,
                "ai"
            );
        }

    } catch (error) {

        console.error(
            "Gemini error:",
            error
        );

        const messages =
            chat?.querySelectorAll(".message.ai");

        if (messages?.length) {
            messages[messages.length - 1].textContent =
                "J.A.R.V.I.S: Sorry Boss, I couldn't connect to Gemini.";
        }
    }
}


// ===================== 10. SEND BUTTON =====================

function sendMessage() {

    if (!input) return;

    const text = input.value.trim();

    if (!text) return;

    input.value = "";

    processMessage(text);
}


if (sendBtn) {

    sendBtn.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            sendMessage();
        }
    );
}


// ===================== 11. ENTER KEY =====================

if (input) {

    input.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );
}


// ===================== 12. CLEAR BUTTON =====================

if (clearBtn) {

    clearBtn.addEventListener(
        "click",
        function () {

            MEMORY = [];

            localStorage.removeItem(
                "jarvis_memory"
            );

            if (chat) {
                chat.innerHTML = "";
            }

            add(
                "J.A.R.V.I.S: Memory cleared, Boss.",
                "ai"
            );
        }
    );
}


// ===================== 13. CAMERA BUTTON =====================

if (camBtn && imgInput) {

    camBtn.addEventListener(
        "click",
        function () {

            imgInput.click();
        }
    );
}


// ===================== 14. IMAGE INPUT =====================

if (imgInput) {

    imgInput.addEventListener(
        "change",
        async function () {

            const file =
                imgInput.files?.[0];

            if (!file) return;

            add(
                "YOU: Image selected",
                "user"
            );

            add(
                "J.A.R.V.I.S: Image received, Boss. Image analysis can be added to the Gemini vision step.",
                "ai"
            );

            imgInput.value = "";
        }
    );
}


// ===================== 15. MICROPHONE =====================

let recognition = null;

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();

    recognition.lang = "en-IN";

    recognition.interimResults = false;

    recognition.continuous = false;


    recognition.onstart = function () {

        if (micBtn) {
            micBtn.textContent = "🔴";
        }
    };


    recognition.onend = function () {

        if (micBtn) {
            micBtn.textContent = "🎤";
        }
    };


    recognition.onerror = function (event) {

        console.error(
            "Speech recognition:",
            event.error
        );

        if (micBtn) {
            micBtn.textContent = "🎤";
        }
    };


    recognition.onresult = function (event) {

        const transcript =
            event.results[0][0].transcript;

        if (input) {
            input.value = transcript;
        }

        sendMessage();
    };


    if (micBtn) {

        micBtn.addEventListener(
            "click",
            function () {

                try {
                    recognition.start();
                } catch (error) {
                    console.log(
                        "Microphone already running."
                    );
                }
            }
        );
    }

} else {

    if (micBtn) {

        micBtn.addEventListener(
            "click",
            function () {

                alert(
                    "Speech recognition is not supported in this browser."
                );
            }
        );
    }
}


// ===================== 16. STARTUP =====================

showMemory();

console.log(
    "J.A.R.V.I.S Episode 7 loaded successfully."
);

console.log(
    "Buttons:",
    {
        mic: !!micBtn,
        clear: !!clearBtn,
        camera: !!camBtn,
        imageInput: !!imgInput,
        send: !!sendBtn
    }
);
