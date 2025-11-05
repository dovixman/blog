// Easter Egg: Stick Man Game with Mobile Chaos Mode
(function() {
  'use strict';

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                || window.innerWidth <= 768;

  // Physics-enabled elements that can fall
  const physicsElements = new Map();

  // Game state
  const game = {
    active: false,
    isMobile: isMobile,
    chaosMode: false,
    stickMan: null,
    mouseX: 0,
    mouseY: 0,
    touchX: 0,
    touchY: 0,
    stickManX: 0,
    stickManY: 0,
    velocityX: 0,
    velocityY: 0,
    speed: isMobile ? 6 : 3,
    panicSpeed: isMobile ? 10 : 6,
    panicDistance: 150,
    animationFrame: null,
    obstacles: [],
    lastClickTime: 0,
    clickTimeout: null,
    lastDirectionChange: 0,
    directionChangeInterval: 2000,
    targetX: 0,
    targetY: 0,
    kickForce: 15,
    kickDistance: 60
  };

  // Physics constants
  const GRAVITY = 0.5;
  const BOUNCE_DAMPING = 0.6;
  const FRICTION = 0.98;
  const ROTATION_SPEED = 5;

  // Initialize the easter egg
  function init() {
    const logo = document.querySelector('.header-title');
    if (!logo) {
      console.warn('Logo element not found');
      return;
    }

    // Create stick man element
    createStickMan();

    // Add double-click listener to logo
    logo.addEventListener('click', handleLogoClick);

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
  }

  // Handle logo clicks (double-click detection)
  function handleLogoClick(e) {
    const now = Date.now();
    const timeDiff = now - game.lastClickTime;

    if (timeDiff < 500) {
      // Double-click detected
      e.preventDefault();
      activateEasterEgg();
      clearTimeout(game.clickTimeout);
    } else {
      // First click - wait for potential second click
      game.clickTimeout = setTimeout(() => {
        game.lastClickTime = 0;
      }, 500);
    }

    game.lastClickTime = now;
  }

  // Create stick man HTML element
  function createStickMan() {
    const stickMan = document.createElement('div');
    stickMan.id = 'stick-man';
    stickMan.className = 'running';
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

  // Activate the easter egg
  function activateEasterEgg() {
    if (game.active) return;

    game.active = true;
    game.chaosMode = isMobile;
    game.stickMan.classList.add('active', 'running');

    // Add chaos class for mobile mode
    if (game.chaosMode) {
      game.stickMan.classList.add('chaos');
    }

    // Spawn stick man at random position
    const spawnX = Math.random() * (window.innerWidth - 100) + 50;
    const spawnY = Math.random() * (window.innerHeight - 150) + 100;

    game.stickManX = spawnX;
    game.stickManY = spawnY;
    game.stickMan.style.left = spawnX + 'px';
    game.stickMan.style.top = spawnY + 'px';

    // Reset velocity
    game.velocityX = 0;
    game.velocityY = 0;

    // Update obstacles
    updateObstacles();

    // On mobile, set initial random target
    if (game.chaosMode) {
      setRandomTarget();
    }

    // Start game loop
    gameLoop();
  }

  // Update mouse position
  function handleMouseMove(e) {
    game.mouseX = e.clientX;
    game.mouseY = e.clientY;
  }

  // Handle touch events
  function handleTouch(e) {
    if (e.touches.length > 0) {
      game.touchX = e.touches[0].clientX;
      game.touchY = e.touches[0].clientY;
      game.mouseX = game.touchX;
      game.mouseY = game.touchY;
    }
  }

  // Handle stick man click (explosion)
  function handleStickManClick(e) {
    if (!game.active) return;

    e.preventDefault();
    e.stopPropagation();
    explodeStickMan();
  }

  // Explode and deactivate stick man
  function explodeStickMan() {
    game.active = false;
    game.stickMan.classList.remove('running', 'panic', 'chaos');
    game.stickMan.classList.add('exploding');

    // Stop animation loop
    if (game.animationFrame) {
      cancelAnimationFrame(game.animationFrame);
      game.animationFrame = null;
    }

    // Remove after animation
    setTimeout(() => {
      game.stickMan.classList.remove('active', 'exploding');

      // Clean up physics elements
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
    }, 500);
  }

  // Update obstacles (DOM elements)
  function updateObstacles() {
    game.obstacles = [];

    // Get all major elements as obstacles
    const selectors = [
      'header',
      'nav',
      'footer',
      'article',
      '.post',
      '.card',
      '.home-profile',
      '.home-avatar',
      '.single-title',
      '.content',
      '.page',
      '.pagination',
      '.post-footer',
      '.post-nav',
      'h1', 'h2', 'h3',
      'img',
      'p',
      'a.menu-item'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Skip if it's the stick man or its children
        if (el.id === 'stick-man' || el.closest('#stick-man')) return;

        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
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

  // Set random target for chaos mode
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

  // Apply physics to element
  function applyPhysicsToElement(element, kickVelX, kickVelY) {
    if (physicsElements.has(element)) return; // Already has physics

    const rect = element.getBoundingClientRect();
    const originalStyles = {
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      transform: element.style.transform,
      zIndex: element.style.zIndex
    };

    // Setup physics object
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

    // Make element absolutely positioned
    element.style.position = 'fixed';
    element.style.left = physics.x + 'px';
    element.style.top = physics.y + 'px';
    element.style.zIndex = '9999';
    element.style.transition = 'none';

    physicsElements.set(element, physics);
  }

  // Update physics for all affected elements
  function updatePhysics() {
    const toRemove = [];

    physicsElements.forEach((physics, element) => {
      // Apply gravity
      physics.velY += GRAVITY;

      // Apply friction
      physics.velX *= FRICTION;
      physics.velY *= FRICTION;

      // Update rotation
      physics.rotation += physics.rotationVel;

      // Update position
      physics.x += physics.velX;
      physics.y += physics.velY;

      // Check ground collision
      const groundY = window.innerHeight;
      if (physics.y + physics.height > groundY) {
        physics.y = groundY - physics.height;
        physics.velY *= -BOUNCE_DAMPING;
        physics.rotationVel *= BOUNCE_DAMPING;

        // Stop if velocity is low
        if (Math.abs(physics.velY) < 1 && Math.abs(physics.velX) < 1) {
          physics.grounded = true;
        }
      }

      // Check side boundaries
      if (physics.x < -physics.width / 2) {
        physics.x = -physics.width / 2;
        physics.velX *= -BOUNCE_DAMPING;
      }
      if (physics.x > window.innerWidth - physics.width / 2) {
        physics.x = window.innerWidth - physics.width / 2;
        physics.velX *= -BOUNCE_DAMPING;
      }

      // Apply transform
      element.style.left = physics.x + 'px';
      element.style.top = physics.y + 'px';
      element.style.transform = `rotate(${physics.rotation}deg)`;

      // Remove if element fell off screen bottom significantly
      if (physics.y > window.innerHeight + 500) {
        toRemove.push(element);
      }
    });

    // Clean up elements that fell off
    toRemove.forEach(element => {
      if (element && element.parentNode) {
        const physics = physicsElements.get(element);
        if (physics && physics.originalStyles) {
          // Restore original styles
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

  // Check collision and kick elements (chaos mode)
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
      // Skip if already has physics
      if (physicsElements.has(obstacle.element)) return;

      // Check collision
      if (stickManRect.right > obstacle.left &&
          stickManRect.left < obstacle.right &&
          stickManRect.bottom > obstacle.top &&
          stickManRect.top < obstacle.bottom) {

        // Calculate kick direction
        const dx = obstacle.centerX - stickManRect.centerX;
        const dy = obstacle.centerY - stickManRect.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < game.kickDistance) {
          const kickVelX = (dx / dist) * game.kickForce + game.velocityX * 2;
          const kickVelY = (dy / dist) * game.kickForce - 5; // Upward kick

          // Apply physics to kicked element
          applyPhysicsToElement(obstacle.element, kickVelX, kickVelY);
        }
      }
    });
  }

  // Check if position collides with obstacles
  function checkCollision(x, y, padding = 20) {
    const stickManRect = {
      left: x - padding,
      top: y - padding,
      right: x + 50 + padding,
      bottom: y + 80 + padding
    };

    for (let obstacle of game.obstacles) {
      // Skip elements with physics (they're falling)
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

  // Calculate movement (desktop mode - run from cursor)
  function calculateEscapeDirection() {
    // Calculate distance to mouse
    const dx = game.stickManX + 25 - game.mouseX;
    const dy = game.stickManY + 40 - game.mouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Determine if panic mode
    const isPanic = distance < game.panicDistance;
    const currentSpeed = isPanic ? game.panicSpeed : game.speed;

    // Update panic class
    if (isPanic) {
      game.stickMan.classList.add('panic');
    } else {
      game.stickMan.classList.remove('panic');
    }

    // Normalize direction (away from mouse)
    if (distance > 0) {
      const dirX = dx / distance;
      const dirY = dy / distance;

      // Apply acceleration
      game.velocityX += dirX * 0.5;
      game.velocityY += dirY * 0.5;

      // Limit velocity
      const velocityMag = Math.sqrt(game.velocityX * game.velocityX + game.velocityY * game.velocityY);
      if (velocityMag > currentSpeed) {
        game.velocityX = (game.velocityX / velocityMag) * currentSpeed;
        game.velocityY = (game.velocityY / velocityMag) * currentSpeed;
      }
    }

    updatePosition();
  }

  // Calculate movement (mobile chaos mode - random running)
  function calculateChaosMovement() {
    // Change direction randomly
    if (shouldChangeDirection()) {
      setRandomTarget();
    }

    // Move towards target
    const dx = game.targetX - (game.stickManX + 25);
    const dy = game.targetY - (game.stickManY + 40);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 10) {
      const dirX = dx / distance;
      const dirY = dy / distance;

      game.velocityX += dirX * 0.8;
      game.velocityY += dirY * 0.8;

      // Limit velocity
      const velocityMag = Math.sqrt(game.velocityX * game.velocityX + game.velocityY * game.velocityY);
      if (velocityMag > game.speed) {
        game.velocityX = (game.velocityX / velocityMag) * game.speed;
        game.velocityY = (game.velocityY / velocityMag) * game.speed;
      }
    }

    // Random chance to panic
    if (Math.random() < 0.01) {
      game.stickMan.classList.toggle('panic');
    }

    updatePosition();
    checkAndKickElements();
  }

  // Update stick man position
  function updatePosition() {
    // Calculate new position
    let newX = game.stickManX + game.velocityX;
    let newY = game.stickManY + game.velocityY;

    // Check collision with obstacles (that aren't falling)
    const collision = checkCollision(newX, newY);
    if (collision) {
      // Bounce away from obstacle
      const obstacleCenter = {
        x: (collision.left + collision.right) / 2,
        y: (collision.top + collision.bottom) / 2
      };

      const bounceX = game.stickManX + 25 - obstacleCenter.x;
      const bounceY = game.stickManY + 40 - obstacleCenter.y;
      const bounceDist = Math.sqrt(bounceX * bounceX + bounceY * bounceY);

      if (bounceDist > 0) {
        const currentSpeed = game.chaosMode ? game.speed : game.panicSpeed;
        game.velocityX = (bounceX / bounceDist) * currentSpeed;
        game.velocityY = (bounceY / bounceDist) * currentSpeed;
        newX = game.stickManX + game.velocityX;
        newY = game.stickManY + game.velocityY;
      }
    }

    // Keep within viewport bounds
    const margin = 10;
    if (newX < margin) {
      newX = margin;
      game.velocityX = Math.abs(game.velocityX);
      if (game.chaosMode) setRandomTarget();
    }
    if (newX > window.innerWidth - 60) {
      newX = window.innerWidth - 60;
      game.velocityX = -Math.abs(game.velocityX);
      if (game.chaosMode) setRandomTarget();
    }
    if (newY < margin) {
      newY = margin;
      game.velocityY = Math.abs(game.velocityY);
      if (game.chaosMode) setRandomTarget();
    }
    if (newY > window.innerHeight - 90) {
      newY = window.innerHeight - 90;
      game.velocityY = -Math.abs(game.velocityY);
      if (game.chaosMode) setRandomTarget();
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

  // Main game loop
  function gameLoop() {
    if (!game.active) return;

    // Update stick man movement
    if (game.chaosMode) {
      calculateChaosMovement();
    } else {
      calculateEscapeDirection();
    }

    // Update physics for falling elements
    updatePhysics();

    // Update stick man position
    game.stickMan.style.left = game.stickManX + 'px';
    game.stickMan.style.top = game.stickManY + 'px';

    // Continue loop
    game.animationFrame = requestAnimationFrame(gameLoop);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Update obstacles on window resize
  window.addEventListener('resize', () => {
    if (game.active) {
      updateObstacles();
    }
  });

  // Update obstacles on scroll (throttled)
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (!game.active) return;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      updateObstacles();
    }, 100);
  });

})();
