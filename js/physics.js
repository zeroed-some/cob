// physics.js - Web physics and strand management

class WebStrand {
    constructor(start, end) {
        this.start = start;
        this.end = end;
        this.strength = 1;
        this.vibration = 0;
        this.path = [];
        this.segments = []; // For physics simulation
        this.maxLength = 200; // Maximum strand length before it breaks
        this.tension = 0;
        this.broken = false;
    }

    update() {
        this.vibration *= 0.95;
        
        // Calculate strand length and tension
        if (this.end) {
            let length = dist(this.start.x, this.start.y, this.end.x, this.end.y);
            this.tension = length / this.maxLength;
            
            // Break if overstretched or unsupported arc
            if (this.tension > 1.5 || this.checkUnsupportedArc()) {
                this.broken = true;
            }
        }
        
        // Apply gravity to path points for realistic sagging
        if (this.path && this.path.length > 2 && !this.broken) {
            for (let i = 1; i < this.path.length - 1; i++) {
                // Don't move the anchor points
                let point = this.path[i];
                
                // Check if this point is supported by anything
                let supported = false;
                for (let obstacle of obstacles) {
                    if (dist(point.x, point.y, obstacle.x, obstacle.y) < obstacle.radius + 5) {
                        supported = true;
                        break;
                    }
                }
                
                // Apply gravity if not supported
                if (!supported) {
                    point.y += 0.3; // Gravity effect
                    
                    // Add slight pendulum motion
                    point.x += sin(frameCount * 0.02 + i) * 0.1;
                }
            }
        }
        
        for (let node of webNodes) {
            if (dist(node.x, node.y, this.start.x, this.start.y) < 5 ||
                dist(node.x, node.y, this.end.x, this.end.y) < 5) {
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
            let sag = horizontalDist * 0.1; // More sag for longer horizontal spans
            midY += sag;
            
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