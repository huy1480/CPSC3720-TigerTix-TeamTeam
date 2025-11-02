echo "Starting ollama";
ollama run llama3 &
echo "Starting client service";
node ./backend/client-service/server.js &
echo "Starting admin service";
node ./backend/admin-service/server.js &
echo "Starting frontend";
npm start --prefix ./frontend
