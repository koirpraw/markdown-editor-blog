# Deployment Troubleshooting Guide

## Error: "npm ci" Gets Killed (Most Common on t2.micro)

### Symptoms
```bash
npm ci --production=false
# Installing dependencies...
# Killed
```

Or in logs:
```bash
npm ERR! code ELIFECYCLE
npm ERR! errno 137
```

### Root Cause
**Out of Memory (OOM)** - The Linux kernel killed the process because t2.micro (1GB RAM) ran out of memory during `npm ci`. This is the #1 cause of failed deployments.

When `npm ci` installs and compiles native dependencies, it can use 800MB+ RAM, exhausting the available memory. The Linux OOM killer terminates the process, leaving you with:
- ❌ Incomplete `node_modules/` directory
- ❌ Missing packages (including `next`)
- ❌ Build failures

### Solution

#### Immediate Fix - Add Swap Space

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@instance-ip

# Create 1GB swap file
sudo dd if=/dev/zero of=/swapfile bs=128M count=8
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# Verify swap is active
free -h
# Should show ~1GB swap

# Now retry the deployment
cd /opt/nextjs-app
rm -rf node_modules  # Remove partial installation
npm ci --production=false  # Should complete without being killed
npm run build
```

#### Why This Works
Swap space acts as virtual memory, giving the system an additional 1GB to use. This prevents the OOM killer from terminating `npm ci`.

#### Performance Note
- With swap: `npm ci` takes 2-3 minutes (slow but completes)
- Without swap: `npm ci` gets killed (fails)

**For production**, consider using t3.small (2GB RAM) or larger to avoid swap usage.

---

## Error: "next: command not found" During Build

### Symptoms
```bash
npm run build
# Output: sh: line 1: next: command not found
```

### Root Cause
The `next` command is not available because either:
1. Dependencies are not installed (`node_modules` missing)
2. Node.js/npm is not in the PATH
3. NVM environment is not loaded properly

### Solution

#### On EC2 Instance - Quick Fix

```bash
# 1. SSH into the instance
ssh -i your-key.pem ec2-user@instance-ip

# 2. Check if Node.js is available
node --version
npm --version

# 3. If not found, load NVM
source ~/.nvm/nvm.sh
nvm use 20

# 4. Verify
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# 5. Navigate to app directory
cd /opt/nextjs-app

# 6. Check if dependencies exist
ls node_modules/  # Should show lots of packages

# 7. If node_modules is empty/missing, install dependencies
npm ci --production=false

# 8. Now build should work
npm run build
```

#### Verify Deployment Script

The deployment script should have this exact order:

```bash
# 1. Load NVM with explicit path
export NVM_DIR="/home/ec2-user/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

# 2. Verify environment (helpful for debugging)
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# 3. Install dependencies FIRST
npm ci --production=false

# 4. Then build
npm run build
```

### Common Mistakes

❌ **Wrong:** Running build before install
```bash
npm run build        # ERROR: next not found
npm ci              # Too late!
```

✅ **Correct:** Install then build
```bash
npm ci --production=false
npm run build        # Works!
```

❌ **Wrong:** Using $HOME in sudo scripts
```bash
export NVM_DIR="$HOME/.nvm"  # $HOME might be /root when using sudo
```

✅ **Correct:** Use explicit path
```bash
export NVM_DIR="/home/ec2-user/.nvm"  # Always works
```

---

## Error: Build Hangs at "Linting and Checking Validity"

### Symptoms
```bash
npm run build
# Output:
#   ✓ Compiled successfully
#   Linting and Checking Validity of Types ...
#   [Hangs for 10+ minutes]
```

### Root Cause
T2.micro instances (1GB RAM) struggle with TypeScript type checking and ESLint, causing heavy memory swapping.

### Solution

**Option 1: Skip checks during build (Recommended for testing)**

Update `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ... rest of config
};
```

**Option 2: Add swap space**
```bash
sudo dd if=/dev/zero of=/swapfile bs=128M count=8
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

**Option 3: Use larger instance**
- Upgrade to t3.small (2GB RAM) or larger
- Better performance, slightly higher cost

---

## Error: PM2 Process Crashes Immediately

### Symptoms
```bash
pm2 status
# Status: errored or stopped
pm2 logs
# Error: Cannot find module 'next'
```

### Root Cause
Dependencies not installed, or build failed.

### Solution
```bash
cd /opt/nextjs-app

# Check if dependencies exist
ls node_modules/next  # Should exist

# If not, install
npm ci --production=false

# Check if build artifacts exist
ls .next  # Should show build output

# If not, build
npm run build

# Now restart PM2
pm2 restart nextjs-blog
pm2 logs nextjs-blog
```

---

## Error: NGINX 502 Bad Gateway

### Symptoms
```bash
curl http://localhost
# <html><head><title>502 Bad Gateway</title></head></html>
```

### Root Cause
Next.js application (port 3000) is not running or not responding.

### Solution

**Check if Next.js is running:**
```bash
# Check PM2 status
pm2 status

# Check if port 3000 is listening
sudo netstat -tlnp | grep :3000

# Check PM2 logs
pm2 logs nextjs-blog --lines 50
```

