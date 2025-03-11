import psutil
import os
import uuid
import socket
from datetime import datetime
import logging
from logging.handlers import RotatingFileHandler

# Import from our utility module and config
from collector_utils import CollectorBase
from config import SYSTEM_METRICS_ENDPOINT, METRICS_STATUS_ENDPOINT

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
    
    logger.info(f"Gathered metrics: CPU {metrics['cpu_usage']}%, Memory {metrics['memory_usage']}%")
    return metrics

def main():
    """Main function to start the metrics collection service."""
    # Create a collector instance
    collector = CollectorBase(
        endpoint_url=SYSTEM_METRICS_ENDPOINT,
        status_url=METRICS_STATUS_ENDPOINT,
        collection_interval=5,  # 5 seconds between collections
        collector_name="SystemMetrics"
    )
    
    # Run the collection loop
    collector.run_collection_loop(gather_metrics)

if __name__ == "__main__":
    main()