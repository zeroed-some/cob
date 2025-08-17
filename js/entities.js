// entities.js - All game entity classes

class Spider {
  constructor (x, y) {
    this.pos = createVector(x, y)
    this.vel = createVector(0, 0)
    this.acc = createVector(0, 0)
    this.radius = 8
    this.isAirborne = false
    this.canJump = true
    this.lastAnchorPoint = null
    this.gravity = createVector(0, 0.3)
    this.jumpPower = 12
    this.maxSpeed = 15
    this.munchRadius = 20
    this.munchCooldown = 0
    this.attachedObstacle = null // Track which obstacle spider is on
  }

  jump (targetX, targetY, chargeMultiplier = 1) {
    if (!this.canJump || this.isAirborne) return

    // DAWN PHASE: Check and consume stamina
    if (gamePhase === 'DAWN') {
      if (jumpStamina < jumpCost) {
        isExhausted = true
        return
      }
      jumpStamina -= jumpCost
      stats.totalJumps++
      // Delay stamina regen after each jump during DAWN
      if (gamePhase === 'DAWN') {
        staminaRegenCooldown = 60 // 1s at 60fps
      }
    }

    // PHASE 4B: Track wind jumps
    if (windActive) {
      stats.windJumps++
      achievements.windRider.progress++
    }

    let direction = createVector(targetX - this.pos.x, targetY - this.pos.y)
    let clickDistance = direction.mag()
    direction.normalize()

    // Apply charge multiplier if provided
    let actualJumpPower = map(
      clickDistance,
      0,
      200,
      3,
      this.jumpPower * chargeMultiplier
    )
    actualJumpPower = constrain(
      actualJumpPower,
      3,
      this.jumpPower * chargeMultiplier
    )
    direction.mult(actualJumpPower)

    this.vel = direction
    this.isAirborne = true
    this.canJump = false

    // FIX: Ensure lastAnchorPoint is set to edge, not center
    if (!this.lastAnchorPoint) {
      // If no anchor point set yet, use current position
      this.lastAnchorPoint = this.pos.copy()
    }
    // Record jump time for touch debounce
    if (typeof window !== 'undefined') {
      window.lastJumpTime = millis()
    }

    // Check if we're jumping off a web strand
    for (let strand of webStrands) {
      if (strand === currentStrand) continue

      if (this.checkStrandCollision(strand)) {
        // Much simpler shimmy detection based on actual jump power used
        let isShimmy = actualJumpPower < 6 // If we used less than half power, it's a shimmy

        // Apply appropriate recoil based on movement type
        if (isShimmy) {
          // Trigger shimmy visual effect
          this.shimmyEffect = 20

          // NO recoil at all for shimmying - just tiny vibration
          strand.vibrate(0.3)

          // Tiny yellow particles
          let p = new Particle(this.pos.x, this.pos.y)
          p.color = color(255, 255, 100, 80)
          p.vel = createVector(random(-0.3, 0.3), random(-0.3, 0.3))
          p.size = 2
          particles.push(p)
        } else {
          // Scale recoil based on actual jump power
          let recoilForce = -(actualJumpPower / this.jumpPower) * 0.08 // Scale by power ratio
          strand.applyRecoil(recoilForce)

          // Create particles only for real jumps
          for (let i = 0; i < 2; i++) {
            let p = new Particle(this.pos.x, this.pos.y)
            p.color = color(255, 255, 255, 120)
            p.vel = createVector(random(-0.8, 0.8), random(1, 2))
            p.size = 3
            particles.push(p)
          }
        }

        break
      }
    }
  }

  munch () {
    if (this.munchCooldown > 0) return

    isMunching = true
    this.munchCooldown = 30

    for (let i = flies.length - 1; i >= 0; i--) {
      let fly = flies[i]
      let d = dist(this.pos.x, this.pos.y, fly.pos.x, fly.pos.y)
      if (d < this.munchRadius) {
        fliesMunched++
        webSilk = min(webSilk + 15, maxWebSilk)

        for (let j = 0; j < 12; j++) {
          let p = new Particle(fly.pos.x, fly.pos.y)
          p.color = color(255, random(100, 255), 0)
          particles.push(p)
        }

        flies.splice(i, 1)
        break
      }
    }
  }

  update () {
    // If attached to a moving obstacle, move with it
    if (this.attachedObstacle && !this.isAirborne) {
      // Calculate angle from obstacle center to spider
      let angle = atan2(
        this.pos.y - this.attachedObstacle.y,
        this.pos.x - this.attachedObstacle.x
      )
      // Keep spider on the surface of the obstacle
      this.pos.x =
        this.attachedObstacle.x +
        cos(angle) * (this.attachedObstacle.radius + this.radius)
      this.pos.y =
        this.attachedObstacle.y +
        sin(angle) * (this.attachedObstacle.radius + this.radius)
    }

    if (this.isAirborne) {
      this.acc.add(this.gravity)
      this.attachedObstacle = null // Clear attachment when jumping
    }

    this.vel.add(this.acc)
    this.vel.limit(this.maxSpeed)
    this.pos.add(this.vel)
    this.acc.mult(0)

    if (this.munchCooldown > 0) {
      this.munchCooldown--
      if (this.munchCooldown === 0) {
        isMunching = false
      }
    }

    // Check ground collision
    if (this.pos.y >= height - this.radius) {
      this.pos.y = height - this.radius
      this.land()
      this.attachedObstacle = null
    }

    // Check wall collisions
    if (this.pos.x <= this.radius || this.pos.x >= width - this.radius) {
      this.pos.x = constrain(this.pos.x, this.radius, width - this.radius)
      this.vel.x *= -0.5
    }

    // Check ceiling
    if (this.pos.y <= this.radius) {
      this.pos.y = this.radius
      this.vel.y *= -0.5 // Bounce off ceiling, don't land
    }

    // Check home branch collision (one-way platform)
    if (window.homeBranch && this.isAirborne && this.vel.y > 0.1) {
      // Only when actually falling
      let branch = window.homeBranch

      // Check if spider is within branch X range
      let branchStart = Math.min(branch.startX, branch.endX)
      let branchEnd = Math.max(branch.startX, branch.endX)

      // Since the branch angle is very small (0.05 radians ≈ 3 degrees),
      // we can use a simpler approximation
      if (this.pos.x >= branchStart - 10 && this.pos.x <= branchEnd + 10) {
        // Calculate position along branch (0 to 1)
        let t = (this.pos.x - branchStart) / (branchEnd - branchStart)
        t = constrain(t, 0, 1)

        // Branch visual thickness tapers from full at start to 35% at end
        // This matches exactly how it's drawn in the bezier curves
        let branchTopThickness = lerp(
          branch.thickness * 0.9,
          branch.thickness * 0.35,
          t
        )

        // The branch is drawn centered at branch.y
        // With small angle approximation: the top of the branch is at
        let branchSurfaceY = branch.y - branchTopThickness

        // Add slight angle correction (for small angles, tan ≈ sin ≈ angle in radians)
        let angleCorrection = (this.pos.x - branchStart) * branch.angle
        branchSurfaceY += angleCorrection

        // Check if spider is crossing the branch from above
        let prevY = this.pos.y - this.vel.y

        if (
          prevY <= branchSurfaceY && // Was above
          this.pos.y + this.radius >= branchSurfaceY && // Now at or below
          this.pos.y < branch.y + branch.thickness
        ) {
          // Not too far below

          // Place spider on the branch surface
          this.pos.y = branchSurfaceY - this.radius
          this.land()
          this.attachedObstacle = null
        }
      }
    }

    // Check obstacle collisions
    for (let obstacle of obstacles) {
      if (this.checkObstacleCollision(obstacle)) {
        this.landOnObstacle(obstacle)
      }
    }

    // Check web strand collisions
    for (let strand of webStrands) {
      if (strand === currentStrand) continue

      if (this.isAirborne && this.checkStrandCollision(strand)) {
        this.landOnStrand(strand)
      }
    }

    // Check food box collisions
    for (let i = foodBoxes.length - 1; i >= 0; i--) {
      let box = foodBoxes[i]
      if (
        dist(this.pos.x, this.pos.y, box.pos.x, box.pos.y) <
        this.radius + box.radius
      ) {
        box.collect()
        foodBoxes.splice(i, 1)
      }
    }
  }

  checkObstacleCollision (obstacle) {
    let d = dist(this.pos.x, this.pos.y, obstacle.x, obstacle.y)
    return d < this.radius + obstacle.radius
  }

