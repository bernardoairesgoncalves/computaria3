const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

const size = 20; 
let score = 0;
let gameOver = false;
let gameWon = false;
let currentLevel = 1;

// Tempo do modo assustado em milissegundos
const FRIGHTENED_TIME = 7000; 
let frightenedTimer = null;

// Mapa Original Modificado: 1=Parede, 0=Pastilha, 2=Vazio, 3=Pastilha de Poder (Energizer)
const originalMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,3,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,2,1,2,1,1,1,0,1,1,1,1],
    [2,2,2,1,0,1,2,2,2,2,2,2,2,1,0,1,2,2,2],
    [1,1,1,1,0,1,2,1,1,2,1,1,2,1,0,1,1,1,1],
    [2,2,2,2,0,2,2,1,2,2,2,1,2,2,0,2,2,2,2],
    [1,1,1,1,0,1,2,1,1,1,1,1,2,1,0,1,1,1,1],
    [2,2,2,1,0,1,2,2,2,2,2,2,2,1,0,1,2,2,2],
    [1,1,1,1,0,1,2,1,1,1,1,1,2,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,3,0,1,0,0,0,0,0,2,0,0,0,0,0,1,0,3,1],
    [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let map = JSON.parse(JSON.stringify(originalMap));

const pacman = {
    x: 9 * size + size / 2,
    y: 16 * size + size / 2,
    dirX: 0, dirY: 0,
    nextDirX: 0, nextDirY: 0,
    radius: 8, speed: 2
};

// Lista Dinâmica de Fantasmas
let ghosts = [];

function initGhosts() {
    ghosts = [
        {
            name: 'Blinky', color: '#ff0000',
            x: 9 * size + size / 2, y: 8 * size + size / 2,
            dirX: 1, dirY: 0, radius: 8, speed: 1.5, normalSpeed: 1.5,
            isFrightened: false, isDead: false,
            spawnX: 9 * size + size / 2, spawnY: 8 * size + size / 2
        }
    ];

    // Se estiver no nível 2 ou superior, adiciona o Pinky
    if (currentLevel >= 2) {
        ghosts.push({
            name: 'Pinky', color: '#ffb8ff',
            x: 9 * size + size / 2, y: 10 * size + size / 2,
            dirX: -1, dirY: 0, radius: 8, speed: 1.5, normalSpeed: 1.5,
            isFrightened: false, isDead: false,
            spawnX: 9 * size + size / 2, spawnY: 10 * size + size / 2
        });
    }
}

initGhosts();

// Ouvinte de teclado
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp')    { pacman.nextDirX = 0;  pacman.nextDirY = -1; }
    if (e.key === 'ArrowDown')  { pacman.nextDirX = 0;  pacman.nextDirY = 1;  }
    if (e.key === 'ArrowLeft')  { pacman.nextDirX = -1; pacman.nextDirY = 0;  }
    if (e.key === 'ArrowRight') { pacman.nextDirX = 1;  pacman.nextDirY = 0;  }
    
    // Reiniciar com a barra de espaço caso o jogo termine
    if (e.key === ' ' && (gameOver || gameWon)) {
        resetGame(gameWon);
    }
});

function isTileWall(mapX, mapY) {
    if (mapY < 0 || mapY >= map.length || mapX < 0 || mapX >= map[0].length) return true;
    return map[mapY][mapX] === 1;
}

// Verifica se restam pastilhas no mapa
function checkVictoryCondition() {
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            if (map[r][c] === 0 || map[r][c] === 3) return false;
        }
    }
    return true;
}

// Ativa o modo de super poder do Pac-Man
function triggerPowerPellet() {
    if (frightenedTimer) clearTimeout(frightenedTimer);
    
    ghosts.forEach(g => {
        if (!g.isDead) {
            g.isFrightened = true;
            g.speed = g.normalSpeed * 0.6; // Desacelera os fantasmas
        }
    });

    frightenedTimer = setTimeout(() => {
        ghosts.forEach(g => {
            g.isFrightened = false;
            if (!g.isDead) g.speed = g.normalSpeed;
        });
    }, FRIGHTENED_TIME);
}

