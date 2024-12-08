document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let gameState = {
        gameId: null,
        players: [],
        host: null,
        currentGame: null
    };

    // Audio elements
    const backgroundMusic = document.getElementById('background-music');
    const volumeControl = document.getElementById('volume-control');
    const uploadMusicBtn = document.getElementById('upload-music-btn');
    const toggleMusicBtn = document.getElementById('toggle-music-btn');
    const musicUpload = document.getElementById('music-upload');

    // Initialize game
    socket.emit('createGame');

    // Socket event handlers
    socket.on('gameCreated', ({ gameId, qrCode }) => {
        gameState.gameId = gameId;
        document.getElementById('qr-code').innerHTML = `<img src="${qrCode}" alt="QR Code">`;
    });

    socket.on('playerJoined', ({ players, host }) => {
        gameState.players = players;
        gameState.host = host;
        updatePlayerList();
    });

    socket.on('playerLeft', ({ players, host }) => {
        gameState.players = players;
        gameState.host = host;
        updatePlayerList();
    });

    socket.on('gameStarted', ({ gameType, gameState: newGameState }) => {
        gameState.currentGame = gameType;
        showGameScreen(gameType, newGameState);
    });

    // Music controls
    uploadMusicBtn.addEventListener('click', () => {
        musicUpload.click();
    });

    musicUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            backgroundMusic.src = url;
            toggleMusicBtn.textContent = 'Play Music';
        }
    });

    toggleMusicBtn.addEventListener('click', () => {
        if (backgroundMusic.paused) {
            backgroundMusic.play();
            toggleMusicBtn.textContent = 'Pause Music';
        } else {
            backgroundMusic.pause();
            toggleMusicBtn.textContent = 'Play Music';
        }
    });

    volumeControl.addEventListener('input', (e) => {
        backgroundMusic.volume = e.target.value;
    });

    // Helper functions
    function updatePlayerList() {
        const playersList = document.getElementById('players');
        playersList.innerHTML = gameState.players
            .map(player => `
                <li class="${player.id === gameState.host ? 'host' : ''}">${player.name}</li>
            `)
            .join('');
    }

    function showGameScreen(gameType, newGameState) {
        document.getElementById('lobby-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        
        const gameContent = document.getElementById('game-content');
        
        if (gameType === 'drawful-whispers') {
            initializeDrawfulWhispers(gameContent, newGameState);
        }
    }

    function initializeDrawfulWhispers(container, gameState) {
        container.innerHTML = `
            <h2>Drawful Whispers</h2>
            <div id="game-status"></div>
            <div id="drawing-area"></div>
            <div id="results-area" style="display: none;"></div>
        `;
    }
});