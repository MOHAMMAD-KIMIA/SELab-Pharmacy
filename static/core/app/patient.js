console.log(" Patient dashboard JavaScript loaded");

function $(id) {
    return document.getElementById(id);
}

async function apiRequest(url, options = {}) {
    const defaultOptions = {
        credentials: 'same-origin',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    };
    
    if (options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            defaultOptions.headers['X-CSRFToken'] = csrfToken;
        }
    }
    
    const finalOptions = { ...defaultOptions, ...options };
    
    console.log(`API Request: ${options.method || 'GET'} ${url}`, finalOptions);
    
    try {
        const response = await fetch(url, finalOptions);
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        console.error('API request error:', error);
        return { ok: false, status: 0, data: { error: error.message } };
    }
}

function getCsrfToken() {
    const cookieToken = document.cookie.match(/csrftoken=([^;]+)/);
    if (cookieToken) return cookieToken[1];
    
    const domToken = document.querySelector('[name=csrfmiddlewaretoken]');
    if (domToken) return domToken.value;
    
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) return metaToken.content;
    
    return null;
}

async function loadPatientPrescriptions() {
    console.log("📋 Loading patient prescriptions...");
    
    const container = $('prescription-history-list');
    if (!container) return;
    
    // Show loading state
    container.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #6b7280;">
            <div class="loading-spinner"></div>
            Loading your prescriptions...
        </div>
    `;
    
    try {
        const { ok, status, data } = await apiRequest('/api/prescriptions/patient/');
        
        if (!ok) {
            throw new Error(data?.error || `Failed to load prescriptions (${status})`);
        }
        
        const prescriptions = data;
        console.log(`✅ Loaded ${prescriptions.length} prescriptions`);
        
        if (prescriptions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #6b7280; background: #f9fafb; border-radius: 8px;">
                    <svg style="width: 48px; height: 48px; color: #9ca3af; margin-bottom: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <h3 style="margin: 0 0 8px 0; color: #374151;">No prescriptions found</h3>
                    <p style="margin: 0; color: #6b7280;">You don't have any active prescriptions yet.</p>
                </div>
            `;
            return;
        }
        
        // Display prescriptions
        container.innerHTML = prescriptions.map(prescription => `
            <div class="prescription-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <h3 style="margin: 0 0 4px 0; color: #1f2937;">
                            ${prescription.medicine_name}
                            <span class="badge badge-green" style="font-size: 0.75rem; margin-left: 8px;">${prescription.status}</span>
                        </h3>
                        <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">
                            Prescribed by: <strong>${prescription.doctor_name}</strong>
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.875rem; color: #6b7280;">Prescription ID</div>
                        <div style="font-family: monospace; font-weight: 600; color: #3b82f6;">${prescription.prescription_id}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;">
                    <div>
                        <div style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase;">Dosage</div>
                        <div style="font-weight: 500;">${prescription.dosage || 'Not specified'}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase;">Duration</div>
                        <div style="font-weight: 500;">${prescription.duration || 'Not specified'}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase;">Quantity</div>
                        <div style="font-weight: 500;">${prescription.quantity}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase;">Total Price</div>
                        <div style="font-weight: 600; color: #059669;">$${prescription.total_price?.toFixed(2) || '0.00'}</div>
                    </div>
                </div>
                
                ${prescription.notes ? `
                <div style="margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #3b82f6;">
                    <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 4px;">Doctor's Notes:</div>
                    <div style="font-size: 0.875rem; color: #374151;">${prescription.notes}</div>
                </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                    <div style="font-size: 0.75rem; color: #6b7280;">
                        Created: ${new Date(prescription.created_at).toLocaleDateString()}
                    </div>
                    <button class="btn btn-primary" onclick="createOrder('${prescription.prescription_id}')">
                        📦 Place Order
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error loading prescriptions:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #dc2626; background: #fef2f2; border-radius: 8px;">
                <svg style="width: 48px; height: 48px; margin-bottom: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h3 style="margin: 0 0 8px 0; color: #991b1b;">Error loading prescriptions</h3>
                <p style="margin: 0 0 16px 0;">${error.message}</p>
                <button onclick="loadPatientPrescriptions()" class="btn btn-outline">
                    Try Again
                </button>
            </div>
        `;
    }
}

async function createOrder(prescriptionId, prescriptionData) {
    if (!prescriptionId) {
        alert('❌ Invalid prescription ID');
        return;
    }
    
    const confirmation = confirm(
        `CREATE ORDER CONFIRMATION\n\n` +
        `Prescription: ${prescriptionId}\n` +
        `Are you sure you want to place this order?\n` +
        `The amount will be deducted from your wallet.`
    );
    
    if (!confirmation) {
        return;
    }
    
    const button = event?.target;
    const originalText = button?.textContent;
    
    if (button) {
        button.disabled = true;
        button.textContent = 'Processing payment...';
    }
    
    try {
        console.log(`Creating order for prescription: ${prescriptionId}`);
        
        const { ok, status, data } = await apiRequest('/api/orders/create/', {
            method: 'POST',
            body: JSON.stringify({ prescription_id: prescriptionId })
        });
        
        console.log('Order creation response:', { ok, status, data });
        
        if (!ok) {
            if (data.error?.includes('Insufficient wallet balance')) {
                throw new Error(`INSUFFICIENT BALANCE\nRequired: $${data.required?.toFixed(2)}\nAvailable: $${data.available?.toFixed(2)}`);
            }
            throw new Error(data?.error || data?.detail || `Failed to create order (${status})`);
        }
        
        alert(`✅ ORDER & PAYMENT SUCCESSFUL!\n\n` +
              `📦 Order Details:\n` +
              `• Order ID: ${data.order_id}\n` +
              `• Prescription ID: ${data.prescription_id}\n` +
              `• Total Paid: $${data.total_amount?.toFixed(2) || '0.00'}\n` +
              `• New Wallet Balance: $${data.wallet_balance?.toFixed(2) || '0.00'}\n` +
              `• Status: ${data.status || 'completed'}\n\n` +
              `✅ Payment processed successfully!`);
        
        await refreshAllData();
        
        console.log('✅ Order created, payment processed, and lists refreshed');
        
    } catch (error) {
        console.error('❌ Error creating order:', error);
        
        let errorMessage = error.message;
        
        if (error.message.includes('stock')) {
            errorMessage = '❌ INSUFFICIENT STOCK\n\nThe medicine is currently out of stock.';
        } else if (error.message.includes('INSUFFICIENT BALANCE')) {
            errorMessage = error.message;
        } else if (error.message.includes('not found')) {
            errorMessage = '❌ PRESCRIPTION NOT FOUND\n\nThis prescription may have already been used or does not exist.';
        }
        
        alert(`❌ ORDER FAILED\n\n${errorMessage}`);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}


async function refreshAllData() {
    console.log('🔄 Refreshing all data...');
    
    try {
        await Promise.all([
            loadPatientStats(),
            loadPatientPrescriptions(),
            loadOrderHistory(),
            loadWalletHistory()
        ]);
        
        console.log('✅ All data refreshed successfully');
    } catch (error) {
        console.error('❌ Error refreshing data:', error);
    }
}


async function loadOrderHistory() {
    console.log(" Loading order history...");
    
    const container = $('order-history-list');
    if (!container) return;
    
    try {
        const { ok, status, data } = await apiRequest('/api/orders/');
        
        if (!ok) {
            throw new Error(data?.error || `Failed to load orders (${status})`);
        }
        
        const orders = data;
        
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #6b7280; background: #f9fafb; border-radius: 8px;">
                    No order history found
                </div>
            `;
            return;
        }
        
        container.innerHTML = orders.map(order => `
            <div class="order-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div>
                        <h4 style="margin: 0 0 4px 0; color: #1f2937;">Order #${order.order_id}</h4>
                        <span class="badge ${order.status === 'completed' ? 'badge-green' : order.status === 'pending' ? 'badge-yellow' : order.status === 'cancelled' ? 'badge-red' : 'badge-blue'}" style="font-size: 0.75rem;">
                            ${order.status}
                        </span>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.875rem; color: #6b7280;">Total Amount</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #059669;">$${(order.total_amount || 0).toFixed(2)}</div>
                    </div>
                </div>
                
                <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 8px;">
                    Prescription: <strong>${order.prescription_id || 'N/A'}</strong>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #6b7280;">
                    <div>
                        ${order.created_at ? `Ordered: ${new Date(order.created_at).toLocaleDateString()}` : ''}
                    </div>
                    <div>
                        ${order.updated_at && order.status !== 'completed' ? `Updated: ${new Date(order.updated_at).toLocaleDateString()}` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error loading order history:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc2626; background: #fef2f2; border-radius: 8px;">
                Error loading order history: ${error.message}
            </div>
        `;
    }
}

