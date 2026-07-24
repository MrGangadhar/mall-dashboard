import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from database.models import db, SalesData, Brand

class AnalyticsService:
    
    @staticmethod
    def get_sales_trend(days=30):
        """Get sales trend for last N days"""
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            data = db.session.query(
                SalesData.date,
                func.sum(SalesData.total_sales).label('total')
            ).filter(
                SalesData.date >= start_date,
                SalesData.date <= end_date
            ).group_by(SalesData.date).all()
            
            return [{'date': d[0].isoformat(), 'sales': float(d[1])} for d in data]
        except Exception as e:
            print(f"Error: {e}")
            return []
    
    @staticmethod
    def get_top_brands(limit=5):
        """Get top performing brands"""
        try:
            data = db.session.query(
                Brand.name,
                func.sum(SalesData.total_sales).label('total')
            ).join(SalesData, Brand.id == SalesData.brand_id)\
             .group_by(Brand.id)\
             .order_by(func.sum(SalesData.total_sales).desc())\
             .limit(limit).all()
            
            return [{'name': d[0], 'sales': float(d[1])} for d in data]
        except Exception as e:
            print(f"Error: {e}")
            return []