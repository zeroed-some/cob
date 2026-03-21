// game.js - Main game loop and state management

// Game objects
let spider
let obstacles = []
let webStrands = []
let flies = []
let foodBoxes = []
let particles = []
let webNodes = []

// Game state
let isDeployingWeb = false
let currentStrand = null
let spacePressed = false
let isMunching = false
let gameOver = false
let gameOverTimer = 0
let deathReason = ''
let finalScore = 0
let screenShake = 0
let fliesSpawnedThisNight = 0

// Resources
let webSilk = 100
let maxWebSilk = 100
let silkRechargeRate = 0.05
let silkDrainRate = 2

// Game phases - PHASE 1 UPDATES
let gamePhase = 'DUSK'
let phaseTimer = 0

// Phase durations (in frames, 60fps) - PHASE 1 NEW
let DAWN_DURATION = 1800 // 30 seconds
let DAY_DURATION = 2700 // 45 seconds
let DUSK_DURATION = 1800 // 30 seconds (was 1500)
let NIGHT_DURATION = 3600 // 60 seconds
let TRANSITION_DURATION = 180 // 3 seconds

let skyColor1, skyColor2, currentSkyColor1, currentSkyColor2
let moonY = 100
let moonOpacity = 0
let sunY = -50 // PHASE 1 NEW
let sunOpacity = 0 // PHASE 1 NEW

// Progression tracking - PHASE 1 NEW
let fliesCaught = 0
let fliesMunched = 0
let totalFliesCaught = 0 // Lifetime counter
let nightsSurvived = 0
let currentNight = 1
let baseFlySpeed = 3
let fliesEscaped = []

// PHASE 2: Special fly notifications
let notifications = []

// PHASE 3: Upgrade System
let playerPoints = 0
let shopOpen = false
let spentPoints = 0

// PHASE 4: Dawn Exhaustion System
let jumpStamina = 100
let maxJumpStamina = 100
let jumpCost = 20
let staminaRegenRate = 0.2
let isExhausted = false
let fliesMunchedLastNight = 0
let birds = []
let staminaRegenCooldown = 0
let staminaBonus = 0

// PHASE 4B: Wind System
let windActive = false
let windDirection = 0
let windStrength = 0
let windTimer = 0
let windDuration = 0
let windParticles = []
let nextWindTime = 0

// PHASE 4B: Thief bird timer
let thiefBirdTimer = 0
let nextThiefTime = 0

// PHASE 5: Achievements & Stats System
let achievements = {
  nightOwl: {
    name: 'Night Owl',
    desc: 'Survive 10 nights',
    icon: '🦉',
    unlocked: false,
    progress: 0,
    target: 10
  },
  silkMaster: {
    name: 'Silk Master',
    desc: 'Have 15+ strands at once',
    icon: '🕸️',
    unlocked: false,
    progress: 0,
    target: 15
  },
  feast: {
    name: 'Feast',
    desc: 'Munch 20 flies in one night',
    icon: '🍽️',
    unlocked: false,
    progress: 0,
    target: 20
  },
  architect: {
    name: 'Architect',
    desc: 'Catch 5 flies without munching',
    icon: '🏗️',
    unlocked: false,
    progress: 0,
    target: 5
  },
  untouchable: {
    name: 'Untouchable',
    desc: 'Survive a night without losing a strand',
    icon: '💎',
    unlocked: false
  },
  windRider: {
    name: 'Wind Rider',
    desc: 'Jump 10 times during wind',
    icon: '🌬️',
    unlocked: false,
    progress: 0,
    target: 10
  },
  thiefDefender: {
    name: 'Thief Defender',
    desc: 'Scare off 10 thief birds',
    icon: '🛡️',
    unlocked: false,
    progress: 0,
    target: 10
  },
  exhaustionMaster: {
    name: 'Exhaustion Master',
    desc: 'Survive dawn with < 20 stamina',
    icon: '😴',
    unlocked: false
  },
  queenSlayer: {
    name: 'Queen Slayer',
    desc: 'Catch 10 queen flies',
    icon: '👑',
    unlocked: false,
    progress: 0,
    target: 10
  },
  perfectDawn: {
    name: 'Perfect Dawn',
    desc: 'No bird hits during dawn',
    icon: '☀️',
    unlocked: false
  },
  speedrunner: {
    name: 'Speedrunner',
    desc: 'Catch 30 flies before Night 5',
    icon: '⚡',
    unlocked: false
  },
  galaxyUnlock: {
    name: 'Cosmic Spider',
    desc: 'Survive 15 nights',
    icon: '🌌',
    unlocked: false,
    progress: 0,
    target: 15
  },
  goldenHunter: {
    name: 'Golden Hunter',
    desc: 'Catch 100 golden flies',
    icon: '✨',
    unlocked: false,
    progress: 0,
    target: 100
  },
  shadowPredator: {
    name: 'Shadow Predator',
    desc: 'Catch 50 flies in one night',
    icon: '🌑',
    unlocked: false,
    progress: 0,
    target: 50
  },
  webMaster: {
    name: 'Web Master',
    desc: '500 total flies caught',
    icon: '🏆',
    unlocked: false,
    progress: 0,
    target: 500
  }
}

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
}

// Cosmetics
let unlockedSkins = {
  default: true,
  galaxy: false,
  golden: false,
  shadow: false,
  rainbow: false
}

let currentSkin = 'default'
let achievementQueue = []
let showingAchievement = null
let achievementDisplayTimer = 0
let upgrades = {
  // Tier 1 Upgrades
  strongLegs: {
    level: 0,
    maxLevel: 3,
    cost: 15,
    name: 'Strong Legs',
    description: 'Jump 15% farther',
    icon: '🦵',
    tier: 1
  },
  silkGlands: {
    level: 0,
    maxLevel: 3,
    cost: 20,
    name: 'Silk Glands',
    description: '+20 max silk capacity',
    icon: '🕸️',
    tier: 1
  },
  efficientSpinning: {
    level: 0,
    maxLevel: 3,
    cost: 15,
    name: 'Efficient Spinning',
    description: '-20% silk consumption',
    icon: '♻️',
    tier: 1
  },
  quickMunch: {
    level: 0,
    maxLevel: 2,
    cost: 10,
    name: 'Quick Munch',
    description: 'Munch cooldown -30%',
    icon: '🦷',
    tier: 1
  },

  // Tier 2 Upgrades (requires at least 2 Tier 1 upgrades)
  powerJump: {
    level: 0,
    maxLevel: 1,
    cost: 50,
    name: 'Power Jump',
    description: 'Hold to charge jump (2x distance)',
    icon: '⚡',
    tier: 2,
    requires: 2 // Number of tier 1 upgrades needed
  },
  silkRecycle: {
    level: 0,
    maxLevel: 1,
    cost: 75,
    name: 'Silk Recycle',
    description: 'Press R near old web to recover 50% silk',
    icon: '🔄',
    tier: 2,
    requires: 2
  },
  spiderSense: {
    level: 0,
    maxLevel: 1,
    cost: 100,
    name: 'Spider Sense',
    description: 'See faint prediction lines for fly paths',
    icon: '👁️',
    tier: 2,
    requires: 3
  },
  metabolize: {
    level: 0,
    maxLevel: 1,
    cost: 60,
    name: 'Metabolize',
    description: 'Munching heals nearby broken strands',
    icon: '💚',
    tier: 2,
    requires: 2
  }
}

// Track if charging jump (Tier 2 upgrade)
let chargingJump = false
let jumpChargeTime = 0
let maxJumpCharge = 60 // 1 second at 60fps

class Notification {
  constructor (text, color) {
    this.text = text
    this.color = color
    this.lifetime = 180 // 3 seconds
    this.alpha = 255

    // IMPROVED: Stacking system to prevent overlap
    // Find how many notifications are currently active
    let activeNotifications = notifications.filter(n => n.lifetime > 60).length

    // Stack notifications vertically
    this.y = height * 0.3 + activeNotifications * 35 // 35 pixels between notifications

    // Prevent too many notifications
    if (notifications.length > 5) {
      notifications.shift() // Remove oldest
    }
  }

  update () {
    this.lifetime--

    // Fade out in the last second
    if (this.lifetime < 60) {
      this.alpha = map(this.lifetime, 0, 60, 0, 255)
    }

    // Slowly rise
    this.y -= 0.3 // Slower rise to maintain readability
  }

  display () {
    push()
    textAlign(CENTER)

    // Add background for better readability
    fill(0, 0, 0, this.alpha * 0.5)
    noStroke()
    rectMode(CENTER)
    rect(width / 2, this.y, textWidth(this.text) + 20, 30, 5)

    // Text with outline for visibility
    textSize(20) // Slightly smaller for less overlap
    strokeWeight(3)
    stroke(0, 0, 0, this.alpha)
    fill(red(this.color), green(this.color), blue(this.color), this.alpha)
    text(this.text, width / 2, this.y + 5)
    pop()
  }

  isDead () {
    return this.lifetime <= 0
  }
}

