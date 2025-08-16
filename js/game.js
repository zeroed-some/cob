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

// Game phases
let gamePhase = 'DUSK';
let phaseTimer = 0;
let DUSK_DURATION = 1500; // 25 seconds
let TRANSITION_DURATION = 180; // 3 seconds
let skyColor1, skyColor2, currentSkyColor1, currentSkyColor2;
let moonY = 100;
let moonOpacity = 0;
let fliesCaught = 0;
let fliesMunched = 0;

function setup() {
    let canvas = createCanvas(window.innerWidth, window.innerHeight);
    canvas.parent('game-container');
    
    skyColor1 = color(135, 206, 235);
    skyColor2 = color(255, 183, 77);
    currentSkyColor1 = skyColor1;
    currentSkyColor2 = skyColor2;
    
    spider = new Spider(width / 2, height - 50);
    
    // Create obstacles with better distribution
    let numObstacles = Math.floor((width * height) / 60000);
    numObstacles = constrain(numObstacles, 10, 25);
    
    // Divide screen into zones for better distribution
    let zones = [
        { minY: 50, maxY: height * 0.3 },        // Top zone
        { minY: height * 0.3, maxY: height * 0.6 }, // Middle zone
        { minY: height * 0.6, maxY: height - 100 }  // Bottom zone
    ];
    
    let obstaclesPerZone = Math.ceil(numObstacles / 3);
    
    for (let zone of zones) {
        for (let i = 0; i < obstaclesPerZone; i++) {
            let attempts = 0;
            let placed = false;
            
            while (!placed && attempts < 20) {
                let x = random(80, width - 80);
                let y = random(zone.minY, zone.maxY);
                let radius = random(25, 45);
                let type = random() < 0.6 ? 'branch' : 'leaf';
                
                let valid = true;
                for (let obstacle of obstacles) {
                    if (dist(x, y, obstacle.x, obstacle.y) < radius + obstacle.radius + 40) {
                        valid = false;
                        break;
                    }
                }
                
                if (valid) {
                    obstacles.push(new Obstacle(x, y, radius, type));
                    placed = true;
                }
                attempts++;
            }
        }
    }
    
    // Add guaranteed anchor points with better bottom coverage
    obstacles.push(new Obstacle(50, height/2, 35, 'branch'));
    obstacles.push(new Obstacle(width - 50, height/2, 35, 'branch'));
    obstacles.push(new Obstacle(width/2, 50, 40, 'leaf'));
    
    // More bottom anchors for reachability
    obstacles.push(new Obstacle(width/4, height - 120, 35, 'leaf'));
    obstacles.push(new Obstacle(3*width/4, height - 120, 35, 'branch'));
    obstacles.push(new Obstacle(width/2, height - 150, 30, 'branch'));
    
    if (width > 1200) {
        obstacles.push(new Obstacle(width/3, height/3, 35, 'leaf'));
        obstacles.push(new Obstacle(2*width/3, height/3, 35, 'branch'));
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
    
    // Phase transitions
    if (gamePhase === 'DUSK' && phaseTimer >= DUSK_DURATION) {
        gamePhase = 'TRANSITION';
        phaseTimer = 0;
    } else if (gamePhase === 'TRANSITION' && phaseTimer >= TRANSITION_DURATION) {
        gamePhase = 'NIGHT';
        phaseTimer = 0;
        for (let i = 0; i < 5; i++) {
            flies.push(new Fly());
        }
        for (let i = 0; i < 3; i++) {
            spawnFoodBox();
        }
    }
    
    // Update sky colors
    updateSkyColors();
    
    // Draw sky gradient
    drawSkyGradient();
    
    // Draw moon and stars
    if (moonOpacity > 0) {
        drawMoon();
    }
    
    // Display game objects
    for (let obstacle of obstacles) {
        obstacle.display();
    }
    
    for (let box of foodBoxes) {
        box.display();
    }
    
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].display();
        if (particles[i].isDead()) {
            particles.splice(i, 1);
        }
    }
    
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
    
    // Update resources
    updateResources();
    
    // Handle web deployment
    handleWebDeployment();
    
    // Update UI
    updateUI();
    
    // Spawn entities during night
    if (gamePhase === 'NIGHT') {
        if (phaseTimer % 120 === 0 && flies.length < 15) {
            flies.push(new Fly());
        }
        if (phaseTimer % 300 === 0 && foodBoxes.length < 6) {
            spawnFoodBox();
        }
    }
}

function updateSkyColors() {
    if (gamePhase === 'DUSK') {
        currentSkyColor1 = lerpColor(color(135, 206, 235), color(255, 140, 90), phaseTimer / DUSK_DURATION);
        currentSkyColor2 = lerpColor(color(255, 183, 77), color(120, 60, 120), phaseTimer / DUSK_DURATION);
    } else if (gamePhase === 'TRANSITION') {
        let t = phaseTimer / TRANSITION_DURATION;
        currentSkyColor1 = lerpColor(color(255, 140, 90), color(25, 25, 112), t);
        currentSkyColor2 = lerpColor(color(120, 60, 120), color(0, 0, 40), t);
        moonOpacity = t * 255;
        moonY = lerp(100, 60, t);
    } else if (gamePhase === 'NIGHT') {
        currentSkyColor1 = color(25, 25, 112);
        currentSkyColor2 = color(0, 0, 40);
        moonOpacity = 255;
    }
}

