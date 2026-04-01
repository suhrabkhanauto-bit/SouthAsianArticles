# Production Deployment After Git Revert

## Problem
Git code was reverted locally and pushed, but production (sad.aificientlabs.com) still shows old version.

## Why This Happens
When using Docker:
1. Git push only updates the repository
2. Production server must **pull the changes** and **rebuild images**
3. Then restart containers to use the new build

## Solution: SSH into VPS and Redeploy

```bash
# 1. SSH into your VPS
ssh user@sad.aificientlabs.com

# 2. Navigate to the project directory
cd /path/to/Articles  # (wherever your code is deployed)

# 3. Pull the latest code
git pull origin main

# 4. Rebuild the Docker images (this compiles the new code)
docker-compose build --no-cache

# 5. Restart the containers with new images
docker-compose up -d

# 6. Verify deployment
docker-compose ps
```

## Expected Output After Step 6
```
NAME            STATUS              PORTS
articles-backend-1       Up 2 seconds       3001/tcp
articles-frontend-1      Up 2 seconds       80/tcp
articles-caddy-1         Up 2 seconds       0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

## Test the Changes
After containers are up:
```bash
# Check logs for errors
docker-compose logs frontend
docker-compose logs backend

# Then open browser and test
# https://sad.aificientlabs.com
```

## If You Don't Have SSH Access

If you can't SSH to the VPS, you need to set up **CI/CD automation**:

### Option 1: GitHub Actions (Automates Deployment on Push)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to VPS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to VPS
        run: |
          ssh -i ~/.ssh/vps_key user@sad.aificientlabs.com << 'EOF'
            cd /path/to/Articles
            git pull origin main
            docker-compose build --no-cache
            docker-compose up -d
          EOF
```

### Option 2: Deploy with Webhook
Use a tool like Watchtower to auto-pull and redeploy on push.

## Common Issues

### Issue: "Changes still not showing"
```bash
# Clear old images and rebuild
docker-compose down
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
```

### Issue: "Connection refused"
```bash
# Backend may still be starting
docker-compose logs backend
# Wait 10-15 seconds for database connection
```

### Issue: "Files not updated on disk"
```bash
# Verify code was actually pulled
ls -la
git status
git log -1

# If not updated:
git fetch origin
git reset --hard origin/main
```

## Next Time
To automate this in the future:
1. Set up GitHub Actions or GitLab CI for auto-deployment
2. Or use a tool like Fly.io, Railway, or Heroku that auto-deploys on git push
3. This way you just `git push` and production updates automatically
