"use strict";

console.log(" Loading Pharmacist module...");

const Pharmacist = {
    medicineCache: [],

    async loadMedicines() {
        console.log(" Loading medicines for pharmacist dashboard...");

        const tbody = Utils.$("medicines-table");
        if (!tbody) return;

        try {
            const { ok, status, data } = await Utils.apiRequest("/api/medicines/");
            if (!ok) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center;padding:1rem">
                            Failed to load medicines
                        </td>
                    </tr>
                `;
                return;
            }

            this.medicineCache = Utils.normalizeList(data);

            if (!this.medicineCache.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center;padding:1rem">
                            No medicines found
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = this.medicineCache.map((m) => this.createMedicineRow(m)).join("");
            
            this.updateStats();

        } catch (error) {
            console.error("Error loading medicines:", error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;padding:1rem">
                        Error loading medicines
                    </td>
                </tr>
            `;
        }
    },

    createMedicineRow(medicine) {
        const price = Number(medicine.price ?? 0);
        const stock = medicine.stock ?? 0;
        
        return `
            <tr>
                <td>${medicine.name ?? ""}</td>
                <td>${medicine.category ?? ""}</td>
                <td>${medicine.batch_number ?? medicine.batch ?? ""}</td>
                <td>${medicine.expiry_date ?? medicine.expiry ?? ""}</td>
                <td>$${Number.isFinite(price) ? price.toFixed(2) : "0.00"}</td>
                <td>${stock}</td>
                <td>
                    <button class="btn btn-outline" type="button" onclick="Pharmacist.editMedicine(${medicine.id})">
                        Edit
                    </button>
                    <button class="btn btn-outline" type="button" onclick="Pharmacist.deleteMedicine(${medicine.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    },

    editMedicine(id) {
        const medicine = this.medicineCache.find((x) => String(x.id) === String(id));
        if (!medicine) return;

        Utils.$("medicine-id").value = medicine.id ?? "";
        Utils.$("medicine-name").value = medicine.name ?? "";
        Utils.$("medicine-category").value = medicine.category ?? "";
        Utils.$("medicine-batch").value = medicine.batch_number ?? medicine.batch ?? "";
        Utils.$("medicine-expiry").value = medicine.expiry_date ?? medicine.expiry ?? "";
        Utils.$("medicine-price").value = medicine.price ?? "";
        Utils.$("medicine-stock").value = medicine.stock ?? "";
        Utils.$("medicine-notes").value = medicine.notes ?? "";

        Utils.$("medicine-modal-title").textContent = "Edit Medicine";
        Utils.$("medicine-save-btn").textContent = "Update";

        this.showMedicineModal();
    },

    async deleteMedicine(id) {
        if (!confirm("Delete this medicine?")) return;

        try {
            const { ok, status, data } = await Utils.apiRequest(`/api/medicines/${id}/`, {
                method: "DELETE",
            });

            if (!ok) {
                Utils.showError("Delete failed", status, data);
                return;
            }

            await this.loadMedicines();
        } catch (error) {
            console.error("Error deleting medicine:", error);
            alert("Error deleting medicine");
        }
    },

    showMedicineModal() {
        const modal = Utils.$("medicine-modal");
        if (!modal) return;

        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        setTimeout(() => Utils.$("medicine-name")?.focus(), 0);
    },

    closeMedicineModal() {
        const modal = Utils.$("medicine-modal");
        if (!modal) return;
        
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
    },

    async saveMedicine(e) {
        e.preventDefault();

        const id = (Utils.$("medicine-id")?.value || "").trim();
        const name = (Utils.$("medicine-name")?.value || "").trim();
        const category = (Utils.$("medicine-category")?.value || "").trim();
        const batch = (Utils.$("medicine-batch")?.value || "").trim();
        const expiry = (Utils.$("medicine-expiry")?.value || "").trim();
        const price = (Utils.$("medicine-price")?.value || "").trim();
        const stock = (Utils.$("medicine-stock")?.value || "").trim();
        const notes = (Utils.$("medicine-notes")?.value || "").trim();

        if (!name) {
            alert("Medicine name is required");
            return;
        }

        if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
            alert("Expiry must be YYYY-MM-DD");
            return;
        }

        const payload = {
            name,
            category,
            batch_number: batch,
            expiry_date: expiry,
            price: price ? Number(price) : 0,
            stock: stock ? Number(stock) : 0,
            notes,
        };

        const method = id ? "PUT" : "POST";
        const url = id ? `/api/medicines/${id}/` : "/api/medicines/";

        try {
            const { ok, status, data } = await Utils.apiRequest(url, { method, body: payload });
            if (!ok) {
                Utils.showError("Save failed", status, data);
                return;
            }

            this.closeMedicineModal();
            await this.loadMedicines();
        } catch (error) {
            console.error("Error saving medicine:", error);
            alert("Error saving medicine");
        }
    },

    updateStats() {
        const totalRevenue = this.medicineCache.reduce((sum, med) => {
            return sum + (Number(med.price || 0) * Number(med.stock || 0));
        }, 0);
        
        const lowStockCount = this.medicineCache.filter(med => Number(med.stock || 0) < 10).length;

        if (Utils.$("total-revenue")) {
            Utils.$("total-revenue").textContent = `$${totalRevenue.toFixed(2)}`;
        }
        
        if (Utils.$("total-medicines")) {
            Utils.$("total-medicines").textContent = this.medicineCache.length;
        }
        
        if (Utils.$("low-stock-count")) {
            Utils.$("low-stock-count").textContent = lowStockCount;
        }
    },

    init() {
        console.log(" Initializing Pharmacist Dashboard...");

        const form = Utils.$("medicine-form");
        if (form && !form.dataset.bound) {
            form.addEventListener("submit", (e) => this.saveMedicine(e));
            form.dataset.bound = "1";
        }

        this.loadMedicines();

        const addBtn = document.querySelector('button[onclick*="showAddMedicine"]');
        if (addBtn) {
            addBtn.onclick = () => {
                Utils.$("medicine-modal-title").textContent = "Add Medicine";
                Utils.$("medicine-save-btn").textContent = "Save";
                Utils.$("medicine-form").reset();
                Utils.$("medicine-id").value = "";
                this.showMedicineModal();
            };
        }

        console.log(" Pharmacist Dashboard initialized");
    }
};

window.Pharmacist = Pharmacist;
console.log(" Pharmacist module loaded");

async function loadUsers() {
    console.log(" Loading users...");
    
    const tbody = document.getElementById('users-table');
    if (!tbody) return;
    
    try {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;padding:1rem">
                    Loading users...
                </td>
            </tr>
        `;
        
        const { ok, status, data } = await Utils.apiRequest("/api/users/");
        
        if (!ok) {
            throw new Error(data?.error || `Failed to load users (${status})`);
        }
        
        const users = data;
        console.log(` Loaded ${users.length} users`);
        
        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center;padding:1rem;color:#6b7280">
                        No users found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <strong>${user.first_name || user.username}</strong><br>
                    <small style="color:#6b7280">${user.username}</small>
                </td>
                <td>${user.email || "—"}</td>
                <td>
                    <span class="badge ${
                        user.role === 'pharmacist' ? 'badge-blue' : 
                        user.role === 'doctor' ? 'badge-green' : 
                        'badge-gray'
                    }">
                        ${user.role}
                    </span>
                </td>
                <td>
                    ${user.role === 'patient' ? user.national_id || "—" : user.practice_code || "—"}
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error("❌ Error loading users:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;padding:1rem;color:#dc2626">
                    Error loading users: ${error.message}
                </td>
            </tr>
        `;
    }
}

async function loadAllOrders() {
    console.log("🔄 loadAllOrders() called - USING NEW ENDPOINT");
    
    const tbody = document.getElementById('all-orders');
    if (!tbody) {
        console.error("❌ Table body (#all-orders) not found!");
        return;
    }
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align:center;padding:2rem">
                <div class="loading-spinner"></div>
                <div>Loading orders from database...</div>
            </td>
        </tr>
    `;
    
    try {
        console.log(" Fetching from NEW endpoint: /api/pharmacist/all-orders/");
        
        const response = await fetch('/api/pharmacist/all-orders/', {
            method: 'GET',
            credentials: 'same-origin', 
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        console.log(`Response status: ${response.status}, OK: ${response.ok}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(" Response error:", errorText);
            throw new Error(`HTTP ${response.status}`);
        }
        
        const orders = await response.json();
        console.log(` SUCCESS: Received ${orders.length} orders from new API`, orders);
        
        orders.forEach((order, i) => {
            console.log(` [${i+1}] ${order.order_id} - ${order.patient_name} - $${order.total_amount} - ${order.status}`);
        });
        
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:2rem;color:#dc2626">
                        <div style="font-size:2rem;margin-bottom:1rem;">🚨</div>
                        <div style="font-weight:600">CRITICAL: API returned 0 orders!</div>
                        <div style="color:#991b1b;margin-top:0.5rem;">
                            But there are 11 orders in database. Check server logs.
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = orders.map(order => {
            const medicineName = order.medicine_info?.name || 
                               order.prescription?.medicine_name || 
                               'Not specified';
            
            const quantity = order.prescription?.quantity || 1;
            
            let statusClass = 'badge-gray';
            let statusText = order.status;
            if (order.status === 'completed') {
                statusClass = 'badge-green';
                statusText = ' Completed';
            } else if (order.status === 'pending') {
                statusClass = 'badge-yellow';
                statusText = ' Pending';
            }
            
            const date = order.created_at ? new Date(order.created_at) : new Date();
            
            return `
                <tr>
                    <td>
                        <strong style="color:#3b82f6">${order.order_id}</strong>
                        <div style="font-size:0.75rem;color:#9ca3af">ID: ${order.id}</div>
                    </td>
                    <td>
                        <div style="font-weight:600">${order.patient_name}</div>
                        <small style="color:#6b7280">${order.patient_email || ''}</small>
                    </td>
                    <td>${medicineName}</td>
                    <td>${quantity}</td>
                    <td style="font-weight:700;color:#059669;font-size:1.1rem">
                        $${order.total_amount.toFixed(2)}
                    </td>
                    <td>
                        <div>${date.toLocaleDateString()}</div>
                        <div style="font-size:0.8rem;color:#6b7280">
                            ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div style="margin-top:4px;">
                            <span class="badge ${statusClass}">
                                ${statusText}
                            </span>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log(` Displayed ${orders.length} orders in table`);
        
        updateRevenueStats(orders);
        
    } catch (error) {
        console.error('❌ FATAL ERROR:', error);
        
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:2rem;color:#dc2626">
                    <div style="font-size:2rem;margin-bottom:1rem;">💥</div>
                    <div style="font-weight:600;margin-bottom:0.5rem;">FATAL ERROR</div>
                    <div style="color:#991b1b;margin-bottom:1rem;font-family:monospace">
                        ${error.message}
                    </div>
                    <div style="background:#fee2e2;padding:10px;border-radius:5px;margin-bottom:1rem;">
                        <strong>Possible issues:</strong>
                        <ul style="text-align:left;margin:5px 0;">
                            <li>API endpoint not found</li>
                            <li>Authentication failed</li>
                            <li>User not logged in as pharmacist</li>
                        </ul>
                    </div>
                    <button onclick="loadAllOrders()" class="btn btn-outline" style="margin-right:10px;">
                        Try Again
                    </button>
                    <a href="/dashboard/pharmacist/" class="btn btn-primary">
                        Reload Page
                    </a>
                </td>
            </tr>
        `;
    }
}

function updateRevenueStats(orders) {
    console.log(" updateRevenueStats called");
    
    const completedOrders = orders.filter(order => order.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total_amount, 0);
    
    const revenueElement = document.getElementById('total-revenue');
    if (revenueElement) {
        revenueElement.textContent = `$${totalRevenue.toFixed(2)}`;
        revenueElement.style.color = totalRevenue > 0 ? '#059669' : '#6b7280';
        
        const existingSubtitle = revenueElement.nextElementSibling;
        if (!existingSubtitle || !existingSubtitle.classList.contains('revenue-subtitle')) {
            const subtitle = document.createElement('div');
            subtitle.className = 'revenue-subtitle';
            subtitle.style.fontSize = '0.85rem';
            subtitle.style.color = '#6b7280';
            subtitle.style.marginTop = '4px';
            revenueElement.parentNode.appendChild(subtitle);
        }
        
        const subtitle = revenueElement.parentNode.querySelector('.revenue-subtitle');
        if (subtitle) {
            subtitle.textContent = `From ${completedOrders.length} completed orders`;
        }
    }
    
    console.log(` Revenue: $${totalRevenue.toFixed(2)} (${completedOrders.length} orders)`);
}

async function loadMedicinesForPharmacist() {
    console.log(" Loading medicines for pharmacist...");
    
    try {
        const response = await fetch('/api/medicines/', {
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const medicines = await response.json();
            console.log(` Loaded ${medicines.length} medicines`);
            
            const medicinesElement = document.getElementById('total-medicines');
            const lowStockElement = document.getElementById('low-stock-count');
            
            if (medicinesElement) {
                medicinesElement.textContent = medicines.length;
            }
            
            if (lowStockElement) {
                const lowStockCount = medicines.filter(m => (m.stock || 0) < 10).length;
                lowStockElement.textContent = lowStockCount;
                lowStockElement.style.color = lowStockCount > 0 ? '#dc2626' : '#059669';
            }
        }
    } catch (error) {
        console.error('Error loading medicines:', error);
    }
}


function initPharmacistDashboard() {
    console.log(" Initializing Pharmacist Dashboard");
    
    loadAllOrders();
    loadMedicinesForPharmacist();
    loadUsers();
    
    setInterval(() => {
        console.log("🔄 Auto-refreshing pharmacist dashboard...");
        loadAllOrders();
    }, 30000);
    
    const refreshBtn = document.getElementById('refresh-orders-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadAllOrders);
    }
    
    console.log(" Pharmacist Dashboard initialized");
}