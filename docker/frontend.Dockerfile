FROM node:20-slim

WORKDIR /app

COPY src/views/frontend/package.json src/views/frontend/package-lock.json ./
RUN npm ci

COPY src/views/frontend/ ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
