import requests
import time
import logging
from logging.handlers import RotatingFileHandler
import json
import os
from datetime import datetime
from config import STOCK_SYMBOLS, STOCK_API_INTERVAL, FINNHUB_API_KEY

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

def send_stock_metrics():
    """Fetches stock data for all symbols and sends it to the server."""
    server_url = 'http://127.0.0.1:5001/stock_metrics'
    #server_url = 'https://AndrewJaffray.pythonanywhere.com/stock_metrics'
    
    logger.info(f"Starting stock metrics collection service, sending to: {server_url}")
    logger.info(f"Monitoring symbols: {', '.join(STOCK_SYMBOLS)}")
    
    while True:
        all_stock_data = []
        
        # Fetch data for each symbol
        for symbol in STOCK_SYMBOLS:
            stock_data = fetch_stock_data(symbol)
            if stock_data:
                all_stock_data.append(stock_data)
            
            # Sleep between API calls to avoid hitting rate limits
            # Finnhub allows 60 calls per minute on free tier, so we can be more aggressive
            logger.info(f"Sleeping 1 second between API calls")
            time.sleep(1)
        
        # Send all stock data to the server
        if all_stock_data:
            try:
                logger.info(f"Sending stock data to server: {json.dumps(all_stock_data, indent=2)}")
                response = requests.post(server_url, json=all_stock_data)
                logger.info(f"Sent stock data to server. Response: {response.status_code}")
                logger.info(f"Response Text: {response.text}")
            except Exception as e:
                logger.error(f"Error sending stock data to server: {e}")
        else:
            logger.warning("No stock data collected to send to server")
        
        # Wait before the next batch of requests
        logger.info(f"Waiting {STOCK_API_INTERVAL} seconds before next update...")
        time.sleep(STOCK_API_INTERVAL)

if __name__ == "__main__":
    send_stock_metrics() 