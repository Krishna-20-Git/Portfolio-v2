/* Shared 3D scene.
 * One fixed WebGL canvas sits behind the whole page. A metallic geometric core,
 * orbital rings, a skills constellation and drifting particles are all driven by
 * the scroll position, so the camera glides from section to section.
 *
 * - Three.js is self-hosted (vendor/), loaded lazily, and optional: if WebGL or the
 *   file is unavailable the site shows a CSS gradient instead.
 * - Loops pause while the tab is hidden; reduced-motion renders on demand only.
 * - destroy() disposes every geometry, material, texture and listener.
 */
(function () {
    'use strict';

    var html = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function webglAvailable() {
        try {
            var c = document.createElement('canvas');
            var gl = c.getContext('webgl2') || c.getContext('webgl');
            if (!gl) return false;
            var lose = gl.getExtension('WEBGL_lose_context');
            if (lose) lose.loseContext();
            return true;
        } catch (e) { return false; }
    }

    var conn = navigator.connection || {};
    // Data-saver or very low memory: skip WebGL entirely. (CPU core count is not used:
    // it is unreliable, and slower devices are handled by the adaptive quality step below.)
    var lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 1) || conn.saveData === true;

    if (!webglAvailable() || lowPower || /[?&]no3d\b/.test(location.search)) {
        html.classList.add('no-3d');
        return;
    }

    html.classList.add('scene-3d');   // lets the page drop the 2D ambient canvas

    function fail(err) {
        if (window.console && console.warn) console.warn('3D scene unavailable, using fallback.', err);
        html.classList.remove('scene-3d', 'scene-ready');
        html.classList.add('no-3d');
    }

    import('./vendor/three.module.min.js').then(start).catch(fail);

    function start(THREE) {
        var canvas = document.createElement('canvas');
        canvas.id = 'scene3d';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(canvas, document.body.firstChild);

        var small = window.innerWidth < 768;
        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({
                canvas: canvas, antialias: !small, alpha: true,
                powerPreference: 'high-performance'
            });
        } catch (e) { canvas.remove(); return fail(e); }

        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
        var disposables = [];
        function track(o) { disposables.push(o); return o; }

        /* ---------- procedural reflections: a few coloured light panels ---------- */
        var pmrem = new THREE.PMREMGenerator(renderer);
        var envScene = new THREE.Scene();
        envScene.add(new THREE.Mesh(
            new THREE.BoxGeometry(24, 24, 24),
            new THREE.MeshBasicMaterial({ color: 0x070b14, side: THREE.BackSide })));
        function panel(color, k, x, y, z, w, h) {
            var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
                new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
            m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
        }
        panel(0x38d5ff, 7, -7, 4, 5, 7, 3);
        panel(0x8b6cff, 6, 7, -2, 4, 5, 3);
        panel(0xffffff, 5, 0, 9, -3, 9, 2);
        panel(0x3b82ff, 4, 1, -7, 6, 8, 2);
        var envRT = pmrem.fromScene(envScene, 0.04);
        scene.environment = envRT.texture;
        pmrem.dispose();
        envScene.traverse(function (o) {
            if (o.geometry) o.geometry.dispose();
            if (o.material) o.material.dispose();
        });

        /* ---------- shared sprite for particles ---------- */
        var spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = spriteCanvas.height = 64;
        var sctx = spriteCanvas.getContext('2d');
        var sg = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        sg.addColorStop(0, 'rgba(255,255,255,1)');
        sg.addColorStop(0.35, 'rgba(255,255,255,0.55)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        sctx.fillStyle = sg; sctx.fillRect(0, 0, 64, 64);
        var sprite = track(new THREE.CanvasTexture(spriteCanvas));

        /* ---------- the core ---------- */
        var world = new THREE.Group();
        scene.add(world);
        var core = new THREE.Group();
        world.add(core);

        var coreMat = track(new THREE.MeshStandardMaterial({
            color: 0x7f93b3, metalness: 1, roughness: 0.34, flatShading: true, envMapIntensity: 0.9
        }));
        var coreGeo = track(new THREE.IcosahedronGeometry(1.15, 1));
        var coreMesh = new THREE.Mesh(coreGeo, coreMat);
        core.add(coreMesh);

        var shellGeo = track(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.34, 1)));
        var shellMat = track(new THREE.LineBasicMaterial({ color: 0x38d5ff, transparent: true, opacity: 0.55 }));
        var shell = new THREE.LineSegments(shellGeo, shellMat);
        core.add(shell);

        var keyLight = new THREE.PointLight(0x38d5ff, 22, 14, 1.6);
        keyLight.position.set(-2.4, 1.6, 3.2);
        var rimLight = new THREE.PointLight(0x8b6cff, 18, 14, 1.6);
        rimLight.position.set(2.6, -1.4, -1.5);
        scene.add(keyLight, rimLight, new THREE.AmbientLight(0x3a4d78, 0.9));

        /* ---------- orbital rings with small orbiting nodes ---------- */
        var rings = [];
        var ringDefs = [
            { r: 2.15, tube: 0.011, color: 0x38d5ff, tilt: [1.15, 0.2, 0.0], speed: 0.16, sat: 2 },
            { r: 2.8,  tube: 0.009, color: 0x3b82ff, tilt: [-0.55, 0.5, 0.3], speed: -0.11, sat: 3 },
            { r: 3.55, tube: 0.008, color: 0x8b6cff, tilt: [0.35, -0.3, 0.9], speed: 0.07, sat: 2 }
        ];
        var satGeo = track(new THREE.IcosahedronGeometry(0.055, 0));
        ringDefs.forEach(function (d) {
            var g = new THREE.Group();
            var geo = track(new THREE.TorusGeometry(d.r, d.tube, 6, small ? 96 : 192));
            var mat = track(new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.6 }));
            g.add(new THREE.Mesh(geo, mat));
            var sats = [];
            for (var i = 0; i < d.sat; i++) {
                var sm = track(new THREE.MeshBasicMaterial({ color: d.color }));
                var s = new THREE.Mesh(satGeo, sm);
                g.add(s);
                sats.push({ mesh: s, a: (i / d.sat) * Math.PI * 2 + Math.random(), mat: sm });
            }
            g.rotation.set(d.tilt[0], d.tilt[1], d.tilt[2]);
            core.add(g);
            rings.push({ group: g, def: d, mat: mat, sats: sats, baseTilt: d.tilt.slice() });
        });

        /* ---------- atmospheric particles ---------- */
        var PCOUNT = small ? 420 : 1100;
        var ppos = new Float32Array(PCOUNT * 3);
        for (var p = 0; p < PCOUNT; p++) {
            var rr = 4.5 + Math.pow(Math.random(), 0.8) * 13;
            var th = Math.random() * Math.PI * 2;
            var ph = Math.acos(2 * Math.random() - 1);
            ppos[p * 3] = rr * Math.sin(ph) * Math.cos(th);
            ppos[p * 3 + 1] = rr * Math.sin(ph) * Math.sin(th) * 0.7;
            ppos[p * 3 + 2] = rr * Math.cos(ph) - 3;
        }
        var pGeo = track(new THREE.BufferGeometry());
        pGeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
        var pMat = track(new THREE.PointsMaterial({
            size: small ? 0.07 : 0.06, map: sprite, transparent: true, opacity: 0.75,
            depthWrite: false, blending: THREE.AdditiveBlending, color: 0x9fd8ff, sizeAttenuation: true
        }));
        var particles = new THREE.Points(pGeo, pMat);
        world.add(particles);

        /* ---------- skills constellation (nodes joined to their nearest neighbours) ---------- */
        var constellation = new THREE.Group();
        world.add(constellation);
        var NN = small ? 22 : 40;
        var npos = [];
        var nodeAttr = new Float32Array(NN * 3);
        for (var n = 0; n < NN; n++) {
            var x = (Math.random() - 0.5) * 11;
            var y = (Math.random() - 0.5) * 6.5;
            var z = (Math.random() - 0.5) * 5 - 1;
            npos.push(new THREE.Vector3(x, y, z));
            nodeAttr[n * 3] = x; nodeAttr[n * 3 + 1] = y; nodeAttr[n * 3 + 2] = z;
        }
        var nGeo = track(new THREE.BufferGeometry());
        nGeo.setAttribute('position', new THREE.BufferAttribute(nodeAttr, 3));
        var nMat = track(new THREE.PointsMaterial({
            size: 0.2, map: sprite, transparent: true, opacity: 0, depthWrite: false,
            blending: THREE.AdditiveBlending, color: 0x38d5ff, sizeAttenuation: true
        }));
        constellation.add(new THREE.Points(nGeo, nMat));
        var linePts = [];
        for (var a = 0; a < NN; a++) {
            var ds = [];
            for (var b = 0; b < NN; b++) if (a !== b) ds.push({ b: b, d: npos[a].distanceToSquared(npos[b]) });
            ds.sort(function (u, v) { return u.d - v.d; });
            for (var k = 0; k < 2; k++) {
                if (a < ds[k].b) {
                    linePts.push(npos[a].x, npos[a].y, npos[a].z, npos[ds[k].b].x, npos[ds[k].b].y, npos[ds[k].b].z);
                }
            }
        }
        var lGeo = track(new THREE.BufferGeometry());
        lGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePts), 3));
        var lMat = track(new THREE.LineBasicMaterial({ color: 0x3b82ff, transparent: true, opacity: 0 }));
        constellation.add(new THREE.LineSegments(lGeo, lMat));

        /* ---------- theme (dark is the default look) ---------- */
        function applyTheme() {
            var light = document.body.getAttribute('data-theme') === 'light';
            pMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
            pMat.color.set(light ? 0x2a4a8a : 0x9fd8ff);
            pMat.opacity = light ? 0.55 : 0.75;
            nMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
            nMat.color.set(light ? 0x1d5fe0 : 0x38d5ff);
            lMat.color.set(light ? 0x1d5fe0 : 0x3b82ff);
            shellMat.color.set(light ? 0x1d5fe0 : 0x38d5ff);
            coreMat.color.set(light ? 0x5d7396 : 0x9db3d3);
            pMat.needsUpdate = nMat.needsUpdate = true;
            requestFrame();
        }

        /* ---------- scroll -> camera composition ---------- */
        // Each stop describes the scene while that section is centred on screen.
        function stops() {
            var s = small;
            return [
                /* hero       */ { cam: [0, 0, s ? 10.5 : 8.6], cx: s ? 0 : 3.1, cy: s ? 1.9 : 0.15, sc: s ? 0.7 : 0.9, ring: 1, con: 0, op: 1, spread: 1, tilt: 0 },
                /* about      */ { cam: [0, 0, s ? 10 : 7.4], cx: s ? 0 : -3.6, cy: s ? 2.6 : 1.5, sc: s ? 0.45 : 0.55, ring: 0.6, con: 0, op: 0.55, spread: 1.15, tilt: 0.4 },
                /* skills     */ { cam: [0, 0, s ? 12 : 9.6], cx: s ? 0 : 3.8, cy: s ? 3 : 1.4, sc: s ? 0.35 : 0.5, ring: 0.5, con: 1, op: 0.8, spread: 1.4, tilt: 0.8 },
                /* projects   */ { cam: [0, 0, s ? 12 : 11], cx: s ? 0 : -5, cy: s ? 3.4 : 1.7, sc: s ? 0.3 : 0.4, ring: 0.35, con: 0.22, op: 0.4, spread: 1.7, tilt: 1.2 },
                /* experience */ { cam: [0, 0, s ? 12 : 11], cx: s ? 0 : 5, cy: s ? 3.4 : 1.7, sc: s ? 0.3 : 0.4, ring: 0.35, con: 0, op: 0.4, spread: 1.7, tilt: 1.5 },
                /* contact    */ { cam: [0, 0, s ? 10.5 : 8.2], cx: s ? 0 : 4.6, cy: s ? 2.0 : 1.5, sc: s ? 0.5 : 0.6, ring: 0.9, con: 0, op: 0.9, spread: 1, tilt: 0 }
            ];
        }
        var ids = ['hero', 'about', 'skills', 'projects', 'experience', 'contact'];
        var tops = [];
        function measure() {
            var maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            var prev = -1;
            tops = ids.map(function (id) {
                var el = document.getElementById(id);
                if (!el) return null;
                // a section's stop is reached when its top meets the top of the screen
                // (or when the page runs out of scroll, for the last sections)
                var t = Math.min(el.getBoundingClientRect().top + window.scrollY, maxScroll);
                t = Math.max(t, prev + 1);
                prev = t;
                return t;
            });
        }
        var KEYS = ['cx', 'cy', 'sc', 'ring', 'con', 'op', 'spread', 'tilt'];
        var cur = null;           // smoothed state
        var tgt = null;           // state implied by scroll
        function sampleTarget() {
            var st = stops();
            var y = window.scrollY;
            var i = 0;
            for (var k = 0; k < tops.length; k++) if (tops[k] !== null && y >= tops[k]) i = k;
            var j = Math.min(i + 1, st.length - 1);
            var t = 0;
            if (j !== i && tops[j] !== null && tops[i] !== null) {
                t = Math.min(1, Math.max(0, (y - tops[i]) / Math.max(1, tops[j] - tops[i])));
                t = t * t * (3 - 2 * t);
            }
            var a = st[i], b = st[j], o = { cam: [0, 0, 0] };
            for (var c = 0; c < 3; c++) o.cam[c] = a.cam[c] + (b.cam[c] - a.cam[c]) * t;
            KEYS.forEach(function (key) { o[key] = a[key] + (b[key] - a[key]) * t; });
            return o;
        }

        var pointer = { x: 0, y: 0, sx: 0, sy: 0 };
        function onPointer(e) {
            pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
            pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
            requestFrame();
        }

        function resize() {
            small = window.innerWidth < 768;
            var w = window.innerWidth, h = window.innerHeight;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            measure();
            requestFrame();
        }
        var resizeTimer = 0;
        function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); }

        /* ---------- render loop ---------- */
        var raf = 0, last = performance.now(), time = 0, frameSkip = 0, running = true, destroyed = false;
        var perfFrames = 0, perfTime = 0, qualityChecked = false;

        function requestFrame() {
            if (destroyed || raf || document.hidden) return;
            raf = requestAnimationFrame(loop);
        }

        function loop(now) {
            raf = 0;
            if (destroyed || document.hidden) return;
            var dt = Math.min(0.05, (now - last) / 1000);
            last = now;

            if (small && !reduceMotion) {            // phones: 30 fps is plenty
                frameSkip ^= 1;
                if (frameSkip) { raf = requestAnimationFrame(loop); return; }
                dt *= 2;
            }

            time += reduceMotion ? 0 : dt;
            tgt = sampleTarget();
            if (!cur) cur = JSON.parse(JSON.stringify(tgt));
            var k = reduceMotion ? 1 : 1 - Math.exp(-dt * 3.2);
            for (var c = 0; c < 3; c++) cur.cam[c] += (tgt.cam[c] - cur.cam[c]) * k;
            var settling = false;
            KEYS.forEach(function (key) {
                var d = tgt[key] - cur[key];
                if (Math.abs(d) > 0.0008) settling = true;
                cur[key] += d * k;
            });

            pointer.sx += (pointer.x - pointer.sx) * (reduceMotion ? 0 : 0.06);
            pointer.sy += (pointer.y - pointer.sy) * (reduceMotion ? 0 : 0.06);

            camera.position.set(cur.cam[0] + pointer.sx * 0.45, cur.cam[1] - pointer.sy * 0.28, cur.cam[2]);
            camera.lookAt(0, 0, 0);

            core.position.set(cur.cx, cur.cy, 0);
            core.scale.setScalar(cur.sc);
            core.rotation.y = time * 0.22 + pointer.sx * 0.35;
            core.rotation.x = Math.sin(time * 0.3) * 0.12 + pointer.sy * 0.2;

            rings.forEach(function (r, i) {
                r.group.rotation.x = r.baseTilt[0] + cur.tilt * (i === 1 ? -0.5 : 0.35) + time * r.def.speed * 0.25;
                r.group.rotation.z = r.baseTilt[2] + time * r.def.speed;
                r.group.scale.setScalar(1 + (cur.spread - 1) * 0.18 * (i + 1));
                r.mat.opacity = 0.6 * cur.ring;
                r.sats.forEach(function (s, si) {
                    s.a += dt * (0.5 + i * 0.18) * (si % 2 ? -1 : 1) * (reduceMotion ? 0 : 1);
                    s.mesh.position.set(Math.cos(s.a) * r.def.r, Math.sin(s.a) * r.def.r, 0);
                    s.mesh.visible = cur.ring > 0.05;
                });
            });
            shellMat.opacity = 0.55 * Math.min(1, cur.ring + 0.2);

            constellation.position.set(0, 0, 0);
            constellation.rotation.y = time * 0.05 + pointer.sx * 0.08;
            constellation.rotation.x = pointer.sy * 0.05;
            nMat.opacity = 0.95 * cur.con;
            lMat.opacity = 0.32 * cur.con;
            constellation.visible = cur.con > 0.01;

            particles.rotation.y = time * 0.015;
            particles.rotation.x = pointer.sy * 0.03;

            canvas.style.opacity = String(Math.max(0, Math.min(1, cur.op)));
            renderer.render(scene, camera);

            // Adaptive quality: if the first second of frames is slow, drop resolution and particles.
            if (!qualityChecked && !reduceMotion) {
                perfFrames++; perfTime += dt;
                if (perfFrames >= 60) {
                    qualityChecked = true;
                    if (perfTime / perfFrames > 0.034) {
                        renderer.setPixelRatio(1);
                        renderer.setSize(window.innerWidth, window.innerHeight, false);
                        pGeo.setDrawRange(0, Math.floor(PCOUNT * 0.4));
                    }
                }
            }
            if (!html.classList.contains('scene-ready')) html.classList.add('scene-ready');

            if (!reduceMotion || settling) raf = requestAnimationFrame(loop);
        }

        /* ---------- lifecycle ---------- */
        function onVisibility() {
            if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
            else { last = performance.now(); requestFrame(); }
        }
        function onScroll() { requestFrame(); }
        function onContextLost(e) { e.preventDefault(); if (raf) { cancelAnimationFrame(raf); raf = 0; } html.classList.remove('scene-ready'); }
        function onContextRestored() { html.classList.add('scene-ready'); requestFrame(); }

        function destroy() {
            if (destroyed) return;
            destroyed = true;
            if (raf) cancelAnimationFrame(raf);
            clearTimeout(resizeTimer);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('pointermove', onPointer);
            document.removeEventListener('visibilitychange', onVisibility);
            canvas.removeEventListener('webglcontextlost', onContextLost);
            canvas.removeEventListener('webglcontextrestored', onContextRestored);
            themeObserver.disconnect();
            bodyObserver.disconnect();
            disposables.forEach(function (d) { if (d && d.dispose) d.dispose(); });
            if (envRT) envRT.dispose();
            renderer.dispose();
            canvas.remove();
            html.classList.remove('scene-3d', 'scene-ready');
            html.classList.add('no-3d');
        }

        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('pointermove', onPointer, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);
        canvas.addEventListener('webglcontextlost', onContextLost);
        canvas.addEventListener('webglcontextrestored', onContextRestored);
        window.addEventListener('pagehide', destroy, { once: true });

        var themeObserver = new MutationObserver(applyTheme);
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
        // Section heights change as images and fonts load: re-measure when the page grows.
        var lastH = 0;
        var bodyObserver = new ResizeObserver(function () {
            var h = document.body.scrollHeight;
            if (Math.abs(h - lastH) > 4) { lastH = h; measure(); requestFrame(); }
        });
        bodyObserver.observe(document.body);

        window.scene3d = { destroy: destroy };
        resize();
        applyTheme();
    }
})();
