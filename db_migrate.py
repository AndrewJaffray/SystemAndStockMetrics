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
log_path = os.path.join(logs_dir, 'db_migrate.log')
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

def migrate_database():
    """Migrate the database schema to add the computer_id column to laptop_metrics table."""
    # Define the absolute path to the database
    DATABASE_PATH = os.path.join(BASE_DIR, 'database.db')
    
    logger.info(f"Migrating database at: {DATABASE_PATH}")
    
    # Check if database file exists
    if not os.path.exists(DATABASE_PATH):
        logger.error(f"Database file does not exist at {DATABASE_PATH}")
        return
    
    try:
        # Connect to the database
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Check if computer_id column exists
            cursor.execute("PRAGMA table_info(laptop_metrics)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'computer_id' in columns:
                logger.info("computer_id column already exists, no migration needed")
                return
            
            # Get count before migration
            cursor.execute("SELECT COUNT(*) FROM laptop_metrics;")
            count_before = cursor.fetchone()[0]
            logger.info(f"Number of records in laptop_metrics before migration: {count_before}")
            
            # Create a new table with the computer_id column
            cursor.execute('''
                CREATE TABLE laptop_metrics_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    computer_id TEXT,
                    cpu_usage REAL,
                    memory_usage REAL,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Copy data from the old table to the new one
            cursor.execute('''
                INSERT INTO laptop_metrics_new (id, cpu_usage, memory_usage, last_updated)
                SELECT id, cpu_usage, memory_usage, last_updated FROM laptop_metrics
            ''')
            
            # Get count of copied records
            cursor.execute("SELECT COUNT(*) FROM laptop_metrics_new;")
            count_new = cursor.fetchone()[0]
            logger.info(f"Number of records copied to new table: {count_new}")
            
            # Drop the old table
            cursor.execute("DROP TABLE laptop_metrics;")
            
            # Rename the new table to the original name
            cursor.execute("ALTER TABLE laptop_metrics_new RENAME TO laptop_metrics;")
            
            # Commit the changes
            conn.commit()
            
            # Verify the migration
            cursor.execute("SELECT COUNT(*) FROM laptop_metrics;")
            count_after = cursor.fetchone()[0]
            logger.info(f"Number of records in laptop_metrics after migration: {count_after}")
            
            # Vacuum the database to reclaim space
            cursor.execute("VACUUM;")
            logger.info("Database vacuumed to reclaim space")
            
            # Success message
            if count_before == count_after:
                logger.info("Migration completed successfully. All records preserved.")
            else:
                logger.warning(f"Migration completed but record counts don't match: before={count_before}, after={count_after}")
    
    except Exception as e:
        logger.error(f"Error migrating database: {e}")

if __name__ == "__main__":
    logger.info("Starting database migration")
    migrate_database()
    logger.info("Database migration completed") 