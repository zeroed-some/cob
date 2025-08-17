// game.js - Main game loop and state management

// Game objects
let spider;
let obstacles = [];
let webStrands = [];
let flies = [];
let foodBoxes = [];
let particles = [];
let webNodes = [];

// Game state
let isDeployingWeb = false;
let currentStrand = null;
let spacePressed = false;
let isMunching = false;

// Resources
let webSilk = 100;
let maxWebSilk = 100;
let silkRechargeRate = 0.05;
let silkDrainRate = 2;

// Game phases - PHASE 1 UPDATES
let gamePhase = 'DUSK';
let phaseTimer = 0;

// Phase durations (in frames, 60fps) - PHASE 1 NEW
let DAWN_DURATION = 1800; // 30 seconds
let DAY_DURATION = 2700; // 45 seconds  
let DUSK_DURATION = 1800; // 30 seconds (was 1500)
let NIGHT_DURATION = 3600; // 60 seconds
let TRANSITION_DURATION = 180; // 3 seconds

let skyColor1, skyColor2, currentSkyColor1, currentSkyColor2;
let moonY = 100;
let moonOpacity = 0;
let sunY = -50; // PHASE 1 NEW
let sunOpacity = 0; // PHASE 1 NEW

// Progression tracking - PHASE 1 NEW
let fliesCaught = 0;
let fliesMunched = 0;
let totalFliesCaught = 0; // Lifetime counter
let nightsSurvived = 0;
let currentNight = 1;
let baseFlySpeed = 3;
let fliesEscaped = [];

// PHASE 2: Special fly notifications
let notifications = [];

// PHASE 3: Upgrade System
let playerPoints = 0;
let shopOpen = false;

// PHASE 4: Dawn Exhaustion System
let jumpStamina = 100;
let maxJumpStamina = 100;
let jumpCost = 20;
let staminaRegenRate = 0.2;
let isExhausted = false;
let fliesMunchedLastNight = 0;
let birds = [];

// PHASE 4B: Wind System
let windActive = false;
let windDirection = 0;
let windStrength = 0;
let windTimer = 0;
let windDuration = 0;
let windParticles = [];
let nextWindTime = 0;

// PHASE 4B: Thief bird timer
let thiefBirdTimer = 0;
let nextThiefTime = 0;

// PHASE 5: Achievements & Stats System
let achievements = {
    nightOwl: { name: "Night Owl", desc: "Survive 10 nights", icon: "🦉", unlocked: false, progress: 0, target: 10 },
    silkMaster: { name: "Silk Master", desc: "Have 15+ strands at once", icon: "🕸️", unlocked: false, progress: 0, target: 15 },
    feast: { name: "Feast", desc: "Munch 20 flies in one night", icon: "🍽️", unlocked: false, progress: 0, target: 20 },
    architect: { name: "Architect", desc: "Catch 5 flies without munching", icon: "🏗️", unlocked: false, progress: 0, target: 5 },
    untouchable: { name: "Untouchable", desc: "Survive a night without losing a strand", icon: "💎", unlocked: false },
    windRider: { name: "Wind Rider", desc: "Jump 10 times during wind", icon: "🌬️", unlocked: false, progress: 0, target: 10 },
    thiefDefender: { name: "Thief Defender", desc: "Scare off 10 thief birds", icon: "🛡️", unlocked: false, progress: 0, target: 10 },
    exhaustionMaster: { name: "Exhaustion Master", desc: "Survive dawn with < 20 stamina", icon: "😴", unlocked: false },
    queenSlayer: { name: "Queen Slayer", desc: "Catch 10 queen flies", icon: "👑", unlocked: false, progress: 0, target: 10 },
    perfectDawn: { name: "Perfect Dawn", desc: "No bird hits during dawn", icon: "☀️", unlocked: false },
    speedrunner: { name: "Speedrunner", desc: "Catch 30 flies before Night 5", icon: "⚡", unlocked: false },
    galaxyUnlock: { name: "Cosmic Spider", desc: "Survive 15 nights", icon: "🌌", unlocked: false, progress: 0, target: 15 },
    goldenHunter: { name: "Golden Hunter", desc: "Catch 100 golden flies", icon: "✨", unlocked: false, progress: 0, target: 100 },
    shadowPredator: { name: "Shadow Predator", desc: "Catch 50 flies in one night", icon: "🌑", unlocked: false, progress: 0, target: 50 },
    webMaster: { name: "Web Master", desc: "500 total flies caught", icon: "🏆", unlocked: false, progress: 0, target: 500 }
};

