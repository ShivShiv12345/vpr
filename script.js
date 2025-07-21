
const AIRTABLE_CONFIG = {
    BASE_ID: 'appkUal6c4oanOR4X', // Replace with your Airtable Base ID
    TABLE_NAME: 'AP CRM', // Your table name
    API_KEY: 'patcpUIfwD7dO31yP.d4f977687c0a13f9ababa4f5c96954c68bd07d09a9e3eb6a1391acb7f2f2375b', // Replace with your Airtable API key
};


// Global state
let currentInvoices = [];
let selectedInvoices = [];
let currentSearchOption = '';
let currentVendorName = '';

// DOM Elements
const vendorIdInput = document.getElementById('vendor-id');
const searchOptionSelect = document.getElementById('search-option');
const searchIconBtn = document.getElementById('search-icon-btn');
const vendorInfo = document.getElementById('vendor-info');
const vendorNameDisplay = document.getElementById('vendor-name-display');
const fullTurnoverInfo = document.getElementById('full-turnover-info');
const fullPaymentMessage = document.getElementById('full-payment-message');
const paymentDateSection = document.getElementById('payment-date-section');
const resultsSection = document.getElementById('results-section');
const selectNotice = document.getElementById('select-notice');
const invoiceCount = document.getElementById('invoice-count');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const paymentDateInput = document.getElementById('payment-date');
const previewBtn = document.getElementById('preview-btn');
const previewText = document.getElementById('preview-text');
const previewModal = document.getElementById('preview-modal');
const successModal = document.getElementById('success-modal');
const dueDateWarningModal = document.getElementById('due-date-warning-modal');
const closeModalBtn = document.getElementById('close-modal');
const closeWarningModalBtn = document.getElementById('close-warning-modal');
const cancelBtn = document.getElementById('cancel-btn');
const confirmBtn = document.getElementById('confirm-btn');
const warningCancelBtn = document.getElementById('warning-cancel-btn');
const successOkBtn = document.getElementById('success-ok-btn');
const tooltip = document.getElementById('tooltip');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupTooltips();
    setMinPaymentDate();
})

function setupEventListeners() {
    vendorIdInput.addEventListener('input', validateForm);
    searchOptionSelect.addEventListener('change', handleSearchOptionChange);
    searchIconBtn.addEventListener('click', handleSearch);
    paymentDateInput.addEventListener('change', handlePaymentDateChange);
    previewBtn.addEventListener('click', handlePreview);
    closeModalBtn.addEventListener('click', closeModal);
    closeWarningModalBtn.addEventListener('click', closeWarningModal);
    cancelBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', handleConfirmSubmit);
    warningCancelBtn.addEventListener('click', closeWarningModal);
    successOkBtn.addEventListener('click', closeSuccessModal);
    
    // Close modals when clicking outside
    previewModal.addEventListener('click', function(e) {
        if (e.target === previewModal) {
            closeModal();
        }
    });
    
    successModal.addEventListener('click', function(e) {
        if (e.target === successModal) {
            closeSuccessModal();
        }
    });
    
    dueDateWarningModal.addEventListener('click', function(e) {
        if (e.target === dueDateWarningModal) {
            closeWarningModal();
        }
    });
}

function setupTooltips() {
    const tooltipIcons = document.querySelectorAll('.tooltip-icon');
    
    tooltipIcons.forEach(icon => {
        icon.addEventListener('mouseenter', showTooltip);
        icon.addEventListener('mouseleave', hideTooltip);
        icon.addEventListener('mousemove', moveTooltip);
    });
}

function showTooltip(e) {
    const text = e.target.getAttribute('data-tooltip');
    if (!text) return;
    
    tooltip.querySelector('.tooltip-content').textContent = text;
    tooltip.classList.remove('hidden');
    moveTooltip(e);
}

function hideTooltip() {
    tooltip.classList.add('hidden');
}

function moveTooltip(e) {
    const rect = tooltip.getBoundingClientRect();
    const x = e.clientX - rect.width / 2;
    const y = e.clientY - rect.height - 10;
    
    tooltip.style.left = Math.max(10, Math.min(x, window.innerWidth - rect.width - 10)) + 'px';
    tooltip.style.top = Math.max(10, y) + 'px';
}

function setMinPaymentDate() {
    const today = new Date();
    paymentDateInput.min = today.toISOString().split('T')[0];
}

