// Get an element by its id. This keeps the code below a little shorter.
function getElement(id) {
  return document.getElementById(id);
}

// Load saved information from this browser.
function loadFromStorage(key, defaultValue) {
  try {
    const savedValue = localStorage.getItem(key);
    return savedValue ? JSON.parse(savedValue) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let events = loadFromStorage('gather-events', []);
let places = loadFromStorage('gather-places', [
  'Robo Park',
  'Induction Centre',
  'Shanti Devi Mittal Auditorium'
]);
let userName = loadFromStorage('gather-user', '');
let favorites = loadFromStorage('gather-favorites', []);
let showFavoritesOnly = false;

// Escape text before putting it into the page as HTML.
function escapeText(text) {
  const characters = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return String(text || '').replace(/[&<>"']/g, function (character) {
    return characters[character];
  });
}

function showMessage(message) {
  const toast = getElement('toast');
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(function () {
    toast.classList.remove('show');
  }, 2200);
}

function formatDate(date, time) {
  if (!date) return '';

  const eventDate = new Date(date + 'T00:00:00');
  const dateText = eventDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const eventTime = new Date('1970-01-01T' + (time || '12:00'));
  const timeText = eventTime.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });

  return dateText + ' · ' + timeText;
}

function eventMatchesFilters(event) {
  const searchText = getElement('search').value.trim().toLowerCase();
  const category = getElement('categoryFilter').value;
  const dateChoice = getElement('dateFilter').value;
  const eventDate = new Date(event.date + 'T00:00:00');
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const searchableText = [
    event.title,
    event.place,
    event.category,
    event.details
  ].join(' ').toLowerCase();

  if (searchText && !searchableText.includes(searchText)) return false;
  if (category && event.category !== category) return false;
  if (showFavoritesOnly && !favorites.includes(event.id)) return false;

  if (dateChoice === 'upcoming' && eventDate < today) return false;
  if (dateChoice === 'today' && eventDate.getTime() !== today.getTime()) return false;
  if (dateChoice === 'week' && (eventDate < today || eventDate >= nextWeek)) return false;

  return true;
}

function makeEventCard(event) {
  const isFavorite = favorites.includes(event.id);
  const costText = event.cost ? ' ₹' + Number(event.cost).toFixed(2) : 'Free';
  const details = event.details
    ? '<p class="card-detail">' + escapeText(event.details) + '</p>'
    : '';

  return `
    <article class="event-card">
      <div class="card-top">
        <span class="tag ${event.category.toLowerCase()}">
          ${escapeText(event.category)}
        </span>
        <button class="fav ${isFavorite ? 'active' : ''}"
          data-fav="${escapeText(event.id)}" aria-label="Toggle favorite">
          ${isFavorite ? '♥' : '♡'}
        </button>
      </div>
      <div class="card-date">
        ${formatDate(event.date, event.time)} <span>·</span> ${costText}
      </div>
      <h3>${escapeText(event.title)}</h3>
      <div class="place-line">⌖ ${escapeText(event.place)}</div>
      ${details}
      <div class="card-bottom">
        <span>LOCAL PLAN</span>
        <button data-edit="${escapeText(event.id)}">Edit event →</button>
      </div>
    </article>`;
}

function drawEvents() {
  const matchingEvents = events
    .filter(eventMatchesFilters)
    .sort(function (firstEvent, secondEvent) {
      return (firstEvent.date + firstEvent.time)
        .localeCompare(secondEvent.date + secondEvent.time);
    });

  getElement('eventCount').textContent = matchingEvents.length;
  getElement('eventGrid').innerHTML = matchingEvents.map(makeEventCard).join('');
  getElement('empty').classList.toggle('show', matchingEvents.length === 0);

  if (events.length === 0) {
    getElement('emptyAdd').textContent = '＋ Add your first event';
  } else {
    getElement('emptyAdd').textContent = '＋ Add event';
  }
}

function fillPlaceMenu(selectedPlace) {
  const placeMenu = getElement('place');

  placeMenu.innerHTML = places.map(function (place) {
    const selected = place === selectedPlace ? 'selected' : '';
    return `<option ${selected}>${escapeText(place)}</option>`;
  }).join('');

  if (places.length === 0) {
    placeMenu.innerHTML = '<option value="">Add a place first</option>';
  }
}

function openEventForm(event) {
  const form = getElement('eventForm');
  const eventData = event || {};

  form.reset();
  getElement('eventId').value = eventData.id || '';
  getElement('formTitle').textContent = eventData.id ? 'Edit event' : 'Create an event';
  getElement('title').value = eventData.title || '';
  getElement('date').value = eventData.date || new Date().toISOString().slice(0, 10);
  getElement('time').value = eventData.time || '18:00';
  getElement('category').value = eventData.category || 'Community';
  getElement('cost').value = eventData.cost || '';
  getElement('details').value = eventData.details || '';

  fillPlaceMenu(eventData.place || places[0] || '');
  getElement('deleteBtn').style.display = eventData.id ? '' : 'none';
  getElement('eventDialog').showModal();
}

function drawPlaces() {
  const placeList = getElement('placeList');

  if (places.length === 0) {
    placeList.innerHTML = '<li>No places saved yet.</li>';
    return;
  }

  placeList.innerHTML = places.map(function (place) {
    return `
      <li>
        <span>⌖ ${escapeText(place)}</span>
        <button data-remove-place="${escapeText(place)}">Remove</button>
      </li>`;
  }).join('');
}