// Statistics tracking
let stats = {
    totalFliesCaught: 0,
    regularCaught: 0,
    goldenCaught: 0,
    mothsCaught: 0,
    queensCaught: 0,
    longestNight: 0,
    totalSilkSpun: 0,
    totalJumps: 0,
    windJumps: 0,
    thievesScared: 0,
    birdHitsTaken: 0,
    strandsCreated: 0,
    perfectDawns: 0,
    fliesMunchedInCurrentNight: 0,
    fliesCaughtWithoutMunch: 0,
    strandsLostInNight: 0
};

// Cosmetics
let unlockedSkins = {
    default: true,
    galaxy: false,
    golden: false,
    shadow: false,
    rainbow: false
};

let currentSkin = 'default';
let achievementQueue = [];
let showingAchievement = null;
let achievementDisplayTimer = 0;
let upgrades = {
    // Tier 1 Upgrades
    strongLegs: { 
        level: 0, 
        maxLevel: 3, 
        cost: 15, 
        name: "Strong Legs",
        description: "Jump 15% farther",
        icon: "🦵",
        tier: 1
    },
    silkGlands: {
        level: 0,
        maxLevel: 3,
        cost: 20,
        name: "Silk Glands",
        description: "+20 max silk capacity",
        icon: "🕸️",
        tier: 1
    },
    efficientSpinning: {
        level: 0,
        maxLevel: 3,
        cost: 15,
        name: "Efficient Spinning",
        description: "-20% silk consumption",
        icon: "♻️",
        tier: 1
    },
    quickMunch: {
        level: 0,
        maxLevel: 2,
        cost: 10,
        name: "Quick Munch",
        description: "Munch cooldown -30%",
        icon: "🦷",
        tier: 1
    },
    
    // Tier 2 Upgrades (requires at least 2 Tier 1 upgrades)
    powerJump: {
        level: 0,
        maxLevel: 1,
        cost: 50,
        name: "Power Jump",
        description: "Hold to charge jump (2x distance)",
        icon: "⚡",
        tier: 2,
        requires: 2 // Number of tier 1 upgrades needed
    },
    silkRecycle: {
        level: 0,
        maxLevel: 1,
        cost: 75,
        name: "Silk Recycle",
        description: "Press R near old web to recover 50% silk",
        icon: "🔄",
        tier: 2,
        requires: 2
    },
    spiderSense: {
        level: 0,
        maxLevel: 1,
        cost: 100,
        name: "Spider Sense",
        description: "See faint prediction lines for fly paths",
        icon: "👁️",
        tier: 2,
        requires: 3
    },
    metabolize: {
        level: 0,
        maxLevel: 1,
        cost: 60,
        name: "Metabolize",
        description: "Munching heals nearby broken strands",
        icon: "💚",
        tier: 2,
        requires: 2
    }
};

// Track if charging jump (Tier 2 upgrade)
let chargingJump = false;
let jumpChargeTime = 0;
let maxJumpCharge = 60; // 1 second at 60fps

class Notification {
    constructor(text, color) {
        this.text = text;
        this.color = color;
        this.y = height * 0.3;
        this.alpha = 255;
        this.lifetime = 180; // 3 seconds
    }
    
    update() {
        this.lifetime--;
        if (this.lifetime < 60) {
            this.alpha = map(this.lifetime, 0, 60, 0, 255);
        }
        this.y -= 0.5; // Slowly rise
    }
    
    display() {
        push();
        textAlign(CENTER);
        textSize(24);
        strokeWeight(4);
        stroke(0, 0, 0, this.alpha);
        fill(red(this.color), green(this.color), blue(this.color), this.alpha);
        text(this.text, width / 2, this.y);
        pop();
    }
    
    isDead() {
        return this.lifetime <= 0;
    }
}

