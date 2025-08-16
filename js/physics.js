// physics.js - Web physics and strand management

class WebStrand {
    constructor(start, end) {
        this.start = start;
        this.end = end;
        this.strength = 1;
        this.vibration = 0;
        this.path = [];
    }

    update() {
        this.vibration *= 0.95;
        
        for (let node of webNodes) {
            if (dist(node.x, node.y, this.start.x, this.start.y) < 5 ||
                dist(node.x, node.y, this.end.x, this.end.y) < 5) {
                node.applyForce(0, 0.1);
            }
        }
    }

    display() {
        push();
        
        if (gamePhase === 'NIGHT') {
            stroke(255, 255, 255, 250);
            strokeWeight(2);
        } else {
            stroke(255, 255, 255, 200);
            strokeWeight(1.5);
        }
        
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