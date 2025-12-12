let currentUser = null;
let prescribedMedicines = [];
let currentPrescription = null;

// Initialize Data
function initializeData() {
    if (!localStorage.getItem('users')) {
        const users = [
            { email: 'admin@gmail.com', password: 'admin123', name: 'Admin User', role: 'pharmacist', nationalId: null },
            { email: 'doctor@gmail.com', password: 'doctor123', name: 'Dr. Smith', role: 'doctor', nationalId: null },
            { email: 'patient@gmail.com', password: 'patient123', name: 'John Patient', role: 'patient', nationalId: '123456' }
        ];
        localStorage.setItem('users', JSON.stringify(users));
    }

    if (!localStorage.getItem('medicines')) {
        const medicines = [
            { id: '1', name: 'Amoxicillin 500mg', category: 'Antibiotic', manufacturer: 'PharmaCorp', batchNumber: 'AMX-2024-001', expiryDate: '2025-12-31', price: 15.99, quantity: 150 },
            { id: '2', name: 'Ibuprofen 200mg', category: 'Pain Relief', manufacturer: 'MediGen', batchNumber: 'IBU-2024-002', expiryDate: '2025-10-15', price: 8.50, quantity: 8 },
            { id: '3', name: 'Paracetamol 500mg', category: 'Pain Relief', manufacturer: 'HealthPlus', batchNumber: 'PAR-2024-003', expiryDate: '2024-11-01', price: 6.99, quantity: 200 }
        ];
        localStorage.setItem('medicines', JSON.stringify(medicines));
    }

    if (!localStorage.getItem('prescriptions')) localStorage.setItem('prescriptions', JSON.stringify([]));
    if (!localStorage.getItem('orders')) localStorage.setItem('orders', JSON.stringify([]));
}

initializeData();

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

function showAuth() {
    showPage('auth-page');
}

function switchAuthTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    if (tab === 'signin') {
        document.getElementById('signin-content').classList.remove('hidden');
        document.getElementById('signup-content').classList.add('hidden');
    } else {
        document.getElementById('signin-content').classList.add('hidden');
        document.getElementById('signup-content').classList.remove('hidden');
    }
}

function toggleNationalId() {
    const role = document.getElementById('signup-role').value;
    document.getElementById('national-id-group').style.display = role === 'patient' ? 'block' : 'none';
}

// Authentication
async function handleSignIn(event) {
    event.preventDefault();

    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;

    const username = email.split('@')[0]; 

    try {
        const response = await fetch("http://127.0.0.1:8000/api/login/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Login failed");
            return;
        }

        currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        alert("Login successful!");

        if (currentUser.role === 'pharmacist') {
            showPage('pharmacist-dashboard');
            loadPharmacistDashboard();
        } else if (currentUser.role === 'doctor') {
            showPage('doctor-dashboard');
            loadDoctorDashboard();
        } else if (currentUser.role === 'patient') {
            showPage('patient-dashboard');
            loadPatientDashboard();
        }

    } catch (error) {
        alert("Network error");
    }
}

