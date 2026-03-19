
const eventFile = document.documentElement.dataset.eventFile;

const state = {
  eventData: null,
  selectedDate: null,
};

const el = {
  eventEyebrow: document.getElementById('event-eyebrow'),
  eventName: document.getElementById('event-name'),
  eventSummary: document.getElementById('event-summary'),
  eventDates: document.getElementById('event-dates'),
  eventLocation: document.getElementById('event-location'),
  dayFilter: document.getElementById('day-filter'),
  scheduleList: document.getElementById('schedule-list'),
  mapPins: document.getElementById('map-pins'),
  mapLocationList: document.getElementById('map-location-list'),
  vendorList: document.getElementById('vendor-list'),
  locationList: document.getElementById('location-list'),
  modal: document.getElementById('detail-modal'),
  modalKicker: document.getElementById('modal-kicker'),
  modalTitle: document.getElementById('modal-title'),
  modalContent: document.getElementById('modal-content'),
  closeModal: document.getElementById('close-modal')
};

function formatTimeRange(start, end) {
  return `${start} – ${end}`;
}

function makeButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function openModal(kicker, title, html) {
  el.modalKicker.textContent = kicker;
  el.modalTitle.textContent = title;
  el.modalContent.innerHTML = html;
  el.modal.classList.remove('hidden');
}

function closeModal() {
  el.modal.classList.add('hidden');
}

function renderHeader(data) {
  el.eventEyebrow.textContent = data.eventType || 'Community Event';
  el.eventName.textContent = data.eventName;
  el.eventSummary.textContent = data.summary;
  el.eventDates.textContent = data.dateLabel;
  el.eventLocation.textContent = data.areaLabel;
}

function renderDayFilter(data) {
  el.dayFilter.innerHTML = '';
  if (!data.days?.length) return;
  state.selectedDate = state.selectedDate || data.days[0].id;

  data.days.forEach(day => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `day-chip ${state.selectedDate === day.id ? 'active' : ''}`;
    chip.textContent = day.label;
    chip.addEventListener('click', () => {
      state.selectedDate = day.id;
      renderDayFilter(data);
      renderSchedule(data);
    });
    el.dayFilter.appendChild(chip);
  });
}

function renderSchedule(data) {
  el.scheduleList.innerHTML = '';
  const filtered = data.schedule.filter(item => item.dayId === state.selectedDate);

  if (!filtered.length) {
    el.scheduleList.innerHTML = '<div class="empty-state">No events for this date yet.</div>';
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('article');
    card.className = 'schedule-card';

    const location = data.locations.find(loc => loc.id === item.locationId);
    const vendorText = item.vendorIds?.length
      ? data.vendors.filter(v => item.vendorIds.includes(v.id)).map(v => v.name).join(', ')
      : 'No linked vendors';

    card.innerHTML = `
      <div class="schedule-top">
        <span class="time-range">${formatTimeRange(item.startTime, item.endTime)}</span>
      </div>
      <h2>${item.title}</h2>
      <div class="detail-row"><strong>Location:</strong> ${location?.name || 'TBD'}</div>
      <div class="detail-row"><strong>Category:</strong> ${item.category}</div>
      <div class="detail-row">${item.description}</div>
    `;

    card.appendChild(makeButton('View details', () => {
      openModal(
        'Schedule Item',
        item.title,
        `
          <p><strong>Time:</strong> ${formatTimeRange(item.startTime, item.endTime)}</p>
          <p><strong>Location:</strong> ${location?.name || 'TBD'}</p>
          <p><strong>Category:</strong> ${item.category}</p>
          <p>${item.description}</p>
          <p><strong>Linked Vendors:</strong> ${vendorText}</p>
        `
      );
    }));

    el.scheduleList.appendChild(card);
  });
}

function renderMap(data) {
  el.mapPins.innerHTML = '';
  el.mapLocationList.innerHTML = '';

  data.locations.forEach(location => {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'map-pin';
    pin.style.left = `${location.mapX}%`;
    pin.style.top = `${location.mapY}%`;
    pin.textContent = location.pinIcon || '📍';
    pin.title = location.name;
    pin.addEventListener('click', () => showLocationModal(location, data));
    el.mapPins.appendChild(pin);

    const card = document.createElement('article');
    card.className = 'item-card';
    card.innerHTML = `
      <h2>${location.name}</h2>
      <div class="detail-row"><strong>Address:</strong> ${location.address}</div>
      <div class="detail-row">${location.description}</div>
    `;
    card.appendChild(makeButton('Open location details', () => showLocationModal(location, data)));
    el.mapLocationList.appendChild(card);
  });
}

function showLocationModal(location, data) {
  const locationVendors = data.vendors.filter(v => v.locationId === location.id);
  const locationEvents = data.schedule.filter(s => s.locationId === location.id);
  openModal(
    'Location',
    location.name,
    `
      <p><strong>Address:</strong> ${location.address}</p>
      <p>${location.description}</p>
      <p><strong>Hours / Notes:</strong> ${location.notes || 'See schedule for active times.'}</p>
      <p><strong>Vendors here:</strong> ${locationVendors.length ? locationVendors.map(v => v.name).join(', ') : 'None listed'}</p>
      <p><strong>Scheduled items here:</strong> ${locationEvents.length ? locationEvents.map(e => e.title).join(', ') : 'None listed'}</p>
      <p><strong>Directions:</strong> ${location.directionsText || 'Link this to Google Maps later.'}</p>
    `
  );
}

function renderVendors(data) {
  el.vendorList.innerHTML = '';
  data.vendors.forEach(vendor => {
    const location = data.locations.find(loc => loc.id === vendor.locationId);
    const card = document.createElement('article');
    card.className = 'vendor-card';
    card.innerHTML = `
      <h2>${vendor.name}</h2>
      <div class="detail-row"><strong>Category:</strong> ${vendor.category}</div>
      <div class="detail-row"><strong>Location:</strong> ${location?.name || 'TBD'}</div>
      <div class="detail-row">${vendor.description}</div>
    `;
    card.appendChild(makeButton('View vendor details', () => {
      openModal(
        'Vendor',
        vendor.name,
        `
          <p><strong>Category:</strong> ${vendor.category}</p>
          <p><strong>Location:</strong> ${location?.name || 'TBD'}</p>
          <p>${vendor.description}</p>
          <p><strong>Booth / Spot:</strong> ${vendor.booth || 'TBD'}</p>
          <p><strong>Hours:</strong> ${vendor.hours || 'Add live hours later.'}</p>
        `
      );
    }));
    el.vendorList.appendChild(card);
  });
}

function renderLocations(data) {
  el.locationList.innerHTML = '';
  data.locations.forEach(location => {
    const card = document.createElement('article');
    card.className = 'location-card';
    card.innerHTML = `
      <h2>${location.name}</h2>
      <div class="detail-row"><strong>Address:</strong> ${location.address}</div>
      <div class="detail-row">${location.description}</div>
    `;
    card.appendChild(makeButton('View details', () => showLocationModal(location, data)));
    el.locationList.appendChild(card);
  });
}

function setupTabs() {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.add('active');
    });
  });
}

async function init() {
  if (!eventFile) return;
  const response = await fetch(eventFile);
  const data = await response.json();
  state.eventData = data;

  renderHeader(data);
  renderDayFilter(data);
  renderSchedule(data);
  renderMap(data);
  renderVendors(data);
  renderLocations(data);
  setupTabs();

  el.closeModal?.addEventListener('click', closeModal);
  el.modal?.addEventListener('click', (event) => {
    if (event.target === el.modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}

init();
