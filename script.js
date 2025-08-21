const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const levelEditorControls = document.getElementById('levelEditorControls');
const standardPlatformButton = document.getElementById('standardPlatform');
const movingPlatformButton = document.getElementById('movingPlatform');
const breakablePlatformButton = document.getElementById('breakablePlatform');
const winPlatformButton = document.getElementById('winPlatform');
const wallPlatformButton = document.getElementById('wallPlatform');
const saveLevelButton = document.getElementById('saveLevel');
const loadFromStringBtn = document.getElementById('loadFromStringBtn');
const loadExistingLevelBtn = document.getElementById('loadExistingLevelBtn');
const existingLevelChoices = document.getElementById('existingLevelChoices');
const levelStringTextarea = document.getElementById('levelString');
const playLevelButton = document.getElementById('playLevel');
const backToMenuFromEditorButton = document.getElementById('backToMenuFromEditor');

const placeModeButton = document.getElementById('placeMode');
const removeModeButton = document.getElementById('removeMode');
const resizeModeButton = document.getElementById('resizeMode');
const moveModeButton = document.getElementById('moveMode');
const rotateModeButton = document.getElementById('rotateMode');

const standardEnemyButton = document.getElementById('standardEnemy');
const patrollingEnemyButton = document.getElementById('patrollingEnemy');
const jumpingEnemyButton = document.getElementById('jumpingEnemy');
const turretButton = document.getElementById('turret');
const backgroundMusic = document.getElementById('backgroundMusic');

// Get all platform type buttons
const platformTypeButtons = document.querySelectorAll('#platformButtons button');
const enemyTypeButtons = document.querySelectorAll('#enemyButtons button');

// Game variables
let player;
let platforms = [];
let gameover = false;
let gameWon = false;
let gameLoopId;
let gameState = 'menu';
let enemies = [];
let projectiles = [];
let level = 1;
let cameraY = 0;
let isGrounded = false;
let boss;
let turrets = [];
let score = 0;
let totalGameTime = 0;
let isTimeAttackMode = false;
let editorGridSize = 20;
let currentPlatformType = 'standard';
let currentEnemyType = 'standard';
let currentEntityType = 'platform'; // 'platform' or 'enemy' or 'turret'
let editorMode = 'place'; // 'place', 'remove', 'resize', or 'move'
let isTestingLevel = false;
let editorPlatformsBackup = []; // Stores deep copy of platforms for editor state restoration
let editorEnemiesBackup = [];   // Stores deep copy of enemies for editor state restoration
let editorTurretsBackup = [];

let editorCameraY = 0;
let selectedPlatform = null;
let selectedEnemy = null;
let selectedTurret = null;
let isResizing = false;
let resizeHandle = null;
let initialMouseX, initialMouseY, initialPlatformWidth, initialPlatformHeight, initialPlatformX, initialPlatformY;
let isMoving = false;
let moveOffsetX;
let moveOffsetY;

// Player properties
const playerWidth = 40;
const playerHeight = 40;
let playerSpeed = 5;
let jumpHeight = 12;
let enemyJumpHeight = 8;
let velocityY = 0;
let gravity = 0.5;

// Platform properties
const platformWidth = 100;
const platformHeight = 20;

// Key state
const keys = {
    right: false,
    left: false,
    space: false
};

// Sprites
const playerSpriteRight = new Image();
playerSpriteRight.src = 'player_moving_right.png';
const playerSpriteLeft = new Image();
playerSpriteLeft.src = 'player_moving_left.png';
const playerSpriteStand = new Image();
playerSpriteStand.src = 'player_standing_by.png';
const patrollingEnemySprite = new Image();
patrollingEnemySprite.src = 'patrolling_enemy.png';
const standardEnemySprite = new Image();
standardEnemySprite.src = 'standard_enemy.png';
const jumpingEnemySprite = new Image();
jumpingEnemySprite.src = 'jumping_enemy.png';
const bossSprite = new Image();
bossSprite.src = 'boss.png';

class Player {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.state = 'standing';
        this.currentFrame = 0;
        this.frameCounter = 0;
        this.frameDelay = 10;
    }
    updateAnimation() {
        let numFrames = (this.state === 'movingRight' || this.state === 'movingLeft') ? 4 : 2;
        this.frameDelay = (this.state === 'movingRight' || this.state === 'movingLeft') ? 10 : 30;
        this.frameCounter++;
        if (this.frameCounter >= this.frameDelay) {
            this.frameCounter = 0;
            this.currentFrame = (this.currentFrame + 1) % numFrames;
        }
    }
    draw() {
        let spriteToUse;
        if (this.state === 'movingRight') spriteToUse = playerSpriteRight;
        else if (this.state === 'movingLeft') spriteToUse = playerSpriteLeft;
        else spriteToUse = playerSpriteStand;
        let numFrames = (this.state === 'movingRight' || this.state === 'movingLeft') ? 4 : 2;
        if (spriteToUse.complete && spriteToUse.naturalWidth > 0) {
            let spriteImageWidth = spriteToUse.width / numFrames;
            ctx.drawImage(spriteToUse, this.currentFrame * spriteImageWidth, 0, spriteImageWidth, spriteToUse.height, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

class Platform {
    constructor(x, y, width, height, color, type = 'standard') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.type = type;
        this.direction = 1;
        this.speed = 2;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    update() {
        if (this.type === 'moving') {
            this.x += this.speed * this.direction;
            if (this.x + this.width > canvas.width || this.x < 0) {
                this.direction *= -1;
            }
        }
    }
}

class Enemy {
    constructor(x, y, width, height, color, type = 'standard', platform = null) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.type = type;
        this.platform = platform;
        this.direction = 1;
        this.speed = type === 'patrolling' ? 1 : 2;
        this.velocityY = 0;
        this.isGrounded = false;
        this.currentFrame = 0;
        this.frameCounter = 0;
        this.frameDelay = 15;
        this.standardEnemyFrameOffsets = [-1, 0, 1, 3];
    }
    update() {
        if (this.type === 'standard' || this.type === 'patrolling') this.updateAnimation();
        if (this.type === 'patrolling' || this.type === 'jumping') {
            this.velocityY += gravity;
            this.y += this.velocityY;
            this.isGrounded = false;
            platforms.forEach(p => {
                if (this.x < p.x + p.width && this.x + this.width > p.x && this.y + this.height >= p.y && this.y + this.height <= p.y + platformHeight && this.velocityY > 0) {
                    this.y = p.y - this.height;
                    this.velocityY = 0;
                    this.isGrounded = true;
                }
            });
        }
        switch (this.type) {
            case 'standard':
                this.x += this.speed * this.direction;
                if (this.x < 0 || this.x + this.width > canvas.width) this.direction *= -1;
                break;
            case 'patrolling':
                if (this.isGrounded && this.platform) {
                    this.x += this.speed * this.direction;
                    if ((this.direction === 1 && this.x + this.width > this.platform.x + this.platform.width) || (this.direction === -1 && this.x < this.platform.x)) {
                        this.direction *= -1;
                    }
                }
                break;
            case 'jumping':
                if (this.isGrounded) {
                    this.velocityY = -enemyJumpHeight;
                    this.isGrounded = false; // Prevent state confusion by immediately going airborne
                }
                break;
        }
    }
    updateAnimation() {
        const numFrames = this.type === 'standard' ? 4 : 3;
        this.frameCounter++;
        if (this.frameCounter >= this.frameDelay) {
            this.frameCounter = 0;
            this.currentFrame = (this.currentFrame + 1) % numFrames;
        }
    }
    draw() {
        let spriteToUse, numFrames;
        if (this.type === 'standard') { spriteToUse = standardEnemySprite; numFrames = 4; }
        else if (this.type === 'patrolling') { spriteToUse = patrollingEnemySprite; numFrames = 3; }
        else if (this.type === 'jumping') { spriteToUse = jumpingEnemySprite; numFrames = 1; }
        else { ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.width, this.height); return; }
        if (!spriteToUse.complete || spriteToUse.naturalWidth === 0) { ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.width, this.height); return; }
        const spriteImageWidth = spriteToUse.width / numFrames;
        if (this.type === 'patrolling') {
            const scaleFactor = 1.2, scaledWidth = this.width * scaleFactor, scaledHeight = this.height * scaleFactor;
            const offsetX = ((scaledWidth - this.width) / 2) * 0.75, offsetY = (scaledHeight - this.height) / 2;
            ctx.drawImage(spriteToUse, this.currentFrame * spriteImageWidth, 0, spriteImageWidth, spriteToUse.height, this.x - offsetX, this.y + 2 - offsetY, scaledWidth, scaledHeight);
        } else {
            ctx.drawImage(spriteToUse, 0, 0, spriteImageWidth, spriteToUse.height, this.x, this.y, this.width, this.height);
        }
    }
}

