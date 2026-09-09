# Production deployment checklist

1. Host the frontend over HTTPS on a real domain. Do not use `file://` URLs.
2. Run the Express backend behind a reverse proxy such as Nginx or a managed HTTPS platform.
3. Set `NODE_ENV=production`, a long random `JWT_SECRET`, and `FRONTEND_ORIGINS=https://your-domain.example` in `backend/.env`.
4. Keep `.env`, `oauth-config.js`, and `maps-config.js` out of public source control when they contain credentials.
5. Enable billing and restrict the Google Maps key to your production domain. Configure the Google OAuth client with the same authorized JavaScript origin.
6. Run migrations `002` through `005`, make database backups, and monitor API/error logs.
7. Use a process manager (for example, Windows Service, PM2, or a cloud service) to restart Node after failures.

HTTPS certificates and the final domain must be supplied by the deployment environment or hosting provider; they cannot be created safely from this local project alone.
