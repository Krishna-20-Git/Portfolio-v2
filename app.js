/* 
================================================================
   MAJD-INSPIRED BENTO & FLYING AVATAR SCRIPTS
================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initScrollProgressBar();
    initTypewriter();
    initProjectFilter();
    initScrollReveal();
    initContactForm();
    initMagneticButtons();
    initCursorTrail();
    initGitHubTerminal();
    
    // 3D Motion features
    initFlyingAvatar();     // Avatar scroll-fly transition
    initScrollDriven3D();   // 3D scroll-driven cards
    initBookCards();        // Flip-book project cards
    initShowcase();         // Circular project carousel
    
    // Awwwards UI/UX Upgrades
    initSmoothScroll();
    initAmbientCanvas();
    
    // Premium Phase 2 Upgrades
    initPreloader();
    initSoundToggle();
    initMagneticCursor();
    initSpotlightHover();
});

/* --- 1. Theme Switcher (Light Default / Dark Secondary) --- */
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        body.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    } else {
        body.setAttribute('data-theme', 'light');
        updateThemeIcon('light');
    }
    
    themeToggle.addEventListener('click', (e) => {
        const currentTheme = body.getAttribute('data-theme');
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        const targetColor = nextTheme === 'dark' ? '#0b090c' : '#fbfaf8';
        
        // Create full screen circle wipe transition element
        const ripple = document.createElement('div');
        ripple.className = 'theme-transition-ripple';
        
        const rect = themeToggle.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        
        ripple.style.left = startX + 'px';
        ripple.style.top = startY + 'px';
        ripple.style.width = '10px';
        ripple.style.height = '10px';
        ripple.style.marginLeft = '-5px';
        ripple.style.marginTop = '-5px';
        ripple.style.backgroundColor = targetColor;
        
        body.appendChild(ripple);
        
        // Force layout repaint
        ripple.offsetWidth;
        
        // Animate the scale
        const scaleVal = Math.max(window.innerWidth, window.innerHeight) * 2.5 / 5;
        ripple.style.transform = 'scale(' + scaleVal + ')';
        
        // Play theme switch chime
        if (window.synth) window.synth.playToggle();
        
        setTimeout(() => {
            body.setAttribute('data-theme', nextTheme);
            localStorage.setItem('theme', nextTheme);
            updateThemeIcon(nextTheme);
            
            // Re-sync ambient canvas if initialized
            if (window.syncAmbientCanvasColors) {
                window.syncAmbientCanvasColors();
            }
            
            // Fade out the ripple
            ripple.style.opacity = '0';
            
            setTimeout(() => {
                ripple.remove();
            }, 300);
        }, 750);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    if (!icon) return;
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

/* --- 2. Navigation & Mobile Drawer --- */
function initNavigation() {
    const header = document.getElementById('main-header');
    const menuToggle = document.getElementById('menu-toggle');
    const mobileNavbar = document.getElementById('mobile-navbar');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    menuToggle.addEventListener('click', () => {
        const isOpen = mobileNavbar.classList.toggle('open');
        menuToggle.classList.toggle('open', isOpen);
    });
    
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNavbar.classList.remove('open');
            menuToggle.classList.remove('open');
        });
    });
}

/* --- 3. Scroll Progress Indicator Bar --- */
function initScrollProgressBar() {
    const progressBar = document.getElementById('scroll-progress-bar');
    if (!progressBar) return;
    
    window.addEventListener('scroll', () => {
        const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalScrollHeight > 0) {
            const scrollPercentage = (window.scrollY / totalScrollHeight) * 100;
            progressBar.style.width = `${scrollPercentage}%`;
        }
    });
}

/* --- 4. Sleek Typewriter Engine --- */
function initTypewriter() {
    const typewriterElement = document.getElementById('typewriter');
    if (!typewriterElement) return;
    
    const words = [
        'distributed systems.',
        'asynchronous web engines.',
        'modular SaaS monoliths.',
        'IoT embedded nodes.',
        'digital interfaces.'
    ];
    
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;
    
    function type() {
        const currentWord = words[wordIndex];
        
        if (isDeleting) {
            typewriterElement.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 40;
        } else {
            typewriterElement.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 100;
        }
        
        if (!isDeleting && charIndex === currentWord.length) {
            typingSpeed = 2200;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typingSpeed = 400;
        }
        
        setTimeout(type, typingSpeed);
    }
    
    setTimeout(type, 800);
}

