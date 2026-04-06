const https = require('https');
const fs = require('fs');

https.get('https://westromgroup.com', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const matches = data.match(/<img[^>]+src="([^">]+)"/gi);
    console.log(matches ? matches.slice(0, 10) : 'none');
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
