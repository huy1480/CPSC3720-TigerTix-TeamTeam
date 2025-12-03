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

start_with_env() {
	# Usage: start_with_env path/to/envfile command args...
	local env_file="$1"; shift
	(
		set -a
		[ -f "$env_file" ] && . "$env_file"
		set +a
		"$@"
	) &
}

echo "Starting client service";
start_with_env ./backend/client-service/.env.production node ./backend/client-service/server.js

echo "Starting admin service";
start_with_env ./backend/admin-service/.env.production node ./backend/admin-service/server.js

echo "Starting user authentication service";
start_with_env ./backend/user-authentication/.env.production node ./backend/user-authentication/server.js

echo "Starting frontend";
npm start --prefix ./frontend

wait
