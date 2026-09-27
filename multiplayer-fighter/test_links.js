const https = require('https');
const fs = require('fs');
const urls = [
    'https://www.pngmart.com/files/13/Goku-Transparent-Background.png',
    'https://www.pngmart.com/files/13/Vegeta-PNG-HD.png',
    'https://www.pngmart.com/files/13/Naruto-Shippuden-PNG-Transparent.png',
    'https://www.pngmart.com/files/22/Jujutsu-Kaisen-Gojo-PNG.png',
    'https://www.pngmart.com/files/22/Jujutsu-Kaisen-Sukuna-PNG.png',
    'https://www.pngmart.com/files/13/Luffy-PNG-HD.png'
];
urls.forEach(url => {
    https.get(url, res => {
        console.log(url, res.statusCode);
    }).on('error', e => console.log(url, e.message));
});
