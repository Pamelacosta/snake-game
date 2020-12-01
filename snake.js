const canvas = document.getElementById("snake_canvas");
const context = canvas.getContext("2d");
const context_scale = 20;

context.scale(context_scale, context_scale);

// Used for calculating delta time
let lastTime = 0;

// Move interval for the snake, every n millis the snake will move its position
// based on its direction
let moveCounter = 0;
const moveIntervalOrg = 60; // original value
let moveInterval = moveIntervalOrg;

const arena = {
    width: canvas.width / context_scale,
    height: canvas.height / context_scale
}

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    moveCounter += deltaTime;

    if (moveCounter > moveInterval) {
        moveCounter = 0;
        moveSnake(player.snake);
        checkCollision();
    }

    draw();
    requestAnimationFrame(update);
}

function setScore(score) {
    player.score = score;

    updateScore();
}

// Add to players score and update
function addScore(amt = 1) {
    setScore(player.score + amt);
}

function updateScore() {
    // Update document
    document.getElementById("score").innerText = "Score: " + player.score;

    // Audio for gaining score
    if (player.score <= 0) return;
    if (player.score % 10 == 0) {
        doingGoodSnd.play();
    } else {
        eatSnd.play();
    }
}

function moveSnake(snake) {
    heads = snake.heads;

    for (var i = 0; i < heads.length; i++) {
        // If this is the first head, move it
        if (i === 0) {
            var prevHeadPos = Object.assign({}, heads[i]);
            moveHead(heads[i], snake.dir);
        }
        else {
            // Otherwise, make other heads follow
            // The one in front of them
            var hold = Object.assign({}, heads[i]);
            heads[i].x = prevHeadPos.x;
            heads[i].y = prevHeadPos.y;
            prevHeadPos = hold;
        }
    }

    snake.hasChangedDir = false; // reset to allow snake to change dir again
}

function setSnakeDir(snake, dir) {
    // Don't allow snake to turn around
    if (dir === getOppositeDir(snake.dir)) return;

    // If snake already has been set to change direction for the next
    // frame, don't allow snake to change it till then
    if (snake.hasChangedDir) return;

    snake.dir = dir;
}

// Returns the opposite direction of the given direction
function getOppositeDir(dir) {
    switch (dir) {
        case 'right': return 'left';
        case 'left': return 'right';
        case 'up': return 'down';
        case 'down': return 'up';
        default: throw "Invalid direction " + dir;
    }
}

function moveHead(head, dir) {
    switch (dir) {
        case 'up':
            head.y--;
            break;
        case 'down':
            head.y++;
            break;
        case 'left':
            head.x--;
            break;
        case 'right':
            head.x++;
            break;
    }
}

function moveEntity(entity) {
    pos = getRandomPosition();
    entity.pos.x = pos.x;
    entity.pos.y = pos.y;
}

function killEntity(entity) {
    for (let i = 0; i < powerups.length; i++) {
        if (powerups[i] !== entity) continue;

        // Removal of entity
        if (typeof entity['onDeath'] == 'function')
            entity.onDeath();
        powerups.splice(i, 1);
        return;
    }
}

function getRandomPosition() {
    return {
        x: (Math.random() * arena.width) | 0,
        y: (Math.random() * arena.height) | 0,
    }
}

// Checks snake collisions with walls, apples, or itself
function checkCollision() {
    wallCollision(); // collision with wall
    snakeCollision(); // collision with snake (self)
    powerUpCollision(); // collision with powerups
}

// Checks if snakes head is outside the map
function wallCollision() {
    let head = player.snake.heads[0];

    if (head.x < 0
        || head.x > arena.width - 1
        || head.y < 0
        || head.y > arena.height - 1) {
        resetGame();
    }
}

function snakeCollision() {
    let head = player.snake.heads[0];

    for (let i = 1; i < player.snake.heads.length - 1; i++) {
        let current = player.snake.heads[i];

        if (head.x === current.x && head.y === current.y) {
            resetGame();
            break;
        }
    }
}

