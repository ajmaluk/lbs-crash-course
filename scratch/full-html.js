
const fileId = "1afTvCtPGTpm4JEVNUovjCx80BAUXH9qP";
const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

async function test() {
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        redirect: 'follow'
    });
    const text = await res.text();
    console.log(text);
}

test();
