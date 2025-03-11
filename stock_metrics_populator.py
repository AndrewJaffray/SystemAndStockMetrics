import requests
import logging
from logging.handlers import RotatingFileHandler
import json
import os
from datetime import datetime

# Import from our utility module and config
from collector_utils import CollectorBase
from config import (
    STOCK_SYMBOLS, 
    STOCK_API_INTERVAL, 
    FINNHUB_API_KEY, 
    STOCK_METRICS_ENDPOINT,
    METRICS_STATUS_ENDPOINT
)

# Define the base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Create a logs directory if it doesn't exist
logs_dir = os.path.join(BASE_DIR, 'logs')
if not os.path.exists(logs_dir):
    os.makedirs(logs_dir)

# Configure logging with rotation
log_path = os.path.join(logs_dir, 'stock_metrics.log')
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

def fetch_stock_data(symbol):
    """Fetches real-time stock data from Finnhub."""
    url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={FINNHUB_API_KEY}"
    
    logger.info(f"Fetching data for symbol: {symbol}")
    
    try:
        response = requests.get(url)
        data = response.json()
        
        # Check if we got valid data (Finnhub returns an object with 'c' for current price)
        if "c" in data and data["c"] > 0:
            # Calculate percentage change
            current_price = data["c"]
            previous_close = data["pc"]
            change_percent = ((current_price - previous_close) / previous_close) * 100 if previous_close > 0 else 0
            
            # Extract the relevant information
            stock_data = {
                "symbol": symbol,
                "price": current_price,
                "change_percent": round(change_percent, 2),
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            logger.info(f"Fetched data for {symbol}: ${stock_data['price']} ({stock_data['change_percent']}%)")
            return stock_data
        else:
            logger.error(f"Error fetching data for {symbol}: {json.dumps(data)}")
            return None
    except Exception as e:
        logger.error(f"Exception fetching data for {symbol}: {e}")
        return None

def gather_stock_metrics():
    """Gathers stock metrics for all configured symbols."""
    all_stock_data = []
    
    # Fetch data for each symbol
    for symbol in STOCK_SYMBOLS:
        stock_data = fetch_stock_data(symbol)
        if stock_data:
            all_stock_data.append(stock_data)
        
        # Small delay between API calls to avoid rate limits
        import time
        time.sleep(1)
    
    return all_stock_data if all_stock_data else None

def main():
    """Main function to start the stock metrics collection service."""
    # Create a collector instance
    collector = CollectorBase(
        endpoint_url=STOCK_METRICS_ENDPOINT,
        status_url=METRICS_STATUS_ENDPOINT,  # Allow stopping stock metrics collection too
        collection_interval=STOCK_API_INTERVAL,
        collector_name="StockMetrics"
    )
    
    # Run the collection loop
    collector.run_collection_loop(gather_stock_metrics)

if __name__ == "__main__":
    main() 