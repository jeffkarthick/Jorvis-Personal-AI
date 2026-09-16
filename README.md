# My Personal AI — Free Starter

A Vercel-ready Next.js starter for a personal assistant.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy

1. Create a GitHub repository.
2. Upload these files.
3. Import the repository into Vercel.
4. Deploy with the default Next.js settings.

## Current free features

- Voice input using the browser speech recognition API when supported.
- Voice replies using the browser speech synthesis API.
- Local memory for the user's name.
- Local conversation history.
- Basic date/time commands.
- Mobile/PWA-friendly layout.

## Important limitation

A normal web app/PWA cannot become an iPhone system-level wake word assistant like Siri, and it cannot force audio to play from a locked iPhone whenever it wants.

The next stage can add iPhone Shortcuts integration and server-side reminders. A real AI model API can be connected later when budget is available.