function setup() {
    let canvas = createCanvas(window.innerWidth, window.innerHeight);
    canvas.parent('game-container');
    
    skyColor1 = color(135, 206, 235);
    skyColor2 = color(255, 183, 77);
    currentSkyColor1 = skyColor1;
    currentSkyColor2 = skyColor2;
    
    // Create home branch for spider
    let homeBranchSide = random() < 0.5 ? 'left' : 'right';
    let homeBranchLength = random(width * 0.33, width * 0.5);
    let homeBranchY = random(height * 0.7, height * 0.85);
    let homeBranchThickness = 25;
    
    // Calculate start and end positions ONCE
    let branchStartX = homeBranchSide === 'left' ? -20 : width + 20;
    let branchEndX = homeBranchSide === 'left' ? homeBranchLength : width - homeBranchLength;
    
    // Generate leaves with FIXED positions (simplified)
    let leaves = [];
    for (let i = 0; i < 3; i++) {
        let t = 0.3 + (0.4 * i / 2);
        let x = lerp(branchStartX, branchEndX, t);
        leaves.push({
            t: t, // Store position as percentage for proper rotation
            yOffset: -homeBranchThickness - 10,
            rotation: random(-PI/8, PI/8),
            width: 16,
            height: 8
        });
    }
    
    // Generate bark textures with FIXED positions
    let barkTextures = [];
    for (let x = Math.min(branchStartX, branchEndX); x < Math.max(branchStartX, branchEndX); x += 16) {
        barkTextures.push({
            x: x,
            yOff: -5 + (x % 10), // Deterministic offset based on position
            endYOff: -2 + (x % 5)
        });
    }
    
    // Store home branch info for rendering (simplified)
    window.homeBranch = {
        side: homeBranchSide,
        startX: branchStartX,
        endX: branchEndX,
        y: homeBranchY,
        thickness: homeBranchThickness,
        angle: homeBranchSide === 'left' ? 0.05 : -0.05,
        leaves: leaves,
        barkTextures: barkTextures
    };
    
    // Place spider at the tip of the branch
    let spiderStartX = branchEndX; // Place at the end/tip
    
    // The branch is drawn with a taper - at the tip it's 35% thickness
    // The branch rendering uses push/translate/rotate, so we need to account for that
    let branchTopThickness = homeBranchThickness * 0.35;
    
    // The branch is drawn centered at branch.y after rotation
    // Since the rotation is small, we can approximate
    let branchSurfaceY = homeBranchY - branchTopThickness;
    
    // The branch rotates around (0, homeBranchY), so points further from origin rotate more
    // For small angles: y_rotated ≈ y + x * sin(angle) ≈ y + x * angle
    let rotationOffset = spiderStartX * window.homeBranch.angle;
    branchSurfaceY += rotationOffset;
    
    // Place spider on top of the visual branch at the tip (8 is spider radius)
    spider = new Spider(spiderStartX, branchSurfaceY - 8);
    
    // PHASE 5: Load saved game (AFTER spider is created)
    loadGame();
    
    // Add invisible obstacles along the branch for web anchor points
    let numBranchAnchors = 3;
    for (let i = 0; i < numBranchAnchors; i++) {
        let t = (i + 1) / (numBranchAnchors + 1);
        let x = homeBranchSide === 'left' ? 
            homeBranchLength * t : 
            width - homeBranchLength * t;
        let y = homeBranchY + sin(t * PI) * 10; // Slight curve
        obstacles.push(new Obstacle(x, y, 20, 'leaf')); // Use leaf as invisible anchor
    }
    
    // Create more obstacles for denser coverage
    let numObstacles = Math.floor((width * height) / 60000); // More obstacles
    numObstacles = constrain(numObstacles, 15, 25);
    
    // Create ant balloons (4-6)
    let numBalloons = Math.floor(random(4, 7));
    for (let i = 0; i < numBalloons; i++) {
        let attempts = 0;
        let placed = false;
        
        while (!placed && attempts < 30) {
            let x = random(80, width - 80);
            let y = random(60, height * 0.55); // Balloons float in upper half
            let radius = random(35, 45); // Good size for hopping
            
            let valid = true;
            // Check distance from other obstacles
            for (let obstacle of obstacles) {
                if (dist(x, y, obstacle.x, obstacle.y) < radius + obstacle.radius + 50) {
                    valid = false;
                    break;
                }
            }
            
            // Check distance from home branch
            if (valid && window.homeBranch) {
                let branchY = window.homeBranch.y;
                if (Math.abs(y - branchY) < radius + 35) {
                    valid = false;
                }
            }
            
            if (valid) {
                obstacles.push(new Obstacle(x, y, radius, 'balloon'));
                placed = true;
            }
            attempts++;
        }
    }
    
    // Create beetles (3-5)
    let numBeetles = Math.floor(random(3, 6));
    for (let i = 0; i < numBeetles; i++) {
        let attempts = 0;
        let placed = false;
        
        while (!placed && attempts < 30) {
            let x = random(70, width - 70);
            let y = random(height * 0.2, height * 0.8); // Spread throughout middle/lower
            let radius = random(30, 40);
            
            let valid = true;
            for (let obstacle of obstacles) {
                if (dist(x, y, obstacle.x, obstacle.y) < radius + obstacle.radius + 45) {
                    valid = false;
                    break;
                }
            }
            
            // Check distance from home branch
            if (valid && window.homeBranch) {
                let branchY = window.homeBranch.y;
                if (Math.abs(y - branchY) < radius + 30) {
                    valid = false;
                }
            }
            
            if (valid) {
                obstacles.push(new Obstacle(x, y, radius, 'beetle'));
                placed = true;
            }
            attempts++;
        }
    }
    
    // Create LOTS of leaves (8-12) for excellent hopping coverage
    let numLeaves = Math.floor(random(8, 13));
    for (let i = 0; i < numLeaves; i++) {
        let attempts = 0;
        let placed = false;
        
        while (!placed && attempts < 30) {
            // Distribute leaves more evenly across the screen
            let gridX = (i % 4) * (width / 4) + random(50, width/4 - 50);
            let gridY = Math.floor(i / 4) * (height / 3) + random(50, height/3 - 50);
            let x = constrain(gridX, 50, width - 50);
            let y = constrain(gridY, 60, height - 100);
            let radius = random(20, 30);
            
            let valid = true;
            for (let obstacle of obstacles) {
                if (dist(x, y, obstacle.x, obstacle.y) < radius + obstacle.radius + 35) {
                    valid = false;
                    break;
                }
            }
            
            if (valid) {
                obstacles.push(new Obstacle(x, y, radius, 'leaf'));
                placed = true;
            }
            attempts++;
        }
    }
    
    // Add even more guaranteed coverage points (smaller leaves)
    // Corners
    obstacles.push(new Obstacle(50, 80, 18, 'leaf'));
    obstacles.push(new Obstacle(width - 50, 80, 18, 'leaf'));
    obstacles.push(new Obstacle(50, height - 100, 18, 'leaf'));
    obstacles.push(new Obstacle(width - 50, height - 100, 18, 'leaf'));
    
    // Edge midpoints
    obstacles.push(new Obstacle(35, height/3, 18, 'leaf'));
    obstacles.push(new Obstacle(35, 2*height/3, 18, 'leaf'));
    obstacles.push(new Obstacle(width - 35, height/3, 18, 'leaf'));
    obstacles.push(new Obstacle(width - 35, 2*height/3, 18, 'leaf'));
    obstacles.push(new Obstacle(width/3, 45, 18, 'leaf'));
    obstacles.push(new Obstacle(2*width/3, 45, 18, 'leaf'));
    obstacles.push(new Obstacle(width/3, height - 90, 18, 'leaf'));
    obstacles.push(new Obstacle(2*width/3, height - 90, 18, 'leaf'));
    
    // Fill any remaining gaps for smooth hopping
    if (width > 600) {
        // Create a grid of small leaves to ensure no dead zones
        for (let x = width/5; x < width; x += width/5) {
            for (let y = height/4; y < height - 100; y += height/4) {
                // Check if there's already an obstacle nearby
                let needsLeaf = true;
                for (let obstacle of obstacles) {
                    if (dist(x, y, obstacle.x, obstacle.y) < 80) {
                        needsLeaf = false;
                        break;
                    }
                }
                if (needsLeaf) {
                    obstacles.push(new Obstacle(x + random(-20, 20), y + random(-20, 20), 15, 'leaf'));
                }
            }
        }
    }
    
    // Spawn initial food boxes
    let numBoxes = Math.max(3, Math.floor(width / 400));
    for (let i = 0; i < numBoxes; i++) {
        spawnFoodBox();
    }
}