function setup () {
  let canvas = createCanvas(window.innerWidth, window.innerHeight)
  canvas.parent('game-container')

  skyColor1 = color(135, 206, 235)
  skyColor2 = color(255, 183, 77)
  currentSkyColor1 = skyColor1
  currentSkyColor2 = skyColor2

  // Create home branch for spider
  let homeBranchSide = random() < 0.5 ? 'left' : 'right'
  let homeBranchLength = random(width * 0.33, width * 0.5)
  let homeBranchY = random(height * 0.7, height * 0.85)
  let homeBranchThickness = 25

  // Calculate start and end positions ONCE
  let branchStartX = homeBranchSide === 'left' ? -20 : width + 20
  let branchEndX =
    homeBranchSide === 'left' ? homeBranchLength : width - homeBranchLength

  // Generate leaves with FIXED positions (simplified)
  let leaves = []
  for (let i = 0; i < 3; i++) {
    let t = 0.3 + (0.4 * i) / 2
    let x = lerp(branchStartX, branchEndX, t)
    leaves.push({
      t: t, // Store position as percentage for proper rotation
      yOffset: -homeBranchThickness - 10,
      rotation: random(-PI / 8, PI / 8),
      width: 16,
      height: 8
    })
  }

  // Generate bark textures with FIXED positions
  let barkTextures = []
  for (
    let x = Math.min(branchStartX, branchEndX);
    x < Math.max(branchStartX, branchEndX);
    x += 16
  ) {
    barkTextures.push({
      x: x,
      yOff: -5 + (x % 10), // Deterministic offset based on position
      endYOff: -2 + (x % 5)
    })
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
  }

  // Place spider at the tip of the branch
  let spiderStartX = branchEndX // Place at the end/tip

  // The branch is drawn with a taper - at the tip it's 35% thickness
  // The branch rendering uses push/translate/rotate, so we need to account for that
  let branchTopThickness = homeBranchThickness * 0.35

  // The branch is drawn centered at branch.y after rotation
  // Since the rotation is small, we can approximate
  let branchSurfaceY = homeBranchY - branchTopThickness

  // The branch rotates around (0, homeBranchY), so points further from origin rotate more
  // For small angles: y_rotated ≈ y + x * sin(angle) ≈ y + x * angle
  let rotationOffset = spiderStartX * window.homeBranch.angle
  branchSurfaceY += rotationOffset

  // Place spider on top of the visual branch at the tip (8 is spider radius)
  spider = new Spider(spiderStartX, branchSurfaceY - 8)

  loadGame()

  // PHASE 3: Apply any existing upgrades at start
  // applyUpgradeEffects();

  // Add invisible obstacles along the branch for web anchor points
  let numBranchAnchors = 3
  for (let i = 0; i < numBranchAnchors; i++) {
    let t = (i + 1) / (numBranchAnchors + 1)
    let x =
      homeBranchSide === 'left'
        ? homeBranchLength * t
        : width - homeBranchLength * t
    let y = homeBranchY + sin(t * PI) * 10 // Slight curve
    obstacles.push(new Obstacle(x, y, 20, 'leaf')) // Use leaf as invisible anchor
  }

  // Create more obstacles for denser coverage
  let numObstacles = Math.floor((width * height) / 60000) // More obstacles
  numObstacles = constrain(numObstacles, 15, 25)

  // Create ant balloons
  let numBalloons = Math.floor(random(15, 21))
  for (let i = 0; i < numBalloons; i++) {
    let attempts = 0
    let placed = false

    while (!placed && attempts < 30) {
      // FIX: True random distribution with better spread
      let x, y

      // Use different strategies for better distribution
      let strategy = random()

      if (strategy < 0.3) {
        // 30% - Truly random across upper area
        x = random(80, width - 80)
        y = random(60, height * 0.5)
      } else if (strategy < 0.6) {
        // 30% - Radial distribution from center
        let angle = random(TWO_PI)
        let radius = random(100, min(width, height) * 0.35)
        x = width / 2 + cos(angle) * radius
        y = height * 0.35 + sin(angle) * radius * 0.7 // Elliptical, flatter
        x = constrain(x, 80, width - 80)
        y = constrain(y, 60, height * 0.6)
      } else if (strategy < 0.8) {
        // 20% - Edge preference for variety
        if (random() < 0.5) {
          x = random() < 0.5 ? random(80, 150) : random(width - 150, width - 80)
          y = random(60, height * 0.5)
        } else {
          x = random(80, width - 80)
          y = random(60, 120)
        }
      } else {
        // 20% - Poisson disk sampling attempt (avoid clusters)
        let bestX = random(80, width - 80)
        let bestY = random(60, height * 0.6)
        let bestMinDist = 0

        // Try a few positions and pick the one furthest from existing balloons
        for (let j = 0; j < 5; j++) {
          let testX = random(80, width - 80)
          let testY = random(60, height * 0.6)
          let minDist = Infinity

          for (let obstacle of obstacles) {
            if (obstacle.type === 'balloon') {
              let d = dist(testX, testY, obstacle.x, obstacle.y)
              minDist = min(minDist, d)
            }
          }

          if (minDist > bestMinDist) {
            bestMinDist = minDist
            bestX = testX
            bestY = testY
          }
        }

        x = bestX
        y = bestY
      }

      let radius = random(35, 50) // Varied sizes for visual interest

      let valid = true
      // Check distance from other obstacles
      for (let obstacle of obstacles) {
        if (
          dist(x, y, obstacle.x, obstacle.y) <
          radius + obstacle.radius + 40
        ) {
          valid = false
          break
        }
      }

      // Check distance from home branch
      if (valid && window.homeBranch) {
        let branchY = window.homeBranch.y
        if (Math.abs(y - branchY) < radius + 40) {
          valid = false
        }
      }

      if (valid) {
        obstacles.push(new Obstacle(x, y, radius, 'balloon'))
        placed = true
      }
      attempts++
    }
  }

  // Create beetles
  let numBeetles = Math.floor(random(9, 15))
  for (let i = 0; i < numBeetles; i++) {
    let attempts = 0
    let placed = false

    while (!placed && attempts < 30) {
      // Beetles spread throughout middle and lower areas
      let gridX = (i % 3) * (width / 3) + random(60, width / 3 - 60)
      let gridY =
        height * 0.3 + Math.floor(i / 3) * (height * 0.25) + random(-30, 30)

      let x = constrain(gridX, 70, width - 70)
      let y = constrain(gridY, height * 0.2, height * 0.85)
      let radius = random(28, 42) // Varied beetle sizes

      let valid = true
      for (let obstacle of obstacles) {
        if (
          dist(x, y, obstacle.x, obstacle.y) <
          radius + obstacle.radius + 35
        ) {
          valid = false
          break
        }
      }

      // Check distance from home branch
      if (valid && window.homeBranch) {
        let branchY = window.homeBranch.y
        if (Math.abs(y - branchY) < radius + 30) {
          valid = false
        }
      }

      if (valid) {
        obstacles.push(new Obstacle(x, y, radius, 'beetle'))
        placed = true
      }
      attempts++
    }
  }

  // Create LESS leaves. they're unrealistic!
  let numLeaves = Math.floor(random(7, 9))
  for (let i = 0; i < numLeaves; i++) {
    let attempts = 0
    let placed = false

    while (!placed && attempts < 30) {
      // Place leaves strategically to fill gaps
      let x, y

      // Try to place leaves in areas not covered by balloons/beetles
      if (i < 2) {
        // Place some near edges for web anchoring
        x = random() < 0.5 ? random(30, 100) : random(width - 100, width - 30)
        y = random(height * 0.3, height * 0.7)
      } else {
        // Fill gaps in the middle
        x = random(100, width - 100)
        y = random(height * 0.4, height - 100)
      }

      let radius = random(22, 32) // Leaves stay relatively small

      let valid = true
      for (let obstacle of obstacles) {
        if (
          dist(x, y, obstacle.x, obstacle.y) <
          radius + obstacle.radius + 30
        ) {
          valid = false
          break
        }
      }

      if (valid) {
        obstacles.push(new Obstacle(x, y, radius, 'leaf'))
        placed = true
      }
      attempts++
    }
  }

  let anchorPoints = [
    { x: 50, y: height * 0.25 },
    { x: width - 50, y: height * 0.25 },
    { x: 50, y: height * 0.75 },
    { x: width - 50, y: height * 0.75 },
    { x: width * 0.5, y: 50 },
    { x: width * 0.5, y: height - 80 }
  ]

  for (let point of anchorPoints) {
    // Check if there's already an obstacle nearby
    let needsAnchor = true
    for (let obstacle of obstacles) {
      if (dist(point.x, point.y, obstacle.x, obstacle.y) < 60) {
        needsAnchor = false
        break
      }
    }

    if (needsAnchor) {
      obstacles.push(
        new Obstacle(
          point.x + random(-15, 15),
          point.y + random(-15, 15),
          18,
          'leaf'
        )
      )
    }
  }

  if (random() < 0.5) {
    let attempts = 0
    let placed = false

    while (!placed && attempts < 20) {
      let x = random(width * 0.3, width * 0.7)
      let y = random(height * 0.2, height * 0.4)
      let radius = random(55, 65) // Extra large balloon

      let valid = true
      for (let obstacle of obstacles) {
        if (
          dist(x, y, obstacle.x, obstacle.y) <
          radius + obstacle.radius + 60
        ) {
          valid = false
          break
        }
      }

      if (valid) {
        obstacles.push(new Obstacle(x, y, radius, 'balloon'))
        placed = true
      }
      attempts++
    }
  }

  // Debug: Log obstacle distribution
  let balloonCount = obstacles.filter(o => o.type === 'balloon').length
  let beetleCount = obstacles.filter(o => o.type === 'beetle').length
  let leafCount = obstacles.filter(o => o.type === 'leaf').length
  console.log(
    `Obstacles created - Balloons: ${balloonCount}, Beetles: ${beetleCount}, Leaves: ${leafCount}`
  )

  // Spawn initial food boxes
  let numBoxes = Math.max(3, Math.floor(width / 400))
  for (let i = 0; i < numBoxes; i++) {
    spawnFoodBox()
  }
}

