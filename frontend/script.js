// ============================================================
// J.A.R.V.I.S MOBILE EDITION
// COMPLETE SCRIPT.JS
// MEMORY + VISION + VOICE + GEMINI + TOOL ROUTER
// ============================================================


// ============================================================
// 1. API KEY & SMART MODELS
// ============================================================

let API_KEY = localStorage.getItem('jarvis_key');

if (!API_KEY) {
    API_KEY = prompt('Enter your Gemini API Key:');

    if (API_KEY) {
        localStorage.setItem('jarvis_key', API_KEY);
    }
}

// Episode 05 source model setup
const MODELS = [
    "gemini-3.6-flash",
    "gemini-flash-latest"
];


// ============================================================
// 2. MEMORY SYSTEM
// ============================================================

let MEMORY = JSON.parse(
    localStorage.getItem('jarvis_memory') || '[]'
);

function saveMemory() {
    localStorage.setItem(
        'jarvis_memory',
        JSON.stringify(MEMORY)
    );
}


// ============================================================
// 3. CONNECT HTML ELEMENTS
// ============================================================

const chat = document.getElementById('chat');
const input = document.getElementById('msg');

const micBtn = document.getElementById('mic-btn');
const clearBtn = document.getElementById('clear-btn');

const camBtn = document.getElementById('cam-btn');
const imgInput = document.getElementById('img-input');

const sendBtn = document.getElementById('send');


// ============================================================
// 4. DISPLAY OLD MEMORY
// ============================================================

if (chat) {

    MEMORY.forEach(function (m) {

        add(
            (m.role === 'user'
                ? 'YOU: '
                : 'J.A.R.V.I.S: ') + m.text,

            m.role === 'user'
                ? 'user'
                : 'ai'
        );

    });

}


// ============================================================
// 5. GEMINI BRAIN
// ============================================================

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
        role: 'user',
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
                'https://generativelanguage.googleapis.com/v1beta/models/' +
                model +
                ':generateContent?key=' +
                API_KEY,

                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
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
                    /high demand|temporar|quota|rate|unavailable|deprecated|no longer available/i
                        .test(data.error.message)
                ) {
                    continue;
                }

                throw lastError;
            }


            if (
                !data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content ||
                !data.candidates[0].content.parts
            ) {

                throw new Error(
                    'No valid response from Gemini.'
                );
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


    throw lastError || new Error(
        'Gemini request failed.'
    );
}


// ============================================================
// 6. MAIN JARVIS FUNCTION
// TOOL ROUTER → GEMINI BRAIN
// ============================================================

async function askGemini(promptText) {

    // --------------------------------
    // FIRST: CHECK TOOLS
    // --------------------------------

    try {

        const toolReply = await handleTools(
            promptText
        );


        if (toolReply) {

            MEMORY.push({
                role: 'user',
                text: promptText
            });

            MEMORY.push({
                role: 'model',
                text: toolReply
            });

            saveMemory();


            add(
                'J.A.R.V.I.S: ' + toolReply,
                'ai'
            );


            speak(toolReply);

            return;
        }

    }

    catch (toolError) {

        console.error(
            'Tool error:',
            toolError
        );
    }


    // --------------------------------
    // NO TOOL → GEMINI BRAIN
    // --------------------------------

    add(
        'J.A.R.V.I.S: Thinking...',
        'ai'
    );


    try {

        const reply = await callGemini(
            promptText
        );


        MEMORY.push({
            role: 'user',
            text: promptText
        });


        MEMORY.push({
            role: 'model',
            text: reply
        });


        saveMemory();


        if (chat && chat.lastChild) {

            chat.lastChild.innerText =
                'J.A.R.V.I.S: ' + reply;

        }


        speak(reply);

    }

    catch (error) {

        if (chat && chat.lastChild) {

            chat.lastChild.innerText =
                'J.A.R.V.I.S: ERROR - ' +
                error.message;

        }

        console.error(
            'Gemini error:',
            error
        );
    }
}


