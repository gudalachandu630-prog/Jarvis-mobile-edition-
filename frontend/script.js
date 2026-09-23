// ===== 3. TOOLS (THE HANDS) =====
async function handleTools(text) {
    const t = text.toLowerCase();

    // =========================
    // 1. TIME
    // =========================
    if (
        /\btime\b/.test(t) ||
        t.includes('సమయం')
    ) {
        return 'The time is ' + new Date().toLocaleTimeString() + ', Boss.';
    }


    // =========================
    // 2. WEATHER
    // =========================
    if (
        t.includes('weather') ||
        t.includes('వాతావరణం')
    ) {
        return await new Promise((resolve) => {

            navigator.geolocation.getCurrentPosition(
                async (position) => {

                    try {
                        const latitude = position.coords.latitude;
                        const longitude = position.coords.longitude;

                        const response = await fetch(
                            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
                        );

                        const data = await response.json();

                        if (
                            !data.current_weather ||
                            typeof data.current_weather.temperature === 'undefined'
                        ) {
                            resolve('Weather data is unavailable, Boss.');
                            return;
                        }

                        resolve(
                            `It is ${data.current_weather.temperature} degrees Celsius now, Boss.`
                        );

                    } catch (error) {
                        resolve('Weather service error, Boss.');
                    }
                },

                () => {
                    resolve(
                        'I need location permission for weather, Boss.'
                    );
                }
            );
        });
    }


    // =========================
    // 3. TIMER
    // =========================
    const match = t.match(
        /(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i
    );

    if (
        (t.includes('timer') || t.includes('టైమర్')) &&
        match
    ) {
        const amount = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        let factor;

        if (/^(hours?|hrs?|h)/.test(unit)) {
            factor = 60 * 60 * 1000;
        } else if (/^(seconds?|secs?|s)/.test(unit)) {
            factor = 1000;
        } else {
            factor = 60 * 1000;
        }

        const duration = amount * factor;

        setTimeout(() => {
            speak(`Timer! ${amount} ${unit} completed.`);
        }, duration);

        return `Timer set for ${amount} ${unit}.`;
    }


    // =========================
    // 4. TRANSLATE
    // =========================
    if (t.includes('translate')) {

        const query =
            text
                .replace(/translate (this )?/i, '')
                .trim() || 'hello';

        try {

            const response = await fetch(
                'https://api.mymemory.translated.net/get?q=' +
                encodeURIComponent(query) +
                '&langpair=en|te'
            );

            const data = await response.json();

            return (
                'In Telugu: ' +
                data.responseData.translatedText
            );

        } catch (error) {

            return 'Translate error, Boss.';
        }
    }


    // =========================
    // 5. YOUTUBE
    // =========================
    if (
        t.includes('play ') ||
        t.includes('youtube ')
    ) {

        const query =
            text
                .replace(/play |youtube (search )?/i, '')
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


    // =========================
    // NO TOOL MATCH
    // =========================
    return null;
}