  checkStrandCollision (strand) {
    if (!strand || !strand.start || !strand.end) return false
    let d = this.pointToLineDistance(this.pos, strand.start, strand.end)
    return d < this.radius + 2
  }

  pointToLineDistance (point, lineStart, lineEnd) {
    // Guard nulls
    if (!lineStart || !lineEnd) {
      return Infinity
    }
    let line = p5.Vector.sub(lineEnd, lineStart)
    let lineLength = line.mag()
    // If start and end coincide, distance is to the single point
    if (lineLength === 0) {
      return p5.Vector.dist(point, lineStart)
    }
    line.normalize()
    let pointToStart = p5.Vector.sub(point, lineStart)
    let projLength = constrain(pointToStart.dot(line), 0, lineLength)
    let closestPoint = p5.Vector.add(
      lineStart,
      p5.Vector.mult(line, projLength)
    )
    return p5.Vector.dist(point, closestPoint)
  }

  landOnObstacle (obstacle) {
    // Only land if we're actually airborne
    if (!this.isAirborne) return

    // Calculate angle from obstacle center to spider
    let angle = atan2(this.pos.y - obstacle.y, this.pos.x - obstacle.x)

    // Place spider on the edge of the circular collision boundary
    this.pos.x = obstacle.x + cos(angle) * (obstacle.radius + this.radius)
    this.pos.y = obstacle.y + sin(angle) * (obstacle.radius + this.radius)

    // FIX: Set anchor point at the edge, not center
    this.lastAnchorPoint = createVector(
      obstacle.x + cos(angle) * obstacle.radius,
      obstacle.y + sin(angle) * obstacle.radius
    )

    this.attachedObstacle = obstacle
    this.land()
  }

  landOnStrand (strand) {
    // Only land if we're actually airborne
    if (!this.isAirborne) return
    if (!strand || !strand.start || !strand.end) return
    let line = p5.Vector.sub(strand.end, strand.start)
    let lineLength = line.mag()
    if (lineLength === 0) {
      // Degenerate strand; snap to start
      this.pos = strand.start.copy
        ? strand.start.copy()
        : createVector(strand.start.x, strand.start.y)
    } else {
      line.normalize()
      let pointToStart = p5.Vector.sub(this.pos, strand.start)
      let projLength = constrain(pointToStart.dot(line), 0, lineLength)
      let closestPoint = p5.Vector.add(
        strand.start,
        p5.Vector.mult(line, projLength)
      )
      this.pos = closestPoint
    }
    this.attachedObstacle = null // Not on an obstacle
    this.land()
  }

  land () {
    this.vel.mult(0)
    this.isAirborne = false
    this.canJump = true

    // FIX: Check if we're actually landing on something valid
    let landedOnSomething = false
    let landingPoint = null // Store where we're landing for anchor

    // Check if on ground
    if (this.pos.y >= height - this.radius - 5) {
      landedOnSomething = true
      landingPoint = createVector(this.pos.x, height)
    }

    // Check if on an obstacle
    if (!landedOnSomething) {
      for (let obstacle of obstacles) {
        if (this.checkObstacleCollision(obstacle)) {
          landedOnSomething = true
          // Calculate edge point for anchor
          let angle = atan2(this.pos.y - obstacle.y, this.pos.x - obstacle.x)
          landingPoint = createVector(
            obstacle.x + cos(angle) * obstacle.radius,
            obstacle.y + sin(angle) * obstacle.radius
          )
          break
        }
      }
    }

    // Check if on a web strand
    if (!landedOnSomething) {
      for (let strand of webStrands) {
        if (
          strand !== currentStrand &&
          !strand.broken &&
          this.checkStrandCollision(strand)
        ) {
          landedOnSomething = true
          // For web strands, use spider position as anchor
          landingPoint = this.pos.copy()
          break
        }
      }
    }

    // Check if on home branch
    if (!landedOnSomething && window.homeBranch) {
      let branch = window.homeBranch
      let branchStart = Math.min(branch.startX, branch.endX)
      let branchEnd = Math.max(branch.startX, branch.endX)

      if (this.pos.x >= branchStart - 10 && this.pos.x <= branchEnd + 10) {
        let t = (this.pos.x - branchStart) / (branchEnd - branchStart)
        t = constrain(t, 0, 1)
        let branchTopThickness = lerp(
          branch.thickness * 0.9,
          branch.thickness * 0.35,
          t
        )
        let branchSurfaceY = branch.y - branchTopThickness
        let angleCorrection = (this.pos.x - branchStart) * branch.angle
        branchSurfaceY += angleCorrection

        if (abs(this.pos.y - branchSurfaceY) < this.radius + 10) {
          landedOnSomething = true
          landingPoint = createVector(this.pos.x, branchSurfaceY)
        }
      }
    }

    // FIX: If we're deploying web but didn't land on anything valid, destroy the web
    if (currentStrand && isDeployingWeb && (spacePressed || touchHolding)) {
      if (landedOnSomething && landingPoint) {
        // Valid landing - finalize the web at the landing point
        currentStrand.end = landingPoint.copy() // Use edge point, not spider center
        if (!currentStrand.path || currentStrand.path.length === 0) {
          currentStrand.path = [landingPoint.copy()]
        } else {
          currentStrand.path.push(landingPoint.copy())
        }
        webNodes.push(new WebNode(landingPoint.x, landingPoint.y))

        // Update last anchor for next web
        this.lastAnchorPoint = landingPoint.copy()
      } else {
        // Invalid landing in mid-air - destroy the web!
        if (
          webStrands.length > 0 &&
          webStrands[webStrands.length - 1] === currentStrand
        ) {
          webStrands.pop() // Remove the invalid strand

          // Create poof particles
          for (let i = 0; i < 8; i++) {
            let p = new Particle(this.pos.x, this.pos.y)
            p.color = color(255, 255, 255, 150)
            p.vel = createVector(random(-3, 3), random(-3, 3))
            p.size = 4
            particles.push(p)
          }

          // Notification
          if (notifications.length < 3) {
            notifications.push(
              new Notification('Web needs anchor point!', color(255, 150, 150))
            )
          }
        }
      }
    } else if (landedOnSomething && landingPoint) {
      // Update last anchor point even when not deploying web
      this.lastAnchorPoint = landingPoint.copy()
    }

    currentStrand = null
    isDeployingWeb = false
  }

  display () {
    push()
    translate(this.pos.x, this.pos.y)

    if (isMunching && this.munchCooldown > 15) {
      push()
      fill(255, 100, 100, 150)
      noStroke()
      let munchSize = 15 + sin(frameCount * 0.5) * 5
      arc(0, 0, munchSize, munchSize, 0, PI + HALF_PI, PIE)
      pop()
    }

    fill(20)
    stroke(0)
    strokeWeight(1)
    ellipse(0, 0, this.radius * 2)

    fill(40)
    noStroke()
    ellipse(0, -2, this.radius * 1.2, this.radius * 1.5)

    if (gamePhase === 'NIGHT') {
      fill(255, 100, 100)
    } else {
      fill(255, 0, 0)
    }
    ellipse(-3, -3, 3)
    ellipse(3, -3, 3)

    stroke(0)
    strokeWeight(1.5)
    for (let i = 0; i < 4; i++) {
      let angle = PI / 6 + (i * PI) / 8
      line(0, 0, cos(angle) * 12, sin(angle) * 8)
      line(0, 0, -cos(angle) * 12, sin(angle) * 8)
    }

    if (webSilk < 20) {
      fill(255, 100, 100, 150 + sin(frameCount * 0.2) * 50)
      noStroke()
      ellipse(0, -15, 8)
    }

    pop()
  }
}

class Fly {
  constructor () {
    if (random() < 0.5) {
      this.pos = createVector(
        random() < 0.5 ? -20 : width + 20,
        random(50, height - 100)
      )
    } else {
      this.pos = createVector(random(width), random() < 0.5 ? -20 : height + 20)
    }

    this.vel = createVector(random(-2, 2), random(-1, 1))
    this.acc = createVector(0, 0)
    this.radius = 4
    this.caught = false
    this.stuck = false
    this.wingPhase = random(TWO_PI)
    this.wanderAngle = random(TWO_PI)
    this.glowIntensity = random(150, 255)
    this.touchedStrands = new Set()
    this.slowedBy = new Set() // Track which strands are slowing us
    this.baseSpeed = 3
    this.currentSpeed = this.baseSpeed
  }