async function handleSignUp(event) {
    event.preventDefault();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.getElementById('signup-role').value;
    const nationalId = document.getElementById('signup-national-id').value;

    const username = email.split('@')[0]; 

    const data = {
        username: username,
        email: email,
        password: password,
        role: role,
        national_id: nationalId
    };

    try {
        const response = await fetch("http://127.0.0.1:8000/api/signup/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert("Account created successfully!");
            switchAuthTab('signin');
        } else {
            alert("Error: " + JSON.stringify(result));
        }

    } catch (error) {
        alert("Network Error");
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showPage('landing-page');
}

// Utility Functions
function generateId() {
    return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
}

function generatePrescriptionNumber() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RX-${date}-${random}`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

// Pharmacist Dashboard
function loadPharmacistDashboard() {
    document.getElementById('pharmacist-name').textContent = currentUser.name;
    loadMedicines();
    loadUsers();
    loadStats();
}

async function loadMedicines() {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/medicines/");
        const medicines = await response.json();

        const tbody = document.getElementById('medicines-table');
        
        if (!medicines.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem">No medicines found</td></tr>`;
            return;
        }

        tbody.innerHTML = medicines.map(med => `
            <tr>
                <td>${med.name}</td>
                <td>${med.category_name}</td>
                <td>${med.batch_number}</td>
                <td>${new Date(med.expiry_date).toLocaleDateString()}</td>
                <td>$${med.price}</td>
                <td>${med.stock}</td>
                <td>
                    <button onclick="editMedicine(${med.id})" class="btn" style="font-size:12px">Edit</button>
                    <button onclick="deleteMedicine(${med.id})" class="btn" style="background:#ef4444; color:white; font-size:12px">Delete</button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        alert("Error loading medicines");
    }
}

function loadUsers() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const tbody = document.getElementById('users-table');
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="badge badge-blue">${user.role}</span></td>
            <td>${user.nationalId || 'N/A'}</td>
        </tr>
    `).join('');
}

function loadStats() {
    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const lowStockCount = medicines.filter(m => m.quantity < 10).length;

    document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('total-orders').textContent = orders.length;
    document.getElementById('total-medicines').textContent = medicines.length;
    document.getElementById('low-stock-count').textContent = lowStockCount;
}

function showAddMedicine() {
    document.getElementById('modal-title').textContent = 'Add Medicine';
    document.getElementById('medicine-id').value = '';
    document.getElementById('medicine-name').value = '';
    document.getElementById('medicine-category').value = '';
    document.getElementById('medicine-manufacturer').value = '';
    document.getElementById('medicine-batch').value = '';
    document.getElementById('medicine-expiry').value = '';
    document.getElementById('medicine-price').value = '';
    document.getElementById('medicine-quantity').value = '';
    document.getElementById('medicine-modal').classList.add('active');
}

function closeMedicineModal() {
    document.getElementById('medicine-modal').classList.remove('active');
}

async function saveMedicine(event) {
    event.preventDefault();

    const id = document.getElementById('medicine-id').value;

    const data = {
        name: document.getElementById('medicine-name').value,
        category: 1, 
        manufacturer: document.getElementById('medicine-manufacturer').value,
        batch_number: document.getElementById('medicine-batch').value,
        expiry_date: document.getElementById('medicine-expiry').value,
        price: document.getElementById('medicine-price').value,
        stock: document.getElementById('medicine-quantity').value
    };

    let url = "http://127.0.0.1:8000/api/medicines/";
    let method = "POST";

    if (id) {
        url = `http://127.0.0.1:8000/api/medicines/${id}/`;
        method = "PUT";
    }

    const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        alert("Saved successfully!");
        closeMedicineModal();
        loadMedicines();
    } else {
        alert("Save failed!");
    }
}

async function editMedicine(id) {
    const res = await fetch(`http://127.0.0.1:8000/api/medicines/${id}/`);
    const med = await res.json();

    document.getElementById('medicine-id').value = med.id;
    document.getElementById('medicine-name').value = med.name;
    document.getElementById('medicine-category').value = med.category_name;
    document.getElementById('medicine-manufacturer').value = med.manufacturer;
    document.getElementById('medicine-batch').value = med.batch_number;
    document.getElementById('medicine-expiry').value = med.expiry_date;
    document.getElementById('medicine-price').value = med.price;
    document.getElementById('medicine-quantity').value = med.stock;

    document.getElementById('modal-title').textContent = "Edit Medicine";
    document.getElementById('medicine-modal').classList.add('active');
}


async function deleteMedicine(id) {
    if (!confirm("Are you sure?")) return;

    const response = await fetch(`http://127.0.0.1:8000/api/medicines/${id}/`, {
        method: "DELETE"
    });

    if (response.ok) {
        alert("Deleted!");
        loadMedicines();
    } else {
        alert("Delete failed!");
    }
}

// Doctor Dashboard
function loadDoctorDashboard() {
    document.getElementById('doctor-name').textContent = currentUser.name;
    loadDoctorMedicines();
}

