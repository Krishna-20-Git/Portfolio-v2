/* Particle portrait (the original "dust gathers into a portrait" effect, now in About).
 * Draws ~7.5k points from portrait-points.js into #portrait-canvas.
 * Runs only while visible, repels from the pointer, and falls back to the photo
 * if the data or canvas is unavailable. */
(function () {
    'use strict';
    var figure = document.getElementById('portrait');
    var canvas = document.getElementById('portrait-canvas');
    var DATA = window.PORTRAIT_POINTS;
    if (!figure || !canvas || !DATA || !DATA.data || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var N = DATA.count || Math.floor(DATA.data.length / 3);

    var tx = new Float32Array(N), ty = new Float32Array(N);
    var px = new Float32Array(N), py = new Float32Array(N);
    var vx = new Float32Array(N), vy = new Float32Array(N);
    var dl = new Float32Array(N), grow = new Float32Array(N), sz = new Float32Array(N);
    var bright = new Uint8Array(N);
    var BUCKETS = 4;
    var buckets = [[], [], [], []];
    for (var i = 0; i < N; i++) {
        var b = DATA.data[i * 3 + 2];
        var bk = Math.min(BUCKETS - 1, Math.floor(b * BUCKETS));
        bright[i] = bk;
        buckets[bk].push(i);
        sz[i] = 0.9 + Math.random() * 0.8;
    }

    var W = 1, H = 1, dpr = 1;
    var pointer = { x: -9999, y: -9999 };
    var visible = false, started = false, raf = 0, last = 0, t0 = 0;
    var COLORS = [];

    function palette() {
        var light = document.body.getAttribute('data-theme') === 'light';
        COLORS = light
            ? ['rgba(20,40,90,0.35)', 'rgba(20,40,90,0.6)', 'rgba(14,30,76,0.82)', 'rgba(8,20,60,1)']
            : ['rgba(120,170,230,0.35)', 'rgba(150,200,255,0.6)', 'rgba(195,228,255,0.85)', 'rgba(255,255,255,1)'];
    }
    palette();
    new MutationObserver(function () { palette(); draw(); }).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

    function layout() {
        var r = figure.getBoundingClientRect();
        W = Math.max(1, r.width); H = Math.max(1, r.height);
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        var ar = DATA.width / DATA.height;
        var ph = H, pw = ph * ar;
        if (pw > W) { pw = W; ph = pw / ar; }
        var left = (W - pw) / 2, top = H - ph;
        for (var i = 0; i < N; i++) {
            tx[i] = left + DATA.data[i * 3] / DATA.width * pw;
            ty[i] = top + DATA.data[i * 3 + 1] / DATA.height * ph;
        }
        if (started && reduce) snap();
        draw();
    }

    function snap() {
        for (var i = 0; i < N; i++) { px[i] = tx[i]; py[i] = ty[i]; vx[i] = vy[i] = 0; grow[i] = 1; }
    }

    function start() {
        if (started) return;
        started = true;
        figure.classList.add('is-particles');
        if (reduce) { snap(); draw(); return; }
        var cx = W / 2, cy = H * 0.45, reach = Math.max(W, H) * 0.7;
        for (var i = 0; i < N; i++) {
            var a = Math.random() * 6.283, rr = (0.15 + 0.85 * Math.pow(Math.random(), 0.7)) * reach;
            px[i] = cx + Math.cos(a) * rr; py[i] = cy + Math.sin(a) * rr * 0.8;
            vx[i] = vy[i] = 0; dl[i] = Math.random() * 1.6; grow[i] = 0;
        }
        t0 = performance.now() / 1000;
        wake();
    }

    var K = 10, D = 4.4;
    function frame(now) {
        raf = 0;
        if (!visible) return;
        var t = now / 1000, dt = Math.min(0.033, Math.max(0.001, t - last));
        last = t;
        var age0 = t - t0, R = W < 360 ? 60 : 90, R2 = R * R;
        var cx = W / 2, cy = H * 0.45, settled = true;
        for (var i = 0; i < N; i++) {
            var age = age0 - dl[i];
            if (age < 0) { grow[i] = 0; settled = false; continue; }
            grow[i] = age > 0.5 ? 1 : age / 0.5;
            var ax = (tx[i] - px[i]) * K - vx[i] * D;
            var ay = (ty[i] - py[i]) * K - vy[i] * D;
            if (age < 1.6) {
                var s = (1 - age / 1.6) * 1.1;
                ax += -(py[i] - cy) * s; ay += (px[i] - cx) * s;
            }
            var dx = px[i] - pointer.x, dy = py[i] - pointer.y, d2 = dx * dx + dy * dy;
            if (d2 < R2 && d2 > 0.01) {
                var d = Math.sqrt(d2), f = 1 - d / R, push = f * f * 3000;
                ax += dx / d * push; ay += dy / d * push;
            }
            vx[i] += ax * dt; vy[i] += ay * dt;
            px[i] += vx[i] * dt; py[i] += vy[i] * dt;
            if (settled && (Math.abs(vx[i]) > 0.4 || Math.abs(vy[i]) > 0.4 || Math.abs(px[i] - tx[i]) > 0.6)) settled = false;
        }
        draw();
        // Keep running while moving or while the pointer is over the portrait.
        if (!settled || pointer.x > -9000) raf = requestAnimationFrame(frame);
    }

    function draw() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!started) return;
        for (var bi = 0; bi < BUCKETS; bi++) {
            ctx.fillStyle = COLORS[bi];
            var list = buckets[bi];
            for (var li = 0; li < list.length; li++) {
                var n = list[li], g = grow[n];
                if (g <= 0) continue;
                var size = sz[n] * g * dpr;
                ctx.fillRect(px[n] * dpr - size / 2, py[n] * dpr - size / 2, size, size);
            }
        }
    }

    function wake() {
        if (raf || !visible || !started || reduce) return;
        last = performance.now() / 1000;
        raf = requestAnimationFrame(frame);
    }

    figure.addEventListener('pointermove', function (e) {
        var r = figure.getBoundingClientRect();
        pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; wake();
    }, { passive: true });
    figure.addEventListener('pointerleave', function () { pointer.x = pointer.y = -9999; wake(); }, { passive: true });
    figure.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') { pointer.x = pointer.y = -9999; wake(); } }, { passive: true });

    new ResizeObserver(layout).observe(figure);
    new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) { start(); wake(); }
    }, { threshold: 0.25 }).observe(figure);
    layout();
})();
