FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY frontend ./frontend
COPY vite.config.ts ./vite.config.ts

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/public/app ./backend/public/app

CMD ["npm", "start"]