function draw() {
    // Update phase timer
    phaseTimer++;
    
    // Phase transitions with endless cycle - PHASE 1 UPDATE
    if (gamePhase === 'DUSK' && phaseTimer >= DUSK_DURATION) {
        gamePhase = 'DUSK_TO_NIGHT';
        phaseTimer = 0;
    } else if (gamePhase === 'DUSK_TO_NIGHT' && phaseTimer >= TRANSITION_DURATION) {
        gamePhase = 'NIGHT';
        phaseTimer = 0;
        // Spawn flies based on difficulty
        spawnNightFlies();
    } else if (gamePhase === 'NIGHT' && phaseTimer >= NIGHT_DURATION) {
        gamePhase = 'NIGHT_TO_DAWN';
        phaseTimer = 0;
        nightsSurvived++;
        currentNight++;
        // PHASE 5: Check night achievements
        checkNightAchievements();
        // PHASE 4: Track flies munched for dawn stamina
        fliesMunchedLastNight = fliesMunched;
        fliesMunched = 0; // Reset for next night
        // PHASE 4B: Clear any thief birds
        birds = birds.filter(b => !b.isThief);
        windActive = false; // Stop any active wind
    } else if (gamePhase === 'NIGHT_TO_DAWN' && phaseTimer >= TRANSITION_DURATION) {
        gamePhase = 'DAWN';
        phaseTimer = 0;
        // PHASE 4: Calculate dawn stamina and spawn birds
        maxJumpStamina = 30 + (fliesMunchedLastNight * 10);
        maxJumpStamina = min(maxJumpStamina, 150); // Cap at 150
        jumpStamina = maxJumpStamina;
        // Spawn birds
        spawnDawnBirds();
        // Flies escape at dawn
        escapeFlies();
    } else if (gamePhase === 'DAWN' && phaseTimer >= DAWN_DURATION) {
        gamePhase = 'DAWN_TO_DAY';
        phaseTimer = 0;
        // PHASE 5: Check dawn achievements
        checkDawnAchievements();
        // PHASE 4: Clear birds when dawn ends
        birds = [];
        // PHASE 3: Open shop at dawn
        if (currentNight > 1) {
            openUpgradeShop();
        }
    } else if (gamePhase === 'DAWN_TO_DAY' && phaseTimer >= TRANSITION_DURATION) {
        gamePhase = 'DAY';
        phaseTimer = 0;
        // Degrade webs by 10%
        degradeWebs();
        // PHASE 5: Open stats panel during day
        openStatsPanel();
    } else if (gamePhase === 'DAY' && phaseTimer >= DAY_DURATION) {
        gamePhase = 'DAY_TO_DUSK';
        phaseTimer = 0;
    } else if (gamePhase === 'DAY_TO_DUSK' && phaseTimer >= TRANSITION_DURATION) {
        gamePhase = 'DUSK';
        phaseTimer = 0;
        // Return some flies for next night
        prepareDusk();
    }
    
    // Update sky colors
    updateSkyColors();
    
    // Draw sky gradient
    drawSkyGradient();
    
    // Draw moon and stars
    if (moonOpacity > 0) {
        drawMoon();
    }
    
    // Draw sun during day phases - PHASE 1 NEW
    if (sunOpacity > 0) {
        drawSun();
    }
    
    // PHASE 4B: Update wind system
    updateWind();
    
    // PHASE 4B: Apply wind to airborne entities
    if (windActive) {
        // Push spider if airborne
        if (spider.isAirborne) {
            spider.vel.x += cos(windDirection) * windStrength * 0.1;
        }
        
        // Push flies
        for (let fly of flies) {
            if (!fly.stuck && !fly.caught) {
                fly.vel.x += cos(windDirection) * windStrength * 0.05;
            }
        }
        
        // Make webs sway
        for (let strand of webStrands) {
            if (!strand.broken) {
                strand.vibrate(windStrength * 0.5);
                // Check if strand is overstretched and should break
                if (strand.tension > 1.2 && windStrength > 3) {
                    if (random() < 0.01) { // Small chance per frame
                        strand.broken = true;
                        notifications.push(new Notification("Wind snapped a web!", color(255, 150, 100)));
                    }
                }
            }
        }
        
        // Update wind particles
        for (let i = windParticles.length - 1; i >= 0; i--) {
            let p = windParticles[i];
            p.x += cos(windDirection) * windStrength * 3;
            p.life--;
            if (p.life <= 0 || p.x < -50 || p.x > width + 50) {
                windParticles.splice(i, 1);
            }
        }
        
        // Spawn new wind particles
        if (frameCount % 5 === 0) {
            windParticles.push({
                x: windDirection > 0 ? -20 : width + 20,
                y: random(height),
                life: 120,
                size: random(2, 4)
            });
        }
    }
    
    // Update and display game objects
    for (let obstacle of obstacles) {
        obstacle.update(); // Update movement and animations
        obstacle.display();
    }
    
    for (let box of foodBoxes) {
        box.display();
    }
    
    // PHASE 4B: Display wind effects
    if (windActive) {
        push();
        noStroke();
        for (let p of windParticles) {
            fill(255, 255, 255, p.life * 0.5);
            ellipse(p.x, p.y, p.size);
        }
        
        // Wind indicator
        push();
        translate(width / 2, 50);
        stroke(255, 255, 255, 100);
        strokeWeight(3);
        let arrowLength = windStrength * 10;
        line(0, 0, cos(windDirection) * arrowLength, 0);
        // Arrowhead
        push();
        translate(cos(windDirection) * arrowLength, 0);
        rotate(windDirection);
        line(0, 0, -5, -3);
        line(0, 0, -5, 3);
        pop();
        
        // Wind strength text
        fill(255, 255, 255, 150);
        noStroke();
        textAlign(CENTER);
        textSize(12);
        text("WIND: " + Math.round(windStrength), 0, 20);
        pop();
        pop();
    }
    
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].display();
        if (particles[i].isDead()) {
            particles.splice(i, 1);
        }
    }
    
    // PHASE 1 UPDATE - Handle broken strands
    for (let i = webStrands.length - 1; i >= 0; i--) {
        let strand = webStrands[i];
        strand.update();
        
        // Remove broken strands
        if (strand.broken) {
            // Create particles for breaking effect
            if (strand.path && strand.path.length > 0) {
                let midPoint = strand.path[Math.floor(strand.path.length / 2)];
                for (let j = 0; j < 5; j++) {
                    let p = new Particle(midPoint.x, midPoint.y);
                    p.color = color(255, 255, 255);
                    p.vel = createVector(random(-2, 2), random(-3, 0));
                    particles.push(p);
                }
            }
            
            // Check all stuck/caught flies to see if they need to be released
            for (let fly of flies) {
                if (fly.stuck || fly.caught) {
                    // Check if this fly still has valid web support
                    let hasSupport = false;
                    for (let otherStrand of webStrands) {
                        if (otherStrand !== strand && !otherStrand.broken) {
                            // Check if fly is on this other strand
                            if (otherStrand.path && otherStrand.path.length > 1) {
                                for (let k = 0; k < otherStrand.path.length - 1; k++) {
                                    let p1 = otherStrand.path[k];
                                    let p2 = otherStrand.path[k + 1];
                                    let d = fly.pointToLineDistance(fly.pos, p1, p2);
                                    if (d < fly.radius + 5) {
                                        hasSupport = true;
                                        break;
                                    }
                                }
                            }
                            if (hasSupport) break;
                        }
                    }
                    
                    // If no support, release the fly
                    if (!hasSupport) {
                        fly.stuck = false;
                        fly.caught = false;
                        fly.currentSpeed = fly.baseSpeed;
                        fly.touchedStrands.clear();
                        fly.slowedBy.clear();
                        fly.vel = createVector(random(-0.5, 0.5), 1.5);
                        
                        // Create release particles
                        for (let j = 0; j < 3; j++) {
                            let p = new Particle(fly.pos.x, fly.pos.y);
                            p.color = color(255, 255, 0, 100);
                            p.vel = createVector(random(-1, 1), random(0, 1));
                            p.size = 2;
                            particles.push(p);
                        }
                    }
                }
            }
            
            webStrands.splice(i, 1);
        } else {
            strand.display();
        }
    }
    
    for (let node of webNodes) {
        node.update();
    }
    
    // Display current strand being created
    if (currentStrand && isDeployingWeb && spider.isAirborne) {
        let opacity = map(webSilk, 0, 20, 50, 150);
        stroke(255, 255, 255, opacity);
        strokeWeight(1.5);
        
        if (currentStrand.path && currentStrand.path.length > 0) {
            noFill();
            beginShape();
            curveVertex(currentStrand.path[0].x, currentStrand.path[0].y);
            for (let point of currentStrand.path) {
                curveVertex(point.x, point.y);
            }
            curveVertex(spider.pos.x, spider.pos.y);
            curveVertex(spider.pos.x, spider.pos.y);
            endShape();
        } else {
            line(currentStrand.start.x, currentStrand.start.y, spider.pos.x, spider.pos.y);
        }
    }
    
    for (let i = flies.length - 1; i >= 0; i--) {
        flies[i].update();
        flies[i].display();
    }
    
    spider.update();
    spider.display();
    
    // PHASE 4: Exhaustion indicator
    if (gamePhase === 'DAWN' && isExhausted) {
        push();
        textAlign(CENTER);
        textSize(16);
        fill(255, 100, 100, 200 + sin(frameCount * 0.2) * 55);
        stroke(0);
        strokeWeight(2);
        text("NO STAMINA!", spider.pos.x, spider.pos.y - 30);
        pop();
    }
    
    // PHASE 4: Update and display birds during dawn
    if (gamePhase === 'DAWN') {
        // Update stamina
        if (!spider.isAirborne && spider.vel.mag() < 0.1) {
            // Resting - faster regen
            jumpStamina += staminaRegenRate * 2.5;
        } else {
            // Moving - normal regen
            jumpStamina += staminaRegenRate;
        }
        jumpStamina = min(jumpStamina, maxJumpStamina);
        isExhausted = jumpStamina < jumpCost;
        
        // Update birds
        for (let bird of birds) {
            bird.update();
            bird.display();
        }
    }
    
    // PHASE 4B: Update thief birds during night
    if (gamePhase === 'NIGHT') {
        for (let i = birds.length - 1; i >= 0; i--) {
            let bird = birds[i];
            bird.update();
            bird.display();
            
            // Remove inactive thief birds
            if (bird.isThief && !bird.active) {
                birds.splice(i, 1);
            }
        }
    }
    
    // PHASE 3: Spider Sense - show fly path predictions
    if (upgrades.spiderSense && upgrades.spiderSense.level > 0) {
        push();
        strokeWeight(1);
        for (let fly of flies) {
            if (!fly.stuck && !fly.caught) {
                // Predict future position
                let futurePos = p5.Vector.add(fly.pos, p5.Vector.mult(fly.vel, 30));
                stroke(255, 255, 255, 30);
                line(fly.pos.x, fly.pos.y, futurePos.x, futurePos.y);
                noFill();
                stroke(255, 255, 255, 20);
                ellipse(futurePos.x, futurePos.y, 10);
            }
        }
        pop();
    }
    
    // PHASE 2: Display notifications
    for (let i = notifications.length - 1; i >= 0; i--) {
        notifications[i].update();
        notifications[i].display();
        if (notifications[i].isDead()) {
            notifications.splice(i, 1);
        }
    }
    
    // PHASE 5: Display achievements
    displayAchievements();
    
    // Update resources
    updateResources();
    
    // PHASE 5: Check achievements continuously
    checkAchievements();
    
    // PHASE 3: Update jump charging
    if (chargingJump && !spider.isAirborne) {
        jumpChargeTime++;
        spider.jumpChargeVisual = min(jumpChargeTime / maxJumpCharge, 1);
    } else {
        spider.jumpChargeVisual = 0;
    }
    
    // Handle web deployment
    handleWebDeployment();
    
    // Update UI
    updateUI();
    
    // Spawn entities during night - PHASE 1 UPDATE
    if (gamePhase === 'NIGHT') {
        // Dynamic spawn rate based on difficulty
        let spawnRate = max(90, 120 - currentNight * 5); // Faster spawning over time
        if (phaseTimer % spawnRate === 0 && flies.length < 10 + currentNight * 2) {
            // PHASE 2: Spawn different types during the night too
            let flyType = 'regular';
            let roll = random();
            
            if (currentNight >= 5 && roll < 0.03) {
                flyType = 'queen';
            } else if (roll < 0.08) {
                flyType = 'golden';
            } else if (roll < 0.20) {
                flyType = 'moth';
            }
            
            let fly = new Fly(flyType);
            let speedMult = 1 + Math.floor((currentNight - 1) / 3) * 0.1;
            fly.baseSpeed = baseFlySpeed * speedMult;
            if (flyType === 'golden') fly.baseSpeed *= 1.3;
            if (flyType === 'moth') fly.baseSpeed *= 0.8;
            if (flyType === 'queen') fly.baseSpeed *= 0.5;
            fly.currentSpeed = fly.baseSpeed;
            flies.push(fly);
        }
        if (phaseTimer % 300 === 0 && foodBoxes.length < 6) {
            spawnFoodBox();
        }
        
        // PHASE 4B: Spawn thief birds at night (after Night 5)
        if (currentNight >= 5) {
            thiefBirdTimer++;
            if (thiefBirdTimer >= nextThiefTime) {
                spawnThiefBird();
                thiefBirdTimer = 0;
                nextThiefTime = random(2700, 3600); // 45-60 seconds
            }
        }
        
        // PHASE 4B: Random wind gusts at night
        if (!windActive && frameCount > nextWindTime) {
            startWindGust();
        }
    }
}