function validateForm() {
    const vendorId = vendorIdInput.value.trim();
    const searchOption = searchOptionSelect.value;
    
    const isValid = !(!vendorId || !searchOption);
    searchIconBtn.disabled = !isValid;
    
    // If vendor ID is empty, disable search options
    if (!vendorId) {
        searchOptionSelect.disabled = true;
        searchOptionSelect.value = '';
        currentSearchOption = '';
        hideInfoPopups();
    } else {
        searchOptionSelect.disabled = false;
    }
}

function hideInfoPopups() {
    fullTurnoverInfo.classList.add('hidden');
    const requestedVendorInfo = document.getElementById('requested-vendor-info');
    if (requestedVendorInfo) {
        requestedVendorInfo.classList.add('hidden');
    }
}

function handleSearchOptionChange() {
    const searchOption = searchOptionSelect.value;
    currentSearchOption = searchOption;
    
    // Show/hide info popups
    const requestedVendorInfo = document.getElementById('requested-vendor-info');
    if (searchOption === 'full') {
        fullTurnoverInfo.classList.remove('hidden');
        if (requestedVendorInfo) requestedVendorInfo.classList.add('hidden');
    } else if (searchOption === 'requested') {
        fullTurnoverInfo.classList.add('hidden');
        if (requestedVendorInfo) requestedVendorInfo.classList.remove('hidden');
    } else {
        fullTurnoverInfo.classList.add('hidden');
        if (requestedVendorInfo) requestedVendorInfo.classList.add('hidden');
    }
    
    validateForm();
    updatePaymentSection();
}

function updatePaymentSection() {
    if (currentSearchOption === 'full') {
        fullPaymentMessage.classList.remove('hidden');
        paymentDateSection.classList.add('hidden');
        previewText.textContent = 'Calculate Early Payment Benefits';
    } else if (currentSearchOption === 'requested') {
        fullPaymentMessage.classList.add('hidden');
        paymentDateSection.classList.remove('hidden');
        previewText.textContent = 'Preview Selected Invoices';
    } else {
        fullPaymentMessage.classList.add('hidden');
        paymentDateSection.classList.add('hidden');
    }
    
    validatePreviewButton();
}

function validatePreviewButton() {
    if (currentSearchOption === 'full') {
        // For full turnover, no date selection needed
        previewBtn.disabled = currentInvoices.length === 0;
    } else if (currentSearchOption === 'requested') {
        const paymentDate = paymentDateInput.value;
        const hasSelection = selectedInvoices.length > 0;
        previewBtn.disabled = !paymentDate || !hasSelection || currentInvoices.length === 0;
    } else {
        previewBtn.disabled = true;
    }
}

function handlePaymentDateChange() {
    validatePreviewButton();
    
    if (currentSearchOption === 'requested' && selectedInvoices.length > 0) {
        checkDateConflicts();
    }
}

function setPaymentDateLimits() {
    if (currentInvoices.length === 0) return;
    
    const today = new Date();
    let earliestDueDate = null;
    
    if (currentSearchOption === 'full') {
        // For full turnover, find earliest due date from all invoices
        earliestDueDate = new Date(Math.min(...currentInvoices.map(inv => new Date(inv.fields.Due_Date))));
    } else if (currentSearchOption === 'requested' && selectedInvoices.length > 0) {
        // For selected invoices, find earliest due date from selected invoices
        const selectedInvoiceData = currentInvoices.filter(inv => selectedInvoices.includes(inv.id));
        earliestDueDate = new Date(Math.min(...selectedInvoiceData.map(inv => new Date(inv.fields.Due_Date))));
    }
    
    if (earliestDueDate) {
        paymentDateInput.min = today.toISOString().split('T')[0];
        paymentDateInput.max = earliestDueDate.toISOString().split('T')[0];
    }
}