/* --- 5. Projects Categorization Filter --- */
function initProjectFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filterValue = btn.getAttribute('data-filter');
            
            projectCards.forEach(card => {
                const categories = card.getAttribute('data-category').split(' ');
                
                if (filterValue === 'all' || categories.includes(filterValue)) {
                    card.classList.remove('hide');
                } else {
                    card.classList.add('hide');
                }
            });
        });
    });
}

/* --- 6. Custom Elastic Scroll Reveal Observer --- */
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal-up');
    
    const observerOptions = {
        root: null,
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
    };
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    revealElements.forEach(el => {
        revealObserver.observe(el);
    });
}

/* --- 7. Scroll-Driven 3D Card Turning --- */
function initScrollDriven3D() {
    const cards = document.querySelectorAll('.scroll-3d-card');
    
    if (window.matchMedia('(pointer: coarse)').matches) return;
    
    window.addEventListener('scroll', () => {
        const viewportHeight = window.innerHeight;
        
        cards.forEach(card => {
            if (card.classList.contains('hide')) return;
            
            const rect = card.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > viewportHeight) return;
            
            const cardCenterY = rect.top + rect.height / 2;
            const normalizedY = (cardCenterY - viewportHeight / 2) / (viewportHeight / 2);
            
            const rotateX = normalizedY * 15;
            const rotateY = normalizedY * -6;
            
            const scale = 0.96 + (1 - Math.abs(normalizedY)) * 0.04;
            
            card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
            card.style.transition = 'transform 0.15s ease-out';
        });
    });
}

/* --- 8. Floating Avatar Scroll-Fly Interpolation --- */
function initFlyingAvatar() {
    const avatar = document.getElementById('flying-avatar-container');
    const slotA = document.getElementById('hero-avatar-placeholder');
    const slotB = document.getElementById('about-avatar-placeholder');
    
    if (!avatar || !slotA || !slotB) return;
    
    function updateFlyingAvatar() {
        // Fallback or disable on mobile viewports
        if (window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches) {
            avatar.style.display = 'none';
            return;
        } else {
            avatar.style.display = 'block';
        }
        
        const rectA = slotA.getBoundingClientRect();
        const rectB = slotB.getBoundingClientRect();
        
        const scrollY = window.scrollY;
        
        // Compute pageYB for scroll boundaries
        const pageYB = rectB.top + scrollY;
        const viewportHeight = window.innerHeight;
        
        // Define boundaries: starts at 0 scroll, ends when Slot B hits middle of screen
        const endScroll = Math.max(100, pageYB - viewportHeight / 2);
        
        let p = scrollY / endScroll;
        p = Math.max(0, Math.min(1, p)); // clamp value between 0 and 1
        
        // Linear interpolation using viewport-relative coordinates directly
        const w = rectA.width + (rectB.width - rectA.width) * p;
        const h = rectA.height + (rectB.height - rectA.height) * p;
        const x = rectA.left + (rectB.left - rectA.left) * p;
        const y = rectA.top + (rectB.top - rectA.top) * p;
        
        // Rotate 360 degrees along scroll path
        const rot = p * 360;
        
        avatar.style.position = 'fixed';
        avatar.style.width = w + "px";
        avatar.style.height = h + "px";
        avatar.style.left = x + "px";
        avatar.style.top = y + "px";
        avatar.style.transform = "perspective(1000px) rotateY(" + (p * 360) + "deg)";
    }
    
    // Bind listeners
    window.addEventListener('scroll', updateFlyingAvatar);
    window.addEventListener('resize', updateFlyingAvatar);
    
    // Run once initially
    setTimeout(updateFlyingAvatar, 100);
}

/* --- 9. Mobile Support for Book Open Click Toggles --- */
function initBookCards() {
    const bookCards = document.querySelectorAll('.book-card');
    
    bookCards.forEach(card => {
        // Play swoosh sound on hover
        card.addEventListener('mouseenter', () => {
            if (window.synth) window.synth.playSwoosh();
        });
        card.addEventListener('click', (e) => {
            // Check if clicking links inside the inside card
            if (e.target.closest('.project-links') || e.target.closest('a')) {
                return;
            }
            
            // Toggle open page state
            card.classList.toggle('open-book');
        });
    });
}

