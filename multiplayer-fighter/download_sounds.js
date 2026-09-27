const fs = require('fs');
const https = require('https');
const path = require('path');

const sounds = {
    'rasengan_2.mp3': 'https://www.myinstants.com/media/sounds/rasengan_2.mp3',
    'hollow-purple.mp3': 'https://www.myinstants.com/media/sounds/hollow-purple.mp3',
    'sukuna-domain-expansion.mp3': 'https://www.myinstants.com/media/sounds/sukuna-domain-expansion.mp3',
    'luffy-gomu-gomu-no.mp3': 'https://www.myinstants.com/media/sounds/luffy-gomu-gomu-no.mp3',
    'indian-joker.mp3': 'https://www.myinstants.com/media/sounds/indian-joker.mp3',
    'joker.mp3': 'https://www.myinstants.com/media/sounds/joker-laugh_2.mp3', // alternative
    'naruto.mp3': 'https://www.myinstants.com/media/sounds/naruto_rasengan.mp3' // alternative
};

for (const [filename, url] of Object.entries(sounds)) {
    const dest = path.join(__dirname, 'public', filename);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode === 200) {
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => { file.close(); console.log('Downloaded', filename); });
        } else {
            console.log('Failed', filename, res.statusCode);
        }
    }).on('error', (err) => console.log('Error', filename, err.message));
}
