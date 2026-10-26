/* Small UI behaviours for the redesign: active nav link, native smooth anchors,
 * mobile menu semantics, and pointer tilt on project media. Nothing here
 * takes over normal scrolling. */
(function () {
    'use strict';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- active section in the navigation ---------- */
    var links = Array.prototype.slice.call(document.querySelectorAll('.navbar .nav-link, .mobile-navbar .mobile-link'));
    var map = {};
    links.forEach(function (a) {
        var id = (a.getAttribute('href') || '').replace('#', '');
        if (id) (map[id] = map[id] || []).push(a);
    });
    var sections = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    function setActive(id) {
        links.forEach(function (a) { a.classList.remove('is-current'); a.removeAttribute('aria-current'); });
        (map[id] || []).forEach(function (a) { a.classList.add('is-current'); a.setAttribute('aria-current', 'true'); });
    }
    if ('IntersectionObserver' in window && sections.length) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        sections.forEach(function (s) { io.observe(s); });
        var hero = document.getElementById('hero');
        if (hero) new IntersectionObserver(function (e) { if (e[0].isIntersecting) setActive(''); }, { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
    }

    /* ---------- native smooth anchors (respects reduced motion) ---------- */
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        var id = a.getAttribute('href');
        if (id === '#') { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
        var el = document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        if (history.replaceState) history.replaceState(null, '', id);
    });

    /* ---------- mobile menu: expose state to assistive tech, close on Escape ---------- */
    var toggle = document.getElementById('menu-toggle');
    var drawer = document.getElementById('mobile-navbar');
    if (toggle && drawer) {
        toggle.setAttribute('aria-controls', 'mobile-navbar');
        toggle.setAttribute('aria-expanded', 'false');
        new MutationObserver(function () {
            toggle.setAttribute('aria-expanded', drawer.classList.contains('open') ? 'true' : 'false');
        }).observe(drawer, { attributes: true, attributeFilter: ['class'] });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && drawer.classList.contains('open')) { toggle.click(); toggle.focus(); }
        });
    }

    /* ---------- gentle 3D tilt on project media (fine pointers only) ---------- */
    if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('[data-tilt]').forEach(function (el) {
            var raf = 0, rx = 0, ry = 0;
            function apply() { raf = 0; el.style.transform = 'perspective(1100px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)'; }
            el.addEventListener('pointermove', function (e) {
                var r = el.getBoundingClientRect();
                var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
                ry = x * 7; rx = -y * 5;
                if (!raf) raf = requestAnimationFrame(apply);
            });
            el.addEventListener('pointerleave', function () {
                rx = ry = 0;
                if (!raf) raf = requestAnimationFrame(apply);
            });
        });
    }
})();
