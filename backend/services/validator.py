import pandas as pd
import re
from datetime import datetime
from database.db_manager import DatabaseManager

class DataValidator:
    
    @staticmethod
    def validate_walkin_data(df):
        """Validate walk-in data dataframe"""
        errors = []
        warnings = []
        valid_rows = []
        
        required_columns = ['Mall Name', 'Date', 'Footfall']
        
        # Check required columns
        for col in required_columns:
            if col not in df.columns:
                errors.append(f"Missing required column: {col}")
                return False, errors, warnings, df
        
        for index, row in df.iterrows():
            row_errors = []
            row_warnings = []
            
            # Validate Mall Name
            mall_name = str(row.get('Mall Name', '')).strip()
            if not mall_name:
                row_errors.append(f"Row {index + 2}: Mall Name is required")
            
            # Validate Date
            date_value = row.get('Date')
            if pd.isna(date_value):
                row_errors.append(f"Row {index + 2}: Date is required")
            else:
                try:
                    pd.to_datetime(date_value)
                except:
                    row_errors.append(f"Row {index + 2}: Invalid date format. Use YYYY-MM-DD")
            
            # Validate Footfall
            footfall = row.get('Footfall')
            if pd.isna(footfall):
                row_errors.append(f"Row {index + 2}: Footfall is required")
            elif not isinstance(footfall, (int, float)) or footfall < 0:
                row_errors.append(f"Row {index + 2}: Footfall must be a positive number")
            
            # Validate Peak Hour Visitors
            peak_hour = row.get('Peak Hour Visitors')
            if not pd.isna(peak_hour):
                if not isinstance(peak_hour, (int, float)) or peak_hour < 0:
                    row_errors.append(f"Row {index + 2}: Peak Hour Visitors must be a positive number")
                elif peak_hour > footfall:
                    row_warnings.append(f"Row {index + 2}: Peak Hour Visitors cannot exceed total footfall")
            
            # Validate Dwell Time
            dwell_time = row.get('Average Dwell Time')
            if not pd.isna(dwell_time):
                if not isinstance(dwell_time, (int, float)) or dwell_time < 0:
                    row_errors.append(f"Row {index + 2}: Average Dwell Time must be a positive number")
            
            if row_errors:
                errors.extend(row_errors)
            else:
                valid_rows.append(index)
                if row_warnings:
                    warnings.extend(row_warnings)
        
        # Filter valid rows
        if valid_rows:
            df = df.iloc[valid_rows]
        
        return len(errors) == 0, errors, warnings, df
    
    @staticmethod
    def validate_sales_data(df):
        """Validate sales data dataframe"""
        errors = []
        warnings = []
        valid_rows = []
        
        required_columns = ['Mall Name', 'Brand Name', 'Date', 'Total Sales', 'Transaction Count']
        
        # Check required columns
        for col in required_columns:
            if col not in df.columns:
                errors.append(f"Missing required column: {col}")
                return False, errors, warnings, df
        
        for index, row in df.iterrows():
            row_errors = []
            row_warnings = []
            
            # Validate Mall Name
            mall_name = str(row.get('Mall Name', '')).strip()
            if not mall_name:
                row_errors.append(f"Row {index + 2}: Mall Name is required")
            
            # Validate Brand Name
            brand_name = str(row.get('Brand Name', '')).strip()
            if not brand_name:
                row_errors.append(f"Row {index + 2}: Brand Name is required")
            
            # Validate Date
            date_value = row.get('Date')
            if pd.isna(date_value):
                row_errors.append(f"Row {index + 2}: Date is required")
            else:
                try:
                    pd.to_datetime(date_value)
                except:
                    row_errors.append(f"Row {index + 2}: Invalid date format. Use YYYY-MM-DD")
            
            # Validate Total Sales
            total_sales = row.get('Total Sales')
            if pd.isna(total_sales):
                row_errors.append(f"Row {index + 2}: Total Sales is required")
            elif not isinstance(total_sales, (int, float)) or total_sales <= 0:
                row_errors.append(f"Row {index + 2}: Total Sales must be a positive number")
            
            # Validate Transaction Count
            transactions = row.get('Transaction Count')
            if pd.isna(transactions):
                row_errors.append(f"Row {index + 2}: Transaction Count is required")
            elif not isinstance(transactions, (int, float)) or transactions <= 0:
                row_errors.append(f"Row {index + 2}: Transaction Count must be a positive integer")
            
            # Validate Returns and Discounts
            returns_amount = row.get('Returns Amount', 0)
            if not pd.isna(returns_amount):
                if not isinstance(returns_amount, (int, float)) or returns_amount < 0:
                    row_errors.append(f"Row {index + 2}: Returns Amount must be a non-negative number")
                elif returns_amount > total_sales:
                    row_warnings.append(f"Row {index + 2}: Returns Amount exceeds Total Sales")
            
            if row_errors:
                errors.extend(row_errors)
            else:
                valid_rows.append(index)
                if row_warnings:
                    warnings.extend(row_warnings)
        
        # Filter valid rows
        if valid_rows:
            df = df.iloc[valid_rows]
        
        return len(errors) == 0, errors, warnings, df
    
    @staticmethod
    def validate_rent_data(df):
        """Validate rent data dataframe"""
        errors = []
        warnings = []
        valid_rows = []
        
        required_columns = ['Mall Name', 'Brand Name', 'Month', 'Base Rent', 'Total Rent']
        
        # Check required columns
        for col in required_columns:
            if col not in df.columns:
                errors.append(f"Missing required column: {col}")
                return False, errors, warnings, df
        
        for index, row in df.iterrows():
            row_errors = []
            row_warnings = []
            
            # Validate Mall Name
            mall_name = str(row.get('Mall Name', '')).strip()
            if not mall_name:
                row_errors.append(f"Row {index + 2}: Mall Name is required")
            
            # Validate Brand Name
            brand_name = str(row.get('Brand Name', '')).strip()
            if not brand_name:
                row_errors.append(f"Row {index + 2}: Brand Name is required")
            
            # Validate Month
            month = row.get('Month')
            if pd.isna(month):
                row_errors.append(f"Row {index + 2}: Month is required")
            elif not re.match(r'^\d{4}-\d{2}$', str(month)):
                row_errors.append(f"Row {index + 2}: Invalid month format. Use YYYY-MM")
            
            # Validate Base Rent
            base_rent = row.get('Base Rent')
            if pd.isna(base_rent):
                row_errors.append(f"Row {index + 2}: Base Rent is required")
            elif not isinstance(base_rent, (int, float)) or base_rent <= 0:
                row_errors.append(f"Row {index + 2}: Base Rent must be a positive number")
            
            # Validate Total Rent
            total_rent = row.get('Total Rent')
            if pd.isna(total_rent):
                row_errors.append(f"Row {index + 2}: Total Rent is required")
            elif not isinstance(total_rent, (int, float)) or total_rent <= 0:
                row_errors.append(f"Row {index + 2}: Total Rent must be a positive number")
            elif total_rent < base_rent:
                row_warnings.append(f"Row {index + 2}: Total Rent is less than Base Rent")
            
            # Validate Payment Status
            payment_status = row.get('Payment Status')
            if not pd.isna(payment_status):
                valid_statuses = ['Paid', 'Pending', 'Overdue', 'Partial']
                if str(payment_status).capitalize() not in valid_statuses:
                    row_warnings.append(f"Row {index + 2}: Payment Status should be one of: {', '.join(valid_statuses)}")
            
            if row_errors:
                errors.extend(row_errors)
            else:
                valid_rows.append(index)
                if row_warnings:
                    warnings.extend(row_warnings)
        
        # Filter valid rows
        if valid_rows:
            df = df.iloc[valid_rows]
        
        return len(errors) == 0, errors, warnings, df
    
    @staticmethod
    def validate_onboarded_entities(df, template_type):
        """Validate if all malls and brands in the file are onboarded"""
        errors = []
        mall_cache = {}
        brand_cache = {}
        
        for index, row in df.iterrows():
            mall_name = str(row.get('Mall Name', '')).strip()
            brand_name = str(row.get('Brand Name', '')) if 'Brand Name' in row else None
            
            # Validate Mall
            if mall_name not in mall_cache:
                is_valid, result = DatabaseManager.validate_mall_brand(mall_name, '')
                if is_valid:
                    mall_cache[mall_name] = result[0] if isinstance(result, tuple) else result
                else:
                    errors.append(f"Row {index + 2}: {result}")
                    continue
            else:
                mall_id = mall_cache[mall_name]
            
            # Validate Brand if applicable
            if brand_name and template_type != 'walkin':
                cache_key = f"{mall_name}_{brand_name}"
                if cache_key not in brand_cache:
                    is_valid, result = DatabaseManager.validate_mall_brand(mall_name, brand_name)
                    if is_valid:
                        brand_cache[cache_key] = result[1] if isinstance(result, tuple) else result
                    else:
                        errors.append(f"Row {index + 2}: {result}")
                else:
                    brand_id = brand_cache[cache_key]
        
        return len(errors) == 0, errors