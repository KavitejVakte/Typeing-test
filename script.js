const TOTAL_TIME = 60;
const MAX_WPM_GAUGE = 200;

// Paragraph pool for randomized tests.
const paragraphs = [
  "Typing fast is a craft built on rhythm, focus, and calm breathing. The strongest typists read ahead and trust their muscle memory.",
  "A great typing session feels like a flow state where each word lands with intention. Speed grows naturally when accuracy stays high.",
  "Modern developers rely on clean inputs and fast iterations. This test helps you train for real-world coding sessions.",
  "Small improvements compound over time. A consistent daily session can yield a dramatic boost in accuracy and confidence.",
  "Velocity is nothing without control. Keep your eyes two words ahead and your fingers will follow with precision.",
  "The best work happens when rhythm meets focus. Let each keystroke be deliberate, smooth, and free of hesitation.",
  "Great products are built by teams who care about detail. Practice typing with the same attention you give to design and code.",
  "Speed is a lagging indicator of technique. When your posture and flow improve, your WPM will climb naturally.",
  "Confidence comes from repetition. Use each test to measure, adjust, and push for steady progress.",
  "Your goal is not only speed, but mastery. Balanced cadence and clean inputs create professional results."
];

// Cache DOM nodes to avoid repeated queries.
const el = {
  typingArea: document.getElementById("typingArea"),
  hiddenInput: document.getElementById("hiddenInput"),
  timeLeft: document.getElementById("timeLeft"),
  wpm: document.getElementById("wpm"),
  cpm: document.getElementById("cpm"),
  accuracy: document.getElementById("accuracy"),
  progressBar: document.getElementById("progressBar"),
  restartBtn: document.getElementById("restartBtn"),
  caret: document.getElementById("caret"),
  themeToggle: document.getElementById("themeToggle"),
  soundToggle: document.getElementById("soundToggle"),
  performanceChart: document.getElementById("performanceChart"),
  speedMeter: document.getElementById("speedMeter"),
  meterValue: document.getElementById("meterValue"),
  accuracyHeatmap: document.getElementById("accuracyHeatmap"),
  leaderboardList: document.getElementById("leaderboardList"),
  personalBest: document.getElementById("personalBest"),
  confetti: document.getElementById("confetti")
};

// App state in one place so it is easy to reset.
const state = {
  text: "",
  started: false,
  startTime: null,
  timer: null,
  timeLeft: TOTAL_TIME,
  lastInputLength: 0,
  history: [],
  audio: null,
  leaderboard: [],
  personalBest: 0,
  confettiActive: false
};

function init() {
  initHeatmap();
  loadLeaderboard();
  setNewTest();
  bindEvents();
  drawChart();
}

function bindEvents() {
  el.typingArea.addEventListener("click", () => el.hiddenInput.focus());
  el.hiddenInput.addEventListener("input", handleInput);
  el.hiddenInput.addEventListener("keydown", (event) => {
    if (!state.started && event.key.length === 1) {
      startTest();
    }
  });
  el.restartBtn.addEventListener("click", resetTest);
  el.themeToggle.addEventListener("click", toggleTheme);
  el.soundToggle.addEventListener("change", () => {
    if (el.soundToggle.checked && !state.audio) {
      // Audio must start from a user gesture in most browsers.
      state.audio = new (window.AudioContext || window.webkitAudioContext)();
    }
  });
  window.addEventListener("resize", drawChart);
}

// Pick 3 random paragraphs to build a unique test each time.
function randomParagraph() {
  const picks = new Set();
  while (picks.size < 3) {
    picks.add(paragraphs[Math.floor(Math.random() * paragraphs.length)]);
  }
  return Array.from(picks).join(" ");
}

function setNewTest() {
  state.text = randomParagraph();
  renderText(state.text);
  updateStats(0, 0, 100);
  updateProgress(0);
  updateGauge(0);
  state.history = [];
  drawChart();
  updateCaret();
}

function renderText(text) {
  el.typingArea.innerHTML = "";
  const fragment = document.createDocumentFragment();
  [...text].forEach((char, index) => {
    const span = document.createElement("span");
    span.textContent = char;
    if (index === 0) span.classList.add("current");
    fragment.appendChild(span);
  });
  el.typingArea.appendChild(fragment);
}

function appendText(text) {
  const fragment = document.createDocumentFragment();
  [...text].forEach((char) => {
    const span = document.createElement("span");
    span.textContent = char;
    fragment.appendChild(span);
  });
  el.typingArea.appendChild(fragment);
}