**If not running, check logs and restart:**
```bash
# View error logs
pm2 logs nextjs-blog --err --lines 50

# Common issues:
# - Module not found: Run npm ci
# - Build missing: Run npm run build
# - Memory error: Add swap or use larger instance

# After fixing, restart
pm2 restart nextjs-blog
```

**Test locally:**
```bash
# Bypass NGINX to test Next.js directly
curl http://localhost:3000

# If this works but NGINX doesn't, check NGINX config
sudo nginx -t
sudo systemctl restart nginx
```

---

## Error: Git Clone Fails in User Data

### Symptoms
```bash
# In /var/log/user-data.log:
fatal: could not read Username for 'https://github.com': No such device or address
```

### Root Cause
- Private repository requires authentication
- Network not ready

### Solution

**For public repositories:**
```bash
# Wait for network in user data script
until ping -c1 github.com &>/dev/null; do
    echo "Waiting for network..."
    sleep 2
done

git clone https://github.com/username/repo.git
```

**For private repositories:**

Use SSH with deploy keys or HTTPS with personal access token:

```bash
# Option 1: Use SSH (requires deploy key setup)
git clone git@github.com:username/repo.git

# Option 2: Use HTTPS with token (stored in AWS Secrets Manager)
TOKEN=$(aws secretsmanager get-secret-value --secret-id github-token --query SecretString --output text)
git clone https://${TOKEN}@github.com/username/repo.git
```

---

## Error: "amazon-linux-extras: command not found"

### Symptoms
```bash
sudo amazon-linux-extras install nginx1
# sudo: amazon-linux-extras: command not found
```

### Root Cause
Using Amazon Linux 2023 (AL2023) which doesn't have `amazon-linux-extras`.

### Solution
Use `dnf` directly:

```bash
# Amazon Linux 2023
sudo dnf install nginx -y

# NOT this:
# sudo amazon-linux-extras install nginx1  # Only for AL2
```

---

## Debugging Commands Reference

### Check System Resources
```bash
# Memory usage
free -h

# Disk space
df -h

# CPU usage
top -bn1 | head -20

# Check swap
swapon --show
```

### Check Services
```bash
# PM2 status
pm2 status
pm2 logs nextjs-blog --lines 100

# NGINX status
sudo systemctl status nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# Check ports
sudo netstat -tlnp | grep -E ':(80|3000)'
```

### Check Environment
```bash
# Node.js and npm
node --version
npm --version
which node
which npm

# Check PATH
echo $PATH

# NVM
nvm --version
nvm current
```

### Check Application
```bash
# Check if app files exist
ls -la /opt/nextjs-app/

# Check if dependencies installed
ls /opt/nextjs-app/node_modules/ | wc -l  # Should be > 100

# Check if build succeeded
ls -la /opt/nextjs-app/.next/

# Check package.json scripts
cat /opt/nextjs-app/package.json | grep -A 5 "scripts"
```

### Check User Data Execution
```bash
# View user data log
sudo tail -f /var/log/user-data.log

# Check if user data completed
sudo grep "Bootstrap Completed" /var/log/user-data.log

# View cloud-init logs (more detailed)
sudo cat /var/log/cloud-init-output.log
```

### Manual Deployment Test
```bash
# Run the deployment script manually
/usr/local/bin/deploy-nextjs.sh

# Or step by step:
cd /opt/nextjs-app
git pull origin main
npm ci --production=false
npm run build
pm2 restart nextjs-blog
sudo systemctl restart nginx
```

---

## Prevention Checklist

Before creating your Golden AMI:
- ✅ Test deployment script manually: `/usr/local/bin/deploy-nextjs.sh`
- ✅ Verify build succeeds: `cd /opt/nextjs-app && npm run build`
- ✅ Verify app runs: `pm2 status` shows "online"
- ✅ Verify NGINX works: `curl http://localhost` returns HTML
- ✅ Verify health check: `curl http://localhost/api/health` returns 200
- ✅ Check logs are clean: `pm2 logs` shows no errors

Before launching ASG:
- ✅ Test launch template user data on a single instance first
- ✅ Set health check grace period to 300 seconds
- ✅ Monitor user data logs: `sudo tail -f /var/log/user-data.log`
- ✅ Check CloudWatch if enabled

---

## Getting Help

If you're still stuck:

1. **Gather information:**
   ```bash
   # Save all relevant info to a file
   {
     echo "=== System Info ==="
     uname -a
     echo ""
     echo "=== Node/npm versions ==="
     node --version
     npm --version
     echo ""
     echo "=== PM2 Status ==="
     pm2 status
     echo ""
     echo "=== Recent PM2 Logs ==="
     pm2 logs --lines 50 --nostream
     echo ""
     echo "=== NGINX Status ==="
     sudo systemctl status nginx
     echo ""
     echo "=== User Data Log ==="
     sudo tail -100 /var/log/user-data.log
   } > debug-info.txt
   ```

2. **Check the logs:**
   - User data: `/var/log/user-data.log`
   - PM2 app: `pm2 logs nextjs-blog`
   - NGINX error: `/var/log/nginx/error.log`
   - Cloud-init: `/var/log/cloud-init-output.log`

3. **Verify the basics:**
   - Is Node.js installed? `node --version`
   - Are dependencies installed? `ls node_modules/next`
   - Is the app built? `ls .next`
   - Is PM2 running? `pm2 status`
   - Is NGINX running? `sudo systemctl status nginx`