/* --- 10. Contact Form Submission (FormSubmit) --- */
function initContactForm() {
    const form = document.getElementById('portfolio-contact-form');
    if (!form) return;
    
    const nameInput = document.getElementById('form-name');
    const emailInput = document.getElementById('form-email');
    const messageInput = document.getElementById('form-message');
    const submitBtn = document.getElementById('form-submit-btn');
    const statusMsg = document.getElementById('form-status-msg');
    
    [nameInput, emailInput, messageInput].forEach(input => {
        input.addEventListener('input', () => {
            input.parentElement.classList.remove('invalid');
        });
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let isValid = true;
        
        if (nameInput.value.trim() === '') {
            nameInput.parentElement.classList.add('invalid');
            isValid = false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value.trim())) {
            emailInput.parentElement.classList.add('invalid');
            isValid = false;
        }
        
        if (messageInput.value.trim() === '') {
            messageInput.parentElement.classList.add('invalid');
            isValid = false;
        }
        
        if (!isValid) return;
        
        submitBtn.disabled = true;
        const submitText = submitBtn.querySelector('span');
        const submitIcon = submitBtn.querySelector('i');
        
        const originalText = submitText.textContent;
        const originalIconClass = submitIcon.className;
        
        submitText.textContent = 'Sending Message...';
        submitIcon.className = 'fa-solid fa-spinner fa-spin';
        
        const showStatus = (text, type) => {
            statusMsg.textContent = text;
            statusMsg.className = 'form-status-message ' + type;
            setTimeout(() => {
                statusMsg.textContent = '';
                statusMsg.className = 'form-status-message';
            }, 8000);
        };

        const resetButton = () => {
            submitBtn.disabled = false;
            submitText.textContent = originalText;
            submitIcon.className = originalIconClass;
        };

        // Sends straight to your inbox through FormSubmit (free, no account or key needed).
        // The very first message triggers a one-time activation email to this address:
        // open it and click "Activate Form". After that, every message arrives normally.
        const CONTACT_EMAIL = 'krishnadpsranchi@gmail.com';
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const message = messageInput.value.trim();

        // Last-resort fallback so a visitor's message is never lost: open their mail app, pre-filled.
        const openMailApp = () => {
            const subject = encodeURIComponent('Portfolio message from ' + name);
            const body = encodeURIComponent(message + '\n\n' + name + '\n' + email);
            window.location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + subject + '&body=' + body;
        };

        fetch('https://formsubmit.co/ajax/' + CONTACT_EMAIL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                name: name,
                email: email,
                message: message,
                _subject: 'New message from your portfolio website',
                _template: 'table',
                _captcha: 'false'
            })
        })
        .then(res => res.json().then(data => ({ ok: res.ok && String(data.success) !== 'false', data })))
        .then(({ ok }) => {
            resetButton();
            if (ok) {
                form.reset();
                showStatus('Thank you! Your message was sent. Krishna will get back to you shortly.', 'success');
            } else {
                showStatus('Could not send right now, opening your email app instead.', 'error');
                setTimeout(openMailApp, 900);
            }
        })
        .catch(() => {
            resetButton();
            showStatus('Network problem, opening your email app instead.', 'error');
            setTimeout(openMailApp, 900);
        });
    });
}

/* --- 11. Magnetic Interactive Elements --- */
function initMagneticButtons() {
    const magneticElements = document.querySelectorAll('.magnetic');
    
    if (window.matchMedia('(pointer: coarse)').matches) return;
    
    magneticElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            const strength = 12;
            const pullX = (x / (rect.width / 2)) * strength;
            const pullY = (y / (rect.height / 2)) * strength;
            
            el.style.transform = `translate(${pullX}px, ${pullY}px) scale(1.02)`;
            el.style.transition = 'transform 0.1s ease-out';
        });
        
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'translate(0px, 0px) scale(1)';
            el.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        });
    });
}