  update () {
    if (this.stuck) {
      // If stuck, check if we need to move with a drifting web
      this.updatePositionOnWeb()
      return
    }

    if (this.caught) {
      this.vel.mult(0.95)
      if (this.vel.mag() < 0.1) {
        this.stuck = true
        fliesCaught++
        webSilk = min(webSilk + 5, maxWebSilk)
      }
      // While caught but not yet stuck, also follow the web
      this.updatePositionOnWeb()
      return
    }

    this.wanderAngle += random(-0.3, 0.3)
    let wanderForce = createVector(cos(this.wanderAngle), sin(this.wanderAngle))
    wanderForce.mult(0.1)
    this.acc.add(wanderForce)

    // Apply current speed (which may be slowed)
    this.vel.add(this.acc)
    this.vel.limit(this.currentSpeed)
    this.pos.add(this.vel)
    this.acc.mult(0)

    if (this.pos.x < -30) this.pos.x = width + 30
    if (this.pos.x > width + 30) this.pos.x = -30
    if (this.pos.y < -30) this.pos.y = height + 30
    if (this.pos.y > height + 30) this.pos.y = -30

    // Check web collisions
    this.checkWebCollisions()
  }

  updatePositionOnWeb () {
    // Find the web strand(s) this fly is attached to
    for (let strand of webStrands) {
      if (strand.broken) continue

      // Check if fly is on this strand
      let closestPoint = null
      let closestDistance = Infinity

      if (strand.path && strand.path.length > 1) {
        for (let i = 0; i < strand.path.length - 1; i++) {
          let p1 = strand.path[i]
          let p2 = strand.path[i + 1]

          // Find closest point on this segment
          let line = p5.Vector.sub(p2, p1)
          let lineLength = line.mag()
          if (lineLength === 0) continue
          line.normalize()

          let pointToStart = p5.Vector.sub(this.pos, p1)
          let projLength = constrain(pointToStart.dot(line), 0, lineLength)

          let projPoint = p5.Vector.add(p1, p5.Vector.mult(line, projLength))
          let d = p5.Vector.dist(this.pos, projPoint)

          if (d < closestDistance && d < this.radius + 5) {
            closestDistance = d
            closestPoint = projPoint
          }
        }
      }

      // If we found a close point on this strand, stick to it
      if (closestPoint) {
        // Move fly to follow the strand's movement
        this.pos.x = closestPoint.x
        this.pos.y = closestPoint.y

        // Add small vibration when on a moving web
        if (strand.vibration > 0) {
          this.pos.x += random(-1, 1) * strand.vibration * 0.1
          this.pos.y += random(-1, 1) * strand.vibration * 0.1
        }
      }
    }
  }

  checkWebCollisions () {
    let currentlyTouching = new Set()

    for (let strand of webStrands) {
      let touching = false

      // Check collision with strand path
      if (strand.path && strand.path.length > 1) {
        // OPTIMIZATION: Skip every other point for collision detection
        for (let i = 0; i < strand.path.length - 1; i += 2) {
          let p1 = strand.path[i]
          let p2 = strand.path[Math.min(i + 1, strand.path.length - 1)]
          let d = this.pointToLineDistance(this.pos, p1, p2)
          if (d < this.radius + 3) {
            touching = true
            break
          }
        }
      } else if (strand.start && strand.end) {
        // Fallback for strands without path
        let d = this.pointToLineDistance(this.pos, strand.start, strand.end)
        if (d < this.radius + 3) {
          touching = true
        }
      }

      if (touching) {
        currentlyTouching.add(strand)

        // If this is a new strand we're touching
        if (!this.touchedStrands.has(strand)) {
          this.touchedStrands.add(strand)

          // Vibrate the web when first touching
          strand.vibrate(3)

          // First strand slows us down
          if (this.touchedStrands.size === 1) {
            this.currentSpeed = this.baseSpeed * 0.4 // Slow to 40% speed
            this.slowedBy.add(strand)

            // Visual feedback - yellow particles for slowing
            // LIMIT PARTICLES TO PREVENT FREEZE
            let particleCount = Math.min(3, 100 - particles.length)
            for (let j = 0; j < particleCount; j++) {
              let p = new Particle(this.pos.x, this.pos.y)
              p.color = color(255, 255, 0, 150)
              p.vel = createVector(random(-1, 1), random(-1, 1))
              p.size = 3
              particles.push(p)
            }
          }
          // Second strand catches us
          else if (this.touchedStrands.size >= 2 && !this.caught) {
            this.caught = true
            this.currentSpeed = 0

            // Stronger vibration when caught
            strand.vibrate(8)

            // FIX: OPTIMIZE NEARBY STRAND VIBRATION
            // This is likely the main cause of the freeze - checking distances between all strands
            // Use a more efficient method
            propagateVibration(strand, 2)

            // Create caught particles - LIMIT TO PREVENT FREEZE
            let particleCount = Math.min(6, 100 - particles.length)
            for (let j = 0; j < particleCount; j++) {
              let p = new Particle(this.pos.x, this.pos.y)
              p.color = color(255, 200, 0, 200)
              p.vel = createVector(random(-2, 2), random(-2, 2))
              particles.push(p)
            }
          }
        }
      }
    }

    // If we're no longer touching strands we were slowed by, speed back up
    if (this.slowedBy.size > 0 && currentlyTouching.size === 0) {
      this.currentSpeed = this.baseSpeed
      this.slowedBy.clear()
    }
  }

  pointToLineDistance (point, lineStart, lineEnd) {
    // Add null checks
    if (!point || !lineStart || !lineEnd) return Infinity

    let dx = lineEnd.x - lineStart.x
    let dy = lineEnd.y - lineStart.y
    let lineLength = sqrt(dx * dx + dy * dy)

    // If line has no length, return distance to point
    if (lineLength < 0.01) {
      return dist(point.x, point.y, lineStart.x, lineStart.y)
    }

    // Use optimized calculation without creating new vectors
    let t =
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
      (lineLength * lineLength)
    t = constrain(t, 0, 1)

    let closestX = lineStart.x + t * dx
    let closestY = lineStart.y + t * dy

    return dist(point.x, point.y, closestX, closestY)
  }

  display () {
    push()
    translate(this.pos.x, this.pos.y)

    // Show slowdown effect
    if (this.slowedBy.size > 0 && !this.caught) {
      stroke(255, 255, 0, 100)
      strokeWeight(1)
      noFill()
      ellipse(0, 0, 20)
    }

    if (gamePhase === 'NIGHT') {
      noStroke()
      fill(255, 255, 150, this.glowIntensity * 0.3)
      ellipse(0, 0, 30)
      fill(255, 255, 100, this.glowIntensity * 0.5)
      ellipse(0, 0, 20)
    }

    fill(30)
    stroke(0)
    strokeWeight(0.5)
    ellipse(0, 0, this.radius * 2)

    if (!this.stuck) {
      // Wing animation slows down when slowed
      let wingSpeed = this.slowedBy.size > 0 ? 0.25 : 0.5
      this.wingPhase += wingSpeed
      let wingSpread = sin(this.wingPhase) * 5

      fill(255, 255, 255, 150)
      noStroke()
      ellipse(-wingSpread, 0, 6, 4)
      ellipse(wingSpread, 0, 6, 4)
    }

    if (gamePhase === 'NIGHT') {
      fill(255, 255, 100, this.glowIntensity)
      noStroke()
      ellipse(0, 2, 3)
    }

    pop()
  }
}

class Obstacle {
  constructor (x, y, radius, type) {
    // Store original position for drift tracking
    this.originalX = x
    this.originalY = y
    this.x = x
    this.y = y
    this.radius = radius
    this.type = type || 'leaf'
    this.rotation = random(TWO_PI)
    this.leafPoints = []

    // Movement properties for all types
    this.bobOffset = random(TWO_PI)
    this.bobSpeed = random(0.02, 0.04)
    this.bobAmount = 0

    // Type-specific initialization
    if (this.type === 'balloon') {
      this.bobAmount = 8 // Balloons bob more
      this.balloonColors = [
        color(255, 100, 100), // Red
        color(100, 200, 255), // Blue
        color(255, 200, 100) // Yellow
      ]
      this.balloonColor = random(this.balloonColors)
      // Remove complex properties - we don't need them for simple balloon
    } else if (this.type === 'beetle') {
      this.bobAmount = 4
      this.driftSpeed = random(0.15, 0.35)
      this.driftAngle = random(TWO_PI)
      this.driftChangeRate = random(0.005, 0.015)
      this.wingPhase = random(TWO_PI)
      this.beetleColor =
        random() < 0.5
          ? color(20, 60, 20) // Dark green
          : color(40, 20, 60) // Purple
      this.driftDistance = 0 // Track total drift
    } else if (this.type === 'leaf') {
      this.bobAmount = 2 // Leaves bob slightly
      let numPoints = 8
      for (let i = 0; i < numPoints; i++) {
        let angle = (TWO_PI / numPoints) * i
        let r = radius * random(0.7, 1.2)
        if (i === 0 || i === numPoints / 2) r = radius * 1.3
        this.leafPoints.push({ angle: angle, radius: r })
      }
    }
  }

