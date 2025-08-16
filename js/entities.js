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
        direction.normalize();
        direction.mult(this.jumpPower);
        
        this.vel = direction;
        this.isAirborne = true;
        this.canJump = false;
        this.lastAnchorPoint = this.pos.copy();
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
            this.vel.y *= -0.5;
        }
        
        // Check home branch collision (one-way platform)
        if (window.homeBranch && this.vel.y > 0) { // Only when falling
            let branch = window.homeBranch;
            // Collision should be right at the visual surface
            let branchTop = branch.y - 5; // Much closer to actual visual surface
            
            // Check if spider is within branch X range
            let inXRange = false;
            if (branch.side === 'left') {
                inXRange = this.pos.x >= 0 && this.pos.x <= branch.endX + 20;
            } else {
                inXRange = this.pos.x >= branch.endX - 20 && this.pos.x <= width;
            }
            
            // One-way collision: only collide when falling from above
            if (inXRange && 
                this.pos.y - this.radius <= branchTop && 
                this.pos.y + this.radius >= branchTop &&
                this.pos.y - this.radius < branchTop) {
                this.pos.y = branchTop - this.radius;
                this.land();
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
        this.webTouchCount = 0;
        this.requiredStrands = 3;
        this.touchedStrands = new Set();
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
        
        this.vel.add(this.acc);
        this.vel.limit(3);
        this.pos.add(this.vel);
        this.acc.mult(0);
        
        if (this.pos.x < -30) this.pos.x = width + 30;
        if (this.pos.x > width + 30) this.pos.x = -30;
        if (this.pos.y < -30) this.pos.y = height + 30;
        if (this.pos.y > height + 30) this.pos.y = -30;
        
        this.touchedStrands.clear();
        for (let strand of webStrands) {
            let d = this.pointToLineDistance(this.pos, strand.start, strand.end);
            if (d < this.radius + 3) {
                this.touchedStrands.add(strand);
            }
        }
        
        if (this.touchedStrands.size >= this.requiredStrands) {
            this.caught = true;
            for (let strand of this.touchedStrands) {
                strand.vibrate(5);
            }
            for (let strand of webStrands) {
                if (!this.touchedStrands.has(strand)) {
                    for (let touched of this.touchedStrands) {
                        let d1 = dist(strand.start.x, strand.start.y, touched.start.x, touched.start.y);
                        let d2 = dist(strand.start.x, strand.start.y, touched.end.x, touched.end.y);
                        let d3 = dist(strand.end.x, strand.end.y, touched.start.x, touched.start.y);
                        let d4 = dist(strand.end.x, strand.end.y, touched.end.x, touched.end.y);
                        if (min(d1, d2, d3, d4) < 50) {
                            strand.vibrate(2);
                            break;
                        }
                    }
                }
            }
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
        
        if (this.touchedStrands.size > 0 && !this.caught) {
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
        ellipse(this.pos.x, this.pos.y, 6);
        pop();
    }
    
    isDead() {
        return this.lifetime <= 0;
    }
}