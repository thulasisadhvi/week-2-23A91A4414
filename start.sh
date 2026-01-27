#!/bin/sh

# 1. Start the Cron Daemon (The Timer)
crond -b -l 8
echo "✅ Cron daemon started."

# 2. Start your API Server
echo "🚀 Starting Node.js server..."
node server.js  # <--- Make sure this matches your filename!  