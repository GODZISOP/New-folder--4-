const socket = (typeof io !== 'undefined') ? io() : null;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const menuScreen = document.getElementById('menu-screen');
const gameContainer = document.getElementById('game-container');
const gameOverScreen = document.getElementById('game-over-screen');
const joinBtn = document.getElementById('joinBtn');
const singlePlayerBtn = document.getElementById('singlePlayerBtn');
const diffSelect = document.getElementById('difficulty');
const nameInput = document.getElementById('playerName');
const roomInput = document.getElementById('roomId');
const errorMsg = document.getElementById('errorMsg');
const hp1 = document.getElementById('hp1');
const hp2 = document.getElementById('hp2');
const name1 = document.getElementById('name1');
const name2 = document.getElementById('name2');
const winnerText = document.getElementById('winner-text');
const charGrid = document.getElementById('charGrid');

// --- ANIME CHARACTER DATA ---
const CHARACTERS = {
    'goku': { name: 'Goku', color: '#ff6600', powerName: 'Kamehameha', pColor: '#00ffff', pSpeed: 20, pSize: 15, pDamage: 25, imgUrl: 'goku.png', pType: 'beam', audioUrl: 'https://www.myinstants.com/media/sounds/kamehameha.mp3' },
    'vegeta': { name: 'Vegeta', color: '#0000ff', powerName: 'Final Flash', pColor: '#ffff00', pSpeed: 25, pSize: 10, pDamage: 20, imgUrl: 'vegeta.png', pType: 'beam', audioUrl: 'https://www.myinstants.com/media/sounds/vegeta-final-flash.mp3' },
    'naruto': { name: 'Naruto', color: '#ff9900', powerName: 'Rasengan', pColor: '#66ccff', pSpeed: 15, pSize: 20, pDamage: 30, imgUrl: 'naruto.png', pType: 'sphere', audioUrl: 'https://www.myinstants.com/media/sounds/naruto-rasengan-sound-effect.mp3' },
    'gojo': { name: 'Gojo', color: '#6600cc', powerName: 'Hollow Purple', pColor: '#9900ff', pSpeed: 10, pSize: 35, pDamage: 40, imgUrl: 'gojo.png', pType: 'sphere', audioUrl: 'https://www.myinstants.com/media/sounds/gojo-hollow-purple.mp3' },
    'sukuna': { name: 'Sukuna', color: '#cc0000', powerName: 'Cleave', pColor: '#ff0000', pSpeed: 35, pSize: 5, pDamage: 15, imgUrl: 'sukuna.png', pType: 'slash', audioUrl: 'https://www.myinstants.com/media/sounds/sukuna-domain-expansion-2.mp3' },
    'luffy': { name: 'Luffy', color: '#ff3333', powerName: 'Gum Gum Pistol', pColor: '#ffcccc', pSpeed: 18, pSize: 12, pDamage: 22, imgUrl: 'luffy.png', pType: 'fist', audioUrl: 'https://www.myinstants.com/media/sounds/gomu-gomu-no.mp3' },
    'kalahonth': { name: 'Kalahonth', color: '#800080', powerName: 'Viral Joker Face', pColor: '#000000', pSpeed: 12, pSize: 40, pDamage: 50, imgUrl: 'kalahonth.png', pType: 'lips', audioUrl: 'https://www.myinstants.com/media/sounds/saari-umar-main-joker.mp3' }
};

let selectedChar = 'goku'; // default

// Build Character Selection UI
for (let key in CHARACTERS) {
    const box = document.createElement('div');
    box.className = 'char-box';
    if(key === selectedChar) box.classList.add('selected');
    box.style.backgroundImage = `url(${CHARACTERS[key].imgUrl})`;
    box.title = CHARACTERS[key].name;
    box.onclick = () => {
        document.querySelectorAll('.char-box').forEach(b => b.classList.remove('selected'));
        box.classList.add('selected');
        selectedChar = key;
        
        // Update big preview image on screen
        document.getElementById('charPreviewImg').src = CHARACTERS[key].imgUrl;
        document.getElementById('charPreviewImg').style.filter = `drop-shadow(0 0 15px ${CHARACTERS[key].color})`;
        const nameEl = document.getElementById('charPreviewName');
        nameEl.innerText = CHARACTERS[key].name;
        nameEl.style.color = CHARACTERS[key].color;
        
        // Play character's signature sound upon selection
        playVoice(key);
    };
    charGrid.appendChild(box);
}

