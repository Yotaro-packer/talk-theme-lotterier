const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;
const POLL_INTERVAL_MS = 3000;

const stage = document.getElementById('stage');
const todayText = document.getElementById('todayText');
const upcomingList = document.getElementById('upcomingList');
const endDayBtn = document.getElementById('endDayBtn');

function fitStage() {
  const scale = Math.min(
    window.innerWidth / STAGE_WIDTH,
    window.innerHeight / STAGE_HEIGHT
  );
  const left = (window.innerWidth - STAGE_WIDTH * scale) / 2;
  const top = (window.innerHeight - STAGE_HEIGHT * scale) / 2;
  stage.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
}

function render(state) {
  todayText.textContent = state.today.text;

  upcomingList.innerHTML = '';
  for (const item of state.upcoming) {
    const li = document.createElement('li');
    if (item.isPlaceholder) {
      li.classList.add('placeholder');
    }

    const weekday = document.createElement('div');
    weekday.className = 'weekday';
    weekday.textContent = item.weekday;

    const text = document.createElement('div');
    text.className = 'text';
    text.textContent = item.text;

    li.append(weekday, text);
    upcomingList.append(li);
  }
}

async function fetchState() {
  const res = await fetch('/api/state');
  const state = await res.json();
  render(state);
}

async function endBusinessDay() {
  const res = await fetch('/api/end-business-day', { method: 'POST' });
  const state = await res.json();
  render(state);
}

endDayBtn.addEventListener('click', endBusinessDay);
window.addEventListener('resize', fitStage);

fitStage();
fetchState();
setInterval(fetchState, POLL_INTERVAL_MS);
