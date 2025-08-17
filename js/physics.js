// physics.js - Web physics and strand management

class WebStrand {
    constructor(start, end) {
        this.start = start;
        this.end = end;
        this.strength = 1;
        this.vibration = 0;
        this.path = [];
        this.segments = []; // For physics simulation
        this.maxLength = 260; // Maximum strand length before it breaks (increased by 30%)
        this.tension = 0;
        this.broken = false;
        this.recoil = 0; // Recoil amplitude for spring physics
        this.recoilVelocity = 0; // Velocity of recoil oscillation
        this.damping = 0.75; // Damping factor for recoil (much faster damping to prevent accumulation)
        this.springConstant = 0.04; // Spring stiffness (much softer spring)
        this.flexibility = 1.0; // How much the web can be dragged by flies
    }

    update() {
        this.vibration *= 0.95;
        
        // Update recoil physics (spring oscillation)
        if (abs(this.recoil) > 0.01 || abs(this.recoilVelocity) > 0.01) {
            // Apply spring force (Hooke's law)
            let springForce = -this.springConstant * this.recoil;
            this.recoilVelocity += springForce;
            
            // Apply damping
            this.recoilVelocity *= this.damping;
            
            // Update recoil position
            this.recoil += this.recoilVelocity;
            
            // Clamp small values to stop oscillation
            if (abs(this.recoil) < 0.01 && abs(this.recoilVelocity) < 0.01) {
                this.recoil = 0;
                this.recoilVelocity = 0;
            }
        }
        
        // Calculate strand length and tension
        if (this.end) {
            let length = dist(this.start.x, this.start.y, this.end.x, this.end.y);
            this.tension = length / this.maxLength;
            
            // Calculate flexibility factor (longer, less taut webs are more flexible)
            this.flexibility = map(this.tension, 0.2, 1.0, 1.5, 0.3); // More flexible when less taut
            this.flexibility = constrain(this.flexibility, 0.3, 1.5);
            
            // Break if overstretched or unsupported arc
            if (this.tension > 1.5 || this.checkUnsupportedArc()) {
                this.broken = true;
            }
        }
        
        // Apply gravity to path points for realistic sagging, with wind and smoothing
        if (this.path && this.path.length > 2 && !this.broken) {
            // low-frequency wind using Perlin noise (stable over time)
            let windX = (noise(frameCount * 0.005, 12.3) - 0.5) * 0.6;
            let windY = (noise(frameCount * 0.005, 91.7) - 0.5) * 0.4;

            for (let i = 1; i < this.path.length - 1; i++) {
                let point = this.path[i];

                // Check if supported by an obstacle
                let supported = false;
                for (let obstacle of obstacles) {
                    if (dist(point.x, point.y, obstacle.x, obstacle.y) < obstacle.radius + 5) {
                        supported = true;
                        break;
                    }
                }

                if (!supported) {
                    // gravity (slightly softer) and wind drift
                    point.y += 0.22;
                    point.x += windX * (0.6 + i / this.path.length * 0.8);
                    point.y += windY * 0.4;
                    
                    // Apply recoil to path points (very subtle)
                    point.y += this.recoil * (1 + sin(i * 0.3) * 0.5);
                }
            }

            // Laplacian smoothing to create flowing catenary-like curves
            for (let iter = 0; iter < 2; iter++) {
                for (let i = 1; i < this.path.length - 1; i++) {
                    let prev = this.path[i - 1];
                    let curr = this.path[i];
                    let next = this.path[i + 1];
                    curr.x = lerp(curr.x, (prev.x + next.x) * 0.5, 0.18);
                    curr.y = lerp(curr.y, (prev.y + next.y) * 0.5, 0.18);
                }
            }
        }
        
        for (let node of webNodes) {
            const nearStart = dist(node.x, node.y, this.start.x, this.start.y) < 5;
            const nearEnd = this.end ? (dist(node.x, node.y, this.end.x, this.end.y) < 5) : false;
            if (nearStart || nearEnd) {
                node.applyForce(0, 0.1);
            }
        }
    }
    
    checkUnsupportedArc() {
        if (!this.path || this.path.length < 3) return false;
        
        // Check if the web forms an unsupported arc (both ends lower than middle)
        let startY = this.start.y;
        let endY = this.end ? this.end.y : this.path[this.path.length - 1].y;
        let lowestPoint = startY;
        let highestPoint = startY;
        
        for (let point of this.path) {
            if (point.y > lowestPoint) lowestPoint = point.y;
            if (point.y < highestPoint) highestPoint = point.y;
        }
        
        // If the arc goes up significantly and both ends are near bottom, it's unsupported
        let arcHeight = lowestPoint - highestPoint;
        let bothEndsLow = startY > height - 200 && endY > height - 200;
        let significantArc = arcHeight > 100;
        
        // Check if there's any support in the middle
        let hasMiddleSupport = false;
        for (let i = Math.floor(this.path.length * 0.3); i < Math.floor(this.path.length * 0.7); i++) {
            let point = this.path[i];
            for (let obstacle of obstacles) {
                if (dist(point.x, point.y, obstacle.x, obstacle.y) < obstacle.radius + 10) {
                    hasMiddleSupport = true;
                    break;
                }
            }
            if (hasMiddleSupport) break;
        }
        
        return bothEndsLow && significantArc && !hasMiddleSupport;
    }