class Boss {
    constructor(x, y, width, height, health) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.health = health;
        this.maxHealth = health;
        this.warningOverlayColor = null;
        this.direction = 1;
        this.speed = 1;
        this.velocityY = 0;
        this.isGrounded = false;
        this.attackCooldown = 180; // frames
        this.attackTimer = 0;
        this.attackType = 'none';
        this.attackDuration = 120; // frames
        this.attackDurationTimer = 0;
        this.attackPattern = ['jump', 'shoot', 'dash', 'groundPound']; // Define attack pattern
        this.dashSpeed = 10;
        this.isDashing = false;
        this.isGroundPounding = false;
        this.isWarning = false;
        this.warningDuration = 60; // 1 second warning
        this.warningTimer = 0;
        this.currentFrame = 0;
        this.frameCounter = 0;
        this.frameDelay = 15;
    }

    updateAnimation() {
        const numFrames = 4; // Assuming 4 frames for the boss
        this.frameCounter++;
        if (this.frameCounter >= this.frameDelay) {
            this.frameCounter = 0;
            this.currentFrame = (this.currentFrame + 1) % numFrames;
        }
    }

    draw() {
        let spriteToUse = bossSprite;
        const numFrames = 4;

        if (!spriteToUse.complete || spriteToUse.naturalWidth === 0) {
            ctx.fillStyle = 'purple';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        } else {
            const spriteImageWidth = spriteToUse.width / numFrames;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.width;
            tempCanvas.height = this.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(
                spriteToUse,
                this.currentFrame * spriteImageWidth, 0,
                spriteImageWidth, spriteToUse.height,
                0, 0, this.width, this.height
            );

            if (this.warningOverlayColor) {
                tempCtx.globalCompositeOperation = 'source-atop';
                tempCtx.fillStyle = this.warningOverlayColor;
                tempCtx.globalAlpha = 0.5;
                tempCtx.fillRect(0, 0, this.width, this.height);
                tempCtx.globalAlpha = 1.0;
                tempCtx.globalCompositeOperation = 'source-over';
            }

            ctx.drawImage(tempCanvas, this.x, this.y, this.width, this.height);
        }

        // Draw health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 15, this.width, 10);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 15, this.width * (this.health / this.maxHealth), 10);
    }

    update() {
        this.updateAnimation();
        // Basic horizontal movement
        if (!this.isDashing) {
            this.x += this.speed * this.direction;
            if (this.x + this.width >= canvas.width) {
                this.direction = -1;
                this.x = canvas.width - this.width;
            } else if (this.x <= 0) {
                this.direction = 1;
                this.x = 0;
            }
        }

        // Apply gravity
        this.velocityY += gravity;
        this.y += this.velocityY;

        // Simple ground collision
        if (this.y + this.height > canvas.height - 20) {
            this.y = canvas.height - 20 - this.height;
            this.velocityY = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // Attack logic
        this.attackTimer++;

        if (this.isWarning) {
            this.warningTimer++;

            // Warning visual cues
            switch (this.attackType) {
                case 'jump':
                    this.warningOverlayColor = this.warningTimer % 20 < 10 ? null : 'black';
                    break;
                case 'groundPound':
                    this.warningOverlayColor = this.warningTimer % 20 < 10 ? null : 'white';
                    break;
                case 'shoot':
                    this.warningOverlayColor = 'orange';
                    break;
                case 'dash':
                    this.warningOverlayColor = 'cyan';
                    break;
            }

            if (this.warningTimer >= this.warningDuration) {
                this.isWarning = false;
                this.warningTimer = 0;
                this.warningOverlayColor = null; // Reset warning color
                this.attackDurationTimer = this.attackDuration;

                if (this.attackType === 'shoot') {
                    // Shoot a projectile towards the player
                    const projectileSpeed = 5;
                    const angle = Math.atan2((player.y + player.height / 2) - (this.y + this.height / 2), (player.x + player.width / 2) - (this.x + this.width / 2));
                    const speedX = Math.cos(angle) * projectileSpeed;
                    const speedY = Math.sin(angle) * projectileSpeed;
                    projectiles.push(new Projectile(this.x + this.width / 2 - 5, this.y + this.height / 2 - 5, 10, 10, 'yellow', speedX, speedY));
                    this.attackType = 'none'; // Reset attack type after shooting
                }
            }
        } else if (this.attackTimer >= this.attackCooldown && this.attackType === 'none') {
            this.attackTimer = 0;
            this.attackType = this.attackPattern[Math.floor(Math.random() * this.attackPattern.length)];
            this.isWarning = true;
            this.warningTimer = 0;
        }

        if (!this.isWarning) {
            if (this.attackType === 'jump') {
                if (this.attackDurationTimer === this.attackDuration && this.isGrounded) {
                    this.velocityY = -jumpHeight * 1.5; // Higher jump for boss
                }
                this.attackDurationTimer--;
                if (this.attackDurationTimer <= 0) {
                    this.attackType = 'none';
                }
            } else if (this.attackType === 'groundPound') {
                if (this.attackDurationTimer === this.attackDuration && this.isGrounded) {
                    this.velocityY = -jumpHeight * 2; // Very high jump for ground pound
                    this.isGroundPounding = true;
                }

                if (this.isGroundPounding && this.velocityY > 0 && this.isGrounded) {
                    // Landed after ground pound jump
                    // Create shockwave (projectiles)
                    projectiles.push(new Projectile(this.x + this.width / 2, this.y + this.height, 10, 10, 'orange', -5, 0));
                    projectiles.push(new Projectile(this.x + this.width / 2, this.y + this.height, 10, 10, 'orange', 5, 0));
                    this.isGroundPounding = false;
                    this.attackType = 'none';
                }

                this.attackDurationTimer--;
                if (this.attackDurationTimer <= 0) {
                    this.attackType = 'none';
                    this.isGroundPounding = false;
                }
            } else if (this.attackType === 'dash') {
                if (this.attackDurationTimer === this.attackDuration) {
                    this.isDashing = true;
                }

                if (this.isDashing) {
                    this.x += this.dashSpeed * this.direction;

                    if (this.x + this.width > canvas.width) {
                        this.x = canvas.width - this.width;
                        this.isDashing = false;
                    } else if (this.x < 0) {
                        this.x = 0;
                        this.isDashing = false;
                    }
                }

                this.attackDurationTimer--;
                if (this.attackDurationTimer <= 0) {
                    this.attackType = 'none';
                    this.isDashing = false;
                }
            }
        }
    }
}

class Boss2 extends Boss {
    constructor(x, y, width, height, health) {
        super(x, y, width, height, health);
        this.attackPattern = ['jump', 'shoot', 'dash', 'groundPound'];
        this.jumpCount = 0;
        this.dashWallHit = 0;
        this.previousVelocityY = 0;
    }

    update() {
        this.previousVelocityY = this.velocityY;
        this.updateAnimation();
        // Basic horizontal movement
        if (!this.isDashing) {
            this.x += this.speed * this.direction;
            if (this.x + this.width >= canvas.width) {
                this.direction = -1;
                this.x = canvas.width - this.width;
            } else if (this.x <= 0) {
                this.direction = 1;
                this.x = 0;
            }
        }

        // Apply gravity
        this.velocityY += gravity;
        this.y += this.velocityY;

        // Ground collision and double jump logic
        if (this.y + this.height > canvas.height - 20) {
            this.y = canvas.height - 20 - this.height;
            this.velocityY = 0;
            if (!this.isGrounded && this.attackType === 'jump') { // Just landed from a jump attack
                if (this.jumpCount < 2) {
                    this.velocityY = -jumpHeight * 1.5; // Jump again
                    this.jumpCount++;
                    this.isGrounded = false; // Immediately airborne again
                } else {
                    this.attackType = 'none'; // End attack after second jump
                }
            }
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // Attack logic
        this.attackTimer++;

        if (this.isWarning) {
            this.warningTimer++;

            // Warning visual cues
            switch (this.attackType) {
                case 'jump':
                    this.warningOverlayColor = this.warningTimer % 20 < 10 ? null : 'black';
                    break;
                case 'groundPound':
                    this.warningOverlayColor = this.warningTimer % 20 < 10 ? null : 'white';
                    break;
                case 'shoot':
                    this.warningOverlayColor = 'orange';
                    break;
                case 'dash':
                    this.warningOverlayColor = 'cyan';
                    break;
            }

            if (this.warningTimer >= this.warningDuration) {
                this.isWarning = false;
                this.warningTimer = 0;
                this.warningOverlayColor = null; // Reset warning color
                this.attackDurationTimer = this.attackDuration;

                if (this.attackType === 'shoot') {
                    const projectileSpeed = 5;
                    const angle = Math.atan2((player.y + player.height / 2) - (this.y + this.height / 2), (player.x + player.width / 2) - (this.x + this.width / 2));
                    
                    // Triple shot
                    projectiles.push(new Projectile(this.x + this.width / 2 - 5, this.y + this.height / 2 - 5, 10, 10, 'yellow', Math.cos(angle) * projectileSpeed, Math.sin(angle) * projectileSpeed));
                    projectiles.push(new Projectile(this.x + this.width / 2 - 5, this.y + this.height / 2 - 5, 10, 10, 'yellow', Math.cos(angle - 0.3) * projectileSpeed, Math.sin(angle - 0.3) * projectileSpeed));
                    projectiles.push(new Projectile(this.x + this.width / 2 - 5, this.y + this.height / 2 - 5, 10, 10, 'yellow', Math.cos(angle + 0.3) * projectileSpeed, Math.sin(angle + 0.3) * projectileSpeed));

                    this.attackType = 'none';
                }
            }
        } else if (this.attackTimer >= this.attackCooldown && this.attackType === 'none') {
            this.attackTimer = 0;
            this.attackType = this.attackPattern[Math.floor(Math.random() * this.attackPattern.length)];
            this.isWarning = true;
            this.warningTimer = 0;
            this.jumpCount = 0;
            this.dashWallHit = 0;
        }

        if (!this.isWarning) {
            if (this.attackType === 'jump') {
                if (this.attackDurationTimer === this.attackDuration && this.isGrounded) {
                    this.velocityY = -jumpHeight * 1.5;
                    this.jumpCount = 1;
                }
                this.attackDurationTimer--;
            } else if (this.attackType === 'groundPound') {
                if (this.attackDurationTimer === this.attackDuration && this.isGrounded) {
                    this.velocityY = -jumpHeight * 2; // Set to Boss 1 height
                    this.isGroundPounding = true;
                }

                if (this.isGroundPounding && this.previousVelocityY > 0 && this.isGrounded) {
                    this.warningOverlayColor = 'red'; // DEBUG: Flash red on landing
                    // Landed after ground pound jump
                    // Create shockwave
                    projectiles.push(new Shockwave(this.x + this.width / 2, this.y + this.height - 10, 30, 10, 'orange', -5));
                    projectiles.push(new Shockwave(this.x + this.width / 2, this.y + this.height - 10, 30, 10, 'orange', 5));
                    this.isGroundPounding = false;
                    this.attackType = 'none';
                }

                this.attackDurationTimer--;
                if (this.attackDurationTimer <= 0) {
                    this.attackType = 'none';
                    this.isGroundPounding = false;
                }
            } else if (this.attackType === 'dash') {
                if (this.attackDurationTimer === this.attackDuration) {
                    this.isDashing = true;
                    this.direction = (player.x > this.x) ? 1 : -1; // Initial dash towards player
                }

                if (this.isDashing) {
                    this.x += this.dashSpeed * this.direction;

                    let wallHit = false;
                    if (this.x + this.width >= canvas.width) {
                        this.direction = -1;
                        this.x = canvas.width - this.width;
                        wallHit = true;
                    } else if (this.x < 0) {
                        this.direction = 1;
                        this.x = 0;
                        wallHit = true;
                    }

                    if (wallHit) {
                        this.dashWallHit++;
                        if(this.dashWallHit >= 2) {
                            this.isDashing = false;
                            this.attackType = 'none';
                            return; // Force exit from update to prevent state issues
                        }
                    }
                }

                this.attackDurationTimer--;
            }
        }
    }
}

class Projectile {
    constructor(x, y, width, height, color, speedX, speedY) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.speedX = speedX;
        this.speedY = speedY;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
    }
}

class Shockwave extends Projectile {
    constructor(x, y, width, height, color, speedX) {
        super(x, y, width, height, color, speedX, 0);
    }

    update() {
        super.update();
    }
}

class Turret {
    constructor(x, y, width, height, color, shootDirection) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.shootDirection = shootDirection; // 'left', 'right', 'up', 'down'
        this.shootCooldown = 240; // frames (less frequent)
        this.shootTimer = 0;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // Draw a small indicator for shoot direction
        ctx.fillStyle = 'black';
        if (this.shootDirection === 'left') {
            ctx.fillRect(this.x, this.y + this.height / 2 - 2, 10, 4);
        } else if (this.shootDirection === 'right') {
            ctx.fillRect(this.x + this.width - 10, this.y + this.height / 2 - 2, 10, 4);
        } else if (this.shootDirection === 'up') {
            ctx.fillRect(this.x + this.width / 2 - 2, this.y, 4, 10);
        } else if (this.shootDirection === 'down') {
            ctx.fillRect(this.x + this.width / 2 - 2, this.y + this.height - 10, 4, 10);
        }
    }

    update() {
        this.shootTimer++;
        if (this.shootTimer >= this.shootCooldown) {
            this.shootTimer = 0;
            this.shoot();
        }
    }

    shoot() {
        let speedX = 0;
        let speedY = 0;
        let projectileX = this.x + this.width / 2;
        let projectileY = this.y + this.height / 2;
        const projectileSpeed = 3;
        if (this.shootDirection === 'left') {
            speedX = -projectileSpeed;
            projectileX = this.x;
        } else if (this.shootDirection === 'right') {
            speedX = projectileSpeed;
            projectileX = this.x + this.width;
        } else if (this.shootDirection === 'up') {
            speedY = -projectileSpeed;
            projectileY = this.y;
        } else if (this.shootDirection === 'down') {
            speedY = projectileSpeed;
            projectileY = this.y + this.height;
        }
        projectiles.push(new Projectile(projectileX - 5, projectileY - 5, 10, 10, 'red', speedX, speedY));
    }
}

