const https = require('https');

function test(url) {
  console.log('Testing', url);
  https.get(url, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    if (res.statusCode >= 300 && res.statusCode < 400) {
      console.log('Redirecting to:', res.headers.location);
      test(res.headers.location);
    } else {
      let data = '';
      res.on('data', (d) => {
        data += d.toString();
      });
      res.on('end', () => {
        console.log('Body length:', data.length);
        if (data.includes('confirm=')) {
          const match = data.match(/confirm=([a-zA-Z0-9_-]+)/);
          if (match) {
            console.log('Found confirm token:', match[1]);
          } else {
            console.log('No confirm token matched regex');
          }
        }
      });
    }
  });
}

test('https://drive.google.com/uc?export=download&id=1afTvCtPGTpmNeaHGumCtxcSEYSJWN8ZG');
