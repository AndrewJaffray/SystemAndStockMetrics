import psutil
import requests
import time
import logging
from logging.handlers import RotatingFileHandler
import json
import platform
import subprocess
import os
import uuid
import socket
from datetime import datetime

# Define the base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Create a logs directory if it doesn't exist
logs_dir = os.path.join(BASE_DIR, 'logs')
if not os.path.exists(logs_dir):
    os.makedirs(logs_dir)

# Configure logging with rotation
log_path = os.path.join(logs_dir, 'metrics.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            log_path,
            maxBytes=1024*1024,  # 1 MB
            backupCount=5        # Keep 5 backup files
        ),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Generate a unique computer ID
def generate_computer_id():
    """Generate a unique identifier for this computer."""
    try:
        # Try to use the hostname and MAC address
        hostname = socket.gethostname()
        mac = uuid.getnode()
        return f"{hostname}-{mac}"
    except:
        # Fallback to a random UUID
        return str(uuid.uuid4())

# Store the computer ID
COMPUTER_ID = generate_computer_id()
logger.info(f"Computer ID: {COMPUTER_ID}")

def gather_metrics():
    """Gathers core system metrics."""
    metrics = {}

    # Add computer ID
    metrics['computer_id'] = COMPUTER_ID
    
    # Core metrics
    metrics['cpu_usage'] = psutil.cpu_percent(interval=1)
    metrics['memory_usage'] = psutil.virtual_memory().percent
    
    # Add timestamp for logging purposes
    metrics['timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    return metrics

def send_metrics():
    """Sends gathered metrics to the Flask server."""
    #url = 'http://127.0.0.1:5001/metrics'
    url = 'https://AndrewJaffray.pythonanywhere.com/metrics'

    logger.info(f"Starting metrics collection service, sending to: {url}")
    
    while True:
        metrics = gather_metrics()
        
        # Log the metrics being sent
        logger.info(f"Sending metrics: {json.dumps(metrics, indent=2)}")
        
        try:
            response = requests.post(url, json=metrics)
            
            # Log the response
            logger.info(f"Response Status Code: {response.status_code}")
            logger.info(f"Response Text: {response.text}")
            
            try:
                logger.info(f"Response JSON: {response.json()}")
            except requests.JSONDecodeError as e:
                logger.error(f"JSONDecodeError: {e}")
        except Exception as e:
            logger.error(f"Error sending metrics: {e}")
        
        logger.info(f"Waiting 5 seconds before next metrics collection...")
        time.sleep(5)  # Wait for 5 seconds before sending the next batch

if __name__ == "__main__":
    send_metrics()