function loadDoctorMedicines() {
    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]').filter(m => m.quantity > 0);
    
    const select = document.getElementById('selected-medicine');
    select.innerHTML = '<option value="">Choose a medicine</option>' + 
        medicines.map(med => `<option value="${med.id}">${med.name} - Stock: ${med.quantity}</option>`).join('');
    
    const tbody = document.getElementById('doctor-medicines-table');
    if (medicines.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #6b7280;">No medicines found</td></tr>';
        return;
    }

    tbody.innerHTML = medicines.map(med => `
        <tr>
            <td>
                <div>${med.name}</div>
                <div style="font-size: 0.75rem; color: #6b7280;">${med.manufacturer}</div>
            </td>
            <td>${med.category}</td>
            <td><span class="badge ${med.quantity < 10 ? 'badge-red' : 'badge-blue'}">${med.quantity}</span></td>
        </tr>
    `).join('');
}

function searchMedicines() {
    const query = document.getElementById('search-query').value.toLowerCase();
    let medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    
    if (query) {
        medicines = medicines.filter(m => 
            m.name.toLowerCase().includes(query) || 
            m.manufacturer.toLowerCase().includes(query) ||
            m.category.toLowerCase().includes(query)
        );
    }
    
    const tbody = document.getElementById('doctor-medicines-table');
    if (medicines.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #6b7280;">No medicines found</td></tr>';
        return;
    }

    tbody.innerHTML = medicines.map(med => `
        <tr>
            <td>
                <div>${med.name}</div>
                <div style="font-size: 0.75rem; color: #6b7280;">${med.manufacturer}</div>
            </td>
            <td>${med.category}</td>
            <td><span class="badge ${med.quantity < 10 ? 'badge-red' : 'badge-blue'}">${med.quantity}</span></td>
        </tr>
    `).join('');
}

function addMedicineToPrescription() {
    const medicineId = document.getElementById('selected-medicine').value;
    const dosage = document.getElementById('dosage').value;
    const duration = document.getElementById('duration').value;
    const quantity = parseInt(document.getElementById('quantity').value);

    if (!medicineId || !dosage || !duration || !quantity) {
        alert('Please fill all fields');
        return;
    }

    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    const medicine = medicines.find(m => m.id === medicineId);

    if (!medicine) {
        alert('Medicine not found');
        return;
    }

    if (quantity > medicine.quantity) {
        alert(`Only ${medicine.quantity} units available in stock`);
        return;
    }

    prescribedMedicines.push({
        medicineId: medicine.id,
        name: medicine.name,
        dosage,
        duration,
        quantity
    });

    updatePrescribedMedicinesList();
    
    document.getElementById('selected-medicine').value = '';
    document.getElementById('dosage').value = '';
    document.getElementById('duration').value = '';
    document.getElementById('quantity').value = '1';
}

function updatePrescribedMedicinesList() {
    const listDiv = document.getElementById('prescribed-medicines-list');
    const medicinesDiv = document.getElementById('prescribed-medicines');
    
    if (prescribedMedicines.length === 0) {
        listDiv.classList.add('hidden');
        return;
    }

    listDiv.classList.remove('hidden');
    medicinesDiv.innerHTML = prescribedMedicines.map((med, index) => `
        <div style="display: flex; justify-between; padding: 0.75rem; background: #f9fafb; border-radius: 0.5rem; margin-bottom: 0.5rem;">
            <div>
                <div style="font-weight: 500;">${med.name}</div>
                <div style="font-size: 0.75rem; color: #6b7280;">${med.dosage} - ${med.duration} - Qty: ${med.quantity}</div>
            </div>
            <button onclick="removeMedicine(${index})" style="border: none; background: none; cursor: pointer; color: #ef4444;">Remove</button>
        </div>
    `).join('');
}

function removeMedicine(index) {
    prescribedMedicines.splice(index, 1);
    updatePrescribedMedicinesList();
}