// Preload Character Images for Canvas
const loadedImages = {};
for (let key in CHARACTERS) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = CHARACTERS[key].imgUrl;
    loadedImages[key] = img;
}

let players = {};
let myId = null;
let cpuId = 'cpu1';
let isSinglePlayer = false;
let cpuDifficulty = 'easy';
let bgImage = new Image();
bgImage.src = 'bg.jpg';
let lipsImage = new Image();
lipsImage.src = 'lips.png';

let fireballs = [];
let particles = [];
let screenShake = 0;

const GRAVITY = 0.8;
const JUMP_POWER = -16;
const SPEED = 7;
const DASH_SPEED = 20;
const FLOOR_Y = 500;

const keys = { w: false, a: false, d: false, space: false, f: false, shift: false };
let velocityY = 0;
let isJumping = false;
let cpuVelocityY = 0;
let cpuIsJumping = false;
let isDashing = false;
let dashTime = 0;
let lastPunchTime = 0;
let lastFireballTime = 0;
let gameActive = false;

// ---- AUDIO SYSTEM (Retro Synth) ----
let audioCtx;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type, charKey) {
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    
    if (type === 'punch') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gain.gain.setValueAtTime(0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'power') {
        // Different sound based on character
        if(charKey === 'gojo') {
            osc.type = 'square'; osc.frequency.setValueAtTime(50, now); osc.frequency.linearRampToValueAtTime(300, now + 0.5);
            gain.gain.setValueAtTime(0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        } else if (charKey === 'sukuna') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        } else {
            // Goku / Default
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(100, now + 0.4);
            gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        }
        osc.start(now); osc.stop(now + 0.5);
    } else if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);
        gain.gain.setValueAtTime(1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'blast') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(10, now + 0.4);
        gain.gain.setValueAtTime(0.6, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        // Add a bit of noise
        const bufferSize = audioCtx.sampleRate * 0.4; 
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 1000;
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(1, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noise.start(now);
        
        osc.start(now); osc.stop(now + 0.4);
    }
}

// Join Logic
joinBtn.addEventListener('click', () => {
    initAudio();
    isSinglePlayer = false;
    const roomId = roomInput.value.trim();
    if (!roomId) { errorMsg.innerText = "Please enter a Room ID!"; return; }
    socket.emit('joinRoom', { roomId, playerName: nameInput.value.trim(), characterKey: selectedChar });
});

singlePlayerBtn.addEventListener('click', () => {
    initAudio();
    isSinglePlayer = true;
    cpuDifficulty = diffSelect.value;
    myId = 'player1';
    
    // Pick random CPU character
    const charKeys = Object.keys(CHARACTERS);
    const randomChar = charKeys[Math.floor(Math.random() * charKeys.length)];
    
    players = {
        [myId]: { id: myId, name: nameInput.value.trim() || 'You', character: selectedChar, x: 100, y: FLOOR_Y - 150, width: 60, height: 150, health: 100, facingRight: true, isAttacking: false },
        [cpuId]: { id: cpuId, name: 'CPU', character: randomChar, x: 700, y: FLOOR_Y - 150, width: 60, height: 150, health: 100, facingRight: false, isAttacking: false }
    };
    
    menuScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    gameActive = true;
    updateHUD();
});

if (socket) {
    socket.on('connect', () => { myId = socket.id; });
    socket.on('roomFull', () => { errorMsg.innerText = "Room is full!"; });
    
    socket.on('currentPlayers', (serverPlayers) => {
        players = serverPlayers;
        menuScreen.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        gameActive = true;
        updateHUD();
    });
}

if (socket) {
    socket.on('newPlayer', (player) => { players[player.id] = player; updateHUD(); });

    socket.on('playerMoved', (pData) => {
        if (players[pData.id]) {
            players[pData.id].x = pData.x;
            players[pData.id].y = pData.y;
            players[pData.id].facingRight = pData.facingRight;
        }
    });

    socket.on('playerAttacked', (id) => {
        if (players[id]) {
            playSound('punch');
            players[id].isAttacking = true;
            setTimeout(() => { if (players[id]) players[id].isAttacking = false; }, 200);
        }
    });

    socket.on('playerHit', (data) => {
        if (players[data.id]) {
            players[data.id].health = data.health;
            screenShake = 15;
            playSound('hit');
            createParticles(players[data.id].x + 25, players[data.id].y + 50, CHARACTERS[players[data.id].character].color);
            updateHUD();
            checkWinCondition();
        }
    });
}

const playerVoices = {};