async function handleSearch() {
    const vendorId = vendorIdInput.value.trim();
    
    if (!vendorId || !currentSearchOption) {
        showToast('Error', 'Please enter a vendor ID and select search option', 'error');
        return;
    }
    
    setLoading(true);
    
    try {
        let invoices = [];
        
        // Check if using demo data or real Airtable
        if (AIRTABLE_CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
            // Use demo data
            const demoData = DEMO_DATA[vendorId];
            if (demoData) {
                invoices = demoData.invoices;
                currentVendorName = demoData.vendor_name;
                showToast('Demo Mode', `Found ${invoices.length} demo invoices for ${currentVendorName}`, 'success');
            } else {
                showToast('Demo Mode', 'No demo data found. Try VEND001, VEND002, or VEND003', 'warning');
                setLoading(false);
                return;
            }
        } else {
            // Use real Airtable API
            const response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}/${AIRTABLE_CONFIG.TABLE_NAME}?filterByFormula=({Vendor_ID}='${vendorId}')`,
                {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            invoices = data.records;
            
            if (invoices.length > 0) {
                currentVendorName = invoices[0].fields.Vendor_Name;
                showToast('Success', `Found ${invoices.length} invoices for vendor: ${currentVendorName}`, 'success');
            } else {
                showToast('No Results', 'No invoices found for this vendor ID', 'error');
                setLoading(false);
                return;
            }
        }
        
        currentInvoices = invoices;
        selectedInvoices = [];
        
        displayVendorInfo();
        displayInvoices();
        updatePaymentSection();
        setPaymentDateLimits();
        
    } catch (error) {
        console.error('Error fetching invoices:', error);
        showToast('Error', 'Failed to fetch invoices. Please check your configuration.', 'error');
    } finally {
        setLoading(false);
    }
}

function setLoading(loading) {
    searchIconBtn.disabled = loading;
    if (loading) {
        searchIconBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    } else {
        searchIconBtn.innerHTML = '<i class="fas fa-search"></i>';
    }
}

function displayVendorInfo() {
    vendorNameDisplay.textContent = currentVendorName;
    vendorInfo.classList.remove('hidden');
}

function displayInvoices() {
    invoiceCount.textContent = currentInvoices.length;
    
    // Show/hide select notice based on search option
    if (currentSearchOption === 'requested') {
        selectNotice.classList.remove('hidden');
    } else {
        selectNotice.classList.add('hidden');
    }
    
    // Build table header
    let headerHTML = '';
    if (currentSearchOption === 'requested') {
        headerHTML += '<th>Select</th>';
    }
    headerHTML += `
        <th>Batch ID</th>
        <th>Invoice Number</th>
        <th>Amount</th>
        <th>Invoice Date</th>
        <th>Due Date</th>
        <th>Days to Due</th>
        <th>Discount %</th>
    `;
    tableHeader.innerHTML = headerHTML;
    
    // Build table body
    let bodyHTML = '';
    currentInvoices.forEach(invoice => {
        // For display purposes, show discount based on current date
        const discountPercent = calculateDiscount(invoice.fields.Due_Date);
        const daysToDue = calculateDaysToDue(invoice.fields.Due_Date);
        const badgeClass = getDaysToDueBadgeClass(daysToDue);
        const discountBadgeClass = getDiscountBadgeClass(discountPercent);
        
        bodyHTML += `
            <tr>
                ${currentSearchOption === 'requested' ? `
                    <td>
                        <div class="checkbox-container">
                            <input type="checkbox" class="checkbox" data-invoice-id="${invoice.id}" 
                                   onchange="handleInvoiceSelection('${invoice.id}', this.checked)">
                        </div>
                    </td>
                ` : ''}
                <td><strong>${invoice.fields.Batch_ID}</strong></td>
                <td>${invoice.fields.Invoice_Number}</td>
                <td>₹${invoice.fields.Invoice_Amount.toLocaleString()}</td>
                <td>${formatDate(invoice.fields.Invoice_Date)}</td>
                <td>${formatDate(invoice.fields.Due_Date)}</td>
                <td><span class="badge ${badgeClass}">${daysToDue} days</span></td>
                <td><span class="badge ${discountBadgeClass}">${discountPercent}%${currentSearchOption === 'requested' ? '*' : ''}</span></td>
            </tr>
        `;
    });
    
    // Add note about discount calculation for requested by vendor
    if (currentSearchOption === 'requested') {
        bodyHTML += `
            <tr style="background: #f0f9ff;">
                <td colspan="8" style="text-align: center; font-style: italic; color: #3b82f6; font-size: 12px;">
                    * Discount % shown is based on current date. Final discount will be calculated based on your selected payment date.
                </td>
            </tr>
        `;
    }
    
    tableBody.innerHTML = bodyHTML;
    resultsSection.classList.remove('hidden');
    resultsSection.classList.add('fade-in');
    
    validatePreviewButton();
}

function handleInvoiceSelection(invoiceId, isSelected) {
    if (isSelected) {
        if (!selectedInvoices.includes(invoiceId)) {
            selectedInvoices.push(invoiceId);
        }
    } else {
        selectedInvoices = selectedInvoices.filter(id => id !== invoiceId);
    }
    
    setPaymentDateLimits();
    validatePreviewButton();
    
    if (paymentDateInput.value) {
        checkDateConflicts();
    }
}

function calculateDiscount(dueDate, paymentDate = null) {
    const baseDate = paymentDate ? new Date(paymentDate) : new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - baseDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 30) return 2;
    if (diffDays >= 31 && diffDays <= 60) return 5;
    if (diffDays >= 61 && diffDays <= 90) return 10;
    if (diffDays > 90) return 12;
    return 0; // Past due or same day
}

function calculateDaysToDue(dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getDaysToDueBadgeClass(days) {
    if (days < 30) return 'badge-green';
    if (days < 60) return 'badge-yellow';
    return 'badge-red';
}

function getDiscountBadgeClass(percent) {
    if (percent <= 2) return 'badge-green';
    if (percent <= 5) return 'badge-yellow';
    if (percent <= 10) return 'badge-orange';
    return 'badge-red';
}

function checkDateConflicts() {
    const paymentDate = new Date(paymentDateInput.value);
    const conflictingInvoices = [];
    
    const selectedInvoiceData = currentInvoices.filter(inv => selectedInvoices.includes(inv.id));
    
    selectedInvoiceData.forEach(invoice => {
        const dueDate = new Date(invoice.fields.Due_Date);
        if (paymentDate > dueDate) {
            conflictingInvoices.push({
                invoiceNumber: invoice.fields.Invoice_Number,
                dueDate: invoice.fields.Due_Date,
                daysDifference: Math.ceil((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            });
        }
    });
    
    if (conflictingInvoices.length > 0) {
        showDateConflictWarning(conflictingInvoices, paymentDate);
        // Disable preview button when there are conflicts
        previewBtn.disabled = true;
        return false;
    }
    
    // Re-enable preview button if no conflicts
    validatePreviewButton();
    return true;
}

function showDateConflictWarning(conflictingInvoices, paymentDate) {
    const conflictDetails = document.getElementById('conflict-details');
    
    let detailsHTML = `
        <h5>❌ Problematic Invoices:</h5>
        <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 12px; margin: 8px 0;">
            <p style="color: #dc2626; font-weight: 500; margin-bottom: 8px;">
                Selected Payment Date: <strong>${formatDate(paymentDate.toISOString().split('T')[0])}</strong>
            </p>
    `;
    
    conflictingInvoices.forEach(conflict => {
        detailsHTML += `
            <div class="conflict-item">
                <div>
                    <strong>Invoice:</strong> ${conflict.invoiceNumber}<br>
                    <strong>Due Date:</strong> ${formatDate(conflict.dueDate)}
                </div>
                <span class="badge badge-red">Payment ${conflict.daysDifference} days after due date</span>
            </div>
        `;
    });
    
    detailsHTML += '</div>';
    conflictDetails.innerHTML = detailsHTML;
    dueDateWarningModal.classList.remove('hidden');
}

function closeWarningModal() {
    dueDateWarningModal.classList.add('hidden');
}

function handlePreview() {
    if (currentSearchOption === 'requested' && selectedInvoices.length > 0) {
        if (!checkDateConflicts()) {
            return; // Don't proceed if there are conflicts
        }
    }
    
    let invoicesToProcess = [];
    let paymentDate = null;
    
    if (currentSearchOption === 'full') {
        invoicesToProcess = currentInvoices;
        paymentDate = new Date(); // Use current date for full turnover
    } else if (currentSearchOption === 'requested') {
        invoicesToProcess = currentInvoices.filter(inv => selectedInvoices.includes(inv.id));
        paymentDate = new Date(paymentDateInput.value);
    }
    
    const calculations = calculatePaymentDetails(invoicesToProcess, paymentDate);
    displayPreviewModal(calculations, paymentDate);
}

function calculatePaymentDetails(invoices, paymentDate) {
    let totalOriginal = 0;
    let totalDiscount = 0;
    let totalPayment = 0;
    const details = [];
    
    invoices.forEach(invoice => {
        const originalAmount = invoice.fields.Invoice_Amount;
        
        // Calculate days between payment date and due date
        const paymentDateObj = new Date(paymentDate);
        const dueDate = new Date(invoice.fields.Due_Date);
        const diffTime = dueDate.getTime() - paymentDateObj.getTime();
        const daysToDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Calculate discount based on payment date vs due date
        const discountPercent = calculateDiscount(invoice.fields.Due_Date, paymentDate);
        const discountAmount = originalAmount * (discountPercent / 100);
        const paymentAmount = originalAmount - discountAmount;
        
        totalOriginal += originalAmount;
        totalDiscount += discountAmount;
        totalPayment += paymentAmount;
        
        details.push({
            invoiceNumber: invoice.fields.Invoice_Number,
            originalAmount,
            daysToDue,
            discountPercent,
            discountAmount,
            paymentAmount
        });
    });
    
    return {
        totalOriginal,
        totalDiscount,
        totalPayment,
        details
    };
}

function displayPreviewModal(calculations, paymentDate) {
    // Update summary cards
    document.getElementById('original-amount').textContent = `₹${calculations.totalOriginal.toLocaleString()}`;
    document.getElementById('discount-amount').textContent = `₹${calculations.totalDiscount.toLocaleString()}`;
    document.getElementById('payment-amount').textContent = `₹${calculations.totalPayment.toLocaleString()}`;
    document.getElementById('discount-highlight').textContent = `₹${calculations.totalDiscount.toLocaleString()}`;
    document.getElementById('selected-payment-date').textContent = formatDate(paymentDate.toISOString().split('T')[0]);
    
    // Build preview table
    let previewHTML = '';
    calculations.details.forEach(detail => {
        const daysBadgeClass = getDaysToDueBadgeClass(detail.daysToDue);
        const discountBadgeClass = getDiscountBadgeClass(detail.discountPercent);
        
        previewHTML += `
            <tr>
                <td><strong>${detail.invoiceNumber}</strong></td>
                <td>₹${detail.originalAmount.toLocaleString()}</td>
                <td><span class="badge ${daysBadgeClass}">${detail.daysToDue} days</span></td>
                <td><span class="badge ${discountBadgeClass}">${detail.discountPercent}%</span></td>
                <td style="color: #166534; font-weight: 500;">₹${detail.discountAmount.toLocaleString()}</td>
                <td><strong>₹${detail.paymentAmount.toLocaleString()}</strong></td>
            </tr>
        `;
    });
    
    document.getElementById('preview-table-body').innerHTML = previewHTML;
    
    // Store data for submission
    previewModal.previewData = { calculations, paymentDate };
    
    // Show modal
    previewModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

async function handleConfirmSubmit() {
    const { calculations, paymentDate } = previewModal.previewData;
    
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    try {
        if (AIRTABLE_CONFIG.API_KEY === 'YOUR_API_KEY_HERE') {
            // Demo mode - simulate delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            showToast('Demo Mode', 'In real mode, this would update Airtable records', 'success');
        } else {
            // Real Airtable updates
            const invoicesToUpdate = currentSearchOption === 'full' ? currentInvoices : 
                currentInvoices.filter(inv => selectedInvoices.includes(inv.id));
            
            const updatePromises = invoicesToUpdate.map(async (invoice, index) => {
                const response = await fetch(
                    `https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}/${AIRTABLE_CONFIG.TABLE_NAME}/${invoice.id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            fields: {
                                Payment_Option: currentSearchOption === 'full' ? 'Full turnover' : 'Selected by date',
                                Payment_Date: paymentDate.toISOString().split('T')[0],
                                Payment_Amount: calculations.details[index].paymentAmount
                            }
                        })
                    }
                );
                
                if (!response.ok) {
                    throw new Error(`Failed to update invoice ${invoice.fields.Invoice_Number}`);
                }
                
                return response.json();
            });
            
            await Promise.all(updatePromises);
        }
        
        // Close preview modal and show success
        closeModal();
        showSuccessModal();
        
        // Reset form
        resetForm();
        
    } catch (error) {
        console.error('Error updating records:', error);
        showToast('Error', 'Failed to submit request. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm & Submit';
    }
}

function showSuccessModal() {
    successModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    previewModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function closeSuccessModal() {
    successModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function resetForm() {
    vendorIdInput.value = '';
    searchOptionSelect.value = '';
    paymentDateInput.value = '';
    vendorInfo.classList.add('hidden');
    resultsSection.classList.add('hidden');
    hideInfoPopups();
    currentInvoices = [];
    selectedInvoices = [];
    currentSearchOption = '';
    currentVendorName = '';
    validateForm();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${icon}"></i>
            <div>
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}
