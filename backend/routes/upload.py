from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from database.models import db, Mall, Brand, SalesData, WalkinData, RentData, UploadHistory
from database.db_manager import DatabaseManager
from services.validator import DataValidator
from services.websocket import broadcast_data_update
from services.auth_service import token_required
from config import Config
import pandas as pd
import os
from datetime import datetime
import logging

upload_bp = Blueprint('upload', __name__)
logger = logging.getLogger(__name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

@upload_bp.route('/walkin', methods=['POST'])
@cross_origin()
@login_required
def upload_walkin_data():
    """Upload walk-in data"""
    try:
        if 'file' in request.files:
            # File upload
            file = request.files['file']
            
            if not file or file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            if not allowed_file(file.filename):
                return jsonify({'error': 'File type not allowed. Please upload CSV or Excel files'}), 400
            
            # Read file
            filename = secure_filename(file.filename)
            filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
            file.save(filepath)
            
            if filename.endswith('.csv'):
                df = pd.read_csv(filepath)
            else:
                df = pd.read_excel(filepath)
            
            os.remove(filepath)
            
        else:
            # Manual entry
            data = request.json
            df = pd.DataFrame([{
                'Mall Name': data.get('mall_name'),
                'Date': data.get('date'),
                'Footfall': data.get('footfall'),
                'Peak Hour Visitors': data.get('peak_hour_visitors', 0),
                'Average Dwell Time': data.get('average_dwell_time', 0)
            }])
        
        # Validate data
        is_valid, errors, warnings, df = DataValidator.validate_walkin_data(df)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': 'Validation failed',
                'errors': errors[:20],
                'warnings': warnings[:20]
            }), 400
        
        # Validate onboarded entities
        is_valid, validation_errors = DataValidator.validate_onboarded_entities(df, 'walkin')
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': 'Onboarding validation failed',
                'errors': validation_errors[:20]
            }), 400
        
        # Process valid rows
        success_count = 0
        error_count = 0
        error_log = []
        
        for index, row in df.iterrows():
            try:
                # Get mall ID
                mall_name = str(row['Mall Name']).strip()
                mall = Mall.query.filter_by(name=mall_name).first()
                
                # Check existing record
                date = pd.to_datetime(row['Date']).date()
                existing = WalkinData.query.filter_by(
                    mall_id=mall.id,
                    date=date
                ).first()
                
                if existing:
                    # Update
                    existing.footfall = int(row['Footfall'])
                    existing.peak_hour_visitors = int(row.get('Peak Hour Visitors', 0))
                    existing.average_dwell_time = int(row.get('Average Dwell Time', 0))
                    existing.created_by = current_user.id
                else:
                    # Insert
                    walkin_data = WalkinData(
                        mall_id=mall.id,
                        date=date,
                        footfall=int(row['Footfall']),
                        peak_hour_visitors=int(row.get('Peak Hour Visitors', 0)),
                        average_dwell_time=int(row.get('Average Dwell Time', 0)),
                        created_by=current_user.id
                    )
                    db.session.add(walkin_data)
                
                success_count += 1
                
            except Exception as e:
                error_count += 1
                error_log.append(f"Row {index + 2}: {str(e)}")
            
            # Commit every 50 records
            if (index + 1) % 50 == 0:
                db.session.commit()
        
        db.session.commit()
        
        # Record upload history
        upload_history = UploadHistory(
            file_name=request.files.get('file', {}).filename if 'file' in request.files else 'Manual Entry',
            file_type='walkin',
            mall_id=mall.id if 'mall' in locals() else None,
            records_processed=len(df),
            success_count=success_count,
            error_count=error_count,
            error_log='\n'.join(error_log[:20]),
            status='Completed' if error_count == 0 else 'Partial',
            uploaded_at=datetime.utcnow(),
            uploaded_by=current_user.id,
            completion_time=datetime.utcnow()
        )
        db.session.add(upload_history)
        db.session.commit()
        
        # Broadcast real-time update
        broadcast_data_update('walkin', mall.id if 'mall' in locals() else None)
        
        return jsonify({
            'success': True,
            'message': f'Successfully processed {success_count} records',
            'summary': {
                'total_records': len(df),
                'success_count': success_count,
                'error_count': error_count,
                'warnings': warnings[:10] if 'warnings' in locals() else []
            },
            'errors': error_log[:10] if error_count > 0 else []
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Walk-in upload error: {e}")
        return jsonify({'error': str(e)}), 500

@upload_bp.route('/sales', methods=['POST'])
@cross_origin()
@login_required
def upload_sales_data():
    """Upload sales data"""
    try:
        if 'file' in request.files:
            # File upload
            file = request.files['file']
            
            if not file or file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            if not allowed_file(file.filename):
                return jsonify({'error': 'File type not allowed. Please upload CSV or Excel files'}), 400
            
            # Read file
            filename = secure_filename(file.filename)
            filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
            file.save(filepath)
            
            if filename.endswith('.csv'):
                df = pd.read_csv(filepath)
            else:
                df = pd.read_excel(filepath)
            
            os.remove(filepath)
            
        else:
            # Manual entry
            data = request.json
            df = pd.DataFrame([{
                'Mall Name': data.get('mall_name'),
                'Brand Name': data.get('brand_name'),
                'Date': data.get('date'),
                'Total Sales': data.get('total_sales'),
                'Transaction Count': data.get('transaction_count'),
                'Customer Count': data.get('customer_count', 0),
                'Returns Amount': data.get('returns_amount', 0),
                'Discount Amount': data.get('discount_amount', 0)
            }])
        
        # Validate data
        is_valid, errors, warnings, df = DataValidator.validate_sales_data(df)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': 'Validation failed',
                'errors': errors[:20],
                'warnings': warnings[:20]
            }), 400
        
        # Validate onboarded entities
        is_valid, validation_errors = DataValidator.validate_onboarded_entities(df, 'sales')
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': 'Onboarding validation failed',
                'errors': validation_errors[:20]
            }), 400
        
        # Process valid rows
        success_count = 0
        error_count = 0
        error_log = []
        mall_cache = {}
        brand_cache = {}
        
        for index, row in df.iterrows():
            try:
                # Get mall ID
                mall_name = str(row['Mall Name']).strip()
                if mall_name not in mall_cache:
                    mall = Mall.query.filter_by(name=mall_name).first()
                    mall_cache[mall_name] = mall.id
                mall_id = mall_cache[mall_name]
                
                # Get brand ID
                brand_name = str(row['Brand Name']).strip()
                cache_key = f"{mall_name}_{brand_name}"
                if cache_key not in brand_cache:
                    brand = Brand.query.filter_by(name=brand_name, mall_id=mall_id).first()
                    brand_cache[cache_key] = brand.id
                brand_id = brand_cache[cache_key]
                
                # Parse date
                date = pd.to_datetime(row['Date']).date()
                
                # Calculate values
                total_sales = float(row['Total Sales'])
                transactions = int(row['Transaction Count'])
                avg_transaction = total_sales / transactions if transactions > 0 else 0
                returns = float(row.get('Returns Amount', 0))
                discounts = float(row.get('Discount Amount', 0))
                net_sales = total_sales - returns - discounts
                
                # Check existing
                existing = SalesData.query.filter_by(
                    mall_id=mall_id,
                    brand_id=brand_id,
                    date=date
                ).first()
                
                if existing:
                    existing.total_sales = total_sales
                    existing.transaction_count = transactions
                    existing.average_transaction_value = avg_transaction
                    existing.customer_count = int(row.get('Customer Count', 0))
                    existing.returns_amount = returns
                    existing.discount_amount = discounts
                    existing.net_sales = net_sales
                    existing.created_by = current_user.id
                else:
                    sales_data = SalesData(
                        mall_id=mall_id,
                        brand_id=brand_id,
                        date=date,
                        total_sales=total_sales,
                        transaction_count=transactions,
                        average_transaction_value=avg_transaction,
                        customer_count=int(row.get('Customer Count', 0)),
                        returns_amount=returns,
                        discount_amount=discounts,
                        net_sales=net_sales,
                        created_by=current_user.id
                    )
                    db.session.add(sales_data)
                
                success_count += 1
                
            except Exception as e:
                error_count += 1
                error_log.append(f"Row {index + 2}: {str(e)}")
            
            # Commit every 50 records
            if (index + 1) % 50 == 0:
                db.session.commit()
        
        db.session.commit()
        
        # Record upload history
        upload_history = UploadHistory(
            file_name=request.files.get('file', {}).filename if 'file' in request.files else 'Manual Entry',
            file_type='sales',
            mall_id=next(iter(mall_cache.values())) if mall_cache else None,
            month=date.strftime('%Y-%m') if 'date' in locals() else None,
            records_processed=len(df),
            success_count=success_count,
            error_count=error_count,
            error_log='\n'.join(error_log[:20]),
            status='Completed' if error_count == 0 else 'Partial',
            uploaded_at=datetime.utcnow(),
            uploaded_by=current_user.id,
            completion_time=datetime.utcnow()
        )
        db.session.add(upload_history)
        db.session.commit()
        
        # Broadcast real-time update
        broadcast_data_update('sales')
        
        return jsonify({
            'success': True,
            'message': f'Successfully processed {success_count} sales records',
            'summary': {
                'total_records': len(df),
                'success_count': success_count,
                'error_count': error_count,
                'warnings': warnings[:10] if 'warnings' in locals() else []
            },
            'errors': error_log[:10] if error_count > 0 else []
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Sales upload error: {e}")
        return jsonify({'error': str(e)}), 500

@upload_bp.route('/rent', methods=['POST'])
@cross_origin()
@login_required
def upload_rent_data():
    """Upload rent data"""
    try:
        if 'file' in request.files:
            # File upload
            file = request.files['file']
            
            if not file or file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            if not allowed_file(file.filename):
                return jsonify({'error': 'File type not allowed. Please upload CSV or Excel files'}), 400
            
            # Read file
            filename = secure_filename(file.filename)
            filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
            file.save(filepath)
            
            if filename.endswith('.csv'):
                df = pd.read_csv(filepath)
            else:
                df = pd.read_excel(filepath)
            
            os.remove(filepath)
            
        else:
            # Manual entry
            data = request.json
            df = pd.DataFrame([{
                'Mall Name': data.get('mall_name'),
                'Brand Name': data.get('brand_name'),
                'Month': data.get('month'),
                'Base Rent': data.get('base_rent'),
                'Maintenance Charges': data.get('maintenance_charges', 0),
                'Total Rent': data.get('total_rent'),
                'Payment Status': data.get('payment_status', 'Pending')
            }])
        
        # Validate data
        is_valid, errors, warnings, df = DataValidator.validate_rent_data(df)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': 'Validation failed',
                'errors': errors[:20],
                'warnings': warnings[:20]
            }), 400
        
        # Validate onboarded entities
        is_valid, validation_errors = DataValidator.validate_onboarded_entities(df, 'rent')
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': 'Onboarding validation failed',
                'errors': validation_errors[:20]
            }), 400
        
        # Process valid rows
        success_count = 0
        error_count = 0
        error_log = []
        mall_cache = {}
        brand_cache = {}
        
        for index, row in df.iterrows():
            try:
                # Get mall ID
                mall_name = str(row['Mall Name']).strip()
                if mall_name not in mall_cache:
                    mall = Mall.query.filter_by(name=mall_name).first()
                    mall_cache[mall_name] = mall.id
                mall_id = mall_cache[mall_name]
                
                # Get brand ID
                brand_name = str(row['Brand Name']).strip()
                cache_key = f"{mall_name}_{brand_name}"
                if cache_key not in brand_cache:
                    brand = Brand.query.filter_by(name=brand_name, mall_id=mall_id).first()
                    brand_cache[cache_key] = brand.id
                brand_id = brand_cache[cache_key]
                
                month = str(row['Month'])
                base_rent = float(row['Base Rent'])
                maintenance = float(row.get('Maintenance Charges', 0))
                other_charges = float(row.get('Other Charges', 0))
                total_rent = float(row.get('Total Rent', base_rent + maintenance + other_charges))
                
                # Check existing
                existing = RentData.query.filter_by(
                    mall_id=mall_id,
                    brand_id=brand_id,
                    month=month
                ).first()
                
                if existing:
                    existing.base_rent = base_rent
                    existing.maintenance_charges = maintenance
                    existing.other_charges = other_charges
                    existing.total_rent = total_rent
                    existing.payment_status = row.get('Payment Status', 'Pending')
                    existing.payment_date = pd.to_datetime(row.get('Payment Date')).date() if not pd.isna(row.get('Payment Date')) else None
                    existing.created_by = current_user.id
                else:
                    rent_data = RentData(
                        mall_id=mall_id,
                        brand_id=brand_id,
                        month=month,
                        base_rent=base_rent,
                        maintenance_charges=maintenance,
                        other_charges=other_charges,
                        total_rent=total_rent,
                        payment_status=row.get('Payment Status', 'Pending'),
                        payment_date=pd.to_datetime(row.get('Payment Date')).date() if not pd.isna(row.get('Payment Date')) else None,
                        created_by=current_user.id
                    )
                    db.session.add(rent_data)
                
                success_count += 1
                
            except Exception as e:
                error_count += 1
                error_log.append(f"Row {index + 2}: {str(e)}")
            
            # Commit every 50 records
            if (index + 1) % 50 == 0:
                db.session.commit()
        
        db.session.commit()
        
        # Record upload history
        upload_history = UploadHistory(
            file_name=request.files.get('file', {}).filename if 'file' in request.files else 'Manual Entry',
            file_type='rent',
            mall_id=next(iter(mall_cache.values())) if mall_cache else None,
            month=month if 'month' in locals() else None,
            records_processed=len(df),
            success_count=success_count,
            error_count=error_count,
            error_log='\n'.join(error_log[:20]),
            status='Completed' if error_count == 0 else 'Partial',
            uploaded_at=datetime.utcnow(),
            uploaded_by=current_user.id,
            completion_time=datetime.utcnow()
        )
        db.session.add(upload_history)
        db.session.commit()
        
        # Broadcast real-time update
        broadcast_data_update('rent')
        
        return jsonify({
            'success': True,
            'message': f'Successfully processed {success_count} rent records',
            'summary': {
                'total_records': len(df),
                'success_count': success_count,
                'error_count': error_count,
                'warnings': warnings[:10] if 'warnings' in locals() else []
            },
            'errors': error_log[:10] if error_count > 0 else []
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Rent upload error: {e}")
        return jsonify({'error': str(e)}), 500

@upload_bp.route('/check-status/<int:upload_id>', methods=['GET'])
@cross_origin()
@login_required
def check_upload_status(upload_id):
    """Check upload status"""
    try:
        upload = UploadHistory.query.get(upload_id)
        
        if not upload:
            return jsonify({'error': 'Upload record not found'}), 404
        
        return jsonify({
            'id': upload.id,
            'status': upload.status,
            'success_count': upload.success_count,
            'error_count': upload.error_count,
            'error_log': upload.error_log.split('\n') if upload.error_log else [],
            'completion_time': upload.completion_time.isoformat() if upload.completion_time else None
        }), 200
        
    except Exception as e:
        logger.error(f"Check status error: {e}")
        return jsonify({'error': str(e)}), 500

@upload_bp.route('/excel/daily-updates', methods=['POST'])
@cross_origin()
@token_required
def upload_excel_daily_updates():
    """Upload Excel file with daily updates data"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        mall_id = request.form.get('mall_id')
        month = request.form.get('month')
        
        if not mall_id or not month:
            return jsonify({'error': 'Mall ID and month are required'}), 400
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file type
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Please upload CSV or Excel files'}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Process Excel file
        from services.excel_processor import ExcelProcessor
        # IMPORTANT: Use request.current_user.id (set by token_required) instead of current_user.id
        result = ExcelProcessor.process_daily_updates(filepath, mall_id, month, request.current_user.id)
        
        # Clean up
        os.remove(filepath)
        
        if result['success']:
            # Record upload history
            upload_history = UploadHistory(
                file_name=filename,
                file_type='daily_updates',
                mall_id=mall_id,
                month=month,
                records_processed=result['processed'],
                success_count=result['processed'],
                error_count=len(result['errors']),
                error_log='\n'.join(result['errors'][:20]) if result['errors'] else None,
                status='Completed' if len(result['errors']) == 0 else 'Partial',
                uploaded_at=datetime.utcnow(),
                uploaded_by=request.current_user.id,  # also use request.current_user.id here
                completion_time=datetime.utcnow()
            )
            db.session.add(upload_history)
            db.session.commit()
            
            # Broadcast real-time update
            broadcast_data_update('daily_updates', mall_id)
            
            return jsonify({
                'success': True,
                'message': f'Successfully processed {result["processed"]} records',
                'records_processed': result['processed'],
                'errors': result['errors'][:10]
            }), 200
        else:
            return jsonify({'error': result['error']}), 400
            
    except Exception as e:
        logger.error(f"Excel upload error: {e}")
        return jsonify({'error': str(e)}), 500