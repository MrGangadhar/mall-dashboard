import pandas as pd
import os
from datetime import datetime

class DataProcessor:
    
    @staticmethod
    def process_sales_file(file_path, mall_id):
        """Process sales Excel/CSV file"""
        try:
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path)
            
            results = {
                'success': True,
                'records': len(df),
                'brands': df['Brand Name'].unique().tolist() if 'Brand Name' in df.columns else [],
                'total_sales': float(df['Total Sales'].sum()) if 'Total Sales' in df.columns else 0
            }
            
            return results
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def validate_columns(df, required_columns):
        """Validate if dataframe has required columns"""
        missing = set(required_columns) - set(df.columns)
        if missing:
            return False, f"Missing columns: {', '.join(missing)}"
        return True, "Valid"