/* Section divider drawn as a tight string: hover/touch under it and it is
   pulled down, then it springs back with only a small, quickly-damped wobble. */
(function () {
    'use strict';
    var lines = Array.prototype.slice.call(document.querySelectorAll('.accent-line'));
    if (!lines.length) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var NS = 'http://www.w3.org/2000/svg';
    var N = 28;                 // points on the string
    var PULL_MAX = 34;          // deepest pull in px
    var ZONE_UP = 14, ZONE_DOWN = 70;  // hover zone around the line

    var strings = lines.map(function (el, idx) {
        var svg = document.createElementNS(NS, 'svg');
        var w = Math.min(300, Math.round(window.innerWidth * 0.7));
        svg.setAttribute('class', 'string-line');
        svg.setAttribute('width', w);
        svg.setAttribute('height', 10);
        svg.setAttribute('viewBox', '0 0 ' + w + ' 10');
        svg.setAttribute('aria-hidden', 'true');
        var id = 'string-grad-' + idx;
        svg.innerHTML =
            '<defs><linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="0" x2="' + w + '" y1="0" y2="0">' +
            '<stop offset="0" style="stop-color:var(--accent-primary)"/>' +
            '<stop offset="1" style="stop-color:var(--accent-secondary)"/></linearGradient></defs>' +
            '<path fill="none" stroke="url(#' + id + ')" stroke-width="4" stroke-linecap="round"/>';
        el.replaceWith(svg);
        var path = svg.querySelector('path');
        var s = { svg: svg, path: path, w: w, pad: 3, d: [], v: [], target: null, tx: 0 };
        for (var i = 0; i < N; i++) { s.d.push(0); s.v.push(0); }
        draw(s);
        return s;
    });

    function draw(s) {
        var x0 = s.pad, x1 = s.w - s.pad, step = (x1 - x0) / (N - 1), y0 = 5;
        var pts = [];
        for (var i = 0; i < N; i++) pts.push([x0 + i * step, y0 + s.d[i]]);
        var p = 'M' + pts[0][0] + ' ' + pts[0][1];
        for (var j = 1; j < N - 1; j++) {
            var mx = (pts[j][0] + pts[j + 1][0]) / 2, my = (pts[j][1] + pts[j + 1][1]) / 2;
            p += ' Q' + pts[j][0].toFixed(1) + ' ' + pts[j][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
        }
        p += ' L' + pts[N - 1][0] + ' ' + pts[N - 1][1];
        s.path.setAttribute('d', p);
    }

    var mouse = { x: -9999, y: -9999 };
    var raf = 0;

    function update(s) {
        var r = s.svg.getBoundingClientRect();
        var lineY = r.top + 5;
        var inside = mouse.x >= r.left && mouse.x <= r.right &&
                     mouse.y >= lineY - ZONE_UP && mouse.y <= lineY + ZONE_DOWN;
        var pull = 0, c = 0;
        if (inside) {
            pull = Math.min(PULL_MAX, Math.max(0, mouse.y - lineY));
            c = (mouse.x - r.left - s.pad) / (s.w - 2 * s.pad) * (N - 1);
        }
        var moving = false;
        for (var i = 0; i < N; i++) {
            var f = 0;
            if (i === 0 || i === N - 1) { s.d[i] = 0; s.v[i] = 0; continue; }
            // gentle return to rest + neighbour coupling keeps it string-like
            f += -0.05 * s.d[i];
            f += 0.03 * ((s.d[i - 1] + s.d[i + 1]) / 2 - s.d[i]);
            if (inside) {
                var g = Math.exp(-Math.pow((i - c) / 5.5, 2));
                f += 0.28 * (pull * g - s.d[i]);       // follow the pointer
            }
            s.v[i] = (s.v[i] + f) * 0.70;               // heavy damping: almost no vibration
            s.d[i] += s.v[i];
            if (Math.abs(s.d[i]) > 0.05 || Math.abs(s.v[i]) > 0.05) moving = true;
        }
        draw(s);
        return moving || inside;
    }

    function frame() {
        var any = false;
        strings.forEach(function (s) { if (update(s)) any = true; });
        raf = any ? requestAnimationFrame(frame) : 0;
    }
    function wake() { if (!raf) raf = requestAnimationFrame(frame); }

    if (reduce) return;
    window.addEventListener('pointermove', function (e) {
        mouse.x = e.clientX; mouse.y = e.clientY;
        var near = strings.some(function (s) {
            var r = s.svg.getBoundingClientRect();
            return r.bottom > -100 && r.top < window.innerHeight + 100 &&
                   mouse.x >= r.left - 20 && mouse.x <= r.right + 20 &&
                   mouse.y >= r.top - 40 && mouse.y <= r.top + 120;
        });
        if (near) wake();
    }, { passive: true });
    window.addEventListener('pointerup', function () { mouse.x = mouse.y = -9999; wake(); });
    document.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; wake(); });
    window.addEventListener('scroll', function () { if (mouse.x > -9000) wake(); }, { passive: true });
})();
