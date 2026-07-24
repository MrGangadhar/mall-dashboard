// Upload Module
class UploadModule {
    constructor() {
        this.api = new API();
        this.currentUploadType = null;
        this.init();
    }

    init() {
        // Setup upload modal events
        const uploadModal = document.getElementById('uploadModal');
        if (uploadModal) {
            uploadModal.addEventListener('hidden.bs.modal', () => {
                this.resetUploadForm();
            });
        }
        
        // Setup upload submit button
        document.getElementById('uploadSubmitBtn').addEventListener('click', () => {
            this.submitUpload();
        });
    }

    showUploadModal(type) {
        this.currentUploadType = type;
        
        const modalTitle = document.getElementById('uploadModalTitle');
        const formContent = document.getElementById('uploadFormContent');
        
        // Set modal title
        const titles = {
            'walkin': 'Upload Walk-in Data',
            'sales': 'Upload Sales Data',
            'rent': 'Upload Rent Data',
            'brands': 'Bulk Upload Brands'
        };
        modalTitle.innerHTML = `<i class="fas fa-cloud-upload-alt me-2"></i>${titles[type]}`;
        
        // Generate form content
        formContent.innerHTML = this.generateUploadForm(type);
        
        // Load malls dropdown if needed
        if (type !== 'brands') {
            this.loadMallsDropdown();
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('uploadModal'));
        modal.show();
    }

    generateUploadForm(type) {
        const forms = {
            'walkin': `
                <div class="mb-4">
                    <label class="form-label fw-bold">Select Mall</label>
                    <select class="form-select" id="uploadMallSelect" required>
                        <option value="">Choose Mall</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label fw-bold">Upload Excel/CSV File</label>
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.uploadModule.downloadTemplate('walkin')">
                            <i class="fas fa-download me-1"></i>Download Template
                        </button>
                    </div>
                    <input type="file" class="form-control" id="uploadFileInput" accept=".csv,.xlsx,.xls">
                    <div class="form-text">Supported formats: CSV, Excel (.xlsx, .xls)</div>
                </div>
                
                <div class="text-center my-3">
                    <span class="badge bg-light text-dark px-4 py-2">OR</span>
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold">Manual Entry</label>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <input type="date" class="form-control" id="manualDate" placeholder="Date">
                        </div>
                        <div class="col-md-6">
                            <input type="number" class="form-control" id="manualFootfall" placeholder="Footfall">
                        </div>
                        <div class="col-md-6">
                            <input type="number" class="form-control" id="manualPeakHour" placeholder="Peak Hour Visitors">
                        </div>
                        <div class="col-md-6">
                            <input type="number" class="form-control" id="manualDwellTime" placeholder="Avg Dwell Time (min)">
                        </div>
                    </div>
                </div>
            `,
            
            'sales': `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label fw-bold">Select Mall</label>
                        <select class="form-select" id="uploadMallSelect" required>
                            <option value="">Choose Mall</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-bold">Month</label>
                        <input type="month" class="form-control" id="uploadMonth" value="${new Date().toISOString().slice(0, 7)}">
                    </div>
                </div>
                
                <div class="mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label fw-bold">Upload Excel/CSV File</label>
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.uploadModule.downloadTemplate('sales')">
                            <i class="fas fa-download me-1"></i>Download Template
                        </button>
                    </div>
                    <input type="file" class="form-control" id="uploadFileInput" accept=".csv,.xlsx,.xls">
                    <div class="form-text">Upload file with multiple brands (supports 60+ brands)</div>
                </div>
                
                <div class="text-center my-3">
                    <span class="badge bg-light text-dark px-4 py-2">OR</span>
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold">Manual Entry</label>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <select class="form-select" id="manualBrandSelect">
                                <option value="">Select Brand</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <input type="date" class="form-control" id="manualDate">
                        </div>
                        <div class="col-md-6">
                            <input type="number" class="form-control" id="manualTotalSales" placeholder="Total Sales (₹)">
                        </div>
                        <div class="col-md-6">
                            <input type="number" class="form-control" id="manualTransactions" placeholder="Transaction Count">
                        </div>
                    </div>
                </div>
            `,
            
            'rent': `
                <div class="mb-3">
                    <label class="form-label fw-bold">Select Mall</label>
                    <select class="form-select" id="uploadMallSelect" required>
                        <option value="">Choose Mall</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label fw-bold">Upload Excel/CSV File</label>
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.uploadModule.downloadTemplate('rent')">
                            <i class="fas fa-download me-1"></i>Download Template
                        </button>
                    </div>
                    <input type="file" class="form-control" id="uploadFileInput" accept=".csv,.xlsx,.xls">
                </div>
                
                <div class="text-center my-3">
                    <span class="badge bg-light text-dark px-4 py-2">OR</span>
                </div>
                
                <div class="mb-3">
                    <label class="form-label fw-bold">Manual Entry</label>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <select class="form-select" id="manualBrandSelect">
                                <option value="">Select Brand</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <input type="month" class="form-control" id="manualMonth">
                        </div>
                        <div class="col-md-6">
                            <input type="number" class="form-control" id="manualBaseRent" placeholder="Base Rent (₹)">
                        </div>
                        <div class="col-md-6">
                            <input type="number" class="form-control" id="manualMaintenance" placeholder="Maintenance (₹)">
                        </div>
                        <div class="col-md-6">
                            <select class="form-select" id="manualPaymentStatus">
                                <option value="Paid">Paid</option>
                                <option value="Pending">Pending</option>
                                <option value="Overdue">Overdue</option>
                            </select>
                        </div>
                    </div>
                </div>
            `,
            
            'brands': `
                <div class="mb-3">
                    <label class="form-label fw-bold">Select Mall</label>
                    <select class="form-select" id="uploadMallSelect" required>
                        <option value="">Choose Mall</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label fw-bold">Bulk Upload Brands</label>
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.uploadModule.downloadTemplate('brands')">
                            <i class="fas fa-download me-1"></i>Download Template
                        </button>
                    </div>
                    <input type="file" class="form-control" id="uploadFileInput" accept=".csv,.xlsx,.xls">
                    <div class="form-text">Upload Excel file with multiple brands for bulk onboarding</div>
                </div>
            `
        };
        
        return forms[type] || '<p class="text-danger">Invalid upload type</p>';
    }

