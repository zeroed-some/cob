// entities.js - All game entity classes

class Spider {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.radius = 8;
        this.isAirborne = false;
        this.canJump = true;
        this.lastAnchorPoint = null;
        this.gravity = createVector(0, 0.3);
        this.jumpPower = 12;
        this.maxSpeed = 15;
        this.munchRadius = 20;
        this.munchCooldown = 0;
    }

jump(targetX, targetY) {
        if (!this.canJump) return;
        
        let direction = createVector(targetX - this.pos.x, targetY - this.pos.y);
        let clickDistance = direction.mag();
        direction.normalize();
        
        // Scale jump power based on click distance (closer clicks = smaller jumps)
        let actualJumpPower = map(clickDistance, 0, 200, 3, this.jumpPower);
        actualJumpPower = constrain(actualJumpPower, 3, this.jumpPower);
        direction.mult(actualJumpPower);
        
        this.vel = direction;
        this.isAirborne = true;
        this.canJump = false;
        this.lastAnchorPoint = this.pos.copy();
        
        // Check if we're jumping off a web strand
        for (let strand of webStrands) {
            if (strand === currentStrand) continue;
            
            if (this.checkStrandCollision(strand)) {
                // Much simpler shimmy detection based on actual jump power used
                let isShimmy = actualJumpPower < 6; // If we used less than half power, it's a shimmy
                
                // Apply appropriate recoil based on movement type
                if (isShimmy) {
                    // Trigger shimmy visual effect
                    this.shimmyEffect = 20;
                    
                    // NO recoil at all for shimmying - just tiny vibration
                    strand.vibrate(0.3);
                    
                    // Tiny yellow particles
                    let p = new Particle(this.pos.x, this.pos.y);
                    p.color = color(255, 255, 100, 80);
                    p.vel = createVector(random(-0.3, 0.3), random(-0.3, 0.3));
                    p.size = 2;
                    particles.push(p);
                } else {
                    // Scale recoil based on actual jump power
                    let recoilForce = -(actualJumpPower / this.jumpPower) * 0.08; // Scale by power ratio
                    strand.applyRecoil(recoilForce);
                    
                    // Create particles only for real jumps
                    for (let i = 0; i < 2; i++) {
                        let p = new Particle(this.pos.x, this.pos.y);
                        p.color = color(255, 255, 255, 120);
                        p.vel = createVector(random(-0.8, 0.8), random(1, 2));
                        p.size = 3;
                        particles.push(p);
                    }
                }
                
                break;
            }
        }
    }
    
    munch() {
        if (this.munchCooldown > 0) return;
        
        isMunching = true;
        this.munchCooldown = 30;
        
        for (let i = flies.length - 1; i >= 0; i--) {
            let fly = flies[i];
            let d = dist(this.pos.x, this.pos.y, fly.pos.x, fly.pos.y);
            if (d < this.munchRadius) {
                fliesMunched++;
                webSilk = min(webSilk + 15, maxWebSilk);
                
                for (let j = 0; j < 12; j++) {
                    let p = new Particle(fly.pos.x, fly.pos.y);
                    p.color = color(255, random(100, 255), 0);
                    particles.push(p);
                }
                
                flies.splice(i, 1);
                break;
            }
        }
    }

    update() {
        if (this.isAirborne) {
            this.acc.add(this.gravity);
        }
        
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);
        
        if (this.munchCooldown > 0) {
            this.munchCooldown--;
            if (this.munchCooldown === 0) {
                isMunching = false;
            }
        }

        // Check ground collision
        if (this.pos.y >= height - this.radius) {
            this.pos.y = height - this.radius;
            this.land();
        }

        // Check wall collisions
        if (this.pos.x <= this.radius || this.pos.x >= width - this.radius) {
            this.pos.x = constrain(this.pos.x, this.radius, width - this.radius);
            this.vel.x *= -0.5;
        }

        // Check ceiling
        if (this.pos.y <= this.radius) {
            this.pos.y = this.radius;
            this.vel.y *= -0.5; // Bounce off ceiling, don't land
        }
        
        // Check home branch collision (one-way platform)
        if (window.homeBranch && this.isAirborne && this.vel.y > 0.1) { // Only when actually falling
            let branch = window.homeBranch;
            
            // Check if spider is within branch X range
            let branchStart = Math.min(branch.startX, branch.endX);
            let branchEnd = Math.max(branch.startX, branch.endX);
            
            // Since the branch angle is very small (0.05 radians ≈ 3 degrees), 
            // we can use a simpler approximation
            if (this.pos.x >= branchStart - 10 && this.pos.x <= branchEnd + 10) {
                // Calculate position along branch (0 to 1)
                let t = (this.pos.x - branchStart) / (branchEnd - branchStart);
                t = constrain(t, 0, 1);
                
                // Branch visual thickness tapers from full at start to 35% at end
                // This matches exactly how it's drawn in the bezier curves
                let branchTopThickness = lerp(branch.thickness * 0.9, branch.thickness * 0.35, t);
                
                // The branch is drawn centered at branch.y
                // With small angle approximation: the top of the branch is at
                let branchSurfaceY = branch.y - branchTopThickness;
                
                // Add slight angle correction (for small angles, tan ≈ sin ≈ angle in radians)
                let angleCorrection = (this.pos.x - branchStart) * branch.angle;
                branchSurfaceY += angleCorrection;
                
                // Check if spider is crossing the branch from above
                let prevY = this.pos.y - this.vel.y;
                
                if (prevY <= branchSurfaceY && // Was above
                    this.pos.y + this.radius >= branchSurfaceY && // Now at or below
                    this.pos.y < branch.y + branch.thickness) { // Not too far below
                    
                    // Place spider on the branch surface
                    this.pos.y = branchSurfaceY - this.radius;
                    this.land();
                }
            }
        }

        // Check obstacle collisions
        for (let obstacle of obstacles) {
            if (this.checkObstacleCollision(obstacle)) {
                this.landOnObstacle(obstacle);
            }
        }

        // Check web strand collisions
        for (let strand of webStrands) {
            if (strand === currentStrand) continue;
            
            if (this.isAirborne && this.checkStrandCollision(strand)) {
                this.landOnStrand(strand);
            }
        }
        
        // Check food box collisions
        for (let i = foodBoxes.length - 1; i >= 0; i--) {
            let box = foodBoxes[i];
            if (dist(this.pos.x, this.pos.y, box.pos.x, box.pos.y) < this.radius + box.radius) {
                box.collect();
                foodBoxes.splice(i, 1);
            }
        }
    }

    checkObstacleCollision(obstacle) {
        let d = dist(this.pos.x, this.pos.y, obstacle.x, obstacle.y);
        return d < this.radius + obstacle.radius;
    }

    checkStrandCollision(strand) {
        let d = this.pointToLineDistance(this.pos, strand.start, strand.end);
        return d < this.radius + 2;
    }

    pointToLineDistance(point, lineStart, lineEnd) {
        let line = p5.Vector.sub(lineEnd, lineStart);
        let lineLength = line.mag();
        line.normalize();
        
        let pointToStart = p5.Vector.sub(point, lineStart);
        let projLength = constrain(pointToStart.dot(line), 0, lineLength);
        
        let closestPoint = p5.Vector.add(lineStart, p5.Vector.mult(line, projLength));
        return p5.Vector.dist(point, closestPoint);
    }

    landOnObstacle(obstacle) {
        let angle = atan2(this.pos.y - obstacle.y, this.pos.x - obstacle.x);
        this.pos.x = obstacle.x + cos(angle) * (obstacle.radius + this.radius);
        this.pos.y = obstacle.y + sin(angle) * (obstacle.radius + this.radius);
        this.land();
    }

    landOnStrand(strand) {
        let line = p5.Vector.sub(strand.end, strand.start);
        let lineLength = line.mag();
        line.normalize();
        
        let pointToStart = p5.Vector.sub(this.pos, strand.start);
        let projLength = constrain(pointToStart.dot(line), 0, lineLength);
        
        let closestPoint = p5.Vector.add(strand.start, p5.Vector.mult(line, projLength));
        this.pos = closestPoint;
        this.land();
    }

    land() {
        this.vel.mult(0);
        this.isAirborne = false;
        this.canJump = true;
        
        if (currentStrand && isDeployingWeb && spacePressed) {
            currentStrand.end = this.pos.copy();
            currentStrand.path.push(this.pos.copy());
            webNodes.push(new WebNode(this.pos.x, this.pos.y));
        }
        
        currentStrand = null;
        isDeployingWeb = false;
    }

    display() {
        push();
        translate(this.pos.x, this.pos.y);
        
        if (isMunching && this.munchCooldown > 15) {
            push();
            fill(255, 100, 100, 150);
            noStroke();
            let munchSize = 15 + sin(frameCount * 0.5) * 5;
            arc(0, 0, munchSize, munchSize, 0, PI + HALF_PI, PIE);
            pop();
        }
        
        fill(20);
        stroke(0);
        strokeWeight(1);
        ellipse(0, 0, this.radius * 2);
        
        fill(40);
        noStroke();
        ellipse(0, -2, this.radius * 1.2, this.radius * 1.5);
        
        if (gamePhase === 'NIGHT') {
            fill(255, 100, 100);
        } else {
            fill(255, 0, 0);
        }
        ellipse(-3, -3, 3);
        ellipse(3, -3, 3);
        
        stroke(0);
        strokeWeight(1.5);
        for (let i = 0; i < 4; i++) {
            let angle = PI/6 + (i * PI/8);
            line(0, 0, cos(angle) * 12, sin(angle) * 8);
            line(0, 0, -cos(angle) * 12, sin(angle) * 8);
        }
        
        if (webSilk < 20) {
            fill(255, 100, 100, 150 + sin(frameCount * 0.2) * 50);
            noStroke();
            ellipse(0, -15, 8);
        }
        
        pop();
    }
}

