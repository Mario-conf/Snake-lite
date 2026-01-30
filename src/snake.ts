/**
 * Represents a coordinate point on the grid.
 * 
 * @property {number} x - The horizontal coordinate (column index) on the grid.
 * @property {number} y - The vertical coordinate (row index) on the grid.
 */
interface Point {
    x: number;
    y: number;
}

/**
 * Configuration settings for the game logic and mechanics.
 * 
 * @property {number} gridSize - The size of each grid cell in pixels (e.g., 20px).
 * @property {number} initialSpeed - The starting speed of the game in milliseconds (delay between frames).
 * @property {number} minSpeed - The fastest speed the game can reach (minimum delay in milliseconds).
 * @property {number} speedDecrement - The amount of milliseconds to subtract from the delay each time an apple is eaten.
 */
interface GameConfig {
    gridSize: number;
    initialSpeed: number;
    minSpeed: number;
    speedDecrement: number;
}

const CONFIG: GameConfig = {
    gridSize: 20,
    initialSpeed: 200,
    minSpeed: 50,
    speedDecrement: 5
};

/**
 * Main Game class to manage Snake logic and state.
 */
class SnakeGame {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private scoreElement: HTMLElement;
    private highScoreElement: HTMLElement;

    private snake: Point[];
    private apple: Point;
    private direction: string;
    private nextDirection: string; // Used to prevent rapid double-key bugs
    private score: number;
    private highScore: number;
    private speed: number;
    private gameLoopTimeout: number | null = null;
    private isPaused: boolean = false;

    /**
     * Initializes the Snake Game instance.
     * 
     * @param {string} canvasId - The ID of the HTML canvas element in the DOM.
     * @param {string} scoreId - The ID of the HTML element to display the current score.
     * @returns {SnakeGame} - A new instance of the SnakeGame class.
     */
    constructor(canvasId: string, scoreId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.scoreElement = document.getElementById(scoreId) as HTMLElement;

        // Create high score element dynamically if it doesn't exist
        let hs = document.getElementById('highScore');
        if (!hs) {
            hs = document.createElement('h2');
            hs.id = 'highScore';
            this.scoreElement.parentNode?.insertBefore(hs, this.scoreElement.nextSibling);
        }
        this.highScoreElement = hs as HTMLElement;

        this.snake = [];
        this.apple = { x: 0, y: 0 };
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('snakeHighScore') || '0', 10);
        this.speed = CONFIG.initialSpeed;

