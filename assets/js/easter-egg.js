// Easter Egg: Advanced Stick Man Game
(function() {
  'use strict';

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
    state: STATE.HIDDEN,
    stickMan: null,
    mouseX: 0,
    mouseY: 0,
    stickManX: 0,
    stickManY: 0,
    velocityX: 0,
    velocityY: 0,
    isJumping: false,
    isClimbing: false,
    jumpStartY: 0,
    climbProgress: 0,
    climbTarget: null,
    speed: 4,
    panicSpeed: 8,
    panicDistance: 200,
    jumpDistance: 120,
    animationFrame: null,
    obstacles: [],
    lastObstacleUpdate: 0,
    stateChangeTime: 0,
    minStateTime: 300,
    lastJumpTime: 0,
    jumpCooldown: 1000
  };

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

    // Track mouse position
    document.addEventListener('mousemove', handleMouseMove);

    // Handle stick man click
    game.stickMan.addEventListener('click', handleStickManClick);

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
      { x: -15, y: -20, name: 'top-left' },      // partially hidden top-left
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

  // Handle stick man click
  function handleStickManClick(e) {
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
    game.state = STATE.RUNNING;
    game.stateChangeTime = Date.now();
    game.stickMan.classList.remove('hidden-trigger', 'idle');
    game.stickMan.classList.add('running');

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

      // Respawn in hidden corner after 3 seconds
      setTimeout(spawnHiddenTrigger, 3000);
    }, 600);
  }

  // Clear all state classes
  function clearState() {
    game.stickMan.classList.remove('idle', 'running', 'panic', 'jumping', 'climbing', 'flip');
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
      '.post-nav', 'h1', 'h2', 'h3', 'img', '.button'
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
      if (stickManRect.right > obstacle.left &&
          stickManRect.left < obstacle.right &&
          stickManRect.bottom > obstacle.top &&
          stickManRect.top < obstacle.bottom) {
        return obstacle;
      }
    }
    return null;
  }

  // Find nearest obstacle in direction
  function findObstacleInPath(x, y, dirX, dirY, maxDist = 150) {
    let nearest = null;
    let minDist = maxDist;

    for (let obstacle of game.obstacles) {
      const toObstacleX = obstacle.centerX - (x + 25);
      const toObstacleY = obstacle.centerY - (y + 40);
      const dist = Math.sqrt(toObstacleX * toObstacleX + toObstacleY * toObstacleY);

      if (dist < minDist) {
        // Check if obstacle is roughly in the direction we're moving
        const dot = (toObstacleX * dirX + toObstacleY * dirY) / dist;
        if (dot > 0.3) { // 0 = perpendicular, 1 = same direction
          nearest = obstacle;
          minDist = dist;
        }
      }
    }

    return nearest;
  }

  // Decide if should jump over obstacle
  function shouldJump(obstacle) {
    const now = Date.now();
    if (now - game.lastJumpTime < game.jumpCooldown) return false;
    if (!obstacle) return false;

    // Jump over small-ish obstacles
    return obstacle.height < 100 && obstacle.height > 30;
  }

  // Decide if should climb obstacle
  function shouldClimb(obstacle) {
    if (!obstacle) return false;

    // Climb tall obstacles
    return obstacle.height >= 100 && obstacle.height < 400;
  }

  // Start jump
  function startJump() {
    if (game.isJumping || game.isClimbing) return;

    game.isJumping = true;
    game.jumpStartY = game.stickManY;
    game.lastJumpTime = Date.now();
    changeState(STATE.JUMPING);
  }

  // Start climb
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

  // Calculate intelligent movement
  function calculateMovement() {
    // Calculate distance to mouse
    const dx = game.stickManX + 25 - game.mouseX;
    const dy = game.stickManY + 40 - game.mouseY;
    const distanceToMouse = Math.sqrt(dx * dx + dy * dy);

    // Determine panic mode
    const isPanic = distanceToMouse < game.panicDistance;
    const currentSpeed = isPanic ? game.panicSpeed : game.speed;

    // Update state based on distance
    if (!game.isJumping && !game.isClimbing) {
      if (isPanic && game.state !== STATE.PANIC) {
        changeState(STATE.PANIC);
      } else if (!isPanic && game.state === STATE.PANIC) {
        changeState(STATE.RUNNING);
      }
    }

    // Handle jumping
    if (game.isJumping) {
      const jumpDuration = 500; // ms
      const jumpTime = Date.now() - game.lastJumpTime;
      const jumpProgress = Math.min(jumpTime / jumpDuration, 1);

      if (jumpProgress >= 1) {
        game.isJumping = false;
        changeState(isPanic ? STATE.PANIC : STATE.RUNNING);
      } else {
        // Parabolic jump arc
        const jumpHeight = 80;
        const t = jumpProgress;
        const arc = -4 * jumpHeight * (t * t - t); // Parabola
        game.stickManY = game.jumpStartY - arc;
      }
    }

    // Handle climbing
    if (game.isClimbing && game.climbTarget) {
      game.climbProgress += 0.015;

      if (game.climbProgress >= 1) {
        // Finished climbing, move to top of obstacle
        game.isClimbing = false;
        game.stickManY = game.climbTarget.top - 85;
        game.climbTarget = null;
        changeState(isPanic ? STATE.PANIC : STATE.RUNNING);
      } else {
        // Climbing up the obstacle
        const startY = game.climbTarget.bottom;
        const endY = game.climbTarget.top - 85;
        game.stickManY = startY + (endY - startY) * easing.easeInOutQuad(game.climbProgress);

        // Move along the obstacle side
        const obstacleEdge = (dx > 0) ? game.climbTarget.right : game.climbTarget.left - 50;
        game.stickManX += (obstacleEdge - game.stickManX) * 0.1;
      }
    }

    // Normal movement (running)
    if (!game.isJumping && !game.isClimbing) {
      // Normalize escape direction (away from mouse)
      if (distanceToMouse > 0) {
        const dirX = dx / distanceToMouse;
        const dirY = dy / distanceToMouse;

        // Apply acceleration with momentum
        game.velocityX += dirX * 0.8;
        game.velocityY += dirY * 0.8;

        // Apply friction
        game.velocityX *= 0.85;
        game.velocityY *= 0.85;

        // Limit velocity
        const velocityMag = Math.sqrt(game.velocityX * game.velocityX + game.velocityY * game.velocityY);
        if (velocityMag > currentSpeed) {
          game.velocityX = (game.velocityX / velocityMag) * currentSpeed;
          game.velocityY = (game.velocityY / velocityMag) * currentSpeed;
        }
      }

      // Calculate new position
      let newX = game.stickManX + game.velocityX;
      let newY = game.stickManY + game.velocityY;

      // Check for obstacles ahead
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

      // Decide action based on obstacle
      if (obstacleAhead && distanceToMouse < game.jumpDistance) {
        if (shouldJump(obstacleAhead)) {
          startJump();
        } else if (shouldClimb(obstacleAhead)) {
          startClimb(obstacleAhead);
        }
      }

      // Check collision with current position
      const collision = checkCollision(newX, newY);
      if (collision) {
        // Bounce away from obstacle center
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

      // Keep within viewport with padding
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

      // Update flip direction
      if (game.velocityX < -0.5) {
        game.stickMan.classList.add('flip');
      } else if (game.velocityX > 0.5) {
        game.stickMan.classList.remove('flip');
      }
    }
  }

  // Main game loop
  function gameLoop() {
    if (!game.active) return;

    calculateMovement();

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
