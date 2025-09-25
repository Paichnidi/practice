// Interactive calendar modal + newsletter feedback

const monthToNum = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12'
};

// Demo events
const EVENTS = {
    '2025-09-12': [{ title: 'Logistics Sync', timeStart: '18:00', timeEnd: '18:30', tz: 'UTC', location: 'Discord', description: 'Quick blockers + assignments.', tags: ['Staff'] }],
    '2025-09-18': [{ title: 'Skirmish: Security Sweep', timeStart: '21:00', timeEnd: '22:00', tz: 'UTC', location: 'Orison', description: 'Secure route, minimal loadout.', tags: ['Ops', 'PVE'] }],
    '2025-09-24': [{ title: 'Tactics Training · Convoy Formations', timeStart: '20:00', timeEnd: '21:00', tz: 'UTC', location: 'Discord Voice', description: 'Warm-up, comms check, formation discipline, and contact drills.', tags: ['Training', 'Beginner'] }],
    '2025-09-26': [{ title: 'Scramble Night · Interdiction Drills', timeStart: '22:00', timeEnd: '23:30', tz: 'UTC', location: 'Orison', description: 'Rapid deploy, target ID, disengage practice, rotation.', tags: ['Ops', 'PVE'] }],
    '2025-09-30': [{ title: 'Command Brief · Q4 Tasking', timeStart: '19:00', timeEnd: '19:45', tz: 'UTC', location: 'Discord Stage', description: 'Unit goals, contracts, fleet comps, staffing. Q&A.', tags: ['Briefing'] }]
};

// Modal wiring
const modal = document.getElementById('event-modal');
const modalBody = document.getElementById('modal-body');
const modalTitle = document.getElementById('modal-title');

function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function openModal(dateStr, prettyLabel) {
    const items = EVENTS[dateStr] || [];
    modalTitle.textContent = prettyLabel || 'Events';
    modalBody.innerHTML = items.length
        ? items.map(ev => `
      <div class="modal__event">
        <h4>${escapeHTML(ev.title)}</h4>
        <p>${ev.timeStart}–${ev.timeEnd} ${ev.tz} · ${escapeHTML(ev.location)}</p>
        <p>${escapeHTML(ev.description)}</p>
        ${ev.tags?.length ? `<div class="event-tags">${ev.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join('')}</div>` : ''}
      </div>`).join('')
        : `<p class="modal__empty">No events scheduled for this date.</p>`;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('.modal__close')?.focus();
}
function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
}

// Calendar cell activation
const cal = document.getElementById('mini-cal');
if (cal) {
    cal.addEventListener('click', e => {
        const cell = e.target.closest('.cal-day');
        if (!cell || cell.classList.contains('is-muted')) return;

        const dayNum = parseInt(cell.textContent, 10); if (Number.isNaN(dayNum)) return;
        const monthLabel = document.querySelector('.cal-month'); const yearEl = document.querySelector('.cal-year');
        if (!monthLabel || !yearEl) return;

        const monthName = monthLabel.firstChild.textContent.trim().toLowerCase();
        const year = yearEl.textContent.trim();
        const mm = monthToNum[monthName]; const dd = String(dayNum).padStart(2, '0');
        const iso = `${year}-${mm}-${dd}`;
        const pretty = `${monthName[0].toUpperCase() + monthName.slice(1)} ${dayNum}, ${year}`;
        openModal(iso, pretty);
    });

    cal.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            const cell = e.target.closest('.cal-day'); if (cell) { e.preventDefault(); cell.click(); }
        }
    });
}

// Upcoming list -> modal
document.addEventListener('click', e => {
    const link = e.target.closest('.event-link'); const item = e.target.closest('.event-item');
    if (link || item) {
        const li = (link ? link.closest('.event-item') : item); if (!li) return;
        const iso = li.getAttribute('data-date'); if (!iso) return;
        const date = new Date(iso + 'T00:00:00Z');
        const pretty = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        e.preventDefault(); openModal(iso, pretty);
    }
});

// Close modal
modal.addEventListener('click', e => { if (e.target.hasAttribute('data-close-modal')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });

// Newsletter confirmation
const form = document.getElementById('newsletter-form');
const ok = document.getElementById('news-success');
if (form) {
    form.addEventListener('submit', e => {
        e.preventDefault();
        form.querySelector('button')?.setAttribute('disabled', 'true');
        ok.hidden = false;
    });
}
// Global parallax for #site-bg (respects reduced motion)
(() => {
    const bg = document.getElementById('site-bg');
    if (!bg) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const strength = prefersReduced ? 0 : 0.25; // lower = subtler

    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY * strength * -1;
            bg.style.setProperty('--parallax', `${y}px`);
            ticking = false;
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
})();