    async loadMallsDropdown() {
        try {
            const malls = await this.api.getMalls();
            const selects = document.querySelectorAll('#uploadMallSelect');
            
            selects.forEach(select => {
                select.innerHTML = '<option value="">Choose Mall</option>';
                malls.forEach(mall => {
                    select.innerHTML += `<option value="${mall.id}">${mall.name}</option>`;
                });
            });
        } catch (error) {
            console.error('Error loading malls:', error);
        }
    }

    async loadBrandsDropdown(mallId) {
        try {
            const brands = await this.api.getBrands(mallId);
            const selects = document.querySelectorAll('#manualBrandSelect');
            
            selects.forEach(select => {
                select.innerHTML = '<option value="">Select Brand</option>';
                brands.forEach(brand => {
                    select.innerHTML += `<option value="${brand.id}">${brand.name}</option>`;
                });
            });
        } catch (error) {
            console.error('Error loading brands:', error);
        }
    }

    async downloadTemplate(type) {
        try {
            const blob = await this.api.downloadTemplate(type);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_template.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            window.dashboard.showNotification('Template downloaded successfully!', 'success');
        } catch (error) {
            console.error('Error downloading template:', error);
            window.dashboard.showNotification('Error downloading template', 'danger');
        }
    }

    async submitUpload() {
        const fileInput = document.getElementById('uploadFileInput');
        const mallSelect = document.getElementById('uploadMallSelect');
        
        if (!this.currentUploadType) {
            window.dashboard.showNotification('Invalid upload type', 'danger');
            return;
        }

        // Show loading
        Utils.showLoading(true);

        try {
            if (fileInput && fileInput.files[0]) {
                // File upload
                await this.submitFileUpload();
            } else {
                // Manual entry
                await this.submitManualEntry();
            }
        } catch (error) {
            console.error('Upload error:', error);
            window.dashboard.showNotification(error.message || 'Upload failed', 'danger');
        } finally {
            Utils.showLoading(false);
        }
    }