function draw () {
  // apply screen shake if active
  if (screenShake > 0) {
    translate(
      random(-screenShake, screenShake),
      random(-screenShake, screenShake)
    )
    screenShake *= 0.9 // Decay shake
  }

  // Check for game over state
  if (gameOver) {
    // Draw death animation
    push()
    fill(255, 0, 0, 100 - gameOverTimer)
    rect(0, 0, width, height)
    pop()

    gameOverTimer++
    return // Skip normal game updates
  }

  // Update phase timer
  phaseTimer++

  // Phase transitions with endless cycle - PHASE 1 UPDATE
  if (gamePhase === 'DUSK' && phaseTimer >= DUSK_DURATION) {
    gamePhase = 'DUSK_TO_NIGHT'
    phaseTimer = 0
  } else if (
    gamePhase === 'DUSK_TO_NIGHT' &&
    phaseTimer >= TRANSITION_DURATION
  ) {
    gamePhase = 'NIGHT'
    phaseTimer = 0
    // Spawn flies based on difficulty
    spawnNightFlies()
  } else if (gamePhase === 'NIGHT' && phaseTimer >= NIGHT_DURATION) {
    gamePhase = 'NIGHT_TO_DAWN'
    phaseTimer = 0
    nightsSurvived++
    currentNight++
    // PHASE 5: Check night achievements
    checkNightAchievements()
    // PHASE 4: Track flies munched for dawn stamina
    fliesMunchedLastNight = fliesMunched
    fliesMunched = 0 // Reset for next night
    // PHASE 4B: Clear any thief birds
    birds = birds.filter(b => !b.isThief)
    windActive = false // Stop any active wind
  } else if (
    gamePhase === 'NIGHT_TO_DAWN' &&
    phaseTimer >= TRANSITION_DURATION
  ) {
    gamePhase = 'DAWN'
    phaseTimer = 0

    // NEW STAMINA CALCULATION:
    // Fixed 100 max stamina, but starting amount depends on performance
    maxJumpStamina = 100 // Always 100 max

    // Calculate percentage of flies munched
    let totalFliesInNight = fliesSpawnedThisNight + flies.length // Spawned + any remaining
    let munchPercentage = fliesMunchedLastNight / totalFliesInNight

    // Base stamina: 20 minimum, up to 100 for 50% or more flies munched
    if (munchPercentage >= 0.5) {
      jumpStamina = 100 // Full stamina for eating 50%+ of flies
    } else {
      // Scale from 20 to 100 based on 0% to 50% munched
      jumpStamina = Math.floor(20 + munchPercentage * 2 * 80)
    }

    // Create informative notification
    let percentEaten = Math.floor(munchPercentage * 100)
    let staminaMessage = `Dawn: ${jumpStamina}/100 stamina (${percentEaten}% of ${totalFliesInNight} flies eaten)`

    if (jumpStamina <= 30) {
      notifications.push(
        new Notification(staminaMessage + ' ⚠️ DANGER!', color(255, 50, 50))
      )
    } else if (jumpStamina <= 60) {
      notifications.push(
        new Notification(
          staminaMessage + ' - Low stamina!',
          color(255, 150, 50)
        )
      )
    } else if (jumpStamina >= 90) {
      notifications.push(
        new Notification(staminaMessage + ' - Well fed!', color(100, 255, 100))
      )
    } else {
      notifications.push(new Notification(staminaMessage, color(255, 200, 100)))
    }

    // Spawn birds
    spawnDawnBirds()
    // Flies escape at dawn
    escapeFlies()
  } else if (gamePhase === 'DAWN' && phaseTimer >= DAWN_DURATION) {
    gamePhase = 'DAWN_TO_DAY'
    phaseTimer = 0
    // PHASE 5: Check dawn achievements
    checkDawnAchievements()
    // PHASE 4: Clear birds when dawn ends
    birds = []
    // PHASE 3: Open shop at dawn
    if (currentNight > 1) {
      openUpgradeShop()
    }
  } else if (gamePhase === 'DAWN_TO_DAY' && phaseTimer >= TRANSITION_DURATION) {
    gamePhase = 'DAY'
    phaseTimer = 0
    // Degrade webs by 10%
    degradeWebs()
    // PHASE 5: Open stats panel during day
    openStatsPanel()
  } else if (gamePhase === 'DAY' && phaseTimer >= DAY_DURATION) {
    gamePhase = 'DAY_TO_DUSK'
    phaseTimer = 0
  } else if (gamePhase === 'DAY_TO_DUSK' && phaseTimer >= TRANSITION_DURATION) {
    gamePhase = 'DUSK'
    phaseTimer = 0
    // Return some flies for next night
    prepareDusk()
  }

  // Update sky colors
  updateSkyColors()

  // Draw sky gradient
  drawSkyGradient()

  // Draw moon and stars
  if (moonOpacity > 0) {
    drawMoon()
  }

  // Draw sun during day phases - PHASE 1 NEW
  if (sunOpacity > 0) {
    drawSun()
  }

  // PHASE 4B: Update wind system
  updateWind()

  // PHASE 4B: Apply wind to airborne entities
  if (windActive) {
    // Push spider if airborne - MORE DRAMATIC
    if (spider.isAirborne) {
      spider.vel.x += cos(windDirection) * windStrength * 0.15 // Increased from 0.1
      spider.vel.y += sin(frameCount * 0.05) * windStrength * 0.03 // Add vertical wobble
    }

    // Push flies - MORE VISIBLE
    for (let fly of flies) {
      if (!fly.stuck && !fly.caught) {
        fly.vel.x += cos(windDirection) * windStrength * 0.08 // Increased from 0.05
        fly.vel.y += sin(frameCount * 0.1 + fly.wingPhase) * windStrength * 0.02 // Turbulence
      }
    }

    // ENHANCED: Make webs sway and stretch
    for (let strand of webStrands) {
      if (!strand.broken) {
        // Stronger vibration
        strand.vibrate(windStrength * 0.8) // Increased from 0.5

        // Apply lateral force to web path points for realistic sway
        if (strand.path && strand.path.length > 2) {
          for (let i = 1; i < strand.path.length - 1; i++) {
            let point = strand.path[i]
            // Middle points sway more than ends
            let swayFactor = sin((i / strand.path.length) * PI)
            point.x += cos(windDirection) * windStrength * swayFactor * 0.3
            // Add some vertical movement too
            point.y +=
              sin(frameCount * 0.08 + i * 0.1) *
              windStrength *
              swayFactor *
              0.15
          }
        }

        // Check if strand is overstretched and should break
        if (strand.tension > 1.0 && windStrength > 4) {
          // Lowered from 1.2
          if (random() < (0.02 * windStrength) / 5) {
            // Increased chance based on wind strength
            strand.broken = true
            notifications.push(
              new Notification('Wind snapped a web!', color(255, 150, 100))
            )
            // Add dramatic snap particles
            for (let j = 0; j < 8; j++) {
              let p = new Particle(
                strand.path[Math.floor(strand.path.length / 2)].x,
                strand.path[Math.floor(strand.path.length / 2)].y
              )
              p.vel = createVector(
                cos(windDirection) * random(3, 6),
                random(-2, 2)
              )
              p.color = color(255, 255, 255)
              p.size = random(2, 5)
              particles.push(p)
            }
          }
        }
      }
    }

    // Update wind particles
    for (let i = windParticles.length - 1; i >= 0; i--) {
      let p = windParticles[i]
      p.x += cos(windDirection) * windStrength * 3
      p.life--
      if (p.life <= 0 || p.x < -50 || p.x > width + 50) {
        windParticles.splice(i, 1)
      }
    }

    // Spawn new wind particles
    if (frameCount % 5 === 0) {
      windParticles.push({
        x: windDirection > 0 ? -20 : width + 20,
        y: random(height),
        life: 120,
        size: random(2, 4)
      })
    }
  }

  // Update and display game objects
  for (let obstacle of obstacles) {
    obstacle.update() // Update movement and animations
    obstacle.display()
  }

  for (let box of foodBoxes) {
    box.display()
  }

  // PHASE 4B: Display wind effects
  if (windActive) {
    push()
    noStroke()
    for (let p of windParticles) {
      fill(255, 255, 255, p.life * 0.5)
      ellipse(p.x, p.y, p.size)
    }

    // Wind indicator
    push()
    translate(width / 2, 50)
    stroke(255, 255, 255, 100)
    strokeWeight(3)
    let arrowLength = windStrength * 10
    line(0, 0, cos(windDirection) * arrowLength, 0)
    // Arrowhead
    push()
    translate(cos(windDirection) * arrowLength, 0)
    rotate(windDirection)
    line(0, 0, -5, -3)
    line(0, 0, -5, 3)
    pop()

    // Wind strength text
    fill(255, 255, 255, 150)
    noStroke()
    textAlign(CENTER)
    textSize(12)
    text('WIND: ' + Math.round(windStrength), 0, 20)
    pop()
    pop()
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update()
    particles[i].display()
    if (particles[i].isDead()) {
      particles.splice(i, 1)
    }
  }

  // PHASE 1 UPDATE - Handle broken strands
  for (let i = webStrands.length - 1; i >= 0; i--) {
    let strand = webStrands[i]
    strand.update()

    // Remove broken strands
    if (strand.broken) {
      // Create particles for breaking effect
      if (strand.path && strand.path.length > 0) {
        let midPoint = strand.path[Math.floor(strand.path.length / 2)]
        for (let j = 0; j < 5; j++) {
          let p = new Particle(midPoint.x, midPoint.y)
          p.color = color(255, 255, 255)
          p.vel = createVector(random(-2, 2), random(-3, 0))
          particles.push(p)
        }
      }

      // Check all stuck/caught flies to see if they need to be released
      for (let fly of flies) {
        if (fly.stuck || fly.caught) {
          // Check if this fly still has valid web support
          let hasSupport = false
          for (let otherStrand of webStrands) {
            if (otherStrand !== strand && !otherStrand.broken) {
              // Check if fly is on this other strand
              if (otherStrand.path && otherStrand.path.length > 1) {
                for (let k = 0; k < otherStrand.path.length - 1; k++) {
                  let p1 = otherStrand.path[k]
                  let p2 = otherStrand.path[k + 1]
                  let d = fly.pointToLineDistance(fly.pos, p1, p2)
                  if (d < fly.radius + 5) {
                    hasSupport = true
                    break
                  }
                }
              }
              if (hasSupport) break
            }
          }

          // If no support, release the fly
          if (!hasSupport) {
            fly.stuck = false
            fly.caught = false
            fly.currentSpeed = fly.baseSpeed
            fly.touchedStrands.clear()
            fly.slowedBy.clear()
            fly.vel = createVector(random(-0.5, 0.5), 1.5)

            // Create release particles
            for (let j = 0; j < 3; j++) {
              let p = new Particle(fly.pos.x, fly.pos.y)
              p.color = color(255, 255, 0, 100)
              p.vel = createVector(random(-1, 1), random(0, 1))
              p.size = 2
              particles.push(p)
            }
          }
        }
      }

      webStrands.splice(i, 1)
    } else {
      strand.display()
    }
  }

  for (let node of webNodes) {
    node.update()
  }

  // Display current strand being created
  if (currentStrand && isDeployingWeb && spider.isAirborne) {
    let opacity = map(webSilk, 0, 20, 50, 150)
    stroke(255, 255, 255, opacity)
    strokeWeight(1.5)

    if (currentStrand.path && currentStrand.path.length > 0) {
      noFill()
      beginShape()
      curveVertex(currentStrand.path[0].x, currentStrand.path[0].y)
      for (let point of currentStrand.path) {
        curveVertex(point.x, point.y)
      }
      curveVertex(spider.pos.x, spider.pos.y)
      curveVertex(spider.pos.x, spider.pos.y)
      endShape()
    } else {
      line(
        currentStrand.start.x,
        currentStrand.start.y,
        spider.pos.x,
        spider.pos.y
      )
    }
  }

  for (let i = flies.length - 1; i >= 0; i--) {
    flies[i].update()
    flies[i].display()
  }

  spider.update()
  spider.display()

  // PHASE 4: Exhaustion indicator
  if (gamePhase === 'DAWN' && isExhausted) {
    push()
    textAlign(CENTER)
    textSize(16)
    fill(255, 100, 100, 200 + sin(frameCount * 0.2) * 55)
    stroke(0)
    strokeWeight(2)
    text('NO STAMINA!', spider.pos.x, spider.pos.y - 30)
    pop()
  }

  // Threat cue when regen is fully suppressed
  if (gamePhase === 'DAWN') {
    let showThreatCue = false
    for (let b of birds) {
      if (
        b &&
        b.state === 'diving' &&
        dist(b.x, b.y, spider.pos.x, spider.pos.y) < 180
      ) {
        showThreatCue = true
        break
      }
    }
    if (showThreatCue) {
      push()
      textAlign(CENTER)
      textSize(14)
      fill(255, 80, 80, 210)
      stroke(0)
      strokeWeight(2)
      text(
        'UNDER ATTACK! stamina regen halted',
        spider.pos.x,
        spider.pos.y - 48
      )
      pop()
    }
  }

  // PHASE 4: Update and display birds during dawn
  if (gamePhase === 'DAWN') {
    // Update stamina (suppressed during bird attack sequences)
    // Threat scan (expose flags for cooldown logic)
    let anyBirdActive = false
    let nearDivingBird = false
    for (let b of birds) {
      if (!b) continue
      // any bird on screen during DAWN counts as pressure
      if (b.state !== 'retreating') anyBirdActive = true
      // hard suppression if a diving bird is close
      if (b.state === 'diving') {
        const d = dist(b.x, b.y, spider.pos.x, spider.pos.y)
        if (d < 180) nearDivingBird = true
      }
    }
    const birdThreatMultiplier = nearDivingBird
      ? 0.0
      : anyBirdActive
      ? 0.4
      : 1.0

    // Cooldown: delay regen start after jumps and while threats persist
    if (staminaRegenCooldown > 0) {
      staminaRegenCooldown--
    }
    if (nearDivingBird) {
      staminaRegenCooldown = Math.max(staminaRegenCooldown, 90) // +1.5s after a near dive
    } else if (anyBirdActive) {
      staminaRegenCooldown = Math.max(staminaRegenCooldown, 45) // +0.75s while birds hunt
    }
    // Light movement also nudges the cooldown so regen only starts when resting
    if (spider.vel.mag() >= 0.3) {
      staminaRegenCooldown = Math.max(staminaRegenCooldown, 15)
    }

    // Base regen depends on motion
    let regen =
      staminaRegenRate *
      (spider.isAirborne || spider.vel.mag() >= 0.1 ? 1.0 : 2.0)
    // Apply threat suppression
    regen *= birdThreatMultiplier
    // Apply cooldown suppression
    if (staminaRegenCooldown > 0) {
      regen = 0
    }

    jumpStamina += regen
    jumpStamina = min(jumpStamina, maxJumpStamina)

    // FIX: Only set exhausted when truly out of stamina
    isExhausted = jumpStamina < jumpCost

    // Update and display birds
    for (let i = birds.length - 1; i >= 0; i--) {
      let bird = birds[i]
      if (bird) {
        bird.update()
        bird.display()

        // Remove birds that have flown off screen
        if (
          bird.y < -100 ||
          bird.y > height + 100 ||
          bird.x < -100 ||
          bird.x > width + 100
        ) {
          if (bird.state === 'retreating' && !bird.active) {
            birds.splice(i, 1)
          }
        }
      }
    }

    // Debug: Show bird count
    if (frameCount % 60 === 0) {
      console.log(`Dawn birds active: ${birds.length}`)
    }
  }

  // PHASE 4B: Update thief birds during night
  if (gamePhase === 'NIGHT') {
    for (let i = birds.length - 1; i >= 0; i--) {
      let bird = birds[i]
      bird.update()
      bird.display()

      // Remove inactive thief birds
      if (bird.isThief && !bird.active) {
        birds.splice(i, 1)
      }
    }
  }

  // PHASE 3: Spider Sense - show fly path predictions
  if (upgrades.spiderSense && upgrades.spiderSense.level > 0) {
    push()
    strokeWeight(1)
    for (let fly of flies) {
      if (!fly.stuck && !fly.caught) {
        // Predict future position
        let futurePos = p5.Vector.add(fly.pos, p5.Vector.mult(fly.vel, 30))
        stroke(255, 255, 255, 30)
        line(fly.pos.x, fly.pos.y, futurePos.x, futurePos.y)
        noFill()
        stroke(255, 255, 255, 20)
        ellipse(futurePos.x, futurePos.y, 10)
      }
    }
    pop()
  }

  // PHASE 2: Display notifications
  for (let i = notifications.length - 1; i >= 0; i--) {
    notifications[i].update()
    notifications[i].display()
    if (notifications[i].isDead()) {
      notifications.splice(i, 1)
    }
  }

  // PHASE 5: Display achievements
  displayAchievements()

  // Update resources
  updateResources()

  // PHASE 5: Check achievements continuously
  checkAchievements()

  // PHASE 3: Update jump charging
  if (chargingJump && !spider.isAirborne) {
    jumpChargeTime++
    spider.jumpChargeVisual = min(jumpChargeTime / maxJumpCharge, 1)
  } else {
    spider.jumpChargeVisual = 0
  }

  // Handle web deployment
  handleWebDeployment()

  // Update UI
  updateUI()

  // Spawn entities during night - PHASE 1 UPDATE
  if (gamePhase === 'NIGHT') {
    // Dynamic spawn rate based on difficulty
    let spawnRate = max(90, 120 - currentNight * 5) // Faster spawning over time
    if (phaseTimer % spawnRate === 0 && flies.length < 10 + currentNight * 2) {
      // PHASE 2: Spawn different types during the night too
      let flyType = 'regular'
      let roll = random()

      if (currentNight >= 5 && roll < 0.03) {
        flyType = 'queen'
      } else if (roll < 0.08) {
        flyType = 'golden'
      } else if (roll < 0.2) {
        flyType = 'moth'
      }

      let fly = new Fly(flyType)
      let speedMult = 1 + Math.floor((currentNight - 1) / 3) * 0.1
      fly.baseSpeed = baseFlySpeed * speedMult
      if (flyType === 'golden') fly.baseSpeed *= 1.3
      if (flyType === 'moth') fly.baseSpeed *= 0.8
      if (flyType === 'queen') fly.baseSpeed *= 0.5
      fly.currentSpeed = fly.baseSpeed
      flies.push(fly)
      fliesSpawnedThisNight++ // Track dynamic spawn
    }
    if (phaseTimer % 300 === 0 && foodBoxes.length < 6) {
      spawnFoodBox()
    }

    // PHASE 4B: Spawn thief birds at night (after Night 5)
    if (currentNight >= 5) {
      thiefBirdTimer++
      if (thiefBirdTimer >= nextThiefTime) {
        spawnThiefBird()
        thiefBirdTimer = 0
        nextThiefTime = random(2700, 3600) // 45-60 seconds
      }
    }

    // PHASE 4B: Random wind gusts at night
    if (!windActive && frameCount > nextWindTime) {
      startWindGust()
    }
  }
}