async function createPrescription(event) {
    event.preventDefault();

    const nationalId = document.getElementById('patient-national-id').value;

    if (!prescribedMedicines.length) {
        alert("Please add at least one medicine");
        return;
    }

    try {
        const patient = await findPatientByNationalId(nationalId);

        const items = prescribedMedicines.map(m => ({
            medicine: m.medicineId,
            dosage: m.dosage,
            duration: m.duration,
            quantity: m.quantity
        }));

        const body = {
            doctor: currentUser.id,
            patient: patient.id,
            items: items
        };

        const response = await fetch(
            "http://127.0.0.1:8000/api/prescriptions/",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            }
        );

        if (response.ok) {
            alert("Prescription created successfully!");
            prescribedMedicines = [];
            updatePrescribedMedicinesList();
            document.getElementById('patient-national-id').value = "";
        } else {
            alert("Error creating prescription");
        }

    } catch (err) {
        alert(err.message);
    }
}

// Patient Dashboard
function loadPatientDashboard() {
    document.getElementById('patient-name').textContent = currentUser.name;
    loadPrescriptionHistory();
    loadOrderHistory();
}

function searchPrescription(event) {
    event.preventDefault();
    
    const prescriptionNumber = document.getElementById('prescription-number').value;
    const prescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
    const prescription = prescriptions.find(p => p.prescriptionNumber === prescriptionNumber);

    if (!prescription) {
        alert('Prescription not found');
        document.getElementById('prescription-details').classList.add('hidden');
        return;
    }

    if (prescription.patientId !== currentUser.email) {
        alert('This prescription does not belong to you');
        document.getElementById('prescription-details').classList.add('hidden');
        return;
    }

    currentPrescription = prescription;
    displayPrescription(prescription);
}

function updateOrderTotal() {
    if (!currentPrescription) return;

    const checkboxes = document.querySelectorAll('#prescription-medicines input[type="checkbox"]');
    let newTotal = 0;
    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    
    checkboxes.forEach(checkbox => {
        const index = parseInt(checkbox.dataset.index);
        const prescribedMed = currentPrescription.medicines[index];
        const medicine = medicines.find(m => m.id === prescribedMed.medicineId);
        
        if (checkbox.checked) {
            if (medicine) {
                newTotal += medicine.price * prescribedMed.quantity;
            }
        }
    });

    document.getElementById('order-total-amount').textContent = `$${newTotal.toFixed(2)}`;
}

