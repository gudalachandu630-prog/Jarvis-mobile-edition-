// ===== 1. API KEY =====
let API_KEY = localStorage.getItem('jarvis_key');

if (!API_KEY) {
    API_KEY = prompt('Enter your Gemini API Key:');

    if (API_KEY) {
        localStorage.setItem('jarvis_key', API_KEY);
    }
}

// ===== 2. GEMINI MODELS =====
const MODELS = [
    "gemini-3.6-flash",
    "gemini-flash-latest"
];

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');

// ===== 3. GEMINI BRAIN =====
async function callGemini(promptText) {
    let lastErr;

    for (const model of MODELS) {
        try {
            const response = await fetch(
                "https://generativelanguage.googleapis.com/v1beta/models/"
                + model
                + ":generateContent?key="
                + API_KEY,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: promptText
                                    }
                                ]
                            }
                        ]
                    })
                }
            );

            const data = await response.json();

            if (data.error) {
                lastErr = new Error(data.error.message);

                if (
                    /high demand|temporar|quota|rate|unavailable|no longer available|deprecated/i
                    .test(data.error.message)
                ) {
                    continue;
                }

                throw lastErr;
            }

            if (
                !data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content ||
                !data.candidates[0].content.parts
            ) {
                throw new Error("Invalid response from Gemini.");
            }

            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            lastErr = error;
        }
    }

    throw lastErr || new Error("Gemini request failed.");
}

// ===== 4. ASK GEMINI =====
async function askGemini(promptText) {
    add("J.A.R.V.I.S: Thinking...", "ai");

    try {
        const reply = await callGemini(promptText);

        chat.lastChild.innerText =
            "J.A.R.V.I.S: " + reply;

        // Speak the reply
        speak(reply);

    } catch (error) {
        chat.lastChild.innerText =
            "J.A.R.V.I.S: ERROR - " + error.message;
    }
}

// ===== 5. SPEECH RECOGNITION =====
const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let rec = null;

if (SpeechRecognition) {

    rec = new SpeechRecognition();

    // English
    rec.lang = "en-US";

    // For Telugu use:
    // rec.lang = "te-IN";

    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = function (event) {

        const text =
            event.results[0][0].transcript;

        add("YOU: " + text, "user");

        askGemini(text);
    };

    rec.onstart = function () {

        if (micBtn) {
            micBtn.innerText = "LISTENING...";
        }
    };

    rec.onend = function () {

        if (micBtn) {
            micBtn.innerText = "🎤";
        }
    };

    rec.onerror = function (event) {

        if (micBtn) {
            micBtn.innerText = "🎤";
        }

        add(
            "J.A.R.V.I.S: Microphone error - "
            + event.error,
            "ai"
        );
    };

    if (micBtn) {

        micBtn.onclick = function () {

            try {
                rec.start();
            } catch (error) {
                console.log(error);
            }

        };
    }

} else {

    if (micBtn) {

        micBtn.onclick = function () {

            add(
                "J.A.R.V.I.S: Speech Recognition is not supported in this browser.",
                "ai"
            );

        };
    }
}

// ===== 6. TEXT-TO-SPEECH =====
let voices = [];

function loadVoices() {
    voices = speechSynthesis.getVoices();
}

loadVoices();

speechSynthesis.onvoiceschanged = loadVoices;

function speak(text) {

    if (!("speechSynthesis" in window)) {
        return;
    }

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.rate = 1.05;
    utterance.pitch = 0.85;

    const voice =
        voices.find(v =>
            v.lang.toLowerCase().startsWith("en")
        );

    if (voice) {
        utterance.voice = voice;
    }

    speechSynthesis.speak(utterance);
}

// ===== 7. SEND BUTTON =====
const sendBtn =
    document.getElementById('send');

if (sendBtn) {

    sendBtn.onclick = function () {

        const text = input.value.trim();

        if (!text) {
            return;
        }

        add("YOU: " + text, "user");

        input.value = "";

        askGemini(text);
    };
}

// ===== 8. ENTER KEY =====
if (input) {

    input.addEventListener("keydown", function (event) {

        if (event.key === "Enter") {

            event.preventDefault();

            if (sendBtn) {
                sendBtn.click();
            }
        }
    });
}

// ===== 9. ADD MESSAGE =====
function add(text, type) {

    const div =
        document.createElement("div");

    div.className =
        "msg " + type;

    div.innerText = text;

    chat.appendChild(div);

    chat.scrollTop =
        chat.scrollHeight;
            }
