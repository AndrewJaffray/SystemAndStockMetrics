import os
import sqlite3
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timedelta

# Define the base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Create a logs directory if it doesn't exist
logs_dir = os.path.join(BASE_DIR, 'logs')
if not os.path.exists(logs_dir):
    os.makedirs(logs_dir)

# Configure logging with rotation
log_path = os.path.join(logs_dir, 'db_cleanup.log')
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

def cleanup_database(days_to_keep=7):
    """Clean up old records from the database, keeping only the specified number of days."""
    # Define the absolute path to the database
    DATABASE_PATH = os.path.join(BASE_DIR, 'database.db')
    
    logger.info(f"Cleaning up database at: {DATABASE_PATH}")
    
    # Check if database file exists
    if not os.path.exists(DATABASE_PATH):
        logger.error(f"Database file does not exist at {DATABASE_PATH}")
        return
    
    # Calculate the cutoff date
    cutoff_date = datetime.now() - timedelta(days=days_to_keep)
    cutoff_str = cutoff_date.strftime("%Y-%m-%d %H:%M:%S")
    
    try:
        # Connect to the database
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Get counts before cleanup
            cursor.execute("SELECT COUNT(*) FROM laptop_metrics;")
            laptop_count_before = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM stock_metrics;")
            stock_count_before = cursor.fetchone()[0]
            
            # Delete old records from laptop_metrics
            cursor.execute("DELETE FROM laptop_metrics WHERE last_updated < ?;", (cutoff_str,))
            laptop_deleted = cursor.rowcount
            
            # Delete old records from stock_metrics
            cursor.execute("DELETE FROM stock_metrics WHERE last_updated < ?;", (cutoff_str,))
            stock_deleted = cursor.rowcount
            
            # Commit the changes
            conn.commit()
            
            # Get counts after cleanup
            cursor.execute("SELECT COUNT(*) FROM laptop_metrics;")
            laptop_count_after = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM stock_metrics;")
            stock_count_after = cursor.fetchone()[0]
            
            # Log the results
            logger.info(f"Deleted {laptop_deleted} records from laptop_metrics")
            logger.info(f"Deleted {stock_deleted} records from stock_metrics")
            logger.info(f"laptop_metrics: {laptop_count_before} -> {laptop_count_after}")
            logger.info(f"stock_metrics: {stock_count_before} -> {stock_count_after}")
            
            # Vacuum the database to reclaim space
            cursor.execute("VACUUM;")
            logger.info("Database vacuumed to reclaim space")
    
    except Exception as e:
        logger.error(f"Error cleaning up database: {e}")

if __name__ == "__main__":
    logger.info("Starting database cleanup")
    cleanup_database()
    logger.info("Database cleanup completed") 