function openStatsPanel () {
  // Update stats display
  let statsHTML = `
        <div>Total Flies Caught: ${stats.totalFliesCaught}</div>
        <div>Regular: ${stats.regularCaught}</div>
        <div>Golden: ${stats.goldenCaught}</div>
        <div>Moths: ${stats.mothsCaught}</div>
        <div>Queens: ${stats.queensCaught}</div>
        <div>Longest Night: ${stats.longestNight}</div>
        <div>Total Jumps: ${stats.totalJumps}</div>
        <div>Wind Jumps: ${stats.windJumps}</div>
        <div>Thieves Scared: ${stats.thievesScared}</div>
        <div>Perfect Dawns: ${stats.perfectDawns}</div>
    `
  document.getElementById('stats-list').innerHTML = statsHTML

  // Update skins display
  let skinsHTML = ''
  let skins = [
    { id: 'default', name: 'Classic', icon: '🕷️', unlocked: true },
    {
      id: 'galaxy',
      name: 'Galaxy',
      icon: '🌌',
      unlocked: unlockedSkins.galaxy
    },
    {
      id: 'golden',
      name: 'Golden',
      icon: '✨',
      unlocked: unlockedSkins.golden
    },
    {
      id: 'shadow',
      name: 'Shadow',
      icon: '🌑',
      unlocked: unlockedSkins.shadow
    },
    {
      id: 'rainbow',
      name: 'Rainbow',
      icon: '🌈',
      unlocked: unlockedSkins.rainbow
    }
  ]

  for (let skin of skins) {
    let selected = currentSkin === skin.id
    let locked = !skin.unlocked
    skinsHTML += `
            <div onclick="selectSkin('${skin.id}')" 
                 style="padding: 10px; background: ${
                   selected ? '#FFD700' : locked ? '#444' : '#666'
                 }; 
                        border-radius: 10px; cursor: ${
                          locked ? 'not-allowed' : 'pointer'
                        };
                        opacity: ${locked ? '0.5' : '1'}; text-align: center;">
                <div style="font-size: 30px;">${skin.icon}</div>
                <div style="font-size: 12px; color: ${
                  selected ? '#000' : '#FFF'
                };">
                    ${skin.name}${locked ? ' 🔒' : ''}
                </div>
            </div>
        `
  }
  document.getElementById('skins-list').innerHTML = skinsHTML

  // Update achievements display
  let achievementsHTML = ''
  for (let key in achievements) {
    let ach = achievements[key]
    let progress =
      ach.progress !== undefined ? ` (${ach.progress}/${ach.target})` : ''
    achievementsHTML += `
            <div style="padding: 8px; background: ${
              ach.unlocked ? '#4CAF50' : '#444'
            }; 
                       border-radius: 5px; opacity: ${
                         ach.unlocked ? '1' : '0.6'
                       };">
                ${ach.icon} ${ach.name}${!ach.unlocked ? progress : ' ✓'}
            </div>
        `
  }
  document.getElementById('achievements-list').innerHTML = achievementsHTML

  // Show panel
  document.getElementById('stats-panel').style.display = 'block'

  // FIX: Add both click AND touch listeners
  let closeBtn = document.getElementById('close-stats-btn')

  // Remove any existing listeners
  closeBtn.replaceWith(closeBtn.cloneNode(true))
  closeBtn = document.getElementById('close-stats-btn')

  closeBtn.addEventListener('click', function () {
    document.getElementById('stats-panel').style.display = 'none'
    if (gamePhase === 'DAY') {
      gamePhase = 'DAY_TO_DUSK'
      phaseTimer = 0
    }
  })

  closeBtn.addEventListener('touchend', function (e) {
    e.preventDefault()
    document.getElementById('stats-panel').style.display = 'none'
    if (gamePhase === 'DAY') {
      gamePhase = 'DAY_TO_DUSK'
      phaseTimer = 0
    }
  })
}

// Make selectSkin global
window.selectSkin = function (skinId, event) {
  // Prevent touch issues
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }

  if (unlockedSkins[skinId]) {
    currentSkin = skinId
    saveGame()
    openStatsPanel() // Refresh display
    notifications.push(
      new Notification(`Skin changed to ${skinId}!`, color(100, 255, 100))
    )
  }
}

// ============================================
// PHASE 5: ACHIEVEMENTS & COSMETICS
// ============================================

function checkAchievements () {
  // Night Owl - Survive X nights
  if (!achievements.nightOwl.unlocked) {
    achievements.nightOwl.progress = nightsSurvived
    if (nightsSurvived >= achievements.nightOwl.target) {
      unlockAchievement('nightOwl')
    }
  }

  // Silk Master - 15+ strands at once
  if (!achievements.silkMaster.unlocked) {
    let activeStrands = webStrands.filter(s => !s.broken).length
    achievements.silkMaster.progress = max(
      achievements.silkMaster.progress,
      activeStrands
    )
    if (activeStrands >= achievements.silkMaster.target) {
      unlockAchievement('silkMaster')
    }
  }

  // Wind Rider - Jump during wind
  if (
    !achievements.windRider.unlocked &&
    achievements.windRider.progress >= achievements.windRider.target
  ) {
    unlockAchievement('windRider')
  }

  // Thief Defender
  if (
    !achievements.thiefDefender.unlocked &&
    stats.thievesScared >= achievements.thiefDefender.target
  ) {
    achievements.thiefDefender.progress = stats.thievesScared
    unlockAchievement('thiefDefender')
  }

  // Queen Slayer
  if (!achievements.queenSlayer.unlocked) {
    achievements.queenSlayer.progress = stats.queensCaught
    if (stats.queensCaught >= achievements.queenSlayer.target) {
      unlockAchievement('queenSlayer')
    }
  }

  // Galaxy Unlock - 15 nights
  if (!achievements.galaxyUnlock.unlocked) {
    achievements.galaxyUnlock.progress = nightsSurvived
    if (nightsSurvived >= achievements.galaxyUnlock.target) {
      unlockAchievement('galaxyUnlock')
      unlockedSkins.galaxy = true
    }
  }

  // Golden Hunter - 100 golden flies
  if (!achievements.goldenHunter.unlocked) {
    achievements.goldenHunter.progress = stats.goldenCaught
    if (stats.goldenCaught >= achievements.goldenHunter.target) {
      unlockAchievement('goldenHunter')
      unlockedSkins.golden = true
    }
  }

  // Web Master - 500 total flies
  if (!achievements.webMaster.unlocked) {
    achievements.webMaster.progress = stats.totalFliesCaught
    if (stats.totalFliesCaught >= achievements.webMaster.target) {
      unlockAchievement('webMaster')
      unlockedSkins.rainbow = true
    }
  }

  // Speedrunner - 30 flies before night 5
  if (
    !achievements.speedrunner.unlocked &&
    currentNight < 5 &&
    stats.totalFliesCaught >= 30
  ) {
    unlockAchievement('speedrunner')
  }
}

function checkNightAchievements () {
  // Called at end of night

  // Feast - 20 flies munched in one night
  if (
    !achievements.feast.unlocked &&
    stats.fliesMunchedInCurrentNight >= achievements.feast.target
  ) {
    achievements.feast.progress = stats.fliesMunchedInCurrentNight
    unlockAchievement('feast')
  }

  // Architect - Catch 5 flies without munching
  if (
    !achievements.architect.unlocked &&
    stats.fliesCaughtWithoutMunch >= achievements.architect.target
  ) {
    achievements.architect.progress = stats.fliesCaughtWithoutMunch
    unlockAchievement('architect')
  }

  // Untouchable - No strands lost
  if (!achievements.untouchable.unlocked && stats.strandsLostInNight === 0) {
    unlockAchievement('untouchable')
  }

  // Shadow Predator - 50 flies in one night
  if (
    !achievements.shadowPredator.unlocked &&
    fliesCaught >= achievements.shadowPredator.target
  ) {
    achievements.shadowPredator.progress = fliesCaught
    unlockAchievement('shadowPredator')
    unlockedSkins.shadow = true
  }

  // Reset night-specific counters
  stats.fliesMunchedInCurrentNight = 0
  stats.fliesCaughtWithoutMunch = fliesCaught
  stats.strandsLostInNight = 0
}

function checkDawnAchievements () {
  // Perfect Dawn - no bird hits
  if (!achievements.perfectDawn.unlocked && stats.birdHitsTaken === 0) {
    unlockAchievement('perfectDawn')
    stats.perfectDawns++
  }

  // Exhaustion Master - survive with < 20 stamina
  if (!achievements.exhaustionMaster.unlocked && jumpStamina < 20) {
    unlockAchievement('exhaustionMaster')
  }

  // Reset dawn counter
  stats.birdHitsTaken = 0
}

function unlockAchievement (achievementKey) {
  let achievement = achievements[achievementKey]
  if (achievement.unlocked) return

  achievement.unlocked = true
  achievementQueue.push(achievement)

  // Save to localStorage
  saveGame()
}

function displayAchievements () {
  // Show queued achievements
  if (!showingAchievement && achievementQueue.length > 0) {
    showingAchievement = achievementQueue.shift()
    achievementDisplayTimer = 240 // 4 seconds
  }

  // Display current achievement
  if (showingAchievement && achievementDisplayTimer > 0) {
    push()

    // Background
    let alpha =
      achievementDisplayTimer > 200
        ? 255
        : map(achievementDisplayTimer, 0, 40, 0, 255)
    fill(20, 20, 40, alpha * 0.9)
    stroke(255, 215, 0, alpha)
    strokeWeight(3)
    rectMode(CENTER)
    rect(width / 2, 100, 400, 80, 10)

    // Icon
    textAlign(CENTER)
    textSize(30)
    fill(255, 255, 255, alpha)
    text(showingAchievement.icon, width / 2 - 150, 105)

    // Text
    textSize(20)
    fill(255, 215, 0, alpha)
    text('ACHIEVEMENT UNLOCKED!', width / 2, 85)

    textSize(16)
    fill(255, 255, 255, alpha)
    text(showingAchievement.name, width / 2, 105)

    textSize(12)
    fill(200, 200, 200, alpha)
    text(showingAchievement.desc, width / 2, 125)

    pop()

    achievementDisplayTimer--
    if (achievementDisplayTimer <= 0) {
      showingAchievement = null
    }
  }
}

function saveGame () {
  // Save to localStorage
  let saveData = {
    achievements: achievements,
    stats: stats,
    unlockedSkins: unlockedSkins,
    currentSkin: currentSkin,
    upgrades: upgrades,
    playerPoints: playerPoints,
    nightsSurvived: nightsSurvived,
    currentNight: currentNight,
    playerPoints: playerPoints,
    spentPoints: spentPoints
  }

  localStorage.setItem('cobGameSave', JSON.stringify(saveData))
}

function loadGame () {
  let saveData = localStorage.getItem('cobGameSave')
  if (saveData) {
    let data = JSON.parse(saveData)
    achievements = data.achievements || achievements
    stats = data.stats || stats
    unlockedSkins = data.unlockedSkins || unlockedSkins
    currentSkin = data.currentSkin || 'default'
    upgrades = data.upgrades || upgrades
    playerPoints = data.playerPoints || 0
    nightsSurvived = data.nightsSurvived || 0
    currentNight = data.currentNight || 1
    playerPoints = data.playerPoints || 0
    spentPoints = data.spentPoints || 0

    // Apply upgrades
    applyUpgradeEffects()
  }
}

// ============================================
// PHASE 4B: NIGHT THREATS
// ============================================

function spawnThiefBird () {
  // Check if there are caught flies to steal
  let caughtFlies = flies.filter(f => f.stuck || f.caught)
  if (caughtFlies.length === 0) return

  // Create a thief bird
  let thief = new Bird('swoop', true)
  thief.active = true
  thief.attackDelay = 60 // Attack quickly
  birds.push(thief)

  // PHASE 5: Track thief scared if spider is near
  if (
    dist(
      spider.pos.x,
      spider.pos.y,
      caughtFlies[0].pos.x,
      caughtFlies[0].pos.y
    ) < 80
  ) {
    stats.thievesScared++
  }

  // Visual warning
  push()
  textAlign(CENTER)
  textSize(30)
  fill(200, 50, 200)
  stroke(0)
  strokeWeight(3)
  text('THIEF!', width / 2, height / 2)
  pop()
}

