import requests
import logging
import time
from datetime import datetime
import json

# Configure logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CollectorBase:
    """Base class for metric collectors with common functionality."""
    
    def __init__(self, endpoint_url, status_url=None, collection_interval=60, collector_name="Collector"):
        """
        Initialize the collector.
        
        Args:
            endpoint_url: URL to send metrics to
            status_url: URL to check for stop commands (optional)
            collection_interval: Interval between collections in seconds
            collector_name: Name of the collector for logging
        """
        self.endpoint_url = endpoint_url
        self.status_url = status_url
        self.collection_interval = collection_interval
        self.collector_name = collector_name
        self.logger = logging.getLogger(f"{__name__}.{collector_name}")
        
    def send_data(self, data):
        """Send data to the server endpoint."""
        try:
            self.logger.debug(f"Sending data to {self.endpoint_url}: {json.dumps(data)}")
            response = requests.post(
                self.endpoint_url,
                json=data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                self.logger.info(f"Successfully sent data to {self.endpoint_url}")
                return True
            else:
                self.logger.error(f"Error sending data: {response.status_code}, {response.text}")
                return False
        except Exception as e:
            self.logger.error(f"Exception sending data: {e}")
            return False
    
    def should_stop(self):
        """Check if the collector should stop running."""
        if not self.status_url:
            return False
            
        try:
            status_response = requests.get(self.status_url)
            if status_response.status_code == 200:
                status_data = status_response.json()
                if status_data.get('command') == 'STOP':
                    self.logger.info("Received STOP command from server. Shutting down...")
                    return True
        except Exception as e:
            self.logger.error(f"Error checking stop status: {e}")
        
        return False
    
    def run_collection_loop(self, collect_function):
        """
        Run the collection loop with the provided collection function.
        
        Args:
            collect_function: Function that collects the data to send
        """
        self.logger.info(f"Starting {self.collector_name} collection service, sending to: {self.endpoint_url}")
        if self.status_url:
            self.logger.info(f"Status endpoint: {self.status_url}")
        
        running = True
        while running:
            # Check if we should stop
            if self.should_stop():
                running = False
                break
                
            # Collect and send data
            data = collect_function()
            if data:
                self.send_data(data)
            
            # Sleep until next collection
            self.logger.info(f"Sleeping {self.collection_interval} seconds until next collection")
            time.sleep(self.collection_interval)
            
        self.logger.info(f"{self.collector_name} collection service stopped") 