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
        this.tiltButton = document.getElementById('tiltButton');
        
        // Touch/swipe tracking
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 30;
        
        // Tilt control
        this.tiltEnabled = false;
        this.tiltCalibrated = false;
        this.calibrationBeta = 0;
        this.calibrationGamma = 0;
        this.tiltThreshold = 15; // degrees
        this.lastTiltUpdate = 0;
        this.tiltUpdateInterval = 100; // ms
        this.deviceOrientationHandler = null; // Store handler reference
        
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
        
        // Touch/swipe controls
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.touchEndX = touch.clientX;
            this.touchEndY = touch.clientY;
            this.handleSwipe();
        }, { passive: false });
        
        // Directional button controls
        const dpadButtons = document.querySelectorAll('.dpad-button');
        dpadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const direction = button.getAttribute('data-direction');
                this.handleDirection(direction);
            });
            
            // Touch events for buttons
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const direction = button.getAttribute('data-direction');
                this.handleDirection(direction);
            }, { passive: false });
        });
        
        // Tilt control toggle
        if (this.tiltButton) {
            this.tiltButton.addEventListener('click', () => {
                this.toggleTiltControl();
            });
        }
    }
    
    toggleTiltControl() {
        if (this.tiltEnabled) {
            // Disable tilt control
            this.disableTiltControl();
            return;
        }
        
        // Request permission for iOS 13+
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        this.enableTiltControl();
                    } else if (response === 'denied') {
                        alert('Tilt control requires device orientation permission. Please enable it in your browser settings.');
                        this.tiltButton.textContent = '📱 Tilt Off';
                        this.tiltButton.classList.remove('active');
                    } else {
                        // Prompt was dismissed
                        this.tiltButton.textContent = '📱 Tilt Off';
                        this.tiltButton.classList.remove('active');
                    }
                })
                .catch(error => {
                    console.error('Error requesting device orientation permission:', error);
                    this.tiltButton.textContent = '📱 Tilt Off';
                    this.tiltButton.classList.remove('active');
                    alert('Unable to access device orientation. Please check your browser settings.');
                });
        } else {
            // Android and older iOS - try to enable directly
            try {
                this.enableTiltControl();
            } catch (error) {
                console.error('Error enabling tilt control:', error);
                this.tiltButton.textContent = '📱 Tilt Off';
                this.tiltButton.classList.remove('active');
                alert('Tilt control is not supported on this device or browser.');
            }
        }
    }
    
    enableTiltControl() {
        // Check if device orientation is supported
        if (!window.DeviceOrientationEvent) {
            alert('Device orientation is not supported on this device.');
            this.tiltButton.textContent = '📱 Tilt Off';
            this.tiltButton.classList.remove('active');
            return;
        }
        
        this.tiltEnabled = true;
        this.tiltCalibrated = false;
        this.tiltButton.textContent = '📱 Tilt On';
        this.tiltButton.classList.add('active');
        
        // Store bound handler for proper removal
        this.deviceOrientationHandler = this.handleDeviceOrientation.bind(this);
        window.addEventListener('deviceorientation', this.deviceOrientationHandler);
    }
    
    disableTiltControl() {
        this.tiltEnabled = false;
        this.tiltButton.textContent = '📱 Tilt Off';
        this.tiltButton.classList.remove('active');
        if (this.deviceOrientationHandler) {
            window.removeEventListener('deviceorientation', this.deviceOrientationHandler);
            this.deviceOrientationHandler = null;
        }
    }
    
    handleDeviceOrientation(event) {
        if (!this.tiltEnabled || !this.gameRunning || this.gamePaused) return;
        
        // Check if event has valid data
        if (event.beta === null || event.gamma === null) {
            return;
        }
        
        const now = Date.now();
        if (now - this.lastTiltUpdate < this.tiltUpdateInterval) return;
        this.lastTiltUpdate = now;
        
        // Calibrate on first reading
        if (!this.tiltCalibrated) {
            this.calibrationBeta = event.beta || 0;
            this.calibrationGamma = event.gamma || 0;
            this.tiltCalibrated = true;
            return;
        }
        
        // Get relative tilt from calibrated position
        const beta = (event.beta || 0) - this.calibrationBeta;
        const gamma = (event.gamma || 0) - this.calibrationGamma;
        
        // Determine primary tilt direction
        const absBeta = Math.abs(beta);
        const absGamma = Math.abs(gamma);
        
        // Only respond if tilt exceeds threshold
        if (absBeta < this.tiltThreshold && absGamma < this.tiltThreshold) {
            return;
        }
        
        let newDx = this.dx;
        let newDy = this.dy;
        
        if (absBeta > absGamma) {
            // Vertical tilt (beta)
            if (beta < -this.tiltThreshold && this.dy !== 1) {
                // Tilt forward (down)
                newDx = 0;
                newDy = 1;
            } else if (beta > this.tiltThreshold && this.dy !== -1) {
                // Tilt backward (up)
                newDx = 0;
                newDy = -1;
            }
        } else {
            // Horizontal tilt (gamma)
            if (gamma < -this.tiltThreshold && this.dx !== 1) {
                // Tilt left
                newDx = -1;
                newDy = 0;
            } else if (gamma > this.tiltThreshold && this.dx !== -1) {
                // Tilt right
                newDx = 1;
                newDy = 0;
            }
        }
        
        this.nextDx = newDx;
        this.nextDy = newDy;
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
    
    handleSwipe() {
        if (!this.gameRunning || this.gamePaused) return;
        
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // Check if swipe distance is sufficient
        if (absDeltaX < this.minSwipeDistance && absDeltaY < this.minSwipeDistance) {
            return;
        }
        
        // Determine primary swipe direction
        if (absDeltaX > absDeltaY) {
            // Horizontal swipe
            if (deltaX > 0 && this.dx !== -1) {
                // Swipe right
                this.nextDx = 1;
                this.nextDy = 0;
            } else if (deltaX < 0 && this.dx !== 1) {
                // Swipe left
                this.nextDx = -1;
                this.nextDy = 0;
            }
        } else {
            // Vertical swipe
            if (deltaY > 0 && this.dy !== -1) {
                // Swipe down
                this.nextDx = 0;
                this.nextDy = 1;
            } else if (deltaY < 0 && this.dy !== 1) {
                // Swipe up
                this.nextDx = 0;
                this.nextDy = -1;
            }
        }
    }
    
    handleDirection(direction) {
        if (!this.gameRunning || this.gamePaused) return;
        
        let newDx = this.dx;
        let newDy = this.dy;
        
        switch(direction) {
            case 'up':
                if (this.dy !== 1) { newDx = 0; newDy = -1; }
                break;
            case 'down':
                if (this.dy !== -1) { newDx = 0; newDy = 1; }
                break;
            case 'left':
                if (this.dx !== 1) { newDx = -1; newDy = 0; }
                break;
            case 'right':
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