/* --- 12. Interactive Sparkle Particle Cursor Trail --- */
function initCursorTrail() {
    const container = document.getElementById('cursor-trail-container');
    if (!container) return;
    
    if (window.matchMedia('(pointer: coarse)').matches) return;
    
    let particleThrottle = 0;
    
    window.addEventListener('mousemove', (e) => {
        particleThrottle++;
        if (particleThrottle % 3 !== 0) return;
        
        const particle = document.createElement('div');
        particle.className = 'sparkle-particle';
        
        const size = Math.random() * 5 + 4;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        particle.style.left = `${e.clientX}px`;
        particle.style.top = `${e.clientY}px`;
        
        const colorIndex = Math.floor(Math.random() * 3);
        if (colorIndex === 0) {
            particle.style.background = 'var(--accent-primary)';
            particle.style.boxShadow = '0 0 6px var(--accent-primary)';
        } else if (colorIndex === 1) {
            particle.style.background = 'var(--accent-secondary)';
            particle.style.boxShadow = '0 0 6px var(--accent-secondary)';
        } else {
            particle.style.background = '#e9c46a';
            particle.style.boxShadow = '0 0 6px #e9c46a';
        }
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 25 + 8;
        const destX = Math.cos(angle) * distance;
        const destY = Math.sin(angle) * distance;
        
        particle.style.setProperty('--x', `${destX}px`);
        particle.style.setProperty('--y', `${destY}px`);
        
        container.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 800);
    });
}

/* --- 13. Custom Interactive GitHub CLI Terminal --- */
function initGitHubTerminal() {
    const inputField = document.getElementById('terminal-input-field');
    const outputLog = document.getElementById('terminal-output-log');
    const hintSpan = document.getElementById('terminal-autocomplete-hint');
    
    if (!inputField || !outputLog || !hintSpan) return;
    
    const commands = ['help', 'skills', 'projects', 'git log', 'contact', 'clear'];
    
    // Autocomplete Prefix suggestion on input
    inputField.addEventListener('input', () => {
        const val = inputField.value;
        if (val === '') {
            hintSpan.innerHTML = '';
            return;
        }
        
        const match = commands.find(cmd => cmd.startsWith(val.toLowerCase()));
        if (match) {
            const typedPart = val;
            const remainingPart = match.substring(val.length);
            hintSpan.innerHTML = '<span style="color: transparent;">' + escapeHtml(typedPart) + '</span>' + escapeHtml(remainingPart);
        } else {
            hintSpan.innerHTML = '';
        }
    });
    
    inputField.addEventListener('keydown', (e) => {
        const val = inputField.value;
        
        // Play mechanical key click
        if (window.synth) window.synth.playKey();
        const match = commands.find(cmd => cmd.startsWith(val.toLowerCase()));
        
        // Tab or ArrowRight autocompletion fill
        if ((e.key === 'Tab' || e.key === 'ArrowRight') && match && val !== '') {
            e.preventDefault();
            inputField.value = match;
            hintSpan.innerHTML = '';
            return;
        }
        
        if (e.key === 'Enter') {
            const rawCommand = inputField.value;
            const command = rawCommand.trim().toLowerCase();
            
            printTerminalLine('visitor@krishna-dev:~$ <span class="typed-cmd">' + escapeHtml(rawCommand) + '</span>');
            interpretTerminalCommand(command);
            inputField.value = '';
            hintSpan.innerHTML = '';
            
            setTimeout(() => {
                outputLog.scrollTop = outputLog.scrollHeight;
            }, 10);
        }
    });
    
    function printTerminalLine(htmlContent) {
        const line = document.createElement('p');
        line.className = 'terminal-line';
        line.innerHTML = htmlContent;
        outputLog.appendChild(line);
    }
    
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    function interpretTerminalCommand(cmd) {
        if (cmd === '') return;
        
        switch (cmd) {
            case 'help':
                printTerminalLine('<span class="highlight">help</span> - List available CLI commands\n<span class="highlight">skills</span> - Print my core technical competencies\n<span class="highlight">projects</span> - Showcase featured repositories & live links\n<span class="highlight">git log</span> - Output recent repo commits & version details\n<span class="highlight">contact</span> - Show communication channels\n<span class="highlight">clear</span> - Flush terminal lines');
                break;
                
            case 'skills':
                printTerminalLine('Languages   : <span class="sparkle-text">[■■■■■■■■■■■■■■■■■□□] 90%</span> - JS, HTML/CSS, Python, Java, C/C++\nFrontend    : <span class="sparkle-text">[■■■■■■■■■■■■■■■□□□□] 80%</span> - React.js, Next.js, Tailwind, CSS Grid\nBackend     : <span class="sparkle-text">[■■■■■■■■■■■■■■□□□□□] 75%</span> - Spring Boot, Flask, Kafka, Postgres, SQLite\nDevOps      : <span class="sparkle-text">[■■■■■■■■■■■■□□□□□□□] 65%</span> - Git, Docker, Vercel, Render, Neon');
                break;
                
            case 'projects':
                printTerminalLine('<span class="commit-hash">1. Distributed Invoice Processing System</span>\n   Stack: Java, Spring Boot, Kafka, Postgres, Next.js\n   Live : <a href="https://invoice-frontend-tau-lemon.vercel.app/login" target="_blank" class="highlight">invoice-frontend-tau-lemon.vercel.app</a>\n   \n<span class="commit-hash">2. Algorithm Suite - Unified Learning Platform</span>\n   Stack: Python, Flask Blueprints, SQLite, SQLAlchemy\n   Live : <a href="https://dsa-platform-v2.onrender.com" target="_blank" class="highlight">dsa-platform-v2.onrender.com</a>\n   \n<span class="commit-hash">3. OS Scheduling Simulator</span>\n   Stack: React.js, Tailwind CSS, custom Hooks\n   Live : <a href="https://os-scheduler-visualizer.vercel.app" target="_blank" class="highlight">os-scheduler-visualizer.vercel.app</a>');
                break;
                
            case 'git log':
                printTerminalLine('<span class="commit-hash">a3e89f2</span> (HEAD -> main) feat: Kafka queue implementation for async parsing\n<span class="commit-hash">7c12b91</span> refactor: blueprint structural changes for Flask modular app\n<span class="commit-hash">2f88c44</span> feat: Gantt real-time scheduling canvas rendering logic\n<span class="commit-hash">d94f218</span> initial: local git repo initialization & outline');
                break;
                
            case 'contact':
                printTerminalLine('Email       : <a href="mailto:krishnadpsranchi@gmail.com" class="highlight">krishnadpsranchi@gmail.com</a>\nPhone       : <span class="highlight">+91 9304944218</span>\nGitHub      : <a href="https://github.com/Krishna-20-Git" target="_blank" class="highlight">github.com/Krishna-20-Git</a>\nLinkedIn    : <a href="https://linkedin.com/in/krishna40847b330" target="_blank" class="highlight">linkedin.com/in/krishna40847b330</a>\nLocation    : Ranchi, JH / Chennai, TN, India');
                break;
                
            case 'clear':
                outputLog.innerHTML = '<p class="terminal-line system-msg">Console log flushed. Ready for inputs.</p>';
                break;
                
            default:
                printTerminalLine('bash: command not found: <span class="highlight">' + escapeHtml(cmd) + '</span>. Type \'help\' to see valid triggers.');
                break;
        }
    }
}

