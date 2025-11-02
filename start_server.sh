#!/bin/bash

trap cleanup INT

cleanup() {
	echo ""
	echo "Shutting down all services"
	kill $(jobs -p) 2>/dev/null
	wait
	echo "Shut down"
	exit 0
}

echo "Starting ollama";
ollama run llama3 &

echo "Starting client service";
node ./backend/client-service/server.js &

echo "Starting admin service";
node ./backend/admin-service/server.js &

echo "Starting frontend";
npm start --prefix ./frontend

wait
