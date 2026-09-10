# Deployment Guide - MVA Membership System

## Quick Demo Deploy to Railway (Recommended)

Railway.app is the easiest way to deploy Node.js + React together.

### Steps:

1. **Create a GitHub repository** (Railway pulls from GitHub):
   ```bash
   cd C:\Users\Admin\Downloads\vella mudiliyar
   git init
   git add .
   git commit -m "Initial commit: MVA Membership System demo"
   git remote add origin https://github.com/YOUR_USERNAME/mva-membership.git
   git branch -M main
   git push -u origin main
   ```

2. **Go to** [Railway.app](https://railway.app)
   - Sign up / Login
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Connect your repository
   - Railway will auto-detect Node.js and deploy

3. **Done!** Railway will:
   - Build the app (`npm run build`)
   - Install dependencies (`npm install` + postinstall hook)
   - Start the server (`npm start`)
   - Expose a public URL

**Demo URL will look like:** `https://mva-membership-prod.railway.app/`

---

## Alternative: Heroku (if you prefer)

```bash
# Install Heroku CLI, then:
heroku login
heroku create mva-membership-demo
git push heroku main
heroku open
```

---

## Local Production Build (Test before deploying)

```bash
# Build the React app
npm run build

# Start the server (serves built React app)
npm run start

# Visit http://localhost:4000
```

---

## What Happens During Deployment

1. **Postinstall hook** runs: `cd client && npm install`
   - Installs both root and client dependencies
   
2. **Build script** runs: `cd client && npm run build`
   - Compiles React + Tailwind → `client/dist/`
   
3. **Start script** runs: `node server/index.js`
   - Starts Express server
   - Serves built React app from `client/dist/`
   - API routes available at `/api/`

---

## Demo Credentials

Once deployed, login with:

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Superadmin |
| operator | oper123 | Operator |
| viewer | view123 | Viewer |

---

## Database

The SQLite database (`data/mva.db`) is created and seeded on first run with 60 fictional members.

In production, the database is stored in the container's ephemeral filesystem. Data persists while the app is running but resets on redeploy.

**For persistent data in production:** Switch to PostgreSQL (update `db.js` to use `pg` package instead of `better-sqlite3`).

---

## Troubleshooting

**Deploy failed?**
- Check build logs on Railway/Heroku dashboard
- Ensure both root and client have `package.json`
- Make sure no environment variables are needed (or set them in the dashboard)

**API not responding?**
- Check that server started: look for `✓ Server running at http://0.0.0.0:PORT`
- Database: Railway/Heroku create `/tmp` directory automatically, SQLite works there

**App shows blank page?**
- Clear browser cache (Ctrl+Shift+Delete)
- Check browser console (F12) for errors
- Verify API endpoint is correct (should be same domain)

---

## Next Steps (Phase 2+)

For production:
1. Switch SQLite → PostgreSQL for persistent data
2. Add authentication with proper password hashing (bcrypt)
3. Enable HTTPS everywhere
4. Set up proper error logging (Sentry, LogRocket)
5. Add real SMS/WhatsApp integration

---

**Ready to show the customer?**

Deploy to Railway in ~5 minutes, get a live URL, and demo the full app online! 🚀
