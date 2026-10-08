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


// ===== 2. MEMORY =====
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
        JSON.stringify(MEMORY.slice(-30))
    );
}


// ===== 3. HTML ELEMENTS =====
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");


// ===== 4. CHAT DISPLAY =====
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


// ===== 5. RESTORE MEMORY =====
MEMORY.forEach(m => {

    add(
        m.role === "user"
            ? "YOU: " + m.text
            : "J.A.R.V.I.S: " + m.text,
        m.role === "user"
            ? "user"
            : "ai"
    );

});


// ===== 6. SPEAK =====
function speak(text) {

    if (!("speechSynthesis" in window)) {
        return;
    }

    window.speechSynthesis.cancel();

    const clean = String(text)
        .replace(/[*#_`]/g, "")
        .replace(/\n+/g, " ");

    const voice = new SpeechSynthesisUtterance(clean);

    voice.rate = 1;
    voice.pitch = 1;
    voice.volume = 1;

    window.speechSynthesis.speak(voice);
}


// ===== 7. FETCH HELPER =====
async function fetchToolJson(
    url,
    options = {},
    timeoutMs = 10000
) {

    const controller =
        typeof AbortController === "function"
            ? new AbortController()
            : null;

    const timer = controller
        ? setTimeout(
              () => controller.abort(),
              timeoutMs
          )
        : null;

    try {

        const response = await fetch(url, {
            ...options,
            ...(controller
                ? { signal: controller.signal }
                : {})
        });

        if (!response.ok) {
            throw new Error(
                "HTTP " + response.status
            );
        }

        return await response.json();

    } finally {

        if (timer) {
            clearTimeout(timer);
        }
    }
}


// ===== 8. TOOLS =====
async function handleTools(text) {

    text = String(text || "").trim();

    // OPEN YOUTUBE
    if (
        /^open\s+youtube[.!?]*$/i.test(text) ||
        /^youtube[.!?]*$/i.test(text)
    ) {

        window.open(
            "https://youtube.com",
            "_blank"
        );

        return "Opening YouTube, Boss.";
    }


    // OPEN GOOGLE
    if (
        /^open\s+google[.!?]*$/i.test(text) ||
        /^google[.!?]*$/i.test(text)
    ) {

        window.open(
            "https://google.com",
            "_blank"
        );

        return "Opening Google, Boss.";
    }


    // GOOGLE SEARCH
    const google = text.match(
        /^(?:google\s+search|search\s+google|search\s+on\s+google)(?:\s+for)?\s+(.+)$/i
    );

    if (google) {

        const query = google[1].trim();

        window.open(
            "https://www.google.com/search?q=" +
            encodeURIComponent(query),
            "_blank"
        );

        return "Searching Google for " +
            query +
            ", Boss.";
    }


    // YOUTUBE SEARCH / PLAY
    const youtube = text.match(
        /^(?:play|youtube\s+search|search\s+youtube|search\s+on\s+youtube)(?:\s+for)?\s+(.+)$/i
    );

    if (youtube) {

        const query = youtube[1].trim();

        window.open(
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(query),
            "_blank"
        );

        return "Searching YouTube for " +
            query +
            ", Boss.";
    }


    // OPEN URL
    const urlMatch = text.match(
        /^(?:open|visit|go\s+to)\s+(https?:\/\/\S+)$/i
    );

    if (urlMatch) {

        window.open(
            urlMatch[1],
            "_blank"
        );

        return "Opening the website, Boss.";
    }


    // WIKIPEDIA SEARCH
    const wiki = text.match(
        /^(?:search|look\s+up)\s+(.+)$/i
    );

    if (wiki) {

        const query = wiki[1].trim();

        try {

            const url =
                "https://en.wikipedia.org/w/api.php?" +
                "action=query" +
                "&list=search" +
                "&srlimit=1" +
                "&srsearch=" +
                encodeURIComponent(query) +
                "&format=json" +
                "&origin=*";

            const data =
                await fetchToolJson(url);

            const result =
                data?.query?.search?.[0];

            if (!result) {
                return "I could not find that, Boss.";
            }

            const snippet =
                String(result.snippet || "")
                    .replace(/<[^>]*>/g, "")
                    .replace(/&#39;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, "&");

            return (
                "Wikipedia: " +
                result.title +
                (snippet
                    ? ". " + snippet
                    : "")
            );

        } catch (e) {

            return "Search error, Boss.";
        }
    }


    return null;
}


// ===== 9. GEMINI RAW =====
async function callGeminiRaw(prompt) {

    if (!API_KEY) {
        throw new Error(
            "Gemini API key is missing."
        );
    }

    const contents = [
        {
            role: "user",
            parts: [
                {
                    text: prompt
                }
            ]
        }
    ];

    for (const model of MODELS) {

        try {

            const response = await fetch(
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                model +
                ":generateContent?key=" +
                encodeURIComponent(API_KEY),
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        contents
                    })
                }
            );

            if (!response.ok) {
                continue;
            }

            const data =
                await response.json();

            const answer =
                data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (answer) {
                return answer;
            }

        } catch (e) {
            console.error(e);
        }
    }

    throw new Error(
        "All Gemini models failed."
    );
}


