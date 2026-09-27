const yts = require('yt-search');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

const queries = {
    'rizxtar-joker.mp3': 'rizxtar joker sound tu yaad na aaye ignite alan walker',
    'naruto-rasengan.mp3': 'naruto rasengan sound effect short',
    'gojo-hollow-purple.mp3': 'gojo hollow purple sound effect short',
    'sukuna-domain.mp3': 'sukuna domain expansion sound effect short',
    'luffy-gomu.mp3': 'luffy gomu gomu no sound effect short'
};

async function downloadSounds() {
    for (const [filename, query] of Object.entries(queries)) {
        try {
            console.log(`Searching for: ${query}`);
            const r = await yts(query);
            const videos = r.videos;
            if (videos.length > 0) {
                const video = videos[0];
                console.log(`Found: ${video.title} (${video.url})`);
                const dest = path.join(__dirname, 'public', filename);
                
                ytdl(video.url, { filter: 'audioonly' })
                  .pipe(fs.createWriteStream(dest))
                  .on('finish', () => {
                      console.log(`Downloaded ${filename}`);
                  });
            }
        } catch (e) {
            console.error(`Failed ${filename}:`, e.message);
        }
    }
}

downloadSounds();