function startWindGust () {
  windActive = true
  windDirection = random() < 0.5 ? 0 : PI // Left or right
  windStrength = random(3, 6)  // Increased from (2, 5)
  windDuration = random(300, 600) // 5-10 seconds
  windTimer = 0
  windParticles = []

  // More dramatic notification
  let direction = windDirection === 0 ? '→' : '←'
  let intensity = windStrength > 4.5 ? 'Strong' : windStrength > 3.5 ? 'Moderate' : 'Light'
  notifications.push(
    new Notification(`${intensity} wind gust ${direction}`, color(200, 200, 255))
  )
  
  // Screen shake for strong winds
  if (windStrength > 4.5) {
    screenShake = 5
  }
}

function updateWind () {
  if (!windActive) return

  windTimer++

  // Fade in and out
  if (windTimer < 60) {
    // Fade in
    windStrength = lerp(0, windStrength, windTimer / 60)
  } else if (windTimer > windDuration - 60) {
    // Fade out
    windStrength = lerp(windStrength, 0, (windTimer - (windDuration - 60)) / 60)
  }

  // End wind
  if (windTimer >= windDuration) {
    windActive = false
    windTimer = 0
    windParticles = []
    nextWindTime = frameCount + random(1800, 3600) // 30-60 seconds until next wind
  }
}

// ============================================
// PHASE 4: DAWN SURVIVAL FUNCTIONS
// ============================================

function spawnDawnBirds () {
  birds = []

  // Start with 3 birds, add 1 every 3 nights (capped at 6)
  let numBirds = min(3 + Math.floor((currentNight - 1) / 3), 6)

  // Mix of attack patterns
  let patterns = ['dive', 'dive', 'glide'] // More dive birds
  if (currentNight >= 3) patterns.push('circle')
  if (currentNight >= 6) patterns.push('dive', 'glide')

  for (let i = 0; i < numBirds; i++) {
    let pattern = random(patterns)
    let bird = new Bird(pattern, false) // false = not a thief
    bird.active = false // Will activate after delay
    bird.attackDelay = 60 + i * 60 // Stagger attack delays
    birds.push(bird)
  }

  // Notification
  notifications.push(
    new Notification(`DAWN! ${numBirds} birds hunting!`, color(255, 150, 100))
  )

  // Debug log to confirm birds are spawning
  console.log(`Spawned ${numBirds} dawn birds`)
}

// ============================================
// PHASE 3: UPGRADE SHOP FUNCTIONS
// ============================================

function openUpgradeShop () {
  if (currentNight <= 1) return

  shopOpen = true
  noLoop() // Pause the game

  // Update shop UI
  document.getElementById('upgrade-shop').style.display = 'block'
  document.getElementById('available-points').textContent =
    playerPoints - spentPoints

  // Populate upgrade lists
  updateShopDisplay()

  // FIX: Add both click AND touch listeners for mobile
  let continueBtn = document.getElementById('continue-btn')

  // Remove any existing listeners to prevent duplicates
  continueBtn.replaceWith(continueBtn.cloneNode(true))
  continueBtn = document.getElementById('continue-btn')

  // Add both click and touch support
  continueBtn.addEventListener('click', closeUpgradeShop)
  continueBtn.addEventListener('touchend', function (e) {
    e.preventDefault() // Prevent ghost clicks
    closeUpgradeShop()
  })
}

function closeUpgradeShop () {
  shopOpen = false
  document.getElementById('upgrade-shop').style.display = 'none'

  // IMMEDIATELY transition to dusk after closing shop
  if (gamePhase === 'DAY') {
    gamePhase = 'DAY_TO_DUSK'
    phaseTimer = 0
  }

  loop() // Resume the game
}

function updateShopDisplay () {
  let tier1HTML = ''
  let tier2HTML = ''
  let tier1Count = 0

  // Calculate available points
  let availablePoints = playerPoints - spentPoints

  // Count tier 1 upgrades
  for (let key in upgrades) {
    if (upgrades[key].tier === 1 && upgrades[key].level > 0) {
      tier1Count++
    }
  }

  // Display Tier 1 upgrades
  for (let key in upgrades) {
    let upgrade = upgrades[key]
    if (upgrade.tier === 1) {
      let canAfford = availablePoints >= upgrade.cost
      let maxed = upgrade.level >= upgrade.maxLevel
      let buttonText = maxed ? 'MAXED' : `Buy (${upgrade.cost} pts)`
      let buttonDisabled = maxed || !canAfford ? 'disabled' : ''
      let opacity = maxed ? '0.5' : '1'

      tier1HTML += `
                <div style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.3); 
                           border-radius: 10px; opacity: ${opacity};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-size: 24px;">${
                              upgrade.icon
                            }</span>
                            <strong>${upgrade.name}</strong> (${
        upgrade.level
      }/${upgrade.maxLevel})
                            <br><small>${upgrade.description}</small>
                        </div>
                        <button ontouchend="buyUpgrade('${key}')" onclick="buyUpgrade('${key}')" ${buttonDisabled}
                                style="padding: 5px 15px; background: ${
                                  canAfford && !maxed ? '#4CAF50' : '#666'
                                }; 
                                      color: white; border: none; border-radius: 5px; cursor: ${
                                        canAfford && !maxed
                                          ? 'pointer'
                                          : 'not-allowed'
                                      };">
                            ${buttonText}
                        </button>
                    </div>
                </div>
            `
    }
  }

  // Display Tier 2 upgrades
  for (let key in upgrades) {
    let upgrade = upgrades[key]
    if (upgrade.tier === 2) {
      let unlocked = tier1Count >= upgrade.requires
      let canAfford = availablePoints >= upgrade.cost && unlocked
      let maxed = upgrade.level >= upgrade.maxLevel
      let buttonText = maxed
        ? 'MAXED'
        : !unlocked
        ? `Needs ${upgrade.requires} Tier 1`
        : `Buy (${upgrade.cost} pts)`
      let buttonDisabled = maxed || !canAfford ? 'disabled' : ''
      let opacity = !unlocked ? '0.3' : maxed ? '0.5' : '1'

      tier2HTML += `
                <div style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.3); 
                           border-radius: 10px; opacity: ${opacity};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-size: 24px;">${
                              upgrade.icon
                            }</span>
                            <strong>${upgrade.name}</strong> (${
        upgrade.level
      }/${upgrade.maxLevel})
                            <br><small>${upgrade.description}</small>
                        </div>
                        <button ontouchend="buyUpgrade('${key}')" onclick="buyUpgrade('${key}')" ${buttonDisabled}
                                style="padding: 5px 15px; background: ${
                                  canAfford && !maxed ? '#FF69B4' : '#666'
                                }; 
                                      color: white; border: none; border-radius: 5px; cursor: ${
                                        canAfford && !maxed
                                          ? 'pointer'
                                          : 'not-allowed'
                                      };">
                            ${buttonText}
                        </button>
                    </div>
                </div>
            `
    }
  }

  document.getElementById('upgrade-list-tier1').innerHTML = tier1HTML
  document.getElementById('upgrade-list-tier2').innerHTML = tier2HTML

  // Update tier 2 section opacity
  document.getElementById('tier2-upgrades').style.opacity =
    tier1Count >= 2 ? '1' : '0.5'
}

// Make buyUpgrade global so onclick can access it
window.buyUpgrade = function (upgradeKey) {
  // Prevent any touch/click propagation issues
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }

  let upgrade = upgrades[upgradeKey]
  if (!upgrade) return

  // Check tier requirements
  if (upgrade.tier === 2) {
    let tier1Count = 0
    for (let key in upgrades) {
      if (upgrades[key].tier === 1 && upgrades[key].level > 0) {
        tier1Count++
      }
    }
    if (tier1Count < upgrade.requires) return
  }

  // Check if can afford and not maxed
  let availablePoints = playerPoints - spentPoints // Calculate available points
  if (availablePoints >= upgrade.cost && upgrade.level < upgrade.maxLevel) {
    spentPoints += upgrade.cost // Track spent points
    upgrade.level++

    // Apply upgrade effects immediately
    applyUpgradeEffects()

    // Update display with available points
    document.getElementById('available-points').textContent =
      playerPoints - spentPoints
    updateShopDisplay()

    // Show notification
    notifications.push(
      new Notification(`Upgraded ${upgrade.name}!`, color(100, 255, 100))
    )
  }
}

function applyUpgradeEffects () {
  if (!spider) return // Ensure spider exists

  // Reset to base values
  spider.jumpPower = 12
  maxWebSilk = 100
  silkDrainRate = 2
  spider.munchCooldownMax = 30 // Add this property to spider

  // Apply Tier 1 upgrades
  if (upgrades.strongLegs.level > 0) {
    spider.jumpPower = 12 * (1 + 0.15 * upgrades.strongLegs.level)
  }

  if (upgrades.silkGlands.level > 0) {
    maxWebSilk = 100 + 20 * upgrades.silkGlands.level
    webSilk = min(webSilk, maxWebSilk) // Cap current silk to new max
  }

  if (upgrades.efficientSpinning.level > 0) {
    silkDrainRate = 2 * (1 - 0.2 * upgrades.efficientSpinning.level)
  }

  if (upgrades.quickMunch.level > 0) {
    spider.munchCooldownMax = 30 * (1 - 0.3 * upgrades.quickMunch.level)
  }

  // Tier 2 upgrades are handled in their respective functions
}

function spawnNightFlies () {
  // Reset counter for new night
  fliesSpawnedThisNight = 0

  // Base flies + more per night
  let numFlies = 5 + currentNight

  // Apply difficulty scaling
  let flySpeedMultiplier = 1 + Math.floor((currentNight - 1) / 3) * 0.1 // +10% every 3 nights

  for (let i = 0; i < numFlies; i++) {
    // PHASE 2: Spawn different fly types with rarity
    let flyType = 'regular'
    let roll = random()

    if (currentNight >= 5 && roll < 0.05) {
      // Queen flies: 5% chance after night 5
      flyType = 'queen'
    } else if (roll < 0.1) {
      // Golden flies: 10% chance
      flyType = 'golden'
    } else if (roll < 0.25) {
      // Moths: 15% chance
      flyType = 'moth'
    }

    let fly = new Fly(flyType)
    fly.baseSpeed = baseFlySpeed * flySpeedMultiplier
    if (flyType === 'golden') fly.baseSpeed *= 1.3 // Golden are always faster
    if (flyType === 'moth') fly.baseSpeed *= 0.8 // Moths are slower
    if (flyType === 'queen') fly.baseSpeed *= 0.5 // Queens are much slower
    fly.currentSpeed = fly.baseSpeed
    flies.push(fly)
    fliesSpawnedThisNight++ // Track spawn
  }

  // PHASE 2: Guarantee at least 1 golden fly per night
  if (flies.filter(f => f.type === 'golden').length === 0) {
    let goldenFly = new Fly('golden')
    goldenFly.baseSpeed = baseFlySpeed * flySpeedMultiplier * 1.3
    goldenFly.currentSpeed = goldenFly.baseSpeed
    flies.push(goldenFly)
    fliesSpawnedThisNight++ // Track spawn
    // Add notification
    notifications.push(
      new Notification('Golden Firefly Appeared! ✨', color(255, 215, 0))
    )
  }

  // PHASE 2: Guarantee a queen on nights 10+
  if (
    currentNight >= 10 &&
    flies.filter(f => f.type === 'queen').length === 0
  ) {
    let queenFly = new Fly('queen')
    queenFly.baseSpeed = baseFlySpeed * flySpeedMultiplier * 0.5
    queenFly.currentSpeed = queenFly.baseSpeed
    flies.push(queenFly)
    fliesSpawnedThisNight++ // Track spawn
    // Add notification
    notifications.push(
      new Notification('Queen Firefly Arrived! 👑', color(200, 100, 255))
    )
  }

  // Spawn some food boxes
  for (let i = 0; i < 3; i++) {
    spawnFoodBox()
  }
}

function escapeFlies () {
  // Store escaping flies (could be used for visual effect later)
  fliesEscaped = []

  for (let fly of flies) {
    if (!fly.stuck) {
      fliesEscaped.push({
        x: fly.pos.x,
        y: fly.pos.y,
        type: fly.type // PHASE 2: Store actual type
      })
    }
  }

  // Clear all flies
  flies = []
}

function degradeWebs () {
  // Degrade each web strand by 10%
  for (let strand of webStrands) {
    strand.strength *= 0.9

    // Very weak strands break
    if (strand.strength < 0.3) {
      strand.broken = true
    }

    // Add slight sag to simulate aging
    if (strand.path && strand.path.length > 2) {
      for (let i = 1; i < strand.path.length - 1; i++) {
        strand.path[i].y += random(2, 5)
      }
    }
  }

  // Create some particles to show degradation
  for (let i = 0; i < 10; i++) {
    let p = new Particle(random(width), random(height))
    p.color = color(255, 255, 255, 100)
    p.vel = createVector(0, random(0.5, 2))
    p.size = 2
    particles.push(p)
  }
}

