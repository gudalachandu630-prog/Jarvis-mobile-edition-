// ============================================================
// J.A.R.V.I.S MOBILE EDITION — EPISODE 06
// MEMORY + VISION + VOICE + 15 TOOLS
// ============================================================


// ============================================================
// 1. API KEY
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
    "gemini-3.6-flash",
    "gemini-flash-latest"
];


// ============================================================
// 3. MEMORY
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
// 4. HTML ELEMENTS
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");

const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const imgInput = document.getElementById("img-input");
const sendBtn = document.getElementById("send");


// ============================================================
// 5. LOAD MEMORY INTO CHAT
// ============================================================

MEMORY.forEach(m => {

    if (m.role === "user") {

        add(
            "YOU: " + m.text,
            "user"
        );

    } else {

        add(
            "J.A.R.V.I.S: " + m.text,
            "ai"
        );

    }

});


// ============================================================
// 6. ADD MESSAGE
// ============================================================

function add(text, type) {

    const d = document.createElement("div");

    d.className = "msg " + type;

    d.innerText = text;

    chat.appendChild(d);

    chat.scrollTop = chat.scrollHeight;
}


// ============================================================
// 7. GEMINI BRAIN
// ============================================================

async function callGemini(promptText) {

    const contents = MEMORY
        .slice(-12)
        .map(m => ({

            role:
                m.role === "user"
                    ? "user"
                    : "model",

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
                text: promptText
            }
        ]

    });


    let lastError;


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


            if (
                !data.candidates ||
                !data.candidates[0]
            ) {

                throw new Error(
                    "No response from Gemini."
                );

            }


            return data
                .candidates[0]
                .content
                .parts[0]
                .text;


        } catch (error) {

            lastError = error;

        }

    }


    throw lastError ||
        new Error("Gemini request failed.");

}


// ============================================================
// 8. SPEECH
// ============================================================

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
            v.lang &&
            v.lang.startsWith("en")
        );


    if (voice) {
        utterance.voice = voice;
    }


    speechSynthesis.speak(
        utterance
    );

}


// ============================================================
// 9. TOOL 1 — TIME
// ============================================================

function getTime() {

    return (
        "The current time is "
        + new Date().toLocaleTimeString()
        + "."
    );

}


// ============================================================
// 10. TOOL 2 — DATE
// ============================================================

function getDate() {

    return (
        "Today's date is "
        + new Date().toLocaleDateString()
        + "."
    );

}


// ============================================================
// 11. TOOL 3 — WEATHER
// ============================================================

async function getWeather() {

    return await new Promise(resolve => {

        if (!navigator.geolocation) {

            resolve(
                "Location is not supported by this browser."
            );

            return;

        }


        navigator.geolocation.getCurrentPosition(

            async position => {

                try {

                    const latitude =
                        position.coords.latitude;

                    const longitude =
                        position.coords.longitude;


                    const response =
                        await fetch(

                            "https://api.open-meteo.com/v1/forecast"
                            + "?latitude="
                            + latitude
                            + "&longitude="
                            + longitude
                            + "&current=temperature_2m,weather_code,wind_speed_10m"

                        );


                    const data =
                        await response.json();


                    const current =
                        data.current;


                    resolve(

                        "Current temperature is "
                        + current.temperature_2m
                        + "°C. Wind speed is "
                        + current.wind_speed_10m
                        + " km/h."

                    );


                } catch (error) {

                    resolve(
                        "Weather service error."
                    );

                }

            },


            () => {

                resolve(
                    "Please allow location permission for weather."
                );

            }

        );

    });

}


// ============================================================
// 12. TOOL 4 — TIMER
// ============================================================