// ============================================================
// 7. TOOL ROUTER
// TIME + WEATHER + TIMER + TRANSLATE + YOUTUBE
// ============================================================

async function handleTools(text) {

    const t = text.toLowerCase();


    // ========================================================
    // TOOL 1 — TIME
    // ========================================================

    if (
        /\btime\b/.test(t) ||
        t.includes('సమయం')
    ) {

        return (
            'The time is ' +
            new Date().toLocaleTimeString() +
            ', Boss.'
        );
    }


    // ========================================================
    // TOOL 2 — WEATHER
    // ========================================================

    if (
        t.includes('weather') ||
        t.includes('వాతావరణం')
    ) {

        return await new Promise(function (resolve) {

            if (!navigator.geolocation) {

                resolve(
                    'Location is not available, Boss.'
                );

                return;
            }


            navigator.geolocation.getCurrentPosition(

                async function (position) {

                    try {

                        const latitude =
                            position.coords.latitude;

                        const longitude =
                            position.coords.longitude;


                        const response = await fetch(
                            'https://api.open-meteo.com/v1/forecast?' +
                            'latitude=' + latitude +
                            '&longitude=' + longitude +
                            '&current_weather=true'
                        );


                        const data =
                            await response.json();


                        if (
                            !data.current_weather ||
                            typeof data.current_weather.temperature ===
                            'undefined'
                        ) {

                            resolve(
                                'Weather data is unavailable, Boss.'
                            );

                            return;
                        }


                        resolve(
                            'It is ' +
                            data.current_weather.temperature +
                            ' degrees Celsius now, Boss.'
                        );

                    }

                    catch (error) {

                        resolve(
                            'Weather service error, Boss.'
                        );
                    }
                },


                function () {

                    resolve(
                        'I need location permission for weather, Boss.'
                    );
                }
            );

        });
    }


    // ========================================================
    // TOOL 3 — TIMER
    // ========================================================

    const timerMatch = t.match(
        /(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i
    );


    if (
        (
            t.includes('timer') ||
            t.includes('టైమర్')
        ) &&
        timerMatch
    ) {

        const amount =
            parseInt(timerMatch[1]);


        const unit =
            timerMatch[2].toLowerCase();


        let factor;


        if (
            /^(hours?|hrs?|h)/.test(unit)
        ) {

            factor =
                60 * 60 * 1000;

        }

        else if (
            /^(seconds?|secs?|s)/.test(unit)
        ) {

            factor = 1000;

        }

        else {

            factor =
                60 * 1000;
        }


        const duration =
            amount * factor;


        setTimeout(function () {

            speak(
                'Timer! ' +
                amount +
                ' ' +
                unit +
                ' completed.'
            );

        }, duration);


        return (
            'Timer set for ' +
            amount +
            ' ' +
            unit +
            '.'
        );
    }


    // ========================================================
    // TOOL 4 — TRANSLATE
    // ========================================================

    if (
        t.includes('translate')
    ) {

        const query =
            text
                .replace(
                    /translate (this )?/i,
                    ''
                )
                .trim() ||
            'hello';


        try {

            const response =
                await fetch(
                    'https://api.mymemory.translated.net/get?q=' +
                    encodeURIComponent(query) +
                    '&langpair=en|te'
                );


            const data =
                await response.json();


            return (
                'In Telugu: ' +
                data.responseData.translatedText
            );

        }

        catch (error) {

            return (
                'Translate error, Boss.'
            );
        }
    }


    // ========================================================
    // TOOL 5 — YOUTUBE
    // ========================================================

    if (
        t.includes('play ') ||
        t.includes('youtube ')
    ) {

        const query =
            text
                .replace(
                    /play |youtube (search )?/i,
                    ''
                )
                .trim();


        if (query) {

            window.open(
                'https://www.youtube.com/results?search_query=' +
                encodeURIComponent(query),
                '_blank'
            );


            return (
                'Searching YouTube for ' +
                query +
                ', Boss.'
            );
        }
    }


    // ========================================================
    // NO TOOL MATCH
    // ========================================================

    return null;
}


// ============================================================
// 8. VISION — CAMERA / IMAGE
// ============================================================

if (camBtn && imgInput) {

    camBtn.onclick = function () {

        imgInput.click();

    };


    imgInput.onchange = function () {

        const file =
            imgInput.files[0];


        if (!file) {
            return;
        }


        const reader =
            new FileReader();


        reader.onload = function () {

            const base64 =
                reader.result.split(',')[1];


            const question =
                input &&
                input.value.trim()
                    ? input.value.trim()
                    : 'What do you see? Describe briefly.';


            add(
                'YOU: [IMAGE] ' +
                question,
                'user'
            );


            if (input) {
                input.value = '';
            }


            askVision(
                base64,
                file.type,
                question
            );
        };


        reader.readAsDataURL(file);
    };
}


async function askVision(
    base64,
    mimeType,
    question
) {

    add(
        'J.A.R.V.I.S: Analyzing image...',
        'ai'
    );


    let lastError = null;


    for (const model of MODELS) {

        try {

            const response =
                await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models/' +
                    model +
                    ':generateContent?key=' +
                    API_KEY,

                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({

                            contents: [

                                {
                                    role: 'user',

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
                    /high demand|temporar|quota|rate|unavailable|deprecated|no longer available/i
                        .test(data.error.message)
                ) {

                    continue;
                }


                throw lastError;
            }


            const reply =
                data
                    .candidates[0]
                    .content
                    .parts[0]
                    .text;


            if (chat && chat.lastChild) {

                chat.lastChild.innerText =
                    'J.A.R.V.I.S: ' +
                    reply;

            }


            speak(reply);

            return;

        }

        catch (error) {

            lastError = error;
        }
    }


    if (chat && chat.lastChild) {

        chat.lastChild.innerText =
            'J.A.R.V.I.S: ERROR - ' +
            (
                lastError
                    ? lastError.message
                    : 'Vision request failed.'
            );
    }
}


// ============================================================
// 9. SPEECH RECOGNITION — MIC
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (SpeechRecognition && micBtn) {

    const recognition =
        new SpeechRecognition();


    recognition.lang =
        'en-US';


    recognition.continuous =
        false;


    recognition.interimResults =
// ============================================================
// J.A.R.V.I.S MOBILE EDITION
// COMPLETE SCRIPT.JS
// MEMORY + VISION + VOICE + GEMINI + TOOL ROUTER
// ============================================================


// ============================================================
// 1. API KEY & SMART MODELS
// ============================================================

let API_KEY = localStorage.getItem('jarvis_key');

if (!API_KEY) {
    API_KEY = prompt('Enter your Gemini API Key:');

    if (API_KEY) {
        localStorage.setItem('jarvis_key', API_KEY);
    }
}

// Episode 05 source model setup
const MODELS = [
    "gemini-3.6-flash",
    "gemini-flash-latest"
];


// ============================================================
// 2. MEMORY SYSTEM
// ============================================================

let MEMORY = JSON.parse(
    localStorage.getItem('jarvis_memory') || '[]'
);

function saveMemory() {
    localStorage.setItem(
        'jarvis_memory',
        JSON.stringify(MEMORY)
    );
}


// ============================================================
// 3. CONNECT HTML ELEMENTS
// ============================================================

const chat = document.getElementById('chat');
const input = document.getElementById('msg');

const micBtn = document.getElementById('mic-btn');
const clearBtn = document.getElementById('clear-btn');

const camBtn = document.getElementById('cam-btn');
const imgInput = document.getElementById('img-input');

const sendBtn = document.getElementById('send');


// ============================================================
// 4. DISPLAY OLD MEMORY
// ============================================================

if (chat) {

    MEMORY.forEach(function (m) {

        add(
            (m.role === 'user'
                ? 'YOU: '
                : 'J.A.R.V.I.S: ') + m.text,

            m.role === 'user'
                ? 'user'
                : 'ai'
        );

    });

}


// ============================================================
// 5. GEMINI BRAIN
// ============================================================

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
        role: 'user',
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
                'https://generativelanguage.googleapis.com/v1beta/models/' +
                model +
                ':generateContent?key=' +
                API_KEY,

                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
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
                    /high demand|temporar|quota|rate|unavailable|deprecated|no longer available/i
                        .test(data.error.message)
                ) {
                    continue;
                }

                throw lastError;
            }


            if (
                !data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content ||
                !data.candidates[0].content.parts
            ) {

                throw new Error(
                    'No valid response from Gemini.'
                );
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


    throw lastError || new Error(
        'Gemini request failed.'
    );
}


// ============================================================
// 6. MAIN JARVIS FUNCTION
// TOOL ROUTER → GEMINI BRAIN
// ============================================================

async function askGemini(promptText) {

    // --------------------------------
    // FIRST: CHECK TOOLS
    // --------------------------------

    try {

        const toolReply = await handleTools(
            promptText
        );


        if (toolReply) {

            MEMORY.push({
                role: 'user',
                text: promptText
            });

            MEMORY.push({
                role: 'model',
                text: toolReply
            });

            saveMemory();


            add(
                'J.A.R.V.I.S: ' + toolReply,
                'ai'
            );


            speak(toolReply);

            return;
        }

    }

    catch (toolError) {

        console.error(
            'Tool error:',
            toolError
        );
    }


    // --------------------------------
    // NO TOOL → GEMINI BRAIN
    // --------------------------------

    add(
        'J.A.R.V.I.S: Thinking...',
        'ai'
    );


    try {

        const reply = await callGemini(
            promptText
        );


        MEMORY.push({
            role: 'user',
            text: promptText
        });


        MEMORY.push({
            role: 'model',
            text: reply
        });


        saveMemory();


        if (chat && chat.lastChild) {

            chat.lastChild.innerText =
                'J.A.R.V.I.S: ' + reply;

        }


        speak(reply);

    }

    catch (error) {

        if (chat && chat.lastChild) {

            chat.lastChild.innerText =
                'J.A.R.V.I.S: ERROR - ' +
                error.message;

        }

        console.error(
            'Gemini error:',
            error
        );
    }
}


// ============================================================
// 7. TOOL ROUTER
// TIME + WEATHER + TIMER + TRANSLATE + YOUTUBE
// ============================================================

async function handleTools(text) {

    const t = text.toLowerCase();


    // ========================================================
    // TOOL 1 — TIME
    // ========================================================

    if (
        /\btime\b/.test(t) ||
        t.includes('సమయం')
    ) {

        return (
            'The time is ' +
            new Date().toLocaleTimeString() +
            ', Boss.'
        );
    }


    // ========================================================
    // TOOL 2 — WEATHER
    // ========================================================

    if (
        t.includes('weather') ||
        t.includes('వాతావరణం')
    ) {

        return await new Promise(function (resolve) {

            if (!navigator.geolocation) {

                resolve(
                    'Location is not available, Boss.'
                );

                return;
            }


            navigator.geolocation.getCurrentPosition(

                async function (position) {

                    try {

                        const latitude =
                            position.coords.latitude;

                        const longitude =
                            position.coords.longitude;


                        const response = await fetch(
                            'https://api.open-meteo.com/v1/forecast?' +
                            'latitude=' + latitude +
                            '&longitude=' + longitude +
                            '&current_weather=true'
                        );


                        const data =
                            await response.json();


                        if (
                            !data.current_weather ||
                            typeof data.current_weather.temperature ===
                            'undefined'
                        ) {

                            resolve(
                                'Weather data is unavailable, Boss.'
                            );

                            return;
                        }


                        resolve(
                            'It is ' +
                            data.current_weather.temperature +
                            ' degrees Celsius now, Boss.'
                        );

                    }

                    catch (error) {

                        resolve(
                            'Weather service error, Boss.'
                        );
                    }
                },


                function () {

                    resolve(
                        'I need location permission for weather, Boss.'
                    );
                }
            );

        });
    }


    // ========================================================
    // TOOL 3 — TIMER
    // ========================================================

    const timerMatch = t.match(
        /(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i
    );


    if (
        (
            t.includes('timer') ||
            t.includes('టైమర్')
        ) &&
        timerMatch
    ) {

        const amount =
            parseInt(timerMatch[1]);


        const unit =
            timerMatch[2].toLowerCase();


        let factor;


        if (
            /^(hours?|hrs?|h)/.test(unit)
        ) {

            factor =
                60 * 60 * 1000;

        }

        else if (
            /^(seconds?|secs?|s)/.test(unit)
        ) {

            factor = 1000;

        }

        else {

            factor =
                60 * 1000;
        }


        const duration =
            amount * factor;


        setTimeout(function () {

            speak(
                'Timer! ' +
                amount +
                ' ' +
                unit +
                ' completed.'
            );

        }, duration);


        return (
            'Timer set for ' +
            amount +
            ' ' +
            unit +
            '.'
        );
    }


    // ========================================================
    // TOOL 4 — TRANSLATE
    // ========================================================

    if (
        t.includes('translate')
    ) {

        const query =
            text
                .replace(
                    /translate (this )?/i,
                    ''
                )
                .trim() ||
            'hello';


        try {

            const response =
                await fetch(
                    'https://api.mymemory.translated.net/get?q=' +
                    encodeURIComponent(query) +
                    '&langpair=en|te'
                );


            const data =
                await response.json();


            return (
                'In Telugu: ' +
                data.responseData.translatedText
            );

        }

        catch (error) {

            return (
                'Translate error, Boss.'
            );
        }
    }


    // ========================================================
    // TOOL 5 — YOUTUBE
    // ========================================================

    if (
        t.includes('play ') ||
        t.includes('youtube ')
    ) {

        const query =
            text
                .replace(
                    /play |youtube (search )?/i,
                    ''
                )
                .trim();


        if (query) {

            window.open(
                'https://www.youtube.com/results?search_query=' +
                encodeURIComponent(query),
                '_blank'
            );


            return (
                'Searching YouTube for ' +
                query +
                ', Boss.'
            );
        }
    }


    // ========================================================
    // NO TOOL MATCH
    // ========================================================

    return null;
}


// ============================================================
// 8. VISION — CAMERA / IMAGE
// ============================================================

if (camBtn && imgInput) {

    camBtn.onclick = function () {

        imgInput.click();

    };


    imgInput.onchange = function () {

        const file =
            imgInput.files[0];


        if (!file) {
            return;
        }


        const reader =
            new FileReader();


        reader.onload = function () {

            const base64 =
                reader.result.split(',')[1];


            const question =
                input &&
                input.value.trim()
                    ? input.value.trim()
                    : 'What do you see? Describe briefly.';


            add(
                'YOU: [IMAGE] ' +
                question,
                'user'
            );


            if (input) {
                input.value = '';
            }


            askVision(
                base64,
                file.type,
                question
            );
        };


        reader.readAsDataURL(file);
    };
}


async function askVision(
    base64,
    mimeType,
    question
) {

    add(
        'J.A.R.V.I.S: Analyzing image...',
        'ai'
    );


    let lastError = null;


    for (const model of MODELS) {

        try {

            const response =
                await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models/' +
                    model +
                    ':generateContent?key=' +
                    API_KEY,

                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({

                            contents: [

                                {
                                    role: 'user',

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
                    /high demand|temporar|quota|rate|unavailable|deprecated|no longer available/i
                        .test(data.error.message)
                ) {

                    continue;
                }


                throw lastError;
            }


            const reply =
                data
                    .candidates[0]
                    .content
                    .parts[0]
                    .text;


            if (chat && chat.lastChild) {

                chat.lastChild.innerText =
                    'J.A.R.V.I.S: ' +
                    reply;

            }


            speak(reply);

            return;

        }

        catch (error) {

            lastError = error;
        }
    }


    if (chat && chat.lastChild) {

        chat.lastChild.innerText =
            'J.A.R.V.I.S: ERROR - ' +
            (
                lastError
                    ? lastError.message
                    : 'Vision request failed.'
            );
    }
}


// ============================================================
// 9. SPEECH RECOGNITION — MIC
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (SpeechRecognition && micBtn) {

    const recognition =
        new SpeechRecognition();


    recognition.lang =
        'en-US';


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    recognition.onresult =
        function (event) {

            const spokenText =
                event
                    .results[0][0]
                    .transcript;


            add(
                'YOU: ' +
                spokenText,
                'user'
            );


            askGemini(
                spokenText
            );
        };


    recognition.onerror =
        function (event) {

            console.error(
                'Speech recognition error:',
                event.error
            );

            micBtn.innerText =
                '🎤';
        };


    recognition.onend =
        function () {

            micBtn.innerText =
                '🎤';
        };


    micBtn.onclick =
        function () {

            try {

                recognition.start();

                micBtn.innerText =
                    'LISTENING...';

            }

            catch (error) {

                console.log(
                    'Mic already running.'
                );
            }
        };
}


// ============================================================
// 10. TEXT-TO-SPEECH
// ============================================================

let voices = [];


function loadVoices() {

    voices =
        speechSynthesis.getVoices();
}


loadVoices();


speechSynthesis.onvoiceschanged =
    loadVoices;


function speak(text) {

    if (!('speechSynthesis' in window)) {
        return;
    }


    speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    utterance.rate =
        1.05;


    utterance.pitch =
        0.85;


    const voice =
        voices.find(function (v) {

            return v.lang.startsWith(
                'en'
            );

        });


    if (voice) {

        utterance.voice =
            voice;
    }


    speechSynthesis.speak(
        utterance
    );
}


// ============================================================
// 11. SEND BUTTON
// ============================================================

if (sendBtn) {

    sendBtn.onclick =
        function () {

            if (!input) {
                return;
            }


            const text =
                input.value.trim();


            if (!text) {
                return;
            }


            add(
                'YOU: ' + text,
                'user'
            );


            input.value =
                ''n
            

            askGemini(
                text
            );
        };
}


// ============================================================
// 12. ENTER KEY
// ============================================================

if (input) {

    input.addEventListener(
        'keydown',
        function (event) {

            if (
                event.key === 'Enter' &&
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


// ============================================================
// 13. CLEAR MEMORY BUTTON
// ============================================================

if (clearBtn) {

    clearBtn.onclick =
        function         false;


    recognition.onresult =
        function (event) {

            const spokenText =
                event
                    .results[0][0]
                    .transcript;


            add(
                'YOU: ' +
                spokenText,
                'user'
            );


            askGemini(
                spokenText
            );
        };


    recognition.onerror =
        function (event) {

            console.error(
                'Speech recognition error:',
                event.error
            );

            micBtn.innerText =
                '🎤';
        };


    recognition.onend =
        function () {

            micBtn.innerText =
                '🎤';
        };


    micBtn.onclick =
        function () {

            try {

                recognition.start();

                micBtn.innerText =
                    'LISTENING...';

            }

            catch (error) {

                console.log(
                    'Mic already running.'
                );
            }
        };
}


// ============================================================
// 10. TEXT-TO-SPEECH
// ============================================================

let voices = [];


function loadVoices() {

    voices =
        speechSynthesis.getVoices();
}


loadVoices();


speechSynthesis.onvoiceschanged =
    loadVoices;


function speak(text) {

    if (!('speechSynthesis' in window)) {
        return;
    }


    speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


