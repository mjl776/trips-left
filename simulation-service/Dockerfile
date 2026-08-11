FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py simulation.py ./

# Railway injects PORT at runtime; 8001 is only a local-run fallback.
ENV PORT=8001
EXPOSE 8001

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
