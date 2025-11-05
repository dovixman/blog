// Easter Egg: Stick Man Game
(function() {
  'use strict';

  // Game state
  const game = {
    active: false,
    stickMan: null,
    mouseX: 0,
    mouseY: 0,
    stickManX: 0,
    stickManY: 0,
    velocityX: 0,
    velocityY: 0,
    speed: 3,
    panicSpeed: 6,
    panicDistance: 150,
    animationFrame: null,
    obstacles: [],
    lastClickTime: 0,
    clickTimeout: null
  };

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

    // Track mouse position
    document.addEventListener('mousemove', handleMouseMove);

    // Handle stick man click
    game.stickMan.addEventListener('click', handleStickManClick);
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
    game.stickMan.classList.add('active', 'running');

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

    // Start game loop
    gameLoop();
  }

  // Update mouse position
  function handleMouseMove(e) {
    game.mouseX = e.clientX;
    game.mouseY = e.clientY;
  }

  // Handle stick man click (explosion)
  function handleStickManClick(e) {
    if (!game.active) return;

    e.stopPropagation();
    explodeStickMan();
  }

  // Explode and deactivate stick man
  function explodeStickMan() {
    game.active = false;
    game.stickMan.classList.remove('running', 'panic');
    game.stickMan.classList.add('exploding');

    // Stop animation loop
    if (game.animationFrame) {
      cancelAnimationFrame(game.animationFrame);
      game.animationFrame = null;
    }

    // Remove after animation
    setTimeout(() => {
      game.stickMan.classList.remove('active', 'exploding');
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
      '.post-nav'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Skip if it's the stick man or its children
        if (el.id === 'stick-man' || el.closest('#stick-man')) return;

        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          game.obstacles.push({
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
            right: rect.right + window.scrollX,
            bottom: rect.bottom + window.scrollY,
            width: rect.width,
            height: rect.height
          });
        }
      });
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
      if (stickManRect.right > obstacle.left &&
          stickManRect.left < obstacle.right &&
          stickManRect.bottom > obstacle.top &&
          stickManRect.top < obstacle.bottom) {
        return obstacle;
      }
    }
    return null;
  }

  // Calculate escape direction from mouse
  function calculateEscapeDirection() {
    // Calculate distance to mouse
    const dx = game.stickManX + 25 - game.mouseX; // +25 to center
    const dy = game.stickManY + 40 - game.mouseY; // +40 to center
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

    // Calculate new position
    let newX = game.stickManX + game.velocityX;
    let newY = game.stickManY + game.velocityY;

    // Check collision with obstacles
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
    }
    if (newX > window.innerWidth - 60) {
      newX = window.innerWidth - 60;
      game.velocityX = -Math.abs(game.velocityX);
    }
    if (newY < margin) {
      newY = margin;
      game.velocityY = Math.abs(game.velocityY);
    }
    if (newY > window.innerHeight - 90) {
      newY = window.innerHeight - 90;
      game.velocityY = -Math.abs(game.velocityY);
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

    calculateEscapeDirection();

    // Update position
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