/* --- 14. Interactive Ambient Canvas (Fluid Mesh) --- */
function initAmbientCanvas() {
    const canvas = document.getElementById('ambient-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    let mouseX = width / 2;
    let mouseY = height / 2;
    
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });
    
    let spots = [];
    
    window.syncAmbientCanvasColors = function() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        
        if (isDark) {
            spots = [
                { x: width * 0.2, y: height * 0.3, baseX: width * 0.2, baseY: height * 0.3, vx: 0.3, vy: 0.4, r: 450, color: 'rgba(226, 135, 67, 0.04)', influence: 0.05 },
                { x: width * 0.8, y: height * 0.7, baseX: width * 0.8, baseY: height * 0.7, vx: -0.4, vy: -0.3, r: 500, color: 'rgba(182, 194, 180, 0.04)', influence: 0.05 }
            ];
        } else {
            spots = [
                { x: width * 0.2, y: height * 0.3, baseX: width * 0.2, baseY: height * 0.3, vx: 0.4, vy: 0.5, r: 450, color: 'rgba(226, 135, 67, 0.06)', influence: 0.08 },
                { x: width * 0.8, y: height * 0.7, baseX: width * 0.8, baseY: height * 0.7, vx: -0.5, vy: -0.4, r: 500, color: 'rgba(182, 194, 180, 0.06)', influence: 0.08 }
            ];
        }
    };
    
    window.syncAmbientCanvasColors();
    
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        spots.forEach(spot => {
            spot.baseX += spot.vx;
            spot.baseY += spot.vy;
            
            if (spot.baseX < 0 || spot.baseX > width) spot.vx *= -1;
            if (spot.baseY < 0 || spot.baseY > height) spot.vy *= -1;
            
            const targetX = spot.baseX + (mouseX - width / 2) * spot.influence;
            const targetY = spot.baseY + (mouseY - height / 2) * spot.influence;
            
            spot.x += (targetX - spot.x) * 0.05;
            spot.y += (targetY - spot.y) * 0.05;
            
            const grad = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.r);
            grad.addColorStop(0, spot.color);
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
            ctx.fill();
        });
        
        requestAnimationFrame(animate);
    }
    animate();
}

