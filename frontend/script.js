// ============================================================
// J.A.R.V.I.S EPISODE 05
// MEMORY + THE EYES
// ============================================================


// ============================================================
// 1. GEMINI API KEY
// ============================================================

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        localStorage.setItem("jarvis_key", API_KEY);
    }
}


// ============================================================
// 2. MODELS
// ============================================================

const MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
];


// ============================================================
// 3. GET HTML ELEMENTS
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const camBtn = document.getElementById("cam-btn");
const clearBtn = document.getElementById("clear-btn");
const imgInput = document.getElementById("img-input");


// ============================================================
// 4. MEMORY SYSTEM
// ============================================================

let MEMORY = JSON.parse(
    localStorage.getItem("jarvis_memory") || "[]"
);


function saveMemory() {

    localStorage.setItem(
        "jarvis_memory",
        JSON.stringify(MEMORY)
    );

}


// ============================================================
// 5. ADD MESSAGE TO SCREEN
// ============================================================

function addMessage(text, type) {

    const div = document.createElement("div");

    div.className = "msg " + type;

    div.innerText = text;

    chat.appendChild(div);

    chat.scrollTop = chat.scrollHeight;

    return div;
}


// ============================================================
// 6. LOAD OLD MEMORY INTO CHAT
// ============================================================

MEMORY.forEach(function(message) {

    if (message.role === "user") {

        addMessage(
            "YOU: " + message.text,
            "user"
        );

    } else if (message.role === "model") {

        addMessage(
            "J.A.R.V.I.S: " + message.text,
            "ai"
        );

    }

});


// ============================================================
// 7. TEXT TO SPEECH
// ============================================================

let voices = [];


function loadVoices() {

    voices = window.speechSynthesis.getVoices();

}


loadVoices();


if ("speechSynthesis" in window) {

    speechSynthesis.onvoiceschanged = loadVoices;

}


function speak(text) {

    if (!("speechSynthesis" in window)) {

        return;

    }

    // Stop previous speech
    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.rate = 1.05;

    utterance.pitch = 0.85;

    utterance.volume = 1.0;


    // Prefer English voice
    const voice = voices.find(function(v) {

        return v.lang &&
               v.lang.toLowerCase().startsWith("en");

    });


    if (voice) {

        utterance.voice = voice;

    }


    speechSynthesis.speak(utterance);

}


// ============================================================
// 8. GEMINI BRAIN
// ============================================================

async function callGemini(promptText) {

    if (!API_KEY) {

        throw new Error(
            "Gemini API Key is missing."
        );

    }


    // Last 12 memory messages
    const contents = MEMORY
        .slice(-12)
        .map(function(message) {

            return {
                role: message.role,
                parts: [
                    {
                        text: message.text
                    }
                ]
            };

        });


    // Current user message
    contents.push({

        role: "user",

        parts: [
            {
                text: promptText
            }
        ]

    });


    let lastError = null;


    // Try models one by one
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
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        contents: contents
                    })

                }
            );


            const data = await response.json();


            if (data.error) {

                lastError =
                    new Error(data.error.message);


                // Try next model for temporary errors
                if (
                    /high demand|temporar|quota|rate|unavailable|deprecated/i
                    .test(data.error.message)
                ) {

                    continue;

                }


                throw lastError;

            }


            if (
                !data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content
            ) {

                throw new Error(
                    "Gemini returned an empty response."
                );

            }


            return data
                .candidates[0]
                .content
                .parts
                .map(function(part) {

                    return part.text || "";

                })
                .join("");

        }

        catch (error) {

            lastError = error;

        }

    }


    throw lastError ||
        new Error("Gemini request failed.");

}


// ============================================================
// 9. ASK J.A.R.V.I.S
// ============================================================

async function askGemini(promptText) {

    const thinkingMessage =
        addMessage(
            "J.A.R.V.I.S: Thinking...",
            "ai"
        );


    try {

        const reply =
            await callGemini(promptText);


        // Save user message
        MEMORY.push({

            role: "user",

            text: promptText

        });


        // Save AI reply
        MEMORY.push({

            role: "model",

            text: reply

        });


        // Save memory
        saveMemory();


        // Show answer
        thinkingMessage.innerText =
            "J.A.R.V.I.S: " + reply;


        // Speak answer
        speak(reply);

    }

    catch (error) {

        console.error(error);


        thinkingMessage.innerText =
            "J.A.R.V.I.S: ERROR - "
            + error.message;

    }

}


// ============================================================
// 10. SEND BUTTON
// ============================================================

if (sendBtn) {

    sendBtn.addEventListener(
        "click",
        function() {

            const text =
                input.value.trim();


            if (!text) {

                return;

            }


            addMessage(
                "YOU: " + text,
                "user"
            );


            input.value = "";


            askGemini(text);

        }
    );

}


