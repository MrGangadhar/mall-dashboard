// Daily Updates Module - Upload Form
class DailyUpdates {
    constructor() {
        console.log('DailyUpdates constructor called');
        this.api = new API();
        this.init();
    }

    async init() {
        console.log('DailyUpdates initializing...');
        
        // Check authentication
        if (!auth.isAuthenticated()) {
            console.log('Not authenticated, redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        // Load user info
        this.loadUserInfo();

        // Load malls dropdown
        await this.loadMalls();

        // Set default date to yesterday (trading day)
        this.setDefaultDate();

        // Load recent updates (with error handling)
        try {
            await this.loadRecentUpdates();
        } catch (error) {
            console.error('Error in loadRecentUpdates:', error);
        }

        // Load latest update (with error handling)
        try {
            await this.loadLatestUpdate();
        } catch (error) {
            console.error('Error in loadLatestUpdate:', error);
        }

        // Update quick stats (with error handling)
        try {
            await this.updateQuickStats();
        } catch (error) {
            console.error('Error in updateQuickStats:', error);
        }

        // Setup form submission
        this.setupFormSubmit();

        // Setup select2 for better dropdown
        this.setupSelect2();

        // Make instance globally available
        window.dailyUpdates = this;
        console.log('DailyUpdates initialized successfully and attached to window');
    }

    loadUserInfo() {
        const user = auth.getUser();
        if (!user) return;
        
        // Main user info
        const userFullName = document.getElementById('userFullName');
        const userRole = document.getElementById('userRole');
        const userInitials = document.getElementById('userInitials');
        
        if (userFullName) userFullName.textContent = `Welcome, ${user.full_name || user.username}`;
        if (userRole) userRole.textContent = user.role || 'Administrator';
        
        if (userInitials) {
            const initials = (user.full_name || user.username).split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            userInitials.textContent = initials;
        }
        
        // Sidebar user info
        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserRole = document.getElementById('sidebarUserRole');
        const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
        
        if (sidebarUserName) sidebarUserName.textContent = user.full_name || user.username;
        if (sidebarUserRole) sidebarUserRole.textContent = user.role || 'Administrator';
        if (sidebarUserAvatar) {
            const initials = (user.full_name || user.username).split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            sidebarUserAvatar.textContent = initials;
        }
    }

    setDefaultDate() {
        // Set to yesterday (trading day - cannot update today's data)
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        const yyyy = yesterday.getFullYear();
        const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const dd = String(yesterday.getDate()).padStart(2, '0');
        
        const dateInput = document.getElementById('updateDate');
        if (dateInput) {
            dateInput.value = `${yyyy}-${mm}-${dd}`;
            dateInput.max = `${yyyy}-${mm}-${dd}`; // Cannot select future dates
        }
        
        // Set default timestamp to yesterday at current time
        const timestampInput = document.getElementById('timestamp');
        if (timestampInput) {
            const hours = String(today.getHours()).padStart(2, '0');
            const minutes = String(today.getMinutes()).padStart(2, '0');
            timestampInput.value = `${yyyy}-${mm}-${dd}T${hours}:${minutes}`;
            timestampInput.max = `${yyyy}-${mm}-${dd}T23:59`;
        }
        
        // Set month field
        const monthInput = document.getElementById('month');
        if (monthInput) {
            const month = yesterday.toLocaleString('default', { month: 'long' });
            monthInput.value = month;
        }
    }

    setupSelect2() {
        if (typeof $ !== 'undefined' && $.fn.select2) {
            try {
                $('#mallSelect').select2({
                    placeholder: 'Choose Mall',
                    width: '100%'
                });
                
                const excelMallSelect = $('#excelMallSelect');
                if (excelMallSelect.length) {
                    excelMallSelect.select2({
                        placeholder: 'Choose Mall',
                        width: '100%',
                        dropdownParent: $('#excelUploadModal')
                    });
                }
            } catch (e) {
                console.warn('Select2 initialization failed:', e);
            }
        }
    }

    async loadMalls() {
        try {
            const malls = await this.api.getMalls();
            
            // Main mall select
            const select = document.getElementById('mallSelect');
            if (select) {
                select.innerHTML = '<option value="">Choose Mall</option>';
                if (malls && malls.length > 0) {
                    malls.forEach(mall => {
                        const option = document.createElement('option');
                        option.value = mall.id;
                        option.textContent = mall.name;
                        select.appendChild(option);
                    });
                }
            }
            
            // Excel upload mall select
            const excelSelect = document.getElementById('excelMallSelect');
            if (excelSelect) {
                excelSelect.innerHTML = '<option value="">Choose Mall</option>';
                if (malls && malls.length > 0) {
                    malls.forEach(mall => {
                        const option = document.createElement('option');
                        option.value = mall.id;
                        option.textContent = mall.name;
                        excelSelect.appendChild(option);
                    });
                }
            }

            // Trigger select2 update if available
            if (typeof $ !== 'undefined' && $.fn.select2) {
                try {
                    $(select).trigger('change');
                    $(excelSelect).trigger('change');
                } catch (e) {
                    console.warn('Select2 trigger failed:', e);
                }
            }

        } catch (error) {
            console.error('Error loading malls:', error);
            this.showNotification('Failed to load malls. Please check your connection.', 'danger');
        }
    }

    async loadRecentUpdates() {
        const tbody = document.getElementById('recentUpdatesBody');
        if (!tbody) {
            console.warn('recentUpdatesBody element not found');
            return;
        }
        
        try {
            const updates = await this.api.getDailyUpdates({ limit: 10 });
            
            if (updates && updates.length > 0) {
                tbody.innerHTML = updates.map(update => `
                    <tr>
                        <td>${this.formatDate(update.update_date)}</td>
                        <td>${update.mall_name || 'N/A'}</td>
                        <td class="text-end">${this.formatNumber(update.mall_footfall)}</td>
                        <td class="text-end">${this.formatNumber(update.cinema_walkin)}</td>
                        <td class="text-end">${this.formatCurrency(update.parking_collection)}</td>
                        <td class="text-end">${this.formatNumber(update.two_wheeler_count)}</td>
                        <td class="text-end">${this.formatNumber(update.four_wheeler_count)}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="viewUpdate(${update.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-4">
                            <i class="fas fa-inbox fa-2x mb-3 d-block"></i>
                            No daily updates found
                        </td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('Error loading recent updates:', error);
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-danger py-4">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Failed to load updates. Backend error.
                        </td>
                    </tr>
                `;
            }
        }
    }

    async loadLatestUpdate() {
        const tbody = document.getElementById('latestUpdateBody');
        const timestampEl = document.getElementById('uploadTimestamp');
        
        if (!tbody) {
            console.warn('latestUpdateBody element not found');
            return;
        }
        
        try {
            const updates = await this.api.getDailyUpdates({ limit: 1 });
            
            if (updates && updates.length > 0) {
                const update = updates[0];
                
                const uploadTime = new Date().toLocaleString();
                if (timestampEl) timestampEl.textContent = `Last Updated: ${uploadTime}`;
                
                tbody.innerHTML = `
                    <tr>
                        <td>${new Date().toLocaleString()}</td>
                        <td><strong>${update.mall_name || 'N/A'}</strong></td>
                        <td class="text-end">${this.formatNumber(update.mall_footfall)}</td>
                        <td class="text-end">${this.formatNumber(update.cinema_walkin)}</td>
                        <td class="text-end">${this.formatCurrency(update.parking_collection)}</td>
                        <td class="text-end">${this.formatNumber(update.two_wheeler_count)}</td>
                        <td class="text-end">${this.formatNumber(update.four_wheeler_count)}</td>
                        <td class="text-end">${this.formatNumber(update.keb_usage_units)}</td>
                        <td class="text-end">${this.formatNumber(update.dg_usage_units)}</td>
                        <td class="text-end">${this.formatNumber(update.water_consumption_kl)}</td>
                        <td class="text-end">${this.formatNumber(update.water_tankers_purchased)}</td>
                        <td class="text-end">${this.formatNumber(update.stp_treated_water_kl)}</td>
                        <td class="text-end">${this.formatNumber(update.diesel_consumption_ltr)}</td>
                        <td class="text-center">${update.garbage_collected ? '✅ Yes' : '❌ No'}</td>
                        <td class="text-end">${this.formatNumber(update.work_permits_raised)}</td>
                        <td class="text-end">${this.formatNumber(update.customer_feedback_count)}</td>
                        <td>${update.email || 'gst@gopalanmall.com'}</td>
                        <td>${this.formatDate(update.update_date)}</td>
                        <td>${new Date(update.update_date).toLocaleString('default', { month: 'long' })}</td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="19" class="text-center py-4">
                            <i class="fas fa-inbox fa-2x mb-3 d-block"></i>
                            No data uploaded yet. Upload your first Excel file!
                        </td>
                    </tr>
                `;
                if (timestampEl) timestampEl.textContent = '';
            }
        } catch (error) {
            console.error('Error loading latest update:', error);
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="19" class="text-center text-danger py-4">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Failed to load latest update
                        </td>
                    </tr>
                `;
            }
        }
    }

    async updateQuickStats() {
        const todayEl = document.getElementById('todayUploads');
        const monthEl = document.getElementById('monthUploads');
        const activeEl = document.getElementById('activeMalls');
        const lastUploadEl = document.getElementById('lastUploadTime');
        
        try {
            const updates = await this.api.getDailyUpdates({ limit: 100 });
            
            // Yesterday's uploads
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();
            
            const yesterdayUploads = updates.filter(u => 
                u.update_date && new Date(u.update_date).toDateString() === yesterdayStr
            ).length;
            if (todayEl) todayEl.textContent = yesterdayUploads;
            
            // This month's uploads
            const thisMonth = new Date().getMonth();
            const thisYear = new Date().getFullYear();
            const monthUploads = updates.filter(u => {
                if (!u.update_date) return false;
                const date = new Date(u.update_date);
                return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
            }).length;
            if (monthEl) monthEl.textContent = monthUploads;
            
            // Active malls
            const activeMalls = [...new Set(updates.map(u => u.mall_name).filter(Boolean))].length;
            if (activeEl) activeEl.textContent = activeMalls || 0;
            
            // Last upload time
            if (updates.length > 0 && updates[0].update_date) {
                const lastUpload = new Date(updates[0].update_date);
                if (lastUploadEl) lastUploadEl.textContent = lastUpload.toLocaleDateString();
            }
            
        } catch (error) {
            console.error('Error updating stats:', error);
            if (todayEl) todayEl.textContent = '0';
            if (monthEl) monthEl.textContent = '0';
            if (activeEl) activeEl.textContent = '0';
            if (lastUploadEl) lastUploadEl.textContent = '-';
        }
    }

    setupFormSubmit() {
        const form = document.getElementById('dailyUpdateForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitForm();
            });
        }
    }

    async submitForm() {
        const form = document.getElementById('dailyUpdateForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Validate required fields
        if (!data.mall_id) {
            this.showNotification('Please select a mall', 'warning');
            return;
        }

        // Convert radio button value to boolean
        data.garbage_collected = data.garbage_collected === 'true';

        // Ensure date is yesterday or earlier
        const selectedDate = new Date(data.update_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate >= today) {
            this.showNotification('Cannot update today\'s data. Please select yesterday or an earlier date.', 'warning');
            return;
        }

        // Show loading
        this.showLoading(true);
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Saving...';
            submitBtn.disabled = true;
        }

        try {
            const result = await this.api.request('/daily/daily-updates', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (result.success) {
                this.showSuccessAnimation();
                this.showNotification('Daily update saved successfully!', 'success');
                
                form.reset();
                this.setDefaultDate();
                
                const garbageNo = document.getElementById('garbageNo');
                if (garbageNo) garbageNo.checked = true;
                
                await this.loadRecentUpdates();
                await this.loadLatestUpdate();
                await this.updateQuickStats();
            } else {
                this.showNotification(result.error || 'Failed to save', 'danger');
            }
        } catch (error) {
            console.error('Error saving daily update:', error);
            this.showNotification('Error saving data. Please try again.', 'danger');
        } finally {
            this.showLoading(false);
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save me-1"></i>Save Daily Update';
                submitBtn.disabled = false;
            }
        }
    }

    // ==================== EXCEL UPLOAD METHODS ====================

    showExcelUploadModal() {
        console.log('showExcelUploadModal called');
        
        const modalEl = document.getElementById('excelUploadModal');
        if (!modalEl) {
            console.error('Excel upload modal not found');
            this.showNotification('Upload modal not found', 'danger');
            return;
        }
        
        // Set default month to previous month
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        const monthInput = document.getElementById('excelMonth');
        if (monthInput) {
            const year = yesterday.getFullYear();
            const month = String(yesterday.getMonth() + 1).padStart(2, '0');
            monthInput.value = `${year}-${month}`;
        }
        
        // Reset file input
        const fileInput = document.getElementById('excelFile');
        if (fileInput) fileInput.value = '';
        
        // Reset progress bar
        const progressBar = document.getElementById('uploadProgress');
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.classList.remove('progress-bar-animated');
            progressBar.style.backgroundColor = '';
        }
        
        // Show modal
        try {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        } catch (e) {
            console.error('Bootstrap modal error:', e);
            this.showNotification('Failed to open modal', 'danger');
        }
    }

    async uploadExcelFile() {
        console.log('uploadExcelFile called');
        
        const mallSelect = document.getElementById('excelMallSelect');
        const monthInput = document.getElementById('excelMonth');
        const fileInput = document.getElementById('excelFile');
        const progressBar = document.getElementById('uploadProgress');
        
        const mallId = mallSelect?.value;
        const month = monthInput?.value;
        const file = fileInput?.files[0];
        
        console.log('Upload params:', { mallId, month, fileName: file?.name });
        
        if (!mallId) {
            this.showNotification('Please select a mall', 'warning');
            return;
        }
        
        if (!month) {
            this.showNotification('Please select month', 'warning');
            return;
        }
        
        if (!file) {
            this.showNotification('Please select an Excel file', 'warning');
            return;
        }
        
        const allowedTypes = ['.xlsx', '.xls', '.csv'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedTypes.includes(fileExt)) {
            this.showNotification('Please upload valid Excel or CSV file', 'warning');
            return;
        }
        
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.classList.add('progress-bar-animated');
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('mall_id', mallId);
        formData.append('month', month);
        
        try {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if (progressBar) progressBar.style.width = progress + '%';
                if (progress >= 90) clearInterval(interval);
            }, 200);
            
            const token = auth.getToken();
            console.log('Token exists:', !!token);
            
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            const url = `${this.api.baseURL}/upload/excel/daily-updates`;
            console.log('Uploading to:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            clearInterval(interval);
            console.log('Upload response status:', response.status);
            
            let result;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
            }
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP error ${response.status}`);
            }
            
            if (result.success) {
                if (progressBar) {
                    progressBar.style.width = '100%';
                    progressBar.classList.remove('progress-bar-animated');
                }
                
                this.showSuccessAnimation();
                this.showNotification(`✅ Successfully uploaded ${result.records_processed || 0} records`, 'success');
                
                try {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('excelUploadModal'));
                    if (modal) modal.hide();
                } catch (e) {
                    console.warn('Modal close error:', e);
                }
                
                if (fileInput) fileInput.value = '';
                
                setTimeout(() => {
                    if (progressBar) progressBar.style.width = '0%';
                }, 1000);
                
                await this.loadRecentUpdates();
                await this.loadLatestUpdate();
                await this.updateQuickStats();
            } else {
                throw new Error(result.error || 'Upload failed');
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            
            if (progressBar) {
                progressBar.classList.remove('progress-bar-animated');
                progressBar.style.backgroundColor = '#dc3545';
            }
            
            this.showNotification(error.message || 'Failed to upload file', 'danger');
            
            setTimeout(() => {
                if (progressBar) {
                    progressBar.style.width = '0%';
                    progressBar.style.backgroundColor = '';
                }
            }, 3000);
        }
    }

    downloadTemplate() {
        console.log('downloadTemplate called');
        
        try {
            const headers = ['Timestamp', 'Mall Name', 'Foot fall Count', 'Cinema Walk-In Count', 'Parking collection amount',
                 'Number of 2-Wheeler entry', 'Number of 4-wheeler entry', 'KEB usage (units)', 'DG Usage (Units)',
                 'Water consumption (KL)', 'Number of water Tanker purchased', 'STP treated water (KL)',
                 'Diesel consumption', 'Garbage collected', 'Number of work permit raised', 'Customer feedback count',
                 'Email Address', 'Date', 'Month'];
            
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            const year = yesterday.getFullYear();
            const month = String(yesterday.getMonth() + 1).padStart(2, '0');
            const day = String(yesterday.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const monthName = yesterday.toLocaleString('default', { month: 'long' });
            
            const sampleRow = [
                `${dateStr} 17:37:48`, 
                'Signature', 
                '28134', 
                '626', 
                '52658', 
                '1246', 
                '529', 
                '19425', 
                '665',
                '114.1', 
                '5', 
                '97.4', 
                '245', 
                'Yes', 
                '0', 
                '10', 
                'gst@gopalanmall.com', 
                dateStr, 
                monthName
            ];
            
            const templateData = [headers, sampleRow];
            
            const csv = templateData.map(row => 
                row.map(cell => {
                    if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
                        return `"${cell.replace(/"/g, '""')}"`;
                    }
                    return cell;
                }).join(',')
            ).join('\n');
            
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'daily_updates_template.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Template downloaded successfully', 'success');
            console.log('Template downloaded');
            
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('Failed to download template', 'danger');
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('show');
        }
        
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.classList.toggle('active');
        }
    }

    // ==================== UTILITY METHODS ====================

    showSuccessAnimation() {
        const animation = document.getElementById('successAnimation');
        if (animation) {
            animation.style.display = 'flex';
            setTimeout(() => {
                animation.style.display = 'none';
            }, 2000);
        }
    }

    showNotification(message, type = 'success') {
        const existingToasts = document.querySelectorAll('.notification-toast');
        existingToasts.forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `position-fixed top-0 end-0 m-3 alert alert-${type} shadow-lg notification-toast`;
        toast.style.zIndex = '9999';
        toast.style.minWidth = '300px';
        toast.style.fontFamily = 'Times New Roman';
        toast.style.animation = 'slideIn 0.3s ease-out';
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2 fa-lg"></i>
                <span class="flex-grow-1">${message}</span>
                <button type="button" class="btn-close ms-3" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
    }

    formatNumber(num) {
        if (num === undefined || num === null) return '0';
        return new Intl.NumberFormat('en-IN').format(num);
    }

    formatCurrency(num) {
        if (num === undefined || num === null) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(num);
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    }
}

