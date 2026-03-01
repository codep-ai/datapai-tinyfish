#!/bin/bash
# Sync datapai-tinyfish to EC2 server
# Usage: ./sync.sh

rsync -avz --delete --progress \
  -e "ssh -i ~/.ssh/Linux-CodeCambat.pem" \
  --exclude '.claude/' \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude '.env*' \
  /Users/linlin/git/datapai-tinyfish/ \
  ec2-user@platform.datap.ai:/home/ec2-user/git/datapai-tinyfish/
