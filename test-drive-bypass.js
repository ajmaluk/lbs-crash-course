const https = require('https');

function fetchWithRedirects(url, options = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
           redirectUrl = new URL(redirectUrl, url).toString();
        }
        resolve(fetchWithRedirects(redirectUrl, options));
      } else {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({
          status: res.statusCode,
          headers: res.headers,
          body
        }));
      }
    }).on('error', reject);
  });
}

async function test() {
  // Use a known large file ID or just test the logic
  const fileId = '10X9x8JmB6f_T4PjFqCg2tJz4R4O3wM2-'; // Some example file, maybe invalid
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  
  const res = await fetchWithRedirects(url);
  console.log('Status:', res.status);
  console.log('Content-Type:', res.headers['content-type']);
  
  if (res.body.includes('confirm=')) {
    console.log('Found confirm token in body!');
    const match = res.body.match(/confirm=([a-zA-Z0-9_-]+)/);
    console.log('Token:', match ? match[1] : 'none');
  } else {
    console.log('No confirm token');
  }
}

test();
