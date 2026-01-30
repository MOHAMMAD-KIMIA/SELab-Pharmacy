console.log(" Doctor dashboard script loaded");

async function loadDoctorMedicines() {
    console.log("Loading medicines...");
    
    try {
        const response = await fetch('/api/medicines/', {
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const medicines = await response.json();
        console.log('Medicines:', medicines);
        
        const tbody = document.getElementById('doctor-medicine-table');
        if (tbody) {
            if (medicines.length > 0) {
                tbody.innerHTML = medicines.map(med => `
                    <tr>
                        <td>${med.name || ''}</td>
                        <td>${med.category || ''}</td>
                        <td>${med.stock || 0}</td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="3" style="text-align:center;padding:1rem">
                            No medicines available
                        </td>
                    </tr>
                `;
            }
        }
        
        const select = document.getElementById('doctor-medicine-select');
        if (select) {
            if (medicines.length > 0) {
                select.innerHTML = `
                    <option value="">Select a medicine...</option>
                    ${medicines.map(med => `
                        <option value="${med.id}">
                            ${med.name} ${med.category ? `(${med.category})` : ''} - Stock: ${med.stock || 0}
                        </option>
                    `).join('')}
                `;
            } else {
                select.innerHTML = `<option value="">No medicines available</option>`;
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        const tbody = document.getElementById('doctor-medicine-table');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align:center;padding:1rem;color:red">
                        Error loading medicines
                    </td>
                </tr>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Doctor dashboard page loaded');
    
    loadDoctorMedicines();
    
    const form = document.getElementById('doctor-prescription-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Prescription functionality coming soon!');
        });
    }
});

window.loadDoctorMedicines = loadDoctorMedicines;