function startTimer(text) {

    const match =
        text.match(
            /(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i
        );


    if (!match) {

        return (
            "Please say something like: timer for 10 minutes."
        );

    }


    const amount =
        parseInt(match[1]);


    const unit =
        match[2].toLowerCase();


    let milliseconds;


    if (
        unit.startsWith("hour") ||
        unit.startsWith("hr")
    ) {

        milliseconds =
            amount * 60 * 60 * 1000;

    }

    else if (
        unit.startsWith("minute") ||
        unit.startsWith("min")
    ) {

        milliseconds =
            amount * 60 * 1000;

    }

    else {

        milliseconds =
            amount * 1000;

    }


    setTimeout(() => {

        speak(
            "Timer completed."
        );

        add(
            "J.A.R.V.I.S: Timer completed.",
            "ai"
        );

    }, milliseconds);


    return (
        "Timer set for "
        + amount
        + " "
        + unit
        + "."
    );

}


// ============================================================
// 13. TOOL 5 — TRANSLATE
// ============================================================

async function translateText(text) {

    let query =
        text.replace(
            /^.*?translate\s+(this\s+)?/i,
            ""
        ).trim();


    if (!query) {

        return (
            "Tell me what you want me to translate."
        );

    }


    try {

        const response =
            await fetch(

                "https://api.mymemory.translated.net/get"
                + "?q="
                + encodeURIComponent(query)
                + "&langpair=en|te"

            );


        const data =
            await response.json();


        return (
            "In Telugu: "
            + data.responseData.translatedText
        );


    } catch (error) {

        return "Translation service error.";

    }

}


// ============================================================
// 14. TOOL 6 — CALCULATOR
// ============================================================

function calculator(text) {

    let expression =
        text
            .replace(/calculate/i, "")
            .replace(/what is/i, "")
            .replace(/equals?/i, "")
            .trim();


    expression =
        expression.replace(
            /[^0-9+\-*/().% ]/g,
            ""
        );


    if (!expression) {

        return "Please give me a calculation.";

    }


    try {

        const result =
            Function(
                '"use strict"; return (' +
                expression +
                ")"
            )();


        return (
            expression
            + " = "
            + result
        );


    } catch (error) {

        return "I could not calculate that.";

    }

}


// ============================================================
// 15. TOOL 7 — YOUTUBE
// ============================================================

function youtubeSearch(text) {

    let query =
        text
            .replace(
                /^(play|youtube|search youtube)\s*/i,
                ""
            )
            .trim();


    if (!query) {

        return "Tell me what you want to search on YouTube.";

    }


    window.open(

        "https://www.youtube.com/results?search_query="
        + encodeURIComponent(query),

        "_blank"

    );


    return (
        "Searching YouTube for "
        + query
        + "."
    );

}


// ============================================================
// 16. TOOL 8 — GOOGLE SEARCH
// ============================================================

function googleSearch(text) {

    let query =
        text
            .replace(
                /^(google|search)\s*/i,
                ""
            )
            .trim();


    if (!query) {

        return "Tell me what you want me to search.";

    }


    window.open(

        "https://www.google.com/search?q="
        + encodeURIComponent(query),

        "_blank"

    );


    return (
        "Searching Google for "
        + query
        + "."
    );

}


// ============================================================
// 17. TOOL 9 — OPEN WEBSITE
// ============================================================

function openWebsite(text) {

    const sites = {

        youtube:
            "https://www.youtube.com",

        google:
            "https://www.google.com",

        github:
            "https://github.com",

        wikipedia:
            "https://www.wikipedia.org"

    };


    const lower =
        text.toLowerCase();


    for (const name in sites) {

        if (lower.includes(name)) {

            window.open(
                sites[name],
                "_blank"
            );


            return (
                "Opening "
                + name
                + "."
            );

        }

    }


    return null;

}


// ============================================================
// 18. TOOL 10 — CLEAR MEMORY
// ============================================================

function clearMemoryTool() {

    MEMORY = [];

    saveMemory();

    chat.innerHTML = "";

    add(
        "SYSTEM: Memory cleared.",
        "ai"
    );


    return "Memory cleared.";

}


// ============================================================
// 19. TOOL 11 — REFRESH
// ============================================================

function refreshPage() {

    setTimeout(() => {

        location.reload();

    }, 500);


    return "Refreshing J.A.R.V.I.S.";

}


// ============================================================
// 20. TOOL 12 — NEWS SEARCH
// ============================================================

function newsSearch(text) {

    let query =
        text
            .replace(
                /^(news|latest news|search news)\s*/i,
                ""
            )
            .trim();


    if (!query) {

        query = "latest news";

    }


    window.open(

        "https://www.google.com/search?tbm=nws&q="
        + encodeURIComponent(query),

        "_blank"

    );


    return (
        "Opening news results for "
        + query
        + "."
    );

}


// ============================================================
// 21. TOOL 13 — CRYPTO PRICE SEARCH
// ============================================================

function cryptoSearch(text) {

    let query =
        text
            .replace(
                /^(crypto|bitcoin|ethereum)\s*/i,
                ""
            )
            .trim();


    if (!query) {

        query = "Bitcoin price";

    }


    window.open(

        "https://www.google.com/search?q="
        + encodeURIComponent(
            query + " crypto price"
        ),

        "_blank"

    );


    return (
        "Opening current crypto information for "
        + query
        + "."
    );

}


// ============================================================
// 22. TOOL 14 — LOCATION
// ============================================================

function getLocation() {

    if (!navigator.geolocation) {

        return (
            "Location is not supported."
        );

    }


    navigator.geolocation.getCurrentPosition(

        position => {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            window.open(

                "https://www.google.com/maps?q="
                + latitude
                + ","
                + longitude,

                "_blank"

            );

        },

        () => {

            add(
                "J.A.R.V.I.S: Location permission was not allowed.",
                "ai"
            );

        }

    );


    return "Opening your location on Google Maps.";

}


// ============================================================
// 23. TOOL 15 — CURRENCY SEARCH
// ============================================================

function currencySearch(text) {

    let query =
        text
            .replace(
                /^(currency|convert)\s*/i,
                ""
            )
            .trim();


    if (!query) {

        query = "USD to INR";

    }


    window.open(

        "https://www.google.com/search?q="
        + encodeURIComponent(
            query + " currency conversion"
        ),

        "_blank"

    );


    return (
        "Opening currency conversion for "
        + query
        + "."
    );

}


// ============================================================
// 24. TOOL ROUTER
// ============================================================

async function handleTools(text) {

    const t =
        text.toLowerCase().trim();


    // TIME
    if (
        /\bwhat time\b/.test(t) ||
        /\btime\b/.test(t) ||
        t.includes("సమయం")
    ) {

        return getTime();

    }


    // DATE
    if (
        /\bdate\b/.test(t) ||
        /\btoday\b/.test(t) ||
        t.includes("తేదీ")
    ) {

        return getDate();

    }


    // WEATHER
    if (
        t.includes("weather") ||
        t.includes("temperature") ||
        t.includes("వాతావరణం")
    ) {

        return await getWeather();

    }


    // TIMER
    if (
        t.includes("timer") ||
        t.includes("టైమర్")
    ) {

        return startTimer(t);

    }


    // TRANSLATE
    if (
        t.includes("translate")
    ) {

        return await translateText(text);

    }


    // CALCULATOR
    if (
        t.includes("calculate") ||
        t.includes("calculator")
    ) {

        return calculator(text);

    }


    // YOUTUBE
    if (
        t.startsWith("play ") ||
        t.startsWith("youtube ")
    ) {

        return youtubeSearch(text);

    }


    // GOOGLE
    if (
        t.startsWith("google ") ||
        t.startsWith("search ")
    ) {

        return googleSearch(text);

    }


    // OPEN WEBSITE
    if (
        t.startsWith("open ")
    ) {

        const result =
            openWebsite(text);

        if (result) {
            return result;
        }

    }


    // CLEAR MEMORY
    if (
        t.includes("clear memory") ||
        t.includes("forget everything") ||
        t.includes("clear everything")
    ) {

        return clearMemoryTool();

    }


    // REFRESH
    if (
        t.includes("refresh page") ||
        t.includes("reload page") ||
        t === "refresh"
    ) {

        return refreshPage();

    }


    // NEWS
    if (
        t.includes("news") ||
        t.includes("latest news")
    ) {

        return newsSearch(text);

    }


    // CRYPTO
    if (
        t.includes("crypto") ||
        t.includes("bitcoin") ||
        t.includes("ethereum")
    ) {

        return cryptoSearch(text);

    }


    // LOCATION
    if (
        t.includes("my location") ||
        t.includes("where am i") ||
        t.includes("location")
    ) {

        return getLocation();

    }


    // CURRENCY
    if (
        t.includes("currency") ||
        t.includes("convert")
    ) {

        return currencySearch(text);

    }


    return null;

}


// ============================================================
// 25. MAIN J.A.R.V.I.S COMMAND
// ============================================================

async function askGemini(promptText) {

    // FIRST CHECK TOOLS
    const toolReply =
        await handleTools(promptText);


    // IF A TOOL HANDLED THE COMMAND
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


    // NORMAL GEMINI CHAT
    add(
        "J.A.R.V.I.S: Thinking...",
        "ai"
    );


    try {

        const reply =
            await callGemini(promptText);


        MEMORY.push({
            role: "user",
            text: promptText
        });


        MEMORY.push({
            role: "model",
            text: reply
        });


        saveMemory();


        chat.lastChild.innerText =
            "J.A.R.V.I.S: " + reply;


        speak(reply);


    } catch (error) {

        chat.lastChild.innerText =
            "J.A.R.V.I.S: ERROR - "
            + error.message;

    }

}


// ============================================================
// 26. SEND BUTTON
// ============================================================

if (sendBtn) {

    sendBtn.onclick = () => {

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


// ============================================================
// 27. ENTER KEY
// ============================================================

input.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();


            if (sendBtn) {

                sendBtn.click();

            }

        }

    }
);