function displayPrescription(prescription) {
    const medicines = JSON.parse(localStorage.getItem('medicines') || '[]');
    
    document.getElementById('doctor-name-display').textContent = prescription.doctorName;
    document.getElementById('prescription-date').textContent = formatDate(prescription.createdAt);
    document.getElementById('prescription-num-display').textContent = prescription.prescriptionNumber;

    const tbody = document.getElementById('prescription-medicines');
    
    const rows = prescription.medicines.map((med, index) => {
        const medicine = medicines.find(m => m.id === med.medicineId);
        const price = medicine ? medicine.price : 0;
        const total = price * med.quantity;
        
        med.isChecked = true;

        return `
            <tr data-index="${index}" data-price="${price}" data-quantity="${med.quantity}">
                <td><input type="checkbox" checked onchange="updateOrderTotal()" data-index="${index}"></td>
                <td>${med.name}</td>
                <td>${med.dosage}</td>
                <td>${med.duration}</td>
                <td>${med.quantity}</td>
                <td>$${price.toFixed(2)}</td>
                <td class="item-total">$${total.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows + `
        <tr style="font-weight: 700;">
            <td colspan="6">Total Amount</td>
            <td id="order-total-amount">$0.00</td>
        </tr>
    `;

    document.getElementById('prescription-details').classList.remove('hidden');
    updateOrderTotal();
}

function placeOrder() {
    if (!currentPrescription) return;

    const checkboxes = document.querySelectorAll('#prescription-medicines input[type="checkbox"]');
    const selectedMedicines = [];
    const medicinesInStock = JSON.parse(localStorage.getItem('medicines') || '[]');
    let totalAmount = 0;
    let canPlaceOrder = true;

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const index = parseInt(checkbox.dataset.index);
            const prescribedMed = currentPrescription.medicines[index];
            const stockMed = medicinesInStock.find(m => m.id === prescribedMed.medicineId);
            
            if (!stockMed || stockMed.quantity < prescribedMed.quantity) {
                alert(`Insufficient stock for ${prescribedMed.name}`);
                canPlaceOrder = false;
                return; 
            }

            selectedMedicines.push(prescribedMed);
            totalAmount += stockMed.price * prescribedMed.quantity;
        }
    });
    
   if (!selectedMedicines.length) {
        alert('Please select at least one medicine to place an order.');
        return;
    }

    if (!canPlaceOrder) return;

    selectedMedicines.forEach(med => {
        const medicine = medicinesInStock.find(m => m.id === med.medicineId);
        if (medicine) medicine.quantity -= med.quantity;
    });
    localStorage.setItem('medicines', JSON.stringify(medicinesInStock));

    const order = {
        id: generateId(),
        prescriptionId: currentPrescription.id,
        prescriptionNumber: currentPrescription.prescriptionNumber,
        patientId: currentUser.email,
        patientName: currentUser.name,
        totalAmount,
        medicines: selectedMedicines, 
        createdAt: new Date().toISOString(),
        status: 'completed'
    };

    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));

    alert(`Order placed successfully for $${totalAmount.toFixed(2)}!`);
    
    document.getElementById('prescription-number').value = '';
    document.getElementById('prescription-details').classList.add('hidden');
    currentPrescription = null;
    loadOrderHistory();

    if (currentUser && currentUser.role === 'pharmacist') loadPharmacistDashboard();
}

async function loadPrescriptionHistory() {
    const res = await fetch(
        `http://127.0.0.1:8000/api/patients/${currentUser.id}/prescriptions/`
    );

    const prescriptions = await res.json();
    const container = document.getElementById('prescription-history-list');

    if (!prescriptions.length) {
        container.innerHTML = "<p>No prescriptions found</p>";
        return;
    }

    container.innerHTML = prescriptions.map(p => `
        <div class="card">
            <h3>${p.prescription_number}</h3>
            <p>Doctor: ${p.doctor_name}</p>
            <p>Date: ${new Date(p.created_at).toLocaleDateString()}</p>
            ${p.items.map(i => `
                <div>
                    ${i.medicine_name} - ${i.dosage} - Qty: ${i.quantity}
                </div>
            `).join("")}
        </div>
    `).join("");
}

function loadOrderHistory() {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]').filter(o => o.patientId === currentUser.email);
    const container = document.getElementById('order-history-list');

    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No orders found</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="card" style="margin-bottom: 1rem;">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h3 style="font-weight: 700;">Order #${order.id.slice(0, 8)}</h3>
                    <p style="font-size: 0.875rem; color: #6b7280;">${formatDate(order.createdAt)}</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.125rem; font-weight: 700;">$${order.totalAmount.toFixed(2)}</div>
                    <span class="badge badge-green">${order.status}</span>
                </div>
            </div>
            ${order.medicines.map(med => `
                <div style="display: flex; justify-between; padding: 0.5rem; background: #f9fafb; border-radius: 0.5rem; margin-bottom: 0.5rem;">
                    <span>${med.name}</span>
                    <span style="font-size: 0.875rem; color: #6b7280;">Qty: ${med.quantity}</span>
                </div>
            `).join('')}
        </div>
    `).join('');
}

const storedUser = localStorage.getItem('currentUser');
if (storedUser) {
    currentUser = JSON.parse(storedUser);
    switch(currentUser.role) {
        case 'pharmacist':
            showPage('pharmacist-dashboard');
            loadPharmacistDashboard();
            break;
        case 'doctor':
            showPage('doctor-dashboard');
            loadDoctorDashboard();
            break;
        case 'patient':
            showPage('patient-dashboard');
            loadPatientDashboard();
            break;
    }
}