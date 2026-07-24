class TableBuilder {
    static createDataTable(tableId, data, columns) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const thead = table.querySelector('thead') || table.createTHead();
        const tbody = table.querySelector('tbody') || table.createTBody();

        // Create header
        const headerRow = thead.insertRow();
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.label;
            headerRow.appendChild(th);
        });

        // Create body
        data.forEach(row => {
            const tr = tbody.insertRow();
            columns.forEach(col => {
                const td = tr.insertCell();
                td.textContent = row[col.field] || '-';
                if (col.className) td.className = col.className;
            });
        });
    }

    static updateTable(tableId, data) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        data.forEach(row => {
            const tr = tbody.insertRow();
            Object.values(row).forEach(value => {
                const td = tr.insertCell();
                td.textContent = value || '-';
            });
        });
    }
}

window.TableBuilder = TableBuilder;