function moveGhosts() {
    ghosts.forEach(g => {
        // Se o fantasma foi comido, ele corre de volta para a base
        if (g.isDead) {
            const distToBase = Math.hypot(g.x - g.spawnX, g.y - g.spawnY);
            if (distToBase < 5) {
                g.isDead = false;
                g.isFrightened = false;
                g.speed = g.normalSpeed;
            }
        }

        const gCenterX = Math.floor(g.x / size) * size + size / 2;
        const gCenterY = Math.floor(g.y / size) * size + size / 2;

        // Decisão de movimento apenas quando estiver no centro exato do bloco do grid
        if (Math.abs(g.x - gCenterX) < g.speed && Math.abs(g.y - gCenterY) < g.speed) {
            g.x = gCenterX;
            g.y = gCenterY;

            const currentTileX = Math.floor(g.x / size);
            const currentTileY = Math.floor(g.y / size);
            
            const dirs = [{x:1, y:0}, {x:-1, y:0}, {x:0, y:1}, {x:0, y:-1}];
            
            // FILTRO ORIGINAL: Remove a parede E proíbe o fantasma de dar meia-volta imediata (dir invertida)
            const possibleDirs = dirs.filter(d => {
                const isWall = isTileWall(currentTileX + d.x, currentTileY + d.y);
                const isOpposite = (d.x === -g.dirX && d.y === -g.dirY);
                return !isWall && !isOpposite;
            });

            // Se bater em um beco sem saída (raro), permite voltar para não travar
            const finalDirs = possibleDirs.length > 0 ? possibleDirs : dirs.filter(d => !isTileWall(currentTileX + d.x, currentTileY + d.y));

            let chosenDir = finalDirs[0];

            if (g.isDead) {
                // Alvo: Ponto de Spawn (Ressuscitar)
                chosenDir = getBestDirection(currentTileX, currentTileY, g.spawnX, g.spawnY, finalDirs);
            } else if (g.isFrightened) {
                // Modo Assustado: Escolha aleatória simulando pânico
                chosenDir = finalDirs[Math.floor(Math.random() * finalDirs.length)];
            } else {
                // Modo Caça: 
                // Blinky persegue diretamente o Pac-Man
                // Pinky tenta prever e interceptar flanqueando
                let targetX = pacman.x;
                let targetY = pacman.y;
                if (g.name === 'Pinky') {
                    targetX = pacman.x + (pacman.dirX * size * 3);
                    targetY = pacman.y + (pacman.dirY * size * 3);
                }
                chosenDir = getBestDirection(currentTileX, currentTileY, targetX, targetY, finalDirs);
            }

            if (chosenDir) {
                g.dirX = chosenDir.x;
                g.dirY = chosenDir.y;
            }
        }

        g.x += g.dirX * g.speed;
        g.y += g.dirY * g.speed;
    });
}

// Retorna a direção que minimiza a distância linear geométrica até o alvo
function getBestDirection(currentTileX, currentTileY, targetX, targetY, allowedDirs) {
    let bestDir = allowedDirs[0];
    let minDist = Infinity;
    allowedDirs.forEach(d => {
        const nextTileCenterX = (currentTileX + d.x) * size + size / 2;
        const nextTileCenterY = (currentTileY + d.y) * size + size / 2;
        const dist = Math.hypot(targetX - nextTileCenterX, targetY - nextTileCenterY);
        if (dist < minDist) {
            minDist = dist;
            bestDir = d;
        }
    });
    return bestDir;
}