  update () {
    // Bobbing motion for all types
    let bob = sin(frameCount * this.bobSpeed + this.bobOffset) * this.bobAmount
    this.y = this.originalY + bob

    // Beetle-specific drift
    if (this.type === 'beetle') {
      // Store initial position if not set
      if (!this.initialX) {
        this.initialX = this.x
        this.initialY = this.y
      }

      // Slowly change drift direction using Perlin noise
      this.driftAngle +=
        (noise(frameCount * this.driftChangeRate, this.originalX * 0.01) -
          0.5) *
        0.1

      // Apply drift to original position
      this.originalX += cos(this.driftAngle) * this.driftSpeed
      this.originalY += sin(this.driftAngle) * this.driftSpeed * 0.5

      // Calculate total drift distance from initial position
      this.driftDistance = dist(
        this.originalX,
        this.originalY,
        this.initialX,
        this.initialY
      )

      // Keep beetles on screen with soft boundaries
      if (this.originalX < 80) {
        this.driftAngle = random(-PI / 4, PI / 4)
        this.originalX = 80
      }
      if (this.originalX > width - 80) {
        this.driftAngle = random((3 * PI) / 4, (5 * PI) / 4)
        this.originalX = width - 80
      }
      if (this.originalY < 80) {
        this.driftAngle = random((-3 * PI) / 4, -PI / 4)
        this.originalY = 80
      }
      if (this.originalY > height - 150) {
        this.driftAngle = random(PI / 4, (3 * PI) / 4)
        this.originalY = height - 150
      }

      // Update actual position (with bob already applied to y)
      this.x = this.originalX

      // Check if beetle has drifted too far and break attached strands
      if (this.driftDistance > 100) {
        this.breakAttachedStrands()
      }

      // Update wing animation
      this.wingPhase += 0.15
    }

    // For all moving obstacles, update any attached web strands
    if (this.bobAmount > 0 || this.type === 'beetle') {
      this.updateAttachedStrands()
    }
  }

  updateAttachedStrands () {
    // Update web strands that are connected to this obstacle
    for (let strand of webStrands) {
      // Check if strand starts near this obstacle's edge
      let startDist = dist(strand.start.x, strand.start.y, this.x, this.y)
      if (startDist >= this.radius - 5 && startDist <= this.radius + 15) {
        // Strand is attached to edge - update to maintain edge connection
        let angle = atan2(strand.start.y - this.y, strand.start.x - this.x)
        strand.start.x = this.x + cos(angle) * this.radius
        strand.start.y = this.y + sin(angle) * this.radius
        if (strand.path && strand.path.length > 0) {
          strand.path[0].x = strand.start.x
          strand.path[0].y = strand.start.y
        }
      }

      // Check if strand ends near this obstacle's edge
      if (strand.end) {
        let endDist = dist(strand.end.x, strand.end.y, this.x, this.y)
        if (endDist >= this.radius - 5 && endDist <= this.radius + 15) {
          // Strand is attached to edge - update to maintain edge connection
          let angle = atan2(strand.end.y - this.y, strand.end.x - this.x)
          strand.end.x = this.x + cos(angle) * this.radius
          strand.end.y = this.y + sin(angle) * this.radius
          if (strand.path && strand.path.length > 0) {
            strand.path[strand.path.length - 1].x = strand.end.x
            strand.path[strand.path.length - 1].y = strand.end.y
          }
        }
      }
    }
  }

  breakAttachedStrands () {
    // Check for strands attached to this obstacle's edge
    for (let strand of webStrands) {
      // Check if attached to edge (not center)
      let startDist = dist(strand.start.x, strand.start.y, this.x, this.y)
      let attachedToStart =
        startDist >= this.radius - 5 && startDist <= this.radius + 15

      let attachedToEnd = false
      if (strand.end) {
        let endDist = dist(strand.end.x, strand.end.y, this.x, this.y)
        attachedToEnd =
          endDist >= this.radius - 5 && endDist <= this.radius + 15
      }

      if (attachedToStart || attachedToEnd) {
        // Mark strand as broken
        strand.broken = true

        // Release any flies stuck to this strand
        for (let fly of flies) {
          if (fly.stuck || fly.caught) {
            // Check if fly is touching this breaking strand
            let touchingStrand = false
            if (strand.path && strand.path.length > 1) {
              for (let k = 0; k < strand.path.length - 1; k++) {
                let p1 = strand.path[k]
                let p2 = strand.path[k + 1]
                let d = fly.pointToLineDistance(fly.pos, p1, p2)
                if (d < fly.radius + 5) {
                  touchingStrand = true
                  break
                }
              }
            }

            // If fly was on this strand, release it
            if (touchingStrand) {
              fly.stuck = false
              fly.caught = false
              fly.currentSpeed = fly.baseSpeed
              fly.touchedStrands.clear()
              fly.slowedBy.clear()
              // Give it a little downward velocity to start falling
              fly.vel = createVector(random(-0.5, 0.5), 2)

              // Create release particles
              for (let j = 0; j < 3; j++) {
                let p = new Particle(fly.pos.x, fly.pos.y)
                p.color = color(255, 255, 100, 150)
                p.vel = createVector(random(-1, 1), random(0, 2))
                p.size = 2
                particles.push(p)
              }
            }
          }
        }

        // Create dramatic snap particles
        let snapX = attachedToStart ? strand.start.x : strand.end.x
        let snapY = attachedToStart ? strand.start.y : strand.end.y

        // Red/pink particles for the snap
        for (let i = 0; i < 8; i++) {
          let p = new Particle(snapX, snapY)
          p.color = color(255, random(100, 200), random(100, 150))
          p.vel = createVector(random(-5, 5), random(-5, 2))
          p.size = random(4, 8)
          particles.push(p)
        }

        // White strand particles
        for (let i = 0; i < 4; i++) {
          let p = new Particle(snapX, snapY)
          p.color = color(255, 255, 255)
          p.vel = createVector(random(-3, 3), random(-3, 0))
          p.size = 3
          particles.push(p)
        }

        // Reset beetle drift after breaking strands
        this.initialX = this.x
        this.initialY = this.y
        this.driftDistance = 0
      }
    }
  }