const levelsData = {
    1: {
        platforms: [
            { x: 300, y: 100, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 100, y: 200, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 500, y: 300, width: platformWidth, height: platformHeight, color: 'blue', type: 'moving' },
            { x: 200, y: 400, width: platformWidth, height: platformHeight, color: 'red', type: 'breakable' },
            { x: 400, y: 500, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 150, y: 600, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 600, y: 700, width: platformWidth, height: platformHeight, color: 'blue', type: 'moving' },
            { x: 300, y: 800, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 100, y: 900, width: platformWidth, height: platformHeight, color: 'gold', type: 'win' }
        ],
        enemies: [],
        boss: null,
        turrets: []
    },
    2: {
        platforms: [
            { x: 200, y: 100, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 400, y: 200, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 100, y: 300, width: platformWidth, height: platformHeight, color: 'blue', type: 'moving' },
            { x: 500, y: 400, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 300, y: 500, width: platformWidth, height: platformHeight, color: 'red', type: 'breakable' },
            { x: 150, y: 600, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 600, y: 700, width: platformWidth, height: platformHeight, color: 'blue', type: 'moving' },
            { x: 300, y: 800, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 100, y: 900, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 500, y: 1000, width: platformWidth, height: platformHeight, color: 'blue', type: 'moving' },
            { x: 200, y: 1100, width: platformWidth, height: platformHeight, color: 'red', type: 'breakable' },
            { x: 400, y: 1200, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 150, y: 1300, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 600, y: 1400, width: platformWidth, height: platformHeight, color: 'blue', type: 'moving' },
            { x: 300, y: 1500, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 100, y: 1600, width: platformWidth, height: platformHeight, color: 'gold', type: 'win' }
        ],
        enemies: [
            { x: 300, y: 150, width: 40, height: 40, color: 'purple', type: 'standard' },
            { x: 200, y: 450, width: 40, height: 40, color: 'purple', type: 'standard' },
            { x: 400, y: 650, width: 40, height: 40, color: 'purple', type: 'standard' },
            { x: 300, y: 1050, width: 40, height: 40, color: 'purple', type: 'standard' },
            { x: 500, y: 1250, width: 40, height: 40, color: 'purple', type: 'standard' },
            { x: 200, y: 1450, width: 40, height: 40, color: 'purple', type: 'standard' }
        ],
        boss: null,
        turrets: []
    },
    3: {
        platforms: [
            { x: 200, y: 100, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 400, y: 200, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 100, y: 300, width: platformWidth, height: platformHeight, color: 'blue', type: 'moving' },
            { x: 500, y: 400, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 300, y: 500, width: platformWidth, height: platformHeight, color: 'red', type: 'breakable' },
            { x: 150, y: 600, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 600, y: 700, width: platformWidth, height: platformHeight, color: 'blue', type: 'moving' },
            { x: 300, y: 800, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 100, y: 900, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 500, y: 1000, width: platformWidth, height: platformHeight, color: 'blue', type: 'moving' },
            { x: 200, y: 1100, width: platformWidth, height: platformHeight, color: 'red', type: 'breakable' },
            { x: 400, y: 1200, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 150, y: 1300, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 600, y: 1400, width: platformWidth, height: platformHeight, color: 'blue', type: 'moving' },
            { x: 300, y: 1500, width: platformWidth, height: platformHeight, color: 'green', type: 'standard' },
            { x: 100, y: 1600, width: platformWidth, height: platformHeight, color: 'gold', type: 'win' }
        ],
        enemies: [
            { x: 500, y: 32, width: 40, height: 40, color: 'orange', type: 'patrolling', platformX: 500, platformY: 400 },
            { x: 100, y: 32, width: 40, height: 40, color: 'orange', type: 'patrolling', platformX: 100, platformY: 900 },
            { x: 150, y: 32, width: 40, height: 40, color: 'orange', type: 'patrolling', platformX: 150, platformY: 1300 }
        ],
        boss: null,
        turrets: []
    },
    4: {
        platforms: [
            { x: 100, y: 100, width: 140, height: 20, color: 'green', type: 'standard' },
            { x: 300, y: 200, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 500, y: 300, width: 120, height: 20, color: 'green', type: 'standard' },
            { x: 340, y: 360, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 140, y: 400, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 400, y: 500, width: 120, height: 20, color: 'green', type: 'standard' },
            { x: 200, y: 600, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 400, y: 700, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 550, y: 700, width: 130, height: 20, color: 'green', type: 'standard' },
            { x: 300, y: 750, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 100, y: 800, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 340, y: 900, width: 140, height: 20, color: 'green', type: 'standard' },
            { x: 500, y: 1000, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 260, y: 1100, width: 120, height: 20, color: 'green', type: 'standard' },
            { x: 450, y: 1200, width: 90, height: 20, color: 'green', type: 'standard' },
            { x: 150, y: 1300, width: 110, height: 20, color: 'green', type: 'standard' },
            { x: 300, y: 1400, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 500, y: 1500, width: 120, height: 20, color: 'gold', type: 'win' }
        ],
        enemies: [
            { x: 160, y: 140, width: 40, height: 40, color: 'purple', type: 'jumping' },
            { x: 340, y: 240, width: 40, height: 40, color: 'purple', type: 'jumping' },
            { x: 540, y: 340, width: 40, height: 40, color: 'purple', type: 'jumping' },
            { x: 160, y: 440, width: 40, height: 40, color: 'purple', type: 'jumping' },
            { x: 440, y: 540, width: 40, height: 40, color: 'purple', type: 'jumping' },
            { x: 220, y: 640, width: 40, height: 40, color: 'purple', type: 'jumping' },
            { x: 620, y: 740, width: 40, height: 40, color: 'purple', type: 'jumping' },
            { x: 140, y: 840, width: 40, height: 40, color: 'purple', type: 'jumping' },
            { x: 400, y: 940, width: 40, height: 40, color: 'purple', type: 'jumping' },
            { x: 540, y: 1040, width: 40, height: 40, color: 'purple', type: 'jumping' },
            { x: 300, y: 1140, width: 40, height: 40, color: 'purple', type: 'jumping' },
            { x: 480, y: 1240, width: 40, height: 40, color: 'purple', type: 'jumping' },
            { x: 200, y: 1340, width: 40, height: 40, color: 'purple', type: 'jumping' }
        ],
        boss: null,
        turrets: []
    },
    5: {
        platforms: [],
        enemies: [],
        boss: { x: 650, y: 180, width: 100, height: 100, health: 500 },
        turrets: []
    },
    6: {
        platforms: [
            { x: 100, y: 100, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 300, y: 200, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 500, y: 300, width: 100, height: 20, color: 'blue', type: 'moving' },
            { x: 200, y: 400, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 400, y: 500, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 150, y: 600, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 600, y: 700, width: 100, height: 20, color: 'blue', type: 'moving' },
            { x: 0, y: 800, width: 60, height: 40, color: 'gray', type: 'wall' },
            { x: 160, y: 860, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 760, y: 900, width: 40, height: 40, color: 'gray', type: 'wall' },
            { x: 560, y: 960, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 340, y: 1000, width: 100, height: 40, color: 'gray', type: 'wall' },
            { x: 340, y: 1060, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 240, y: 960, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 300, y: 1160, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 100, y: 1240, width: 100, height: 20, color: 'gold', type: 'win' }
        ],
        enemies: [
            { x: 140, y: 160, width: 40, height: 40, color: 'purple', type: 'standard' },
            { x: 200, y: 40, width: 40, height: 40, color: 'orange', type: 'patrolling', platformX: 200, platformY: 400 },
            { x: 180, y: 640, width: 40, height: 40, color: 'purple', type: 'jumping' }
        ],
        boss: null,
        turrets: [
            { x: 0, y: 760, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 380, y: 960, width: 40, height: 40, color: 'darkred', shootDirection: 'down' }
        ]
    },
    7: {
        platforms: [
            { x: 340, y: 100, width: 100, height: 20, color: 'gray', type: 'wall' },
            { x: 340, y: 200, width: 100, height: 20, color: 'gray', type: 'wall' },
            { x: 340, y: 300, width: 100, height: 20, color: 'gray', type: 'wall' },
            { x: 180, y: 380, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 300, y: 460, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 440, y: 540, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 240, y: 620, width: 100, height: 20, color: 'blue', type: 'moving' },
            { x: 340, y: 700, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 220, y: 800, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 100, y: 920, width: 100, height: 20, color: 'gold', type: 'win' }
        ],
        enemies: [],
        boss: null,
        turrets: [
            { x: 760, y: 160, width: 40, height: 40, color: 'darkred', shootDirection: 'left' },
            { x: 0, y: 280, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 0, y: 340, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 0, y: 420, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 760, y: 500, width: 40, height: 40, color: 'darkred', shootDirection: 'left' },
            { x: 760, y: 660, width: 40, height: 40, color: 'darkred', shootDirection: 'left' },
            { x: 0, y: 720, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 760, y: 740, width: 40, height: 40, color: 'darkred', shootDirection: 'left' },
            { x: 0, y: 800, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 0, y: 880, width: 40, height: 40, color: 'darkred', shootDirection: 'right' }
        ]
    },
    8: {
        platforms: [
            { x: 340, y: 100, width: 120, height: 20, color: 'green', type: 'standard' },
            { x: 220, y: 200, width: 80, height: 20, color: 'blue', type: 'moving' },
            { x: 460, y: 300, width: 140, height: 20, color: 'red', type: 'breakable' },
            { x: 300, y: 400, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 100, y: 500, width: 100, height: 20, color: 'blue', type: 'moving' },
            { x: 600, y: 600, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 400, y: 700, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 200, y: 800, width: 80, height: 20, color: 'blue', type: 'moving' },
            { x: 500, y: 900, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 300, y: 1000, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 100, y: 1100, width: 100, height: 20, color: 'blue', type: 'moving' },
            { x: 600, y: 1200, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 200, y: 1300, width: 300, height: 20, color: 'green', type: 'standard' },
            { x: 200, y: 1400, width: 100, height: 20, color: 'blue', type: 'moving' },
            { x: 500, y: 1500, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 300, y: 1600, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 100, y: 1700, width: 100, height: 20, color: 'blue', type: 'moving' },
            { x: 600, y: 1800, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 400, y: 1900, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 200, y: 2000, width: 100, height: 20, color: 'blue', type: 'moving' },
            { x: 500, y: 2100, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 300, y: 2200, width: 100, height: 20, color: 'green', type: 'standard' },
            { x: 100, y: 2300, width: 100, height: 20, color: 'blue', type: 'moving' },
            { x: 600, y: 2400, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 400, y: 2500, width: 100, height: 20, color: 'gold', type: 'win' },
            { x: 180, y: 2100, width: 100, height: 20, color: 'red', type: 'breakable' },
            { x: 120, y: 620, width: 60, height: 20, color: 'red', type: 'breakable' },
            { x: 100, y: 740, width: 60, height: 20, color: 'red', type: 'breakable' },
            { x: 40, y: 2220, width: 40, height: 20, color: 'red', type: 'breakable' },
            { x: 0, y: 800, width: 40, height: 20, color: 'gray', type: 'wall' },
            { x: 100, y: 1820, width: 60, height: 20, color: 'gray', type: 'wall' },
            { x: 100, y: 1920, width: 60, height: 20, color: 'gray', type: 'wall' }
        ],
        enemies: [
            { x: 350, y: 150, width: 40, height: 40, color: 'purple', type: 'standard' },
            { x: 300, y: 450, width: 40, height: 40, color: 'purple', type: 'standard' },
            { x: 300, y: 1050, width: 40, height: 40, color: 'purple', type: 'standard' },
            { x: 400, y: 1340, width: 40, height: 40, color: 'purple', type: 'standard' },
            { x: 400, y: 1950, width: 40, height: 40, color: 'purple', type: 'standard' },
            { x: 300, y: 2250, width: 40, height: 40, color: 'purple', type: 'standard' },
            { x: 340, y: 1340, width: 40, height: 40, color: 'purple', type: 'jumping' }
        ],
        turrets: [
            { x: 0, y: 150, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 760, y: 250, width: 40, height: 40, color: 'darkred', shootDirection: 'left' },
            { x: 0, y: 350, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 760, y: 450, width: 40, height: 40, color: 'darkred', shootDirection: 'left' },
            { x: 760, y: 850, width: 40, height: 40, color: 'darkred', shootDirection: 'left' },
            { x: 0, y: 950, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 760, y: 1050, width: 40, height: 40, color: 'darkred', shootDirection: 'left' },
            { x: 760, y: 1250, width: 40, height: 40, color: 'darkred', shootDirection: 'left' },
            { x: 0, y: 1350, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 760, y: 1450, width: 40, height: 40, color: 'darkred', shootDirection: 'left' },
            { x: 0, y: 1550, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 0, y: 1750, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 0, y: 1950, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 760, y: 2050, width: 40, height: 40, color: 'darkred', shootDirection: 'left' },
            { x: 0, y: 2150, width: 40, height: 40, color: 'darkred', shootDirection: 'right' },
            { x: 760, y: 2250, width: 40, height: 40, color: 'darkred', shootDirection: 'left' },
            { x: 0, y: 2350, width: 40, height: 40, color: 'darkred', shootDirection: 'right' }
        ]
    },
    9: {
        platforms: [
            { x: 100, y: 100, width: 100, height: 20, type: 'standard' },
            { x: 240, y: 200, width: 100, height: 20, type: 'moving' },
            { x: 400, y: 300, width: 100, height: 20, type: 'breakable' },
            { x: 550, y: 400, width: 100, height: 20, type: 'standard' },
            { x: 700, y: 500, width: 100, height: 20, type: 'moving' },
            { x: 540, y: 600, width: 100, height: 20, type: 'breakable' },
            { x: 400, y: 700, width: 100, height: 20, type: 'standard' },
            { x: 250, y: 800, width: 100, height: 20, type: 'moving' },
            { x: 100, y: 900, width: 100, height: 20, type: 'breakable' },
            { x: 250, y: 1000, width: 100, height: 20, type: 'standard' },
            { x: 400, y: 1100, width: 100, height: 20, type: 'moving' },
            { x: 550, y: 1200, width: 100, height: 20, type: 'breakable' },
            { x: 700, y: 1300, width: 100, height: 20, type: 'standard' },
            { x: 540, y: 1400, width: 100, height: 20, type: 'moving' },
            { x: 400, y: 1500, width: 100, height: 20, type: 'breakable' },
            { x: 250, y: 1600, width: 100, height: 20, type: 'standard' },
            { x: 100, y: 1700, width: 100, height: 20, type: 'moving' },
            { x: 250, y: 1800, width: 100, height: 20, type: 'breakable' },
            { x: 400, y: 1900, width: 100, height: 20, type: 'standard' },
            { x: 550, y: 2000, width: 100, height: 20, type: 'moving' },
            { x: 700, y: 2100, width: 100, height: 20, type: 'breakable' },
            { x: 550, y: 2200, width: 100, height: 20, type: 'standard' },
            { x: 400, y: 2300, width: 100, height: 20, type: 'moving' },
            { x: 250, y: 2400, width: 100, height: 20, type: 'breakable' },
            { x: 100, y: 2500, width: 100, height: 20, type: 'standard' },
            { x: 340, y: 2580, width: 100, height: 20, type: 'win' },
            { x: 100, y: 1200, width: 100, height: 20, type: 'standard' },
            { x: 0, y: 1080, width: 40, height: 180, type: 'wall' },
            { x: 760, y: 760, width: 40, height: 160, type: 'wall' },
            { x: 0, y: 3000, width: 800, height: 160, type: 'wall' },
            { x: 60, y: 1320, width: 100, height: 20, type: 'standard' }
        ],
        enemies: [
            { x: 150, y: 150, type: 'jumping' },
            { x: 450, y: 750, type: 'standard' },
            { x: 120, y: 940, type: 'jumping' },
            { x: 750, y: 1350, type: 'standard' },
            { x: 160, y: 2560, type: 'standard' },
            { x: 400, y: 40, type: 'patrolling', platformX: 400, platformY: 1900 },
            { x: 100, y: 40, type: 'patrolling', platformX: 100, platformY: 1200 },
            { x: 600, y: 640, type: 'jumping' }
        ],
        turrets: [
            { x: 0, y: 300, width: 40, height: 40, shootDirection: 'right' },
            { x: 760, y: 600, width: 40, height: 40, shootDirection: 'left' },
            { x: 0, y: 900, width: 40, height: 40, shootDirection: 'right' },
            { x: 760, y: 1200, width: 40, height: 40, shootDirection: 'left' },
            { x: 0, y: 1500, width: 40, height: 40, shootDirection: 'right' },
            { x: 0, y: 2100, width: 40, height: 40, shootDirection: 'right' },
            { x: 760, y: 2400, width: 40, height: 40, shootDirection: 'left' },
            { x: 0, y: 2240, width: 40, height: 40, shootDirection: 'right' },
            { x: 760, y: 1660, width: 40, height: 40, shootDirection: 'left' },
            { x: 100, y: 2840, width: 40, height: 40, shootDirection: 'down' },
            { x: 660, y: 2840, width: 40, height: 40, shootDirection: 'down' }
        ]
    },
    10: {
        platforms: [],
        enemies: [],
        boss2: { x: 650, y: 180, width: 100, height: 100, health: 750 },
        turrets: []
    }
}