class Fly {
    constructor() {
        if (random() < 0.5) {
            this.pos = createVector(random() < 0.5 ? -20 : width + 20, random(50, height - 100));
        } else {
            this.pos = createVector(random(width), random() < 0.5 ? -20 : height + 20);
        }
        
        this.vel = createVector(random(-2, 2), random(-1, 1));
        this.acc = createVector(0, 0);
        this.radius = 4;
        this.caught = false;
        this.stuck = false;
        this.wingPhase = random(TWO_PI);
        this.wanderAngle = random(TWO_PI);
        this.glowIntensity = random(150, 255);
        this.touchedStrands = new Set();
        this.slowedBy = new Set(); // Track which strands are slowing us
        this.baseSpeed = 3;
        this.currentSpeed = this.baseSpeed;
    }

    update() {
        if (this.stuck) return;
        
        if (this.caught) {
            this.vel.mult(0.95);
            if (this.vel.mag() < 0.1) {
                this.stuck = true;
                fliesCaught++;
                webSilk = min(webSilk + 5, maxWebSilk);
            }
            return;
        }
        
        this.wanderAngle += random(-0.3, 0.3);
        let wanderForce = createVector(cos(this.wanderAngle), sin(this.wanderAngle));
        wanderForce.mult(0.1);
        this.acc.add(wanderForce);
        
        // Apply current speed (which may be slowed)
        this.vel.add(this.acc);
        this.vel.limit(this.currentSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);
        
        if (this.pos.x < -30) this.pos.x = width + 30;
        if (this.pos.x > width + 30) this.pos.x = -30;
        if (this.pos.y < -30) this.pos.y = height + 30;
        if (this.pos.y > height + 30) this.pos.y = -30;
        
        // Check web collisions
        this.checkWebCollisions();
    }