/* --- 15. Lenis Smooth Scroll Integration --- */
function initSmoothScroll() {
    if (window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches) return;
    
    if (typeof Lenis === 'undefined') return;
    
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false,
    });
    
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    
    // Connect anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') {
                e.preventDefault();
                lenis.scrollTo(0);
                return;
            }
            if (targetId.startsWith('#')) {
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    // Project cards sit under the fixed nav pill, so leave room for it
                    lenis.scrollTo(targetEl, { offset: targetEl.classList.contains('project-card') ? -140 : 0 });
                }
            }
        });
    });
}


/* --- 16. Web Audio API Synthesizer --- */
class AudioSynth {
    constructor() {
        this.ctx = null;
        this.muted = true;
    }
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    toggleMute() {
        this.muted = !this.muted;
        if (!this.muted) {
            this.init();
        }
        return this.muted;
    }
    
    playClick() {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(140, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.08);
            
            gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
            
            osc.start();
            osc.stop(this.ctx.currentTime + 0.08);
        } catch(e) {}
    }
    
    playKey() {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(750, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.04);
            
            gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
            
            osc.start();
            osc.stop(this.ctx.currentTime + 0.04);
        } catch(e) {}
    }
    
    playSwoosh() {
        if (this.muted) return;
        this.init();
        try {
            const bufferSize = this.ctx.sampleRate * 0.25;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.25);
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            noise.start();
        } catch(e) {}
    }
    
    playToggle() {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(320, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(850, this.ctx.currentTime + 0.12);
            
            gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
            
            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch(e) {}
    }
}
window.synth = new AudioSynth();

/* --- 17. Preloader Initializer --- */
function initPreloader() {
    const preloader = document.getElementById('preloader');
    const term = document.getElementById('preloader-terminal');
    const bar = document.getElementById('preloader-bar');
    
    if (!preloader || !term || !bar) return;
    
    document.body.classList.add('preloading');
    
    const logs = [
        '> System.init()',
        '> Loading core assets...',
        '> [OK] Layout variables synced.',
        '> Ingesting IoT node modules...',
        '> [OK] Kafka server sockets active.',
        '> [OK] Visualizer databases cached.',
        '> Booting custom terminal interface...'
    ];
    
    let currentLog = 0;
    let progress = 0;
    
    function logNext() {
        if (currentLog < logs.length) {
            const p = document.createElement('p');
            p.textContent = logs[currentLog];
            term.appendChild(p);
            term.scrollTop = term.scrollHeight;
            currentLog++;
            
            if (window.synth) window.synth.playKey();
            
            setTimeout(logNext, 150 + Math.random() * 120);
        }
    }
    
    function updateBar() {
        if (progress < 100) {
            progress += 3 + Math.floor(Math.random() * 6);
            if (progress > 100) progress = 100;
            bar.style.width = progress + '%';
            setTimeout(updateBar, 40);
        } else {
            setTimeout(() => {
                preloader.style.transform = 'translateY(-100%)';
                preloader.style.opacity = '0';
                preloader.style.pointerEvents = 'none';
                document.body.classList.remove('preloading');
                
                if (window.synth) window.synth.playToggle();
                
                setTimeout(() => {
                    preloader.style.display = 'none';
                    preloader.remove();
                }, 850);
            }, 300);
        }
    }
    
    logNext();
    updateBar();
}