function updateWelcomeMessage() {
  if (userName) {
    getElement('welcome').textContent = 'Hello, ' + userName;
  } else {
    getElement('welcome').textContent = 'Your neighborhood, together';
  }
}

// Save an event when the event form is submitted.
getElement('eventForm').addEventListener('submit', function (event) {
  event.preventDefault();

  if (places.length === 0) {
    showMessage('Add a place before saving an event.');
    return;
  }

  const id = getElement('eventId').value || crypto.randomUUID();
  const eventData = {
    id: id,
    title: getElement('title').value.trim(),
    date: getElement('date').value,
    time: getElement('time').value,
    category: getElement('category').value,
    cost: getElement('cost').value,
    place: getElement('place').value,
    details: getElement('details').value.trim()
  };

  events = events.filter(function (savedEvent) {
    return savedEvent.id !== id;
  });
  events.push(eventData);
  saveToStorage('gather-events', events);
  getElement('eventDialog').close();
  drawEvents();
  showMessage('Event saved to your calendar');
});

getElement('deleteBtn').addEventListener('click', function () {
  const id = getElement('eventId').value;
  if (!id) return;

  events = events.filter(function (event) { return event.id !== id; });
  favorites = favorites.filter(function (favoriteId) { return favoriteId !== id; });
  saveToStorage('gather-events', events);
  saveToStorage('gather-favorites', favorites);
  getElement('eventDialog').close();
  drawEvents();
  showMessage('Event removed');
});

getElement('addBtn').addEventListener('click', function () { openEventForm(); });
getElement('emptyAdd').addEventListener('click', function () { openEventForm(); });
getElement('search').addEventListener('input', drawEvents);
getElement('categoryFilter').addEventListener('change', drawEvents);
getElement('dateFilter').addEventListener('change', drawEvents);

getElement('favFilter').addEventListener('click', function () {
  showFavoritesOnly = !showFavoritesOnly;
  getElement('favFilter').classList.toggle('active', showFavoritesOnly);
  getElement('favFilter').textContent = showFavoritesOnly ? '♥ Favorites' : '♡ Favorites';
  drawEvents();
});

// Handle favorite, edit, and remove buttons on the event cards and place list.
document.addEventListener('click', function (event) {
  const favoriteButton = event.target.closest('[data-fav]');
  const editButton = event.target.closest('[data-edit]');
  const removeButton = event.target.closest('[data-remove-place]');

  if (favoriteButton) {
    const id = favoriteButton.dataset.fav;
    if (favorites.includes(id)) {
      favorites = favorites.filter(function (favoriteId) { return favoriteId !== id; });
    } else {
      favorites.push(id);
    }
    saveToStorage('gather-favorites', favorites);
    drawEvents();
  }

  if (editButton) {
    const selectedEvent = events.find(function (savedEvent) {
      return savedEvent.id === editButton.dataset.edit;
    });
    openEventForm(selectedEvent);
  }

  if (removeButton) {
    const place = removeButton.dataset.removePlace;
    const isInUse = events.some(function (savedEvent) {
      return savedEvent.place === place;
    });

    if (isInUse) {
      showMessage('This place is used by an event. Edit or delete that event first.');
      return;
    }

    places = places.filter(function (savedPlace) { return savedPlace !== place; });
    saveToStorage('gather-places', places);
    drawPlaces();
    fillPlaceMenu(places[0]);
  }
});

// Add a place to the list.
getElement('placesBtn').addEventListener('click', function () {
  drawPlaces();
  getElement('placesDialog').showModal();
});

getElement('placeForm').addEventListener('submit', function (event) {
  event.preventDefault();

  const placeName = getElement('placeName').value.trim();
  if (!placeName) return;

  const alreadySaved = places.some(function (place) {
    return place.toLowerCase() === placeName.toLowerCase();
  });

  if (alreadySaved) {
    showMessage('That place is already saved');
    return;
  }

  places.push(placeName);
  saveToStorage('gather-places', places);
  getElement('placeName').value = '';
  drawPlaces();
  fillPlaceMenu(placeName);
  showMessage('Place added');
});

// Save the user's name.
getElement('profileBtn').addEventListener('click', function () {
  getElement('userName').value = userName;
  getElement('profileDialog').showModal();
});

getElement('profileForm').addEventListener('submit', function (event) {
  event.preventDefault();
  userName = getElement('userName').value.trim();
  saveToStorage('gather-user', userName);
  getElement('profileDialog').close();
  updateWelcomeMessage();
});

// Close dialog windows when their close or cancel buttons are clicked.
document.querySelectorAll('[data-close]').forEach(function (button) {
  button.addEventListener('click', function () {
    button.closest('dialog').close();
  });
});

// Use the browser's share menu when it is available. Otherwise print the page.
getElement('printBtn').addEventListener('click', async function () {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Gather — Local events',
        text: 'Check out our neighborhood calendar.'
      });
    } catch (error) {
      if (error.name !== 'AbortError') window.print();
    }
  } else {
    window.print();
  }
});

updateWelcomeMessage();
drawEvents();