function prepareDusk () {
  // Return some flies for the next night (visual continuity)
  let returnCount = min(3, fliesEscaped.length)
  for (let i = 0; i < returnCount; i++) {
    // PHASE 2: Recreate the same type of fly that escaped
    let fly = new Fly(fliesEscaped[i].type)
    // Start from edge but move toward previous positions
    fly.wanderAngle = atan2(
      fliesEscaped[i].y - fly.pos.y,
      fliesEscaped[i].x - fly.pos.x
    )
    flies.push(fly)
  }
}

function drawSun () {
  push()
  noStroke()

  // Sun glow
  fill(255, 230, 100, sunOpacity * 0.3)
  ellipse(width - 150, sunY, 120)
  fill(255, 220, 50, sunOpacity * 0.5)
  ellipse(width - 150, sunY, 80)
  fill(255, 200, 0, sunOpacity)
  ellipse(width - 150, sunY, 50)

  pop()
}

function propagateVibration (sourceStrand, vibrationAmount) {
  // FIX: Instead of checking all strand pairs, use a limited propagation
  // Only check strands that share endpoints (actually connected)

  let vibratedStrands = new Set()
  vibratedStrands.add(sourceStrand)

  // Find directly connected strands only
  for (let strand of webStrands) {
    if (strand === sourceStrand || strand.broken) continue

    // Check if strands share an endpoint (much faster than distance checks)
    let connected = false

    // Check if endpoints are very close (essentially the same point)
    if (sourceStrand.start && strand.start) {
      if (
        dist(
          sourceStrand.start.x,
          sourceStrand.start.y,
          strand.start.x,
          strand.start.y
        ) < 5
      ) {
        connected = true
      }
    }
    if (!connected && sourceStrand.start && strand.end) {
      if (
        dist(
          sourceStrand.start.x,
          sourceStrand.start.y,
          strand.end.x,
          strand.end.y
        ) < 5
      ) {
        connected = true
      }
    }
    if (!connected && sourceStrand.end && strand.start) {
      if (
        dist(
          sourceStrand.end.x,
          sourceStrand.end.y,
          strand.start.x,
          strand.start.y
        ) < 5
      ) {
        connected = true
      }
    }
    if (!connected && sourceStrand.end && strand.end) {
      if (
        dist(
          sourceStrand.end.x,
          sourceStrand.end.y,
          strand.end.x,
          strand.end.y
        ) < 5
      ) {
        connected = true
      }
    }

    if (connected) {
      strand.vibrate(vibrationAmount)
      vibratedStrands.add(strand)

      // Stop after vibrating 5 strands to prevent performance issues
      if (vibratedStrands.size >= 5) break
    }
  }
}

// ============================================
// ORIGINAL FUNCTIONS WITH PHASE 1 UPDATES
// ============================================

function updateSkyColors () {
  // PHASE 1 - Complete rewrite for full cycle
  if (gamePhase === 'DAWN') {
    // Dawn: dark purple/blue to soft orange/pink
    currentSkyColor1 = lerpColor(
      color(70, 70, 120),
      color(255, 200, 150),
      phaseTimer / DAWN_DURATION
    )
    currentSkyColor2 = lerpColor(
      color(30, 30, 60),
      color(255, 150, 100),
      phaseTimer / DAWN_DURATION
    )
    moonOpacity = lerp(255, 0, phaseTimer / DAWN_DURATION)
    moonY = lerp(60, -50, phaseTimer / DAWN_DURATION)
    sunY = lerp(height + 50, height - 100, phaseTimer / DAWN_DURATION)
    sunOpacity = lerp(0, 100, phaseTimer / DAWN_DURATION)
  } else if (gamePhase === 'DAWN_TO_DAY') {
    let t = phaseTimer / TRANSITION_DURATION
    currentSkyColor1 = lerpColor(color(255, 200, 150), color(135, 206, 235), t)
    currentSkyColor2 = lerpColor(color(255, 150, 100), color(255, 255, 200), t)
    sunY = lerp(height - 100, height * 0.3, t)
    sunOpacity = lerp(100, 255, t)
  } else if (gamePhase === 'DAY') {
    // Day: bright blue sky
    currentSkyColor1 = color(135, 206, 235)
    currentSkyColor2 = color(255, 255, 200)
    sunY = lerp(height * 0.3, 100, phaseTimer / DAY_DURATION)
    sunOpacity = 255
  } else if (gamePhase === 'DAY_TO_DUSK') {
    let t = phaseTimer / TRANSITION_DURATION
    currentSkyColor1 = lerpColor(color(135, 206, 235), color(255, 140, 90), t)
    currentSkyColor2 = lerpColor(color(255, 255, 200), color(255, 183, 77), t)
    sunY = lerp(100, 60, t)
    sunOpacity = lerp(255, 150, t)
  } else if (gamePhase === 'DUSK') {
    // Dusk: orange/purple sunset
    currentSkyColor1 = lerpColor(
      color(255, 140, 90),
      color(200, 100, 120),
      phaseTimer / DUSK_DURATION
    )
    currentSkyColor2 = lerpColor(
      color(255, 183, 77),
      color(120, 60, 120),
      phaseTimer / DUSK_DURATION
    )
    sunY = lerp(60, -50, phaseTimer / DUSK_DURATION)
    sunOpacity = lerp(150, 0, phaseTimer / DUSK_DURATION)
  } else if (gamePhase === 'DUSK_TO_NIGHT') {
    let t = phaseTimer / TRANSITION_DURATION
    currentSkyColor1 = lerpColor(color(200, 100, 120), color(25, 25, 112), t)
    currentSkyColor2 = lerpColor(color(120, 60, 120), color(0, 0, 40), t)
    moonOpacity = t * 255
    moonY = lerp(100, 60, t)
  } else if (gamePhase === 'NIGHT') {
    // Night: dark blue/purple
    currentSkyColor1 = color(25, 25, 112)
    currentSkyColor2 = color(0, 0, 40)
    moonOpacity = 255
    moonY = 60
  } else if (gamePhase === 'NIGHT_TO_DAWN') {
    let t = phaseTimer / TRANSITION_DURATION
    currentSkyColor1 = lerpColor(color(25, 25, 112), color(70, 70, 120), t)
    currentSkyColor2 = lerpColor(color(0, 0, 40), color(30, 30, 60), t)
  }
}

function drawSkyGradient () {
  for (let i = 0; i <= height; i++) {
    let inter = map(i, 0, height, 0, 1)
    let c = lerpColor(currentSkyColor1, currentSkyColor2, inter)
    stroke(c)
    line(0, i, width, i)
  }

  // Draw home branch
  if (window.homeBranch) {
    push()
    let branch = window.homeBranch

    // Branch shadow
    push()
    translate(0, branch.y + 5)
    rotate(branch.angle)
    noStroke()
    fill(0, 0, 0, 30)

    // Shadow with taper
    beginShape()
    vertex(branch.startX, 10)
    bezierVertex(
      branch.startX + (branch.endX - branch.startX) * 0.3,
      8,
      branch.startX + (branch.endX - branch.startX) * 0.7,
      5,
      branch.endX,
      3
    )
    vertex(branch.endX, -3)
    bezierVertex(
      branch.startX + (branch.endX - branch.startX) * 0.7,
      -5,
      branch.startX + (branch.endX - branch.startX) * 0.3,
      -8,
      branch.startX,
      -10
    )
    endShape(CLOSE)
    pop()

    // Main branch with organic shape and taper
    push()
    translate(0, branch.y)
    rotate(branch.angle)

    noStroke()

    // Base color - PHASE 1: Update for all phases
    if (gamePhase === 'NIGHT' || gamePhase === 'NIGHT_TO_DAWN') {
      fill(30, 15, 5)
    } else {
      fill(92, 51, 23)
    }

    // Branch body with taper
    beginShape()
    vertex(branch.startX, -branch.thickness)
    bezierVertex(
      branch.startX + (branch.endX - branch.startX) * 0.3,
      -branch.thickness * 0.9,
      branch.startX + (branch.endX - branch.startX) * 0.7,
      -branch.thickness * 0.6,
      branch.endX,
      -branch.thickness * 0.35
    )
    vertex(branch.endX, branch.thickness * 0.35)
    bezierVertex(
      branch.startX + (branch.endX - branch.startX) * 0.7,
      branch.thickness * 0.6,
      branch.startX + (branch.endX - branch.startX) * 0.3,
      branch.thickness * 0.9,
      branch.startX,
      branch.thickness
    )
    endShape(CLOSE)

    // Add a fork around 70% down the branch
    push()
    let forkX = branch.startX + (branch.endX - branch.startX) * 0.7
    let forkY = 0
    translate(forkX, forkY)
    rotate(((branch.side === 'right' ? -1 : 1) * PI) / 6)

    // Fork branch
    if (gamePhase === 'NIGHT' || gamePhase === 'NIGHT_TO_DAWN') {
      fill(35, 18, 6)
    } else {
      fill(102, 58, 28)
    }

    beginShape()
    vertex(0, -8)
    bezierVertex(20, -7, 35, -5, 50, -3)
    vertex(50, 3)
    bezierVertex(35, 5, 20, 7, 0, 8)
    endShape(CLOSE)
    pop()

    // Add lighter highlights
    if (gamePhase === 'NIGHT' || gamePhase === 'NIGHT_TO_DAWN') {
      fill(50, 25, 10, 150)
    } else {
      fill(139, 90, 43, 180)
    }

    // Highlight on top ridge
    beginShape()
    vertex(branch.startX + 20, -branch.thickness * 0.8)
    bezierVertex(
      branch.startX + (branch.endX - branch.startX) * 0.4,
      -branch.thickness * 0.7,
      branch.startX + (branch.endX - branch.startX) * 0.6,
      -branch.thickness * 0.5,
      branch.endX - 20,
      -branch.thickness * 0.25
    )
    vertex(branch.endX - 20, -branch.thickness * 0.15)
    bezierVertex(
      branch.startX + (branch.endX - branch.startX) * 0.6,
      -branch.thickness * 0.4,
      branch.startX + (branch.endX - branch.startX) * 0.4,
      -branch.thickness * 0.6,
      branch.startX + 20,
      -branch.thickness * 0.7
    )
    endShape(CLOSE)

    // Bark texture lines
    stroke(60, 30, 10, 100)
    strokeWeight(1)
    for (let texture of branch.barkTextures) {
      if (texture.x % 20 < 10) {
        line(texture.x, texture.yOff, texture.x + 3, texture.endYOff)
      }
    }

    // Knots
    noStroke()
    if (gamePhase === 'NIGHT' || gamePhase === 'NIGHT_TO_DAWN') {
      fill(40, 20, 5)
    } else {
      fill(80, 40, 15)
    }
    ellipse(branch.startX + (branch.endX - branch.startX) * 0.3, -5, 12, 8)
    ellipse(branch.startX + (branch.endX - branch.startX) * 0.65, 3, 8, 10)

    pop()

    // Small twigs - properly attached to the rotated branch
    stroke(
      gamePhase === 'NIGHT' || gamePhase === 'NIGHT_TO_DAWN'
        ? color(40, 20, 0)
        : color(101, 67, 33)
    )

    // Just add a couple simple twigs for visual interest
    strokeWeight(3)
    line(
      branch.startX + (branch.endX - branch.startX) * 0.3,
      -5,
      branch.startX + (branch.endX - branch.startX) * 0.3 - 10,
      -15
    )
    line(
      branch.startX + (branch.endX - branch.startX) * 0.6,
      0,
      branch.startX + (branch.endX - branch.startX) * 0.6 + 8,
      -12
    )

    // Add leaves (properly positioned within rotated branch)
    for (let leaf of branch.leaves) {
      let leafX = branch.startX + (branch.endX - branch.startX) * leaf.t
      push()
      translate(leafX, leaf.yOffset)
      rotate(leaf.rotation)

      // Leaf shadow
      noStroke()
      fill(0, 0, 0, 20)
      ellipse(2, 2, leaf.width, leaf.height)

      // Leaf body
      if (gamePhase === 'NIGHT' || gamePhase === 'NIGHT_TO_DAWN') {
        fill(20, 40, 20)
      } else {
        fill(34, 139, 34)
      }
      ellipse(0, 0, leaf.width, leaf.height)

      // Leaf vein
      stroke(25, 100, 25, 100)
      strokeWeight(0.5)
      line(-leaf.width / 2 + 2, 0, leaf.width / 2 - 2, 0)
      pop()
    }

    pop()
  }
}

