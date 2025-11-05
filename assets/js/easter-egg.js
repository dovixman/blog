// Easter Egg: Advanced Stick Man Game with Mobile Chaos Mode
(function() {
  'use strict';

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                || window.innerWidth <= 768;

  // Physics-enabled elements that can fall (mobile only)
  const physicsElements = new Map();

  // State constants
  const STATE = {
    HIDDEN: 'hidden',
    IDLE: 'idle',
    RUNNING: 'running',
    PANIC: 'panic',
    JUMPING: 'jumping',
    CLIMBING: 'climbing',
    EXPLODING: 'exploding'
  };

  // Game state
  const game = {
    active: false,
    isMobile: isMobile,
    chaosMode: false,
    state: STATE.HIDDEN,
    stickMan: null,
    mouseX: 0,
    mouseY: 0,
    touchX: 0,
    touchY: 0,
    stickManX: 0,
    stickManY: 0,
    velocityX: 0,
    velocityY: 0,
    isJumping: false,
    isClimbing: false,
    jumpStartY: 0,
    climbProgress: 0,
    climbTarget: null,
    speed: isMobile ? 6 : 4,
    panicSpeed: isMobile ? 10 : 8,
    panicDistance: 200,
    jumpDistance: 120,
    animationFrame: null,
    obstacles: [],
    lastObstacleUpdate: 0,
    stateChangeTime: 0,
    minStateTime: 300,
    lastJumpTime: 0,
    jumpCooldown: 1000,
    // Mobile chaos mode specific
    lastDirectionChange: 0,
    directionChangeInterval: 2000,
    targetX: 0,
    targetY: 0,
    kickForce: 15,
    kickDistance: 60
  };

  // Physics constants (mobile only)
  const GRAVITY = 0.5;
  const BOUNCE_DAMPING = 0.6;
  const FRICTION = 0.98;
  const ROTATION_SPEED = 5;

  // Easing functions for smooth movement
  const easing = {
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOutCubic: (t) => (--t) * t * t + 1
  };

  // Initialize the easter egg
  function init() {
    createStickMan();
    spawnHiddenTrigger();

    // Track mouse/touch position
    if (isMobile) {
      document.addEventListener('touchstart', handleTouch);
      document.addEventListener('touchmove', handleTouch);
    } else {
      document.addEventListener('mousemove', handleMouseMove);
    }

    // Handle stick man click/tap
    game.stickMan.addEventListener('click', handleStickManClick);
    if (isMobile) {
      game.stickMan.addEventListener('touchstart', handleStickManClick);
    }

    // Update obstacles periodically
    window.addEventListener('resize', () => {
      if (game.active) updateObstacles();
    });

    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (!game.active) return;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateObstacles, 100);
    });
  }

  // Create stick man HTML element
  function createStickMan() {
    const stickMan = document.createElement('div');
    stickMan.id = 'stick-man';
    stickMan.innerHTML = `
      <div class="stick-man-body">
        <div class="stick-man-head"></div>
        <div class="stick-man-torso"></div>
        <div class="stick-man-arm left"></div>
        <div class="stick-man-arm right"></div>
        <div class="stick-man-leg left"></div>
        <div class="stick-man-leg right"></div>
      </div>
    `;
    document.body.appendChild(stickMan);
    game.stickMan = stickMan;
  }

  // Spawn stick man in hidden corner
  function spawnHiddenTrigger() {
    const corners = [
      { x: -15, y: -20, name: 'top-left' },
      { x: window.innerWidth - 35, y: -20, name: 'top-right' },
      { x: -15, y: window.innerHeight - 60, name: 'bottom-left' },
      { x: window.innerWidth - 35, y: window.innerHeight - 60, name: 'bottom-right' }
    ];

    // Random corner
    const corner = corners[Math.floor(Math.random() * corners.length)];

    game.stickManX = corner.x;
    game.stickManY = corner.y;
    game.stickMan.style.left = corner.x + 'px';
    game.stickMan.style.top = corner.y + 'px';

    game.stickMan.classList.add('active', 'hidden-trigger', 'idle');
    game.state = STATE.HIDDEN;
  }

  // Update mouse position
  function handleMouseMove(e) {
    game.mouseX = e.clientX;
    game.mouseY = e.clientY;
  }

  // Handle touch events (mobile)
  function handleTouch(e) {
    if (e.touches.length > 0) {
      game.touchX = e.touches[0].clientX;
      game.touchY = e.touches[0].clientY;
      game.mouseX = game.touchX;
      game.mouseY = game.touchY;
    }
  }

  // Handle stick man click
  function handleStickManClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (game.state === STATE.HIDDEN) {
      // Start the game!
      startGame();
    } else if (game.active && game.state !== STATE.EXPLODING) {
      // Caught the stick man!
      explodeStickMan();
    }
  }

  // Start the game
  function startGame() {
    game.active = true;
    game.chaosMode = isMobile; // Enable chaos mode on mobile
    game.state = STATE.RUNNING;
    game.stateChangeTime = Date.now();
    game.stickMan.classList.remove('hidden-trigger', 'idle');
    game.stickMan.classList.add('running');

    // Add chaos class for mobile mode
    if (game.chaosMode) {
      game.stickMan.classList.add('chaos');
      setRandomTarget();
    }

    // Move to center of screen briefly
    game.stickManX = window.innerWidth / 2 - 25;
    game.stickManY = window.innerHeight / 2 - 40;

    updateObstacles();
    gameLoop();
  }

  // Explode and deactivate stick man
  function explodeStickMan() {
    game.active = false;
    game.state = STATE.EXPLODING;
    clearState();
    game.stickMan.classList.add('exploding');

    if (game.animationFrame) {
      cancelAnimationFrame(game.animationFrame);
      game.animationFrame = null;
    }

    // Reset after explosion
    setTimeout(() => {
      game.stickMan.classList.remove('active', 'exploding');
      game.velocityX = 0;
      game.velocityY = 0;
      game.isJumping = false;
      game.isClimbing = false;

      // Clean up physics elements (mobile chaos mode)
      physicsElements.forEach((physics, element) => {
        if (element && element.parentNode) {
          element.style.transform = '';
          element.style.position = '';
          element.style.left = '';
          element.style.top = '';
          element.style.zIndex = '';
        }
      });
      physicsElements.clear();

      // Respawn in hidden corner after 3 seconds
      setTimeout(spawnHiddenTrigger, 3000);
    }, 600);
  }

  // Clear all state classes
  function clearState() {
    game.stickMan.classList.remove('idle', 'running', 'panic', 'jumping', 'climbing', 'flip', 'chaos');
  }

  // Update obstacles (DOM elements)
  function updateObstacles() {
    const now = Date.now();
    if (now - game.lastObstacleUpdate < 500) return; // Throttle
    game.lastObstacleUpdate = now;

    game.obstacles = [];

    const selectors = [
      'header', 'nav', 'footer', 'article', '.post', '.card',
      '.home-profile', '.home-avatar', '.single-title',
      '.content', '.page', '.pagination', '.post-footer',
      '.post-nav', 'h1', 'h2', 'h3', 'img', '.button', 'p', 'a.menu-item'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.id === 'stick-man' || el.closest('#stick-man')) return;

        const rect = el.getBoundingClientRect();
        if (rect.width > 20 && rect.height > 20) {
          game.obstacles.push({
            element: el,
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
            right: rect.right + window.scrollX,
            bottom: rect.bottom + window.scrollY,
            width: rect.width,
            height: rect.height,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2
          });
        }
      });
    });
  }

  // Set random target for chaos mode (mobile)
  function setRandomTarget() {
    game.targetX = Math.random() * window.innerWidth;
    game.targetY = Math.random() * window.innerHeight;
    game.speed = 3 + Math.random() * 5; // Random speed 3-8
    game.lastDirectionChange = Date.now();
  }

  // Check if should change direction (mobile chaos mode)
  function shouldChangeDirection() {
    const now = Date.now();
    if (now - game.lastDirectionChange > game.directionChangeInterval) {
      return true;
    }

    // Also change if reached target
    const dx = game.stickManX - game.targetX;
    const dy = game.stickManY - game.targetY;
    const distToTarget = Math.sqrt(dx * dx + dy * dy);
    return distToTarget < 50;
  }

  // Apply physics to element (mobile chaos mode)
  function applyPhysicsToElement(element, kickVelX, kickVelY) {
    if (physicsElements.has(element)) return;

    const rect = element.getBoundingClientRect();
    const originalStyles = {
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      transform: element.style.transform,
      zIndex: element.style.zIndex
    };

    const physics = {
      x: rect.left,
      y: rect.top,
      velX: kickVelX,
      velY: kickVelY,
      rotation: 0,
      rotationVel: (Math.random() - 0.5) * ROTATION_SPEED * 2,
      width: rect.width,
      height: rect.height,
      originalStyles: originalStyles,
      grounded: false
    };

    element.style.position = 'fixed';
    element.style.left = physics.x + 'px';
    element.style.top = physics.y + 'px';
    element.style.zIndex = '9999';
    element.style.transition = 'none';

    physicsElements.set(element, physics);
  }

  // Update physics for all affected elements (mobile chaos mode)
  function updatePhysics() {
    const toRemove = [];

    physicsElements.forEach((physics, element) => {
      physics.velY += GRAVITY;
      physics.velX *= FRICTION;
      physics.velY *= FRICTION;
      physics.rotation += physics.rotationVel;
      physics.x += physics.velX;
      physics.y += physics.velY;

      const groundY = window.innerHeight;
      if (physics.y + physics.height > groundY) {
        physics.y = groundY - physics.height;
        physics.velY *= -BOUNCE_DAMPING;
        physics.rotationVel *= BOUNCE_DAMPING;

        if (Math.abs(physics.velY) < 1 && Math.abs(physics.velX) < 1) {
          physics.grounded = true;
        }
      }

      if (physics.x < -physics.width / 2) {
        physics.x = -physics.width / 2;
        physics.velX *= -BOUNCE_DAMPING;
      }
      if (physics.x > window.innerWidth - physics.width / 2) {
        physics.x = window.innerWidth - physics.width / 2;
        physics.velX *= -BOUNCE_DAMPING;
      }

      element.style.left = physics.x + 'px';
      element.style.top = physics.y + 'px';
      element.style.transform = `rotate(${physics.rotation}deg)`;

      if (physics.y > window.innerHeight + 500) {
        toRemove.push(element);
      }
    });

    toRemove.forEach(element => {
      if (element && element.parentNode) {
        const physics = physicsElements.get(element);
        if (physics && physics.originalStyles) {
          element.style.position = physics.originalStyles.position;
          element.style.left = physics.originalStyles.left;
          element.style.top = physics.originalStyles.top;
          element.style.transform = physics.originalStyles.transform;
          element.style.zIndex = physics.originalStyles.zIndex;
        }
      }
      physicsElements.delete(element);
    });
  }

  // Check collision and kick elements (mobile chaos mode)
  function checkAndKickElements() {
    if (!game.chaosMode) return;

    const stickManRect = {
      left: game.stickManX,
      top: game.stickManY,
      right: game.stickManX + 50,
      bottom: game.stickManY + 80,
      centerX: game.stickManX + 25,
      centerY: game.stickManY + 40
    };

    game.obstacles.forEach(obstacle => {
      if (physicsElements.has(obstacle.element)) return;

      if (stickManRect.right > obstacle.left &&
          stickManRect.left < obstacle.right &&
          stickManRect.bottom > obstacle.top &&
          stickManRect.top < obstacle.bottom) {

        const dx = obstacle.centerX - stickManRect.centerX;
        const dy = obstacle.centerY - stickManRect.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < game.kickDistance) {
          const kickVelX = (dx / dist) * game.kickForce + game.velocityX * 2;
          const kickVelY = (dy / dist) * game.kickForce - 5;

          applyPhysicsToElement(obstacle.element, kickVelX, kickVelY);
        }
      }
    });
  }

  // Check collision with obstacles
  function checkCollision(x, y, padding = 25) {
    const stickManRect = {
      left: x - padding,
      top: y - padding,
      right: x + 50 + padding,
      bottom: y + 80 + padding,
      centerX: x + 25,
      centerY: y + 40
    };

    for (let obstacle of game.obstacles) {
      if (physicsElements.has(obstacle.element)) continue;

      if (stickManRect.right > obstacle.left &&
          stickManRect.left < obstacle.right &&
          stickManRect.bottom > obstacle.top &&
          stickManRect.top < obstacle.bottom) {
        return obstacle;
      }
    }
    return null;
  }

  // Find nearest obstacle in direction (desktop mode)
  function findObstacleInPath(x, y, dirX, dirY, maxDist = 150) {
    let nearest = null;
    let minDist = maxDist;

    for (let obstacle of game.obstacles) {
      const toObstacleX = obstacle.centerX - (x + 25);
      const toObstacleY = obstacle.centerY - (y + 40);
      const dist = Math.sqrt(toObstacleX * toObstacleX + toObstacleY * toObstacleY);

      if (dist < minDist) {
        const dot = (toObstacleX * dirX + toObstacleY * dirY) / dist;
        if (dot > 0.3) {
          nearest = obstacle;
          minDist = dist;
        }
      }
    }

    return nearest;
  }

  // Decide if should jump over obstacle (desktop mode)
  function shouldJump(obstacle) {
    const now = Date.now();
    if (now - game.lastJumpTime < game.jumpCooldown) return false;
    if (!obstacle) return false;
    return obstacle.height < 100 && obstacle.height > 30;
  }

  // Decide if should climb obstacle (desktop mode)
  function shouldClimb(obstacle) {
    if (!obstacle) return false;
    return obstacle.height >= 100 && obstacle.height < 400;
  }

  // Start jump (desktop mode)
  function startJump() {
    if (game.isJumping || game.isClimbing) return;
    game.isJumping = true;
    game.jumpStartY = game.stickManY;
    game.lastJumpTime = Date.now();
    changeState(STATE.JUMPING);
  }

  // Start climb (desktop mode)
  function startClimb(obstacle) {
    if (game.isJumping || game.isClimbing) return;
    if (!obstacle) return;
    game.isClimbing = true;
    game.climbTarget = obstacle;
    game.climbProgress = 0;
    changeState(STATE.CLIMBING);
  }

  // Change state with animation
  function changeState(newState) {
    if (game.state === newState) return;

    const now = Date.now();
    if (now - game.stateChangeTime < game.minStateTime) return;

    clearState();
    game.state = newState;
    game.stateChangeTime = now;

    switch (newState) {
      case STATE.IDLE:
        game.stickMan.classList.add('idle');
        break;
      case STATE.RUNNING:
        game.stickMan.classList.add('running');
        break;
      case STATE.PANIC:
        game.stickMan.classList.add('panic', 'running');
        break;
      case STATE.JUMPING:
        game.stickMan.classList.add('jumping');
        break;
      case STATE.CLIMBING:
        game.stickMan.classList.add('climbing');
        break;
    }
  }

  // Calculate intelligent movement (desktop mode)
  function calculateMovement() {
    const dx = game.stickManX + 25 - game.mouseX;
    const dy = game.stickManY + 40 - game.mouseY;
    const distanceToMouse = Math.sqrt(dx * dx + dy * dy);

    const isPanic = distanceToMouse < game.panicDistance;
    const currentSpeed = isPanic ? game.panicSpeed : game.speed;

    if (!game.isJumping && !game.isClimbing) {
      if (isPanic && game.state !== STATE.PANIC) {
        changeState(STATE.PANIC);
      } else if (!isPanic && game.state === STATE.PANIC) {
        changeState(STATE.RUNNING);
      }
    }

    // Handle jumping
    if (game.isJumping) {
      const jumpDuration = 500;
      const jumpTime = Date.now() - game.lastJumpTime;
      const jumpProgress = Math.min(jumpTime / jumpDuration, 1);

      if (jumpProgress >= 1) {
        game.isJumping = false;
        changeState(isPanic ? STATE.PANIC : STATE.RUNNING);
      } else {
        const jumpHeight = 80;
        const t = jumpProgress;
        const arc = -4 * jumpHeight * (t * t - t);
        game.stickManY = game.jumpStartY - arc;
      }
    }

    // Handle climbing
    if (game.isClimbing && game.climbTarget) {
      game.climbProgress += 0.015;

      if (game.climbProgress >= 1) {
        game.isClimbing = false;
        game.stickManY = game.climbTarget.top - 85;
        game.climbTarget = null;
        changeState(isPanic ? STATE.PANIC : STATE.RUNNING);
      } else {
        const startY = game.climbTarget.bottom;
        const endY = game.climbTarget.top - 85;
        game.stickManY = startY + (endY - startY) * easing.easeInOutQuad(game.climbProgress);

        const obstacleEdge = (dx > 0) ? game.climbTarget.right : game.climbTarget.left - 50;
        game.stickManX += (obstacleEdge - game.stickManX) * 0.1;
      }
    }

    // Normal movement (running)
    if (!game.isJumping && !game.isClimbing) {
      if (distanceToMouse > 0) {
        const dirX = dx / distanceToMouse;
        const dirY = dy / distanceToMouse;

        game.velocityX += dirX * 0.8;
        game.velocityY += dirY * 0.8;

        game.velocityX *= 0.85;
        game.velocityY *= 0.85;

        const velocityMag = Math.sqrt(game.velocityX * game.velocityX + game.velocityY * game.velocityY);
        if (velocityMag > currentSpeed) {
          game.velocityX = (game.velocityX / velocityMag) * currentSpeed;
          game.velocityY = (game.velocityY / velocityMag) * currentSpeed;
        }
      }

      let newX = game.stickManX + game.velocityX;
      let newY = game.stickManY + game.velocityY;

      const moveDir = {
        x: game.velocityX / Math.max(Math.abs(game.velocityX), 0.1),
        y: game.velocityY / Math.max(Math.abs(game.velocityY), 0.1)
      };

      const obstacleAhead = findObstacleInPath(
        game.stickManX,
        game.stickManY,
        moveDir.x,
        moveDir.y,
        distanceToMouse < game.jumpDistance ? 100 : 150
      );

      if (obstacleAhead && distanceToMouse < game.jumpDistance) {
        if (shouldJump(obstacleAhead)) {
          startJump();
        } else if (shouldClimb(obstacleAhead)) {
          startClimb(obstacleAhead);
        }
      }

      const collision = checkCollision(newX, newY);
      if (collision) {
        const bounceX = (game.stickManX + 25) - collision.centerX;
        const bounceY = (game.stickManY + 40) - collision.centerY;
        const bounceDist = Math.sqrt(bounceX * bounceX + bounceY * bounceY);

        if (bounceDist > 0) {
          game.velocityX = (bounceX / bounceDist) * currentSpeed * 1.2;
          game.velocityY = (bounceY / bounceDist) * currentSpeed * 1.2;
          newX = game.stickManX + game.velocityX;
          newY = game.stickManY + game.velocityY;
        }
      }

      const margin = 20;
      if (newX < margin) {
        newX = margin;
        game.velocityX = Math.abs(game.velocityX) * 0.8;
      }
      if (newX > window.innerWidth - 70) {
        newX = window.innerWidth - 70;
        game.velocityX = -Math.abs(game.velocityX) * 0.8;
      }
      if (newY < margin) {
        newY = margin;
        game.velocityY = Math.abs(game.velocityY) * 0.8;
      }
      if (newY > window.innerHeight - 100) {
        newY = window.innerHeight - 100;
        game.velocityY = -Math.abs(game.velocityY) * 0.8;
      }

      game.stickManX = newX;
      game.stickManY = newY;

      if (game.velocityX < -0.5) {
        game.stickMan.classList.add('flip');
      } else if (game.velocityX > 0.5) {
        game.stickMan.classList.remove('flip');
      }
    }
  }

  // Calculate movement (mobile chaos mode)
  function calculateChaosMovement() {
    if (shouldChangeDirection()) {
      setRandomTarget();
    }

    const dx = game.targetX - (game.stickManX + 25);
    const dy = game.targetY - (game.stickManY + 40);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 10) {
      const dirX = dx / distance;
      const dirY = dy / distance;

      game.velocityX += dirX * 0.8;
      game.velocityY += dirY * 0.8;

      const velocityMag = Math.sqrt(game.velocityX * game.velocityX + game.velocityY * game.velocityY);
      if (velocityMag > game.speed) {
        game.velocityX = (game.velocityX / velocityMag) * game.speed;
        game.velocityY = (game.velocityY / velocityMag) * game.speed;
      }
    }

    if (Math.random() < 0.01) {
      game.stickMan.classList.toggle('panic');
    }

    let newX = game.stickManX + game.velocityX;
    let newY = game.stickManY + game.velocityY;

    const collision = checkCollision(newX, newY);
    if (collision) {
      const bounceX = (game.stickManX + 25) - collision.centerX;
      const bounceY = (game.stickManY + 40) - collision.centerY;
      const bounceDist = Math.sqrt(bounceX * bounceX + bounceY * bounceY);

      if (bounceDist > 0) {
        game.velocityX = (bounceX / bounceDist) * game.speed * 1.2;
        game.velocityY = (bounceY / bounceDist) * game.speed * 1.2;
        newX = game.stickManX + game.velocityX;
        newY = game.stickManY + game.velocityY;
      }
    }

    const margin = 10;
    if (newX < margin) {
      newX = margin;
      game.velocityX = Math.abs(game.velocityX);
      setRandomTarget();
    }
    if (newX > window.innerWidth - 60) {
      newX = window.innerWidth - 60;
      game.velocityX = -Math.abs(game.velocityX);
      setRandomTarget();
    }
    if (newY < margin) {
      newY = margin;
      game.velocityY = Math.abs(game.velocityY);
      setRandomTarget();
    }
    if (newY > window.innerHeight - 90) {
      newY = window.innerHeight - 90;
      game.velocityY = -Math.abs(game.velocityY);
      setRandomTarget();
    }

    game.stickManX = newX;
    game.stickManY = newY;

    if (game.velocityX < -0.5) {
      game.stickMan.classList.add('flip');
    } else if (game.velocityX > 0.5) {
      game.stickMan.classList.remove('flip');
    }

    checkAndKickElements();
  }

  // Main game loop
  function gameLoop() {
    if (!game.active) return;

    // Update stick man movement
    if (game.chaosMode) {
      calculateChaosMovement();
    } else {
      calculateMovement();
    }

    // Update physics for falling elements (mobile chaos mode)
    if (game.chaosMode) {
      updatePhysics();
    }

    // Update position
    game.stickMan.style.left = Math.round(game.stickManX) + 'px';
    game.stickMan.style.top = Math.round(game.stickManY) + 'px';

    // Continue loop
    game.animationFrame = requestAnimationFrame(gameLoop);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
