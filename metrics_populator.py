import psutil
import requests
import time
import random

def gather_metrics():
    """Gathers core system metrics."""
    metrics = {}

    # Random CPU temperature between 1 and 100 for testing
    metrics['cpu_temp'] = random.randint(1, 100)

    # Additional metrics
    metrics['cpu_usage'] = psutil.cpu_percent(interval=1)
    metrics['memory_usage'] = psutil.virtual_memory().percent

    return metrics

def send_metrics():
    """Sends gathered metrics to the Flask server."""
    url = 'http://127.0.0.1:5001/metrics'
    while True:
        metrics = gather_metrics()
        response = requests.post(url, json=metrics)
        
        # Print the raw response to understand what the server is returning
        print("Response Status Code:", response.status_code)
        print("Response Text:", response.text)
        
        try:
            print(response.json())
        except requests.JSONDecodeError as e:
            print("JSONDecodeError:", e)
        
        time.sleep(5)  # Wait for 5 seconds before sending the next batch

if __name__ == "__main__":
    send_metrics()