function update() {
    if (gameOver || gameWon) return;

    // --- LOGICA PAC-MAN ---
    const currentTileX = Math.floor(pacman.x / size);
    const currentTileY = Math.floor(pacman.y / size);
    const centerX = currentTileX * size + size / 2;
    const centerY = currentTileY * size + size / 2;

    if (Math.abs(pacman.x - centerX) < pacman.speed && Math.abs(pacman.y - centerY) < pacman.speed) {
        if (!isTileWall(currentTileX + pacman.nextDirX, currentTileY + pacman.nextDirY)) {
            pacman.dirX = pacman.nextDirX;
            pacman.dirY = pacman.nextDirY;
            pacman.x = centerX;
            pacman.y = centerY;
        }
    }

    const nextX = pacman.x + pacman.dirX * pacman.speed;
    const nextY = pacman.y + pacman.dirY * pacman.speed;
    const checkTileX = Math.floor((nextX + pacman.dirX * pacman.radius) / size);
    const checkTileY = Math.floor((nextY + pacman.dirY * pacman.radius) / size);

    if (!isTileWall(checkTileX, checkTileY)) {
        pacman.x = nextX;
        pacman.y = nextY;
    } else {
        pacman.x = centerX;
        pacman.y = centerY;
    }

    // Identifica coleta de itens
    const activeTileX = Math.floor(pacman.x / size);
    const activeTileY = Math.floor(pacman.y / size);
    
    if (map[activeTileY] && map[activeTileY][activeTileX] === 0) {
        map[activeTileY][activeTileX] = 2;
        score += 10;
    } else if (map[activeTileY] && map[activeTileY][activeTileX] === 3) {
        map[activeTileY][activeTileX] = 2;
        score += 50;
        triggerPowerPellet();
    }
    scoreEl.innerText = score;

    if (checkVictoryCondition()) {
        gameWon = true;
    }

    // --- LOGICA FANTASMAS ---
    moveGhosts();

    // Colisões entre Pacman e Fantasmas
    ghosts.forEach(g => {
        if (Math.hypot(pacman.x - g.x, pacman.y - g.y) < pacman.radius + g.radius) {
            if (g.isFrightened && !g.isDead) {
                // Comeu o fantasma!
                g.isDead = true;
                g.isFrightened = false;
                g.speed = 3; // Corre rápido para os boxes
                score += 200;
                scoreEl.innerText = score;
            } else if (!g.isDead && !g.isFrightened) {
                // Morreu para o fantasma
                gameOver = true;
            }
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenha o Labirinto
    for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
            if (map[r][c] === 1) {
                ctx.fillStyle = '#1919a6';
                ctx.fillRect(c * size, r * size, size, size);
            } else if (map[r][c] === 0) {
                ctx.fillStyle = '#ffb8ae';
                ctx.beginPath();
                ctx.arc(c * size + size / 2, r * size + size / 2, 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (map[r][c] === 3) { // Pastilha de Poder Dinâmica (Piscando)
                if (Math.floor(Date.now() / 250) % 2 === 0) {
                    ctx.fillStyle = '#ffb8ae';
                    ctx.beginPath();
                    ctx.arc(c * size + size / 2, r * size + size / 2, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    // Desenha o Pac-Man
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    let angleStart = 0.2; let angleEnd = 1.8;
    if (pacman.dirX === -1) { angleStart = 1.2; angleEnd = 0.8; }
    if (pacman.dirY === -1) { angleStart = 1.7; angleEnd = 1.3; }
    if (pacman.dirY === 1)  { angleStart = 0.7; angleEnd = 0.3; }
    ctx.arc(pacman.x, pacman.y, pacman.radius, angleStart * Math.PI, angleEnd * Math.PI);
    ctx.lineTo(pacman.x, pacman.y);
    ctx.fill();

    // Desenha os Fantasmas
    ghosts.forEach(g => {
        if (g.isDead) {
            // Apenas os olhos correndo para a base
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(g.x - 3, g.y - 2, 3, 0, Math.PI * 2);
            ctx.arc(g.x + 3, g.y - 2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0000ff';
            ctx.beginPath();
            ctx.arc(g.x - 3, g.y - 2, 1.5, 0, Math.PI * 2);
            ctx.arc(g.x + 3, g.y - 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Corpo do Fantasma
            ctx.fillStyle = g.isFrightened ? '#0000ff' : g.color;
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.radius, Math.PI, 0, false);
            ctx.lineTo(g.x + g.radius, g.y + g.radius);
            ctx.lineTo(g.x - g.radius, g.y + g.radius);
            ctx.closePath();
            ctx.fill();

            // Olhos brancos padrão / expressão de pânico se assustado
            ctx.fillStyle = g.isFrightened ? '#ffb8ae' : '#ffffff';
            ctx.beginPath();
            ctx.arc(g.x - 3, g.y - 1, 2.5, 0, Math.PI * 2);
            ctx.arc(g.x + 3, g.y - 1, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Menus de Fim de Jogo / Próxima Fase
    if (gameOver || gameWon) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '20px "Courier New"';
        ctx.textAlign = "center";

        if (gameOver) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px "Courier New"';
            ctx.fillText('Pressione ESPAÇO para reiniciar', canvas.width / 2, canvas.height / 2 + 20);
        } else if (gameWon) {
            ctx.fillStyle = '#00ff00';
            ctx.fillText(`FASE ${currentLevel} CONCLUÍDA!`, canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px "Courier New"';
            ctx.fillText('Pressione ESPAÇO para Próxima Fase', canvas.width / 2, canvas.height / 2 + 20);
        }
        ctx.textAlign = "left"; // Reseta alinhamento
    }
}

function resetGame(isVictory) {
    if (isVictory) {
        currentLevel++;
    } else {
        currentLevel = 1;
        score = 0;
    }
    
    // Reseta o mapa restaurando as pastilhas e as pastilhas de poder
    map = JSON.parse(JSON.stringify(originalMap));
    
    // Reseta Pacman
    pacman.x = 9 * size + size / 2;
    pacman.y = 16 * size + size / 2;
    pacman.dirX = 0; pacman.dirY = 0;
    pacman.nextDirX = 0; pacman.nextDirY = 0;

    // Reseta/Adiciona Fantasmas baseados no nível corrente
    initGhosts();

    gameOver = false;
    gameWon = false;
    if (frightenedTimer) clearTimeout(frightenedTimer);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
