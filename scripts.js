/* ====================================
   RETRO PORTFOLIO JAVASCRIPT
   Interactive effects and animations
   ==================================== */

// ====================================
// SMOOTH SCROLLING NAVIGATION
// ====================================

/**
 * Adds smooth scrolling behavior to navigation links
 * When a nav item is clicked, smoothly scroll to the target section
 */
function initSmoothScrolling() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-item');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Prevent default anchor link behavior
            e.preventDefault();
            
            // Get the target section ID from href attribute
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            // Scroll to target section if it exists
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',    // Smooth animation
                    block: 'start'        // Align to top of viewport
                });
            }
        });
    });
}

// ====================================
// TYPING CURSOR EFFECTS
// ====================================

/**
 * Adds blinking animation to cursor elements
 * Creates the classic terminal cursor effect
 */
function initCursorEffects() {
    const cursors = document.querySelectorAll('.cursor');
    
    cursors.forEach(cursor => {
        // Blink every 500ms
        setInterval(() => {
            cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
        }, 500);
    });
}

// ====================================
//