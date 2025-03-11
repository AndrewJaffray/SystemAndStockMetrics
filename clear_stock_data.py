import os
import sqlite3
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime

# Define the base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Create a logs directory if it doesn't exist
logs_dir = os.path.join(BASE_DIR, 'logs')
if not os.path.exists(logs_dir):
    os.makedirs(logs_dir)

# Configure logging with rotation
log_path = os.path.join(logs_dir, 'clear_stock_data.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            log_path,
            maxBytes=1024*1024,  # 1 MB
            backupCount=3        # Keep 3 backup files
        ),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def clear_stock_data():
    """Clear all stock data from the database."""
    # Define the absolute path to the database
    DATABASE_PATH = os.path.join(BASE_DIR, 'database.db')
    
    logger.info(f"Clearing stock data from database at: {DATABASE_PATH}")
    
    # Check if database file exists
    if not os.path.exists(DATABASE_PATH):
        logger.error(f"Database file does not exist at {DATABASE_PATH}")
        return
    
    try:
        # Connect to the database
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Get count before clearing
            cursor.execute("SELECT COUNT(*) FROM stock_metrics;")
            count_before = cursor.fetchone()[0]
            logger.info(f"Number of records in stock_metrics before clearing: {count_before}")
            
            # Delete all records from stock_metrics
            cursor.execute("DELETE FROM stock_metrics;")
            
            # Commit the changes
            conn.commit()
            
            # Vacuum the database to reclaim space
            cursor.execute("VACUUM;")
            logger.info("Database vacuumed to reclaim space")
            
            # Verify records were deleted
            cursor.execute("SELECT COUNT(*) FROM stock_metrics;")
            count_after = cursor.fetchone()[0]
            logger.info(f"Number of records in stock_metrics after clearing: {count_after}")
            
            # Log success
            logger.info(f"Successfully cleared {count_before} records from stock_metrics table")
            
            return count_before
    
    except Exception as e:
        logger.error(f"Error clearing stock data: {e}")
        return None

if __name__ == "__main__":
    logger.info("Starting stock data clearing process")
    records_cleared = clear_stock_data()
    if records_cleared is not None:
        logger.info(f"Successfully cleared {records_cleared} stock records from database")
    else:
        logger.error("Failed to clear stock data")
    logger.info("Stock data clearing process completed") 