/* --- 18. Sound Toggle Controllers --- */
function initSoundToggle() {
    const btn = document.getElementById('sound-toggle');
    if (!btn) return;
    
    btn.addEventListener('click', () => {
        const isMuted = window.synth.toggleMute();
        const icon = btn.querySelector('i');
        if (icon) {
            if (isMuted) {
                icon.className = 'fa-solid fa-volume-xmark';
            } else {
                icon.className = 'fa-solid fa-volume-high';
                window.synth.playClick();
            }
        }
    });
    
    document.querySelectorAll('a, button, .filter-btn').forEach(el => {
        el.addEventListener('click', () => {
            if (el.id !== 'sound-toggle' && window.synth) {
                window.synth.playClick();
            }
        });
    });
}

/* --- 19. Magnetic Monospace Cursor --- */
function initMagneticCursor() {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return;
    
    if (window.matchMedia('(pointer: coarse)').matches) return;
    
    let curX = 0, curY = 0;
    let targetX = 0, targetY = 0;
    
    window.addEventListener('mousemove', (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
    });
    
    function animateCursor() {
        curX += (targetX - curX) * 0.16;
        curY += (targetY - curY) * 0.16;
        
        cursor.style.left = curX + 'px';
        cursor.style.top = curY + 'px';
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
    
    document.querySelectorAll('a, button, .filter-btn').forEach(item => {
        item.addEventListener('mouseenter', () => {
            cursor.classList.add('hover-active');
        });
        item.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover-active');
        });
    });
    
    const terminal = document.getElementById('terminal-bento');
    if (terminal) {
        terminal.addEventListener('mouseenter', () => {
            cursor.classList.add('cursor-terminal');
        });
        terminal.addEventListener('mouseleave', () => {
            cursor.classList.remove('cursor-terminal');
        });
    }
}

/* --- 20. Supabase-Style Border Spotlights --- */
function initSpotlightHover() {
    const elements = document.querySelectorAll('.bento-cell, .bento-box');
    
    elements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            el.style.setProperty('--mouse-x', x + 'px');
            el.style.setProperty('--mouse-y', y + 'px');
        });
    });
}

/* --- 21. Project Showcase: circular carousel --- */
function initShowcase() {
    // Circular project carousel
    const carouselEl = document.getElementById('project-carousel');
    if (!carouselEl || !window.CircularCarousel) return;

    const items = [
        { src: 'assets/kriya_web_dashboard.png', alt: 'Kriya project management dashboard', title: 'Kriya', subtitle: 'Web + Android project manager', target: 'project-kriya' },
        { src: 'assets/invoice_screenshot_v2.png', alt: 'Distributed invoice system', title: 'Invoice System', subtitle: 'Kafka + Spring Boot billing engine', target: 'project-invoice' },
        { src: 'assets/dsa_screenshot_v3.png', alt: 'Algorithm suite platform', title: 'Algorithm Suite', subtitle: '28 visualizers on Flask', target: 'project-algorithms' },
        { src: 'assets/os_screenshot_v2.png', alt: 'OS scheduling simulator', title: 'OS Scheduler', subtitle: 'CPU scheduling Gantt simulator', target: 'project-scheduler' }
    ];

    const activeTitle = document.getElementById('active-title');
    const activeSub = document.getElementById('active-sub');
    const activeCta = document.getElementById('active-cta');

    const showActive = item => {
        if (!item) return;
        activeTitle.textContent = item.title;
        activeSub.textContent = item.subtitle;
        activeCta.setAttribute('href', '#' + item.target);
    };

    window.projectCarousel = CircularCarousel(carouselEl, {
        items,
        preset: 'cylinder',
        intro: 'rise',
        cardWidth: 400,
        aspectRatio: 1.5, // matches the wide screenshots so nothing gets cropped
        speed: 4, // very slow drift (degrees per second)
        captions: false,
        gap: 25,
        tilt: -5,
        curve: 1,
        perspective: 2500,
        autoplay: 'drift',
        interval: 3,
        direction: 'left',
        momentum: 0.6,
        snap: true,
        pauseOnHover: true,
        focusOnClick: true,
        draggable: true,
        parallax: 0.3,
        stretch: 0.5,
        fadeColor: 'var(--bg-main)', // fades into the page in both light and dark themes
        depthFade: 0.55,
        innerShade: 0.6,
        cornerRadius: 12,
        onActiveChange: showActive,
        onSelect: item => {
            showActive(item);
            activeCta.click(); // reuses the smooth-scroll anchor handler
        }
    });
}
