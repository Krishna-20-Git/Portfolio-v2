/* Venom strands: viscous threads that stretch from a button to the pointer,
   sag under gravity, then snap back when the pointer moves away.
   Opt in with the data-venom attribute. */
(function () {
    'use strict';
    var targets = Array.prototype.slice.call(document.querySelectorAll('[data-venom]'));
    if (!targets.length) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var N = 9;            // strands per button
    var M = 12;           // points per strand
    var RANGE = 280;      // px from the button where threads can attach
    var GRAVITY = 0.42, DAMP = 0.985, ITER = 5;

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2000;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var dpr = 1, W = 0, H = 0;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    var mouse = { x: -9999, y: -9999, seen: false };
    window.addEventListener('pointermove', function (e) {
        mouse.x = e.clientX; mouse.y = e.clientY; mouse.seen = true; wake();
    }, { passive: true });
    document.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    var items = targets.map(function (el) {
        var strands = [];
        for (var i = 0; i < N; i++) {
            var pts = [];
            for (var j = 0; j <= M; j++) pts.push({ x: 0, y: 0, px: 0, py: 0 });
            strands.push({
                pts: pts,
                slot: (i - (N - 1) / 2),
                jx: rnd(-7, 7), jy: rnd(-7, 7),
                w: rnd(0.9, 2.1),
                slack: rnd(1.04, 1.28),
                tx: 0, ty: 0
            });
        }
        return { el: el, strands: strands, attached: false, active: false, power: 0 };
    });

    function isVisible(el) {
        if (document.body.classList.contains('landing-intro')) return false;
        var r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return false;
        if (r.bottom < 0 || r.top > H) return false;
        var cs = getComputedStyle(el);
        return cs.visibility !== 'hidden' && cs.display !== 'none';
    }

    function palette(el) {
        var dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
            document.body.getAttribute('data-theme') === 'dark' ||
            document.body.classList.contains('on-landing') ||
            !!el.closest('.landing');
        return dark
            ? { core: 'rgba(238,238,246,0.95)', rim: 'rgba(0,0,0,0.55)' }
            : { core: 'rgba(8,8,10,0.96)', rim: 'rgba(255,255,255,0.35)' };
    }

    function stadium(r) {
        var h = r.height, rad = h / 2;
        return { x1: r.left + rad, x2: r.right - rad, cy: r.top + rad, rad: rad };
    }

    function distToStadium(s, px, py) {
        var cx = clamp(px, s.x1, s.x2);
        return Math.max(0, Math.hypot(px - cx, py - s.cy) - s.rad);
    }

    function anchorFor(s, st, px, py, spread) {
        var cx = clamp((s.x1 + s.x2) / 2 + st.slot * spread, s.x1, s.x2);
        // point on the segment closest to the pointer biases where threads leave
        var base = clamp(px, s.x1, s.x2);
        cx = clamp(base + st.slot * spread, s.x1, s.x2);
        var dx = px - cx, dy = py - s.cy;
        var d = Math.hypot(dx, dy) || 1;
        return { x: cx + dx / d * (s.rad - 1), y: s.cy + dy / d * (s.rad - 1) };
    }

    function reset(it, s, px, py) {
        it.strands.forEach(function (st) {
            var a = anchorFor(s, st, px, py, 9);
            st.tx = a.x; st.ty = a.y;
            st.pts.forEach(function (p) { p.x = p.px = a.x; p.y = p.py = a.y; });
        });
    }

    function step(it) {
        var r = it.el.getBoundingClientRect();
        var s = stadium(r);
        var vis = isVisible(it.el);
        var d = mouse.seen && vis ? distToStadium(s, mouse.x, mouse.y) : Infinity;
        var want = vis && d > 2 && d < RANGE;

        if (want && !it.active) { reset(it, s, mouse.x, mouse.y); it.active = true; }
        it.attached = want;
        if (!it.active) return false;

        var maxDist = 0;
        it.strands.forEach(function (st) {
            var a = anchorFor(s, st, want ? mouse.x : st.tx, want ? mouse.y : st.ty, 9);
            var gx = want ? mouse.x + st.jx : a.x;
            var gy = want ? mouse.y + st.jy : a.y;
            var k = want ? 0.22 : 0.14;
            st.tx += (gx - st.tx) * k;
            st.ty += (gy - st.ty) * k;

            var dist = Math.hypot(st.tx - a.x, st.ty - a.y);
            maxDist = Math.max(maxDist, dist);
            var seg = (dist * st.slack + 10) / M;
            var pts = st.pts;

            for (var i = 1; i < M; i++) {
                var p = pts[i];
                var vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP;
                p.px = p.x; p.py = p.y;
                p.x += vx; p.y += vy + GRAVITY;
            }
            pts[0].x = a.x; pts[0].y = a.y;
            pts[M].x = st.tx; pts[M].y = st.ty;

            for (var n = 0; n < ITER; n++) {
                for (var j = 0; j < M; j++) {
                    var p0 = pts[j], p1 = pts[j + 1];
                    var dx = p1.x - p0.x, dy = p1.y - p0.y;
                    var dd = Math.hypot(dx, dy) || 0.0001;
                    var diff = (dd - seg) / dd;
                    var m0 = j === 0 ? 0 : 0.5, m1 = j + 1 === M ? 0 : 0.5;
                    if (j === 0) m1 = 1;
                    if (j + 1 === M) m0 = 1;
                    p0.x += dx * diff * m0; p0.y += dy * diff * m0;
                    p1.x -= dx * diff * m1; p1.y -= dy * diff * m1;
                }
                pts[0].x = a.x; pts[0].y = a.y;
                pts[M].x = st.tx; pts[M].y = st.ty;
            }
        });

        it.power += ((want ? 1 : 0) - it.power) * 0.2;
        if (!want && maxDist < 5) { it.active = false; return false; }
        return true;
    }

    function draw(it) {
        var pal = palette(it.el);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        it.strands.forEach(function (st) {
            var pts = st.pts;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (var i = 1; i < M; i++) {
                var mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
            }
            ctx.lineTo(pts[M].x, pts[M].y);
            ctx.globalAlpha = 0.5 + 0.5 * it.power;
            ctx.strokeStyle = pal.rim; ctx.lineWidth = st.w + 1.6; ctx.stroke();
            ctx.strokeStyle = pal.core; ctx.lineWidth = st.w; ctx.stroke();
            // little drop where each thread leaves the button
            ctx.fillStyle = pal.core;
            ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, st.w * 1.5 + 0.8, 0, 6.2832); ctx.fill();
            ctx.beginPath(); ctx.arc(pts[M].x, pts[M].y, st.w * 0.9, 0, 6.2832); ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    var raf = 0;
    function frame() {
        ctx.clearRect(0, 0, W, H);
        var any = false;
        items.forEach(function (it) {
            if (step(it)) { any = true; draw(it); }
        });
        raf = any ? requestAnimationFrame(frame) : 0;
    }
    function wake() { if (!raf) raf = requestAnimationFrame(frame); }

    window.addEventListener('scroll', wake, { passive: true });
})();