async function searchPrescription(event) {
    event.preventDefault();
    
    const input = event.target.querySelector('input[type="text"]');
    const prescriptionId = input?.value.trim();
    
    if (!prescriptionId) {
        alert('❌ Please enter a prescription ID');
        return;
    }
    
    try {

        alert(`Searching for prescription: ${prescriptionId}\n\nThis feature will be implemented soon.`);
        
    } catch (error) {
        console.error('❌ Error searching prescription:', error);
        alert(`Error: ${error.message}`);
    }
}

function initPatientDashboard() {
    console.log(' Initializing Patient Dashboard...');
    
    refreshAllData();
    
    setInterval(() => {
        console.log(' Auto-refreshing patient data...');
        refreshAllData();
    }, 30000);
}

async function loadWalletBalance() {
    console.log(" Loading wallet balance...");
    
    const balanceElement = $('wallet-balance');
    if (!balanceElement) return;
    
    try {
        const { ok, status, data } = await apiRequest('/api/wallet/balance/');
        
        const balance = data?.balance || 0;
        balanceElement.textContent = `$${balance.toFixed(2)}`;
        
        if (balance > 100) {
            balanceElement.style.color = '#059669';
        } else if (balance > 20) {
            balanceElement.style.color = '#d97706'; 
        } else {
            balanceElement.style.color = '#dc2626'; 
        }
        
        console.log(`✅ Wallet balance: $${balance.toFixed(2)}`);
        return balance;
        
    } catch (error) {
        console.error('❌ Error loading wallet balance:', error);
        balanceElement.textContent = '$0.00';
        balanceElement.style.color = '#dc2626';
        return 0;
    }
}

