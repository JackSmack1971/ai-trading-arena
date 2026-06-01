const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Missing #app mount target.');
}

app.innerHTML = `
  <section aria-labelledby="arena-title" style="font-family: system-ui, sans-serif; padding: 2rem;">
    <p style="letter-spacing: 0.08em; text-transform: uppercase; color: #475569; margin: 0;">
      Local-first paper-trading simulator
    </p>
    <h1 id="arena-title" style="font-size: clamp(2rem, 6vw, 4rem); margin: 0.5rem 0;">
      AI Trading Arena
    </h1>
    <p style="max-width: 42rem; line-height: 1.6; color: #334155;">
      Dashboard shell is ready for typed simulator state, chart panels, and replayable paper-trading telemetry.
    </p>
  </section>
`;
