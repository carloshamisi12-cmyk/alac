/**
 * Fee Balances Module
 * Handles fee balance calculations and related functionality
 */

// Calculate total fees for a student for a specific term
function calculateTotalFees(student, term) {
    if (!student || !term) return 0;
    
    try {
        const fees = getStudentFees(student, term);
        return fees.reduce((total, fee) => total + (parseFloat(fee.amount) || 0), 0);
    } catch (error) {
        console.error('Error calculating total fees:', error);
        return 0;
    }
}

// Calculate total payments for a student for a specific term
function calculateTotalPayments(student, term) {
    if (!student || !term || !Array.isArray(student.payments)) return 0;
    
    try {
        return student.payments
            .filter(payment => payment.term === term && !payment.isCarryForward)
            .reduce((total, payment) => total + (parseFloat(payment.amountPaid) || 0), 0);
    } catch (error) {
        console.error('Error calculating total payments:', error);
        return 0;
    }
}

// Calculate carry forward amount from previous terms
function calculateCarryForward(student, term) {
    if (!student || !term || !Array.isArray(student.payments)) return 0;
    
    try {
        const carryForward = student.payments
            .find(p => p.term === term && p.isCarryForward);
            
        return carryForward ? (parseFloat(carryForward.amountPaid) || 0) : 0;
    } catch (error) {
        console.error('Error calculating carry forward:', error);
        return 0;
    }
}

// Calculate current balance for a student for a specific term
function calculateCurrentBalance(student, term) {
    if (!student || !term) return 0;
    
    try {
        const totalFees = calculateTotalFees(student, term);
        const totalPayments = calculateTotalPayments(student, term);
        const carryForward = calculateCarryForward(student, term);
        
        return Math.max(0, totalFees - (totalPayments + carryForward));
    } catch (error) {
        console.error('Error calculating current balance:', error);
        return 0;
    }
}

// Get fee summary for a student for a specific term
function getFeeSummary(student, term) {
    if (!student || !term) return null;
    
    try {
        const totalFees = calculateTotalFees(student, term);
        const totalPayments = calculateTotalPayments(student, term);
        const carryForward = calculateCarryForward(student, term);
        const currentBalance = calculateCurrentBalance(student, term);
        
        return {
            studentId: student.id,
            admissionNumber: student.admissionNumber,
            fullName: student.fullName,
            className: student.className || student.class || 'Not Assigned',
            term,
            totalFees,
            totalPayments,
            carryForward,
            currentBalance,
            feeItems: getStudentFees(student, term),
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error generating fee summary:', error);
        return null;
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(amount);
}

// Export functions for use in other modules
window.FeeBalances = {
    calculateTotalFees,
    calculateTotalPayments,
    calculateCarryForward,
    calculateCurrentBalance,
    getFeeSummary,
    formatCurrency
};

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Fee Balances module initialized');
});