function playVoice(charKey) {
    const char = CHARACTERS[charKey];
    if (char && char.audioUrl) {
        // Interrupt ALL previous voice lines to prevent overlapping when switching characters quickly
        for (let key in playerVoices) {
            if (playerVoices[key]) {
                playerVoices[key].pause();
                playerVoices[key].currentTime = 0;
            }
        }
        
        let audio = new Audio(char.audioUrl);
        audio.volume = 1.0;
        audio.playbackRate = 1.3; // Make them shout faster to match game speed!
        playerVoices[charKey] = audio;
        
        audio.play().catch(e => {
            // Fallback: Shout the attack name if MP3 fails
            window.speechSynthesis.cancel();
            let text = char.powerName + "!";
            if(charKey === 'kalahonth') text = "Ha ha ha ha ha ha!";
            let utterance = new SpeechSynthesisUtterance(text);
            utterance.pitch = (charKey === 'kalahonth' || charKey === 'sukuna') ? 0.5 : 1.5;
            utterance.rate = 1.2;
            window.speechSynthesis.speak(utterance);
        });
    } else {
        playSound('power', charKey);
    }
}

socket.on('fireballShot', (fb) => { 
    playVoice(fb.charKey);
    fireballs.push(fb); 
});

socket.on('playerDisconnected', (id) => {
    delete players[id];
    updateHUD();
});

// Keyboard Input
window.addEventListener('keydown', (e) => {
    if(!gameActive) return;
    const k = e.key.toLowerCase();
    if (k === 'w') keys.w = true;
    if (k === 'a') keys.a = true;
    if (k === 'd') keys.d = true;
    if (k === 'shift') { if(!keys.shift && !isDashing) dash(); keys.shift = true; }
    if (k === 'f') { if (!keys.f) punch(); keys.f = true; }
    if (k === ' ') { if (!keys.space) shootFireball(); keys.space = true; }
});
window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w') keys.w = false;
    if (k === 'a') keys.a = false;
    if (k === 'd') keys.d = false;
    if (k === 'shift') keys.shift = false;
    if (k === 'f') keys.f = false;
    if (k === ' ') keys.space = false;
});

// Touch Controls
function bindTouch(btnId, keyName) {
    const btn = document.getElementById(btnId);
    if(btn) {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; if(keyName==='f') punch(); if(keyName==='space') shootFireball(); if(keyName==='shift') dash(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; });
    }
}
bindTouch('btn-left', 'a'); bindTouch('btn-right', 'd'); bindTouch('btn-jump', 'w');
bindTouch('btn-punch', 'f'); bindTouch('btn-fireball', 'space'); bindTouch('btn-dash', 'shift');

function punch() {
    const now = Date.now();
    if (now - lastPunchTime > 400 && players[myId] && players[myId].health > 0) {
        lastPunchTime = now;
        players[myId].isAttacking = true;
        playSound('punch');
        setTimeout(() => { if(players[myId]) players[myId].isAttacking = false; }, 200);
        
        if (isSinglePlayer) {
            const p = players[myId];
            const p2 = players[cpuId];
            if (p2 && p2.health > 0) {
                const attRange = 70;
                const attX = p.facingRight ? p.x + p.width : p.x - attRange;
                if (attX < p2.x + p2.width && attX + attRange > p2.x && p.y < p2.y + p2.height && p.y + 15 > p2.y) {
                    players[cpuId].health -= 10;
                    playSound('hit');
                    createParticles(p2.x + 30, p2.y + 50, '#ff0000', 5);
                    if (players[cpuId].health <= 0) setTimeout(() => checkWinCondition(), 500);
                }
            }
        } else {
            socket.emit('playerAttack');
        }
    }
}

function shootFireball() {
    const now = Date.now();
    if (now - lastFireballTime > 1000 && players[myId] && players[myId].health > 0) {
        lastFireballTime = now;
        const p = players[myId];
        const charData = CHARACTERS[p.character];
        
        const fb = {
            x: p.facingRight ? p.x + p.width : p.x - charData.pSize,
            y: p.y + p.height / 2 - (charData.pSize/2),
            vx: p.facingRight ? charData.pSpeed : -charData.pSpeed,
            owner: myId,
            color: charData.pColor,
            size: charData.pSize,
            damage: isSinglePlayer ? 20 : charData.pDamage, // 20 damage = 5 hits to kill
            charKey: p.character,
            pType: charData.pType,
            life: 1
        };
        fireballs.push(fb);
        playSound('blast');
        if (!isSinglePlayer) socket.emit('shootFireball', fb);
    }
}

