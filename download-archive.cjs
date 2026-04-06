const fs = require('fs');

async function downloadFromArchive() {
  try {
    const url = 'https://web.archive.org/web/20230601000000if_/https://westromgroup.com/wp-content/uploads/2023/01/Westrom-Group-Logo.png';
    const response = await fetch(url);
    console.log('Status:', response.status);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      fs.writeFileSync('public/logo.png', Buffer.from(buffer));
      console.log('Saved to public/logo.png');
    } else {
      console.log('Failed:', await response.text());
    }
  } catch (e) {
    console.error(e);
  }
}

downloadFromArchive();