async function depositToWallet() {
    const amount = prompt('Enter amount to deposit ($):');
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        alert('❌ Please enter a valid positive amount');
        return;
    }
    
    const depositAmount = parseFloat(amount);
    
    try {
        const { ok, status, data } = await apiRequest('/api/wallet/deposit/', {
            method: 'POST',
            body: JSON.stringify({ amount: depositAmount })
        });
        
        if (!ok) {
            throw new Error(data?.error || `Deposit failed (${status})`);
        }
        
        alert(`✅ ${data.message}\nNew balance: $${data.new_balance?.toFixed(2) || '0.00'}`);
        
        await loadWalletBalance();
        
    } catch (error) {
        console.error('❌ Error depositing to wallet:', error);
        alert(`❌ Deposit failed: ${error.message}`);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded - Patient dashboard');
    
    const path = window.location.pathname;
    if (path.includes('/dashboard/patient/') || 
        $('prescription-history-list') || 
        $('order-history-list')) {
        
        console.log('👤 Patient dashboard detected');
        initPatientDashboard();
    }
});

const style = document.createElement('style');
style.textContent = `
    .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
        vertical-align: middle;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .badge {
        display: inline-block;
        padding: 0.25rem 0.625rem;
        border-radius: 0.75rem;
        font-size: 0.75rem;
        font-weight: 500;
    }
    
    .badge-green { 
        background: #dcfce7; 
        color: #166534; 
    }
    
    .badge-blue { 
        background: #dbeafe; 
        color: #1e40af; 
    }
    
    .badge-red { 
        background: #fee2e2; 
        color: #991b1b; 
    }
    
    .badge-yellow { 
        background: #fef3c7; 
        color: #92400e; 
    }
    
    .btn {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        font-size: 0.875rem;
        transition: all 0.2s;
    }
    
    .btn-primary {
        background: #3b82f6;
        color: white;
    }
    
    .btn-primary:hover {
        background: #2563eb;
    }
    
    .btn-outline {
        background: white;
        color: #374151;
        border: 1px solid #d1d5db;
    }
    
    .btn-outline:hover {
        background: #f9fafb;
    }
`;
document.head.appendChild(style);