function dash() {
    if (isDashing) return;
    isDashing = true; dashTime = 12;
}

function updateLocalPlayer() {
    if (!myId || !players[myId] || players[myId].health <= 0) return;
    const p = players[myId];
    let moved = false;

    let currentSpeed = SPEED;
    if (isDashing) {
        currentSpeed = DASH_SPEED;
        dashTime--;
        if(dashTime <= 0) isDashing = false;
        createParticles(p.x+25, p.y+50, CHARACTERS[p.character].color, 2);
    }

    if (keys.a) { p.x -= currentSpeed; p.facingRight = false; moved = true; }
    if (keys.d) { p.x += currentSpeed; p.facingRight = true; moved = true; }

    if (p.x < 0) p.x = 0;
    if (p.x + p.width > canvas.width) p.x = canvas.width - p.width;

    if (keys.w && !isJumping) {
        velocityY = JUMP_POWER; isJumping = true; moved = true;
        playSound('jump');
        createParticles(p.x+25, p.y+100, '#fff', 5);
    }

    velocityY += GRAVITY; p.y += velocityY;

    if (p.y + p.height >= FLOOR_Y) {
        p.y = FLOOR_Y - p.height; velocityY = 0; isJumping = false;
    } else { moved = true; }

    if (moved && !isSinglePlayer) socket.emit('playerMovement', { x: p.x, y: p.y, facingRight: p.facingRight });
}

function updateCPU() {
    if (!isSinglePlayer || !players[cpuId] || players[cpuId].health <= 0) return;
    const cpu = players[cpuId];
    const p1 = players[myId];
    if (!p1 || p1.health <= 0) return;

    let dist = p1.x - cpu.x;
    let speed = SPEED * 0.4;
    let safeDistance = 0;
    let fireRate = 0.005;
    let punchRate = 0.002;

    if (cpuDifficulty === 'intermediate') { speed = SPEED * 0.7; fireRate = 0.015; punchRate = 0.008; }
    if (cpuDifficulty === 'hard') { speed = SPEED * 1.1; safeDistance = 250; fireRate = 0.04; punchRate = 0.03; } 

    // Always face player
    cpu.facingRight = dist > 0;

    // Movement Logic
    if (Math.abs(dist) < safeDistance) {
        // Player is too close, back away!
        cpu.x += cpu.facingRight ? -speed : speed;
    } else if (Math.abs(dist) > 500) {
        // Player is too far, move closer
        cpu.x += cpu.facingRight ? speed : -speed;
    }

    // Attacks (can happen while moving)
    const cpuHasFireball = fireballs.some(f => f.owner === cpuId);
    if (!cpuHasFireball && Math.random() < fireRate) {
        const charData = CHARACTERS[cpu.character];
        const fb = {
            x: cpu.facingRight ? cpu.x + cpu.width : cpu.x - charData.pSize,
            y: cpu.y + cpu.height / 2 - (charData.pSize/2),
            vx: cpu.facingRight ? charData.pSpeed : -charData.pSpeed,
            owner: cpuId, color: charData.pColor, size: charData.pSize, damage: 20,
            charKey: cpu.character, pType: charData.pType, life: 1
        };
        fireballs.push(fb);
        playSound('blast');
    }
    
    if (Math.random() < punchRate && Math.abs(dist) < 150) {
            cpu.isAttacking = true;
            playSound('punch');
            setTimeout(() => { if(players[cpuId]) players[cpuId].isAttacking = false; }, 200);
            const attRange = 70;
            const attX = cpu.facingRight ? cpu.x + cpu.width : cpu.x - attRange;
            if (attX < p1.x + p1.width && attX + attRange > p1.x && cpu.y < p1.y + p1.height && cpu.y + 15 > p1.y) {
                players[myId].health -= 10;
                playSound('hit');
                createParticles(p1.x + 30, p1.y + 50, '#ff0000', 5);
                if(players[myId].health <= 0) setTimeout(() => checkWinCondition(), 500);
            }
        }

    // CPU Jump Logic
    if (!cpuIsJumping && Math.random() < 0.015) {
        cpuVelocityY = JUMP_POWER;
        cpuIsJumping = true;
    }
    
    cpuVelocityY += GRAVITY;
    cpu.y += cpuVelocityY;
    if (cpu.y + cpu.height >= FLOOR_Y) {
        cpu.y = FLOOR_Y - cpu.height;
        cpuVelocityY = 0;
        cpuIsJumping = false;
    }

    if (cpu.x < 0) cpu.x = 0;
    if (cpu.x + cpu.width > canvas.width) cpu.x = canvas.width - cpu.width;
}

