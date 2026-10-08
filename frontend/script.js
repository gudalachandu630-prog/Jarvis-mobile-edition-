// ===== 1. API KEY =====
let API_KEY = localStorage.getItem('jarvis_key');

if (!API_KEY) {
    API_KEY = prompt('Enter your Gemini API Key:');
    if (API_KEY) {
        localStorage.setItem('jarvis_key', API_KEY);
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
    const storedMemory = JSON.parse(
        localStorage.getItem('jarvis_memory') || '[]'
    );

    if (Array.isArray(storedMemory)) {

        MEMORY = storedMemory.filter(
            m =>
                m &&
                (m.role === 'user' || m.role === 'model') &&
                typeof m.text === 'string' &&
                !(
                    m.role === 'model' &&
                    /^(?:Your strong password:|ఇదిగో strong password:)/i.test(m.text)
                )
        );

        if (MEMORY.length !== storedMemory.length) {
            localStorage.setItem(
                'jarvis_memory',
                JSON.stringify(MEMORY)
            );
        }

    } else {
        localStorage.removeItem('jarvis_memory');
    }

} catch (e) {
    localStorage.removeItem('jarvis_memory');
}


function saveMemory() {
    localStorage.setItem(
        'jarvis_memory',
        JSON.stringify(MEMORY)
    );
}


// ===== 3. HTML ELEMENTS =====
const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('send');
const clearBtn = document.getElementById('clear-btn');
const camBtn = document.getElementById('cam-btn');
const imgInput = document.getElementById('img-input');


// ===== RESTORE MEMORY =====
MEMORY.forEach(m => {
    add(
        (m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text,
        m.role === 'user' ? 'user' : 'ai'
    );
});


// ===== 4. TOOL FETCH HELPER =====
async function fetchToolJson(url, options = {}, timeoutMs = 10000) {

    const controller =
        typeof AbortController === 'function'
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
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();

    } finally {

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

    }
}


// ===== 5. TOOLS =====
async function handleTools(text) {

    text = String(text || '').trim();

    // ----- OPEN YOUTUBE -----
    if (
        /^\s*(?:please\s+)?(?:open\s+youtube|youtube\s+open|youtube)(?:\s+please)?[.!?]*\s*$/i
        .test(text)
    ) {

        window.open(
            'https://youtube.com',
            '_blank',
            'noopener,noreferrer'
        );

        return 'Opening YouTube, Boss.';
    }


    // ----- OPEN GOOGLE -----
    if (
        /^\s*(?:please\s+)?(?:open\s+google|google\s+open|google)(?:\s+please)?[.!?]*\s*$/i
        .test(text)
    ) {

        window.open(
            'https://google.com',
            '_blank',
            'noopener,noreferrer'
        );

        return 'Opening Google, Boss.';
    }


    // ----- OPEN URL -----
    const urlCommand = text.match(
        /^\s*(?:open|visit|go to)\s+(https?:\/\/\S+)\s*$/i
    );

    if (urlCommand) {

        try {

            const destination = new URL(urlCommand[1]);

            if (
                destination.protocol !== 'https:' &&
                destination.protocol !== 'http:'
            ) {
                return 'Only http and https links can be opened.';
            }

            window.open(
                destination.href,
                '_blank',
                'noopener,noreferrer'
            );

            return 'Opening ' + destination.hostname + ', Boss.';

        } catch (e) {

            return 'That link does not look valid.';
        }
    }


    // ----- GOOGLE SEARCH -----
    const googleSearch = text.match(
        /^\s*(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s+(.+?)\s*$/i
    );

    if (googleSearch) {

        const query = googleSearch[1].trim();

        if (!query) {
            return 'Tell me what to search for on Google.';
        }

        window.open(
            'https://www.google.com/search?q=' +
            encodeURIComponent(query),
            '_blank',
            'noopener,noreferrer'
        );

        return 'Searching Google for ' + query + ', Boss.';
    }


    // ----- YOUTUBE SEARCH / PLAY -----
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
        (playMatch || youtubeMatch || searchYoutubeMatch)?.[1]?.trim();

    if (videoQuery) {

        window.open(
            'https://www.youtube.com/results?search_query=' +
            encodeURIComponent(videoQuery),
            '_blank',
            'noopener,noreferrer'
        );

        return 'Searching YouTube for ' + videoQuery + ', Boss.';
    }


    // ----- WIKIPEDIA SEARCH -----
    const searchMatch = text.match(
        /^\s*(?:search|look up)\s+(?:for\s+)?(.+?)\s*$/i
    );

    if (searchMatch) {

        const query = searchMatch[1].trim();

        if (!query) {
            return 'Tell me what to search for.';
        }

        try {

            const url =
                'https://en.wikipedia.org/w/api.php?' +
                'action=query' +
                '&list=search' +
                '&srlimit=1' +
                '&srsearch=' +
                encodeURIComponent(query) +
                '&format=json' +
                '&origin=*';

            const data = await fetchToolJson(url);

            const result = data?.query?.search?.[0];

            if (!result) {
                return 'I could not find that, Boss.';
            }

            const snippet = String(
                result.snippet || ''
            )
                .replace(/<[^>]*>/g, '')
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');

            return (
                'Wikipedia summary: ' +
                result.title +
                (snippet ? '. ' + snippet : '')
            );

        } catch (e) {

            return 'Search error, Boss.';
        }
    }

    return null;
}


// ===== 6. AGENT MODE =====
const AGENT_TOOLS = Object.freeze({

    time: async () => handleTools('current time'),

    weather: async () => handleTools('weather'),

    news: async () => handleTools('news'),

    crypto: async () => handleTools('bitcoin')

});

const AGENT_TOOL_NAMES = Object.freeze({
    time: 'time',
    weather: 'weather',
    news: 'news',
    crypto: 'crypto'
});


function isAgentModeRequest(text = '') {

    const value = String(text || '');

    if (
        /\b(?:agent(?:\s+mode)?|run\s+(?:the\s+)?agent|use\s+(?:the\s+)?agent)\b/i
            .test(value)
    ) {
        return true;
    }

    if (
        /\b(?:briefing|research|analy[sz]e|analysis)\b/i
            .test(value)
    ) {
        return true;
    }

    return (
        /\bplan\b/i.test(value) &&
        /\b(?:time|weather|news|crypto|bitcoin|btc)\b/i.test(value)
    );
}


function parseAgentToolPlan(responseText) {

    const text = String(responseText || '')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '');

    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');

    if (start < 0 || end < start) {
        throw new Error('Agent plan format incorrect.');
    }

    const parsed = JSON.parse(
        text.slice(start, end + 1)
    );

    const allowed = new Set(
        Object.keys(AGENT_TOOLS)
    );

    return [
        ...new Set(
            parsed
                .filter(item => typeof item === 'string')
                .map(item => item.trim().toLowerCase())
                .filter(item => allowed.has(item))
        )
    ];
}


function fallbackAgentToolPlan(goal) {

    const text = String(goal || '').toLowerCase();

    const plan = [];

    if (/\btime\b/.test(text)) {
        plan.push('time');
    }

    if (/\bweather\b/.test(text)) {
        plan.push('weather');
    }

    if (/\bnews\b/.test(text)) {
        plan.push('news');
    }

    if (/\b(?:crypto|bitcoin|btc)\b/.test(text)) {
        plan.push('crypto');
    }

    return plan;
}


// ===== 7. AGENT RUNNER =====
async function runAgent(goal) {

    add(
        'J.A.R.V.I.S: Agent mode active.',
        'ai'
    );

    add(
        'J.A.R.V.I.S: Goal analyze chesthunna...',
        'ai'
    );

    const planPrompt =
        'Select tools from ["time","weather","news","crypto"]. Goal: ' +
        JSON.stringify(String(goal)) +
        '. Return only a JSON array.';

    let toolsToRun;

    try {

        toolsToRun = parseAgentToolPlan(
            await callGeminiRaw(planPrompt)
        );

    } catch (error) {

        toolsToRun = fallbackAgentToolPlan(goal);
    }

    const results = {};

    for (let i = 0; i < toolsToRun.length; i++) {

        const tool = toolsToRun[i];

        add(
            'J.A.R.V.I.S: [' +
            (i + 1) +
            '/' +
            toolsToRun.length +
            '] ' +
            AGENT_TOOL_NAMES[tool] +
            ' tool run chesthunna...',
            'ai'
        );

        try {

            results[tool] =
                await AGENT_TOOLS[tool]();

        } catch (e) {

            results[tool] = 'Tool error';
        }
    }

    add(
        'J.A.R.V.I.S: Results combine chesthunna...',
        'ai'
    );

    const summaryPrompt =
        'Goal: ' +
        JSON.stringify(String(goal)) +
        '. Tool results: ' +
        JSON.stringify(results) +
        '. Give concise Telugu/English summary.';

    return await callGemini(summaryPrompt);
}


// ===== 8. SEND BUTTON =====
// IMPORTANT: This must NOT be inside quotes.

if (micBtn) {

    micBtn.addEventListener('click', async () => {

        const text = input.value.trim();

        if (!text) {
            return;
        }

        add(
            'YOU: ' + text,
            'user'
        );

        input.value = '';

        MEMORY.push({
            role: 'user',
            text: text
        });

        saveMemory();


        // First check tools
        try {

            const toolResult = await handleTools(text);

            if (toolResult) {

                add(
                    'J.A.R.V.I.S: ' + toolResult,
                    'ai'
                );

                MEMORY.push({
                    role: 'model',
                    text: toolResult
                });

                saveMemory();

                return;
            }

        } catch (error) {

            console.error(
                'Tool error:',
                error
            );
        }


        // Agent mode
        if (isAgentModeRequest(text)) {

            try {

                const answer = await runAgent(text);

                if (answer) {

                    add(
                        'J.A.R.V.I.S: ' + answer,
                        'ai'
                    );

                    MEMORY.push({
                        role: 'model',
                        text: answer
                    });

                    saveMemory();
                }

            } catch (error) {

                add(
                    'J.A.R.V.I.S: Agent error.',
                    'ai'
                );

                console.error(error);
            }

            return;
        }


        // Normal Gemini reply
        try {

            const answer = await callGemini(text);

            add(
                'J.A.R.V.I.S: ' + answer,
                'ai'
            );

            MEMORY.push({
                role: 'model',
                text: answer
            });

            saveMemory();

        } catch (error) {

            console.error(error);

            add(
                'J.A.R.V.I.S: Sorry Boss, I could not connect to Gemini.',
                'ai'
            );
        }

    });
}


// ===== ENTER KEY =====
if (input) {

    input.addEventListener('keydown', event => {

        if (event.key === 'Enter' && !event.shiftKey) {

            event.preventDefault();

            if (micBtn) {
                micBtn.click();
            }
        }
    });
}