        this.updateHighScoreDisplay();
        this.initInput();
        this.resetGame();
    }

    /**
     * Resets the game state to initial values (snake position, score, speed, etc).
     * 
     * @returns {void} - This method does not return a value.
     */
    private resetGame(): void {
        this.snake = [{ x: 3, y: 1 }];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.speed = CONFIG.initialSpeed;
        this.updateScoreDisplay();
        this.placeApple();
        this.isPaused = false;

        if (this.gameLoopTimeout) {
            clearTimeout(this.gameLoopTimeout);
        }
        this.gameLoop();
    }

    /**
     * Sets up keyboard event listeners to handle user input for controlling the snake.
     * 
     * @returns {void} - This method does not return a value.
     */
    private initInput(): void {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp':
                    if (this.direction !== 'down') this.nextDirection = 'up';
                    break;
                case 'ArrowDown':
                    if (this.direction !== 'up') this.nextDirection = 'down';
                    break;
                case 'ArrowLeft':
                    if (this.direction !== 'right') this.nextDirection = 'left';
                    break;
                case 'ArrowRight':
                    if (this.direction !== 'left') this.nextDirection = 'right';
                    break;
            }
        });
    }

    /**
     * Places the apple at a random position on the grid that is not currently occupied by the snake.
     * 
     * @returns {void} - This method does not return a value, it updates the internal state.
     */
    private placeApple(): void {
        let validPosition = false;
        while (!validPosition) {
            const x = Math.floor(Math.random() * (this.canvas.width / CONFIG.gridSize));
            const y = Math.floor(Math.random() * (this.canvas.height / CONFIG.gridSize));

            // Check if position is on snake
            const onSnake = this.snake.some(segment => segment.x === x && segment.y === y);
            if (!onSnake) {
                this.apple = { x, y };
                validPosition = true;
            }
        }
    }

    /**
     * Updates the game state for a single frame.
     * Handles movement, wall collision, self-collision, and eating apples.
     * 
     * @returns {void} - This method does not return a value.
     */
    private update(): void {
        this.direction = this.nextDirection; // Apply the buffered direction

        const head = { ...this.snake[0] };

        switch (this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // Check Wall Collision
        if (
            head.x < 0 ||
            head.x >= this.canvas.width / CONFIG.gridSize ||
            head.y < 0 ||
            head.y >= this.canvas.height / CONFIG.gridSize ||
            this.checkSelfCollision(head)
        ) {
            this.handleGameOver();
            return;
        }

        this.snake.unshift(head);

        // Check Apple Collision
        if (head.x === this.apple.x && head.y === this.apple.y) {
            this.score++;
            this.updateScoreDisplay();
            this.placeApple();
            this.increaseDifficulty();
        } else {
            this.snake.pop();
        }
    }

    /**
     * Checks if the provided head position collides with any part of the snake's body.
     * 
     * @param {Point} head - The Point object representing the new position of the snake's head.
     * @returns {boolean} - True if a collision is detected, false otherwise.
     */
    private checkSelfCollision(head: Point): boolean {
        // Start from index 0 because we haven't added the new head to the array yet regarding collision
        // But in update() we basically look ahead.
        // Actually, simple check: is 'head' in 'snake'?
        return this.snake.some(segment => segment.x === head.x && segment.y === head.y);
    }

    /**
     * Increases the game speed (decreases interval delay) based on the configuration settings.
     * 
     * @returns {void} - This method does not return a value.
     */
    private increaseDifficulty(): void {
        if (this.speed > CONFIG.minSpeed) {
            this.speed -= CONFIG.speedDecrement;
        }
    }

    /**
     * Handles the Game Over state.
     * Checks for high score updates, shows an alert, and resets the game.
     * 
     * @returns {void} - This method does not return a value.
     */
    private handleGameOver(): void {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore.toString());
            this.updateHighScoreDisplay();
        }

        alert(`Game Over! Score: ${this.score}\nHigh Score: ${this.highScore}`);
        this.resetGame();
    }

    /**
     * Renders the game elements (snake, apple, background) to the canvas.
     * 
     * @returns {void} - This method does not return a value.
     */
    private draw(): void {
        // Clear canvas
        this.context.fillStyle = 'black';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Snake
        this.context.fillStyle = 'lime';
        this.snake.forEach(segment => {
            this.context.fillRect(
                segment.x * CONFIG.gridSize,
                segment.y * CONFIG.gridSize,
                CONFIG.gridSize - 2,
                CONFIG.gridSize - 2
            );
        });

        // Draw Apple
        this.context.fillStyle = 'red';
        this.context.fillRect(
            this.apple.x * CONFIG.gridSize,
            this.apple.y * CONFIG.gridSize,
            CONFIG.gridSize - 2,
            CONFIG.gridSize - 2
        );
    }

    /**
     * Updates the score text display in the DOM.
     * 
     * @returns {void} - This method does not return a value.
     */
    private updateScoreDisplay(): void {
        this.scoreElement.textContent = `Score: ${this.score}`;
    }

    /**
     * Updates the high score text display in the DOM.
     * 
     * @returns {void} - This method does not return a value.
     */
    private updateHighScoreDisplay(): void {
        this.highScoreElement.textContent = `High Score: ${this.highScore}`;
    }

    /**
     * The main game loop that updates and renders the game at the current speed.
     * Uses setTimeout to allow for dynamic speed changes.
     * 
     * @returns {void} - This method does not return a value.
     */
    private gameLoop(): void {
        this.update();
        this.draw();

        // Dynamic timeout based on current speed
        this.gameLoopTimeout = setTimeout(() => this.gameLoop(), this.speed);
    }
}

// Initialize the game when the window loads
window.onload = () => {
    new SnakeGame('gameCanvas', 'score');
};
