
const fileId = "1afTvCtPGTpm4JEVNUovjCx80BAUXH9qP";
const candidates = [
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`,
    `https://drive.google.com/u/0/uc?id=${fileId}&export=download`,
    `https://docs.google.com/uc?id=${fileId}&export=download`,
    `https://docs.google.com/document/d/${fileId}/export?format=pdf`
];

async function test() {
    for (const url of candidates) {
        try {
            console.log(`Testing ${url}...`);
            const res = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
                redirect: 'follow'
            });
            console.log(`Status: ${res.status}`);
            console.log(`Content-Type: ${res.headers.get('content-type')}`);
            if (res.ok && !res.headers.get('content-type').includes('text/html')) {
                console.log(`SUCCESS!`);
            } else if (res.headers.get('content-type').includes('text/html')) {
                const text = await res.text();
                if (text.includes('confirm=')) {
                    console.log(`Bypass token found!`);
                } else {
                    console.log(`HTML returned but no bypass token.`);
                }
            }
            console.log('---');
        } catch (err) {
            console.log(`Error: ${err.message}`);
        }
    }
}

test();
