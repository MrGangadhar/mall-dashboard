// Utility functions
const Utils = {
    formatNumber: (num) => {
        if (num === undefined || num === null) return '0';
        return new Intl.NumberFormat('en-IN').format(num);
    },

    formatCurrency: (num) => {
        if (num === undefined || num === null) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(num);
    },

    formatDate: (dateString) => {
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

    showNotification: (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `position-fixed top-0 end-0 m-3 alert alert-${type}`;
        toast.style.zIndex = '9999';
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

    showLoading: (show) => {
        let spinner = document.getElementById('globalSpinner');
        if (show && !spinner) {
            spinner = document.createElement('div');
            spinner.id = 'globalSpinner';
            spinner.className = 'position-fixed top-50 start-50 translate-middle';
            spinner.style.zIndex = '99999';
            spinner.innerHTML = '<div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div>';
            document.body.appendChild(spinner);
        } else if (!show && spinner) {
            spinner.remove();
        }
    }
};

window.Utils = Utils;