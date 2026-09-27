const { Jimp } = require('jimp');
const path = require('path');

const files = [
    { src: 'C:/Users/shabb/.gemini/antigravity-ide/brain/d6f16c93-9572-4506-bd97-b9faf37f9ca5/goku_full_1790510281391.jpg', dest: 'goku.png' },
    { src: 'C:/Users/shabb/.gemini/antigravity-ide/brain/d6f16c93-9572-4506-bd97-b9faf37f9ca5/vegeta_full_1790510292933.jpg', dest: 'vegeta.png' },
    { src: 'C:/Users/shabb/.gemini/antigravity-ide/brain/d6f16c93-9572-4506-bd97-b9faf37f9ca5/naruto_full_1790510303549.jpg', dest: 'naruto.png' },
    { src: 'C:/Users/shabb/.gemini/antigravity-ide/brain/d6f16c93-9572-4506-bd97-b9faf37f9ca5/gojo_full_1790510312340.jpg', dest: 'gojo.png' },
    { src: 'C:/Users/shabb/.gemini/antigravity-ide/brain/d6f16c93-9572-4506-bd97-b9faf37f9ca5/sukuna_full_1790510323316.jpg', dest: 'sukuna.png' },
    { src: 'C:/Users/shabb/.gemini/antigravity-ide/brain/d6f16c93-9572-4506-bd97-b9faf37f9ca5/luffy_full_1790510334087.jpg', dest: 'luffy.png' }
];

async function processImages() {
    for (const file of files) {
        try {
            const image = await Jimp.read(file.src);
            const tolerance = 240;
            
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
                const r = this.bitmap.data[idx + 0];
                const g = this.bitmap.data[idx + 1];
                const b = this.bitmap.data[idx + 2];
                if (r >= tolerance && g >= tolerance && b >= tolerance) {
                    this.bitmap.data[idx + 3] = 0;
                }
            });
            
            await image.write(path.join(__dirname, 'public', file.dest));
            console.log(`Processed ${file.dest}`);
        } catch (e) {
            console.error(`Error processing ${file.dest}:`, e);
        }
    }
}

processImages();
