# VelocityLab — Advanced Typing Speed Test

A premium, real-time typing speed test built with **vanilla HTML, CSS, and JavaScript**. Designed like a modern developer dashboard with glassmorphism, animated visuals, and performance analytics.

## Features

- 60-second real-time typing test
- Live WPM, CPM, and accuracy tracking
- Character-level correctness highlighting
- Animated caret and smooth transitions
- Progress bar and time remaining
- Random paragraph generator with auto-extend
- Real-time performance graph (canvas)
- Speed meter gauge
- Accuracy heatmap
- Sound feedback (toggle)
- Leaderboard + personal best using `localStorage`
- Confetti on new personal best
- Responsive layout + light/dark mode

## Getting Started

1. Open `index.html` in any modern browser.
2. Click inside the test area and start typing.
3. Use **Restart** to start a new test instantly.

## Controls

- `Restart`: resets the test and generates new text
- `Light/Dark Mode`: theme toggle
- `Sound`: enable or disable typing feedback

## Project Structure

- `index.html` — App structure
- `style.css` — Visual design and animations
- `script.js` — Typing logic, stats, graph, and storage

## Notes

- Sounds use the Web Audio API and start only after user interaction.
- Leaderboard and personal best persist in browser `localStorage`.

## Customize

- Change test duration in `script.js` (`TOTAL_TIME`).
- Add more test text in the `paragraphs` array.
- Adjust gauge max in `MAX_WPM_GAUGE`.