function loadLevel(levelNum, isEditor = false) {
    platforms = [];
    enemies = [];
    turrets = [];
    boss = null;
    boss2 = null;
    const groundPlatformY = canvas.height - 20;
    if (isEditor) {
        platforms.push(new Platform(0, groundPlatformY, canvas.width, 20, 'gray', 'standard'));
        return;
    }
    platforms.push(new Platform(0, groundPlatformY, canvas.width, 20, 'green', 'standard'));
    const levelData = levelsData[levelNum];
    if (!levelData) return;
    levelData.platforms.forEach(p => {
        let color = p.color; // Use existing color if present
        if (!color) { // Assign default color if missing
            switch (p.type) {
                case 'standard': color = 'green'; break;
                case 'moving': color = 'blue'; break;
                case 'breakable': color = 'red'; break;
                case 'win': color = 'gold'; break;
                case 'wall': color = 'gray'; break;
                default: color = 'purple'; // Fallback for unknown types
            }
        }
        platforms.push(new Platform(p.x, groundPlatformY - p.y, p.width, p.height, color, p.type));
    });

    levelData.enemies.forEach(e => {
        let enemyColor = e.color; // Use existing color if present
        if (!enemyColor) { // Assign default color if missing
            switch (e.type) {
                case 'standard': enemyColor = 'purple'; break;
                case 'patrolling': enemyColor = 'orange'; break;
                case 'jumping': enemyColor = 'purple'; break;
                default: enemyColor = 'pink'; // Fallback for unknown types
            }
        }
        let p = platforms.find(pf => pf.x === e.platformX && pf.y === (groundPlatformY - e.platformY));
        enemies.push(new Enemy(e.x, p ? p.y - e.y : groundPlatformY - e.y, e.width || 40, e.height || 40, enemyColor, e.type, p));
    });
    if (levelData.boss) {
        const b = levelData.boss;
        boss = new Boss(b.x, groundPlatformY - b.y, b.width, b.height, b.health);
    }
    if (levelData.boss2) {
        const b = levelData.boss2;
        boss2 = new Boss2(b.x, groundPlatformY - b.y, b.width, b.height, b.health);
    }
    levelData.turrets.forEach(t => {
        let turretColor = t.color; // Use existing color if present
        if (!turretColor) { // Assign default color if missing
            turretColor = 'darkred'; // Default color for turrets
        }
        // Enforce standard turret size (40x40) regardless of level data
        turrets.push(new Turret(t.x, groundPlatformY - t.y, 40, 40, turretColor, t.shootDirection));
    });
}

function resetLevelForPlaying(levelNum) {
    if (!isTimeAttackMode) {
        if (levelNum === 5 || levelNum === 10) {
            backgroundMusic.src = 'boss music.mp3';
        } else {
            backgroundMusic.src = 'level music.m4a';
        }
        backgroundMusic.currentTime = 0;
        backgroundMusic.play();
    }
    score = 0;
    cameraY = 0;
    gameover = false;
    gameWon = false;
    velocityY = 0;
    projectiles = [];
    level = levelNum;
    player = new Player(canvas.width / 2 - playerWidth / 2, canvas.height - 20 - playerHeight, playerWidth, playerHeight);
    loadLevel(levelNum);
}

function resetLevelForEditor() {
    backgroundMusic.pause();
    backgroundMusic.src = 'level music.m4a';
    platforms = [];
    enemies = [];
    turrets = [];
    boss = null;
    boss2 = null;
    player = null;
    platforms.push(new Platform(0, canvas.height - 20, canvas.width, 20, 'green', 'standard'));
}

function drawMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dungeon Jumper', canvas.width / 2, 100);
    ctx.font = '24px sans-serif';
    ctx.fillText('Level Select', canvas.width / 2, 150);

    const levels = Object.keys(levelsData);
    const editorButton = { name: 'Level Editor', level: 'editor' };
    const timeAttackButton = { name: 'Time Attack', mode: 'timeAttack' };
    const challengesButton = { name: 'Special Challenges', mode: 'challenges' };
    
    const topRowItems = [...levels, editorButton, timeAttackButton];

    const itemsPerRow = 4;
    const buttonWidth = 150;
    const buttonHeight = 60;
    const gap = 20;
    const startY = 200;

    // Draw top rows
    const startX = (canvas.width - (itemsPerRow * buttonWidth + (itemsPerRow - 1) * gap)) / 2;
    topRowItems.forEach((item, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const x = startX + col * (buttonWidth + gap);
        const y = startY + row * (buttonHeight + gap);

        ctx.fillStyle = 'gray';
        ctx.fillRect(x, y, buttonWidth, buttonHeight);

        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        let text = typeof item === 'object' ? item.name : 'Level ' + item;
        if (item === '5') text = 'Boss 1';
        if (item === '10') text = 'Boss 2';
        ctx.fillText(text, x + buttonWidth / 2, y + buttonHeight / 2 + 8);
    });

    // Draw challenges button on a new row
    const challengesButtonWidth = 220;
    const lastRowY = startY + (Math.ceil(topRowItems.length / itemsPerRow)) * (buttonHeight + gap);
    const challengesButtonX = (canvas.width - challengesButtonWidth) / 2;

    ctx.fillStyle = 'gray';
    ctx.fillRect(challengesButtonX, lastRowY, challengesButtonWidth, buttonHeight);

    ctx.fillStyle = 'white';
    ctx.font = '20px sans-serif';
    ctx.fillText(challengesButton.name, challengesButtonX + challengesButtonWidth / 2, lastRowY + buttonHeight / 2 + 8);
}

function drawChallengesMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Special Challenges', canvas.width / 2, 100);

    // Back button
    ctx.fillStyle = 'gray';
    ctx.fillRect(canvas.width / 2 - 100, canvas.height - 100, 200, 40);
    ctx.fillStyle = 'white';
    ctx.font = '20px sans-serif';
    ctx.fillText('Back to Menu', canvas.width / 2, canvas.height - 75);
}

