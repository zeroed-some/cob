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
    
    // Update and display game objects
    for (let obstacle of obstacles) {
        obstacle.update(); // Update movement and animations
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
                        
                        // Yellow particles for release
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
        
        noStroke();
        
        // Base color
        if (gamePhase === 'NIGHT') {
            fill(30, 15, 5);
        } else {
            fill(92, 51, 23);
        }
        
        // Branch body with taper
        beginShape();
        vertex(branch.startX, -branch.thickness);
        bezierVertex(
            branch.startX + (branch.endX - branch.startX) * 0.3, -branch.thickness * 0.9,
            branch.startX + (branch.endX - branch.startX) * 0.7, -branch.thickness * 0.6,
            branch.endX, -branch.thickness * 0.35
        );
        vertex(branch.endX, branch.thickness * 0.35);
        bezierVertex(
            branch.startX + (branch.endX - branch.startX) * 0.7, branch.thickness * 0.6,
            branch.startX + (branch.endX - branch.startX) * 0.3, branch.thickness * 0.9,
            branch.startX, branch.thickness
        );
        endShape(CLOSE);
        
        // Add a fork around 70% down the branch
        push();
        let forkX = branch.startX + (branch.endX - branch.startX) * 0.7;
        let forkY = 0;
        translate(forkX, forkY);
        rotate((branch.side === 'right' ? -1 : 1) * PI/6);
        
        // Fork branch
        if (gamePhase === 'NIGHT') {
            fill(35, 18, 6);
        } else {
            fill(102, 58, 28);
        }
        
        beginShape();
        vertex(0, -8);
        bezierVertex(20, -7, 35, -5, 50, -3);
        vertex(50, 3);
        bezierVertex(35, 5, 20, 7, 0, 8);
        endShape(CLOSE);
        pop();
        
        // Add lighter highlights
        if (gamePhase === 'NIGHT') {
            fill(50, 25, 10, 150);
        } else {
            fill(139, 90, 43, 180);
        }
        
        // Highlight on top ridge
        beginShape();
        vertex(branch.startX + 20, -branch.thickness * 0.8);
        bezierVertex(
            branch.startX + (branch.endX - branch.startX) * 0.4, -branch.thickness * 0.7,
            branch.startX + (branch.endX - branch.startX) * 0.6, -branch.thickness * 0.5,
            branch.endX - 20, -branch.thickness * 0.25
        );
        vertex(branch.endX - 20, -branch.thickness * 0.15);
        bezierVertex(
            branch.startX + (branch.endX - branch.startX) * 0.6, -branch.thickness * 0.4,
            branch.startX + (branch.endX - branch.startX) * 0.4, -branch.thickness * 0.6,
            branch.startX + 20, -branch.thickness * 0.7
        );
        endShape(CLOSE);
        
        // Bark texture lines
        stroke(60, 30, 10, 100);
        strokeWeight(1);
        for (let texture of branch.barkTextures) {
            if (texture.x % 20 < 10) {
                line(texture.x, texture.yOff, texture.x + 3, texture.endYOff);
            }
        }
        
        // Knots
        noStroke();
        if (gamePhase === 'NIGHT') {
            fill(40, 20, 5);
        } else {
            fill(80, 40, 15);
        }
        ellipse(branch.startX + (branch.endX - branch.startX) * 0.3, -5, 12, 8);
        ellipse(branch.startX + (branch.endX - branch.startX) * 0.65, 3, 8, 10);
        
        pop();
        
        // Small twigs - properly attached to the rotated branch
        stroke(gamePhase === 'NIGHT' ? color(40, 20, 0) : color(101, 67, 33));
        
        // Just add a couple simple twigs for visual interest
        strokeWeight(3);
        line(branch.startX + (branch.endX - branch.startX) * 0.3, -5, 
             branch.startX + (branch.endX - branch.startX) * 0.3 - 10, -15);
        line(branch.startX + (branch.endX - branch.startX) * 0.6, 0, 
             branch.startX + (branch.endX - branch.startX) * 0.6 + 8, -12);
        
        // Add leaves (properly positioned within rotated branch)
        for (let leaf of branch.leaves) {
            let leafX = branch.startX + (branch.endX - branch.startX) * leaf.t;
            push();
            translate(leafX, leaf.yOffset);
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