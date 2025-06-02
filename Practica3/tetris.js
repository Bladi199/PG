// Obtener el elemento canvas y el contexto WebGL
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");

// Verificar si WebGL es compatible
if (!gl) {
    alert("WebGL not supported");
}

// Configurar el color de fondo del canvas (negro)
gl.clearColor(0, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT);

// Definir las piezas del juego en forma de matrices binarias
const pieces = [
    [[1, 1, 1, 1]], // Línea
    [[1, 1], [1, 1]], // Cuadrado
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 1, 0], [0, 1, 1]], // Z invertida
    [[0, 1, 1], [1, 1, 0]] // Z normal
];

// Crear el tablero de 20 filas x 10 columnas, inicializado con ceros
let board = Array.from({ length: 20 }, () => Array(10).fill(0));

// Seleccionar una pieza aleatoria y colocarla en la posición inicial
let currentPiece = { shape: pieces[Math.floor(Math.random() * pieces.length)], x: 3, y: 0 };
let dropTime = Date.now();

// Cargar los sonidos del juego
const rotateSound = new Audio('rotacion.ogg');
const dropSound = new Audio('caida.ogg');
const lineClearSound = new Audio('line_clear.ogg');
const gameOverSound = new Audio('game_over.ogg');

// Dibujar el tablero y la pieza actual
function drawBoard() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Dibujar las piezas fijas en el tablero
    board.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) drawSquare(x, y, [0.5, 0.5, 1, 1]);
        });
    });
    
    // Dibujar la pieza en movimiento
    currentPiece.shape.forEach((row, dy) => {
        row.forEach((cell, dx) => {
            if (cell) drawSquare(currentPiece.x + dx, currentPiece.y + dy, [1, 0, 0, 1]);
        });
    });
}

// Función para dibujar un cuadrado en una posición específica
function drawSquare(x, y, color) {
    let size = 0.1;
    let xPos = (x / 10) * 2 - 1;
    let yPos = 1 - (y / 20) * 2;

    let vertices = new Float32Array([
        xPos, yPos, 
        xPos + size, yPos, 
        xPos, yPos - size, 
        xPos + size, yPos - size
    ]);

    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    let vertexShaderCode = `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;
    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderCode);
    gl.compileShader(vertexShader);

    let fragmentShaderCode = `
        precision mediump float;
        uniform vec4 uColor;
        void main() {
            gl_FragColor = uColor;
        }
    `;
    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderCode);
    gl.compileShader(fragmentShader);

    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    let positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    let colorLocation = gl.getUniformLocation(program, "uColor");
    gl.uniform4fv(colorLocation, color);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// Actualizar el estado del juego
function update() {
    let now = Date.now();
    if (now - dropTime > 500) { // Mover la pieza cada 500ms
        if (!collides(currentPiece.x, currentPiece.y + 1, currentPiece.shape)) {
            currentPiece.y++;
        } else {
            placePiece();
            currentPiece = { shape: pieces[Math.floor(Math.random() * pieces.length)], x: 3, y: 0 };
            dropSound.play();
            if (collides(currentPiece.x, currentPiece.y, currentPiece.shape)) {
                gameOver();
                return;
            }
        }
        dropTime = now;
    }
    drawBoard();
    requestAnimationFrame(update);
}

// Capturar eventos de teclado para mover la pieza
document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" && !collides(currentPiece.x - 1, currentPiece.y, currentPiece.shape)) {
        currentPiece.x--;
    }
    if (event.key === "ArrowRight" && !collides(currentPiece.x + 1, currentPiece.y, currentPiece.shape)) {
        currentPiece.x++;
    }
    if (event.key === "ArrowDown") {
        currentPiece.y++;
    }
});

// Verificar colisión de la pieza con los bordes o con otras piezas
function collides(x, y, shape) {
    return shape.some((row, dy) => row.some((cell, dx) => cell && (board[y + dy]?.[x + dx] !== 0 || y + dy >= 20)));
}

// Fijar la pieza en el tablero cuando colisiona
function placePiece() {
    currentPiece.shape.forEach((row, dy) => {
        row.forEach((cell, dx) => {
            if (cell) board[currentPiece.y + dy][currentPiece.x + dx] = 1;
        });
    });
    checkLines();
}

// Verificar y eliminar líneas completas
function checkLines() {
    let linesCleared = board.filter(row => row.every(cell => cell === 1)).length;
    if (linesCleared > 0) {
        lineClearSound.play();
    }
    board = board.filter(row => row.some(cell => cell === 0));
    while (board.length < 20) board.unshift(Array(10).fill(0));
}

// Función de Game Over
function gameOver() {
    gameOverSound.play();
    alert("Game Over!");
    board = Array.from({ length: 20 }, () => Array(10).fill(0));
    update();
}

// Iniciar el bucle del juego
update();
