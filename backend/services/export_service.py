import pandas as pd
import os
from datetime import datetime

class ExportService:
    
    @staticmethod
    def export_to_excel(data, filename):
        """Export data to Excel file"""
        try:
            df = pd.DataFrame(data)
            filepath = f"exports/{filename}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            os.makedirs('exports', exist_ok=True)
            df.to_excel(filepath, index=False)
            return filepath
        except Exception as e:
            print(f"Export error: {e}")
            return None
    
    @staticmethod
    def export_to_csv(data, filename):
        """Export data to CSV file"""
        try:
            df = pd.DataFrame(data)
            filepath = f"exports/{filename}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            os.makedirs('exports', exist_ok=True)
            df.to_csv(filepath, index=False)
            return filepath
        except Exception as e:
            print(f"Export error: {e}")
            return None