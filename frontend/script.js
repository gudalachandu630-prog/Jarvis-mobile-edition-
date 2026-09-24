// =====================================================
// J.A.R.V.I.S MOBILE EDITION — EPISODE 05
// MEMORY + VISION + VOICE + GEMINI
// =====================================================
async function askGemini(promptText) {

    // ==========================================
    // EPISODE 06 TOOL ROUTER
    // ==========================================

    const toolReply =
        await handleTools(promptText);


    if (toolReply) {

        MEMORY.push({
            role: "user",
            text: promptText
        });


        MEMORY.push({
            role: "model",
            text: toolReply
        });


        saveMemory();


        add(
            "J.A.R.V.I.S: " + toolReply,
            "ai"
        );


        speak(toolReply);


        return;
    }


    // ==========================================
    // NORMAL EPISODE 05 GEMINI BRAIN
    // ==========================================

    add(
        "J.A.R.V.I.S: Thinking...",
        "ai"
    );

    // KEEP THE REST OF YOUR CURRENT askGemini()
    // CODE BELOW THIS LINE

// =====================================================
// 1. API KEY
// =====================================================

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        localStorage.setItem("jarvis_key", API_KEY);
    }
}


// =====================================================
// 2. MODELS
// =====================================================

const MODELS = [
    "gemini-3.6-flash",
    "gemini-flash-latest"
];


// =====================================================
// 3. MEMORY
// =====================================================

let MEMORY = JSON.parse(
    localStorage.getItem("jarvis_memory") || "[]"
);

function saveMemory() {
    localStorage.setItem(
        "jarvis_memory",
        JSON.stringify(MEMORY)
    );
}


// =====================================================
// 4. CONNECT HTML ELEMENTS
// =====================================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");

const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");

const imgInput = document.getElementById("img-input");
const sendBtn = document.getElementById("send");


// =====================================================
// 5. SHOW OLD MEMORY
// =====================================================

MEMORY.forEach(function (m) {

    add(
        (m.role === "user"
            ? "YOU: "
            : "J.A.R.V.I.S: ") + m.text,

        m.role === "user"
            ? "user"
            : "ai"
    );

});


// =====================================================
// 6. GEMINI BRAIN
// =====================================================

async function callGemini(promptText) {

    const contents = MEMORY
        .slice(-12)
        .map(function (m) {

            return {
                role: m.role,
                parts: [
                    {
                        text: m.text
                    }
                ]
            };

        });

    contents.push({
        role: "user",
        parts: [
            {
                text: promptText
            }
        ]
    });


    let lastError = null;


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
                        contents: contents
                    })
                }
            );


            const data = await response.json();


            if (data.error) {

                lastError = new Error(
                    data.error.message
                );

                if (
                    /high demand|temporar|quota|rate|unavailable|deprecated/i
                    .test(data.error.message)
                ) {
                    continue;
                }

                throw lastError;
            }


            return data
                .candidates[0]
                .content
                .parts[0]
                .text;

        }

        catch (error) {

            lastError = error;

        }

    }


    throw lastError || new Error("Gemini request failed.");

}


// =====================================================
// 7. ASK GEMINI
// =====================================================

async function askGemini(promptText) {

    add(
        "J.A.R.V.I.S: Thinking...",
        "ai"
    );


    try {

        const reply = await callGemini(promptText);


        MEMORY.push({
            role: "user",
            text: promptText
        });


        MEMORY.push({
            role: "model",
            text: reply
        });


        saveMemory();


        if (chat.lastChild) {

            chat.lastChild.innerText =
                "J.A.R.V.I.S: " + reply;

        }


        speak(reply);

    }

    catch (error) {

        if (chat.lastChild) {

            chat.lastChild.innerText =
                "J.A.R.V.I.S: ERROR - "
                + error.message;

        }

    }

}


// =====================================================
// 8. VISION
// =====================================================

if (camBtn && imgInput) {

    camBtn.onclick = function () {

        imgInput.click();

    };


    imgInput.onchange = function () {

        const file = imgInput.files[0];

        if (!file) {
            return;
        }


        const reader = new FileReader();


        reader.onload = function () {

            const base64 =
                reader.result.split(",")[1];


            const question =
                input.value.trim()
                || "What do you see? Describe briefly.";


            add(
                "YOU: [IMAGE] " + question,
                "user"
            );


            input.value = "";


            askVision(
                base64,
                file.type,
                question
            );

        };


        reader.readAsDataURL(file);

    };

}