  display () {
    push()
    translate(this.x, this.y)

    if (this.type === 'balloon') {
      // ============================================
      // HOT AIR BALLOON WITH CANVAS TEXTURE
      // ============================================
      push()

      // Balloon shadow
      noStroke()
      fill(0, 0, 0, 30)
      ellipse(5, 5, this.radius * 2.1)

      // Main balloon with canvas panel texture
      // Draw vertical panels like a real hot air balloon
      let numPanels = 8
      for (let i = 0; i < numPanels; i++) {
        push()

        // Rotate for each panel
        rotate((TWO_PI / numPanels) * i)

        // Alternate panel colors for classic hot air balloon look
        if (i % 2 === 0) {
          fill(
            red(this.balloonColor),
            green(this.balloonColor),
            blue(this.balloonColor)
          )
        } else {
          // Slightly darker alternate panels
          fill(
            red(this.balloonColor) * 0.9,
            green(this.balloonColor) * 0.9,
            blue(this.balloonColor) * 0.9
          )
        }

        // Draw panel as pie slice
        noStroke()
        arc(
          0,
          0,
          this.radius * 2,
          this.radius * 2,
          -PI / numPanels,
          PI / numPanels,
          PIE
        )

        pop()
      }

      // Add panel seams (the ropes/stitching between panels)
      stroke(60, 40, 20, 110)
      strokeWeight(1)
      for (let i = 0; i < numPanels; i++) {
        let angle = (TWO_PI / numPanels) * i
        let x1 = cos(angle) * this.radius * 0.2
        let y1 = sin(angle) * this.radius * 0.2
        let x2 = cos(angle) * this.radius * 0.95
        let y2 = sin(angle) * this.radius * 0.95
        line(x1, y1, x2, y2)
      }

      // Add circular reinforcement bands
      noFill()
      stroke(80, 50, 30, 80)
      strokeWeight(1.5)
      ellipse(0, 0, this.radius * 1.4)
      ellipse(0, 0, this.radius * 0.8)

      // Matte fabric shading (subtle, non-glossy)
      noStroke()
      // Soft radial shading toward top-left to imply ambient light without specular shine
      for (
        let r = this.radius * 1.2;
        r > this.radius * 0.2;
        r -= this.radius * 0.15
      ) {
        fill(255, 255, 255, 8) // very low alpha
        ellipse(-this.radius * 0.25, -this.radius * 0.35, r * 0.25, r * 0.18)
      }
      // Global matte overlay to reduce plastic look
      noStroke()
      fill(230, 210, 190, 18)
      ellipse(0, 0, this.radius * 2, this.radius * 2)

      // Bottom opening of balloon (where flame goes)
      fill(40, 20, 10)
      ellipse(0, this.radius * 0.9, this.radius * 0.4, this.radius * 0.15)

      // Support ropes from balloon to basket
      stroke(80, 60, 40)
      strokeWeight(2)
      // Four support ropes
      line(-this.radius * 0.3, this.radius * 0.85, -8, this.radius + 20)
      line(this.radius * 0.3, this.radius * 0.85, 8, this.radius + 20)
      line(-this.radius * 0.15, this.radius * 0.9, -4, this.radius + 20)
      line(this.radius * 0.15, this.radius * 0.9, 4, this.radius + 20)

      // FLAME EFFECT (between balloon and basket)
      push()
      translate(0, this.radius + 10)

      // Flame glow
      noStroke()
      fill(255, 200, 0, 30 + sin(frameCount * 0.2) * 20)
      ellipse(0, 0, 30, 30)
      fill(255, 150, 0, 50 + sin(frameCount * 0.3) * 30)
      ellipse(0, 0, 20, 25)

      // Animated flame
      push()
      let flameHeight = 12 + sin(frameCount * 0.4) * 4
      let flameWave = sin(frameCount * 0.3) * 2

      // Outer flame (orange)
      fill(255, 150, 0)
      beginShape()
      vertex(-5, 5)
      bezierVertex(
        -5 + flameWave,
        -flameHeight * 0.5,
        -2 + flameWave,
        -flameHeight * 0.8,
        flameWave,
        -flameHeight
      )
      bezierVertex(
        2 + flameWave,
        -flameHeight * 0.8,
        5 + flameWave,
        -flameHeight * 0.5,
        5,
        5
      )
      endShape(CLOSE)

      // Inner flame (yellow/white)
      fill(255, 255, 150)
      beginShape()
      vertex(-2, 5)
      bezierVertex(
        -2 + flameWave * 0.5,
        -flameHeight * 0.3,
        -1 + flameWave * 0.5,
        -flameHeight * 0.5,
        flameWave * 0.5,
        -flameHeight * 0.7
      )
      bezierVertex(
        1 + flameWave * 0.5,
        -flameHeight * 0.5,
        2 + flameWave * 0.5,
        -flameHeight * 0.3,
        2,
        5
      )
      endShape(CLOSE)

      // Flame tip (bright white)
      fill(255, 255, 255)
      ellipse(flameWave * 0.5, -flameHeight * 0.5, 3, 5)
      pop()

      pop()

      // BIGGER, MORE DETAILED BASKET
      push()
      translate(0, this.radius + 25)

      // Basket shadow
      noStroke()
      fill(0, 0, 0, 20)
      rect(-11, 2, 22, 15, 2)

      // Main basket - bigger to see ant better
      fill(101, 67, 33)
      stroke(80, 50, 20)
      strokeWeight(1.5)
      rect(-10, 0, 20, 14, 2) // Bigger basket

      // Woven basket texture
      stroke(80, 50, 20, 150)
      strokeWeight(1)
      // Vertical weaves
      for (let i = -8; i < 8; i += 3) {
        line(i, 1, i, 13)
      }
      // Horizontal weaves
      for (let i = 3; i < 12; i += 3) {
        line(-9, i, 9, i)
      }

      // Basket rim (thicker, more pronounced)
      stroke(60, 40, 20)
      strokeWeight(2)
      line(-10, 0, 10, 0)

      // Corner reinforcements
      fill(80, 50, 20)
      noStroke()
      ellipse(-9, 0, 3)
      ellipse(9, 0, 3)

      pop()

      // DETAILED ANT PILOT (bigger, more visible)
      push()
      translate(0, this.radius + 28)

      // Ant body
      fill(20)
      noStroke()
      ellipse(0, 0, 8, 5) // Thorax
      ellipse(0, -3, 6, 5) // Head
      ellipse(0, 3, 7, 6) // Abdomen

      // Ant eyes
      fill(255, 100, 100)
      ellipse(-2, -3, 2)
      ellipse(2, -3, 2)

      // Antennae
      stroke(20)
      strokeWeight(1)
      line(-1, -5, -3, -8)
      line(1, -5, 3, -8)

      // Little ant arms holding basket edge
      strokeWeight(1.5)
      line(-3, 0, -6, -3)
      line(3, 0, 6, -3)

      // Ant legs visible over basket edge
      line(-2, 2, -4, 5)
      line(2, 2, 4, 5)

      // Optional: Tiny pilot goggles
      stroke(100, 50, 0)
      strokeWeight(1)
      noFill()
      ellipse(-2, -3, 3)
      ellipse(2, -3, 3)
      line(-0.5, -3, 0.5, -3)

      pop()

      // Sandbags hanging from basket (optional detail)
      push()
      translate(0, this.radius + 25)
      fill(80, 60, 40)
      noStroke()
      ellipse(-12, 10, 4, 5)
      ellipse(12, 10, 4, 5)
      // Sandbag ropes
      stroke(60, 40, 20)
      strokeWeight(0.5)
      line(-10, 7, -12, 10)
      line(10, 7, 12, 10)
      pop()

      pop()
    } else if (this.type === 'beetle') {
      push()
      rotate(this.rotation)

      // Shadow
      noStroke()
      fill(0, 0, 0, 40)
      ellipse(3, 3, this.radius * 1.8, this.radius * 2.2)

      // Wings - always visible and flapping since they're floating
      push()
      // Wing flap animation
      let wingAngle = sin(this.wingPhase) * 0.3
      let wingSpread = 15 + sin(this.wingPhase) * 10

      // Left wing
      push()
      translate(-this.radius * 0.4, 0)
      rotate(-wingAngle)
      fill(255, 255, 255, 120)
      stroke(0, 0, 0, 100)
      strokeWeight(0.5)
      ellipse(-wingSpread * 0.7, 0, wingSpread * 1.2, 15)
      // Wing details
      noStroke()
      fill(200, 200, 200, 80)
      ellipse(-wingSpread * 0.6, 0, wingSpread * 0.8, 10)
      pop()

      // Right wing
      push()
      translate(this.radius * 0.4, 0)
      rotate(wingAngle)
      fill(255, 255, 255, 120)
      stroke(0, 0, 0, 100)
      strokeWeight(0.5)
      ellipse(wingSpread * 0.7, 0, wingSpread * 1.2, 15)
      // Wing details
      noStroke()
      fill(200, 200, 200, 80)
      ellipse(wingSpread * 0.6, 0, wingSpread * 0.8, 10)
      pop()

      // Extra glow at night
      if (gamePhase === 'NIGHT') {
        noStroke()
        fill(255, 255, 200, 30 + sin(this.wingPhase * 2) * 20)
        ellipse(0, 0, this.radius * 3, this.radius * 2)
      }
      pop()

      // Main beetle body (on top of wings)
      fill(
        red(this.beetleColor),
        green(this.beetleColor),
        blue(this.beetleColor)
      )
      stroke(0)
      strokeWeight(2)
      ellipse(0, 0, this.radius * 1.6, this.radius * 2)

      // Shell split line
      stroke(0)
      strokeWeight(1)
      line(0, -this.radius, 0, this.radius)

      // Head
      fill(10)
      ellipse(0, -this.radius * 0.8, this.radius * 0.8, this.radius * 0.6)

      // Spots/pattern
      noStroke()
      fill(0, 0, 0, 80)
      ellipse(-this.radius * 0.3, 0, this.radius * 0.4)
      ellipse(this.radius * 0.3, -this.radius * 0.2, this.radius * 0.3)
      ellipse(this.radius * 0.2, this.radius * 0.4, this.radius * 0.35)
      ellipse(-this.radius * 0.25, this.radius * 0.3, this.radius * 0.25)

      // Tiny tucked legs
      stroke(0)
      strokeWeight(1)
      line(
        -this.radius * 0.5,
        -this.radius * 0.2,
        -this.radius * 0.6,
        -this.radius * 0.1
      )
      line(
        this.radius * 0.5,
        -this.radius * 0.2,
        this.radius * 0.6,
        -this.radius * 0.1
      )
      line(
        -this.radius * 0.5,
        this.radius * 0.2,
        -this.radius * 0.6,
        this.radius * 0.1
      )
      line(
        this.radius * 0.5,
        this.radius * 0.2,
        this.radius * 0.6,
        this.radius * 0.1
      )

      // Antennae
      strokeWeight(1)
      line(-3, -this.radius * 1.1, -8, -this.radius * 1.4)
      line(3, -this.radius * 1.1, 8, -this.radius * 1.4)

      // Eyes
      fill(255, 0, 0)
      noStroke()
      ellipse(-5, -this.radius * 0.7, 5)
      ellipse(5, -this.radius * 0.7, 5)
      // Eye shine
      fill(255, 150, 150)
      ellipse(-4, -this.radius * 0.72, 2)
      ellipse(6, -this.radius * 0.72, 2)

      pop()
    } else if (this.type === 'leaf') {
      rotate(this.rotation)

      if (gamePhase === 'NIGHT') {
        fill(20, 40, 20)
        stroke(10, 20, 10)
      } else {
        fill(34, 139, 34)
        stroke(25, 100, 25)
      }
      strokeWeight(2)

      beginShape()
      for (let point of this.leafPoints) {
        let x = cos(point.angle) * point.radius
        let y = sin(point.angle) * point.radius
        curveVertex(x, y)
      }
      let firstPoint = this.leafPoints[0]
      curveVertex(
        cos(firstPoint.angle) * firstPoint.radius,
        sin(firstPoint.angle) * firstPoint.radius
      )
      let secondPoint = this.leafPoints[1]
      curveVertex(
        cos(secondPoint.angle) * secondPoint.radius,
        sin(secondPoint.angle) * secondPoint.radius
      )
      endShape()

      stroke(25, 100, 25, 100)
      strokeWeight(1)
      line(0, -this.radius, 0, this.radius)
      line(0, 0, -this.radius / 2, -this.radius / 2)
      line(0, 0, this.radius / 2, -this.radius / 2)
      line(0, 0, -this.radius / 2, this.radius / 2)
      line(0, 0, this.radius / 2, this.radius / 2)
    }

    pop()
  }
}

