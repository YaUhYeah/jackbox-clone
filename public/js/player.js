document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let playerState = {
        gameId: null,
        playerId: null,
        isHost: false,
        currentGame: null,
        isDrawing: false
    };

    // Get gameId from URL
    const urlParams = new URLSearchParams(window.location.search);
    playerState.gameId = urlParams.get('id');

    // DOM Elements
    const joinForm = document.getElementById('join-form');
    const hostControls = document.getElementById('host-controls');
    const startGameBtn = document.getElementById('start-game-btn');
    const gameSelect = document.getElementById('game-select');
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    const colorPicker = document.getElementById('color-picker');
    const brushSize = document.getElementById('brush-size');
    const clearCanvasBtn = document.getElementById('clear-canvas');
    const submitDrawingBtn = document.getElementById('submit-drawing');

    // Canvas setup
    function setupCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    // Drawing state
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // Join game handler
    joinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const playerName = document.getElementById('player-name').value;
        socket.emit('joinGame', { gameId: playerState.gameId, playerName });
    });

    // Start game handler
    startGameBtn.addEventListener('click', () => {
        const gameType = gameSelect.value;
        socket.emit('startGame', { 
            gameId: playerState.gameId,
            gameType
        });
    });

    // Drawing handlers
    function startDrawing(e) {
        isDrawing = true;
        [lastX, lastY] = getDrawingCoordinates(e);
    }

    function draw(e) {
        if (!isDrawing || !playerState.isDrawing) return;
        e.preventDefault();

        const [x, y] = getDrawingCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = colorPicker.value;
        ctx.lineWidth = brushSize.value;
        ctx.stroke();
        [lastX, lastY] = [x, y];
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function getDrawingCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        return [x, y];
    }

    // Canvas event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    clearCanvasBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    submitDrawingBtn.addEventListener('click', () => {
        const drawingData = canvas.toDataURL();
        socket.emit('submitDrawing', {
            gameId: playerState.gameId,
            drawing: drawingData
        });
    });

    // Socket event handlers
    socket.on('connect', () => {
        playerState.playerId = socket.id;
    });

    socket.on('playerJoined', ({ players, host }) => {
        const player = players.find(p => p.id === socket.id);
        if (player) {
            playerState.isHost = player.isHost;
            showScreen('waiting-screen');
            if (player.isHost) {
                hostControls.style.display = 'block';
            }
        }
    });

    socket.on('gameStarted', ({ gameType, gameState }) => {
        playerState.currentGame = gameType;
        showScreen('game-screen');
        setupCanvas();
        
        if (gameType === 'drawful-whispers') {
            handleDrawfulWhispersState(gameState);
        }
    });

    socket.on('yourTurnToDraw', ({ prompt }) => {
        playerState.isDrawing = true;
        document.getElementById('prompt-display').textContent = prompt;
        document.getElementById('drawing-container').style.display = 'block';
    });

    socket.on('showResults', ({ rounds }) => {
        showScreen('results-screen');
        displayResults(rounds);
    });

    // Helper functions
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    function handleDrawfulWhispersState(gameState) {
        // Handle different game states for Drawful Whispers
        if (gameState.currentPlayer === playerState.playerId) {
            playerState.isDrawing = true;
            document.getElementById('drawing-container').style.display = 'block';
        } else {
            playerState.isDrawing = false;
            document.getElementById('drawing-container').style.display = 'none';
        }
    }

    function displayResults(rounds) {
        const resultsContent = document.getElementById('results-content');
        resultsContent.innerHTML = rounds.map((round, index) => `
            <div class="result-round">
                <h3>Round ${index + 1}</h3>
                <p>Original Prompt: ${round.prompt}</p>
                <div class="drawings-chain">
                    ${round.drawings.map((drawing, i) => `
                        <div class="drawing-entry">
                            <p>Player: ${drawing.playerName}</p>
                            <img src="${drawing.data}" alt="Drawing ${i + 1}">
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // Initial setup
    setupCanvas();
});