// Continue with all the remaining functions...
function openStatsPanel() {
    // Implementation continues from original file
}

function checkAchievements() {
    // Implementation continues from original file
}

function checkNightAchievements() {
    // Implementation continues from original file
}

function checkDawnAchievements() {
    // Implementation continues from original file
}

function unlockAchievement(achievementKey) {
    // Implementation continues from original file
}

function displayAchievements() {
    // Implementation continues from original file
}

function saveGame() {
    // Implementation continues from original file
}

function loadGame() {
    let saveData = localStorage.getItem('cobGameSave');
    if (saveData) {
        let data = JSON.parse(saveData);
        achievements = data.achievements || achievements;
        stats = data.stats || stats;
        unlockedSkins = data.unlockedSkins || unlockedSkins;
        currentSkin = data.currentSkin || 'default';
        upgrades = data.upgrades || upgrades;
        playerPoints = data.playerPoints || 0;
        nightsSurvived = data.nightsSurvived || 0;
        currentNight = data.currentNight || 1;
        
        // Apply upgrades (spider exists now)
        applyUpgradeEffects();
    }
}

function spawnThiefBird() {
    // Implementation continues from original file
}

function startWindGust() {
    // Implementation continues from original file
}

function updateWind() {
    // Implementation continues from original file
}