function drawMoon () {
  push()
  noStroke()

  // Brighter, farther-reaching moon glow
  fill(255, 255, 240, moonOpacity)
  ellipse(width - 100, moonY, 52)

  // Multi-layer radial glow for reach
  push()
  blendMode(ADD)
  fill(255, 255, 230, moonOpacity * 0.55)
  ellipse(width - 100, moonY, 90)
  fill(255, 255, 210, moonOpacity * 0.35)
  ellipse(width - 100, moonY, 140)
  fill(220, 230, 255, moonOpacity * 0.22)
  ellipse(width - 100, moonY, 200)
  pop()

  // Moon craters with better contrast
  fill(240, 240, 210, moonOpacity * 0.7)
  ellipse(width - 105, moonY - 5, 8)
  ellipse(width - 95, moonY + 8, 12)
  ellipse(width - 110, moonY + 10, 6)

  // Subtle "godrays" emanating from the moon
  push()
  blendMode(ADD)
  let baseA = frameCount * 0.0023 // slow drift
  let rayCount = 8
  for (let i = 0; i < rayCount; i++) {
    let a =
      baseA +
      i * ((Math.PI * 2) / rayCount) +
      (noise(i * 0.2, frameCount * 0.005) - 0.5) * 0.2
    let len = 140 + noise(i * 1.7, frameCount * 0.003) * 120 // 140-260px
    let w0 = 6 + noise(i * 0.9) * 6 // near width
    let w1 = 18 + noise(i * 0.7) * 16 // far width
    let cx = width - 100
    let cy = moonY
    fill(220, 230, 255, moonOpacity * 0.18)
    noStroke()
    beginShape()
    vertex(cx + Math.cos(a + 0.03) * w0, cy + Math.sin(a + 0.03) * w0)
    vertex(cx + Math.cos(a - 0.03) * w0, cy + Math.sin(a - 0.03) * w0)
    vertex(
      cx + Math.cos(a) * len + Math.cos(a + 0.12) * w1,
      cy + Math.sin(a) * len + Math.sin(a + 0.12) * w1
    )
    vertex(
      cx + Math.cos(a) * len + Math.cos(a - 0.12) * w1,
      cy + Math.sin(a) * len + Math.sin(a - 0.12) * w1
    )
    endShape(CLOSE)
  }
  pop()

  pop()
}

function updateResources () {
  // PHASE 1 - Apply difficulty scaling to silk regen
  let silkPenalty = Math.floor((currentNight - 1) / 5) * 0.05
  let adjustedRegenRate = silkRechargeRate * (1 - silkPenalty)

  webSilk = min(webSilk + adjustedRegenRate, maxWebSilk)

  // Handle silk drain for both keyboard and touch
  if (
    isDeployingWeb &&
    spider.isAirborne &&
    (spacePressed || touchHolding) &&
    webSilk > 0
  ) {
    webSilk = max(0, webSilk - silkDrainRate)
    if (webSilk <= 0) {
      isDeployingWeb = false
      spacePressed = false
      touchHolding = false
      if (currentStrand) {
        webStrands.pop()
        currentStrand = null
      }
    }
  }

  if (!spacePressed && !touchHolding && isDeployingWeb) {
    isDeployingWeb = false
  }
}

function handleWebDeployment () {
  // Handle keyboard-based web deployment
  if (spacePressed && spider.isAirborne && !isDeployingWeb && webSilk > 10) {
    isDeployingWeb = true
    currentStrand = new WebStrand(spider.lastAnchorPoint.copy(), null)
    currentStrand.path = [spider.lastAnchorPoint.copy()]

    // NEW: Check if starting from an obstacle
    for (let obstacle of obstacles) {
      let d = dist(
        spider.lastAnchorPoint.x,
        spider.lastAnchorPoint.y,
        obstacle.x,
        obstacle.y
      )
      // Check if anchor is on obstacle edge (within tolerance)
      if (abs(d - obstacle.radius) < 10) {
        currentStrand.startObstacle = obstacle
        currentStrand.startAngle = atan2(
          spider.lastAnchorPoint.y - obstacle.y,
          spider.lastAnchorPoint.x - obstacle.x
        )
        break
      }
    }

    webStrands.push(currentStrand)

    let newNode = new WebNode(
      spider.lastAnchorPoint.x,
      spider.lastAnchorPoint.y
    )
    // NEW: Track node attachment if on obstacle
    if (currentStrand.startObstacle) {
      newNode.attachedObstacle = currentStrand.startObstacle
      newNode.attachmentAngle = currentStrand.startAngle
    }
    webNodes.push(newNode)
  }

  // Update web for keyboard controls
  if (currentStrand && isDeployingWeb && spider.isAirborne && spacePressed) {
    currentStrand.end = spider.pos.copy()
    if (frameCount % 2 === 0) {
      currentStrand.path.push(spider.pos.copy())
    }
  }

  // Touch-based web deployment is handled in touchMoved()
}

function updateUI () {
  // Update control instructions based on device
  let isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

  // PHASE 3: Add upgrade-specific controls
  let controls = []
  if (isMobile) {
    controls.push(
      'Tap to jump • Hold mid-air for web • Double-tap spider to munch!'
    )
  } else {
    controls.push('Click to jump • Space to spin web • Shift to munch!')
  }

  // Add upgrade controls
  if (upgrades.powerJump && upgrades.powerJump.level > 0) {
    controls.push('Hold click to charge jump!')
  }
  if (upgrades.silkRecycle && upgrades.silkRecycle.level > 0) {
    controls.push('Press R to recycle web!')
  }

  document.getElementById('info').innerHTML =
    controls.join('<br>') +
    '<br>' +
    'Web Strands: <span id="strand-count">0</span><br>' +
    'Flies Caught: <span id="flies-caught">0</span> | Munched: <span id="flies-munched">0</span><br>' +
    'Points: <span id="player-points">0</span> | Total Score: <span id="total-score">0</span>'

  // Update all the displays
  document.getElementById('strand-count').textContent = webStrands.filter(
    s => !s.broken
  ).length
  document.getElementById('flies-caught').textContent = fliesCaught
  document.getElementById('flies-munched').textContent = fliesMunched
  document.getElementById('player-points').textContent = playerPoints // NEW
  document.getElementById('total-score').textContent = totalFliesCaught

  // Update phase display
  let phaseDisplay = gamePhase
  if (gamePhase === 'DUSK_TO_NIGHT') phaseDisplay = 'NIGHTFALL'
  else if (gamePhase === 'NIGHT_TO_DAWN') phaseDisplay = 'DAWN BREAKS'
  else if (gamePhase === 'DAWN_TO_DAY') phaseDisplay = 'SUNRISE'
  else if (gamePhase === 'DAY_TO_DUSK') phaseDisplay = 'SUNSET'
  document.getElementById('phase').textContent = phaseDisplay

  // Update night counter
  document.getElementById('night-counter').textContent = `Night ${currentNight}`

  // Update timer based on phase
  let timerText = ''
  let potentialStamina = 30 + fliesMunched * 10
  potentialStamina = min(potentialStamina, 200)

  let staminaColor = ''
  if (potentialStamina <= 50) {
    staminaColor = 'style="color: #ff4444;"'
  } else if (potentialStamina <= 80) {
    staminaColor = 'style="color: #ffaa44;"'
  } else {
    staminaColor = 'style="color: #44ff44;"'
  }

  document.getElementById('timer').innerHTML =
    timerText +
    `<br><small ${staminaColor}>Dawn Stamina: ${potentialStamina}</small>`

  if (gamePhase === 'NIGHT') {
    let timeLeft = Math.ceil((NIGHT_DURATION - phaseTimer) / 60)

    // Calculate current munch percentage
    let totalFliesInNight = fliesSpawnedThisNight + flies.length
    let currentMunchPercent =
      totalFliesInNight > 0
        ? Math.floor((fliesMunched / totalFliesInNight) * 100)
        : 0

    // Calculate predicted dawn stamina
    let predictedStamina
    if (currentMunchPercent >= 50) {
      predictedStamina = 100
    } else {
      predictedStamina = Math.floor(20 + currentMunchPercent * 2 * 0.8)
    }

    timerText = `${timeLeft}s • ${flies.length} flies`

    // Show special fly counts if any
    let goldenCount = flies.filter(f => f.type === 'golden').length
    let mothCount = flies.filter(f => f.type === 'moth').length
    let queenCount = flies.filter(f => f.type === 'queen').length

    if (goldenCount > 0 || mothCount > 0 || queenCount > 0) {
      let specialCounts = []
      if (queenCount > 0) specialCounts.push(`${queenCount}👑`)
      if (goldenCount > 0) specialCounts.push(`${goldenCount}✨`)
      if (mothCount > 0) specialCounts.push(`${mothCount}🦋`)
      timerText += ` (${specialCounts.join(' ')})`
    }
    // Show munch progress
    document.getElementById('timer').innerHTML =
      timerText +
      `<br><small style="color: ${
        predictedStamina < 40
          ? '#ff4444'
          : predictedStamina < 70
          ? '#ffaa44'
          : '#44ff44'
      }">` +
      `Munched: ${currentMunchPercent}% → ${predictedStamina} dawn stamina</small>`
  } else if (gamePhase === 'DAWN') {
    let timeLeft = Math.ceil((DAWN_DURATION - phaseTimer) / 60)
    // PHASE 4: Show birds and exhaustion status
    let activeBirds = birds.filter(b => b.attacking).length
    timerText = `${timeLeft}s • ${birds.length} birds`
    if (activeBirds > 0) timerText += ` (${activeBirds} attacking!)`
    if (isExhausted) timerText += ' EXHAUSTED!'
    if (phaseTimer < 180) {
      document.getElementById('timer').innerHTML =
        timerText +
        `<br><small style="color: #FFD700;">+${staminaBonus} from flies!</small>`
    }
    if (jumpStamina <= 20 && frameCount % 30 < 15) {
      document.getElementById('web-meter-fill').style.opacity = '0.5'
    } else {
      document.getElementById('web-meter-fill').style.opacity = '1'
    }
  } else if (gamePhase === 'DAY') {
    timerText = 'Rest & repair'
  } else if (gamePhase.includes('TO')) {
    timerText = '...'
  }
  document.getElementById('timer').textContent = timerText

  // Show difficulty indicators
  if (currentNight > 1) {
    let speedBonus = Math.floor((currentNight - 1) / 3) * 10
    let silkPenalty = Math.floor((currentNight - 1) / 5) * 5

    if (speedBonus > 0 || silkPenalty > 0) {
      let diffText = []
      if (speedBonus > 0) diffText.push(`Flies +${speedBonus}% speed`)
      if (silkPenalty > 0) diffText.push(`Silk -${silkPenalty}% regen`)

      // Add a small difficulty indicator if needed
      if (gamePhase === 'DUSK' && phaseTimer < 180) {
        document.getElementById('timer').textContent += ` (${diffText.join(
          ', '
        )})`
      }
    }
  }

  // PHASE 4: Update meter based on phase
  if (gamePhase === 'DAWN') {
    // Show stamina instead of silk during dawn
    document.getElementById('web-meter-label').textContent = 'STAMINA'

    // FIX: Always show percentage out of 100, not out of variable max
    let staminaPercent = (jumpStamina / 100) * 100 // Always out of 100
    document.getElementById('web-meter-fill').style.width = staminaPercent + '%'

    // Color based on stamina level
    if (jumpStamina < 20) {
      // Exhausted - red flash
      let flash = sin(frameCount * 0.3) * 0.5 + 0.5
      document.getElementById(
        'web-meter-fill'
      ).style.background = `linear-gradient(90deg, rgb(255, ${
        50 + flash * 50
      }, ${50 + flash * 50}), rgb(200, ${30 + flash * 30}, ${30 + flash * 30}))`
    } else if (jumpStamina < 40) {
      // Very tired - orange-red
      document.getElementById('web-meter-fill').style.background =
        'linear-gradient(90deg, #FF6B35, #FF4444)'
    } else if (jumpStamina < 60) {
      // Tired - orange
      document.getElementById('web-meter-fill').style.background =
        'linear-gradient(90deg, #FFA500, #FF8C00)'
    } else if (jumpStamina < 80) {
      // OK - yellow-orange
      document.getElementById('web-meter-fill').style.background =
        'linear-gradient(90deg, #FFD700, #FFA500)'
    } else {
      // Good stamina - green-yellow
      document.getElementById('web-meter-fill').style.background =
        'linear-gradient(90deg, #90EE90, #FFD700)'
    }

    // Show critical warning overlay
    if (jumpStamina <= 0 && !gameOver) {
      push()
      fill(255, 0, 0, 50 + sin(frameCount * 0.3) * 50)
      rect(0, 0, width, height)

      textAlign(CENTER)
      textSize(32)
      fill(255, 50, 50)
      stroke(0)
      strokeWeight(3)
      text('NO STAMINA - AVOID BIRDS!', width / 2, height / 2)
      pop()
    }
  } else {
    // Normal silk meter
    document.getElementById('web-meter-label').textContent = 'SILK'
    let meterPercent = (webSilk / maxWebSilk) * 100
    document.getElementById('web-meter-fill').style.width = meterPercent + '%'

    if (webSilk < 20) {
      let flash = sin(frameCount * 0.2) * 0.5 + 0.5
      document.getElementById(
        'web-meter-fill'
      ).style.background = `linear-gradient(90deg, rgb(255, ${
        100 + flash * 100
      }, ${100 + flash * 100}), rgb(255, ${150 + flash * 50}, ${
        150 + flash * 50
      }))`
    } else {
      document.getElementById('web-meter-fill').style.background =
        'linear-gradient(90deg, #87CEEB, #E0F6FF)'
    }
  }
}

