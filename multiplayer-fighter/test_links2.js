const https = require('https');
const urls = [
    'https://freepngimg.com/download/dragon_ball/60456-goku-ball-super-saiyan-dragon-vegeta-fighterz.png',
    'https://freepngimg.com/download/vegeta/1-2-vegeta-transparent.png',
    'https://freepngimg.com/download/naruto/6-2-naruto-transparent.png'
];
urls.forEach(url => {
    https.get(url, res => {
        console.log(url, res.statusCode);
    }).on('error', e => console.log(url, e.message));
});