function spawnDawnBirds() {
    // Implementation continues from original file
}

function openUpgradeShop() {
    // Implementation continues from original file
}

function closeUpgradeShop() {
    // Implementation continues from original file
}

function updateShopDisplay() {
    // Implementation continues from original file
}

function applyUpgradeEffects() {
    // Check if spider exists before applying upgrades
    if (!spider) return;
    
    // Reset to base values
    spider.jumpPower = 12;
    maxWebSilk = 100;
    silkDrainRate = 2;
    spider.munchCooldownMax = 30; // Add this property to spider
    
    // Apply Tier 1 upgrades
    if (upgrades.strongLegs.level > 0) {
        spider.jumpPower = 12 * (1 + 0.15 * upgrades.strongLegs.level);
    }
    
    if (upgrades.silkGlands.level > 0) {
        maxWebSilk = 100 + (20 * upgrades.silkGlands.level);
        webSilk = min(webSilk, maxWebSilk); // Cap current silk to new max
    }
    
    if (upgrades.efficientSpinning.level > 0) {
        silkDrainRate = 2 * (1 - 0.2 * upgrades.efficientSpinning.level);
    }
    
    if (upgrades.quickMunch.level > 0) {
        spider.munchCooldownMax = 30 * (1 - 0.3 * upgrades.quickMunch.level);
    }
    
    // Tier 2 upgrades are handled in their respective functions
}

