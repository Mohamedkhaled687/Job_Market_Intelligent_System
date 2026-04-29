FROM node:20-slim AS frontend-build

WORKDIR /frontend
COPY src/views/frontend/package.json src/views/frontend/package-lock.json ./
RUN npm ci
COPY src/views/frontend/ .
RUN npm run build

FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=frontend-build /frontend/dist /app/src/views/frontend/dist

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
