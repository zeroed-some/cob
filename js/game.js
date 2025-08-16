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
    
    // Create home branch for spider
    let homeBranchSide = random() < 0.5 ? 'left' : 'right';
    let homeBranchLength = random(width * 0.33, width * 0.5);
    let homeBranchY = random(height * 0.7, height * 0.85);
    let homeBranchThickness = 25;
    
    // Calculate start and end positions ONCE
    let branchStartX = homeBranchSide === 'left' ? -20 : width + 20;
    let branchEndX = homeBranchSide === 'left' ? homeBranchLength : width - homeBranchLength;
    
    // Generate twigs with FIXED positions
    let twigs = [];
    let numTwigs = 5;
    for (let i = 0; i < numTwigs; i++) {
        let t = 0.2 + (0.6 * i / (numTwigs - 1)); // Evenly distributed
        let x = lerp(branchStartX, branchEndX, t); // Calculate actual X position
        twigs.push({
            x: x, // Store actual position, not percentage
            length: 20 + (i * 4), // Vary length slightly
            angle: (-PI/4 + (i * PI/20)) * (homeBranchSide === 'right' ? -1 : 1),
            subTwigs: [
                { pos: 0.7, length: 5, angle: -5 },
                { pos: 0.5, length: 4, angle: 4 }
            ]
        });
    }
    
    // Generate leaves with FIXED positions
    let leaves = [];
    for (let i = 0; i < 3; i++) {
        let t = 0.3 + (0.4 * i / 2); // Distribute between 0.3 and 0.7
        let x = lerp(branchStartX, branchEndX, t);
        leaves.push({
            x: x, // Store actual position
            yOffset: -homeBranchThickness - (i * 10),
            rotation: -PI/6 + (i * PI/6),
            width: 15,
            height: 8
        });
    }
    
    // Generate bark textures with FIXED positions
    let barkTextures = [];
    for (let x = Math.min(branchStartX, branchEndX); x < Math.max(branchStartX, branchEndX); x += 20) {
        barkTextures.push({
            x: x,
            yOff: -5 + (x % 10), // Deterministic offset based on position
            endYOff: -2 + (x % 5)
        });
    }
    
    // Store home branch info for rendering
    window.homeBranch = {
        side: homeBranchSide,
        startX: branchStartX,
        endX: branchEndX,
        y: homeBranchY,
        thickness: homeBranchThickness,
        angle: homeBranchSide === 'left' ? 0.05 : -0.05, // Fixed slight angle
        twigs: twigs,
        leaves: leaves,
        barkTextures: barkTextures
    };
    
    // Place spider on the home branch
    let spiderStartX = homeBranchSide === 'left' ? 
        homeBranchLength * 0.8 : 
        width - homeBranchLength * 0.8;
    spider = new Spider(spiderStartX, homeBranchY - 15);
    
    // Add invisible obstacles along the branch for web anchor points
    let numBranchAnchors = 3;
    for (let i = 0; i < numBranchAnchors; i++) {
        let t = (i + 1) / (numBranchAnchors + 1);
        let x = homeBranchSide === 'left' ? 
            homeBranchLength * t : 
            width - homeBranchLength * t;
        let y = homeBranchY + sin(t * PI) * 10; // Slight curve
        obstacles.push(new Obstacle(x, y, 20, 'branch'));
    }
    
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
    
    // Draw home branch
    if (window.homeBranch) {
        push();
        let branch = window.homeBranch;
        
        // Branch shadow
        push();
        translate(0, branch.y + 5);
        rotate(branch.angle);
        noStroke();
        fill(0, 0, 0, 30);
        
        // Shadow with taper
        beginShape();
        vertex(branch.startX, 10);
        bezierVertex(
            branch.startX + (branch.endX - branch.startX) * 0.3, 8,
            branch.startX + (branch.endX - branch.startX) * 0.7, 5,
            branch.endX, 3
        );
        vertex(branch.endX, -3);
        bezierVertex(
            branch.startX + (branch.endX - branch.startX) * 0.7, -5,
            branch.startX + (branch.endX - branch.startX) * 0.3, -8,
            branch.startX, -10
        );
        endShape(CLOSE);
        pop();
        
        // Main branch with organic shape and taper
        push();
        translate(0, branch.y);
        rotate(branch.angle);
        
        // Dark brown base
        noStroke();
        if (gamePhase === 'NIGHT') {
            fill(30, 15, 5);
        } else {
            fill(92, 51, 23);
        }
        
        // Create tapered, organic branch shape
        beginShape();
        // Top edge with bumps and curves
        vertex(branch.startX, -branch.thickness);
        bezierVertex(
            branch.startX + (branch.endX - branch.startX) * 0.2, -branch.thickness + 3,
            branch.startX + (branch.endX - branch.startX) * 0.4, -branch.thickness * 0.8 + 2,
            branch.startX + (branch.endX - branch.startX) * 0.6, -branch.thickness * 0.6
        );
        bezierVertex(
            branch.startX + (branch.endX - branch.startX) * 0.8, -branch.thickness * 0.4,
            branch.endX - 20, -branch.thickness * 0.3,
            branch.endX, -branch.thickness * 0.2
        );
        
        // Bottom edge with natural irregularities
        vertex(branch.endX, branch.thickness * 0.2);
        bezierVertex(
            branch.endX - 20, branch.thickness * 0.3,
            branch.startX + (branch.endX - branch.startX) * 0.8, branch.thickness * 0.4 + 2,
            branch.startX + (branch.endX - branch.startX) * 0.6, branch.thickness * 0.6
        );
        bezierVertex(
            branch.startX + (branch.endX - branch.startX) * 0.4, branch.thickness * 0.8,
            branch.startX + (branch.endX - branch.startX) * 0.2, branch.thickness - 3,
            branch.startX, branch.thickness
        );
        endShape(CLOSE);
        
        // Add lighter brown highlights
        if (gamePhase === 'NIGHT') {
            fill(50, 25, 10, 150);
        } else {
            fill(139, 90, 43, 150);
        }
        
        // Top highlight
        beginShape();
        vertex(branch.startX + 10, -branch.thickness + 5);
        bezierVertex(
            branch.startX + (branch.endX - branch.startX) * 0.3, -branch.thickness * 0.7,
            branch.startX + (branch.endX - branch.startX) * 0.6, -branch.thickness * 0.5,
            branch.endX - 30, -branch.thickness * 0.2 + 2
        );
        vertex(branch.endX - 30, 0);
        bezierVertex(
            branch.startX + (branch.endX - branch.startX) * 0.6, -2,
            branch.startX + (branch.endX - branch.startX) * 0.3, -5,
            branch.startX + 10, -8
        );
        endShape(CLOSE);
        
        // Bark texture with grooves
        stroke(60, 30, 10, 100);
        strokeWeight(1);
        for (let i = 0; i < branch.barkTextures.length; i += 2) {
            let texture = branch.barkTextures[i];
            // Vertical grooves
            line(texture.x, texture.yOff - 5, texture.x + 3, texture.yOff + 8);
            // Horizontal texture
            if (i % 4 === 0) {
                line(texture.x - 5, texture.yOff, texture.x + 15, texture.yOff + 2);
            }
        }
        
        // Add knots and bumps
        noStroke();
        if (gamePhase === 'NIGHT') {
            fill(40, 20, 5);
        } else {
            fill(80, 40, 15);
        }
        
        // A couple of knots
        ellipse(branch.startX + (branch.endX - branch.startX) * 0.3, -3, 15, 12);
        ellipse(branch.startX + (branch.endX - branch.startX) * 0.7, 2, 10, 8);
        
        // Small twigs with organic angles
        stroke(gamePhase === 'NIGHT' ? color(40, 20, 0) : color(101, 67, 33));
        for (let twig of branch.twigs) {
            push();
            translate(twig.x, 0);
            
            // Make twigs thicker at base
            strokeWeight(4);
            line(0, 0, twig.length * 0.3, twig.length * 0.1);
            strokeWeight(3);
            line(twig.length * 0.3, twig.length * 0.1, twig.length * 0.6, twig.length * 0.15);
            strokeWeight(2);
            line(twig.length * 0.6, twig.length * 0.15, twig.length, twig.length * 0.2);
            
            // Tiny sub-twigs
            strokeWeight(1);
            for (let subTwig of twig.subTwigs) {
                line(twig.length * subTwig.pos, twig.length * 0.15, 
                     twig.length * subTwig.pos + subTwig.length, 
                     twig.length * 0.15 + subTwig.angle);
            }
            pop();
        }
        
        // Add leaves with more natural placement
        for (let leaf of branch.leaves) {
            push();
            translate(leaf.x, leaf.yOffset);
            rotate(leaf.rotation);
            
            // Leaf shadow
            noStroke();
            fill(0, 0, 0, 20);
            ellipse(2, 2, leaf.width, leaf.height);
            
            // Leaf body
            if (gamePhase === 'NIGHT') {
                fill(20, 40, 20);
            } else {
                fill(34, 139, 34);
            }
            ellipse(0, 0, leaf.width, leaf.height);
            
            // Leaf vein
            stroke(25, 100, 25, 100);
            strokeWeight(0.5);
            line(-leaf.width/2 + 2, 0, leaf.width/2 - 2, 0);
            pop();
        }
        
        pop();
        pop();
    }
}