function powerUpCollision() {
    let head = player.snake.heads[0];

    for (let i = 0; i < powerups.length; i++) {
        let powerup = powerups[i];

        if (head.x === powerup.pos.x && head.y === powerup.pos.y
            && typeof powerup['onPickup'] == 'function') {
            powerup.onPickup();

            // Chance of spawning slowdown
            if (Math.random() < .1)
                powerups.push(PowerupMaker.Powerup('slowdown'));
        }
    }
}

function resetGame() {
    // Reset game
    player.snake = newSnake();

    setScore(0);

    powerups = [PowerupMaker.Powerup('apple')];

    moveInterval = moveIntervalOrg;

    deathSnd.play();
}

// Adds a head to the tail of the snake
function appendHead(snake) {
    var lastHead = snake.heads[snake.heads.length - 1];
    snake.heads.push(Object.assign({}, lastHead));
}

// Draws everything for the game
function draw() {
    drawBackground();

    // Powerups
    for (let i = 0; i < powerups.length; i++) {
        drawPowerUp(powerups[i]);
    }

    // Draw player
    drawSnake(player.snake);
}

function drawBackground() {
    context.fillStyle = "#BC8F8F";
    context.fillRect(0, 0, canvas.width / context_scale, canvas.height / context_scale);
}
// Draws the snake given to the screen
function drawSnake(snake) {
    for (var i = 0; i < snake.heads.length; i++) {
        context.fillStyle = "#363636";
        context.fillRect(snake.heads[i].x, snake.heads[i].y, 1, 1);
    }
}

function drawPowerUp(powerup) {
    if (typeof powerup['onDraw'] == 'function')
        powerup.onDraw();
}

function newSnake() {
    return {
        heads: [
            {
                x: 5,
                y: 5
            },
            {
                x: 4,
                y: 5
            }
        ],
        dir: 'right',
        hasChangedDir: false // allows snake to only change dir once per step 
    };
}

// A factory for creating powerup entities
//
//  example powerup:
// {
//  ent_type: 'apple',
//  onPickup: () => { player.score ++; updateScore() };
//  pos: {
//    x: 0,
//    y: 4
//  }
// }
//
//  event functions for powerups:
//  onPickup() - run on pickup of the powerup
//  onDraw() - runs on draw event of powerup
const PowerupMaker = {
    Powerup(type, pos = getRandomPosition()) {
        newPowerup = Object.create(this.powerupType[type]);
        newPowerup.pos = pos;
        return newPowerup;
    },

    powerupType: {
        apple: {
            ent_type: 'apple',

            onPickup: function () {
                appendHead(player.snake);
                moveEntity(this);

                // Updating player score
                addScore();
            },

            onDraw: function () {
                context.fillStyle = "#ff3300";
                context.fillRect(this.pos.x, this.pos.y, 1, 1);
            },
        },

        slowdown: {
            ent_type: 'slowdown',

            onPickup: function () {
                moveInterval = 120;
                setTimeout(() => {
                    moveInterval = moveIntervalOrg;
                }, 15000);

                killEntity(this);
            },

            onDraw: function () {
                context.fillStyle = "#93b5ea";
                context.fillRect(this.pos.x, this.pos.y, 1, 1);
            },
        },
    }
}


const player = {
    snake: newSnake(),
    score: 0
};

var powerups = [];

var deathSnd = document.getElementById("deathSnd");
var eatSnd = document.getElementById("eatSnd");
var doingGoodSnd = document.getElementById("doingGoodSnd");

function startGame() {
    resetGame();
    canvas.style.display = 'block';
    update();
}

document.addEventListener("keydown", event => {
    // Allow player to move snake in left or right
    // relative to its current direction.

    switch (event.keyCode) {
        case 38:
            // Up arrow
            setSnakeDir(player.snake, 'up');
            break;
        case 40:
            // Down arrow
            setSnakeDir(player.snake, 'down');
            break;
        case 37:
            // Left arrow
            setSnakeDir(player.snake, 'left');
            break;
        case 39:
            // Right arrow
            setSnakeDir(player.snake, 'right');
            break;
    }
})