class FoodBox {
  constructor (x, y) {
    this.pos = createVector(x, y)
    this.radius = 10
    this.collected = false
    this.floatOffset = random(TWO_PI)
    this.silkValue = random(20, 35)
    this.glowPhase = random(TWO_PI)
  }

  collect () {
    webSilk = min(webSilk + this.silkValue, maxWebSilk)

    for (let i = 0; i < 8; i++) {
      particles.push(new Particle(this.pos.x, this.pos.y))
    }
  }

  display () {
    push()
    let floatY = sin(frameCount * 0.05 + this.floatOffset) * 3
    translate(this.pos.x, this.pos.y + floatY)

    let glowIntensity = 100 + sin(frameCount * 0.1 + this.glowPhase) * 50
    noStroke()
    fill(255, 200, 100, glowIntensity * 0.3)
    ellipse(0, 0, 40)
    fill(255, 220, 150, glowIntensity * 0.5)
    ellipse(0, 0, 25)

    rectMode(CENTER)

    fill(0, 0, 0, 50)
    rect(2, 2, this.radius * 2, this.radius * 1.8, 3)

    fill(139, 69, 19)
    stroke(100, 50, 0)
    strokeWeight(1)
    rect(0, 0, this.radius * 2, this.radius * 1.8, 3)

    stroke(100, 50, 0)
    strokeWeight(1)
    line(-this.radius, 0, this.radius, 0)
    line(0, -this.radius * 0.9, 0, this.radius * 0.9)

    noStroke()
    fill(255, 200, 100)
    ellipse(-5, -4, 4)
    ellipse(5, -4, 3)
    ellipse(-4, 5, 3)
    ellipse(4, 4, 4)

    pop()
  }
}

class Bird {
  constructor (pattern, isThief = false) {
    this.pattern = pattern // 'dive', 'swoop', 'glide', 'circle'
    this.isThief = isThief
    this.active = false
    this.attacking = false
    this.attackDelay = isThief ? 120 : random(30, 90) // MUCH shorter initial delay

    // Position and movement
    this.x = random(width)
    this.y = -50 // Start above screen
    this.vx = 0
    this.vy = 0
    this.targetX = 0
    this.targetY = 0
    this.speed = 5 // Increased from 3
    this.angle = 0
    this.wingPhase = random(TWO_PI)

    // Visual properties
    this.size = isThief ? 25 : 20
    this.color = isThief ? color(100, 50, 150) : color(50, 50, 50)

    // Pattern-specific properties
    if (pattern === 'circle') {
      this.circleRadius = 150
      this.circleAngle = 0
      this.circleCenter = createVector(width / 2, height / 2)
    }

    // Attack properties - MUCH MORE AGGRESSIVE
    this.diveSpeed = 12 // Increased from 8
    this.retreatSpeed = 6 // Increased from 4
    this.state = 'waiting' // 'waiting', 'approaching', 'attacking', 'retreating'
    this.consecutiveAttacks = 0 // Track multiple attacks
    this.maxConsecutiveAttacks = random(2, 4) // Each bird does 2-4 attacks before retreating
  }

  update () {
    // Update wing animation
    this.wingPhase += 0.3 // Faster wing flapping

    this.avoidObstacles()

    // Countdown to attack - MUCH FASTER
    if (this.attackDelay > 0) {
      this.attackDelay--
      // Hover while waiting - more aggressive hovering
      this.y = -30 + sin(frameCount * 0.08) * 15
      this.x += sin(frameCount * 0.05) * 3

      // Show warning when about to attack
      if (this.attackDelay < 30) {
        this.y = lerp(this.y, 50, 0.1) // Start moving into view
      }
      return
    }

    // Activate after delay
    if (!this.active) {
      this.active = true
      this.state = 'approaching'
      this.updateTarget() // Set initial target
    }

    // Execute movement pattern
    switch (this.pattern) {
      case 'dive':
        this.executeDivePattern()
        break
      case 'swoop':
        this.executeSwoopPattern()
        break
      case 'glide':
        this.executeGlidePattern()
        break
      case 'circle':
        this.executeCirclePattern()
        break
    }

    // Check collisions
    this.checkCollisions()

    // Keep on screen during approach
    if (this.state === 'approaching') {
      this.x = constrain(this.x, 20, width - 20)
    }
  }

  updateTarget () {
    if (this.isThief) {
      // Target caught flies
      let caughtFlies = flies.filter(f => f.stuck || f.caught)
      if (caughtFlies.length > 0) {
        let target = random(caughtFlies)
        this.targetX = target.pos.x
        this.targetY = target.pos.y
      } else {
        this.active = false // No targets, deactivate
        return
      }
    } else {
      // Heavily favor targeting spider (90% chance)
      if (random() < 0.9) {
        // Target spider with prediction
        this.targetX = spider.pos.x + spider.vel.x * 10 // Predict where spider will be
        this.targetY = spider.pos.y + spider.vel.y * 10
      } else {
        // Occasionally target a web strand
        if (webStrands.length > 0) {
          let strand = random(webStrands.filter(s => !s.broken))
          if (strand && strand.path && strand.path.length > 0) {
            let point = random(strand.path)
            this.targetX = point.x
            this.targetY = point.y
          }
        }
      }
    }
  }

