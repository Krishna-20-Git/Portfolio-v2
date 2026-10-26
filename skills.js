/* Skills explorer: choose a technology and see which project below uses it.
 * Everything is real, selectable buttons (keyboard friendly) and the mapping
 * lives in the markup (data-projects), so it never needs hover. */
(function () {
    'use strict';
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.tech-node'));
    var title = document.getElementById('tech-panel-title');
    var list = document.getElementById('tech-panel-links');
    var note = document.getElementById('tech-panel-note');
    if (!nodes.length || !title || !list) return;

    var PROJECTS = {
        kriya: 'Kriya Project Manager',
        invoice: 'Distributed Invoice System',
        algorithms: 'Algorithm Suite Platform',
        scheduler: 'OS Scheduling Simulator'
    };
    var DEFAULT_TITLE = title.textContent;
    var DEFAULT_NOTE = note ? note.textContent : '';
    var active = null;

    function clear() {
        nodes.forEach(function (n) { n.setAttribute('aria-pressed', 'false'); n.classList.remove('is-active'); });
        document.querySelectorAll('.case.is-linked').forEach(function (c) { c.classList.remove('is-linked'); });
        list.innerHTML = '';
        title.textContent = DEFAULT_TITLE;
        if (note) note.textContent = DEFAULT_NOTE;
        active = null;
    }

    function select(node) {
        if (active === node) { clear(); return; }
        clear();
        active = node;
        node.setAttribute('aria-pressed', 'true');
        node.classList.add('is-active');
        title.textContent = node.textContent.trim();
        var ids = (node.getAttribute('data-projects') || '').split(/\s+/).filter(Boolean);
        if (!ids.length) {
            if (note) note.textContent = 'Listed as a skill. No project on this page is tagged with it yet.';
            return;
        }
        if (note) note.textContent = ids.length === 1 ? '1 project' : ids.length + ' projects';
        ids.forEach(function (id) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = '#project-' + id;
            a.textContent = PROJECTS[id] || id;
            li.appendChild(a);
            list.appendChild(li);
            var card = document.getElementById('project-' + id);
            if (card) card.classList.add('is-linked');
        });
    }

    nodes.forEach(function (n) {
        n.addEventListener('click', function () { select(n); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && active) clear(); });
})();
