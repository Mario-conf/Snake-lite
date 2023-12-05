var canvas = document.getElementById('gameCanvas');
var context = canvas.getContext('2d');
var scoreElement = document.getElementById('score');

var gridSize = 20;
var snakeSize = 20;
var appleSize = 20;
var snakeSpeed = 200;

var snake = {
  size: snakeSize,
  color: 'green',
  cells: [{ x: 3, y: 1 }],
  direction: 'right',
};

var apple = {
  size: appleSize,
  color: 'red',
  position: { x: 10, y: 5 },
};

var score = 0;

function drawCell(x, y, size, color) {
  context.fillStyle = color;
  context.fillRect(x * size, y * size, size, size);
}

function drawSnake() {
  snake.cells.forEach(function (cell) {
    drawCell(cell.x, cell.y, snake.size, snake.color);
  });
}

function drawApple() {
  drawCell(apple.position.x, apple.position.y, apple.size, apple.color);
}

function update() {
  var headX = snake.cells[0].x;
  var headY = snake.cells[0].y;

  switch (snake.direction) {
    case 'up':
      headY--;
      break;
    case 'down':
      headY++;
      break;
    case 'left':
      headX--;
      break;
    case 'right':
      headX++;
      break;
  }

  if (headX === apple.position.x && headY === apple.position.y) {
    snake.cells.unshift({ x: headX, y: headY });
    apple.position = {
      x: Math.floor(Math.random() * (canvas.width / gridSize)),
      y: Math.floor(Math.random() * (canvas.height / gridSize)),
    };
    score++;
    scoreElement.textContent = 'Score: ' + score;
  } else {
    snake.cells.unshift({ x: headX, y: headY });
    snake.cells.pop();
  }

  if (
    headX < 0 ||
    headX >= canvas.width / gridSize ||
    headY < 0 ||
    headY >= canvas.height / gridSize ||
    checkSelfCollision()
  ) {
    resetGame();
  }
}

function checkSelfCollision() {
  var headX = snake.cells[0].x;
  var headY = snake.cells[0].y;

  for (var i = 1; i < snake.cells.length; i++) {
    if (headX === snake.cells[i].x && headY === snake.cells[i].y) {
      return true;
    }
  }
  return false;
}

function resetGame() {
  alert('Game Over! Your score: ' + score + '\nClick OK to play again.');
  snake.cells = [{ x: 3, y: 1 }];
  snake.direction = 'right';
  score = 0;
  scoreElement.textContent = 'Score: ' + score;
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawSnake();
  drawApple();
}

function handleKeyPress(e) {
  switch (e.key) {
    case 'ArrowUp':
      snake.direction = 'up';
      break;
    case 'ArrowDown':
      snake.direction = 'down';
      break;
    case 'ArrowLeft':
      snake.direction = 'left';
      break;
    case 'ArrowRight':
      snake.direction = 'right';
      break;
  }
}

document.addEventListener('keydown', handleKeyPress);

function gameLoop() {
  update();
  draw();
  setTimeout(gameLoop, snakeSpeed);
}

gameLoop();