    checkWebCollisions() {
        let currentlyTouching = new Set();
        
        for (let strand of webStrands) {
            let touching = false;
            
            // Check collision with strand path
            if (strand.path && strand.path.length > 1) {
                for (let i = 0; i < strand.path.length - 1; i++) {
                    let p1 = strand.path[i];
                    let p2 = strand.path[i + 1];
                    let d = this.pointToLineDistance(this.pos, p1, p2);
                    if (d < this.radius + 3) {
                        touching = true;
                        break;
                    }
                }
            } else if (strand.start && strand.end) {
                // Fallback for strands without path
                let d = this.pointToLineDistance(this.pos, strand.start, strand.end);
                if (d < this.radius + 3) {
                    touching = true;
                }
            }
            
            if (touching) {
                currentlyTouching.add(strand);
                
                // If this is a new strand we're touching
                if (!this.touchedStrands.has(strand)) {
                    this.touchedStrands.add(strand);
                    
                    // Vibrate the web when first touching
                    strand.vibrate(3);
                    
                    // First strand slows us down
                    if (this.touchedStrands.size === 1) {
                        this.currentSpeed = this.baseSpeed * 0.4; // Slow to 40% speed
                        this.slowedBy.add(strand);
                        
                        // Visual feedback - yellow particles for slowing
                        for (let j = 0; j < 3; j++) {
                            let p = new Particle(this.pos.x, this.pos.y);
                            p.color = color(255, 255, 0, 150);
                            p.vel = createVector(random(-1, 1), random(-1, 1));
                            p.size = 3;
                            particles.push(p);
                        }
                    }
                    // Second strand catches us
                    else if (this.touchedStrands.size >= 2 && !this.caught) {
                        this.caught = true;
                        this.currentSpeed = 0;
                        
                        // Stronger vibration when caught
                        strand.vibrate(8);
                        
                        // Also vibrate nearby strands
                        for (let otherStrand of webStrands) {
                            if (otherStrand !== strand) {
                                for (let touchedStrand of this.touchedStrands) {
                                    let d1 = dist(otherStrand.start.x, otherStrand.start.y, touchedStrand.start.x, touchedStrand.start.y);
                                    let d2 = dist(otherStrand.start.x, otherStrand.start.y, touchedStrand.end.x, touchedStrand.end.y);
                                    let d3 = dist(otherStrand.end.x, otherStrand.end.y, touchedStrand.start.x, touchedStrand.start.y);
                                    let d4 = dist(otherStrand.end.x, otherStrand.end.y, touchedStrand.end.x, touchedStrand.end.y);
                                    if (min(d1, d2, d3, d4) < 50) {
                                        otherStrand.vibrate(2);
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // Create caught particles
                        for (let j = 0; j < 6; j++) {
                            let p = new Particle(this.pos.x, this.pos.y);
                            p.color = color(255, 200, 0, 200);
                            p.vel = createVector(random(-2, 2), random(-2, 2));
                            particles.push(p);
                        }
                    }
                }
            }
        }
        
        // If we're no longer touching strands we were slowed by, speed back up
        if (this.slowedBy.size > 0 && currentlyTouching.size === 0) {
            this.currentSpeed = this.baseSpeed;
            this.slowedBy.clear();
        }
    }

    pointToLineDistance(point, lineStart, lineEnd) {
        let line = p5.Vector.sub(lineEnd, lineStart);
        let lineLength = line.mag();
        line.normalize();
        
        let pointToStart = p5.Vector.sub(point, lineStart);
        let projLength = constrain(pointToStart.dot(line), 0, lineLength);
        
        let closestPoint = p5.Vector.add(lineStart, p5.Vector.mult(line, projLength));
        return p5.Vector.dist(point, closestPoint);
    }

    display() {
        push();
        translate(this.pos.x, this.pos.y);
        
        // Show slowdown effect
        if (this.slowedBy.size > 0 && !this.caught) {
            stroke(255, 255, 0, 100);
            strokeWeight(1);
            noFill();
            ellipse(0, 0, 20);
        }
        
        if (gamePhase === 'NIGHT') {
            noStroke();
            fill(255, 255, 150, this.glowIntensity * 0.3);
            ellipse(0, 0, 30);
            fill(255, 255, 100, this.glowIntensity * 0.5);
            ellipse(0, 0, 20);
        }
        
        fill(30);
        stroke(0);
        strokeWeight(0.5);
        ellipse(0, 0, this.radius * 2);
        
        if (!this.stuck) {
            this.wingPhase += 0.5;
            // Wing animation slows down when slowed
            let wingSpeed = this.slowedBy.size > 0 ? 0.25 : 0.5;
            this.wingPhase += wingSpeed;
            let wingSpread = sin(this.wingPhase) * 5;
            
            fill(255, 255, 255, 150);
            noStroke();
            ellipse(-wingSpread, 0, 6, 4);
            ellipse(wingSpread, 0, 6, 4);
        }
        
        if (gamePhase === 'NIGHT') {
            fill(255, 255, 100, this.glowIntensity);
            noStroke();
            ellipse(0, 2, 3);
        }
        
        pop();
    }
}

class Obstacle {
    constructor(x, y, radius, type) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.type = type || (random() < 0.5 ? 'branch' : 'leaf');
        this.rotation = random(TWO_PI);
        this.leafPoints = [];
        
        if (this.type === 'leaf') {
            let numPoints = 8;
            for (let i = 0; i < numPoints; i++) {
                let angle = (TWO_PI / numPoints) * i;
                let r = radius * random(0.7, 1.2);
                if (i === 0 || i === numPoints/2) r = radius * 1.3;
                this.leafPoints.push({angle: angle, radius: r});
            }
        }
    }

    display() {
        push();
        translate(this.x, this.y);
        rotate(this.rotation);
        
        if (this.type === 'branch') {
            if (gamePhase === 'NIGHT') {
                stroke(40, 20, 0);
                fill(50, 25, 5);
            } else {
                stroke(101, 67, 33);
                fill(139, 90, 43);
            }
            strokeWeight(3);
            
            push();
            strokeWeight(this.radius / 3);
            line(-this.radius, 0, this.radius, 0);
            
            strokeWeight(2);
            line(-this.radius/2, 0, -this.radius/2 - 10, -10);
            line(this.radius/3, 0, this.radius/3 + 8, -8);
            line(0, 0, 5, -15);
            
            stroke(80, 50, 20, 100);
            strokeWeight(1);
            for (let i = -this.radius; i < this.radius; i += 5) {
                line(i, -2, i + 2, 2);
            }
            pop();
            
            noStroke();
            fill(255, 255, 255, 30);
            ellipse(0, 0, this.radius * 2);
            
        } else if (this.type === 'leaf') {
            if (gamePhase === 'NIGHT') {
                fill(20, 40, 20);
                stroke(10, 20, 10);
            } else {
                fill(34, 139, 34);
                stroke(25, 100, 25);
            }
            strokeWeight(2);
            
            beginShape();
            for (let point of this.leafPoints) {
                let x = cos(point.angle) * point.radius;
                let y = sin(point.angle) * point.radius;
                curveVertex(x, y);
            }
            let firstPoint = this.leafPoints[0];
            curveVertex(cos(firstPoint.angle) * firstPoint.radius, 
                       sin(firstPoint.angle) * firstPoint.radius);
            let secondPoint = this.leafPoints[1];
            curveVertex(cos(secondPoint.angle) * secondPoint.radius, 
                       sin(secondPoint.angle) * secondPoint.radius);
            endShape();
            
            stroke(25, 100, 25, 100);
            strokeWeight(1);
            line(0, -this.radius, 0, this.radius);
            line(0, 0, -this.radius/2, -this.radius/2);
            line(0, 0, this.radius/2, -this.radius/2);
            line(0, 0, -this.radius/2, this.radius/2);
            line(0, 0, this.radius/2, this.radius/2);
        }
        
        pop();
    }
}

class FoodBox {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.radius = 10;
        this.collected = false;
        this.floatOffset = random(TWO_PI);
        this.silkValue = random(20, 35);
        this.glowPhase = random(TWO_PI);
    }
    
    collect() {
        webSilk = min(webSilk + this.silkValue, maxWebSilk);
        
        for (let i = 0; i < 8; i++) {
            particles.push(new Particle(this.pos.x, this.pos.y));
        }
    }
    
    display() {
        push();
        let floatY = sin(frameCount * 0.05 + this.floatOffset) * 3;
        translate(this.pos.x, this.pos.y + floatY);
        
        let glowIntensity = 100 + sin(frameCount * 0.1 + this.glowPhase) * 50;
        noStroke();
        fill(255, 200, 100, glowIntensity * 0.3);
        ellipse(0, 0, 40);
        fill(255, 220, 150, glowIntensity * 0.5);
        ellipse(0, 0, 25);
        
        rectMode(CENTER);
        
        fill(0, 0, 0, 50);
        rect(2, 2, this.radius * 2, this.radius * 1.8, 3);
        
        fill(139, 69, 19);
        stroke(100, 50, 0);
        strokeWeight(1);
        rect(0, 0, this.radius * 2, this.radius * 1.8, 3);
        
        stroke(100, 50, 0);
        strokeWeight(1);
        line(-this.radius, 0, this.radius, 0);
        line(0, -this.radius * 0.9, 0, this.radius * 0.9);
        
        noStroke();
        fill(255, 200, 100);
        ellipse(-5, -4, 4);
        ellipse(5, -4, 3);
        ellipse(-4, 5, 3);
        ellipse(4, 4, 4);
        
        pop();
    }
}

class Particle {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = createVector(random(-3, 3), random(-5, -2));
        this.lifetime = 255;
        this.color = color(255, random(200, 255), random(100, 200));
        this.size = 6;  // Default size
    }
    
    update() {
        this.vel.y += 0.2;
        this.pos.add(this.vel);
        this.lifetime -= 8;
    }
    
    display() {
        push();
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), this.lifetime);
        ellipse(this.pos.x, this.pos.y, this.size);
        pop();
    }
    
    isDead() {
        return this.lifetime <= 0;
    }
}