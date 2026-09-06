#!/usr/bin/env bash
set -e

echo "=== Innerly Deployment Script ==="

# Ensure .gcloudignore is in place to ignore local node_modules
cat << 'IGNORE' > .gcloudignore
.gcloudignore
.git
.gitignore
node_modules/
dist/
build/
.env*
!.env.example
*.log
IGNORE

# Run deployment to Cloud Run
echo "Deploying container to Cloud Run..."
gcloud run deploy innerly \
  --source . \
  --region us-central1 \
  --port 3000 \
  --clear-base-image \
  --allow-unauthenticated

echo "=== Deployment Complete ==="