async function loadWalletHistory() {
    console.log(" Loading wallet history...");
    
    const previewContainer = document.getElementById('wallet-history-preview');
    if (!previewContainer) return;
    
    try {
        const { ok, status, data } = await apiRequest('/api/wallet/transactions/');
        
        const transactions = data || [];
        
        if (!transactions || transactions.length === 0) {
            previewContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 0.9rem;">
                    No transactions yet
                </div>
            `;
            return;
        }
        
        previewContainer.innerHTML = transactions.slice(0, 3).map(t => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                <div>
                    <div style="font-weight: 600; color: #1e293b; font-size: 0.875rem;">
                        ${t.description || (t.type === 'deposit' ? 'Deposit' : 'Payment')}
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280;">
                        ${t.date ? new Date(t.date).toLocaleDateString() : 'Recent'}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 700; color: ${t.type === 'deposit' ? '#059669' : '#dc2626'}; font-size: 0.95rem;">
                        ${t.type === 'deposit' ? '+' : '-'}$${t.amount?.toFixed(2) || '0.00'}
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280;">
                        ${t.status || 'completed'}
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error loading wallet history:', error);
        previewContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 0.9rem;">
                Wallet history will appear here
            </div>
        `;
    }
}


async function loadPatientStats() {
    console.log(" Loading patient stats...");
    
    try {
        const { ok, status, data } = await apiRequest('/api/patient/stats/');
        
        if (ok && data) {
            if ($('wallet-balance')) {
                $('wallet-balance').textContent = `$${data.wallet_balance?.toFixed(2) || '0.00'}`;
            }
            
            if ($('active-prescriptions-count')) {
                $('active-prescriptions-count').textContent = data.active_prescriptions || 0;
            }
            
            if ($('total-orders-count')) {
                $('total-orders-count').textContent = data.total_orders || 0;
            }
            
            if ($('pending-orders-count')) {
                $('pending-orders-count').textContent = `${data.pending_orders || 0} pending orders`;
            }
            
            if ($('total-spent-amount')) {
                $('total-spent-amount').textContent = `$${data.total_spent?.toFixed(2) || '0.00'}`;
            }
            
            console.log('✅ Patient stats loaded:', data);
        }
    } catch (error) {
        console.error('❌ Error loading patient stats:', error);
    }
}

function showAddFundsModal() {
}

function closeWalletModal() {
    document.getElementById('wallet-modal').style.display = 'none';
}

function selectAmount(amount) {
    const amountInput = document.getElementById('modal-custom-amount');
    amountInput.value = amount;
    updateSelectedAmount(amount);
}

function useCustomAmount() {
    const customAmount = parseFloat(document.getElementById('modal-custom-amount').value);
    if (customAmount && customAmount > 0) {
        updateSelectedAmount(customAmount);
    } else {
        alert('Please enter a valid amount');
    }
}

function updateSelectedAmount(amount) {
    const selectedAmountDisplay = document.getElementById('selected-amount-display');
    const newBalanceDisplay = document.getElementById('new-balance-display');
    
    const currentBalance = parseFloat(document.getElementById('wallet-balance').textContent.replace('$', '')) || 0;
    const newBalance = currentBalance + amount;
    
    selectedAmountDisplay.textContent = `$${amount.toFixed(2)}`;
    newBalanceDisplay.textContent = `$${newBalance.toFixed(2)}`;
}

function updateBalanceDisplay() {
    const currentBalance = parseFloat(document.getElementById('wallet-balance').textContent.replace('$', '')) || 0;
    document.getElementById('current-balance-display').textContent = `$${currentBalance.toFixed(2)}`;
}

async function processPayment() {
    const selectedAmount = parseFloat(document.getElementById('selected-amount-display').textContent.replace('$', ''));
    
    if (!selectedAmount || selectedAmount <= 0) {
        alert('Please select an amount first');
        return;
    }
    
    const confirmPayment = confirm(`Proceed with $${selectedAmount.toFixed(2)} deposit?\n\nThis amount will be added to your wallet.`);
    
    if (!confirmPayment) {
        return;
    }
    
    try {
        const { ok, status, data } = await apiRequest('/api/wallet/deposit/', {
            method: 'POST',
            body: JSON.stringify({ amount: selectedAmount })
        });
        
        if (!ok) {
            throw new Error(data?.error || `Deposit failed (${status})`);
        }
        
        alert(`✅ ${data.message || 'Payment successful!'}\nNew Balance: $${data.new_balance?.toFixed(2) || selectedAmount.toFixed(2)}`);
        
        await loadWalletBalance();
        closeWalletModal();
        
        await loadWalletHistory();
        
    } catch (error) {
        console.error('❌ Payment error:', error);
        alert(`❌ Payment failed: ${error.message}`);
    }
}

function addFunds(amount) {
    if (confirm(`Add $${amount.toFixed(2)} to your wallet?`)) {
        apiRequest('/api/wallet/deposit/', {
            method: 'POST',
            body: JSON.stringify({ amount: amount })
        }).then(({ ok, status, data }) => {
            if (ok) {
                loadWalletBalance();
                loadWalletHistory();
                alert(`✅ $${amount.toFixed(2)} added successfully!`);
            } else {
                alert(`❌ Failed: ${data?.error || 'Unknown error'}`);
            }
        }).catch(error => {
            console.error('Error:', error);
            alert('❌ Network error');
        });
    }
}

buttons.forEach(button => {
    button.addEventListener('click', function(event) {
        event.stopImmediatePropagation();
        addFunds(parseFloat(this.dataset.amount));
    }, { once: true }); 
});

function addCustomFunds() {
    const customAmount = parseFloat(document.getElementById('custom-amount').value);
    
    if (!customAmount || customAmount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    addFunds(customAmount);
    document.getElementById('custom-amount').value = '';
}

function showWalletHistory() {
    const modal = document.getElementById('wallet-modal');
    const modalContent = document.getElementById('wallet-modal-content');
    
    modalContent.innerHTML = `
        <div style="padding: 20px 0;">
            <h3 style="margin: 0 0 20px 0; color: #1e293b;">Wallet Transaction History</h3>
            
            <div id="wallet-history-full" style="min-height: 300px;">
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
                    Loading transaction history...
                </div>
            </div>
            
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button onclick="closeWalletModal()" class="btn btn-outline" style="flex: 1;">Close</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    loadFullWalletHistory();
}

async function loadFullWalletHistory() {
    const container = document.getElementById('wallet-history-full');
    if (!container) return;
    
    try {
        const { ok, status, data } = await apiRequest('/api/wallet/transactions/');
        
        if (!ok) {
            throw new Error(data?.error || `Failed to load transactions (${status})`);
        }
        
        const transactions = data;
        
        if (!transactions || transactions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    No transaction history found
                </div>
            `;
            return;
        }
        
        container.innerHTML = transactions.map(t => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                <div>
                    <div style="font-weight: 600; color: #1e293b;">
                        ${t.description || t.type === 'deposit' ? 'Deposit' : 'Payment'}
                    </div>
                    <div style="font-size: 0.85rem; color: #6b7280;">
                        ${t.date ? new Date(t.date).toLocaleString() : 'N/A'}
                    </div>
                    ${t.reference_id ? `<div style="font-size: 0.75rem; color: #9ca3af;">Ref: ${t.reference_id}</div>` : ''}
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 700; font-size: 1.1rem; color: ${t.type === 'deposit' ? '#059669' : '#dc2626'};">
                        ${t.type === 'deposit' ? '+' : '-'}$${t.amount?.toFixed(2) || '0.00'}
                    </div>
                    <div style="font-size: 0.85rem; color: #6b7280;">
                        <span class="badge ${t.status === 'completed' ? 'badge-green' : t.status === 'pending' ? 'badge-yellow' : 'badge-red'}">
                            ${t.status}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error loading full wallet history:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc2626;">
                Error loading transaction history: ${error.message}
            </div>
        `;
    }
}

// ==================== سایر توابع ====================

function showPaymentMethods() {
    alert(' Payment Methods\n\nThis feature will be implemented soon.');
}

function showReceipts() {
    alert(' Receipts & Invoices\n\nThis feature will be implemented soon.');
}

function showSupport() {
    alert(' Support Center\n\nContact: support@pharmacare.com\nPhone: +98 930 873 0070');
}

const depositBtn = $('deposit-btn');
if (depositBtn) {
    depositBtn.addEventListener('click', depositToWallet);
}

loadWalletHistory();

document.querySelectorAll('button[onclick*="addFunds"]').forEach(btn => {
    btn.addEventListener('click', function() {
        const amount = parseInt(this.textContent.match(/\$(\d+)/)?.[1] || 0);
        if (amount > 0) addFunds(amount);
    });
});


async function depositToWallet() {
    const amountInput = prompt('Enter amount to deposit ($):');
    
    if (!amountInput) return;
    
    const amount = parseFloat(amountInput);
    
    if (isNaN(amount) || amount <= 0) {
        alert('❌ Please enter a valid positive amount');
        return;
    }
    
    try {
        const { ok, status, data } = await apiRequest('/api/wallet/deposit/', {
            method: 'POST',
            body: JSON.stringify({ amount: amount })
        });
        
        if (!ok) {
            throw new Error(data?.error || `Deposit failed (${status})`);
        }
        
        alert(`✅ ${data.message || 'Deposit successful!'}\nNew balance: $${data.new_balance?.toFixed(2) || '0.00'}`);
        
        // Refresh wallet balance and history
        await Promise.all([
            loadWalletBalance(),
            loadWalletHistory()
        ]);
        
    } catch (error) {
        console.error('❌ Error depositing to wallet:', error);
        alert(`❌ Deposit failed: ${error.message}`);
    }
}

// Export functions for global access
window.loadPatientPrescriptions = loadPatientPrescriptions;
window.loadOrderHistory = loadOrderHistory;
window.createOrder = createOrder;
window.searchPrescription = searchPrescription;
window.initPatientDashboard = initPatientDashboard;
window.loadWalletBalance = loadWalletBalance;
window.depositToWallet = depositToWallet;
window.showAddFundsModal = showAddFundsModal;
window.closeWalletModal = closeWalletModal;
window.addFunds = addFunds;
window.addCustomFunds = addCustomFunds;
window.showWalletHistory = showWalletHistory;
window.showPaymentMethods = showPaymentMethods;
window.showReceipts = showReceipts;
window.showSupport = showSupport;

console.log('✅ Patient JavaScript module loaded');