    display() {
        if (this.broken) return; // Don't display broken strands

        push();

        // If the strand's end hasn't been established yet (e.g., just started deploying on touch),
        // skip physics rendering here. The in-progress strand is drawn from game.js.
        if (!this.end) {
            pop();
            return;
        }

        // Change color based on tension
        if (this.tension > 0.8) {
            stroke(255, 200, 200, 200); // Reddish when strained
        } else if (gamePhase === 'NIGHT') {
            stroke(255, 255, 255, 250);
        } else {
            stroke(255, 255, 255, 200);
        }

        strokeWeight(gamePhase === 'NIGHT' ? 2 : 1.5);
        noFill();

        if (this.path && this.path.length > 2) {
            beginShape();
            curveVertex(this.path[0].x, this.path[0].y + this.vibration * sin(frameCount * 0.3));

            for (let i = 0; i < this.path.length; i++) {
                let point = this.path[i];
                let vibOffset = this.vibration * sin(frameCount * 0.3 + i * 0.1) * (i / this.path.length);
                curveVertex(point.x, point.y + vibOffset);
            }

            let lastPoint = this.path[this.path.length - 1];
            curveVertex(lastPoint.x, lastPoint.y + this.vibration * sin(frameCount * 0.3));
            endShape();

            stroke(255, 255, 255, 50);
            strokeWeight(4);
            beginShape();
            curveVertex(this.path[0].x, this.path[0].y);
            for (let point of this.path) {
                curveVertex(point.x, point.y);
            }
            curveVertex(lastPoint.x, lastPoint.y);
            endShape();
        } else {
            let midX = (this.start.x + this.end.x) / 2;
            let midY = (this.start.y + this.end.y) / 2 + this.vibration * sin(frameCount * 0.3);

            // Add sag based on horizontal distance
            let horizontalDist = abs(this.end.x - this.start.x);
            let sag = horizontalDist * 0.12;
            midY += sag * (1 - cos(PI * 0.5));

            // Apply recoil deformation to the web (very subtle)
            midY += this.recoil * 2; // Further reduced from 3

            beginShape();
            curveVertex(this.start.x, this.start.y);
            curveVertex(this.start.x, this.start.y);
            curveVertex(midX, midY);
            curveVertex(this.end.x, this.end.y);
            curveVertex(this.end.x, this.end.y);
            endShape();

            stroke(255, 255, 255, 50);
            strokeWeight(4);
            beginShape();
            curveVertex(this.start.x, this.start.y);
            curveVertex(this.start.x, this.start.y);
            curveVertex(midX, midY);
            curveVertex(this.end.x, this.end.y);
            curveVertex(this.end.x, this.end.y);
            endShape();
        }

        pop();
    }

    vibrate(amount) {
        this.vibration = min(this.vibration + amount, 10);
    }
    
    // Apply recoil force when spider interacts with the web
    applyRecoil(force) {
        // Newton's third law - the web recoils opposite to the applied force
        this.recoilVelocity += force;
        
        // Also trigger vibration for visual feedback (scaled down)
        this.vibrate(abs(force) * 1);
        
        // Add some energy dissipation through the web network (more subtle)
        for (let node of webNodes) {
            const d1 = dist(node.x, node.y, this.start.x, this.start.y);
            const d2 = this.end ? dist(node.x, node.y, this.end.x, this.end.y) : Infinity;
            const minDist = Math.min(d1, d2);
            if (minDist < 100) {
                const forceFalloff = map(minDist, 0, 100, 0.3, 0);
                node.applyForce(0, force * forceFalloff * 0.15);
            }
        }
    }
}


class WebNode {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.pinned = false;
    }

    applyForce(fx, fy) {
        if (!this.pinned) {
            this.vx += fx;
            this.vy += fy;
        }
    }

    update() {
        if (!this.pinned) {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.98;
            this.vy *= 0.98;
        }
    }
}

// Helper function to spawn food boxes
function spawnFoodBox() {
    let x, y;
    let attempts = 0;
    let valid = false;
    
    while (!valid && attempts < 50) {
        x = random(50, width - 50);
        y = random(50, height - 100);
        valid = true;
        
        for (let obstacle of obstacles) {
            if (dist(x, y, obstacle.x, obstacle.y) < obstacle.radius + 30) {
                valid = false;
                break;
            }
        }
        
        for (let box of foodBoxes) {
            if (dist(x, y, box.pos.x, box.pos.y) < 50) {
                valid = false;
                break;
            }
        }
        
        attempts++;
    }
    
    if (valid) {
        foodBoxes.push(new FoodBox(x, y));
    }
}