function triggerGameOver (reason) {
  if (gameOver) return // Already game over

  gameOver = true
  gameOverTimer = 0
  deathReason = reason
  finalScore = totalFliesCaught

  // Save high score
  let highScore = localStorage.getItem('cobHighScore') || 0
  if (finalScore > highScore) {
    localStorage.setItem('cobHighScore', finalScore)
  }

  // Stop game music/sounds if any
  noLoop() // Pause the game

  // Show game over screen after a short delay
  setTimeout(showGameOverScreen, 1000)
}

// Add game over screen function:
function showGameOverScreen () {
  // Create game over overlay
  let gameOverHTML = `
        <div id="game-over-screen" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            color: white;
            font-family: Arial, sans-serif;
        ">
            <h1 style="color: #ff4444; font-size: 48px; margin-bottom: 20px;">GAME OVER</h1>
            <p style="font-size: 24px; color: #ffaaaa; margin-bottom: 30px;">${deathReason}</p>
            
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                <h2 style="color: #FFD700; margin-bottom: 15px;">Final Stats</h2>
                <p style="font-size: 20px;">Nights Survived: ${nightsSurvived}</p>
                <p style="font-size: 20px;">Total Flies Caught: ${finalScore}</p>
                <p style="font-size: 20px;">High Score: ${
                  localStorage.getItem('cobHighScore') || 0
                }</p>
            </div>
            
            <button onclick="restartGame()" style="
                padding: 15px 40px;
                font-size: 24px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s;
            " onmouseover="this.style.background='#5CBF60'" onmouseout="this.style.background='#4CAF50'">
                Try Again
            </button>
        </div>
    `

  document.body.insertAdjacentHTML('beforeend', gameOverHTML)
  // FIX: Add touch support to restart button
  let restartBtn = document.getElementById('restart-btn')
  restartBtn.addEventListener('click', restartGame)
  restartBtn.addEventListener('touchend', function (e) {
    e.preventDefault()
    restartGame()
  })
}

// Add restart game function:
window.restartGame = function () {
  // Remove game over screen
  let gameOverScreen = document.getElementById('game-over-screen')
  if (gameOverScreen) {
    gameOverScreen.remove()
  }

  // Reset game state
  gameOver = false
  gameOverTimer = 0
  deathReason = ''

  // Reset to initial values
  gamePhase = 'DUSK'
  phaseTimer = 0
  nightsSurvived = 0
  currentNight = 1
  fliesCaught = 0
  fliesMunched = 0
  playerPoints = 0
  totalFliesCaught = 0
  jumpStamina = 100
  maxJumpStamina = 100
  webSilk = 100

  // Clear entities
  flies = []
  birds = []
  webStrands = []
  particles = []
  notifications = []

  // Restart the game loop
  loop()

  // Respawn spider at home
  if (window.homeBranch) {
    let spiderStartX = window.homeBranch.endX
    let branchSurfaceY =
      window.homeBranch.y - window.homeBranch.thickness * 0.35
    spider.pos.x = spiderStartX
    spider.pos.y = branchSurfaceY - 8
    spider.vel.mult(0)
    spider.isAirborne = false
  }
}

// Input handlers
let touchStartTime = 0
let lastTapTime = 0
let touchHolding = false
let touchStartX = 0
let touchStartY = 0

function keyPressed () {
  if (key === ' ') {
    spacePressed = true
    return false
  }
  if (keyCode === SHIFT) {
    spider.munch()
    return false
  }
  // PHASE 3: Silk Recycle with R key
  if (key === 'r' || key === 'R') {
    if (upgrades.silkRecycle && upgrades.silkRecycle.level > 0) {
      recycleNearbyWeb()
    }
    return false
  }
  // PHASE 5: Stats panel with S key
  if (key === 's' || key === 'S') {
    if (gamePhase === 'DAY' || gamePhase === 'DUSK') {
      openStatsPanel()
    }
    return false
  }
}

function keyReleased () {
  if (key === ' ') {
    spacePressed = false

    // FIX: Check if web is floating when released
    if (isDeployingWeb && currentStrand && spider.isAirborne) {
      // Spider is still airborne - this would create a floating web
      // Remove the incomplete strand
      if (
        webStrands.length > 0 &&
        webStrands[webStrands.length - 1] === currentStrand
      ) {
        webStrands.pop()

        // Poof effect
        for (let i = 0; i < 5; i++) {
          let p = new Particle(spider.pos.x, spider.pos.y)
          p.color = color(255, 200, 200, 100)
          p.vel = createVector(random(-2, 2), random(-2, 2))
          p.size = 3
          particles.push(p)
        }
      }
    }

    isDeployingWeb = false
    currentStrand = null
    return false
  }
}

function mousePressed () {
  // Only handle mouse on desktop (not touch devices)
  if (touches.length === 0) {
    if (!spider.isAirborne) {
      // PHASE 3: Power Jump - start charging if upgrade unlocked
      if (upgrades.powerJump && upgrades.powerJump.level > 0) {
        chargingJump = true
        jumpChargeTime = 0
      } else {
        spider.jump(mouseX, mouseY)
      }
    }
  }
}

function mouseReleased () {
  // PHASE 3: Power Jump - release charged jump
  if (chargingJump && !spider.isAirborne) {
    let chargeRatio = min(jumpChargeTime / maxJumpCharge, 1)
    let chargeMultiplier = 1 + chargeRatio // 1x to 2x multiplier
    spider.jumpChargeVisual = 0
    spider.jump(mouseX, mouseY, chargeMultiplier)

    // Create charge release particles
    if (chargeRatio > 0.5) {
      for (let i = 0; i < 10; i++) {
        let p = new Particle(spider.pos.x, spider.pos.y)
        p.color = color(255, 255, 100)
        p.vel = createVector(random(-3, 3), random(-1, 2))
        p.size = 5
        particles.push(p)
      }
    }
  }
  chargingJump = false
  jumpChargeTime = 0
}

// PHASE 3: Silk Recycle function
function recycleNearbyWeb () {
  let recycled = false

  for (let i = webStrands.length - 1; i >= 0; i--) {
    let strand = webStrands[i]
    if (strand.broken) continue

    // Check if spider is near any part of the strand
    let nearStrand = false
    if (strand.path && strand.path.length > 0) {
      for (let point of strand.path) {
        if (dist(spider.pos.x, spider.pos.y, point.x, point.y) < 50) {
          nearStrand = true
          break
        }
      }
    }

    if (nearStrand) {
      // Recycle the strand
      webSilk = min(webSilk + 10, maxWebSilk) // Recover 50% of typical strand cost

      // Create recycling particles
      for (let j = 0; j < strand.path.length; j += 3) {
        let point = strand.path[j]
        let p = new Particle(point.x, point.y)
        p.color = color(150, 255, 150)
        p.vel = createVector(
          (spider.pos.x - point.x) * 0.02,
          (spider.pos.y - point.y) * 0.02
        )
        p.size = 3
        particles.push(p)
      }

      // Remove the strand
      webStrands.splice(i, 1)
      recycled = true

      // Show notification
      notifications.push(
        new Notification('Web Recycled +10 Silk', color(150, 255, 150))
      )
      break // Only recycle one strand at a time
    }
  }

  if (!recycled) {
    notifications.push(
      new Notification('No web nearby to recycle', color(255, 100, 100))
    )
  }
}

function touchStarted () {
  // FIX: Don't process game touches when modals are open
  if (
    shopOpen ||
    document.getElementById('stats-panel').style.display === 'block'
  ) {
    return false
  }

  if (touches.length > 0) {
    touchStartTime = millis()
    touchStartX = touches[0].x
    touchStartY = touches[0].y

    // Check for double tap on spider to munch
    let touchOnSpider =
      dist(touches[0].x, touches[0].y, spider.pos.x, spider.pos.y) < 30

    if (touchOnSpider && millis() - lastTapTime < 300) {
      // Double tap detected on spider - MUNCH!
      spider.munch()
      lastTapTime = 0 // Reset to prevent triple tap
    } else if (!spider.isAirborne) {
      // Single tap while on ground - jump
      spider.jump(touches[0].x, touches[0].y)
      lastTapTime = millis()
    } else if (spider.isAirborne && webSilk > 10 && !isDeployingWeb) {
      // Start web deployment if airborne (only if not already deploying)
      touchHolding = true
      isDeployingWeb = true
      currentStrand = new WebStrand(spider.lastAnchorPoint.copy(), null)
      currentStrand.path = [spider.lastAnchorPoint.copy()]

      for (let obstacle of obstacles) {
        let d = dist(
          spider.lastAnchorPoint.x,
          spider.lastAnchorPoint.y,
          obstacle.x,
          obstacle.y
        )
        // Check if anchor is on obstacle edge (within tolerance)
        if (abs(d - obstacle.radius) < 10) {
          currentStrand.startObstacle = obstacle
          currentStrand.startAngle = atan2(
            spider.lastAnchorPoint.y - obstacle.y,
            spider.lastAnchorPoint.x - obstacle.x
          )
          break
        }
      }

      webStrands.push(currentStrand)

      let newNode = new WebNode(
        spider.lastAnchorPoint.x,
        spider.lastAnchorPoint.y
      )
      // NEW: Track node attachment if on obstacle
      if (currentStrand.startObstacle) {
        newNode.attachedObstacle = currentStrand.startObstacle
        newNode.attachmentAngle = currentStrand.startAngle
      }
      webNodes.push(newNode)
    } else if (spider.isAirborne && isDeployingWeb) {
      // If already deploying and user taps again, just continue (don't create new strand)
      touchHolding = true
    }
  }
  return false // Prevent default
}

function touchMoved () {
  if (
    shopOpen ||
    document.getElementById('stats-panel').style.display === 'block'
  ) {
    return false
  }
  // Update web deployment target while holding
  if (
    touchHolding &&
    spider.isAirborne &&
    isDeployingWeb &&
    currentStrand &&
    webSilk > 0
  ) {
    // Web follows spider while deploying (not finger position)
    currentStrand.end = spider.pos.copy()
    if (frameCount % 2 === 0) {
      currentStrand.path.push(spider.pos.copy())
    }
  }
  return false // Prevent default
}

function touchEnded () {
  if (
    shopOpen ||
    document.getElementById('stats-panel').style.display === 'block'
  ) {
    return false
  }
  touchHolding = false
  touchProcessing = false

  // PHASE 3: Power Jump - release charged jump
  if (chargingJump && !spider.isAirborne) {
    let chargeRatio = min(jumpChargeTime / maxJumpCharge, 1)
    let chargeMultiplier = 1 + chargeRatio // 1x to 2x multiplier
    spider.jumpChargeVisual = 0

    // Use touch position if available, otherwise use last known position
    let targetX = touches.length > 0 ? touches[0].x : touchStartX
    let targetY = touches.length > 0 ? touches[0].y : touchStartY
    spider.jump(targetX, targetY, chargeMultiplier)

    // Create charge release particles
    if (chargeRatio > 0.5) {
      for (let i = 0; i < 10; i++) {
        let p = new Particle(spider.pos.x, spider.pos.y)
        p.color = color(255, 255, 100)
        p.vel = createVector(random(-3, 3), random(-1, 2))
        p.size = 5
        particles.push(p)
      }
    }
  }
  chargingJump = false
  jumpChargeTime = 0

  // FIX: Check if web is floating when touch released
  if (isDeployingWeb && currentStrand && spider.isAirborne) {
    // Spider is still airborne - this would create a floating web
    // Remove the incomplete strand
    if (
      webStrands.length > 0 &&
      webStrands[webStrands.length - 1] === currentStrand
    ) {
      webStrands.pop()

      // Poof effect
      for (let i = 0; i < 5; i++) {
        let p = new Particle(spider.pos.x, spider.pos.y)
        p.color = color(255, 200, 200, 100)
        p.vel = createVector(random(-2, 2), random(-2, 2))
        p.size = 3
        particles.push(p)
      }
    }
  }

  isDeployingWeb = false
  currentStrand = null

  return false
}

function windowResized () {
  resizeCanvas(window.innerWidth, window.innerHeight)
}
