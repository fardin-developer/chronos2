FROM python:3.11-slim

# Install dependencies (if needed)
RUN pip install uvicorn fastapi

# Set working directory
WORKDIR /opt/app

# Copy application code
COPY . /opt/app/

# Expose the port FastAPI will run on
EXPOSE 5172

# Command to run FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5172"]
