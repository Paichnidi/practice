// Phoenix Command — JSON-driven Events (single-source of truth)
// - Loads events from events.json
// - Renders upcoming list
// - Marks calendar dots
// - Opens modal for a single event (from list link) OR a date (aggregated)
// - Exports .ics honoring UTC when tz === 'UTC'
// - Also wires newsletter success + subtle parallax (optional)

(async function () {
    /** Helpers **/
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // for modal header

    function parseISODate(dateStr, timeStr = "00:00", tz = "") {
        // If tz is UTC, interpret incoming clock time as UTC (add Z)
        const suffix = (tz && tz.toUpperCase() === 'UTC') ? 'Z' : '';
        return new Date(`${dateStr}T${timeStr}${suffix}`);
    }

    function fmtDayMonth(d) {
        return { day: String(d.getDate()), mon: MONTHS_SHORT[d.getMonth()].toUpperCase() };
    }

    function fmtDow(d) { return WEEKDAYS_SHORT[d.getDay()]; }

    function fmtTimeRange(start, end, tz) {
        return `${start}–${end} ${tz || ''}`.trim();
    }

    function createTagSpan(tag, idx) {
        const span = document.createElement('span');
        span.className = `tag${idx === 1 ? ' tag--alt' : ''}`; // keep alternating accent
        span.textContent = tag;
        return span;
    }

    function eventItemTemplate(evt) {
        const start = parseISODate(evt.date, evt.start, evt.tz);
        const { day, mon } = fmtDayMonth(start);

        const li = document.createElement('li');
        li.className = 'event-item';
        li.dataset.date = evt.date;
        li.dataset.eventId = evt.id;

        // when
        const when = document.createElement('div');
        when.className = 'event-when';
        when.innerHTML = `<span class="event-day">${day}</span><span class="event-mon">${mon}</span>`;

        // body
        const body = document.createElement('div');
        body.className = 'event-body';

        const h3 = document.createElement('h3');
        h3.className = 'event-title';
        h3.textContent = evt.title;

        const meta = document.createElement('p');
        meta.className = 'event-meta';
        meta.textContent = `${fmtDow(start)} · ${fmtTimeRange(evt.start, evt.end, evt.tz)} · ${evt.where || evt.location || ''}`.replace(/ · $/, '');

        const desc = document.createElement('p');
        desc.className = 'event-description';
        desc.textContent = evt.description || '';

        const tags = document.createElement('div');
        tags.className = 'event-tags';
        (evt.tags || []).slice(0, 2).forEach((t, i) => tags.appendChild(createTagSpan(t, i)));

        body.append(h3, meta, desc, tags);

        // link opens single-event modal (keeps existing UX)
        const a = document.createElement('a');
        a.href = evt.link || '#';
        a.className = 'event-link';
        a.setAttribute('aria-label', 'Details');
        a.addEventListener('click', (e) => { e.preventDefault(); openEventModal(evt); });

        li.append(when, body, a);
        return li;
    }

    function markCalendarDots(events) {
        const grid = $('#mini-cal');
        if (!grid) return;

        // Days in the shown month that have at least one event
        const byDay = new Set(events.map(evt => parseISODate(evt.date, evt.start, evt.tz).getDate()));

        $$('.cal-day', grid).forEach(cell => {
            const dnum = parseInt(cell.textContent, 10);
            if (!Number.isFinite(dnum)) return;

            const oldDot = cell.querySelector('.dot');
            if (oldDot) oldDot.remove();
            cell.classList.remove('has-event');

            if (byDay.has(dnum)) {
                cell.classList.add('has-event');
                const dot = document.createElement('div');
                dot.className = 'dot';
                cell.appendChild(dot);
            }
        });
    }

    function setTodayChip() {
        const chip = $('#cal-chip');
        if (!chip) return;
        const now = new Date();
        const mon = MONTHS_SHORT[now.getMonth()];
        chip.innerHTML = `Today · ${mon}&nbsp;${now.getDate()}`;
    }

    function openEventModal(evt) {
        const modal = $('#event-modal');
        const body = $('#modal-body');
        const title = $('#modal-title');
        if (!modal || !body || !title) return;

        title.textContent = evt.title;

        const start = parseISODate(evt.date, evt.start, evt.tz);
        const end = parseISODate(evt.date, evt.end, evt.tz);

        body.innerHTML = `
      <div class="event-detail">
        <p><strong>${fmtDow(start)}, ${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}</strong></p>
        <p>${fmtTimeRange(evt.start, evt.end, evt.tz)}</p>
        ${evt.where || evt.location ? `<p>${evt.where || evt.location}</p>` : ''}
        ${evt.description ? `<p>${evt.description}</p>` : ''}
        ${(evt.tags || []).length ? `<div class="event-tags">${(evt.tags || []).map((t, i) => `<span class="tag${i === 1 ? ' tag--alt' : ''}">${t}</span>`).join('')}</div>` : ''}
        ${evt.link ? `<p><a class="btn btn--primary" href="${evt.link}">Open Link</a></p>` : ''}
      </div>`;

        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function openDateModal(dateLabel, evts) {
        const modal = $('#event-modal');
        const body = $('#modal-body');
        const title = $('#modal-title');
        if (!modal || !body || !title) return;

        title.textContent = dateLabel || 'Events';

        if (!evts.length) {
            body.innerHTML = `<p class="modal__empty">No events scheduled for this date.</p>`;
        } else {
            body.innerHTML = evts.map(evt => {
                const start = parseISODate(evt.date, evt.start, evt.tz);
                return `
          <div class="modal__event">
            <h4>${evt.title}</h4>
            <p>${fmtDow(start)} · ${fmtTimeRange(evt.start, evt.end, evt.tz)} · ${evt.where || evt.location || ''}</p>
            ${evt.description ? `<p>${evt.description}</p>` : ''}
            ${(evt.tags || []).length ? `<div class="event-tags">${(evt.tags || []).map((t, i) => `<span class="tag${i === 1 ? ' tag--alt' : ''}">${t}</span>`).join('')}</div>` : ''}
          </div>`;
            }).join('');
        }

        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeEventModal() {
        const modal = $('#event-modal');
        if (!modal) return;
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function wireModal() {
        const modal = $('#event-modal');
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target.matches('[data-close-modal], .modal__backdrop')) closeEventModal();
        });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeEventModal(); });
    }

    function renderEventsList(events) {
        const list = $('#event-list');
        if (!list) return;
        list.innerHTML = '';
        events.forEach(evt => list.appendChild(eventItemTemplate(evt)));
    }

    function upcomingOnly(events) {
        // Compare using the event's calendar date (midnight), not the end time
        const todayLocal = new Date();
        todayLocal.setHours(0, 0, 0, 0);

        return events
            .filter(e => parseISODate(e.date, '00:00', e.tz) >= todayLocal)
            .sort((a, b) => parseISODate(a.date, a.start, a.tz) - parseISODate(b.date, b.start, b.tz));
    }


    function deriveMonthHeader(events) {
        if (!events.length) return;
        const first = parseISODate(events[0].date, events[0].start, events[0].tz);
        $('#cal-month-text') && ($('#cal-month-text').textContent = first.toLocaleString(undefined, { month: 'long' }));
        $('#cal-year-text') && ($('#cal-year-text').textContent = String(first.getFullYear()));
    }

    function buildICS(events) {
        const pad = (n) => String(n).padStart(2, '0');
        const toICSDate = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Phoenix Command//Events//EN'
        ];

        events.forEach(evt => {
            const dtStart = parseISODate(evt.date, evt.start, evt.tz);
            const dtEnd = parseISODate(evt.date, evt.end, evt.tz);
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${evt.id}@phoenix`);
            lines.push(`DTSTAMP:${toICSDate(new Date())}`);
            lines.push(`DTSTART:${toICSDate(dtStart)}`);
            lines.push(`DTEND:${toICSDate(dtEnd)}`);
            lines.push(`SUMMARY:${evt.title.replace(/\n/g, ' ')}`);
            if (evt.where || evt.location) lines.push(`LOCATION:${(evt.where || evt.location).replace(/\n/g, ' ')}`);
            if (evt.description) lines.push(`DESCRIPTION:${evt.description.replace(/\n/g, ' ')}`);
            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');
        return lines.join('\r\n');
    }

    function wireICSExport(events) {
        const btn = $('#export-ics');
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const ics = buildICS(events);
            const blob = new Blob([ics], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'phoenix-events.ics';
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        });
    }

    function wireCalendarClicks(allEvents) {
        const grid = document.getElementById('mini-cal');
        if (!grid) return;

        function eventsOnDay(dayNum) {
            return allEvents.filter(e => parseISODate(e.date, '00:00', e.tz).getDate() === dayNum);
        }

        grid.addEventListener('click', e => {
            const cell = e.target.closest('.cal-day');
            if (!cell || cell.classList.contains('is-muted')) return;
            const dayNum = parseInt(cell.textContent, 10);
            if (!Number.isFinite(dayNum)) return;

            const m = $('#cal-month-text')?.textContent || '';
            const y = $('#cal-year-text')?.textContent || '';
            const label = `${m} ${dayNum}, ${y}`;
            openDateModal(label, eventsOnDay(dayNum));
        });

        grid.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                const cell = e.target.closest('.cal-day');
                if (!cell) return; e.preventDefault(); cell.click();
            }
        });
    }

    function wireUpcomingListToModal(allEvents) {
        // If someone clicks anywhere on an event-item or its Details link, open single-event modal
        document.addEventListener('click', e => {
            const link = e.target.closest('.event-link');
            const item = e.target.closest('.event-item');
            if (!link && !item) return;
            const li = (link ? link.closest('.event-item') : item);
            if (!li) return;
            const id = li.dataset.eventId;
            const evt = allEvents.find(ev => ev.id === id);
            if (evt) { e.preventDefault(); openEventModal(evt); }
        });
    }

    function wireNewsletterAndParallax() {
        // Newsletter confirmation
        const form = document.getElementById('newsletter-form');
        const ok = document.getElementById('news-success');
        if (form && ok) {
            form.addEventListener('submit', e => {
                e.preventDefault();
                form.querySelector('button')?.setAttribute('disabled', 'true');
                ok.hidden = false;
            });
        }

        // Subtle parallax for #site-bg (respects reduced motion)
        const bg = document.getElementById('site-bg');
        if (bg) {
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
        }
    }

    /** Main load **/
    try {
        const res = await fetch('events.json', { cache: 'no-store' });
        const allEvents = await res.json();

        const up = upcomingOnly(allEvents);
        renderEventsList(up);
        markCalendarDots(allEvents);
        deriveMonthHeader(allEvents);
        setTodayChip();
        wireModal();
        wireCalendarClicks(allEvents);
        wireUpcomingListToModal(allEvents);
        wireICSExport(up);
        wireNewsletterAndParallax();
    } catch (err) {
        console.error('Failed to load events.json', err);
        const list = $('#event-list');
        if (list) {
            list.innerHTML = `<li class="event-item"><div class="event-body"><h3 class="event-title">Events unavailable</h3><p class="event-description">Couldn’t load events. Please refresh or try again later.</p></div></li>`;
        }
    }
})();