function drawSkyGradient() {
    for(let i = 0; i <= height; i++) {
        let inter = map(i, 0, height, 0, 1);
        let c = lerpColor(currentSkyColor1, currentSkyColor2, inter);
        stroke(c);
        line(0, i, width, i);
    }
}

function drawMoon() {
    push();
    noStroke();
    fill(255, 255, 230, moonOpacity);
    ellipse(width - 100, moonY, 50);
    fill(255, 255, 200, moonOpacity * 0.3);
    ellipse(width - 100, moonY, 70);
    
    fill(230, 230, 200, moonOpacity * 0.5);
    ellipse(width - 105, moonY - 5, 8);
    ellipse(width - 95, moonY + 8, 12);
    ellipse(width - 110, moonY + 10, 6);
    pop();
    
    if (gamePhase === 'NIGHT') {
        randomSeed(42);
        for (let i = 0; i < 50; i++) {
            let x = random(width);
            let y = random(height * 0.6);
            let brightness = random(100, 255);
            stroke(255, 255, 255, brightness);
            strokeWeight(random(1, 2));
            point(x, y);
        }
        randomSeed(millis());
    }
}

function updateResources() {
    webSilk = min(webSilk + silkRechargeRate, maxWebSilk);
    
    if (isDeployingWeb && spider.isAirborne && spacePressed && webSilk > 0) {
        webSilk = max(0, webSilk - silkDrainRate);
        if (webSilk <= 0) {
            isDeployingWeb = false;
            spacePressed = false;
            if (currentStrand) {
                webStrands.pop();
                currentStrand = null;
            }
        }
    }
    
    if (!spacePressed && isDeployingWeb) {
        isDeployingWeb = false;
    }
}

function handleWebDeployment() {
    if (spacePressed && spider.isAirborne && !isDeployingWeb && webSilk > 10) {
        isDeployingWeb = true;
        currentStrand = new WebStrand(spider.lastAnchorPoint.copy(), null);
        currentStrand.path = [spider.lastAnchorPoint.copy()];
        webStrands.push(currentStrand);
        webNodes.push(new WebNode(spider.lastAnchorPoint.x, spider.lastAnchorPoint.y));
    }
    
    if (currentStrand && isDeployingWeb && spider.isAirborne) {
        currentStrand.end = spider.pos.copy();
        if (frameCount % 2 === 0) {
            currentStrand.path.push(spider.pos.copy());
        }
    }
}

function updateUI() {
    document.getElementById('strand-count').textContent = webStrands.length;
    document.getElementById('flies-caught').textContent = fliesCaught;
    document.getElementById('flies-munched').textContent = fliesMunched;
    document.getElementById('phase').textContent = gamePhase === 'TRANSITION' ? 'NIGHTFALL' : gamePhase;
    
    if (gamePhase === 'DUSK') {
        let timeLeft = Math.ceil((DUSK_DURATION - phaseTimer) / 60);
        document.getElementById('timer').textContent = `${timeLeft}s to prepare!`;
    } else if (gamePhase === 'TRANSITION') {
        document.getElementById('timer').textContent = 'Night approaches...';
    } else {
        document.getElementById('timer').textContent = `${flies.length} flies active`;
    }
    
    let meterPercent = (webSilk / maxWebSilk) * 100;
    document.getElementById('web-meter-fill').style.width = meterPercent + '%';
    
    if (webSilk < 20) {
        let flash = sin(frameCount * 0.2) * 0.5 + 0.5;
        document.getElementById('web-meter-fill').style.background = 
            `linear-gradient(90deg, rgb(255, ${100 + flash * 100}, ${100 + flash * 100}), rgb(255, ${150 + flash * 50}, ${150 + flash * 50}))`;
    } else {
        document.getElementById('web-meter-fill').style.background = 
            'linear-gradient(90deg, #87CEEB, #E0F6FF)';
    }
}

// Input handlers
function keyPressed() {
    if (key === ' ') {
        spacePressed = true;
        return false;
    }
    if (keyCode === SHIFT) {
        spider.munch();
        return false;
    }
}

function keyReleased() {
    if (key === ' ') {
        spacePressed = false;
        isDeployingWeb = false;
        return false;
    }
}

function mousePressed() {
    if (!spider.isAirborne) {
        spider.jump(mouseX, mouseY);
    }
}

function mouseReleased() {
    // No longer needed for web deployment
}

function touchStarted() {
    if (!spider.isAirborne) {
        spider.jump(touches[0].x, touches[0].y);
    }
    return false;
}

function touchEnded() {
    return false;
}

function windowResized() {
    resizeCanvas(window.innerWidth, window.innerHeight);
}