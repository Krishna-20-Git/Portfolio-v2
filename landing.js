/*
 * Landing intro: dot -> "!" -> tumbling name -> PORTFOLIO -> dust gathers into a stippled portrait.
 *
 *  - The portrait is drawn from window.PORTRAIT_POINTS (portrait-points.js, generated from assets/avatar.jpg).
 *  - Particles spring toward their spot in the portrait and are pushed away by the pointer.
 *  - Respects prefers-reduced-motion (no intro, portrait shown immediately) and has a "Skip intro" button.
 */
(function () {
    'use strict';

    var NAME = 'KRISHNA';
    var WORD = 'PORTFOLIO';

    var $ = function (id) { return document.getElementById(id); };
    var section = $('hero');
    var stage = $('landing-stage');
    var mark = $('ls-mark');
    var nameEl = $('ls-name');
    var titleEl = $('landing-title');
    var canvas = $('landing-canvas');
    var skipBtn = $('landing-skip');
    if (!section || !canvas || !titleEl || !nameEl) return;

    var body = document.body;
    var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* ---------- Build letter spans ---------- */
    function makeLetters(el, text, cls) {
        el.textContent = '';
        return Array.from(text).map(function (ch) {
            var s = document.createElement('span');
            s.className = cls;
            s.textContent = ch;
            s.setAttribute('aria-hidden', 'true');
            el.appendChild(s);
            return s;
        });
    }
    var nameLetters = makeLetters(nameEl, NAME, 'ls-letter');
    var titleLetters = makeLetters(titleEl, WORD, 'lt-letter');

    /* ---------- Cancellable timeline helpers ---------- */
    var skipped = false;
    var timers = [];
    var anims = [];

    function wait(ms) {
        return new Promise(function (resolve) {
            if (skipped) { resolve(); return; }
            var rec = { resolve: resolve };
            rec.id = setTimeout(function () {
                timers.splice(timers.indexOf(rec), 1);
                resolve();
            }, ms);
            timers.push(rec);
        });
    }

    function play(el, keyframes, options) {
        var a = el.animate(keyframes, options);
        anims.push(a);
        return a;
    }

    /* ---------- Particle portrait ---------- */
    var DATA = window.PORTRAIT_POINTS;
    var N = DATA ? DATA.count : 0;
    var AMB = 240;
    var TOTAL = N + AMB;
    var ctx = canvas.getContext('2d');

    var px = new Float32Array(TOTAL), py = new Float32Array(TOTAL);
    var vx = new Float32Array(TOTAL), vy = new Float32Array(TOTAL);
    var tx = new Float32Array(TOTAL), ty = new Float32Array(TOTAL);
    var dl = new Float32Array(TOTAL), sz = new Float32Array(TOTAL), grow = new Float32Array(TOTAL);
    var ph = new Float32Array(TOTAL);
    var bucketOf = new Uint8Array(TOTAL);
    var buckets = [[], [], [], []];

    // soft blue-white palette, brightest dots are pure white
    var COLORS = ['rgba(140,155,195,0.55)', 'rgba(185,200,235,0.7)', 'rgba(225,232,250,0.88)', 'rgba(255,255,255,1)'];

    var W = 1, H = 1, dpr = 1;
    var cloud = { x: 0, y: 0 };
    var pointer = { x: -9999, y: -9999 };
    var dustStart = -1;
    var visible = true;
    var raf = 0;
    var last = 0;

    for (var i = 0; i < N; i++) {
        var b = DATA.data[i * 3 + 2] / 255;
        var k = b > 0.8 ? 3 : b > 0.55 ? 2 : b > 0.3 ? 1 : 0;
        bucketOf[i] = k;
        sz[i] = 1.0 + b * 1.15;
        ph[i] = Math.random() * 6.283;
    }
    for (var j = N; j < TOTAL; j++) {
        bucketOf[j] = 0;
        sz[j] = 0.9 + Math.random() * 0.8;
        ph[j] = Math.random() * 6.283;
    }
    for (var q = 0; q < TOTAL; q++) buckets[bucketOf[q]].push(q);

    function layout() {
        W = Math.max(1, section.clientWidth);
        H = Math.max(1, section.clientHeight);
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        if (!N) return;

        var mobile = W < 720;
        var portraitH = H * (mobile ? 0.6 : 0.82);
        var portraitW = portraitH * DATA.width / DATA.height;
        var cx = W * 0.5;
        var left = cx - portraitW / 2;
        var top = H * (mobile ? 0.1 : 0.06);
        cloud.x = cx;
        cloud.y = top + portraitH * 0.38;

        for (var i = 0; i < N; i++) {
            tx[i] = left + DATA.data[i * 3] / DATA.width * portraitW;
            ty[i] = top + DATA.data[i * 3 + 1] / DATA.height * portraitH;
        }
        if (dustStart >= 0 && reduced) snapToTargets();
    }

    function snapToTargets() {
        for (var i = 0; i < N; i++) { px[i] = tx[i]; py[i] = ty[i]; vx[i] = 0; vy[i] = 0; dl[i] = 0; }
        dustStart = performance.now() / 1000 - 100;
    }

    function startDust(fast) {
        if (!N || dustStart >= 0) {
            if (dustStart >= 0 && fast) dustStart -= 2.5;
            return;
        }
        var reach = Math.min(W, H) * 0.65;
        for (var i = 0; i < N; i++) {
            var a = Math.random() * 6.283;
            var r = (0.12 + 0.88 * Math.pow(Math.random(), 0.7)) * reach;
            px[i] = cloud.x + Math.cos(a) * r;
            py[i] = cloud.y + Math.sin(a) * r * 0.8;
            vx[i] = 0; vy[i] = 0;
            dl[i] = Math.random() * 2.0;
        }
        for (var m = N; m < TOTAL; m++) {
            px[m] = Math.random() * W;
            py[m] = Math.random() * H;
            vx[m] = (Math.random() - 0.5) * 14;
            vy[m] = (Math.random() - 0.5) * 14;
            dl[m] = Math.random() * 0.8;
        }
        dustStart = performance.now() / 1000 - (fast ? 2.5 : 0);
        if (reduced) snapToTargets();
        wake();
    }

    var K = 10;       // spring stiffness toward the portrait
    var D = 4.4;      // damping

    function frame(now) {
        raf = 0;
        if (dustStart < 0 || !visible) return;
        var t = now / 1000;
        var dt = Math.min(0.033, Math.max(0.001, t - last));
        last = t;
        var age0 = t - dustStart;
        var mobile = W < 720;
        var R = mobile ? 70 : 105;
        var R2 = R * R;
        var i, age, ax, ay, dx, dy, d2, d, f, push, s;

        for (i = 0; i < N; i++) {
            age = age0 - dl[i];
            if (age < 0) { grow[i] = 0; continue; }
            grow[i] = age > 0.5 ? 1 : age / 0.5;
            ax = (tx[i] - px[i]) * K - vx[i] * D;
            ay = (ty[i] - py[i]) * K - vy[i] * D;
            if (age < 1.8) {                       // swirl while the cloud gathers
                s = (1 - age / 1.8) * 1.1;
                dx = px[i] - cloud.x; dy = py[i] - cloud.y;
                ax += -dy * s; ay += dx * s;
            }
            dx = px[i] - pointer.x; dy = py[i] - pointer.y;
            d2 = dx * dx + dy * dy;
            if (d2 < R2 && d2 > 0.01) {            // pointer pushes dust away
                d = Math.sqrt(d2);
                f = 1 - d / R;
                push = f * f * 3200;
                ax += dx / d * push; ay += dy / d * push;
            }
            vx[i] += ax * dt; vy[i] += ay * dt;
            px[i] += vx[i] * dt; py[i] += vy[i] * dt;
        }

        for (i = N; i < TOTAL; i++) {              // ambient specks drift slowly
            age = age0 - dl[i];
            if (age < 0) { grow[i] = 0; continue; }
            grow[i] = age > 1 ? 0.55 : age * 0.55;
            if (!reduced) {
                px[i] += vx[i] * dt; py[i] += vy[i] * dt;
                if (px[i] < -4) px[i] = W + 4; else if (px[i] > W + 4) px[i] = -4;
                if (py[i] < -4) py[i] = H + 4; else if (py[i] > H + 4) py[i] = -4;
            }
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var bi = 0; bi < 4; bi++) {
            ctx.fillStyle = COLORS[bi];
            var list = buckets[bi];
            for (var li = 0; li < list.length; li++) {
                var n = list[li];
                var g = grow[n];
                if (g <= 0) continue;
                var size = sz[n] * g * dpr;
                ctx.fillRect(px[n] * dpr - size / 2, py[n] * dpr - size / 2, size, size);
            }
        }
        raf = requestAnimationFrame(frame);
    }

    function wake() {
        if (raf || dustStart < 0 || !visible) return;
        last = performance.now() / 1000;
        raf = requestAnimationFrame(frame);
    }

    section.addEventListener('pointermove', function (e) {
        var r = section.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
    }, { passive: true });
    section.addEventListener('pointerleave', function () { pointer.x = pointer.y = -9999; }, { passive: true });
    section.addEventListener('pointerup', function (e) {
        if (e.pointerType !== 'mouse') pointer.x = pointer.y = -9999;
    }, { passive: true });

    new ResizeObserver(layout).observe(section);
    new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) wake();
    }).observe(section);

    /* ---------- Header: dark pill while it sits over the black landing ---------- */
    function syncHeader() {
        body.classList.toggle('on-landing', window.scrollY < section.offsetHeight - 120);
    }
    window.addEventListener('scroll', syncHeader, { passive: true });
    window.addEventListener('resize', syncHeader);
    syncHeader();

    /* ---------- Final / skipped state ---------- */
    function showFinal() {
        timers.forEach(function (rec) { clearTimeout(rec.id); rec.resolve(); });
        timers = [];
        anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* noop */ } });
        anims = [];
        skipped = true;
        section.classList.remove('is-intro');
        section.classList.add('is-glow', 'is-ready');
        body.classList.remove('landing-intro');
        stage.classList.add('done');
        titleLetters.forEach(function (s) { s.classList.add('is-shown'); });
        startDust(true);
    }

    if (skipBtn) skipBtn.addEventListener('click', showFinal);
    window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !skipped && section.classList.contains('is-intro')) showFinal();
    });

    /* ---------- The intro sequence ---------- */
    function tumble(span, i) {
        var dir = i % 2 === 0 ? -1 : 1;
        var rot = dir * (160 + Math.random() * 140);
        var dxv = dir * (4 + Math.random() * 12);
        return play(span, [
            { transform: 'translate(' + dxv + 'vw,-70vh) rotate(' + rot + 'deg) scale(0.55)', opacity: 0, easing: 'cubic-bezier(0.55,0,0.9,0.5)' },
            { opacity: 1, offset: 0.2 },
            { transform: 'translate(0,0.09em) rotate(' + (-dir * 7) + 'deg) scale(1)', opacity: 1, offset: 0.6, easing: 'cubic-bezier(0.2,0.8,0.3,1)' },
            { transform: 'translate(0,-0.05em) rotate(' + (dir * 2.5) + 'deg)', opacity: 1, offset: 0.8, easing: 'cubic-bezier(0.3,0,0.3,1)' },
            { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 }
        ], { duration: 1150, delay: i * 120, fill: 'both' });
    }

    async function run() {
        body.classList.add('landing-intro');
        section.classList.add('is-intro');

        var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        await Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]);

        await wait(200); if (skipped) return;
        section.classList.add('is-glow');
        await wait(550); if (skipped) return;
        mark.classList.add('show-dot');
        await wait(800); if (skipped) return;
        mark.classList.add('show-bar');                 // the dot becomes an exclamation mark
        await wait(1200); if (skipped) return;

        mark.classList.add('hide');                     // the "!" breaks apart into the name
        nameLetters.forEach(tumble);
        await wait(120 * (nameLetters.length - 1) + 1150 + 800); if (skipped) return;

        nameLetters.forEach(function (s, i) {           // name lifts away...
            play(s, [
                { transform: 'translateY(0)', opacity: 1, filter: 'blur(0px)' },
                { transform: 'translateY(-0.3em)', opacity: 0, filter: 'blur(10px)' }
            ], { duration: 450, delay: i * 45, easing: 'ease-in', fill: 'forwards' });
        });
        await wait(45 * (nameLetters.length - 1) + 420); if (skipped) return;
        stage.classList.add('done');

        titleLetters.forEach(function (s, i) {          // ...and PORTFOLIO types in
            play(s, [
                { transform: 'translateY(0.45em)', opacity: 0, filter: 'blur(12px)' },
                { transform: 'translateY(0)', opacity: 1, filter: 'blur(0px)' }
            ], { duration: 720, delay: i * 60, easing: 'cubic-bezier(0.2,0.8,0.2,1)', fill: 'forwards' });
        });
        await wait(350); if (skipped) return;
        startDust(false);                               // the dust cloud begins to form
        await wait(60 * (titleLetters.length - 1) + 450); if (skipped) return;

        section.classList.remove('is-intro');
        section.classList.add('is-ready');
        body.classList.remove('landing-intro');
    }

    layout();
    if (reduced) {
        showFinal();
    } else {
        run();
    }
})();