  executeDivePattern () {
    if (this.state === 'approaching') {
      // Move into position above target
      let dx = this.targetX - this.x
      let dy = 50 - this.y

      this.x += dx * 0.15
      this.y += dy * 0.15

      // When in position, start diving
      if (abs(dx) < 50 && abs(dy) < 30) {
        this.state = 'attacking'
        this.attacking = true
        // Initialize diveFrames and pullUpY for new attack
        this.diveFrames = 0
        // Calculate pullUpY: spider.pos.y + spider.radius + 8, but not below canvas
        let candidatePullUpY = spider.pos.y + spider.radius + 8
        this.pullUpY = Math.min(candidatePullUpY, height - 12)
        this.updateTarget()
      }
    } else if (this.state === 'attacking') {
      // Track how many frames we've been attacking
      if (typeof this.diveFrames !== 'number') this.diveFrames = 0
      this.diveFrames++

      let dx = this.targetX - this.x
      let dy = this.targetY - this.y

      // Accelerate toward target with better tracking
      this.vx = dx * 0.1 // Better horizontal tracking
      this.vy = min(this.diveSpeed * 1.5, this.vy + 1.5) // Faster acceleration

      this.x += this.vx
      this.y += this.vy

      // Update target position while diving
      if (frameCount % 8 === 0) {
        this.targetX = spider.pos.x
        // Keep steering intent downward; don't let target sit above our per-dive floor
        this.targetY =
          typeof this.pullUpY === 'number'
            ? Math.min(spider.pos.y, this.pullUpY - 4)
            : spider.pos.y
      }

      // Only consider bailing out after a minimum number of dive frames
      let canBailOut = this.diveFrames > 22
      // Use pullUpY for stable bailout check
      let reachedPullUpY =
        typeof this.pullUpY === 'number' ? this.y > this.pullUpY : false
      let reachedBottom = this.y > height - 20 // Go almost to canvas bottom
      const hitCollision =
        dist(this.x, this.y, spider.pos.x, spider.pos.y) <=
        this.size * 0.5 + spider.radius
      const nearButNotHit =
        !hitCollision &&
        abs(this.x - spider.pos.x) < 30 &&
        abs(this.y - spider.pos.y) < 24

      if (canBailOut && (hitCollision || reachedPullUpY || reachedBottom)) {
        // Convert near-miss near the floor into a sweep instead of an early bail
        if (
          !hitCollision &&
          reachedPullUpY &&
          spider.pos.y > height - 30 &&
          !this.sweeping
        ) {
          this.sweeping = true
          this.y = spider.pos.y // lock to spider height
          this.vy = 0
          const sweepDirection = spider.pos.x > this.x ? 1 : -1
          this.vx = sweepDirection * 8
          setTimeout(() => {
            this.sweeping = false
            this.state = 'retreating'
            this.attacking = false
            this.diveFrames = 0
            this.pullUpY = null
          }, 500)
          return // skip normal bailout path
        }
        // If spider is at bottom and we haven't hit it yet, do a horizontal sweep
        if (spider.pos.y > height - 30 && !hitCollision && !this.sweeping) {
          this.sweeping = true
          this.y = spider.pos.y // Match spider height
          this.vy = 0 // Stop vertical movement

          // Sweep horizontally toward spider
          let sweepDirection = spider.pos.x > this.x ? 1 : -1
          this.vx = sweepDirection * 8

          // Continue sweep for a bit
          setTimeout(() => {
            this.sweeping = false
            this.state = 'retreating'
            this.attacking = false
            this.diveFrames = 0
            this.pullUpY = null
          }, 500) // Sweep for 0.5 seconds
        } else if (!this.sweeping) {
          // Normal attack completion
          this.consecutiveAttacks++

          if (this.consecutiveAttacks < this.maxConsecutiveAttacks) {
            // Quick pull up and attack again
            this.state = 'approaching'
            this.attacking = false
            this.y = min(this.y, height - 50)
            this.diveFrames = 0
            this.pullUpY = null
            this.updateTarget()
          } else {
            // Finally retreat
            this.state = 'retreating'
            this.attacking = false
            this.diveFrames = 0
            this.pullUpY = null
          }
        }
      }

      // Safety: Don't go below canvas
      if (this.y > height - 10) {
        this.y = height - 10
        if (!this.sweeping) {
          this.state = 'retreating'
          this.attacking = false
          this.diveFrames = 0
          this.pullUpY = null
        }
      }
    } else if (this.state === 'retreating') {
      // Clear sweep flag
      this.sweeping = false
      this.diveFrames = 0
      this.pullUpY = null

      // Fly back up
      this.vy = -this.retreatSpeed
      this.y += this.vy
      this.x += sin(frameCount * 0.1) * 2

      // Reset when off screen
      if (this.y < -50) {
        this.state = 'approaching'
        this.attackDelay = random(60, 120)
        this.x = random(width)
        this.consecutiveAttacks = 0
        this.maxConsecutiveAttacks = random(2, 4)
        this.diveFrames = 0
        this.pullUpY = null
      }
    }
  }

  executeSwoopPattern () {
    if (this.state === 'approaching') {
      if (this.x < 0) {
        this.x += 8
        this.y = height * 0.3 + sin(this.x * 0.03) * 50
      } else {
        this.state = 'attacking'
        this.attacking = true
        this.updateTarget()
      }
    } else if (this.state === 'attacking') {
      this.x += 9

      // FIX: Adjust swoop pattern if spider is at bottom
      if (spider.pos.y > height - 50) {
        // Lower swoop pattern for bottom spiders
        this.y = height * 0.7 + sin(this.x * 0.03) * 50
      } else {
        // Normal swoop
        this.y = height * 0.3 + sin(this.x * 0.03) * 120
      }

      // Track toward target when close
      if (abs(this.x - this.targetX) < 100) {
        let dy = this.targetY - this.y
        this.y += dy * 0.2
      }

      // Avoid going below canvas
      this.y = min(this.y, height - 15)

      // Exit screen
      if (this.x > width + 50) {
        this.consecutiveAttacks++

        if (this.consecutiveAttacks < this.maxConsecutiveAttacks) {
          this.x = -50
          this.state = 'approaching'
          this.updateTarget()
        } else {
          this.state = 'retreating'
          this.attacking = false
        }
      }
    } else if (this.state === 'retreating') {
      this.state = 'approaching'
      this.attackDelay = random(90, 150)
      this.x = -50
      this.consecutiveAttacks = 0
      this.maxConsecutiveAttacks = random(2, 4)
    }
  }

  avoidObstacles () {
    // Check collision with all obstacles
    for (let obstacle of obstacles) {
      let d = dist(this.x, this.y, obstacle.x, obstacle.y)

      // If too close to an obstacle, push away
      if (d < obstacle.radius + this.size + 10) {
        // Calculate push direction (away from obstacle)
        let pushX = (this.x - obstacle.x) / d
        let pushY = (this.y - obstacle.y) / d

        // Apply push force
        this.x += pushX * 5
        this.y += pushY * 5

        // If stuck for too long, teleport away
        if (this.stuckCounter === undefined) {
          this.stuckCounter = 0
        }
        this.stuckCounter++

        if (this.stuckCounter > 30) {
          // Stuck for 0.5 seconds
          // Teleport to a safe position
          this.y = obstacle.y - obstacle.radius - 30
          this.x = obstacle.x + random(-50, 50)
          this.stuckCounter = 0

          // If attacking, abort and retry
          if (this.state === 'attacking') {
            this.state = 'approaching'
            this.attacking = false
          }
        }
      } else {
        this.stuckCounter = 0 // Reset counter when not stuck
      }
    }

    // Also check home branch collision
    if (window.homeBranch && this.y > window.homeBranch.y - 40) {
      // Check if bird is in branch X range
      let branchStart = Math.min(
        window.homeBranch.startX,
        window.homeBranch.endX
      )
      let branchEnd = Math.max(window.homeBranch.startX, window.homeBranch.endX)

      if (this.x >= branchStart - 20 && this.x <= branchEnd + 20) {
        // Bird is too close to branch, push up
        this.y = window.homeBranch.y - 40

        // If diving, abort dive
        if (this.state === 'attacking' && this.pattern === 'dive') {
          this.state = 'retreating'
          this.attacking = false
        }
      }
    }
  }

  executeGlidePattern () {
    if (this.state === 'approaching') {
      // Glide in from top corner faster
      this.x += 5
      this.y += 2.5

      if (this.y > height * 0.15) {
        this.state = 'attacking'
        this.attacking = true
        this.updateTarget()
      }
    } else if (this.state === 'attacking') {
      // Glide toward target aggressively
      let dx = this.targetX - this.x
      let dy = this.targetY - this.y
      let dist = sqrt(dx * dx + dy * dy)

      if (dist > 10) {
        this.x += (dx / dist) * 7 // Much faster glide
        this.y += (dy / dist) * 7
      }

      // Pass through and maybe attack again
      if (this.y > height - 100 || this.x < -50 || this.x > width + 50) {
        this.consecutiveAttacks++

        if (this.consecutiveAttacks < this.maxConsecutiveAttacks) {
          // Reset for another pass
          this.state = 'approaching'
          this.x = random() < 0.5 ? -50 : width + 50
          this.y = random(50, 150)
          this.updateTarget()
        } else {
          this.state = 'retreating'
          this.attacking = false
        }
      }
    } else if (this.state === 'retreating') {
      // Continue off screen
      this.x += this.vx
      this.y += this.vy

      // Reset
      if (this.y > height + 50 || this.x < -100 || this.x > width + 100) {
        this.state = 'approaching'
        this.attackDelay = random(120, 180)
        this.x = random() < 0.5 ? -50 : width + 50
        this.y = random(50, 150)
        this.vx = this.x < width / 2 ? 5 : -5
        this.vy = 2.5
        this.consecutiveAttacks = 0
        this.maxConsecutiveAttacks = random(2, 4)
      }
    }
  }

