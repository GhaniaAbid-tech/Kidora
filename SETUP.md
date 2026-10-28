# KIDORA backend setup

Folder layout (the `server` folder sits INSIDE your KIDORA folder):

```
KIDORA/
  index.html, learning-hub.html, ... styles.css, shared.js
  server/
    server.js
    env.example
    SETUP.md
```

1. Install Node.js 18 or newer from https://nodejs.org (check with `node -v`).
2. Get an API key at https://console.anthropic.com (API keys section).
3. In the `server` folder, copy `env.example` and rename the copy to `.env`.
   Open it and replace `paste-your-key-here` with your key.
4. Open a terminal in the `server` folder and run:

   node server.js

5. Open http://localhost:3000 in your browser and use AI Buddy.

Notes
- Use http://localhost:3000, not the double-clicked file, so everything works together.
- Keep the terminal open while using the site. Press Ctrl+C to stop.
- If the server is off or the key is missing, AI Buddy falls back to its basic built-in answers.
- The key stays on the server. Never paste it into any .html or .js file.
- Each question uses a little of your API credit. The server limits each visitor to 20 questions a minute.