function spawnNightFlies() {
    // Implementation continues from original file
}

function escapeFlies() {
    // Implementation continues from original file
}

function degradeWebs() {
    // Implementation continues from original file
}

function prepareDusk() {
    // Implementation continues from original file
}

function drawSun() {
    // Implementation continues from original file
}

function updateSkyColors() {
    // Implementation continues from original file
}

function drawSkyGradient() {
    // Implementation continues from original file
}

function drawMoon() {
    // Implementation continues from original file
}

function updateResources() {
    // Implementation continues from original file
}

function handleWebDeployment() {
    // Implementation continues from original file
}

function updateUI() {
    // Implementation continues from original file
}

function recycleNearbyWeb() {
    // Implementation continues from original file
}

// Input handlers
let touchStartTime = 0;
let lastTapTime = 0;
let touchHolding = false;
let touchStartX = 0;
let touchStartY = 0;

function keyPressed() {
    // Implementation continues from original file
}

function keyReleased() {
    // Implementation continues from original file
}

function mousePressed() {
    // Implementation continues from original file
}

function mouseReleased() {
    // Implementation continues from original file
}

function touchStarted() {
    // Implementation continues from original file
}

function touchMoved() {
    // Implementation continues from original file
}

function touchEnded() {
    // Implementation continues from original file
}

function windowResized() {
    resizeCanvas(window.innerWidth, window.innerHeight);
}

// Make functions globally accessible
window.selectSkin = function(skinId) {
    // Implementation continues from original file
}

window.buyUpgrade = function(upgradeKey) {
    // Implementation continues from original file
}