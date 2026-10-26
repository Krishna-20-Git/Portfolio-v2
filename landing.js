/* Hero entrance: the name tumbles in letter by letter (a short version of the
 * original intro), then the tagline, copy and buttons rise into place.
 * Content is visible by default, so nothing depends on this script. */
(function () {
    'use strict';
    var hero = document.getElementById('hero');
    var nameEl = document.getElementById('hero-name');
    if (!hero || !nameEl) return;

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var text = nameEl.textContent;
    nameEl.textContent = '';
    var letters = [];
    for (var i = 0; i < text.length; i++) {
        var span = document.createElement('span');
        span.className = 'hn-letter';
        span.textContent = text[i];
        nameEl.appendChild(span);
        letters.push(span);
    }

    if (reduce || !letters[0].animate) {
        hero.classList.add('is-ready');
        return;
    }

    hero.classList.add('is-intro');

    function tumble(span, i) {
        var dir = i % 2 === 0 ? -1 : 1;
        span.animate([
            { transform: 'translate(' + dir * (2 + (i % 3)) + 'vw,-40vh) rotate(' + dir * (110 + i * 18) + 'deg) scale(0.6)', opacity: 0, easing: 'cubic-bezier(0.55,0,0.9,0.5)' },
            { opacity: 1, offset: 0.25 },
            { transform: 'translate(0,0.07em) rotate(' + (-dir * 5) + 'deg) scale(1)', opacity: 1, offset: 0.65, easing: 'cubic-bezier(0.2,0.8,0.3,1)' },
            { transform: 'translate(0,-0.03em) rotate(' + (dir * 1.5) + 'deg)', opacity: 1, offset: 0.85 },
            { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 }
        ], { duration: 950, delay: 120 + i * 70, fill: 'both' });
    }

    // Start once fonts are ready (but never wait long), so the letters do not reflow mid-animation.
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, new Promise(function (r) { setTimeout(r, 500); })]).then(function () {
        letters.forEach(tumble);
        setTimeout(function () {
            hero.classList.remove('is-intro');
            hero.classList.add('is-ready');
        }, 120 + letters.length * 70 + 250);
    });

    // Any key or click skips straight to the finished state.
    function skip() {
        hero.classList.remove('is-intro');
        hero.classList.add('is-ready');
        letters.forEach(function (l) { l.getAnimations().forEach(function (a) { a.finish(); }); });
        window.removeEventListener('keydown', skip);
    }
    window.addEventListener('keydown', skip, { once: true });
})();
