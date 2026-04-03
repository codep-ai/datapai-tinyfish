#!/bin/bash
# Sync datapai-stock-fe to EC2 server
# Usage: ./sync.sh

rsync -avz --delete --progress \
  -e "ssh -i ~/.ssh/Linux-CodeCambat.pem" \
  --exclude '.claude/' \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude '.env*' \
  --exclude 'data/' \
  --exclude 'PRIVATE_NOTES.md' \
  /Users/linlin/git/datapai-stock-fe/ \
  ec2-user@platform.datap.ai:/home/ec2-user/git/datapai-stock-fe/