// =====================================================
// 9. IMAGE ANALYSIS
// =====================================================

async function askVision(
    base64,
    mimeType,
    question
) {

    add(
        "J.A.R.V.I.S: Analyzing image...",
        "ai"
    );


    let lastError = null;


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
                                        text: question
                                    },

                                    {
                                        inline_data: {
                                            mime_type: mimeType,
                                            data: base64
                                        }
                                    }

                                ]
                            }
                        ]

                    })
                }
            );


            const data = await response.json();


            if (data.error) {

                lastError =
                    new Error(data.error.message);

                if (
                    /high demand|temporar|quota|rate|unavailable|deprecated/i
                    .test(data.error.message)
                ) {
                    continue;
                }

                throw lastError;
            }


            const reply =
                data.candidates[0]
                    .content
                    .parts[0]
                    .text;


            if (chat.lastChild) {

                chat.lastChild.innerText =
                    "J.A.R.V.I.S: " + reply;

            }


            speak(reply);

            return;

        }

        catch (error) {

            lastError = error;

        }

    }


    if (chat.lastChild) {

        chat.lastChild.innerText =
            "J.A.R.V.I.S: ERROR - "
            + (lastError
                ? lastError.message
                : "Image analysis failed.");

    }

}


// =====================================================
// 10. VOICE INPUT
// =====================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


let recognition = null;


if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-US";


    recognition.onresult = function (event) {

        const text =
            event.results[0][0].transcript;


        add(
            "YOU: " + text,
            "user"
        );


        askGemini(text);

    };


    recognition.onend = function () {

        if (micBtn) {
            micBtn.innerText = "🎤";
        }

    };


    recognition.onerror = function () {

        if (micBtn) {
            micBtn.innerText = "🎤";
        }

    };

}


// =====================================================
// 11. MIC BUTTON
// =====================================================

if (micBtn) {

    micBtn.onclick = function () {

        if (!recognition) {

            add(
                "J.A.R.V.I.S: Speech recognition is not supported in this browser.",
                "ai"
            );

            return;
        }


        try {

            recognition.start();

            micBtn.innerText = "LISTENING...";

        }

        catch (error) {

            console.log(error);

        }

    };

}


// =====================================================
// 12. VOICE OUTPUT
// =====================================================

let voices = [];


function loadVoices() {

    voices =
        window.speechSynthesis.getVoices();

}


loadVoices();


if (window.speechSynthesis) {

    window.speechSynthesis.onvoiceschanged =
        loadVoices;

}


function speak(text) {

    if (!window.speechSynthesis) {
        return;
    }


    const utterance =
        new SpeechSynthesisUtterance(text);


    utterance.rate = 1.05;
    utterance.pitch = 0.85;


    const voice =
        voices.find(function (v) {

            return v.lang &&
                   v.lang.startsWith("en");

        });


    if (voice) {

        utterance.voice = voice;

    }


    window.speechSynthesis.speak(
        utterance
    );

}


// =====================================================
// 13. SEND BUTTON
// =====================================================

if (sendBtn) {

    sendBtn.onclick = function () {

        const text =
            input.value.trim();


        if (!text) {
            return;
        }


        add(
            "YOU: " + text,
            "user"
        );


        input.value = "";


        askGemini(text);

    };

}


// =====================================================
// 14. CLEAR MEMORY
// =====================================================

if (clearBtn) {

    clearBtn.onclick = function () {

        MEMORY = [];

        saveMemory();


        chat.innerHTML = "";


        add(
            "SYSTEM: Memory cleared.",
            "ai"
        );

    };

}


// =====================================================
// 15. ADD MESSAGE TO CHAT
// =====================================================

function add(text, type) {

    if (!chat) {
        return;
    }


    const message =
        document.createElement("div");


    message.className =
        "msg " + type;


    message.innerText = text;


    chat.appendChild(message);


    chat.scrollTop =
        chat.scrollHeight;

        }