function updateProjectilesAndParticles() {
    for (let i = fireballs.length - 1; i >= 0; i--) {
        let fb = fireballs[i];
        fb.x += fb.vx;
        
        if (isSinglePlayer) {
            for (let id in players) {
                let p = players[id];
                if (id !== fb.owner && p.health > 0) {
                    if (fb.x + fb.size > p.x && fb.x < p.x + p.width && fb.y + fb.size > p.y && fb.y < p.y + p.height) {
                        p.health -= fb.damage;
                        if (p.health < 0) p.health = 0;
                        fb.life = 0;
                        playSound('hit');
                        createParticles(fb.x, fb.y, fb.color, 15);
                        if (p.health <= 0) setTimeout(() => checkWinCondition(), 500);
                        fireballs.splice(i, 1);
                        break;
                    }
                }
            }
        } else {
            if (fb.owner !== myId && players[myId] && players[myId].health > 0) {
                const p = players[myId];
                if (fb.x + fb.size > p.x && fb.x < p.x + p.width && fb.y + fb.size > p.y && fb.y < p.y + p.height) {
                    socket.emit('fireballHit', { targetId: myId, damage: fb.damage });
                    playSound('hit');
                    createParticles(fb.x, fb.y, fb.color, 15);
                    fireballs.splice(i, 1); continue;
                }
            }
        }
        
        if (fb.x < 0 || fb.x > canvas.width) fireballs.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let pt = particles[i];
        pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.05;
        if (pt.life <= 0) particles.splice(i, 1);
    }
}

function createParticles(x, y, color, count=15) {
    for(let i=0; i<count; i++) {
        particles.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 1, color });
    }
}

function updateHUD() {
    const ids = Object.keys(players);
    if(ids[0]) {
        const p1 = players[ids[0]];
        const c1 = CHARACTERS[p1.character];
        name1.innerText = `${p1.name} (${c1.name})`;
        name1.style.color = c1.color;
        hp1.style.width = p1.health + '%';
        hp1.style.background = c1.color;
        hp1.style.boxShadow = `0 0 15px ${c1.color}`;
    }
    if(ids[1]) {
        const p2 = players[ids[1]];
        const c2 = CHARACTERS[p2.character];
        name2.innerText = `${p2.name} (${c2.name})`;
        name2.style.color = c2.color;
        hp2.style.width = p2.health + '%';
        hp2.style.background = c2.color;
        hp2.style.boxShadow = `0 0 15px ${c2.color}`;
    } else {
        name2.innerText = "Waiting for Player 2..."; hp2.style.width = '100%'; hp2.style.background = 'grey'; hp2.style.boxShadow = 'none';
    }
}

function checkWinCondition() {
    let aliveCount = 0; let winnerName = "";
    for(let id in players) {
        if(players[id].health > 0) { aliveCount++; winnerName = players[id].name + " (" + CHARACTERS[players[id].character].name + ")"; }
    }
    if (Object.keys(players).length === 2 && aliveCount === 1) {
        gameActive = false;
        setTimeout(() => {
            gameOverScreen.classList.remove('hidden');
            winnerText.innerText = winnerName.toUpperCase() + " WINS!";
        }, 1000);
    }
}

