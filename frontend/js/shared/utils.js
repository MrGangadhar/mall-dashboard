// Shared Utility Functions (lightweight version for sub-dashboards)
// NOTE: This file extends/overrides the Utils object from js/utils.js
// Both files export to window.Utils — this one provides simpler versions

(function() {
    // Only define if not already defined by the main utils.js
    if (window.Utils && window.Utils.formatNumber) {
        // Main utils.js already loaded — just ensure showNotification and showLoading exist
        if (!window.Utils.showNotification) {
            window.Utils.showNotification = function(message, type) {
                const toast = document.createElement('div');
                toast.className = `position-fixed top-0 end-0 m-3 alert alert-${type || 'success'} shadow-lg`;
                toast.style.zIndex = '9999';
                toast.style.fontFamily = "'Inter', 'Rubik', sans-serif";
                toast.style.animation = 'slideInRight 0.4s ease-out';
                toast.innerHTML = `
                    <div class="d-flex align-items-center">
                        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
                        <span>${message}</span>
                        <button type="button" class="btn-close ms-3" onclick="this.parentElement.parentElement.remove()"></button>
                    </div>
                `;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 5000);
            };
        }
        if (!window.Utils.showLoading) {
            window.Utils.showLoading = function(show) {
                const spinner = document.getElementById('loadingSpinner');
                if (spinner) {
                    spinner.style.display = show ? 'flex' : 'none';
                }
            };
        }
        return;
    }

    // If main utils.js hasn't loaded, provide full implementation
    window.Utils = {
        formatNumber: function(num) {
            if (num === undefined || num === null || isNaN(num)) return '0';
            return new Intl.NumberFormat('en-IN').format(num);
        },

        formatCurrency: function(num) {
            if (num === undefined || num === null || isNaN(num)) return '₹0';
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(num);
        },

        formatDate: function(dateString) {
            if (!dateString) return 'N/A';
            try {
                return new Date(dateString).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            } catch {
                return dateString;
            }
        },

        showNotification: function(message, type) {
            const toast = document.createElement('div');
            toast.className = `position-fixed top-0 end-0 m-3 alert alert-${type || 'success'} shadow-lg`;
            toast.style.zIndex = '9999';
            toast.style.fontFamily = "'Inter', 'Rubik', sans-serif";
            toast.style.animation = 'slideInRight 0.4s ease-out';
            toast.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
                    <span>${message}</span>
                    <button type="button" class="btn-close ms-3" onclick="this.parentElement.parentElement.remove()"></button>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);
        },

        showLoading: function(show) {
            const spinner = document.getElementById('loadingSpinner');
            if (spinner) {
                spinner.style.display = show ? 'flex' : 'none';
            }
        }
    };
})();