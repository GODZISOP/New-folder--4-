const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const rooms = {}; 
const FLOOR_Y = 500;

io.on('connection', (socket) => {
    
    socket.on('joinRoom', ({ roomId, playerName, characterKey }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: {} };
        }
        
        if (Object.keys(rooms[roomId].players).length >= 2) {
            socket.emit('roomFull');
            return;
        }

        socket.join(roomId);
        socket.roomId = roomId;

        const isPlayer1 = Object.keys(rooms[roomId].players).length === 0;
        
        rooms[roomId].players[socket.id] = {
            id: socket.id,
            name: playerName || (isPlayer1 ? 'Player 1' : 'Player 2'),
            character: characterKey || 'goku',
            x: isPlayer1 ? 200 : 650,
            y: FLOOR_Y - 200,
            width: 90,
            height: 200,
            health: 100,
            energy: 100,
            isAttacking: false,
            isCharging: false,
            facingRight: isPlayer1,
            isDead: false
        };
        
        socket.emit('currentPlayers', rooms[roomId].players);
        socket.to(roomId).emit('newPlayer', rooms[roomId].players[socket.id]);
    });

    socket.on('playerMovement', (movementData) => {
        const roomId = socket.roomId;
        if (roomId && rooms[roomId] && rooms[roomId].players[socket.id]) {
            const p = rooms[roomId].players[socket.id];
            p.x = movementData.x;
            p.y = movementData.y;
            p.facingRight = movementData.facingRight;
            socket.to(roomId).emit('playerMoved', p);
        }
    });

    socket.on('playerAttack', () => {
        const roomId = socket.roomId;
        if (roomId && rooms[roomId] && rooms[roomId].players[socket.id]) {
            const attacker = rooms[roomId].players[socket.id];
            attacker.isAttacking = true;
            socket.to(roomId).emit('playerAttacked', socket.id);
            
            const attackRange = 70;
            const attackBox = {
                x: attacker.facingRight ? attacker.x + attacker.width : attacker.x - attackRange,
                y: attacker.y + 20,
                width: attackRange,
                height: 40
            };

            for (let id in rooms[roomId].players) {
                if (id !== socket.id) {
                    const target = rooms[roomId].players[id];
                    if (target.health <= 0) continue;

                    if (
                        attackBox.x < target.x + target.width &&
                        attackBox.x + attackBox.width > target.x &&
                        attackBox.y < target.y + target.height &&
                        attackBox.y + attackBox.height > target.y
                    ) {
                        target.health -= 10;
                        if (target.health <= 0) target.health = 0;
                        io.to(roomId).emit('playerHit', { id: target.id, health: target.health });
                    }
                }
            }

            setTimeout(() => {
                if (rooms[roomId] && rooms[roomId].players[socket.id]) {
                    rooms[roomId].players[socket.id].isAttacking = false;
                }
            }, 200);
        }
    });
    
    socket.on('shootFireball', (fireball) => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit('fireballShot', fireball);
        }
    });

    socket.on('fireballHit', (data) => {
        const roomId = socket.roomId;
        const targetId = data.targetId;
        const damage = data.damage || 10;
        
        if (roomId && rooms[roomId] && rooms[roomId].players[targetId]) {
             const target = rooms[roomId].players[targetId];
             if(target.health > 0) {
                 target.health -= damage;
                 if (target.health <= 0) target.health = 0;
                 io.to(roomId).emit('playerHit', { id: target.id, health: target.health });
             }
        }
    });

    socket.on('disconnect', () => {
        const roomId = socket.roomId;
        if (roomId && rooms[roomId]) {
            delete rooms[roomId].players[socket.id];
            io.to(roomId).emit('playerDisconnected', socket.id);
            if (Object.keys(rooms[roomId].players).length === 0) {
                delete rooms[roomId];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
