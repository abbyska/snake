class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        // Game state
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameOver = false;
        
        // Snake properties
        this.snake = [{x: 10, y: 10}];
        this.dx = 0;
        this.dy = 0;
        this.nextDx = 0;
        this.nextDy = 0;
        
        // Food properties
        this.food = this.generateFood();
        
        // Scoring
        this.score = 0;
        this.highScore = localStorage.getItem('snakeHighScore') || 0;
        
        // Speed settings
        this.speeds = {
            slow: 150,
            normal: 100,
            fast: 70,
            insane: 40
        };
        this.currentSpeed = this.speeds.normal;
        
        // UI elements
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.overlay = document.getElementById('gameOverlay');
        this.overlayTitle = document.getElementById('overlayTitle');
        this.overlayMessage = document.getElementById('overlayMessage');
        this.startButton = document.getElementById('startButton');
        this.pauseButton = document.getElementById('pauseButton');
        this.restartButton = document.getElementById('restartButton');
        this.difficultySelect = document.getElementById('difficulty');
        
        this.initializeGame();
        this.setupEventListeners();
        this.updateHighScoreDisplay();
    }
    
    initializeGame() {
        this.drawGame();
        this.showOverlay('Ready to Play?', 'Press SPACE to start the game');
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });
        
        // Button controls
        this.startButton.addEventListener('click', () => {
            this.startGame();
        });
        
        this.pauseButton.addEventListener('click', () => {
            this.togglePause();
        });
        
        this.restartButton.addEventListener('click', () => {
            this.restartGame();
        });
        
        // Difficulty change
        this.difficultySelect.addEventListener('change', (e) => {
            this.currentSpeed = this.speeds[e.target.value];
            if (this.gameRunning && !this.gamePaused) {
                this.restartGameLoop();
            }
        });
    }
    
    handleKeyPress(e) {
        const key = e.key.toLowerCase();
        
        // Prevent arrow keys from scrolling the page
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(key)) {
            e.preventDefault();
        }
        
        if (key === ' ' && !this.gameRunning) {
            this.startGame();
            return;
        }
        
        if (key === 'p' || key === 'escape') {
            this.togglePause();
            return;
        }
        
        if (key === 'r') {
            this.restartGame();
            return;
        }
        
        if (!this.gameRunning || this.gamePaused) return;
        
        // Movement controls
        let newDx = this.dx;
        let newDy = this.dy;
        
        switch(key) {
            case 'arrowup':
            case 'w':
                if (this.dy !== 1) { newDx = 0; newDy = -1; }
                break;
            case 'arrowdown':
            case 's':
                if (this.dy !== -1) { newDx = 0; newDy = 1; }
                break;
            case 'arrowleft':
            case 'a':
                if (this.dx !== 1) { newDx = -1; newDy = 0; }
                break;
            case 'arrowright':
            case 'd':
                if (this.dx !== -1) { newDx = 1; newDy = 0; }
                break;
        }
        
        this.nextDx = newDx;
        this.nextDy = newDy;
    }
    
    startGame() {
        if (this.gameRunning) return;
        
        this.gameRunning = true;
        this.gameOver = false;
        this.gamePaused = false;
        this.score = 0;
        this.snake = [{x: 10, y: 10}];
        this.dx = 0;
        this.dy = 0;
        this.nextDx = 0;
        this.nextDy = 0;
        this.food = this.generateFood();
        
        this.updateScoreDisplay();
        this.hideOverlay();
        this.startGameLoop();
    }
    
    togglePause() {
        if (!this.gameRunning || this.gameOver) return;
        
        this.gamePaused = !this.gamePaused;
        
        if (this.gamePaused) {
            this.showOverlay('Game Paused', 'Press P or ESC to resume');
            this.pauseButton.textContent = '▶️ Resume';
        } else {
            this.hideOverlay();
            this.pauseButton.textContent = '⏸️ Pause';
            this.startGameLoop();
        }
    }
    
    restartGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameOver = false;
        this.pauseButton.textContent = '⏸️ Pause';
        this.startGame();
    }
    
    startGameLoop() {
        if (this.gameLoop) clearInterval(this.gameLoop);
        
        this.gameLoop = setInterval(() => {
            if (!this.gamePaused && this.gameRunning) {
                this.updateGame();
                this.drawGame();
            }
        }, this.currentSpeed);
    }
    
    restartGameLoop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.startGameLoop();
        }
    }
    
    updateGame() {
        // Update direction
        this.dx = this.nextDx;
        this.dy = this.nextDy;
        
        // Don't move if no direction is set
        if (this.dx === 0 && this.dy === 0) return;
        
        // Calculate new head position
        const head = {x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy};
        
        // Check wall collision
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            this.gameOver = true;
            this.endGame();
            return;
        }
        
        // Check self collision
        for (let segment of this.snake) {
            if (head.x === segment.x && head.y === segment.y) {
                this.gameOver = true;
                this.endGame();
                return;
            }
        }
        
        // Add new head
        this.snake.unshift(head);
        
        // Check food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.updateScoreDisplay();
            this.food = this.generateFood();
            
            // Increase speed slightly every 50 points
            if (this.score % 50 === 0 && this.currentSpeed > 30) {
                this.currentSpeed -= 5;
                this.restartGameLoop();
            }
        } else {
            // Remove tail if no food was eaten
            this.snake.pop();
        }
    }
    
    drawGame() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid (subtle)
        this.drawGrid();
        
        // Draw snake
        this.drawSnake();
        
        // Draw food
        this.drawFood();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.tileCount; i++) {
            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.gridSize, 0);
            this.ctx.lineTo(i * this.gridSize, this.canvas.height);
            this.ctx.stroke();
            
            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.gridSize);
            this.ctx.lineTo(this.canvas.width, i * this.gridSize);
            this.ctx.stroke();
        }
    }
    
    drawSnake() {
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            
            if (index === 0) {
                // Head
                this.ctx.fillStyle = '#00ff88';
                this.ctx.shadowColor = '#00ff88';
                this.ctx.shadowBlur = 10;
            } else {
                // Body
                const alpha = 1 - (index * 0.1);
                this.ctx.fillStyle = `rgba(0, 255, 136, ${Math.max(0.3, alpha)})`;
                this.ctx.shadowColor = 'rgba(0, 255, 136, 0.5)';
                this.ctx.shadowBlur = 5;
            }
            
            this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
            
            // Add rounded corners effect
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.fillRect(x + 1, y + 1, 2, 2);
            this.ctx.fillRect(x + this.gridSize - 3, y + 1, 2, 2);
            this.ctx.fillRect(x + 1, y + this.gridSize - 3, 2, 2);
            this.ctx.fillRect(x + this.gridSize - 3, y + this.gridSize - 3, 2, 2);
        });
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
    }
    
    drawFood() {
        const x = this.food.x * this.gridSize;
        const y = this.food.y * this.gridSize;
        
        // Create pulsing effect
        const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
        
        this.ctx.fillStyle = `rgba(255, 0, 136, ${pulse})`;
        this.ctx.shadowColor = '#ff0088';
        this.ctx.shadowBlur = 15;
        
        // Draw food as a circle
        this.ctx.beginPath();
        this.ctx.arc(x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 2 - 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
    }
    
    generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        
        return newFood;
    }
    
    endGame() {
        this.gameRunning = false;
        clearInterval(this.gameLoop);
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
            this.updateHighScoreDisplay();
        }
        
        this.showOverlay('Game Over!', `Final Score: ${this.score}`);
    }
    
    showOverlay(title, message) {
        this.overlayTitle.textContent = title;
        this.overlayMessage.textContent = message;
        this.overlay.classList.remove('hidden');
    }
    
    hideOverlay() {
        this.overlay.classList.add('hidden');
    }
    
    updateScoreDisplay() {
        this.scoreElement.textContent = this.score;
        this.scoreElement.classList.add('updated');
        
        setTimeout(() => {
            this.scoreElement.classList.remove('updated');
        }, 300);
    }
    
    updateHighScoreDisplay() {
        this.highScoreElement.textContent = this.highScore;
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
}); 