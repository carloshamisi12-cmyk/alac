// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize Firebase using the centralized configuration
        const { db, auth } = await initFirebase();
        
        // Initialize payment method buttons
        document.querySelectorAll('.payment-method-btn').forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('.payment-method-btn').forEach(btn => {
                    btn.classList.remove('bg-blue-100', 'border-blue-300', 'text-blue-700');
                    btn.classList.add('bg-white', 'border-gray-200', 'text-gray-700');
                });
                
                // Add active class to clicked button
                this.classList.remove('bg-white', 'border-gray-200', 'text-gray-700');
                this.classList.add('bg-blue-100', 'border-blue-300', 'text-blue-700');
                
                // Update hidden input value
                const method = this.dataset.method;
                document.getElementById('paymentMethod').value = method;
            });
        });
        
        // Set first payment method as active by default
        const firstMethodBtn = document.querySelector('.payment-method-btn');
        if (firstMethodBtn) {
            firstMethodBtn.click();
        }
        
        // Format amount input
        const amountInput = document.getElementById('amount');
        if (amountInput) {
            // Format the display value with commas
            amountInput.addEventListener('input', function(e) {
                // Store the cursor position and non-digit characters
                const cursorPosition = this.selectionStart;
                const originalValue = this.value;
                
                // Remove all non-digit characters and leading zeros
                let value = this.value.replace(/\D/g, '').replace(/^0+/, '') || '0';
                
                // Store the raw numeric value
                this.dataset.numericValue = value;
                
                // Format with commas for thousands
                const numericValue = BigInt(value || '0');
                const formattedValue = numericValue.toLocaleString('en-US');
                
                // Update the input value
                this.value = formattedValue;
                
                // Adjust cursor position
                const diff = formattedValue.length - originalValue.length;
                const newPosition = Math.max(0, cursorPosition + diff);
                this.setSelectionRange(newPosition, newPosition);
            });
            
            // Initialize the numeric value
            amountInput.dataset.numericValue = '0';
        }
        
        // Current selected student
        let selectedStudent = null;
        
        // Initialize UI elements
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const searchResults = document.getElementById('searchResults');
        const paymentForm = document.getElementById('paymentForm');
        const receipt = document.getElementById('receipt');
        const printReceiptBtn = document.getElementById('printReceipt');
        const newPaymentBtn = document.getElementById('newPayment');
        const cancelPaymentBtn = document.getElementById('cancelPayment');
        const paymentFormContainer = document.getElementById('paymentFormContainer');
        const paymentFormElement = document.getElementById('paymentForm');
        
        // Debug log for missing elements (non-blocking)
        const requiredElements = {
            searchInput: !!searchInput,
            searchBtn: !!searchBtn,
            searchResults: !!searchResults,
            paymentForm: !!paymentForm,
            paymentFormContainer: !!paymentFormContainer,
            receipt: !!receipt,
            printReceiptBtn: !!printReceiptBtn,
            newPaymentBtn: !!newPaymentBtn,
            cancelPaymentBtn: !!cancelPaymentBtn,
            paymentFormElement: !!paymentFormElement
        };
        
        console.log('UI Elements Status:', requiredElements);

        // Event Listeners Setup
        function setupEventListeners() {
            // Search button click
            if (searchBtn) {
                searchBtn.removeEventListener('click', searchStudents); // Remove existing to prevent duplicates
                searchBtn.addEventListener('click', searchStudents);
            }
            
            // Search input enter key
            if (searchInput) {
                searchInput.removeEventListener('keypress', handleSearchKeyPress); // Remove existing
                searchInput.addEventListener('keypress', handleSearchKeyPress);
            }
            
            // Payment form submission
            if (paymentFormElement) {
                paymentFormElement.removeEventListener('submit', handlePaymentSubmit);
                paymentFormElement.addEventListener('submit', handlePaymentSubmit);
            }
            
            // Cancel payment button
            if (cancelPaymentBtn) {
                cancelPaymentBtn.removeEventListener('click', resetForm);
                cancelPaymentBtn.addEventListener('click', resetForm);
            }
            
            // Print receipt button
            if (printReceiptBtn) {
                printReceiptBtn.removeEventListener('click', printReceiptFunc);
                printReceiptBtn.addEventListener('click', printReceiptFunc);
            }
            
            // New payment button (in receipt)
            if (newPaymentBtn) {
                newPaymentBtn.removeEventListener('click', resetForm);
                newPaymentBtn.addEventListener('click', resetForm);
            }
        }
        
        // Helper functions for event listeners
        function handleSearchKeyPress(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchStudents();
            }
        }
        
        function handlePaymentSubmit(e) {
            e.preventDefault();
            processPayment(e);
        }
        
        // Initialize event listeners
        setupEventListeners();
        
        // Initialize date picker for the receipt with today's date as default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('paymentDate').value = today;
        
        // Handle payment method selection
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('.payment-method-btn').forEach(b => {
                    b.classList.remove('bg-blue-100', 'border-blue-500', 'text-blue-700');
                    b.classList.add('bg-gray-100', 'border-gray-300', 'text-gray-800');
                });
                
                // Add active class to clicked button
                this.classList.remove('bg-gray-100', 'border-gray-300', 'text-gray-800');
                this.classList.add('bg-blue-100', 'border-blue-500', 'text-blue-700');
                
                // Update hidden input
                document.getElementById('paymentMethod').value = this.dataset.method;
            });
        });
        
        // Set MPESA as default selected payment method
        document.querySelector('.payment-method-btn[data-method="MPESA"]').click();
        
        // Initialize date picker for the receipt
        const receiptDate = document.getElementById('receiptDate');
        if (receiptDate) {
            receiptDate.textContent = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        // Generate a random receipt number
        function generateReceiptNumber() {
            return 'RCPT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        }

        // Search for students with multiple fields
        async function searchStudents() {
            const searchTerm = searchInput.value.trim();
            if (!searchTerm) {
                showNotification('Please enter a search term', 'warning');
                return;
            }
            
            try {
                // Show loading state
                if (searchResults) {
                    searchResults.innerHTML = `
                        <div class="flex justify-center items-center p-4">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span class="ml-2 text-gray-600">Searching...</span>
                        </div>`;
                }
                
                // Search across multiple fields using OR queries
                const studentsRef = db.collection('students');
                const nameQuery = studentsRef.where('fullName', '>=', searchTerm)
                                          .where('fullName', '<=', searchTerm + '\uf8ff')
                                          .limit(5);
                
                const admissionQuery = studentsRef.where('admissionNumber', '>=', searchTerm)
                                              .where('admissionNumber', '<=', searchTerm + '\uf8ff')
                                              .limit(5);
                
                // Execute queries
                const [nameResults, admissionResults] = await Promise.all([
                    nameQuery.get(),
                    admissionQuery.get()
                ]);
                
                // Combine and deduplicate results
                const allResults = [];
                const seenIds = new Set();
                
                [...nameResults.docs, ...admissionResults.docs].forEach(doc => {
                    if (!seenIds.has(doc.id)) {
                        seenIds.add(doc.id);
                        allResults.push({ id: doc.id, ...doc.data() });
                    }
                });
                
                // Display results
                displaySearchResults(allResults);
                
            } catch (error) {
                console.error('Error searching students:', error);
                showNotification('Error searching students. Please try again.', 'error');
                if (searchResults) {
                    searchResults.innerHTML = `
                        <div class="bg-red-50 border-l-4 border-red-500 p-4">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-exclamation-circle text-red-500"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-red-700">Error loading search results. Please try again.</p>
                                </div>
                            </div>
                        </div>`;
                }
            }
        }

        function displaySearchResults(students) {
            if (!searchResults) return;
            
            if (!students || students.length === 0) {
                searchResults.innerHTML = `
                    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <i class="fas fa-info-circle text-yellow-400"></i>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm text-yellow-700">No students found. Try a different search term.</p>
                            </div>
                        </div>
                    </div>`;
                return;
            }
            
            let resultsHTML = `
                <div class="space-y-3">
                    <div class="text-sm text-gray-500 mb-2">Found ${students.length} student(s)</div>
                    <div class="space-y-2">`;
            
            students.forEach(student => {
                resultsHTML += `
                    <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="font-medium text-gray-900">${student.fullName || 'N/A'}</h3>
                                <div class="mt-1 text-sm text-gray-500">
                                    <div>Admission: ${student.admissionNumber || 'N/A'}</div>
                                    <div>Class: ${student.className || student.class || 'N/A'}</div>
                                </div>
                            </div>
                            <button class="select-student bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200" 
                                    data-student='${JSON.stringify(student)}'>
                                Select
                            </button>
                        </div>
                    </div>`;
            });
            
            resultsHTML += `
                    </div>
                </div>`;
            
            searchResults.innerHTML = resultsHTML;
            
            // Add event listeners to select buttons
            document.querySelectorAll('.select-student').forEach(button => {
                button.addEventListener('click', (e) => {
                    const student = JSON.parse(e.target.dataset.student);
                    selectStudent(student);
                });
            });
            
            // Auto-select if there's only one result
            if (students.length === 1) {
                selectStudent(students[0]);
            }
        }

        function selectStudent(student) {
            if (!student) return;
            
            selectedStudent = student;
            
            // Update student info in the form
            const studentName = document.getElementById('studentName');
            const studentClass = document.getElementById('className');
            const amountInput = document.getElementById('amount');
            const feeTypeSelect = document.getElementById('feeType');
            
            if (studentName) studentName.value = student.fullName || 'N/A';
            if (studentClass) studentClass.value = student.className || student.class || 'N/A';
            
            // Set focus to amount input
            if (amountInput) {
                setTimeout(() => {
                    amountInput.focus();
                }, 100);
            }
            
            // Show payment form and hide search
            const searchSection = document.querySelector('.card:first-child');
            const paymentFormContainer = document.getElementById('paymentFormContainer');
            
            if (searchSection) searchSection.classList.add('hidden');
            if (paymentFormContainer) {
                paymentFormContainer.classList.remove('hidden');
                paymentFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Add a slight delay for the animation
                setTimeout(() => {
                    paymentFormContainer.classList.add('opacity-100');
                }, 10);
            }
            
            // Show success notification
            showNotification(`Selected student: ${student.fullName}`, 'success');
            
            // Load payment history if student has an ID
            if (student.id) {
                loadPaymentHistory(student.id);
            }
        }

        async function loadPaymentHistory(studentId) {
            try {
                const paymentsRef = db.collection('payments')
                    .where('studentId', '==', studentId)
                    .orderBy('paymentDate', 'desc');
                
                const snapshot = await paymentsRef.get();
                const paymentsList = document.getElementById('paymentsList');
                
                if (snapshot.empty) {
                    paymentsList.innerHTML = '<li>No payment history found</li>';
                    return;
                }
                
                let paymentsHTML = '';
                snapshot.forEach(doc => {
                    const payment = doc.data();
                    paymentsHTML += `
                        <li>
                            ${payment.amount} KES - ${payment.term} (${payment.paymentDate?.toDate().toLocaleDateString()})
                        </li>
                    `;
                });
                
                paymentsList.innerHTML = paymentsHTML;
            } catch (error) {
                console.error('Error loading payment history:', error);
            }
        }

        async function processPayment(e) {
            e.preventDefault();
            
            if (!selectedStudent) {
                showNotification('Please select a student first', 'error');
                return;
            }
            
            // Get form values
            const amountInput = document.getElementById('amount');
            const amount = parseFloat(amountInput.dataset.numericValue || amountInput.value.replace(/\D/g, ''));
            const paymentMethod = document.getElementById('paymentMethod').value;
            const term = document.getElementById('term').value;
            const paymentDate = document.getElementById('paymentDate').value;
            const receiptNumber = generateReceiptNumber();
            
            // Validate payment date
            if (!paymentDate) {
                showNotification('Please select a payment date', 'error');
                return;
            }
            
            if (isNaN(amount) || amount <= 0) {
                showNotification('Please enter a valid amount', 'error');
                return;
            }
            
            // Allow any positive amount, even if it exceeds the current balance
            
            try {
                const paymentData = {
                    studentId: selectedStudent.id,
                    studentName: selectedStudent.fullName,
                    admissionNumber: selectedStudent.admissionNumber,
                    className: selectedStudent.class,
                    amount: amount,
                    paymentMethod: paymentMethod,
                    term: term,
                    receiptNumber: receiptNumber,
                    paymentDate: new Date(paymentDate),
                    recordedBy: auth.currentUser?.uid || 'system',
                    recordedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Start a batch write to update both payment and student records
                const batch = db.batch();
                
                // 1. Add payment to payments collection
                const paymentRef = db.collection('payments').doc();
                batch.set(paymentRef, paymentData);
                
                // 2. Update student's payment status and balance
                const studentRef = db.collection('students').doc(selectedStudent.id);
                const studentDoc = await studentRef.get();
                const studentData = studentDoc.data();
                
                // Get current term billing or initialize if not exists
                const termBilling = studentData.termBilling || {};
                const currentTermData = termBilling[term] || { fee: 0, paid: 0, balance: 0 };
                
                // Calculate new paid amount and balance
                const newPaid = (parseFloat(currentTermData.paid) || 0) + amount;
                const newBalance = (parseFloat(currentTermData.fee) || 0) - newPaid;
                
                // Update paid amount and recalculate balance
                // Update term billing data
                batch.update(studentRef, {
                    [`termBilling.${term}`]: {
                        ...currentTermData,
                        paid: newPaid,
                        balance: newBalance,
                        lastPaymentDate: firebase.firestore.FieldValue.serverTimestamp(),
                        lastPaymentAmount: amount
                    },
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Commit the batch
                await batch.commit();
                
                // Show receipt
                showReceipt(paymentData);
                
                // Reset form
                e.target.reset();
                
                // Show success message
                showNotification('Payment processed successfully!', 'success');
                
                // Reload the student data to reflect changes
                if (searchInput.value.trim()) {
                    await searchStudents();
                }
                
            } catch (error) {
                console.error('Error processing payment:', error);
                showNotification('Failed to process payment: ' + error.message, 'error');
            }
        }
        
        function showReceipt(paymentData) {
            // Update receipt details
            const receiptNumber = document.getElementById('receiptNumber');
            const receiptDate = document.getElementById('receiptDate');
            const receiptStudent = document.getElementById('receiptStudent');
            const receiptClass = document.getElementById('receiptClass');
            const receiptTerm = document.getElementById('receiptTerm');
            const receiptAmount = document.getElementById('receiptAmount');
            const receiptMethod = document.getElementById('receiptMethod');
            
            if (receiptNumber) receiptNumber.textContent = paymentData.receiptNumber || 'N/A';
            if (receiptDate) receiptDate.textContent = new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            if (receiptStudent) receiptStudent.textContent = paymentData.studentName || 'N/A';
            if (receiptClass) receiptClass.textContent = paymentData.className || paymentData.class || 'N/A';
            if (receiptTerm) receiptTerm.textContent = paymentData.term || 'N/A';
            if (receiptAmount) receiptAmount.textContent = paymentData.amount ? `KES ${parseFloat(paymentData.amount).toLocaleString()}` : 'KES 0';
            if (receiptMethod) receiptMethod.textContent = paymentData.paymentMethod || 'N/A';
            
            // Show receipt and hide payment form
            const paymentFormContainer = document.getElementById('paymentFormContainer');
            const receipt = document.getElementById('receipt');
            
            if (paymentFormContainer) {
                paymentFormContainer.classList.add('hidden');
            }
            
            if (receipt) {
                receipt.classList.remove('hidden');
                receipt.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Add animation
                receipt.classList.add('fade-in');
            }
        }
        
        function printReceiptFunc() {
            window.print();
        }
        
        function resetForm() {
            // Reset form
            const paymentForm = document.getElementById('paymentForm');
            const paymentFormContainer = document.getElementById('paymentFormContainer');
            if (paymentForm) {
                paymentForm.reset();
            }
            if (paymentFormContainer) {
                paymentFormContainer.classList.add('hidden');
            }
            
            // Clear search results
            const searchResults = document.getElementById('searchResults');
            if (searchResults) searchResults.innerHTML = '';
            
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            
            // Reset selected student
            selectedStudent = null;
            
            // Show search section and hide receipt
            const searchSection = document.querySelector('.card:first-child');
            const receipt = document.getElementById('receipt');
            
            if (searchSection) {
                searchSection.classList.remove('hidden');
                searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            if (receipt) {
                receipt.classList.add('hidden');
            }
        }
        
        function showNotification(message, type = 'info') {
            // Create notification container if it doesn't exist
            let notificationContainer = document.getElementById('notification-container');
            if (!notificationContainer) {
                notificationContainer = document.createElement('div');
                notificationContainer.id = 'notification-container';
                notificationContainer.className = 'fixed top-4 right-4 z-50 space-y-3 w-80';
                document.body.appendChild(notificationContainer);
            }
            
            // Map notification types to Tailwind classes
            const typeClasses = {
                success: 'bg-green-50 border-green-400 text-green-800',
                error: 'bg-red-50 border-red-400 text-red-800',
                warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
                info: 'bg-blue-50 border-blue-400 text-blue-800'
            };
            
            const iconClasses = {
                success: 'text-green-400',
                error: 'text-red-400',
                warning: 'text-yellow-400',
                info: 'text-blue-400'
            };
            
            const iconMap = {
                success: 'check-circle',
                error: 'exclamation-circle',
                warning: 'exclamation-triangle',
                info: 'info-circle'
            };
            
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification border-l-4 p-4 rounded shadow-lg ${typeClasses[type] || typeClasses.info} animate-fade-in`;
            notification.role = 'alert';
            
            notification.innerHTML = `
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="fas fa-${iconMap[type] || 'info-circle'} ${iconClasses[type] || iconClasses.info} text-lg"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium">${message}</p>
                    </div>
                    <div class="ml-auto pl-3">
                        <div class="-mx-1.5 -my-1.5">
                            <button type="button" class="close-btn inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${type === 'error' ? 'text-red-500 hover:bg-red-100 focus:ring-red-600' : 
                                type === 'success' ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' : 
                                type === 'warning' ? 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600' : 
                                'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'}">
                                <span class="sr-only">Dismiss</span>
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            
            // Add to container
            notificationContainer.appendChild(notification);
            
            // Auto-remove after 5 seconds
            const removeNotification = () => {
                notification.classList.remove('animate-fade-in');
                notification.classList.add('animate-fade-out');
                setTimeout(() => {
                    if (notification.parentNode === notificationContainer) {
                        notificationContainer.removeChild(notification);
                    }
                }, 300);
            };
            
            // Add click handler to close button
            const closeBtn = notification.querySelector('.close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', removeNotification);
            }
            
            // Auto-dismiss after delay
            const timeoutId = setTimeout(removeNotification, 5000);
            
            // Pause auto-dismiss on hover
            notification.addEventListener('mouseenter', () => {
                clearTimeout(timeoutId);
            });
            
            notification.addEventListener('mouseleave', () => {
                if (!notification.matches(':hover')) {
                    removeNotification();
                }
            });
        }
        
        // Initialize the form
        resetForm();
        
    } catch (error) {
        console.error('Error initializing payment form:', error);
        // Show error to user
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="error-container p-4 bg-red-50 border-l-4 border-red-400">
                    <h2 class="text-lg font-medium text-red-800">Error Initializing Application</h2>
                    <p class="text-sm text-red-700 mt-1">${error.message}</p>
                    <p class="text-sm text-red-600 mt-2">Please refresh the page or contact support if the problem persists.</p>
                </div>`;
        }
    }
});
