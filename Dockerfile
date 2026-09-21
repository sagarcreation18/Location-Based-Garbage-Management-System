FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY . .

WORKDIR /app/backend
RUN mkdir -p uploads

CMD ["sh", "-c", "npm run migrate:production && npm start"]
