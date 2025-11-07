FROM python:3.11-slim

# Set working directory inside container
WORKDIR /app

# Copy requirements first (Docker caching optimization)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port 5000 (Flask default)
EXPOSE 5000

# Run the application
CMD ["python", "-m", "app.main"]