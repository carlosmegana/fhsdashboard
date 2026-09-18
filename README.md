# Personal Growth Canvas

This web application serves as a digital Personal Growth Canvas. This dashboard provides a unified, box-separated grid to visually track behavioral parameters, keystone habits, core values, aspirational goals, and actionable tasks. It is fully built with React and Tailwind CSS for seamless Vercel deployments.

All data lives in `localStorage` — single user, no auth, no database. UI copy is in Spanish.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
npm run build
npm run start
```

## Features

- 5-card canvas grid (3 columns on desktop, single column stacked on mobile).
- Daily habit reset: habit checkboxes clear automatically on a new day; tasks persist until deleted.
- Inline add/edit/delete on every card (click text to edit, `Enter` saves, `Escape` cancels).
- Persists in `localStorage` (`pgc_data`, schema version in `pgc_schema_version`); starts with empty cards on first visit and degrades gracefully to in-memory state when storage is unavailable.

Full spec: [.claude/Personal_Growth_Canvas_PRD.md](.claude/Personal_Growth_Canvas_PRD.md)
