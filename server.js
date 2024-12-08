require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "blob:"],
            "media-src": ["'self'", "data:", "blob:"],
            "script-src": ["'self'", "'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'"]
        }
    }
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Game state management
const games = new Map();
const MAX_PLAYERS = 8;

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('createGame', async () => {
        const gameId = uuidv4();
        const gameUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/game/${gameId}`;
        
        try {
            const qrCode = await QRCode.toDataURL(gameUrl);
            games.set(gameId, {
                id: gameId,
                players: [],
                status: 'lobby',
                currentGame: null,
                qrCode,
                host: null
            });
            
            socket.join(gameId);
            socket.emit('gameCreated', { gameId, qrCode });
        } catch (error) {
            socket.emit('error', 'Failed to create game');
        }
    });

    socket.on('joinGame', ({ gameId, playerName }) => {
        const game = games.get(gameId);
        
        if (!game) {
            socket.emit('error', 'Game not found');
            return;
        }

        if (game.players.length >= MAX_PLAYERS) {
            socket.emit('error', 'Game is full');
            return;
        }

        const player = {
            id: socket.id,
            name: playerName,
            isHost: game.players.length === 0
        };

        if (player.isHost) {
            game.host = player.id;
        }

        game.players.push(player);
        socket.join(gameId);
        socket.gameId = gameId;
        socket.player = player;

        io.to(gameId).emit('playerJoined', {
            players: game.players,
            host: game.host
        });
    });

    socket.on('startGame', ({ gameId, gameType }) => {
        const game = games.get(gameId);
        
        if (!game || socket.id !== game.host) {
            socket.emit('error', 'Unauthorized');
            return;
        }

        game.status = 'playing';
        game.currentGame = gameType;
        game.gameState = initializeGameState(gameType, game.players);
        
        io.to(gameId).emit('gameStarted', {
            gameType,
            gameState: game.gameState
        });
    });

    socket.on('disconnect', () => {
        if (socket.gameId) {
            const game = games.get(socket.gameId);
            if (game) {
                game.players = game.players.filter(p => p.id !== socket.id);
                
                if (game.host === socket.id && game.players.length > 0) {
                    game.host = game.players[0].id;
                    game.players[0].isHost = true;
                }

                if (game.players.length === 0) {
                    games.delete(socket.gameId);
                } else {
                    io.to(socket.gameId).emit('playerLeft', {
                        players: game.players,
                        host: game.host
                    });
                }
            }
        }
    });
});

function initializeGameState(gameType, players) {
    if (gameType === 'drawful-whispers') {
        return {
            phase: 'initial',
            currentRound: 0,
            drawings: [],
            currentPlayer: 0,
            prompts: [
                'A penguin riding a bicycle',
                'Superhero having a bad day',
                'Pizza making pizza',
                'Dancing vegetables',
                'Time-traveling cat'
                // Add more prompts as needed
            ],
            selectedPrompt: null,
            playerOrder: shuffleArray([...players])
        };
    }
    return {};
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});