function clickHandler(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect(), mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;

    // Back to Menu / Editor button click handler
    if (gameState === 'playing') {
        const buttonX = canvas.width - 160;
        const buttonY = 50;
        const buttonWidth = 150;
        const buttonHeight = 40;
        if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth && mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
            if (isTestingLevel) {
                returnToEditor();
            } else {
                backgroundMusic.pause();
                gameState = 'menu';
                isTimeAttackMode = false;
            }
            return; // Exit handler
        }
    }

    if (gameState === 'menu') {
        const levels = Object.keys(levelsData);
        const editorButton = { name: 'Level Editor', level: 'editor' };
        const timeAttackButton = { name: 'Time Attack', mode: 'timeAttack' };
        const challengesButton = { name: 'Special Challenges', mode: 'challenges' };
        
        const topRowItems = [...levels, editorButton, timeAttackButton];

        const itemsPerRow = 4;
        const buttonWidth = 150;
        const buttonHeight = 60;
        const gap = 20;
        const startY = 200;

        // Handle clicks on top row items
        const startX = (canvas.width - (itemsPerRow * buttonWidth + (itemsPerRow - 1) * gap)) / 2;
        topRowItems.forEach((item, index) => {
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const x = startX + col * (buttonWidth + gap);
            const y = startY + row * (buttonHeight + gap);

            if (mouseX >= x && mouseX <= x + buttonWidth && mouseY >= y && mouseY <= y + buttonHeight) {
                if (typeof item === 'object') {
                    if (item.mode === 'timeAttack') {
                        backgroundMusic.src = 'level music.m4a';
                        backgroundMusic.currentTime = 0;
                        backgroundMusic.play();
                        isTimeAttackMode = true;
                        totalGameTime = 0; // Reset total time for new run
                        gameState = 'playing';
                        levelEditorControls.style.display = 'none';
                        resetLevelForPlaying(1); // Start from Level 1 for Time Attack
                    } else { // Level Editor button
                        backgroundMusic.pause();
                        gameState = 'levelEditor';
                        levelEditorControls.style.display = 'block';
                        resetLevelForEditor();
                    }
                } else { // Regular level button
                    isTimeAttackMode = false; // Ensure not in time attack mode
                    gameState = 'playing';
                    levelEditorControls.style.display = 'none';
                    resetLevelForPlaying(parseInt(item, 10));
                }
            }
        });

        // Handle click on challenges button
        const challengesButtonWidth = 220;
        const lastRowY = startY + (Math.ceil(topRowItems.length / itemsPerRow)) * (buttonHeight + gap);
        const challengesButtonX = (canvas.width - challengesButtonWidth) / 2;

        if (mouseX >= challengesButtonX && mouseX <= challengesButtonX + challengesButtonWidth && mouseY >= lastRowY && mouseY <= lastRowY + buttonHeight) {
            gameState = 'challengesMenu';
        }
    } else if (gameState === 'challengesMenu') {
        // Back button
        if (mouseX >= canvas.width / 2 - 100 && mouseX <= canvas.width / 2 + 100 && mouseY >= canvas.height - 100 && mouseY <= canvas.height - 60) {
            gameState = 'menu';
        }
    } else if (gameState === 'levelEditor') {
        const editorMouseX = mouseX;
        const editorMouseY = mouseY + editorCameraY;

        const gridX = Math.floor(editorMouseX / editorGridSize) * editorGridSize;
        const gridY = Math.floor(editorMouseY / editorGridSize) * editorGridSize;

        if (editorMode === 'place') {
            if (e.type === 'click') {
                if (currentEntityType === 'platform') {
                    let color;
                    switch(currentPlatformType) {
                        case 'standard': color = 'green'; break;
                        case 'moving': color = 'blue'; break;
                        case 'breakable': color = 'red'; break;
                        case 'win': color = 'gold'; break;
                        case 'wall': color = 'gray'; break;
                    }
                    platforms.push(new Platform(gridX, gridY, platformWidth, platformHeight, color, currentPlatformType));
                } else if (currentEntityType === 'enemy') {
                    const enemyWidth = 40, enemyHeight = 40;

                    if (currentEnemyType === 'patrolling') {
                        const potentialPlatforms = [];
                        // Find all platforms below the click that contain the X-coordinate
                        for (const p of platforms) {
                            if (gridX >= p.x && gridX < p.x + p.width && (gridY + editorGridSize - enemyHeight) < p.y) {
                                potentialPlatforms.push(p);
                            }
                        }

                        if (potentialPlatforms.length === 0) {
                            alert("Patrolling enemies must be placed in the air above a platform.");
                            return;
                        }

                        // Find the highest platform among the candidates (closest to the click)
                        potentialPlatforms.sort((a, b) => a.y - b.y);
                        const targetPlatform = potentialPlatforms[0];

                        // Place the enemy at the clicked location, but associate it with the platform below.
                        const snappedEnemyX = Math.round((editorMouseX - enemyWidth / 2) / editorGridSize) * editorGridSize;
                        enemies.push(new Enemy(snappedEnemyX, gridY + editorGridSize - enemyHeight, enemyWidth, enemyHeight, 'orange', 'patrolling', targetPlatform));

                    } else { // For 'standard' and 'jumping' enemies
                        let color;
                        switch(currentEnemyType) {
                            case 'standard': color = 'purple'; break;
                            case 'jumping': color = 'purple'; break;
                        }
                        // Place them at the clicked grid Y, they will fall.
                        const snappedEnemyX = Math.round((editorMouseX - enemyWidth / 2) / editorGridSize) * editorGridSize;
                        const snappedEnemyY = Math.round((editorMouseY - enemyHeight / 2) / editorGridSize) * editorGridSize;
                        enemies.push(new Enemy(snappedEnemyX, snappedEnemyY, enemyWidth, enemyHeight, color, currentEnemyType, null));
                    }
                } else if (currentEntityType === 'turret') {
                    const turretWidth = 40, turretHeight = 40;
                    const shootDirection = 'left';
                    const snappedTurretX = Math.round((editorMouseX - turretWidth / 2) / editorGridSize) * editorGridSize;
                    const snappedTurretY = Math.round((editorMouseY - turretHeight / 2) / editorGridSize) * editorGridSize;
                    turrets.push(new Turret(snappedTurretX, snappedTurretY, turretWidth, turretHeight, 'darkred', shootDirection));
                }
            }
        } else if (editorMode === 'remove') {
            if (e.type === 'click') { // Use click for remove in remove mode
                let removedSomething = false;
                // Prioritize removing turrets
                for (let i = turrets.length - 1; i >= 0; i--) {
                    const t = turrets[i];
                    if (editorMouseX >= t.x && editorMouseX <= t.x + t.width && editorMouseY >= t.y && editorMouseY <= t.y + t.height) {
                        turrets.splice(i, 1);
                        removedSomething = true;
                        break;
                    }
                }

                // Then enemies
                if (!removedSomething) {
                    for (let i = enemies.length - 1; i >= 0; i--) {
                        const en = enemies[i];
                        if (editorMouseX >= en.x && editorMouseX <= en.x + en.width && editorMouseY >= en.y && editorMouseY <= en.y + en.height) {
                            enemies.splice(i, 1);
                            removedSomething = true;
                            break; // Exit after removing one enemy
                        }
                    }
                }

                if (!removedSomething) {
                    for (let i = platforms.length - 1; i >= 0; i--) {
                        const p = platforms[i];
                        if (editorMouseX >= p.x && mouseX <= p.x + p.width && mouseY >= p.y && mouseY <= p.y + p.height) {
                            platforms.splice(i, 1);
                            break; // Exit after removing one platform
                        }
                    }
                }
            }
        } else if (editorMode === 'rotate') {
            if (e.type === 'click') {
                for (let i = turrets.length - 1; i >= 0; i--) {
                    const t = turrets[i];
                    if (editorMouseX >= t.x && editorMouseX <= t.x + t.width && editorMouseY >= t.y && editorMouseY <= t.y + t.height) {
                        switch (t.shootDirection) {
                            case 'left': t.shootDirection = 'up'; break;
                            case 'up': t.shootDirection = 'right'; break;
                            case 'right': t.shootDirection = 'down'; break;
                            case 'down': t.shootDirection = 'left'; break;
                        }
                        break;
                    }
                }
            }
        }
    } else if (gameState === 'gameover') {
        // 'Try Again' button
        if (mouseX >= canvas.width/2 - 100 && mouseX <= canvas.width/2 + 100 && mouseY >= canvas.height/2 + 80 && mouseY <= canvas.height/2 + 120) {
            if (isTestingLevel) {
                resetLevelForEditorPlaytest();
            } else {
                resetLevelForPlaying(level);
                gameState = 'playing';
            }
        }
        // 'Back to Menu' / 'Back to Editor' button
        if (mouseX >= canvas.width/2 - 100 && mouseX <= canvas.width/2 + 100 && mouseY >= canvas.height/2 + 130 && mouseY <= canvas.height/2 + 170) {
            if (isTestingLevel) {
                returnToEditor();
            } else {
                backgroundMusic.pause();
                gameState = 'menu';
            }
        }
    } else if (gameState === 'gameWon') {
        if (isTestingLevel) {
            if (mouseX >= canvas.width/2 - 100 && mouseX <= canvas.width/2 + 100 && mouseY >= canvas.height/2 + 80 && mouseY <= canvas.height/2 + 120) {
                returnToEditor();
            }
        } else if (isTimeAttackMode) {
            if (level >= Object.keys(levelsData).length) { // All levels completed
                if (mouseX >= canvas.width/2 - 100 && mouseX <= canvas.width/2 + 100 && mouseY >= canvas.height/2 + 180 && mouseY <= canvas.height/2 + 220) {
                    backgroundMusic.pause();
                    gameState = 'menu';
                    isTimeAttackMode = false; // Reset mode
                }
            } else { // Not all levels completed, go to next
                if (mouseX >= canvas.width/2 - 100 && mouseX <= canvas.width/2 + 100 && mouseY >= canvas.height/2 + 80 && mouseY <= canvas.height/2 + 120) {
                    level++;
                    resetLevelForPlaying(level);
                    gameState = 'playing';
                }
            }
        } else {
            // 'Continue' button for regular game
            if (mouseX >= canvas.width/2 - 100 && mouseX <= canvas.width/2 + 100 && mouseY >= canvas.height/2 + 80 && mouseY <= canvas.height/2 + 120) {
                if (level < Object.keys(levelsData).length) {
                    level++;
                    resetLevelForPlaying(level);
                    gameState = 'playing';
                } else {
                    backgroundMusic.pause();
                    gameState = 'menu'; // Or a 'You Win!' screen
                }
            }
            // 'Back to Menu' button
            if (mouseX >= canvas.width/2 - 100 && mouseX <= canvas.width/2 + 100 && mouseY >= canvas.height/2 + 130 && mouseY <= canvas.height/2 + 170) {
                backgroundMusic.pause();
                gameState = 'menu';
            }
        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'playing') {
        if (gameover) {
            gameState = 'gameover';
        } else if (gameWon) {
            gameState = 'gameWon';
        }
        update();
        draw();
    } else if (gameState === 'gameover') {
        if (!isTimeAttackMode) {
            backgroundMusic.pause();
        }
        if (isTimeAttackMode) {
            resetLevelForPlaying(level);
            gameState = 'playing';
        } else {
            // Original game over screen for non-time-attack modes
            ctx.fillStyle = 'white';
            ctx.font = '48px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
            ctx.font = '24px sans-serif';
            ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 50);

            // 'Try Again' button
            ctx.fillStyle = 'gray';
            ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 80, 200, 40);
            ctx.fillStyle = 'white';
            ctx.font = '20px sans-serif';
            ctx.fillText('Try Again', canvas.width / 2, canvas.height / 2 + 105);

            // 'Back to Menu' or 'Back to Editor' button
            ctx.fillStyle = 'gray';
            ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 130, 200, 40);
            ctx.fillStyle = 'white';
            ctx.font = '20px sans-serif';
            ctx.fillText(isTestingLevel ? 'Back to Editor' : 'Back to Menu', canvas.width / 2, canvas.height / 2 + 155);
        }
    } else if (gameState === 'menu') {
        drawMenu();
    } else if (gameState === 'challengesMenu') {
        drawChallengesMenu();
    } else if (gameState === 'gameWon') {
        if (!isTimeAttackMode) {
            backgroundMusic.pause();
        }
        if (isTimeAttackMode) {
            if (level < Object.keys(levelsData).length) {
                // Instantly go to the next level
                level++;
                resetLevelForPlaying(level);
                gameState = 'playing';
            } else {
                // For the final level, show the completion screen
                ctx.fillStyle = 'white';
                ctx.font = '48px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Game Complete!', canvas.width / 2, canvas.height / 2);
                
                const minutes = Math.floor(totalGameTime / 60);
                const seconds = totalGameTime % 60;
                const formattedTime = `Total Time: ${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
                ctx.font = '24px sans-serif';
                ctx.fillText(formattedTime, canvas.width / 2, canvas.height / 2 + 100);

                // Button to go back to menu
                ctx.fillStyle = 'gray';
                ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 180, 200, 40);
                ctx.fillStyle = 'white';
                ctx.font = '20px sans-serif';
                ctx.fillText('Back to Menu', canvas.width / 2, canvas.height / 2 + 205);
            }
        } else {
            // Original game won screen for non-time-attack modes
            ctx.fillStyle = 'white';
            ctx.font = '48px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Level Complete!', canvas.width / 2, canvas.height / 2);
            ctx.font = '24px sans-serif';
            ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 50);

            if (isTestingLevel) {
                // 'Back to Editor' button
                ctx.fillStyle = 'gray';
                ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 80, 200, 40);
                ctx.fillStyle = 'white';
                ctx.font = '20px sans-serif';
                ctx.fillText('Back to Editor', canvas.width / 2, canvas.height / 2 + 105);
            } else {
                // 'Continue' button
                ctx.fillStyle = 'gray';
                ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 80, 200, 40);
                ctx.fillStyle = 'white';
                ctx.font = '20px sans-serif';
                ctx.fillText('Continue', canvas.width / 2, canvas.height / 2 + 105);

                // 'Back to Menu' button
                ctx.fillStyle = 'gray';
                ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 130, 200, 40);
                ctx.fillStyle = 'white';
                ctx.font = '20px sans-serif';
                ctx.fillText('Back to Menu', canvas.width / 2, canvas.height / 2 + 155);
            }
        }
    } else if (gameState === 'levelEditor') {
        drawLevelEditor();
    }
    requestAnimationFrame(gameLoop);
}

function update() {
    if (!player) return; // Only update player if in playing mode

    if (isTimeAttackMode && gameState === 'playing') {
        totalGameTime += (1 / 60); // Assuming 60 FPS, add 1 second every 60 frames
    }

    // Update other game elements
    platforms.forEach(p => p.update());
    enemies.forEach(e => e.update());
    turrets.forEach(t => t.update());
    if (boss) boss.update();
    if (boss2) boss2.update();
    projectiles.forEach(p => p.update());

    // Update player animation state
    let newState = (keys.right && !keys.left) ? 'movingRight' : ((keys.left && !keys.right) ? 'movingLeft' : 'standing');
    if (player.state !== newState) {
        player.state = newState;
        player.currentFrame = 0;
        player.frameCounter = 0;
    }
    player.updateAnimation();

    // --- Player Physics ---

    // 1. HORIZONTAL MOVEMENT
    let platformSpeedX = 0;
    platforms.forEach(p => {
        if (p.type === 'moving' && (player.y + player.height) >= p.y && (player.y + player.height) <= p.y + 5 && player.x < p.x + p.width && player.x + player.width > p.x) {
            platformSpeedX = p.speed * p.direction;
        }
    });

    let playerInputMovement = 0;
    if (keys.right && !keys.left) {
        playerInputMovement = playerSpeed;
    } else if (keys.left && !keys.right) {
        playerInputMovement = -playerSpeed;
    }

    player.x += playerInputMovement + platformSpeedX;

    // 2. HORIZONTAL COLLISION RESOLUTION
    const solidObjects = platforms.concat(turrets);
    for (const obj of solidObjects) {
        if (obj.type === 'wall' || obj instanceof Turret) {
            if (player.x < obj.x + obj.width && player.x + player.width > obj.x &&
                player.y < obj.y + obj.height && player.y + player.height > obj.y) {

                const playerMovement = playerInputMovement + platformSpeedX;
                if (playerMovement > 0) { // Was moving right
                    player.x = obj.x - player.width;
                } else if (playerMovement < 0) { // Was moving left
                    player.x = obj.x + obj.width;
                }
            }
        }
    }

    // 3. VERTICAL MOVEMENT
    if (keys.space && isGrounded) {
        velocityY = -jumpHeight;
    }
    velocityY += gravity;
    player.y += velocityY;
    isGrounded = false;

    // 4. VERTICAL COLLISION RESOLUTION
    for (const obj of solidObjects) {
        // Check for AABB collision
        if (player.x < obj.x + obj.width && player.x + player.width > obj.x &&
            player.y < obj.y + obj.height && player.y + player.height > obj.y) {
            
            if (velocityY > 0) { // Was moving down
                const previousPlayerBottom = player.y + player.height - velocityY;
                if (previousPlayerBottom <= obj.y) {
                    player.y = obj.y - player.height;
                    velocityY = 0;
                    isGrounded = true;

                    // Handle special platform types on landing
                    if (obj.type === 'breakable') {
                        setTimeout(() => {
                            const index = platforms.indexOf(obj);
                            if (index > -1) platforms.splice(index, 1);
                        }, 500);
                    }
                    if (obj.type === 'win') gameWon = true;
                }

            } else if (velocityY < 0) { // Was moving up
                 if (obj.type === 'wall' || obj instanceof Turret) {
                    player.y = obj.y + obj.height;
                    velocityY = 0;
                 }
            }
        }
    }

    // --- Final checks and other game logic ---
    player.x = Math.max(0, Math.min(player.x, canvas.width - player.width));

    // Enemy collision
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        // Check for general AABB overlap
        if (player.x < e.x + e.width && player.x + player.width > e.x &&
            player.y < e.y + e.height && player.y + player.height > e.y) {

            // If the player is falling, and their feet are near the top half of the enemy, it's a stomp.
            // This is a generous and robust check that solves the corner-collision bug.
            if (velocityY > 0 && (player.y + player.height) < (e.y + e.height / 2)) {
                enemies.splice(i, 1);
                score += 100;
                velocityY = -jumpHeight / 2; // Bounce
                continue; // Stomped, move to next enemy
            } else {
                // Any other kind of overlap is fatal.
                gameover = true;
            }
        }
    }

    // Boss collision
    if (level === 5 && boss) {
        if (player.x < boss.x + boss.width && player.x + player.width > boss.x && player.y < boss.y + boss.height && player.y + player.height > boss.y) {
            if (velocityY > 0 && player.y + player.height - velocityY <= boss.y) {
                boss.health -= 50;
                score += 500;
                velocityY = -jumpHeight;
                if (boss.health <= 0) gameWon = true;
            } else if (player.y + player.height > boss.y + boss.height / 4) {
                gameover = true;
            }
        }
    }

    if (level === 10 && boss2) {
        if (player.x < boss2.x + boss2.width && player.x + player.width > boss2.x && player.y < boss2.y + boss2.height && player.y + player.height > boss2.y) {
            if (velocityY > 0 && player.y + player.height - velocityY <= boss2.y) {
                boss2.health -= 50;
                score += 1000;
                velocityY = -jumpHeight;
                if (boss2.health <= 0) gameWon = true;
            } else if (player.y + player.height > boss2.y + boss2.height / 4) {
                gameover = true;
            }
        }
    }

    // Projectile collision
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (player.x < p.x + p.width && player.x + player.width > p.x && player.y < p.y + p.height && player.y + player.height > p.y) {
            gameover = true;
            projectiles.splice(i, 1);
        }
    }

    // Camera and Score
    if (player.y < cameraY + canvas.height / 2.5) {
        cameraY = player.y - canvas.height / 2.5;
    }
    // score = Math.max(0, Math.floor(-(cameraY) / 10));
    if (player.y > cameraY + canvas.height + 50) {
        gameover = true;
    }
}

function draw() {
    ctx.save();
    ctx.translate(0, -cameraY);
    if (player) player.draw();
    platforms.forEach(p => p.draw());
    enemies.forEach(e => e.draw());
    projectiles.forEach(p => p.draw());
    turrets.forEach(t => t.draw());
    if (boss) boss.draw();
    if (boss2) boss2.draw();
    ctx.restore();

    // Draw Score
    ctx.fillStyle = 'white';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 10, 30);

    // Draw Timer in Time Attack Mode
    if (isTimeAttackMode) {
        const minutes = Math.floor(totalGameTime / 60);
        const seconds = totalGameTime % 60;
        const formattedTime = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
        ctx.fillText(formattedTime, 10, 80);
    }

    // Back to Menu / Editor button
    const buttonText = isTestingLevel ? 'Back to Editor' : 'Back to Menu';
    ctx.fillStyle = 'gray';
    ctx.fillRect(canvas.width - 160, 50, 150, 40);
    ctx.fillStyle = 'white';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(buttonText, canvas.width - 85, 75);
    ctx.textAlign = 'left'; // Reset alignment
}

function drawLevelEditor() {
    ctx.save();
    ctx.translate(0, -editorCameraY);
    drawGrid();
    platforms.forEach(p => p.draw());
    enemies.forEach(e => e.draw());
    turrets.forEach(t => t.draw());

    // Draw border and resize handles for selected platform
    if (selectedPlatform && editorMode === 'resize') {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 2;
        ctx.strokeRect(selectedPlatform.x, selectedPlatform.y, selectedPlatform.width, selectedPlatform.height);

        const handleSize = 8;
        const handles = [
            { x: selectedPlatform.x - handleSize / 2, y: selectedPlatform.y - handleSize / 2, cursor: 'nwse-resize', name: 'top-left' },
            { x: selectedPlatform.x + selectedPlatform.width / 2 - handleSize / 2, y: selectedPlatform.y - handleSize / 2, cursor: 'ns-resize', name: 'top' },
            { x: selectedPlatform.x + selectedPlatform.width - handleSize / 2, y: selectedPlatform.y - handleSize / 2, cursor: 'nesw-resize', name: 'top-right' },
            { x: selectedPlatform.x - handleSize / 2, y: selectedPlatform.y + selectedPlatform.height / 2 - handleSize / 2, cursor: 'ew-resize', name: 'left' },
            { x: selectedPlatform.x + selectedPlatform.width - handleSize / 2, y: selectedPlatform.y + selectedPlatform.height / 2 - handleSize / 2, cursor: 'ew-resize', name: 'right' },
            { x: selectedPlatform.x - handleSize / 2, y: selectedPlatform.y + selectedPlatform.height - handleSize / 2, cursor: 'nesw-resize', name: 'bottom-left' },
            { x: selectedPlatform.x + selectedPlatform.width / 2 - handleSize / 2, y: selectedPlatform.y + selectedPlatform.height - handleSize / 2, cursor: 'ns-resize', name: 'bottom' },
            { x: selectedPlatform.x + selectedPlatform.width - handleSize / 2, y: selectedPlatform.y + selectedPlatform.height - handleSize / 2, cursor: 'nwse-resize', name: 'bottom-right' }
        ];

        ctx.fillStyle = 'yellow';
        handles.forEach(handle => {
            ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        });
    } else if (selectedPlatform) { // Just draw a border for other modes (like 'move')
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 3;
        ctx.strokeRect(selectedPlatform.x, selectedPlatform.y, selectedPlatform.width, selectedPlatform.height);
    }


    // Draw border around selected enemy
    if (selectedEnemy) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 3;
        ctx.strokeRect(selectedEnemy.x, selectedEnemy.y, selectedEnemy.width, selectedEnemy.height);
    }

    // Draw hitboxes for all enemies
    enemies.forEach(e => {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; // Red, semi-transparent
        ctx.lineWidth = 2;
        ctx.strokeRect(e.x, e.y, e.width, e.height);
    });

    // Draw border around selected turret
    if (selectedTurret) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 3;
        ctx.strokeRect(selectedTurret.x, selectedTurret.y, selectedTurret.width, selectedTurret.height);
    }

    ctx.restore();
}

function drawGrid() {
    ctx.strokeStyle = '#555';
    const startY = Math.floor(editorCameraY / editorGridSize) * editorGridSize;
    for (let x = 0; x < canvas.width; x += editorGridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + canvas.height);
        ctx.stroke();
    }
    for (let y = startY; y < startY + canvas.height; y += editorGridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function saveLevel() {
    const groundPlatformY = canvas.height - 20;
    const platformData = platforms.slice(1).map(p => ({ x: p.x, y: groundPlatformY - p.y, width: p.width, height: p.height, type: p.type }));
    const enemyData = enemies.map(e => {
        let enemyY;
        if (e.type === 'patrolling' && e.platform) {
            // For patrolling enemies, y is the offset from their platform's top edge
            enemyY = e.platform.y - e.y;
        } else {
            // For other enemies, y is the offset from the ground
            enemyY = groundPlatformY - e.y;
        }
        return {
            x: e.x,
            y: enemyY,
            type: e.type,
            platformX: e.type === 'patrolling' && e.platform ? e.platform.x : undefined,
            platformY: e.type === 'patrolling' && e.platform ? groundPlatformY - e.platform.y : undefined
        };
    });
    const turretData = turrets.map(t => ({ x: t.x, y: groundPlatformY - t.y, width: t.width, height: t.height, shootDirection: t.shootDirection }));
    const levelData = { platforms: platformData, enemies: enemyData, turrets: turretData };
    levelStringTextarea.value = btoa(JSON.stringify(levelData));
}

function loadLevelFromString(base64String) {
    if (!base64String) return;
    try {
        const levelData = JSON.parse(atob(base64String));
        resetLevelForEditor();
        const groundPlatformY = canvas.height - 20;

        // Load platforms
        levelData.platforms.forEach(pData => {
            let color;
            switch (pData.type) {
                case 'standard': color = 'green'; break;
                case 'moving': color = 'blue'; break;
                case 'breakable': color = 'red'; break;
                case 'win': color = 'gold'; break;
                case 'wall': color = 'gray'; break;
            }
            platforms.push(new Platform(pData.x, groundPlatformY - pData.y, pData.width, pData.height, color, pData.type));
        });

        // Load enemies
        if (levelData.enemies) {
            levelData.enemies.forEach(eData => {
                let color;
                let enemyWidth = 40, enemyHeight = 40; // Enforce new standard size
                switch(eData.type) {
                    case 'standard': color = 'purple'; break;
                    case 'patrolling': color = 'orange'; break;
                    case 'jumping': color = 'purple'; break;
                }
                let enemyPlatform = null;
                // If it's a patrolling enemy, find its associated platform
                if (eData.type === 'patrolling' && eData.platformX !== undefined && eData.platformY !== undefined) {
                    enemyPlatform = platforms.find(p => p.x === eData.platformX && p.y === (groundPlatformY - eData.platformY));
                }

                // Correctly calculate the enemy's Y position based on the original game's logic.
                const editorY = enemyPlatform ? enemyPlatform.y - eData.y : groundPlatformY - eData.y;
                enemies.push(new Enemy(eData.x, editorY, enemyWidth, enemyHeight, color, eData.type, enemyPlatform));
            });
        }
    // Load turrets
        if (levelData.turrets) {
            levelData.turrets.forEach(tData => {
                turrets.push(new Turret(tData.x, groundPlatformY - tData.y, 40, 40, 'darkred', tData.shootDirection)); // Enforce new standard size
            });
        }
    } catch (e) { alert('Invalid level string!'); }
}

function loadLevelIntoEditor(levelNum) {
    const levelData = levelsData[levelNum];
    if (!levelData) {
        alert('Level data not found!');
        return;
    }

    resetLevelForEditor(); // Clears existing editor state

    const groundPlatformY = canvas.height - 20;

    // Create temporary arrays for the new level elements
    const loadedPlatforms = [];
    const loadedEnemies = [];
    const loadedTurrets = [];

    // Load platforms into the temporary array
    if (levelData.platforms) {
        levelData.platforms.forEach(pData => {
            let color;
            switch (pData.type) {
                case 'standard': color = 'green'; break;
                case 'moving': color = 'blue'; break;
                case 'breakable': color = 'red'; break;
                case 'win': color = 'gold'; break;
                case 'wall': color = 'gray'; break;
                default: color = 'purple';
            }
            // Convert from game coordinates to editor coordinates
            const editorY = groundPlatformY - pData.y;
            loadedPlatforms.push(new Platform(pData.x, editorY, pData.width, pData.height, color, pData.type));
        });
    }

    // Load enemies, using the newly created platforms for position calculation
    if (levelData.enemies) {
        levelData.enemies.forEach(eData => {
            let color;
            let enemyWidth = 40, enemyHeight = 40;
            switch(eData.type) {
                case 'standard': color = 'purple'; break;
                case 'patrolling': color = 'orange'; break;
                case 'jumping': color = 'purple'; break;
                default: color = 'pink';
            }

            // Find the associated platform for patrolling enemies, if any.
            let enemyPlatform = null;
            if (eData.type === 'patrolling' && eData.platformX !== undefined && eData.platformY !== undefined) {
                // We need to find the platform in the *newly loaded* platforms array
                const platformEditorY = groundPlatformY - eData.platformY;
                enemyPlatform = loadedPlatforms.find(p => p.x === eData.platformX && p.y === platformEditorY);
            }

            // Correctly calculate the enemy's Y position based on the original game's logic.
            const editorY = enemyPlatform ? enemyPlatform.y - eData.y : groundPlatformY - eData.y;

            loadedEnemies.push(new Enemy(eData.x, editorY, enemyWidth, enemyHeight, color, eData.type, enemyPlatform));
        });
    }

    // Load turrets
    if (levelData.turrets) {
        levelData.turrets.forEach(tData => {
            const editorY = groundPlatformY - tData.y;
            loadedTurrets.push(new Turret(tData.x, editorY, 40, 40, 'darkred', tData.shootDirection));
        });
    }

    // Replace the editor's arrays with the newly loaded elements
    // We keep the original ground platform (at index 0)
    platforms.splice(1, platforms.length - 1, ...loadedPlatforms);
    enemies.splice(0, enemies.length, ...loadedEnemies);
    turrets.splice(0, turrets.length, ...loadedTurrets);

    // The boss is not loaded into the editor by design, but this could be added.
}

function resetLevelForEditorPlaytest() {
    backgroundMusic.currentTime = 0;
    backgroundMusic.play();
    gameState = 'playing';
    score = 0;
    cameraY = 0;
    gameover = false;
    gameWon = false;
    velocityY = 0;
    projectiles = [];
    turrets = [];
    boss = null;

    // Reconstruct platforms from the pristine backup data
    platforms = [];
    const groundPlatformY = canvas.height - 20;
    platforms.push(new Platform(0, groundPlatformY, canvas.width, 20, 'green', 'standard')); // Add the ground platform
    editorPlatformsData.forEach(pData => {
        let color;
        switch (pData.type) {
            case 'standard': color = 'green'; break;
            case 'moving': color = 'blue'; break;
            case 'breakable': color = 'red'; break;
            case 'win': color = 'gold'; break;
            case 'wall': color = 'gray'; break;
        }
        platforms.push(new Platform(pData.x, groundPlatformY - pData.y, pData.width, pData.height, color, pData.type));
    });

    // Reconstruct enemies from the pristine backup data
    enemies = [];
    editorEnemiesData.forEach(eData => {
        let color;
        let enemyWidth = 40, enemyHeight = 40; // Enforce new standard size
        switch(eData.type) {
            case 'standard': color = 'purple'; break;
            case 'patrolling': color = 'orange'; break;
            case 'jumping': color = 'purple'; break;
        }
        let enemyPlatform = null;
        // If it's a patrolling enemy, find its associated platform in the *newly created* platforms array
        if (eData.type === 'patrolling' && eData.platformX !== undefined && eData.platformY !== undefined) {
            enemyPlatform = platforms.find(p => p.x === eData.platformX && p.y === (groundPlatformY - eData.platformY));
        }
        enemies.push(new Enemy(eData.x, groundPlatformY - eData.y, enemyWidth, enemyHeight, color, eData.type, enemyPlatform));
    });

    // Reconstruct turrets from the pristine backup data
    editorTurretsData.forEach(tData => {
        turrets.push(new Turret(tData.x, groundPlatformY - tData.y, 40, 40, 'darkred', tData.shootDirection)); // Enforce new standard size
    });

    player = new Player(canvas.width / 2 - playerWidth / 2, canvas.height - 20 - playerHeight, playerWidth, playerHeight);
}

function playLevel() {
    backgroundMusic.currentTime = 0;
    backgroundMusic.play();
    isTestingLevel = true;
    levelEditorControls.style.display = 'none';

    // Create a deep copy of the current editor state for backup
    editorPlatformsBackup = platforms.map(p => new Platform(p.x, p.y, p.width, p.height, p.color, p.type));
    editorEnemiesBackup = enemies.map(e => {
        let enemyPlatform = null;
        if (e.type === 'patrolling' && e.platform) {
            // Find the corresponding platform from the *backed up* platforms array
            enemyPlatform = editorPlatformsBackup.find(pBackup => 
                pBackup.x === e.platform.x && 
                pBackup.y === e.platform.y
            );
        }
        return new Enemy(e.x, e.y, e.width, e.height, e.color, e.type, enemyPlatform);
    });
    editorTurretsBackup = turrets.map(t => new Turret(t.x, t.y, t.width, t.height, t.color, t.shootDirection));

    // Create pristine data for this playtest session
    const groundPlatformY = canvas.height - 20;
    editorPlatformsData = platforms.slice(1).map(p => ({ x: p.x, y: groundPlatformY - p.y, width: p.width, height: p.height, type: p.type }));
    editorEnemiesData = enemies.map(e => ({
        x: e.x,
        y: groundPlatformY - e.y,
        type: e.type,
        platformX: e.type === 'patrolling' && e.platform ? e.platform.x : undefined,
        platformY: e.type === 'patrolling' && e.platform ? groundPlatformY - e.platform.y : undefined
    }));
    editorTurretsData = turrets.map(t => ({ x: t.x, y: groundPlatformY - t.y, width: t.width, height: t.height, shootDirection: t.shootDirection }));

    resetLevelForEditorPlaytest();
}

function returnToEditor() {
    backgroundMusic.pause();
    isTestingLevel = false;
    gameState = 'levelEditor';
    levelEditorControls.style.display = 'block';
    
    // Restore from the backup
    platforms = editorPlatformsBackup;
    enemies = editorEnemiesBackup;
    turrets = editorTurretsBackup;

    // Reset other game-state variables
    player = null;
    projectiles = [];
    boss = null;
    cameraY = editorCameraY; // Restore editor camera position
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top + editorCameraY;

    if (gameState !== 'levelEditor') return;

    if (editorMode === 'resize') {
        let clickedOnHandle = false;
        if (selectedPlatform) {
            const handleSize = 8;
            const handles = [
                { x: selectedPlatform.x - handleSize / 2, y: selectedPlatform.y - handleSize / 2, name: 'top-left' },
                { x: selectedPlatform.x + selectedPlatform.width / 2 - handleSize / 2, y: selectedPlatform.y - handleSize / 2, name: 'top' },
                { x: selectedPlatform.x + selectedPlatform.width - handleSize / 2, y: selectedPlatform.y - handleSize / 2, name: 'top-right' },
                { x: selectedPlatform.x - handleSize / 2, y: selectedPlatform.y + selectedPlatform.height / 2 - handleSize / 2, name: 'left' },
                { x: selectedPlatform.x + selectedPlatform.width - handleSize / 2, y: selectedPlatform.y + selectedPlatform.height / 2 - handleSize / 2, name: 'right' },
                { x: selectedPlatform.x - handleSize / 2, y: selectedPlatform.y + selectedPlatform.height - handleSize / 2, name: 'bottom-left' },
                { x: selectedPlatform.x + selectedPlatform.width / 2 - handleSize / 2, y: selectedPlatform.y + selectedPlatform.height - handleSize / 2, name: 'bottom' },
                { x: selectedPlatform.x + selectedPlatform.width - handleSize / 2, y: selectedPlatform.y + selectedPlatform.height - handleSize / 2, name: 'bottom-right' }
            ];

            for (const handle of handles) {
                if (mouseX >= handle.x && mouseX <= handle.x + handleSize && mouseY >= handle.y && mouseY <= handle.y + handleSize) {
                    isResizing = true;
                    resizeHandle = handle.name;
                    initialMouseX = mouseX;
                    initialMouseY = mouseY;
                    initialPlatformX = selectedPlatform.x;
                    initialPlatformY = selectedPlatform.y;
                    initialPlatformWidth = selectedPlatform.width;
                    initialPlatformHeight = selectedPlatform.height;
                    clickedOnHandle = true;
                    return;
                }
            }
        }

        if (!clickedOnHandle) {
            selectedPlatform = null;
            for (let i = platforms.length - 1; i >= 0; i--) {
                const p = platforms[i];
                if (mouseX >= p.x && mouseX <= p.x + p.width && mouseY >= p.y && mouseY <= p.y + p.height) {
                    selectedPlatform = p;
                    break;
                }
            }
        }
    } else if (editorMode === 'move') {
        let foundSomething = false;
        // Priority: Turret > Enemy > Platform
        for (let i = turrets.length - 1; i >= 0; i--) {
            const t = turrets[i];
            if (mouseX >= t.x && mouseX <= t.x + t.width && mouseY >= t.y && mouseY <= t.y + t.height) {
                selectedTurret = t;
                selectedPlatform = null;
                selectedEnemy = null;
                isMoving = true;
                moveOffsetX = mouseX - t.x;
                moveOffsetY = mouseY - t.y;
                foundSomething = true;
                break;
            }
        }
        if (!foundSomething) {
            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];
                if (mouseX >= e.x && mouseX <= e.x + e.width && mouseY >= e.y && mouseY <= e.y + e.height) {
                    selectedEnemy = e;
                    selectedPlatform = null;
                    selectedTurret = null;
                    isMoving = true;
                    moveOffsetX = mouseX - e.x;
                    moveOffsetY = mouseY - e.y;
                    foundSomething = true;
                    break;
                }
            }
        }
        if (!foundSomething) {
            for (let i = platforms.length - 1; i >= 0; i--) {
                const p = platforms[i];
                if (mouseX >= p.x && mouseX <= p.x + p.width && mouseY >= p.y && mouseY <= p.y + p.height) {
                    selectedPlatform = p;
                    selectedEnemy = null;
                    selectedTurret = null;
                    isMoving = true;
                    moveOffsetX = mouseX - p.x;
                    moveOffsetY = mouseY - p.y;
                    break;
                }
            }
        }
    }
}

function handleMouseMove(e) {
    if (gameState !== 'levelEditor') return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top + editorCameraY;

    if (isResizing && selectedPlatform) {
        const deltaX = mouseX - initialMouseX;
        const deltaY = mouseY - initialMouseY;

        let newX = initialPlatformX;
        let newY = initialPlatformY;
        let newWidth = initialPlatformWidth;
        let newHeight = initialPlatformHeight;

        switch (resizeHandle) {
            case 'top-left':
                newX = initialPlatformX + deltaX;
                newY = initialPlatformY + deltaY;
                newWidth = initialPlatformWidth - deltaX;
                newHeight = initialPlatformHeight - deltaY;
                break;
            case 'top':
                newY = initialPlatformY + deltaY;
                newHeight = initialPlatformHeight - deltaY;
                break;
            case 'top-right':
                newY = initialPlatformY + deltaY;
                newWidth = initialPlatformWidth + deltaX;
                newHeight = initialPlatformHeight - deltaY;
                break;
            case 'left':
                newX = initialPlatformX + deltaX;
                newWidth = initialPlatformWidth - deltaX;
                break;
            case 'right':
                newWidth = initialPlatformWidth + deltaX;
                break;
            case 'bottom-left':
                newX = initialPlatformX + deltaX;
                newWidth = initialPlatformWidth - deltaX;
                newHeight = initialPlatformHeight + deltaY;
                break;
            case 'bottom':
                newHeight = initialPlatformHeight + deltaY;
                break;
            case 'bottom-right':
                newWidth = initialPlatformWidth + deltaX;
                newHeight = initialPlatformHeight + deltaY;
                break;
        }

        if (newWidth < editorGridSize) {
            if (resizeHandle.includes('left')) {
                newX = initialPlatformX + initialPlatformWidth - editorGridSize;
            }
            newWidth = editorGridSize;
        }
        if (newHeight < editorGridSize) {
            if (resizeHandle.includes('top')) {
                newY = initialPlatformY + initialPlatformHeight - editorGridSize;
            }
            newHeight = editorGridSize;
        }

        // Snap to grid
        selectedPlatform.x = Math.round(newX / editorGridSize) * editorGridSize;
        selectedPlatform.y = Math.round(newY / editorGridSize) * editorGridSize;
        selectedPlatform.width = Math.round(newWidth / editorGridSize) * editorGridSize;
        selectedPlatform.height = Math.round(newHeight / editorGridSize) * editorGridSize;

    } else if (isMoving) {
        const newX = mouseX - moveOffsetX;
        const newY = mouseY - moveOffsetY;
        const snappedX = Math.round(newX / editorGridSize) * editorGridSize;
        const snappedY = Math.round(newY / editorGridSize) * editorGridSize;

        if (selectedPlatform) {
            selectedPlatform.x = snappedX;
            selectedPlatform.y = snappedY;
        } else if (selectedEnemy) {
            selectedEnemy.x = snappedX;
            selectedEnemy.y = snappedY;
        } else if (selectedTurret) {
            selectedTurret.x = snappedX;
            selectedTurret.y = snappedY;
        }
    }
}

function handleMouseUp(e) {
    isResizing = false;
    isMoving = false;
    resizeHandle = null;
}

function selectButton(selectedBtn, allButtons) {
    allButtons.forEach(btn => btn.classList.remove('selected'));
    selectedBtn.classList.add('selected');
}

// --- Event Listeners ---
function init() {
    canvas.width = 800;
    canvas.height = 600;
    window.addEventListener('keydown', e => {
        if (e.code === 'ArrowRight') keys.right = true;
        if (e.code === 'ArrowLeft') keys.left = true;
        if (e.code === 'Space') keys.space = true;
    });
    window.addEventListener('keyup', e => {
        if (e.code === 'ArrowRight') keys.right = false;
        if (e.code === 'ArrowLeft') keys.left = false;
        if (e.code === 'Space') keys.space = false;
    });

    canvas.addEventListener('click', clickHandler);

// Add event listener for mouse wheel scrolling in the editor
canvas.addEventListener('wheel', (e) => {
    if (gameState === 'levelEditor') {
        e.preventDefault(); // Prevent page scrolling

        const scrollAmount = 2.5 * editorGridSize; // 2.5 squares

        if (e.deltaY > 0) { // Scrolling down
            editorCameraY += scrollAmount;
        } else { // Scrolling up
            editorCameraY -= scrollAmount;
        }

        // Clamp editorCameraY to prevent scrolling below the lowest platform
        let lowestPlatformY = canvas.height - 20; // Default ground platform
        platforms.forEach(p => {
            if (p.y + p.height > lowestPlatformY) {
                lowestPlatformY = p.y + p.height;
            }
        });

        // The camera's Y position is negative when scrolling down (viewing higher Y values)
        // So, a higher (less negative) editorCameraY means scrolling up.
        // We want to prevent editorCameraY from becoming so negative that the lowest platform is off-screen.
        // The lowest visible point on the screen is canvas.height + editorCameraY.
        // This point should not go below the lowest platform's Y.
        // So, canvas.height + editorCameraY <= lowestPlatformY
        // editorCameraY <= lowestPlatformY - canvas.height
        const maxCameraY = lowestPlatformY - canvas.height;
        if (editorCameraY > maxCameraY) {
            editorCameraY = maxCameraY;
        }
    }
});
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    // Editor specific listeners
    levelEditorControls.addEventListener('click', e => e.stopPropagation());
    playLevelButton.addEventListener('click', playLevel);
    saveLevelButton.addEventListener('click', saveLevel);
    loadFromStringBtn.addEventListener('click', () => loadLevelFromString(levelStringTextarea.value));
    backToMenuFromEditorButton.addEventListener('click', () => {
        gameState = 'menu';
        levelEditorControls.style.display = 'none';
    });

    const allTypeButtons = [...platformTypeButtons, ...enemyTypeButtons, turretButton];
    platformTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentEntityType = 'platform';
            currentPlatformType = btn.id.replace('Platform', '');
            selectButton(btn, allTypeButtons);
        });
    });

    enemyTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.id === 'turret') {
                currentEntityType = 'turret';
            } else {
                currentEntityType = 'enemy';
                currentEnemyType = btn.id.replace('Enemy', '');
            }
            selectButton(btn, allTypeButtons);
        });
    });

    const editorModeButtons = [placeModeButton, removeModeButton, resizeModeButton, moveModeButton, rotateModeButton];
    placeModeButton.addEventListener('click', () => { editorMode = 'place'; selectButton(placeModeButton, editorModeButtons); });
    removeModeButton.addEventListener('click', () => { editorMode = 'remove'; selectButton(removeModeButton, editorModeButtons); });
    resizeModeButton.addEventListener('click', () => { editorMode = 'resize'; selectButton(resizeModeButton, editorModeButtons); });
    moveModeButton.addEventListener('click', () => { editorMode = 'move'; selectButton(moveModeButton, editorModeButtons); });
    rotateModeButton.addEventListener('click', () => { editorMode = 'rotate'; selectButton(rotateModeButton, editorModeButtons); });

    loadExistingLevelBtn.addEventListener('click', () => {
        existingLevelChoices.style.display = existingLevelChoices.style.display === 'none' ? 'block' : 'none';
    });

    Object.keys(levelsData).forEach(levelNum => {
        const btn = document.createElement('button');
        btn.textContent = levelNum;
        btn.onclick = () => {
            loadLevelIntoEditor(parseInt(levelNum, 10));
            existingLevelChoices.style.display = 'none';
        };
        existingLevelChoices.appendChild(btn);
    });


    gameLoop();
}

init();