// ===== 10. GEMINI NORMAL =====
async function callGemini(prompt) {

    const history = MEMORY
        .slice(-12)
        .map(m => ({
            role: m.role,
            parts: [
                {
                    text: m.text
                }
            ]
        }));

    history.push({
        role: "user",
        parts: [
            {
                text: prompt
            }
        ]
    });

    if (!API_KEY) {
        throw new Error(
            "Gemini API key is missing."
        );
    }

    for (const model of MODELS) {

        try {

            const response = await fetch(
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                model +
                ":generateContent?key=" +
                encodeURIComponent(API_KEY),
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        contents: history,
                        systemInstruction: {
                            parts: [
                                {
                                    text:
                                        "You are J.A.R.V.I.S. Reply concisely and helpfully. You may use Telugu and English naturally."
                                }
                            ]
                        }
                    })
                }
            );

            if (!response.ok) {
                continue;
            }

            const data =
                await response.json();

            const answer =
                data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (answer) {
                return answer.trim();
            }

        } catch (e) {

            console.error(
                "Gemini error:",
                e
            );
        }
    }

    throw new Error(
        "Gemini connection failed."
    );
}


// ===== 11. SEND / EXECUTE =====
if (sendBtn) {

    sendBtn.addEventListener(
        "click",
        async () => {

            const text =
                input?.value.trim();

            if (!text) {
                return;
            }

            add(
                "YOU: " + text,
                "user"
            );

            input.value = "";

            MEMORY.push({
                role: "user",
                text: text
            });

            saveMemory();


            // TOOL
            try {

                const toolResult =
                    await handleTools(text);

                if (toolResult) {

                    add(
                        "J.A.R.V.I.S: " +
                        toolResult,
                        "ai"
                    );

                    MEMORY.push({
                        role: "model",
                        text: toolResult
                    });

                    saveMemory();

                    speak(toolResult);

                    return;
                }

            } catch (e) {

                console.error(
                    "Tool error:",
                    e
                );
            }


            // GEMINI
            try {

                const answer =
                    await callGemini(text);

                add(
                    "J.A.R.V.I.S: " +
                    answer,
                    "ai"
                );

                MEMORY.push({
                    role: "model",
                    text: answer
                });

                saveMemory();

                speak(answer);

            } catch (error) {

                console.error(error);

                const msg =
                    "Sorry Boss, Gemini connection failed.";

                add(
                    "J.A.R.V.I.S: " + msg,
                    "ai"
                );

                speak(msg);
            }

        }
    );
}


// ===== 12. ENTER KEY =====
if (input) {

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                if (sendBtn) {
                    sendBtn.click();
                }
            }
        }
    );
}


// ===== 13. CLEAR MEMORY =====
if (clearBtn) {

    clearBtn.addEventListener(
        "click",
        () => {

            MEMORY = [];

            localStorage.removeItem(
                "jarvis_memory"
            );

            if (chat) {
                chat.innerHTML = "";
            }

            speak(
                "Memory cleared, Boss."
            );
        }
    );
}


// ===== 14. VOICE INPUT =====
if (
    micBtn &&
    "SpeechRecognition" in window ||
    "webkitSpeechRecognition" in window
) {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    const recognition =
        new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    micBtn.addEventListener(
        "click",
        () => {

            try {
                recognition.start();
            } catch (e) {}
        }
    );

    recognition.onresult = event => {

        const transcript =
            event.results[0][0].transcript;

        if (input) {
            input.value = transcript;
        }

        if (sendBtn) {
            sendBtn.click();
        }
    };
}


// ===== 15. CAMERA / IMAGE =====
if (camBtn && imgInput) {

    camBtn.addEventListener(
        "click",
        () => {
            imgInput.click();
        }
    );

    imgInput.addEventListener(
        "change",
        async () => {

            const file =
                imgInput.files?.[0];

            if (!file) {
                return;
            }

            add(
                "YOU: Image selected.",
                "user"
            );

            add(
                "J.A.R.V.I.S: Image received. Image analysis needs to be connected to the Gemini vision request.",
                "ai"
            );

            speak(
                "Image received, Boss."
            );

            imgInput.value = "";
        }
    );
}

console.log(
    "J.A.R.V.I.S system loaded successfully."
);