  executeCirclePattern () {
    if (this.state === 'approaching') {
      // Move to circle start position
      let startX = this.circleCenter.x + cos(0) * this.circleRadius
      let startY = this.circleCenter.y + sin(0) * this.circleRadius

      let dx = startX - this.x
      let dy = startY - this.y

      this.x += dx * 0.1
      this.y += dy * 0.1

      if (abs(dx) < 20 && abs(dy) < 20) {
        this.state = 'attacking'
        this.attacking = true
        this.circleAngle = 0
      }
    } else if (this.state === 'attacking') {
      // Circle around center FASTER
      this.circleAngle += 0.08 // Faster circling
      this.x = this.circleCenter.x + cos(this.circleAngle) * this.circleRadius
      this.y = this.circleCenter.y + sin(this.circleAngle) * this.circleRadius

      // More frequent dives toward center
      if (frameCount % 60 === 0) {
        // Every second instead of every 2 seconds
        this.circleRadius = max(30, this.circleRadius - 50)
      } else {
        this.circleRadius = min(150, this.circleRadius + 2)
      }

      // Complete circle faster
      if (this.circleAngle > TWO_PI * 1.5) {
        // 1.5 circles instead of 2
        this.state = 'retreating'
        this.attacking = false
      }
    } else if (this.state === 'retreating') {
      // Fly away
      this.y -= 7

      if (this.y < -50) {
        this.state = 'approaching'
        this.attackDelay = random(150, 240)
        this.x = random(width)
      }
    }
  }

  checkCollisions () {
    // FIX: Increased collision radius for more generous hit detection
    let collisionDistance = this.size + spider.radius + 5 // Added 5 pixel buffer

    // Check collision with spider
    if (
      this.attacking &&
      dist(this.x, this.y, spider.pos.x, spider.pos.y) < collisionDistance
    ) {
      // Hit spider!
      if (gamePhase === 'DAWN') {
        // Calculate damage
        let damage = 20 // Base damage

        // If spider has no stamina, GAME OVER!
        if (jumpStamina <= 0) {
          triggerGameOver('Exhausted spider caught by bird!')
          return
        }

        // Otherwise, reduce stamina
        jumpStamina = max(0, jumpStamina - damage)
        stats.birdHitsTaken++

        // Knockback effect
        spider.vel.x = (spider.pos.x - this.x) * 0.3
        spider.vel.y = -3
        spider.isAirborne = true

        // Red damage particles
        for (let i = 0; i < 12; i++) {
          let p = new Particle(spider.pos.x, spider.pos.y)
          p.color = color(255, 50, 50)
          p.vel = createVector(random(-4, 4), random(-4, 1))
          p.size = random(4, 8)
          particles.push(p)
        }

        // Screen shake effect
        if (typeof screenShake !== 'undefined') {
          screenShake = 10
        }

        // Warning notifications - but limited to prevent spam
        if (notifications.length < 3) {
          // Limit notifications
          if (jumpStamina <= 20) {
            notifications.push(
              new Notification('CRITICAL STAMINA!', color(255, 50, 50))
            )
          } else if (jumpStamina <= 40) {
            notifications.push(
              new Notification('Low stamina - find cover!', color(255, 150, 50))
            )
          }
        }
      }

      // Bird bounces off
      this.state = 'retreating'
      this.attacking = false
    }

    // Check collision with web strands
    if (this.attacking) {
      for (let strand of webStrands) {
        if (!strand.broken && strand.path) {
          for (let point of strand.path) {
            if (dist(this.x, this.y, point.x, point.y) < this.size) {
              // Bird breaks the strand!
              strand.broken = true
              stats.strandsLostInNight++

              // Particles
              for (let i = 0; i < 5; i++) {
                let p = new Particle(point.x, point.y)
                p.color = color(255, 255, 255)
                p.vel = createVector(random(-2, 2), random(-2, 2))
                particles.push(p)
              }
              break
            }
          }
        }
      }
    }

    // Thief bird steals flies
    if (this.isThief && this.attacking) {
      for (let i = flies.length - 1; i >= 0; i--) {
        let fly = flies[i]
        if (
          (fly.stuck || fly.caught) &&
          dist(this.x, this.y, fly.pos.x, fly.pos.y) < this.size + 10
        ) {
          // Steal the fly!
          flies.splice(i, 1)

          // Purple particles for theft
          for (let j = 0; j < 6; j++) {
            let p = new Particle(fly.pos.x, fly.pos.y)
            p.color = color(200, 100, 255)
            p.vel = createVector(random(-2, 2), random(-2, 2))
            particles.push(p)
          }

          // Thief escapes after stealing
          this.state = 'retreating'
          this.attacking = false
          this.active = false // Deactivate thief after successful theft
          break
        }
      }
    }
  }

  display () {
    push()
    translate(this.x, this.y)

    // Show if bird is stuck (for debugging)
    if (this.stuckCounter > 15) {
      // Flash red when stuck
      push()
      noFill()
      stroke(255, 0, 0, 100)
      strokeWeight(2)
      ellipse(0, 0, this.size * 3)
      pop()
    }

    // Rotate based on movement
    if (this.state === 'attacking' && this.pattern === 'dive') {
      rotate(PI / 2) // Point down when diving
    } else if (this.vx !== 0) {
      rotate(atan2(this.vy, this.vx))
    }

    // Shadow
    push()
    noStroke()
    fill(0, 0, 0, 30)
    ellipse(5, 5, this.size * 2)
    pop()

    // Wings
    let wingSpread = sin(this.wingPhase) * this.size * 0.8

    // Wing shadows
    noStroke()
    fill(0, 0, 0, 40)
    ellipse(-wingSpread + 2, 2, this.size * 1.5, this.size * 0.5)
    ellipse(wingSpread + 2, 2, this.size * 1.5, this.size * 0.5)

    // Wings
    fill(this.isThief ? color(120, 70, 180) : color(80, 80, 80))
    ellipse(-wingSpread, 0, this.size * 1.5, this.size * 0.5)
    ellipse(wingSpread, 0, this.size * 1.5, this.size * 0.5)

    // Body
    fill(this.isThief ? color(100, 50, 150) : color(50, 50, 50))
    ellipse(0, 0, this.size * 0.8, this.size)

    // Head
    fill(this.isThief ? color(80, 40, 120) : color(30, 30, 30))
    ellipse(0, -this.size * 0.4, this.size * 0.5)

    // Eye
    fill(this.isThief ? color(255, 100, 255) : color(255, 100, 100))
    noStroke()
    ellipse(3, -this.size * 0.4, 4)

    // Beak
    fill(this.isThief ? color(200, 150, 50) : color(200, 150, 0))
    triangle(
      this.size * 0.25,
      -this.size * 0.4,
      this.size * 0.45,
      -this.size * 0.35,
      this.size * 0.25,
      -this.size * 0.3
    )

    // Tail feathers
    fill(this.isThief ? color(120, 70, 180) : color(80, 80, 80))
    for (let i = -1; i <= 1; i++) {
      push()
      translate(-this.size * 0.3, this.size * 0.3)
      rotate(i * 0.2)
      ellipse(0, 0, this.size * 0.3, this.size * 0.8)
      pop()
    }

    // Warning indicator if attacking
    if (this.attacking && frameCount % 20 < 10) {
      noFill()
      stroke(255, 100, 100, 150)
      strokeWeight(2)
      ellipse(0, 0, this.size * 2.5)
    }

    pop()
  }
}

class Particle {
  constructor (x, y) {
    this.pos = createVector(x, y)
    this.vel = createVector(random(-3, 3), random(-5, -2))
    this.lifetime = 255
    this.color = color(255, random(200, 255), random(100, 200))
    this.size = 6 // Default size
  }

  update () {
    this.vel.y += 0.2
    this.pos.add(this.vel)
    this.lifetime -= 8
  }

  display () {
    push()
    noStroke()
    fill(red(this.color), green(this.color), blue(this.color), this.lifetime)
    ellipse(this.pos.x, this.pos.y, this.size)
    pop()
  }

  isDead () {
    return this.lifetime <= 0
  }
}
