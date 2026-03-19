const eventSources = [
  { file: 'data/fall-fest-2026.json', page: 'fall-fest.html', slug: 'fall-fest' },
  { file: 'data/second-fridays-2026.json', page: 'second-fridays.html', slug: 'second-fridays' },
  { file: 'data/christmas-on-vinegar-hill-2026.json', page: 'christmas-on-vinegar-hill.html', slug: 'christmas-on-vinegar-hill' }
];

const homeState = {
  view: 'month',
  anchorDate: new Date(),
  events: [],
  datasets: []
};

const homeEl = {
  title: document.getElementById('calendar-title'),
  weekdays: document.getElementById('calendar-weekdays'),
  grid: document.getElementById('calendar-grid'),
  prev: document.getElementById('prev-period'),
  next: document.getElementById('next-period'),
  viewButtons: Array.from(document.querySelectorAll('.view-button')),
  summaryCards: document.getElementById('event-summary-cards')
};

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseEventDate(dateStr, timeStr) {
  const iso = `${dateStr}T${convertTimeTo24(timeStr)}:00`;
  return new Date(iso);
}

function convertTimeTo24(timeStr) {
  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '00:00';
  let [, h, m, ap] = match;
  let hour = parseInt(h, 10);
  if (ap.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (ap.toUpperCase() === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${m}`;
}

function formatDateLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatMonthTitle(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatWeekTitle(start, end) {
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

function getStartOfWeek(date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  return copy;
}

function getEndOfWeek(date) {
  const copy = getStartOfWeek(date);
  copy.setDate(copy.getDate() + 6);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function inRange(date, start, end) {
  return startOfDay(date) >= startOfDay(start) && startOfDay(date) <= startOfDay(end);
}

async function loadData() {
  const loaded = await Promise.all(
    eventSources.map(async source => {
      const response = await fetch(source.file);
      const data = await response.json();
      return { source, data };
    })
  );

  homeState.datasets = loaded;
  homeState.events = loaded.flatMap(({ source, data }) => {
    const dayMap = new Map((data.days || []).map(day => [day.id, day]));
    const firstDate = (data.dates || [])[0];

    return (data.schedule || []).map(item => {
      let actualDate = item.date || dayMap.get(item.dayId)?.date || firstDate;
      if (!actualDate) {
        actualDate = new Date().toISOString().slice(0, 10);
      }
      const location = (data.locations || []).find(loc => loc.id === item.locationId);
      return {
        id: item.id,
        title: item.title,
        category: item.category,
        startTime: item.startTime,
        endTime: item.endTime,
        date: actualDate,
        locationName: location?.name || 'TBD',
        eventName: data.eventName,
        eventType: data.eventType,
        eventPage: source.page,
        sourceFile: source.file,
        pageSlug: source.slug,
        description: item.description
      };
    });
  }).sort((a, b) => parseEventDate(a.date, a.startTime) - parseEventDate(b.date, b.startTime));

  const today = new Date();
  const currentMonthEvent = homeState.events.find(event => {
    const eventDate = new Date(`${event.date}T12:00:00`);
    return eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
  });

  homeState.anchorDate = currentMonthEvent
    ? new Date(`${currentMonthEvent.date}T12:00:00`)
    : today;

  renderHome();
}

function renderWeekdays() {
  homeEl.weekdays.innerHTML = '';
  if (homeState.view !== 'month') {
    homeEl.weekdays.classList.add('hidden');
    return;
  }
  homeEl.weekdays.classList.remove('hidden');
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(label => {
    const div = document.createElement('div');
    div.className = 'weekday-pill';
    div.textContent = label;
    homeEl.weekdays.appendChild(div);
  });
}

function periodEvents(start, end) {
  return homeState.events.filter(event => inRange(new Date(`${event.date}T12:00:00`), start, end));
}

function updateCalendarTitle() {
  const anchor = homeState.anchorDate;
  if (homeState.view === 'month') {
    homeEl.title.textContent = formatMonthTitle(anchor);
  } else if (homeState.view === 'week') {
    const start = getStartOfWeek(anchor);
    const end = getEndOfWeek(anchor);
    homeEl.title.textContent = formatWeekTitle(start, end);
  } else {
    homeEl.title.textContent = anchor.toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }
}

function createEventChip(event) {
  const a = document.createElement('a');
  a.className = 'calendar-event-chip';
  a.href = `${event.eventPage}#${event.id}`;
  a.innerHTML = `
    <span class="event-time">${event.startTime}</span>
    <span class="event-text">${event.title}</span>
    <span class="event-meta">${event.eventName}</span>
  `;
  return a;
}

function renderMonthView() {
  homeEl.grid.className = 'calendar-grid month-grid';
  homeEl.grid.innerHTML = '';

  const anchor = homeState.anchorDate;
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = getStartOfWeek(firstOfMonth);
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const end = getEndOfWeek(lastOfMonth);

  const events = periodEvents(start, end);

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const dayCell = document.createElement('article');
    const currentDate = new Date(cursor);
    const isMuted = currentDate.getMonth() !== anchor.getMonth();
    const isToday = isSameDate(currentDate, new Date());
    dayCell.className = `calendar-day-card ${isMuted ? 'muted' : ''} ${isToday ? 'today' : ''}`;

    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.innerHTML = `<span class="calendar-day-number">${currentDate.getDate()}</span><span class="calendar-day-label">${formatDateLabel(currentDate)}</span>`;
    dayCell.appendChild(header);

    const list = document.createElement('div');
    list.className = 'calendar-day-events';

    const dayEvents = events.filter(event => isSameDate(new Date(`${event.date}T12:00:00`), currentDate));
    if (!dayEvents.length) {
      const empty = document.createElement('div');
      empty.className = 'calendar-empty';
      empty.textContent = 'No events';
      list.appendChild(empty);
    } else {
      dayEvents.forEach(event => list.appendChild(createEventChip(event)));
    }

    dayCell.appendChild(list);
    homeEl.grid.appendChild(dayCell);
  }
}

function renderWeekView() {
  homeEl.grid.className = 'calendar-grid stacked-grid';
  homeEl.grid.innerHTML = '';

  const start = getStartOfWeek(homeState.anchorDate);
  const end = getEndOfWeek(homeState.anchorDate);
  const events = periodEvents(start, end);

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const currentDate = new Date(cursor);
    const section = document.createElement('section');
    section.className = `agenda-day-card ${isSameDate(currentDate, new Date()) ? 'today' : ''}`;

    const dayEvents = events.filter(event => isSameDate(new Date(`${event.date}T12:00:00`), currentDate));
    section.innerHTML = `
      <div class="agenda-day-header">
        <div>
          <div class="agenda-day-title">${currentDate.toLocaleDateString(undefined, { weekday: 'long' })}</div>
          <div class="agenda-day-subtitle">${currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</div>
        </div>
        <div class="agenda-day-count">${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}</div>
      </div>
    `;

    const list = document.createElement('div');
    list.className = 'agenda-events';
    if (!dayEvents.length) {
      const empty = document.createElement('div');
      empty.className = 'calendar-empty';
      empty.textContent = 'No events scheduled.';
      list.appendChild(empty);
    } else {
      dayEvents.forEach(event => list.appendChild(createEventChip(event)));
    }
    section.appendChild(list);
    homeEl.grid.appendChild(section);
  }
}

