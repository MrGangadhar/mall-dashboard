-- Create database
CREATE DATABASE IF NOT EXISTS mall_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mall_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Create malls table
CREATE TABLE IF NOT EXISTS malls (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    location VARCHAR(200),
    total_area FLOAT,
    parking_capacity INT,
    contact_person VARCHAR(100),
    contact_email VARCHAR(120),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_mall_name (name)
);

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    sub_category VARCHAR(50),
    mall_id INT NOT NULL,
    store_area FLOAT,
    lease_start_date DATE,
    lease_end_date DATE,
    monthly_rent DECIMAL(15,2),
    revenue_share_percentage DECIMAL(5,2),
    contact_person VARCHAR(100),
    contact_email VARCHAR(120),
    contact_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    UNIQUE KEY unique_mall_brand (mall_id, name),
    FOREIGN KEY (mall_id) REFERENCES malls(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_brand_mall (mall_id),
    INDEX idx_brand_status (status)
);

-- Create walkin_data table
CREATE TABLE IF NOT EXISTS walkin_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mall_id INT NOT NULL,
    date DATE NOT NULL,
    footfall INT,
    peak_hour_visitors INT,
    peak_hour_start VARCHAR(10),
    peak_hour_end VARCHAR(10),
    average_dwell_time INT,
    visitor_demographics JSON,
    weather_condition VARCHAR(50),
    special_event VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    UNIQUE KEY unique_walkin_record (mall_id, date),
    FOREIGN KEY (mall_id) REFERENCES malls(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_walkin_date (date),
    INDEX idx_walkin_mall (mall_id)
);

-- Create sales_data table
CREATE TABLE IF NOT EXISTS sales_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mall_id INT NOT NULL,
    brand_id INT NOT NULL,
    date DATE NOT NULL,
    total_sales DECIMAL(15,2),
    transaction_count INT,
    average_transaction_value DECIMAL(15,2),
    customer_count INT,
    returns_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    net_sales DECIMAL(15,2),
    tax_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    UNIQUE KEY unique_sales_record (mall_id, brand_id, date),
    FOREIGN KEY (mall_id) REFERENCES malls(id) ON DELETE CASCADE,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_sales_date (date),
    INDEX idx_sales_mall (mall_id),
    INDEX idx_sales_brand (brand_id)
);

-- Create rent_data table
CREATE TABLE IF NOT EXISTS rent_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mall_id INT NOT NULL,
    brand_id INT NOT NULL,
    month VARCHAR(7) NOT NULL,
    base_rent DECIMAL(15,2),
    revenue_share DECIMAL(5,2),
    revenue_share_amount DECIMAL(15,2),
    maintenance_charges DECIMAL(15,2),
    other_charges DECIMAL(15,2) DEFAULT 0,
    total_rent DECIMAL(15,2),
    payment_status ENUM('Paid', 'Pending', 'Overdue', 'Partial') DEFAULT 'Pending',
    payment_date DATE,
    payment_method VARCHAR(50),
    invoice_number VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    UNIQUE KEY unique_rent_record (mall_id, brand_id, month),
    FOREIGN KEY (mall_id) REFERENCES malls(id) ON DELETE CASCADE,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_rent_month (month),
    INDEX idx_rent_status (payment_status),
    INDEX idx_rent_mall (mall_id)
);

-- Create upload_history table
CREATE TABLE IF NOT EXISTS upload_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    mall_id INT,
    month VARCHAR(7),
    records_processed INT,
    success_count INT,
    error_count INT,
    error_log TEXT,
    status VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT,
    completion_time TIMESTAMP NULL,
    FOREIGN KEY (mall_id) REFERENCES malls(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_upload_type (file_type),
    INDEX idx_upload_date (uploaded_at),
    INDEX idx_upload_status (status)
);