function draw() {
    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake -= 1;
    }

    if (bgImage.complete && bgImage.naturalHeight !== 0) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#050510'; ctx.fillRect(0,0,canvas.width, canvas.height);
    }

    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.fillRect(0, FLOOR_Y, canvas.width, canvas.height - FLOOR_Y);
    ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(canvas.width, FLOOR_Y);
    ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = '#0ff';
    ctx.stroke(); ctx.shadowBlur = 0;

    for (let id in players) {
        const p = players[id];
        if (p.health <= 0) continue;
        const charData = CHARACTERS[p.character];
        const img = loadedImages[p.character];

        ctx.shadowBlur = 20; ctx.shadowColor = charData.color; ctx.fillStyle = charData.color;
        
        // Draw image or fallback box
        if(img && img.complete && img.naturalHeight !== 0) {
            // Flip the image if facing left
            if (!p.facingRight) {
                ctx.scale(-1, 1);
                ctx.drawImage(img, -p.x - p.width, p.y, p.width, p.height);
                ctx.scale(-1, 1);
            } else {
                ctx.drawImage(img, p.x, p.y, p.width, p.height);
            }
        } else {
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.fillStyle = 'white'; ctx.shadowBlur = 0;
            const eyeX = p.facingRight ? p.x + 25 : p.x + 5;
            ctx.fillRect(eyeX, p.y + 15, 20, 8);
        }
        
        ctx.fillStyle = 'white'; ctx.shadowBlur = 0;
        if (p.isAttacking) {
            ctx.shadowBlur = 15; ctx.shadowColor = 'white'; ctx.fillStyle = 'white';
            const attRange = 70;
            const attX = p.facingRight ? p.x + p.width : p.x - attRange;
            ctx.fillRect(attX, p.y + 20, attRange, 15);
            ctx.shadowBlur = 0;
        }
    }

    fireballs.forEach(fb => {
        ctx.shadowBlur = 20; ctx.shadowColor = fb.color; ctx.fillStyle = '#fff';
        ctx.beginPath();
        if (fb.pType === 'beam') {
            // A long fast laser beam (Kamehameha / Final Flash)
            const length = 150;
            const beamX = fb.vx > 0 ? fb.x - length : fb.x;
            ctx.fillStyle = '#fff';
            ctx.fillRect(beamX, fb.y, length + fb.size, fb.size);
            // Core
            ctx.shadowBlur = 0; ctx.fillStyle = fb.color;
            ctx.fillRect(beamX, fb.y + 4, length + fb.size, fb.size - 8);
        } else if (fb.pType === 'slash') {
            // A sharp crescent slash (Sukuna Cleave)
            ctx.arc(fb.x + fb.size/2, fb.y + fb.size/2, fb.size * 2, fb.vx > 0 ? -Math.PI/2 : Math.PI/2, fb.vx > 0 ? Math.PI/2 : -Math.PI/2, false);
            ctx.strokeStyle = fb.color; ctx.lineWidth = 5; ctx.stroke();
        } else if (fb.pType === 'fist') {
            // A stretched fist (Luffy)
            ctx.fillStyle = '#ffcc99'; // Skin color
            ctx.fillRect(fb.vx > 0 ? fb.x - 80 : fb.x, fb.y + 2, 80 + fb.size, fb.size - 4);
            ctx.fillStyle = fb.color; // Red outline
            ctx.arc(fb.x + (fb.vx > 0 ? fb.size : 0), fb.y + fb.size/2, fb.size, 0, Math.PI*2);
            ctx.fill();
        } else if (fb.pType === 'lips') {
            // Big Black Lips Image (Kalahonth)
            ctx.shadowColor = '#800080'; // Purple aura
            const w = fb.size * 2.5;
            const h = fb.size * 1.5;
            if (lipsImage.complete && lipsImage.naturalHeight !== 0) {
                // Flip image if moving left
                if (fb.vx < 0) {
                    ctx.scale(-1, 1);
                    ctx.drawImage(lipsImage, -fb.x - w, fb.y - h/2, w, h);
                    ctx.scale(-1, 1);
                } else {
                    ctx.drawImage(lipsImage, fb.x, fb.y - h/2, w, h);
                }
            } else {
                ctx.fillStyle = '#000000'; // fallback
                ctx.fillRect(fb.x, fb.y, w, h);
            }
        } else {
            // Sphere (Rasengan / Hollow Purple)
            ctx.arc(fb.x + fb.size/2, fb.y + fb.size/2, fb.size, 0, Math.PI*2); 
            ctx.fill(); 
        }
        ctx.shadowBlur = 0;
    });

    particles.forEach(pt => {
        ctx.globalAlpha = pt.life; ctx.fillStyle = pt.color; ctx.fillRect(pt.x, pt.y, 4, 4);
    });
    ctx.globalAlpha = 1.0;

    ctx.restore();
}

function gameLoop() {
    if(gameActive) { 
        updateLocalPlayer(); 
        updateCPU();
        updateProjectilesAndParticles(); 
        if(isSinglePlayer) updateHUD();
    }
    draw(); requestAnimationFrame(gameLoop);
}

function checkWinCondition() {
    if (!isSinglePlayer) return;
    if (players[myId] && players[myId].health <= 0) {
        gameOverScreen.classList.remove('hidden');
        winnerText.innerText = 'YOU LOSE!';
        winnerText.style.color = '#ff0000';
        gameActive = false;
    } else if (players[cpuId] && players[cpuId].health <= 0) {
        gameOverScreen.classList.remove('hidden');
        winnerText.innerText = 'YOU WIN!';
        winnerText.style.color = '#00ff00';
        gameActive = false;
    }
}

requestAnimationFrame(gameLoop);