// Global functions
window.viewUpdate = function(id) {
    window.location.href = `daily-update-detail.html?id=${id}`;
};

window.showExcelUploadModal = function() {
    console.log('Global showExcelUploadModal called');
    if (window.dailyUpdates) {
        window.dailyUpdates.showExcelUploadModal();
    } else {
        console.error('DailyUpdates instance not found');
        alert('System is initializing. Please try again in 2 seconds.');
        setTimeout(() => {
            if (window.dailyUpdates) {
                window.dailyUpdates.showExcelUploadModal();
            }
        }, 2000);
    }
};

window.uploadExcelFile = function() {
    console.log('Global uploadExcelFile called');
    if (window.dailyUpdates) {
        window.dailyUpdates.uploadExcelFile();
    } else {
        console.error('DailyUpdates instance not found');
        alert('System is initializing. Please try again in 2 seconds.');
    }
};

window.downloadTemplate = function() {
    console.log('Global downloadTemplate called');
    if (window.dailyUpdates) {
        window.dailyUpdates.downloadTemplate();
    } else {
        console.error('DailyUpdates instance not found');
        // Fallback download
        try {
            const headers = ['Timestamp', 'Mall Name', 'Foot fall Count', 'Cinema Walk-In Count', 'Parking collection amount',
                 'Number of 2-Wheeler entry', 'Number of 4-wheeler entry', 'KEB usage (units)', 'DG Usage (Units)',
                 'Water consumption (KL)', 'Number of water Tanker purchased', 'STP treated water (KL)',
                 'Diesel consumption', 'Garbage collected', 'Number of work permit raised', 'Customer feedback count',
                 'Email Address', 'Date', 'Month'];
            
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];
            const monthName = yesterday.toLocaleString('default', { month: 'long' });
            
            const sampleRow = [dateStr + ' 17:37:48', 'Signature', '28134', '626', '52658', '1246', '529', '19425', '665',
                 '114.1', '5', '97.4', '245', 'Yes', '0', '10', 'gst@gopalanmall.com', dateStr, monthName];
            
            const csv = [headers, sampleRow].map(row => row.join(',')).join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'daily_updates_template.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            alert('Template downloaded successfully!');
        } catch (e) {
            alert('Failed to download template');
        }
    }
};

