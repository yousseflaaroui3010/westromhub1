const https = require('https');
const fs = require('fs');

https.get('https://westromgroup.com', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    // Find logo URL
    const match = data.match(/<img[^>]+src="([^">]+logo[^">]+)"/i) || data.match(/<img[^>]+src="([^">]+)"[^>]*alt="[^"]*logo[^"]*"/i) || data.match(/<img[^>]+src="([^">]+)"/i);
    if (match) {
      console.log('Found URL:', match[1]);
      let url = match[1];
      if (url.startsWith('/')) {
        url = 'https://westromgroup.com' + url;
      }
      https.get(url, (res2) => {
        const file = fs.createWriteStream('public/logo-downloaded.png');
        res2.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Downloaded to public/logo-downloaded.png');
        });
      });
    } else {
      console.log('No logo found');
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