-- Create template_master table
CREATE TABLE IF NOT EXISTS template_master (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_type VARCHAR(50) UNIQUE,
    template_name VARCHAR(100),
    column_mapping JSON,
    required_columns JSON,
    sample_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@mallanalytics.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4NX
('admin', 'admin@mallanalytics.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4NXyUqYq1S', 'System Administrator', 'admin');

-- Insert sample malls
INSERT INTO malls (name, location, total_area, parking_capacity, contact_person, contact_email, contact_phone, created_by) VALUES
('Gopalan Signature Tower', 'Whitefield, Bangalore', 500000, 2000, 'Rajesh Kumar', 'rajesh@gopalan.com', '9876543210', 1),
('Arcade Mall', 'Koramangala, Bangalore', 350000, 1500, 'Priya Singh', 'priya@arcade.com', '9876543211', 1),
('Innovation Mall', 'Electronic City, Bangalore', 450000, 1800, 'Suresh Patel', 'suresh@innovation.com', '9876543212', 1),
('Legacy Mall', 'Indiranagar, Bangalore', 400000, 1600, 'Anita Desai', 'anita@legacy.com', '9876543213', 1),
('Grand Mall', 'MG Road, Bangalore', 600000, 2500, 'Vikram Sharma', 'vikram@grand.com', '9876543214', 1),
('Fortune City', 'JP Nagar, Bangalore', 300000, 1200, 'Deepa Krishnan', 'deepa@fortune.com', '9876543215', 1);

-- Insert sample brands for Gopalan Signature Tower
INSERT INTO brands (name, category, sub_category, mall_id, store_area, lease_start_date, lease_end_date, monthly_rent, revenue_share_percentage, status, created_by) VALUES
('Nike', 'Fashion', 'Sportswear', 1, 2500, '2024-01-01', '2029-12-31', 250000, 5.0, 'Active', 1),
('Apple', 'Electronics', 'Mobile Phones', 1, 1800, '2024-01-01', '2026-12-31', 300000, 4.5, 'Active', 1),
('Starbucks', 'Food & Beverage', 'Coffee Shop', 1, 1200, '2024-02-01', '2027-01-31', 150000, 6.0, 'Active', 1),
('Zara', 'Fashion', 'Apparel', 1, 2200, '2024-01-15', '2028-01-14', 200000, 5.0, 'Active', 1),
('Samsung', 'Electronics', 'Consumer Electronics', 1, 1600, '2024-03-01', '2027-02-28', 180000, 4.0, 'Active', 1),
('McDonald\'s', 'Food & Beverage', 'Fast Food', 1, 1000, '2024-01-20', '2026-01-19', 120000, 6.5, 'Active', 1);

-- Insert sample brands for Arcade Mall
INSERT INTO brands (name, category, sub_category, mall_id, store_area, lease_start_date, lease_end_date, monthly_rent, revenue_share_percentage, status, created_by) VALUES
('Adidas', 'Fashion', 'Sportswear', 2, 2000, '2024-01-10', '2028-01-09', 180000, 5.0, 'Active', 1),
('Sony', 'Electronics', 'Entertainment', 2, 1500, '2024-02-15', '2027-02-14', 160000, 4.0, 'Active', 1),
('Cafe Coffee Day', 'Food & Beverage', 'Coffee Shop', 2, 800, '2024-01-05', '2026-01-04', 90000, 6.0, 'Active', 1),
('H&M', 'Fashion', 'Apparel', 2, 2100, '2024-03-01', '2029-02-28', 190000, 5.0, 'Active', 1);

-- Insert template configurations
INSERT INTO template_master (template_type, template_name, column_mapping, required_columns, sample_data) VALUES
('walkin', 'Walk-in Data Template', 
 '{"mall_name": "Mall Name", "date": "Date", "footfall": "Footfall", "peak_hour_visitors": "Peak Hour Visitors", "average_dwell_time": "Average Dwell Time"}',
 '["Mall Name", "Date", "Footfall"]',
 '{"Mall Name": "Gopalan Signature Tower", "Date": "2024-03-15", "Footfall": 5000, "Peak Hour Visitors": 1200, "Average Dwell Time": 45}'),

('sales', 'Sales Data Template',
 '{"mall_name": "Mall Name", "brand_name": "Brand Name", "date": "Date", "total_sales": "Total Sales", "transaction_count": "Transaction Count", "customer_count": "Customer Count", "returns_amount": "Returns Amount", "discount_amount": "Discount Amount"}',
 '["Mall Name", "Brand Name", "Date", "Total Sales", "Transaction Count"]',
 '{"Mall Name": "Gopalan Signature Tower", "Brand Name": "Nike", "Date": "2024-03-15", "Total Sales": 150000, "Transaction Count": 75, "Customer Count": 68}'),

('rent', 'Rent Data Template',
 '{"mall_name": "Mall Name", "brand_name": "Brand Name", "month": "Month", "base_rent": "Base Rent", "maintenance_charges": "Maintenance Charges", "total_rent": "Total Rent", "payment_status": "Payment Status"}',
 '["Mall Name", "Brand Name", "Month", "Base Rent", "Total Rent"]',
 '{"Mall Name": "Gopalan Signature Tower", "Brand Name": "Nike", "Month": "2024-03", "Base Rent": 250000, "Maintenance Charges": 25000, "Total Rent": 275000, "Payment Status": "Pending"}'),

('brands', 'Bulk Brand Onboarding Template',
 '{"mall_name": "Mall Name", "brand_name": "Brand Name", "category": "Category", "sub_category": "Sub Category", "store_area": "Store Area (sq ft)", "lease_start_date": "Lease Start Date", "lease_end_date": "Lease End Date", "monthly_rent": "Monthly Rent", "revenue_share_percentage": "Revenue Share %"}',
 '["Mall Name", "Brand Name", "Category", "Monthly Rent"]',
 '{"Mall Name": "Gopalan Signature Tower", "Brand Name": "New Brand", "Category": "Fashion", "Store Area": 1500, "Lease Start Date": "2024-04-01", "Monthly Rent": 200000}');

-- Insert sample walk-in data
INSERT INTO walkin_data (mall_id, date, footfall, peak_hour_visitors, peak_hour_start, peak_hour_end, average_dwell_time, created_by) VALUES
(1, '2024-03-01', 5200, 1350, '18:00', '20:00', 48, 1),
(1, '2024-03-02', 5800, 1420, '17:00', '19:00', 52, 1),
(1, '2024-03-03', 6100, 1550, '16:00', '18:00', 55, 1),
(2, '2024-03-01', 3800, 950, '18:00', '20:00', 42, 1),
(2, '2024-03-02', 4100, 1050, '17:00', '19:00', 45, 1),
(3, '2024-03-01', 4500, 1100, '18:00', '20:00', 50, 1);

-- Insert sample sales data
INSERT INTO sales_data (mall_id, brand_id, date, total_sales, transaction_count, average_transaction_value, customer_count, net_sales, created_by) VALUES
(1, 1, '2024-03-01', 185000, 92, 2010.87, 85, 182500, 1),
(1, 1, '2024-03-02', 192000, 95, 2021.05, 90, 189200, 1),
(1, 2, '2024-03-01', 450000, 45, 10000.00, 42, 445000, 1),
(1, 3, '2024-03-01', 75000, 150, 500.00, 145, 73500, 1),
(2, 7, '2024-03-01', 165000, 82, 2012.20, 78, 162800, 1),
(2, 8, '2024-03-01', 210000, 35, 6000.00, 32, 207900, 1);

-- Insert sample rent data
INSERT INTO rent_data (mall_id, brand_id, month, base_rent, maintenance_charges, total_rent, payment_status, payment_date, created_by) VALUES
(1, 1, '2024-03', 250000, 25000, 275000, 'Paid', '2024-03-05', 1),
(1, 2, '2024-03', 300000, 30000, 330000, 'Paid', '2024-03-03', 1),
(1, 3, '2024-03', 150000, 15000, 165000, 'Pending', NULL, 1),
(1, 4, '2024-03', 200000, 20000, 220000, 'Paid', '2024-03-04', 1),
(2, 7, '2024-03', 180000, 18000, 198000, 'Pending', NULL, 1),
(2, 8, '2024-03', 160000, 16000, 176000, 'Paid', '2024-03-06', 1);