window.toggleSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('show');
    }
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
        overlay.classList.toggle('active');
    }
};

// Mobile menu toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Fix duplicate API declaration - check if already defined
    if (window.API && window.apiInitialized) {
        console.log('API already initialized, skipping duplicate');
    }
    
    const menuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('active');
            this.classList.toggle('active');
        });
        
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('show');
            overlay.classList.remove('active');
            if (menuToggle) menuToggle.classList.remove('active');
        });
        
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('show');
                overlay.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
            }
        });
    }

    const dateInput = document.getElementById('updateDate');
    if (dateInput) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const maxDate = yesterday.toISOString().split('T')[0];
        dateInput.max = maxDate;
    }

    const dateField = document.getElementById('updateDate');
    const monthField = document.getElementById('month');
    
    if (dateField && monthField) {
        dateField.addEventListener('change', function() {
            try {
                const date = new Date(this.value);
                const month = date.toLocaleString('default', { month: 'long' });
                monthField.value = month;
            } catch (e) {
                console.warn('Error updating month:', e);
            }
        });
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        try {
            if (!window.dailyUpdates) {
                window.dailyUpdates = new DailyUpdates();
                console.log('DailyUpdates initialized successfully');
            }
        } catch (error) {
            console.error('Failed to initialize DailyUpdates:', error);
        }
    }, 500);
});

// Global logout
window.logout = function() {
    if (auth && typeof auth.logout === 'function') {
        auth.logout();
    } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
};