// Main typing logic: compare input against target text.
function handleInput() {
  if (!state.started) {
    startTest();
  }

  const input = el.hiddenInput.value;
  const inputLength = input.length;

  // Extend the text if the user reaches the end.
  if (inputLength > state.text.length - 8) {
    const extra = " " + randomParagraph();
    state.text += extra;
    appendText(extra);
  }

  const spans = el.typingArea.querySelectorAll("span");
  let correct = 0;

  spans.forEach((span, index) => {
    const typedChar = input[index];
    span.classList.remove("correct", "incorrect", "current");

    if (typedChar == null) {
      if (index === inputLength) {
        span.classList.add("current");
      }
      return;
    }

    if (typedChar === span.textContent) {
      span.classList.add("correct");
      correct += 1;
    } else {
      span.classList.add("incorrect");
    }
  });

  updateHeatmap(inputLength, spans);

  // Sound feedback only for the newest character.
  if (inputLength > state.lastInputLength && el.soundToggle.checked) {
    const latestSpan = spans[inputLength - 1];
    const isCorrect = latestSpan && latestSpan.classList.contains("correct");
    playTone(isCorrect ? "correct" : "incorrect");
  }

  const elapsedMinutes = Math.max(1 / 60, (Date.now() - state.startTime) / 1000 / 60);
  const wpm = Math.round((correct / 5) / elapsedMinutes);
  const cpm = Math.round(correct / elapsedMinutes);
  const accuracy = inputLength === 0 ? 100 : Math.round((correct / inputLength) * 100);

  updateStats(wpm, cpm, accuracy);
  updateGauge(wpm);
  updateCaret();

  state.lastInputLength = inputLength;
}

function updateHeatmap(inputLength, spans) {
  if (inputLength > state.lastInputLength) {
    const latestIndex = inputLength - 1;
    const span = spans[latestIndex];
    const isCorrect = span && span.classList.contains("correct");
    pushHeatmap(isCorrect);
  }

  if (inputLength < state.lastInputLength) {
    popHeatmap();
  }
}

function initHeatmap() {
  el.accuracyHeatmap.innerHTML = "";
  for (let i = 0; i < 50; i += 1) {
    const cell = document.createElement("span");
    el.accuracyHeatmap.appendChild(cell);
  }
}

function pushHeatmap(isCorrect) {
  const cells = el.accuracyHeatmap.querySelectorAll("span");
  for (let i = cells.length - 1; i > 0; i -= 1) {
    cells[i].style.background = cells[i - 1].style.background;
  }
  cells[0].style.background = isCorrect ? "rgba(66, 226, 184, 0.6)" : "rgba(255, 92, 124, 0.6)";
}

function popHeatmap() {
  const cells = el.accuracyHeatmap.querySelectorAll("span");
  for (let i = 0; i < cells.length - 1; i += 1) {
    cells[i].style.background = cells[i + 1].style.background;
  }
  cells[cells.length - 1].style.background = "rgba(255, 255, 255, 0.08)";
}

function startTest() {
  if (state.started) return;
  state.started = true;
  state.startTime = Date.now();
  state.timer = setInterval(tick, 1000);
  el.hiddenInput.disabled = false;
  el.hiddenInput.focus();
}

// Timer tick updates stats and the performance graph.
function tick() {
  const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
  state.timeLeft = Math.max(0, TOTAL_TIME - elapsedSeconds);
  el.timeLeft.textContent = state.timeLeft;
  updateProgress(elapsedSeconds / TOTAL_TIME);

  const spans = el.typingArea.querySelectorAll("span");
  let correct = 0;
  const typed = el.hiddenInput.value.length;
  spans.forEach((span, index) => {
    if (index < typed && span.classList.contains("correct")) {
      correct += 1;
    }
  });

  const elapsedMinutes = Math.max(1 / 60, elapsedSeconds / 60);
  const wpm = Math.round((correct / 5) / elapsedMinutes);
  const cpm = Math.round(correct / elapsedMinutes);
  const accuracy = typed === 0 ? 100 : Math.round((correct / typed) * 100);

  updateStats(wpm, cpm, accuracy);
  updateGauge(wpm);

  state.history.push({ time: elapsedSeconds, wpm });
  drawChart();

  if (state.timeLeft === 0) {
    endTest();
  }
}

function updateStats(wpm, cpm, accuracy) {
  el.wpm.textContent = wpm;
  el.cpm.textContent = cpm;
  el.accuracy.textContent = accuracy;
  el.meterValue.textContent = wpm;
}

function updateProgress(ratio) {
  const clamped = Math.min(1, Math.max(0, ratio));
  el.progressBar.style.width = `${clamped * 100}%`;
}

function updateGauge(wpm) {
  const clamped = Math.min(MAX_WPM_GAUGE, wpm);
  const gaugeAngle = (clamped / MAX_WPM_GAUGE) * 270;
  const needleAngle = -135 + (clamped / MAX_WPM_GAUGE) * 270;
  el.speedMeter.style.setProperty("--gauge", gaugeAngle);
  el.speedMeter.style.setProperty("--needle", `${needleAngle}deg`);
}