// ============================================================
// 11. ENTER KEY
// ============================================================

if (input) {

    input.addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {

                event.preventDefault();

                sendBtn.click();

            }

        }
    );

}


// ============================================================
// 12. MICROPHONE / SPEECH RECOGNITION
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (SpeechRecognition && micBtn) {

    const recognition =
        new SpeechRecognition();


    recognition.lang = "en-US";

    recognition.continuous = false;

    recognition.interimResults = false;


    recognition.onstart = function() {

        micBtn.innerText = "🔴";

    };


    recognition.onresult = function(event) {

        const spokenText =
            event.results[0][0].transcript;


        input.value = spokenText;


        addMessage(
            "YOU: " + spokenText,
            "user"
        );


        input.value = "";


        askGemini(spokenText);

    };


    recognition.onerror = function(event) {

        console.error(
            "Speech recognition error:",
            event.error
        );

        micBtn.innerText = "🎙️";

    };


    recognition.onend = function() {

        micBtn.innerText = "🎙️";

    };


    micBtn.addEventListener(
        "click",
        function() {

            try {

                recognition.start();

            }

            catch (error) {

                console.log(error);

            }

        }
    );

}


// ============================================================
// 13. MICROPHONE NOT SUPPORTED
// ============================================================

else if (micBtn) {

    micBtn.addEventListener(
        "click",
        function() {

            addMessage(
                "J.A.R.V.I.S: Voice input is not supported in this browser.",
                "ai"
            );

        }
    );

}


// ============================================================
// 14. CAMERA BUTTON
// ============================================================

if (camBtn && imgInput) {

    camBtn.addEventListener(
        "click",
        function() {

            imgInput.click();

        }
    );

}


// ============================================================
// 15. IMAGE SELECTED / CAMERA PHOTO
// ============================================================

if (imgInput) {

    imgInput.addEventListener(
        "change",
        function() {

            const file =
                imgInput.files[0];


            if (!file) {

                return;

            }


            // Maximum 10 MB
            if (file.size > 10 * 1024 * 1024) {

                addMessage(
                    "J.A.R.V.I.S: Image is too large. Please choose a smaller photo.",
                    "ai"
                );

                imgInput.value = "";

                return;

            }


            const reader =
                new FileReader();


            reader.onload = function() {

                const base64 =
                    reader.result.split(",")[1];


                const question =
                    input.value.trim()
                    ||
                    "What do you see in this image? Describe it briefly.";


                addMessage(
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


            reader.onerror = function() {

                addMessage(
                    "J.A.R.V.I.S: Could not read the image.",
                    "ai"
                );

            };


            reader.readAsDataURL(file);

        }
    );

}


// ============================================================
// 16. VISION ENGINE
// ============================================================

async function askVision(
    base64,
    mimeType,
    question
) {

    const visionMessage =
        addMessage(
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
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        contents: [

                            {

                                role: "user",

                                parts: [

                                    {
                                        text: question
                                    },

                                    {

                                        inline_data: {

                                            mime_type:
                                                mimeType,

                                            data:
                                                base64

                                        }

                                    }

                                ]

                            }

                        ]

                    })

                }
            );


            const data =
                await response.json();


            if (data.error) {

                lastError =
                    new Error(
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


            if (
                !data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content
            ) {

                throw new Error(
                    "Vision returned an empty response."
                );

            }


            const reply =
                data
                .candidates[0]
                .content
                .parts
                .map(function(part) {

                    return part.text || "";

                })
                .join("");


            visionMessage.innerText =
                "J.A.R.V.I.S: " + reply;


            speak(reply);


            return;

        }

        catch (error) {

            lastError = error;

        }

    }


    visionMessage.innerText =
        "J.A.R.V.I.S: ERROR - "
        + (
            lastError
                ? lastError.message
                : "Vision request failed."
        );

}


// ============================================================
// 17. CLEAR MEMORY BUTTON
// ============================================================

if (clearBtn) {

    clearBtn.addEventListener(
        "click",
        function() {

            const confirmed =
                confirm(
                    "Clear all J.A.R.V.I.S memory?"
                );


            if (!confirmed) {

                return;

            }


            MEMORY = [];


            saveMemory();


            chat.innerHTML = "";


            addMessage(
                "SYSTEM: Memory cleared.",
                "ai"
            );


            speak(
                "Memory cleared."
            );

        }
    );

}


// ============================================================
// 18. STARTUP MESSAGE
// ============================================================

if (MEMORY.length === 0) {

    addMessage(
        "J.A.R.V.I.S: System online. Memory and vision are ready.",
        "ai"
    );

}


console.log(
    "J.A.R.V.I.S Episode 05 loaded successfully."
);