function renderDayView() {
  homeEl.grid.className = 'calendar-grid stacked-grid';
  homeEl.grid.innerHTML = '';

  const currentDate = startOfDay(homeState.anchorDate);
  const events = periodEvents(currentDate, currentDate);
  const section = document.createElement('section');
  section.className = `agenda-day-card solo ${isSameDate(currentDate, new Date()) ? 'today' : ''}`;
  section.innerHTML = `
    <div class="agenda-day-header">
      <div>
        <div class="agenda-day-title">${currentDate.toLocaleDateString(undefined, { weekday: 'long' })}</div>
        <div class="agenda-day-subtitle">${currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
      </div>
      <div class="agenda-day-count">${events.length} event${events.length === 1 ? '' : 's'}</div>
    </div>
  `;

  const list = document.createElement('div');
  list.className = 'agenda-events';
  if (!events.length) {
    const empty = document.createElement('div');
    empty.className = 'calendar-empty';
    empty.textContent = 'No events scheduled.';
    list.appendChild(empty);
  } else {
    events.forEach(event => list.appendChild(createEventChip(event)));
  }

  section.appendChild(list);
  homeEl.grid.appendChild(section);
}

function renderSummaryCards() {
  homeEl.summaryCards.innerHTML = '';
  homeState.datasets.forEach(({ source, data }) => {
    const count = (data.schedule || []).length;
    const card = document.createElement('a');
    card.className = 'event-launch-card';
    card.href = source.page;
    card.innerHTML = `
      <span class="pill">${data.eventType || 'Event'}</span>
      <h2>${data.eventName}</h2>
      <p>${data.summary}</p>
      <div class="detail-row"><strong>${data.dateLabel}</strong></div>
      <div class="detail-row">${count} scheduled item${count === 1 ? '' : 's'}</div>
    `;
    homeEl.summaryCards.appendChild(card);
  });
}

function renderHome() {
  updateCalendarTitle();
  renderWeekdays();
  renderSummaryCards();

  if (homeState.view === 'month') renderMonthView();
  else if (homeState.view === 'week') renderWeekView();
  else renderDayView();
}

function shiftPeriod(direction) {
  const multiplier = direction === 'next' ? 1 : -1;
  const nextDate = new Date(homeState.anchorDate);

  if (homeState.view === 'month') {
    nextDate.setMonth(nextDate.getMonth() + multiplier);
  } else if (homeState.view === 'week') {
    nextDate.setDate(nextDate.getDate() + (7 * multiplier));
  } else {
    nextDate.setDate(nextDate.getDate() + multiplier);
  }

  homeState.anchorDate = nextDate;
  renderHome();
}

function initHomeControls() {
  homeEl.prev.addEventListener('click', () => shiftPeriod('prev'));
  homeEl.next.addEventListener('click', () => shiftPeriod('next'));

  homeEl.viewButtons.forEach(button => {
    button.addEventListener('click', () => {
      homeEl.viewButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      homeState.view = button.dataset.view;
      renderHome();
    });
  });
}

initHomeControls();
loadData();