function updateCaret() {
  const spans = el.typingArea.querySelectorAll("span");
  const current = el.typingArea.querySelector("span.current") || spans[0];
  if (!current) return;
  const areaRect = el.typingArea.getBoundingClientRect();
  const charRect = current.getBoundingClientRect();
  const padding = 16;
  el.caret.style.left = `${charRect.left - areaRect.left + padding}px`;
  el.caret.style.top = `${charRect.top - areaRect.top + padding}px`;
}

function playTone(type) {
  if (!state.audio) return;
  const duration = 0.05;
  const oscillator = state.audio.createOscillator();
  const gain = state.audio.createGain();
  oscillator.frequency.value = type === "correct" ? 520 : 240;
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(state.audio.destination);
  oscillator.start();
  oscillator.stop(state.audio.currentTime + duration);
}

function endTest() {
  clearInterval(state.timer);
  state.started = false;
  el.hiddenInput.disabled = true;
  const finalWpm = parseInt(el.wpm.textContent, 10) || 0;
  const finalAccuracy = parseInt(el.accuracy.textContent, 10) || 0;
  updateLeaderboard(finalWpm, finalAccuracy);
}

function resetTest() {
  clearInterval(state.timer);
  state.started = false;
  state.startTime = null;
  state.timeLeft = TOTAL_TIME;
  el.timeLeft.textContent = TOTAL_TIME;
  el.hiddenInput.value = "";
  el.hiddenInput.disabled = false;
  state.lastInputLength = 0;
  initHeatmap();
  setNewTest();
}

function toggleTheme() {
  const isDark = document.body.dataset.theme === "dark";
  document.body.dataset.theme = isDark ? "light" : "dark";
  el.themeToggle.textContent = isDark ? "Dark Mode" : "Light Mode";
}

// Simple line chart for WPM over time.
function drawChart() {
  const canvas = el.performanceChart;
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(ratio, ratio);

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.beginPath();
  for (let i = 1; i <= 4; i += 1) {
    const y = (height / 5) * i;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  if (state.history.length === 0) return;

  const maxWpm = Math.max(60, ...state.history.map((point) => point.wpm));
  ctx.beginPath();
  state.history.forEach((point, index) => {
    const x = (point.time / TOTAL_TIME) * width;
    const y = height - (point.wpm / maxWpm) * (height - 24) - 12;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "rgba(66, 226, 184, 0.9)");
  gradient.addColorStop(1, "rgba(108, 195, 255, 0.9)");
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = "rgba(66, 226, 184, 0.08)";
  ctx.fill();
}

function updateLeaderboard(wpm, accuracy) {
  const entry = {
    wpm,
    accuracy,
    date: new Date().toLocaleDateString()
  };
  state.leaderboard.push(entry);
  state.leaderboard.sort((a, b) => b.wpm - a.wpm);
  state.leaderboard = state.leaderboard.slice(0, 5);
  localStorage.setItem("velocitylab_leaderboard", JSON.stringify(state.leaderboard));

  if (wpm > state.personalBest) {
    state.personalBest = wpm;
    localStorage.setItem("velocitylab_best", String(state.personalBest));
    launchConfetti();
  }

  renderLeaderboard();
}

function loadLeaderboard() {
  const stored = localStorage.getItem("velocitylab_leaderboard");
  const best = localStorage.getItem("velocitylab_best");
  state.leaderboard = stored ? JSON.parse(stored) : [];
  state.personalBest = best ? parseInt(best, 10) : 0;
  renderLeaderboard();
}

function renderLeaderboard() {
  el.leaderboardList.innerHTML = "";
  if (state.leaderboard.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No scores yet";
    el.leaderboardList.appendChild(empty);
  } else {
    state.leaderboard.forEach((entry) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${entry.wpm} WPM · ${entry.accuracy}%</span><span>${entry.date}</span>`;
      el.leaderboardList.appendChild(li);
    });
  }
  el.personalBest.textContent = `${state.personalBest} WPM`;
}

// Confetti animation for new personal bests.
function launchConfetti() {
  if (state.confettiActive) return;
  state.confettiActive = true;
  const canvas = el.confetti;
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(ratio, ratio);

  const colors = ["#42e2b8", "#6cc3ff", "#ff5c7c", "#ffcc66"];
  const particles = Array.from({ length: 180 }, () => ({
    x: Math.random() * width,
    y: -20 - Math.random() * height,
    vx: (Math.random() - 0.5) * 2,
    vy: Math.random() * 3 + 2,
    size: Math.random() * 6 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: Math.random() * 120 + 80
  }));

  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
    });

    if (particles.some((p) => p.life > 0 && p.y < height + 20)) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, width, height);
      state.confettiActive = false;
    }
  }

  animate();
}

init();
