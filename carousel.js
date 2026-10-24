/*
 * CircularCarousel — a 3D cylinder carousel in vanilla JS (no build step needed).
 * Supports the same prop names as the React Bits CircularCarousel usage:
 *   preset, intro, cardWidth, aspectRatio, speed, captions, gap, tilt, curve, perspective,
 *   autoplay ('drift' | 'step' | 'off'), interval, direction, momentum, snap, pauseOnHover,
 *   focusOnClick, draggable, parallax, stretch, fadeColor, depthFade, innerShade, cornerRadius.
 * Extra callbacks: onSelect(item, index), onActiveChange(item, index).
 *
 *   const c = CircularCarousel(el, { items: [{ src, alt, title, subtitle }], ...props });
 *   c.next(); c.prev(); c.goTo(2); c.destroy();
 */
(function (global) {
    'use strict';

    const DEFAULTS = {
        items: [],
        preset: 'cylinder',
        intro: 'rise',
        cardWidth: 220,
        aspectRatio: 1,
        speed: 14,
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
        fadeColor: '#000000',
        depthFade: 0.55,
        innerShade: 0.6,
        cornerRadius: 12,
        minSlots: 10,
        onSelect: null,
        onActiveChange: null
    };

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const mod = (n, m) => ((n % m) + m) % m;
    const approach = (cur, target, dt, seconds) => cur + (target - cur) * (1 - Math.exp(-dt / seconds));

    function CircularCarousel(container, options) {
        if (!container) return null;
        const o = Object.assign({}, DEFAULTS, options || {});
        const items = o.items || [];
        if (!items.length) return null;

        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Repeat the items so a small set still fills a full ring.
        const repeat = Math.max(1, Math.ceil(o.minSlots / items.length));
        const slots = items.length * repeat;
        const step = 360 / slots;

        container.classList.add('cc-root');
        container.setAttribute('tabindex', '0');
        container.setAttribute('role', 'region');
        container.setAttribute('aria-roledescription', 'carousel');
        container.setAttribute('aria-label', 'Project carousel. Drag, or use the left and right arrow keys.');

        const stage = document.createElement('div');
        stage.className = 'cc-stage';
        stage.style.perspective = o.perspective + 'px';
        const ring = document.createElement('div');
        ring.className = 'cc-ring';
        stage.appendChild(ring);
        container.appendChild(stage);

        const cards = [];
        for (let i = 0; i < slots; i++) {
            const item = items[i % items.length];
            const el = document.createElement('div');
            el.className = 'cc-card';
            el.dataset.slot = String(i);
            el.setAttribute('role', 'group');
            el.setAttribute('aria-label', item.title || item.alt || 'Slide');
            const inner = document.createElement('div');
            inner.className = 'cc-card-inner';
            const img = document.createElement('img');
            img.src = item.src;
            img.alt = item.alt || item.title || '';
            img.draggable = false;
            img.decoding = 'async';
            inner.appendChild(img);
            const shade = document.createElement('div');
            shade.className = 'cc-card-shade';
            shade.style.background = o.fadeColor;
            inner.appendChild(shade);
            el.appendChild(inner);
            if (o.captions && (item.title || item.subtitle)) {
                const cap = document.createElement('div');
                cap.className = 'cc-caption';
                cap.innerHTML = '<strong></strong><span></span>';
                cap.firstChild.textContent = item.title || '';
                cap.lastChild.textContent = item.subtitle || '';
                el.appendChild(cap);
            }
            ring.appendChild(el);
            cards.push({ el, inner, shade });
        }

        // ---- State ----
        let width = 1;
        let cw = o.cardWidth;
        let ch = o.cardWidth / o.aspectRatio;
        let radius = 400;
        let angle = 0;
        let vel = 0;
        let seekTarget = null;
        let dragging = false;
        let hovering = false;
        let visible = false;
        let alive = true;
        let raf = 0;
        let last = performance.now();
        let idleUntil = 0;
        let stepTimer = 0;
        let introClock = 0;
        let introDone = o.intro === 'none' || reducedMotion;
        let parX = 0, parY = 0, parTX = 0, parTY = 0;
        let activeSlot = -1;
        const drag = { x: 0, lastX: 0, lastT: 0, moved: 0, startT: 0, slot: -1 };

        const degPerPx = () => (180 / Math.PI) / radius;

        const layout = () => {
            width = Math.max(1, container.clientWidth);
            const scale = clamp(width / 1000, 0.55, 1);
            cw = o.cardWidth * scale;
            ch = cw / o.aspectRatio;
            const base = (cw + o.gap * scale) / (2 * Math.sin((step * Math.PI) / 360));
            radius = base / Math.max(o.curve, 0.2);
            cards.forEach((c, i) => {
                c.el.style.width = cw + 'px';
                c.el.style.height = ch + 'px';
                c.el.style.marginLeft = -cw / 2 + 'px';
                c.el.style.marginTop = -ch / 2 + 'px';
                c.inner.style.borderRadius = o.cornerRadius + 'px';
            });
            wake();
        };

        const activeIndexFromAngle = () => mod(Math.round(-angle / step), slots);

        const render = (dt) => {
            const vNorm = clamp(Math.abs(vel) / 120, 0, 1);
            const ringTransform =
                'translateZ(' + -radius + 'px) rotateX(' + (o.tilt + parY) + 'deg) rotateY(' + (angle + parX) + 'deg)';
            ring.style.transform = ringTransform;

            for (let i = 0; i < slots; i++) {
                const c = cards[i];
                const phi = mod(angle + i * step + 180, 360) - 180; // -180..180, 0 = front
                const facing = Math.cos((phi * Math.PI) / 180);
                const t = (1 + facing) / 2; // 1 front, 0 back
                let shade = o.depthFade * Math.pow(1 - t, 1.2);
                if (facing < 0) shade += o.innerShade * -facing * 0.6;
                shade = clamp(shade, 0, 0.94);

                let lift = 0;
                let alpha = 1;
                if (!introDone) {
                    const delay = (i / slots) * 0.45;
                    const local = clamp((introClock - delay) / 0.6, 0, 1);
                    const e = 1 - Math.pow(1 - local, 3);
                    lift = (1 - e) * ch * 1.3;
                    alpha = e;
                }
                c.el.style.transform = 'rotateY(' + i * step + 'deg) translateZ(' + radius + 'px) translateY(' + lift + 'px)';
                c.el.style.opacity = alpha;
                c.shade.style.opacity = shade;
                const sy = 1 + o.stretch * 0.05 * vNorm;
                const sk = (vel > 0 ? -1 : 1) * o.stretch * 2.2 * vNorm;
                c.inner.style.transform = 'scaleY(' + sy + ') skewY(' + sk + 'deg)';
                c.el.style.zIndex = Math.round(t * 100);
                c.el.classList.toggle('cc-front', t > 0.985);
            }

            const idx = activeIndexFromAngle();
            if (idx !== activeSlot) {
                activeSlot = idx;
                if (typeof o.onActiveChange === 'function') {
                    o.onActiveChange(items[idx % items.length], idx % items.length);
                }
            }
        };

        const seekToAngle = (target) => {
            seekTarget = target;
            vel = 0;
            wake();
        };
        const seekToSlot = (slot) => {
            const raw = -slot * step;
            const k = Math.round((angle - raw) / 360);
            seekToAngle(raw + 360 * k);
        };
        const nearest = () => Math.round(angle / step) * step;

        const tick = (now) => {
            raf = 0;
            const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
            last = now;
            const nowMs = now;

            if (!introDone) {
                introClock += dt;
                if (introClock > 1.6) introDone = true;
            }

            // Mouse parallax
            parX = approach(parX, parTX, dt, 0.2);
            parY = approach(parY, parTY, dt, 0.2);

            const before = angle;
            if (dragging) {
                // angle is driven by pointer events
            } else if (seekTarget !== null) {
                angle = approach(angle, seekTarget, dt, 0.22);
                if (Math.abs(seekTarget - angle) < 0.03) {
                    angle = seekTarget;
                    seekTarget = null;
                    idleUntil = nowMs + 1600;
                }
                vel = (angle - before) / dt;
            } else {
                const autoOn = !reducedMotion && o.autoplay !== 'off' && introDone && nowMs > idleUntil && !(o.pauseOnHover && hovering);
                if (o.autoplay === 'drift') {
                    const sign = o.direction === 'left' ? -1 : 1;
                    const target = autoOn ? sign * o.speed : 0;
                    const tau = autoOn ? 0.8 : 0.35 + o.momentum * 0.9;
                    vel = approach(vel, target, dt, tau);
                    angle += vel * dt;
                    if (o.snap && !autoOn && Math.abs(vel) < 6 && Math.abs(angle - nearest()) > 0.05) {
                        seekToAngle(nearest());
                    }
                } else {
                    // 'step' autoplay or 'off': decay momentum then snap
                    vel = approach(vel, 0, dt, 0.35 + o.momentum * 0.9);
                    angle += vel * dt;
                    if (Math.abs(vel) < 6 && o.snap && Math.abs(angle - nearest()) > 0.05) seekToAngle(nearest());
                    if (o.autoplay === 'step' && autoOn) {
                        stepTimer += dt;
                        if (stepTimer >= o.interval) {
                            stepTimer = 0;
                            seekToAngle(nearest() + (o.direction === 'left' ? -step : step));
                        }
                    }
                }
            }
            if (dragging) vel = approach(vel, 0, dt, 0.12); // decays if the pointer pauses

            render(dt);
            if (visible && alive) raf = requestAnimationFrame(tick);
        };

        function wake() {
            if (raf || !visible || !alive) return;
            last = performance.now();
            raf = requestAnimationFrame(tick);
        }

        // ---- Pointer interaction ----
        const onDown = (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            const cardEl = e.target.closest && e.target.closest('.cc-card');
            drag.slot = cardEl ? parseInt(cardEl.dataset.slot, 10) : -1;
            drag.x = drag.lastX = e.clientX;
            drag.lastT = performance.now();
            drag.startT = drag.lastT;
            drag.moved = 0;
            if (o.draggable) {
                dragging = true;
                seekTarget = null;
                if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
                stage.classList.add('cc-grabbing');
            }
            wake();
        };
        const onMove = (e) => {
            const rect = container.getBoundingClientRect();
            const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
            parTX = clamp(nx, -1, 1) * o.parallax * 8;
            parTY = clamp(-ny, -1, 1) * o.parallax * 5;
            if (e.pointerType === 'mouse') hovering = true;
            if (dragging) {
                const now = performance.now();
                const dx = e.clientX - drag.lastX;
                drag.moved += Math.abs(dx);
                const dAngle = dx * degPerPx();
                angle += dAngle;
                const dtS = Math.max(0.001, (now - drag.lastT) / 1000);
                vel = approach(vel, dAngle / dtS, 0.016, 0.05);
                drag.lastX = e.clientX;
                drag.lastT = now;
            }
            wake();
        };
        const onUp = (e) => {
            const wasClick = drag.moved < 6 && performance.now() - drag.startT < 600;
            if (dragging) {
                dragging = false;
                stage.classList.remove('cc-grabbing');
                if (stage.releasePointerCapture) {
                    try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
                }
                vel *= 0.4 + o.momentum; // momentum carry
                idleUntil = performance.now() + 1800;
            }
            if (wasClick && drag.slot >= 0) {
                const slot = drag.slot;
                const isFront = slot === activeIndexFromAngle();
                if (isFront) {
                    if (typeof o.onSelect === 'function') o.onSelect(items[slot % items.length], slot % items.length);
                } else if (o.focusOnClick) {
                    seekToSlot(slot);
                }
            } else if (!o.draggable && wasClick === false) {
                // nothing
            }
            drag.slot = -1;
            wake();
        };
        const onEnter = (e) => { if (e.pointerType === 'mouse') hovering = true; };
        const onLeave = () => { hovering = false; parTX = 0; parTY = 0; wake(); };

        const onKey = (e) => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); api.next(); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); api.prev(); }
            else if (e.key === 'Enter') {
                const i = activeIndexFromAngle();
                if (typeof o.onSelect === 'function') o.onSelect(items[i % items.length], i % items.length);
            }
        };

        stage.addEventListener('pointerdown', onDown);
        stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerup', onUp);
        stage.addEventListener('pointercancel', onUp);
        stage.addEventListener('pointerenter', onEnter);
        stage.addEventListener('pointerleave', onLeave);
        container.addEventListener('keydown', onKey);

        const ro = new ResizeObserver(layout);
        ro.observe(container);
        const io = new IntersectionObserver((entries) => {
            const was = visible;
            visible = entries[0].isIntersecting;
            if (visible && !was) wake();
        }, { threshold: 0.05 });
        io.observe(container);

        layout();
        render(0);

        const api = {
            // "next" brings the card on the right to the front (ring turns right-to-left)
            // Based on the current seek target so quick repeated presses stack up
            next() { idleUntil = performance.now() + 1800; seekToAngle((seekTarget !== null ? seekTarget : nearest()) - step); },
            prev() { idleUntil = performance.now() + 1800; seekToAngle((seekTarget !== null ? seekTarget : nearest()) + step); },
            goTo(index) {
                idleUntil = performance.now() + 1800;
                const slot = mod(index, items.length);
                seekToSlot(slot);
            },
            destroy() {
                alive = false;
                cancelAnimationFrame(raf);
                ro.disconnect();
                io.disconnect();
                stage.removeEventListener('pointerdown', onDown);
                stage.removeEventListener('pointermove', onMove);
                stage.removeEventListener('pointerup', onUp);
                stage.removeEventListener('pointercancel', onUp);
                stage.removeEventListener('pointerenter', onEnter);
                stage.removeEventListener('pointerleave', onLeave);
                container.removeEventListener('keydown', onKey);
                stage.remove();
            }
        };
        return api;
    }

    global.CircularCarousel = CircularCarousel;
})(window);