    async submitFileUpload() {
        const fileInput = document.getElementById('uploadFileInput');
        const mallSelect = document.getElementById('uploadMallSelect');
        const month = document.getElementById('uploadMonth')?.value || new Date().toISOString().slice(0, 7);
        
        if (!mallSelect || !mallSelect.value) {
            window.dashboard.showNotification('Please select a mall', 'warning');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('mall_id', mallSelect.value);
        
        if (this.currentUploadType === 'sales') {
            formData.append('month', month);
        }
        
        let endpoint = '';
        switch(this.currentUploadType) {
            case 'walkin':
                endpoint = '/upload/walkin';
                break;
            case 'sales':
                endpoint = '/upload/sales';
                break;
            case 'rent':
                endpoint = '/upload/rent';
                break;
            case 'brands':
                endpoint = '/brands/bulk';
                break;
        }
        
        const response = await fetch(`http://localhost:5000/api${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${auth.getToken()}`
            },
            body: formData,
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success animation
            window.dashboard.showSuccessAnimation();
            window.dashboard.showNotification(result.message, 'success');
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();
            
            // Refresh dashboard
            setTimeout(() => {
                window.dashboard.loadDashboardOverview();
                window.dashboard.loadUploadHistory();
                if (this.currentUploadType === 'sales') {
                    // Redirect to sales dashboard
                    window.location.href = 'sales-dashboard.html';
                }
            }, 1500);
        } else {
            // Show validation errors
            let errorMessage = result.error || 'Upload failed';
            if (result.errors && result.errors.length > 0) {
                errorMessage += '\n\nErrors:\n' + result.errors.slice(0, 5).join('\n');
            }
            window.dashboard.showNotification(errorMessage, 'danger');
        }
    }

    async submitManualEntry() {
        let data = {
            mall_name: document.getElementById('uploadMallSelect')?.options[
                document.getElementById('uploadMallSelect').selectedIndex
            ]?.text
        };
        
        switch(this.currentUploadType) {
            case 'walkin':
                data = {
                    ...data,
                    date: document.getElementById('manualDate')?.value,
                    footfall: document.getElementById('manualFootfall')?.value,
                    peak_hour_visitors: document.getElementById('manualPeakHour')?.value,
                    average_dwell_time: document.getElementById('manualDwellTime')?.value
                };
                break;
                
            case 'sales':
                const brandSelect = document.getElementById('manualBrandSelect');
                data = {
                    ...data,
                    brand_name: brandSelect.options[brandSelect.selectedIndex]?.text,
                    date: document.getElementById('manualDate')?.value,
                    total_sales: document.getElementById('manualTotalSales')?.value,
                    transaction_count: document.getElementById('manualTransactions')?.value
                };
                break;
                
            case 'rent':
                const rentBrandSelect = document.getElementById('manualBrandSelect');
                data = {
                    ...data,
                    brand_name: rentBrandSelect.options[rentBrandSelect.selectedIndex]?.text,
                    month: document.getElementById('manualMonth')?.value,
                    base_rent: document.getElementById('manualBaseRent')?.value,
                    maintenance_charges: document.getElementById('manualMaintenance')?.value,
                    payment_status: document.getElementById('manualPaymentStatus')?.value
                };
                // Calculate total rent
                data.total_rent = (parseFloat(data.base_rent) || 0) + (parseFloat(data.maintenance_charges) || 0);
                break;
        }
        
        // Validate required fields
        const missingFields = Object.entries(data)
            .filter(([key, value]) => !value && key !== 'maintenance_charges')
            .map(([key]) => key);
        
        if (missingFields.length > 0) {
            window.dashboard.showNotification(`Missing fields: ${missingFields.join(', ')}`, 'warning');
            return;
        }
        
        const endpoint = this.currentUploadType === 'sales' ? '/upload/sales' : 
                        this.currentUploadType === 'walkin' ? '/upload/walkin' : 
                        '/upload/rent';
        
        const response = await fetch(`http://localhost:5000/api${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getToken()}`
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.dashboard.showSuccessAnimation();
            window.dashboard.showNotification('Data uploaded successfully!', 'success');
            
            bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();
            
            setTimeout(() => {
                window.dashboard.loadDashboardOverview();
            }, 1500);
        } else {
            window.dashboard.showNotification(result.error || 'Upload failed', 'danger');
        }
    }

    resetUploadForm() {
        const formContent = document.getElementById('uploadFormContent');
        formContent.innerHTML = '';
        this.currentUploadType = null;
    }
}

// Initialize upload module
document.addEventListener('DOMContentLoaded', () => {
    window.uploadModule = new UploadModule();
});