function drawMoon()
{
    push();
    noStroke();

    // Brighter, farther-reaching moon glow
    fill(255, 255, 240, moonOpacity);
    ellipse(width - 100, moonY, 52);

    // Multi-layer radial glow for reach
    push();
    blendMode(ADD);
    fill(255, 255, 230, moonOpacity * 0.55);
    ellipse(width - 100, moonY, 90);
    fill(255, 255, 210, moonOpacity * 0.35);
    ellipse(width - 100, moonY, 140);
    fill(220, 230, 255, moonOpacity * 0.22);
    ellipse(width - 100, moonY, 200);
    pop();

    // Moon craters with better contrast
    fill(240, 240, 210, moonOpacity * 0.7);
    ellipse(width - 105, moonY - 5, 8);
    ellipse(width - 95, moonY + 8, 12);
    ellipse(width - 110, moonY + 10, 6);

    // Subtle "godrays" emanating from the moon
    push();
    blendMode(ADD);
    let baseA = frameCount * 0.0023; // slow drift
    let rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
        let a = baseA + i * (Math.PI * 2 / rayCount) + (noise(i * 0.2, frameCount * 0.005) - 0.5) * 0.2;
        let len = 140 + noise(i * 1.7, frameCount * 0.003) * 120; // 140-260px
        let w0 = 6 + noise(i * 0.9) * 6;   // near width
        let w1 = 18 + noise(i * 0.7) * 16; // far width
        let cx = width - 100;
        let cy = moonY;
        fill(220, 230, 255, (moonOpacity * 0.18));
        noStroke();
        beginShape();
        vertex(cx + Math.cos(a + 0.03) * w0, cy + Math.sin(a + 0.03) * w0);
        vertex(cx + Math.cos(a - 0.03) * w0, cy + Math.sin(a - 0.03) * w0);
        vertex(cx + Math.cos(a) * len + Math.cos(a + 0.12) * w1, cy + Math.sin(a) * len + Math.sin(a + 0.12) * w1);
        vertex(cx + Math.cos(a) * len + Math.cos(a - 0.12) * w1, cy + Math.sin(a) * len + Math.sin(a - 0.12) * w1);
        endShape(CLOSE);
    }
    pop();

    pop();
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