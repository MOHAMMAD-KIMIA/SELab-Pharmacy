// static/core/app/pharmacist.js
"use strict";

console.log("💊 Loading Pharmacist module...");

const Pharmacist = {
    medicineCache: [],

    // بارگذاری داروها
    async loadMedicines() {
        console.log("💊 Loading medicines for pharmacist dashboard...");

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
            
            // به‌روزرسانی آمار
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

    // ایجاد ردیف دارو
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

    // ویرایش دارو
    editMedicine(id) {
        const medicine = this.medicineCache.find((x) => String(x.id) === String(id));
        if (!medicine) return;

        // پر کردن فرم مودال
        Utils.$("medicine-id").value = medicine.id ?? "";
        Utils.$("medicine-name").value = medicine.name ?? "";
        Utils.$("medicine-category").value = medicine.category ?? "";
        Utils.$("medicine-batch").value = medicine.batch_number ?? medicine.batch ?? "";
        Utils.$("medicine-expiry").value = medicine.expiry_date ?? medicine.expiry ?? "";
        Utils.$("medicine-price").value = medicine.price ?? "";
        Utils.$("medicine-stock").value = medicine.stock ?? "";
        Utils.$("medicine-notes").value = medicine.notes ?? "";

        // تغییر عنوان مودال
        Utils.$("medicine-modal-title").textContent = "Edit Medicine";
        Utils.$("medicine-save-btn").textContent = "Update";

        // نمایش مودال
        this.showMedicineModal();
    },

    // حذف دارو
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

    // نمایش مودال دارو
    showMedicineModal() {
        const modal = Utils.$("medicine-modal");
        if (!modal) return;

        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        setTimeout(() => Utils.$("medicine-name")?.focus(), 0);
    },

    // بستن مودال دارو
    closeMedicineModal() {
        const modal = Utils.$("medicine-modal");
        if (!modal) return;
        
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
    },

    // ذخیره دارو
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

        // اعتبارسنجی
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

    // به‌روزرسانی آمار
    updateStats() {
        // محاسبه مجموع درآمد
        const totalRevenue = this.medicineCache.reduce((sum, med) => {
            return sum + (Number(med.price || 0) * Number(med.stock || 0));
        }, 0);
        
        // شمارش داروهای با موجودی کم
        const lowStockCount = this.medicineCache.filter(med => Number(med.stock || 0) < 10).length;

        // به‌روزرسانی UI
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

    // مقداردهی اولیه داشبورد داروساز
    init() {
        console.log("💊 Initializing Pharmacist Dashboard...");

        // event listener فرم دارو
        const form = Utils.$("medicine-form");
        if (form && !form.dataset.bound) {
            form.addEventListener("submit", (e) => this.saveMedicine(e));
            form.dataset.bound = "1";
        }

        // بارگذاری اولیه داروها
        this.loadMedicines();

        // event listener برای دکمه Add Medicine
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

        console.log("✅ Pharmacist Dashboard initialized");
    }
};

// Export برای استفاده global
window.Pharmacist = Pharmacist;
console.log("✅ Pharmacist module loaded");

// بخش User Management
async function loadUsers() {
    console.log("👥 Loading users...");
    
    const tbody = document.getElementById('users-table');
    if (!tbody) return;
    
    try {
        // حالت loading
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
        console.log(`✅ Loaded ${users.length} users`);
        
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
        
        // پر کردن جدول
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

// بخش All Orders
async function loadAllOrders() {
    console.log("📦 Loading all orders...");
    
    const tbody = document.getElementById('all-orders');
    if (!tbody) return;
    
    try {
        // حالت loading
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;padding:1rem">
                    Loading orders...
                </td>
            </tr>
        `;
        
        const { ok, status, data } = await Utils.apiRequest("/api/orders/");
        
        if (!ok) {
            throw new Error(data?.error || `Failed to load orders (${status})`);
        }
        
        const orders = data;
        console.log(`✅ Loaded ${orders.length} orders`);
        
        // محاسبه total revenue
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        const revenueElement = document.getElementById('total-revenue');
        if (revenueElement) {
            revenueElement.textContent = `$${totalRevenue.toFixed(2)}`;
        }
        
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center;padding:1rem;color:#6b7280">
                        No orders found
                    </td>
                </tr>
            `;
            return;
        }
        
        // پر کردن جدول
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>
                    <strong>${order.order_id || `Order #${order.id}`}</strong>
                </td>
                <td>
                    ${order.patient_name || "Unknown"}<br>
                    <small style="color:#6b7280">${order.patient_email || ""}</small>
                </td>
                <td>$${(order.total_amount || 0).toFixed(2)}</td>
                <td>
                    ${order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}
                    <br>
                    <small style="color:#6b7280">
                        ${order.status ? `
                            <span class="badge ${
                                order.status === 'completed' ? 'badge-green' :
                                order.status === 'pending' ? 'badge-yellow' :
                                order.status === 'cancelled' ? 'badge-red' :
                                'badge-blue'
                            }">
                                ${order.status}
                            </span>
                        ` : ''}
                    </small>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error("❌ Error loading orders:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;padding:1rem;color:#dc2626">
                    Error loading orders: ${error.message}
                </td>
            </tr>
        `;
    }
}

// اضافه کردن این توابع به init Pharmacist
function initPharmacistDashboard() {
    console.log("💊 Initializing Pharmacist Dashboard...");
    
    // بارگذاری داروها (از قبل وجود دارد)
    Pharmacist.loadMedicines();
    
    // بارگذاری کاربران
    loadUsers();
    
    // بارگذاری سفارشات
    loadAllOrders();
    
    // auto-refresh هر 30 ثانیه
    setInterval(() => {
        Pharmacist.loadMedicines();
        loadUsers();
        loadAllOrders();
    }, 30000);
}