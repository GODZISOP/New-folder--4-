const https = require('https');
const fs = require('fs');
const path = require('path');

const images = {
    'goku.png': 'https://i.pinimg.com/originals/65/37/ba/6537ba513689f92ad41c45d354b6d4b4.png',
    'vegeta.png': 'https://i.pinimg.com/originals/09/2d/a2/092da2b7a9deef4f1411516e87f87961.png',
    'naruto.png': 'https://i.pinimg.com/originals/5c/aa/d9/5caad9b9222c54f590cc3a817cc28945.png',
    'gojo.png': 'https://i.pinimg.com/originals/24/76/81/247681c19b01be6e1dcbfad18a8027ad.png',
    'sukuna.png': 'https://i.pinimg.com/originals/c8/cc/b1/c8ccb1b016d97c55fc5cc8ad99fa14e7.png',
    'luffy.png': 'https://i.pinimg.com/originals/52/63/07/526307fa940e4e64f7b1e8e50bc5ba3a.png'
};

const publicDir = path.join(__dirname, 'public');

for (const [filename, url] of Object.entries(images)) {
    const dest = path.join(publicDir, filename);
    https.get(url, (res) => {
        if (res.statusCode === 200) {
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => file.close());
        }
    }).on('error', (err) => {
        console.error('Error downloading', filename, err);
    });
}
console.log('Images are downloading...');