// ============================================================
// 28. MICROPHONE
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (SpeechRecognition) {

    const recognition =
        new SpeechRecognition();


    recognition.lang =
        "en-US";


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    recognition.onresult =
        event => {

            const text =
                event
                    .results[0][0]
                    .transcript;


            add(
                "YOU: " + text,
                "user"
            );


            askGemini(text);

        };


    recognition.onstart =
        () => {

            if (micBtn) {

                micBtn.innerText =
                    "LISTENING...";

            }

        };


    recognition.onend =
        () => {

            if (micBtn) {

                micBtn.innerText =
                    "🎤";

            }

        };


    recognition.onerror =
        () => {

            if (micBtn) {

                micBtn.innerText =
                    "🎤";

            }

        };


    if (micBtn) {

        micBtn.onclick =
            () => {

                recognition.start();

            };

    }

}


// ============================================================
// 29. CLEAR BUTTON
// ============================================================

if (clearBtn) {

    clearBtn.onclick =
        () => {

            MEMORY = [];

            saveMemory();

            chat.innerHTML = "";


            add(
                "SYSTEM: Memory cleared.",
                "ai"
            );

        };

}


// ============================================================
// 30. CAMERA / VISION
// ============================================================

if (camBtn && imgInput) {

    camBtn.onclick =
        () => {

            imgInput.click();

        };


    imgInput.onchange =
        () => {

            const file =
                imgInput.files[0];


            if (!file) {
                return;
            }


            const reader =
                new FileReader();


            reader.onload =
                () => {

                    const base64 =
                        reader.result.split(",")[1];


                    const question =
                        input.value.trim()
                        ||
                        "What do you see in this image?";


                    add(
                        "YOU: [IMAGE] "
                        + question,
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


// ============================================================
// 31. VISION
// ============================================================

async function askVision(
    base64,
    mimeType,
    question
) {

    add(
        "J.A.R.V.I.S: Analyzing image...",
        "ai"
    );


    let lastError;


    for (const model of MODELS) {

        try {

            const response =
                await fetch(

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


                continue;

            }


            const reply =
                data
                    .candidates[0]
                    .content
                    .parts[0]
                    .text;


            chat.lastChild.innerText =
                "J.A.R.V.I.S: " + reply;


            speak(reply);


            return;


        } catch (error) {

            lastError = error;

        }

    }


    chat.lastChild.innerText =
        "J.A.R.V.I.S: ERROR - "
        + (
            lastError
                ? lastError.message
                : "Vision failed."
        );

}


// ============================================================
// J.A.R.V.I.S EPISODE 06 READY
// ============================================================
