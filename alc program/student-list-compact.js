// Wait for DOM and Firebase to be ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Firebase
        if (window.initFirebase) {
            await window.initFirebase();
        } else {
            throw new Error('Firebase initialization failed: initFirebase not found');
        }
        
        // Make sure Firebase services are available
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firebase services not properly initialized');
        }
        
        // DOM Elements
        const studentsContainer = document.getElementById('studentsContainer');
        const searchInput = document.getElementById('searchInput');
        const classFilter = document.getElementById('classFilter');
        const termFilter = document.getElementById('termFilter');
        
        // Current selected term
        let currentTerm = termFilter.value;
        
        // Fetch students from Firestore
        async function fetchStudents() {
            try {
                console.log('Fetching students from Firestore...');
                const studentsSnapshot = await db.collection('students').get();
                const students = [];
                
                studentsSnapshot.forEach(doc => {
                    const studentData = doc.data();
                    console.log('Raw student data:', { id: doc.id, ...studentData });
                    
                    // Create a clean student object with default values
                    const student = {
                        id: doc.id,
                        name: 'N/A',
                        admissionNumber: 'N/A',
                        class: 'N/A',
                        section: 'N/A',
                        gender: 'N/A',
                        dob: null,
                        dateOfAdmission: null,
                        feeStatus: 'Pending',
                        // Add any other default fields here
                    };
                    
                    // Merge with actual data from Firestore
                    Object.assign(student, studentData);
                    
                    // Special handling for name to check multiple possible fields
                    if (!student.name || student.name === 'N/A') {
                        student.name = student.fullName || 
                                     `${student.firstName || ''} ${student.lastName || ''}`.trim() || 
                                     'N/A';
                    }
                    
                    // Ensure required fields have values
                    student.name = student.name || 'N/A';
                    student.admissionNumber = student.admissionNumber || student.admissionNo || 'N/A';
                    student.class = student.class || student.grade || 'N/A';
                    student.section = student.section || 'N/A';
                    student.gender = student.gender || 'N/A';
                    student.dob = student.dob || student.dateOfBirth || null;
                    student.joinDate = student.dateOfAdmission || student.joinDate || null;
                    student.feeStatus = student.feeStatus || 'Pending';
                    
                    // Ensure billingOptions exists and has the correct structure
                    if (studentData.billingOptions) {
                        student.billingOptions = studentData.billingOptions;
                    } else {
                        // If no billingOptions, create a default one with schoolFee enabled
                        student.billingOptions = {
                            schoolFee: true,
                            transport: false,
                            lunch: false,
                            admissionFee: true
                        };
                    }
                    
                    console.log('Processed student:', student);
                    students.push(student);
                });
                
                console.log('Fetched students:', students);
                displayStudents(students);
            } catch (error) {
                console.error('Error fetching students:', error);
                showNotification('Error loading student data. Please try again.', 'error');
            }
        }

        // Display students in the UI
        function displayStudents(students) {
            console.log('Displaying students:', students);
            studentsContainer.innerHTML = '';
            const searchTerm = searchInput.value.toLowerCase();
            const selectedClass = classFilter.value;
            currentTerm = termFilter.value; // Update current term

            // Get unique classes for filter dropdown
            const uniqueClasses = [...new Set(students.map(s => s.class).filter(Boolean))].sort();
            updateClassFilter(uniqueClasses);

            const filteredStudents = students
                .filter(student => {
                    const searchFields = [
                        student.name?.toLowerCase(),
                        student.admissionNumber?.toLowerCase(),
                        student.class?.toLowerCase(),
                        student.section?.toLowerCase()
                    ].filter(Boolean).join(' ');
                    
                    const matchesSearch = searchFields.includes(searchTerm);
                    const matchesClass = !selectedClass || student.class === selectedClass;
                    
                    return matchesSearch && matchesClass;
                })
                .sort((a, b) => {
                    // Sort by class, then by name
                    if (a.class !== b.class) {
                        return a.class.localeCompare(b.class);
                    }
                    return a.name?.localeCompare(b.name) || 0;
                });

            console.log('Filtered students:', filteredStudents);

            if (filteredStudents.length === 0) {
                studentsContainer.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-user-graduate"></i>
                        <p>No students found matching your criteria</p>
                    </div>
                `;
                return;
            }

            filteredStudents.forEach((student, index) => {
                const studentCard = createStudentCard(student, index);
                studentsContainer.appendChild(studentCard);
            });
        }

        // Update class filter dropdown
        function updateClassFilter(classes) {
            // Clear existing options except the first one
            while (classFilter.options.length > 1) {
                classFilter.remove(1);
            }
            
            // Add new class options
            classes.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                classFilter.appendChild(option);
            });
        }

        // Create a student card element
        function createStudentCard(student, index) {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.style.animationDelay = `${index * 0.1}s`;
            
            // Format dates
            const formatDate = (dateString) => {
                if (!dateString) return 'N/A';
                try {
                    const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                } catch (e) {
                    console.error('Error formatting date:', dateString, e);
                    return 'N/A';
                }
            };

            const formattedDob = formatDate(student.dob);
            const formattedJoinDate = formatDate(student.joinDate || student.dateOfAdmission);
            
            // Determine fee status
            const feeStatus = student.feeStatus || 'Pending';
            const feeStatusClass = feeStatus.toLowerCase() === 'paid' ? 'status-paid' : 'status-pending';
            
            // Generate billing information HTML
            let billingInfoHtml = '';
            const billingItems = [];
            const className = student.class || 'PG';
            const term = currentTerm || 'Term 1'; // Use selected term or default to Term 1
            
            // Debug log to check student data
            console.log('Student data for billing:', {
                id: student.id,
                name: student.name,
                class: className,
                billingOptions: student.billingOptions,
                feeStructure: window.feeStructure
            });
            
            // School Fee
            if (student.billingOptions?.schoolFee) {
                const schoolFee = window.feeStructure?.schoolFees?.[term]?.[className] || 0;
                console.log('School fee:', { className, term, schoolFee });
                billingItems.push({
                    name: 'School Fee',
                    description: `School fee for ${className} (${term})`,
                    amount: schoolFee
                });
            }
            
            // Transport
            if (student.billingOptions?.transport && student.billingOptions?.transportLocation) {
                const transportFee = window.feeStructure?.transportFees?.[term]?.[student.billingOptions.transportLocation] || 0;
                console.log('Transport fee:', { location: student.billingOptions.transportLocation, transportFee });
                billingItems.push({
                    name: 'Transport',
                    description: `Transport fee for ${student.billingOptions.transportLocation}`,
                    amount: transportFee
                });
            }
            
            // Lunch
            if (student.billingOptions?.lunch) {
                const lunchFee = window.feeStructure?.lunchFees?.[term] || 0;
                console.log('Lunch fee:', lunchFee);
                billingItems.push({
                    name: 'Lunch',
                    description: 'Lunch fee',
                    amount: lunchFee
                });
            }
            
            // Admission Fee (only for Term 1)
            if (student.billingOptions?.admissionFee && term === 'Term 1') {
                const admissionFee = window.feeStructure?.otherFees?.[term]?.['Admission Fee'] || 0;
                console.log('Admission fee:', admissionFee);
                billingItems.push({
                    name: 'Admission Fee',
                    description: 'Admission Fee',
                    amount: admissionFee
                });
            }
            
            // Build billing info HTML if there are any items
            if (billingItems.length > 0) {
                const totalAmount = billingItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                
                billingInfoHtml = `
                    <div class="billing-card">
                        <div class="billing-header">
                            <h3 class="billing-title">
                                <i class="fas fa-file-invoice"></i>
                                Billing Summary
                            </h3>
                            <span class="billing-term">${term}</span>
                        </div>
                        <div class="billing-items">
                            ${billingItems.map(item => `
                                <div class="billing-item">
                                    <div class="item-details">
                                        <div class="item-name">
                                            ${item.name}
                                            <span class="item-amount">Ksh ${parseFloat(item.amount).toLocaleString('en-US')}</span>
                                        </div>
                                        <div class="item-description">${item.description}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="billing-total">
                            <span>Total Amount:</span>
                            <span class="total-amount">Ksh ${totalAmount.toLocaleString('en-US')}</span>
                        </div>
                    </div>
                `;
                
                console.log('Generated billing HTML for student:', student.id, billingInfoHtml);
            } else {
                console.log('No billing items found for student:', student.id);
            }
            
            card.innerHTML = `
                <div class="student-header">
                    <div class="header-top">
                        <div class="student-name-container">
                            <h3 class="student-name">
                                ${student.name || 'N/A'}
                            </h3>
                            <span class="admission-badge">
                                <i class="fas fa-id-card"></i>
                                ${student.admissionNumber || student.id || 'N/A'}
                            </span>
                        </div>
                        <span class="student-status ${feeStatusClass}">
                            ${feeStatus}
                        </span>
                    </div>
                    <div class="parent-info">
                        <div class="parent-detail">
                            <i class="fas fa-user-friends"></i>
                            <span>${student.parentName || 'Parent: N/A'}</span>
                        </div>
                        <div class="parent-detail">
                            <i class="fas fa-phone"></i>
                            <span>${student.parentPhone || 'Phone: N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="student-body">
                    <div class="student-billing">
                        ${billingInfoHtml}
                    </div>
                </div>
                <div class="student-footer">
                    <span class="class-badge">${student.class || 'N/A'}</span>
                    <div class="action-buttons">
                        <!-- Billing Dropdown -->
                        <div class="relative inline-block text-left">
                            <button type="button" class="btn btn-billing" onclick="toggleBillingMenu('${student.id}')">
                                <i class="fas fa-money-bill-wave"></i>
                                <i class="fas fa-chevron-down ml-1 text-xs"></i>
                            </button>
                            <div id="billing-menu-${student.id}" class="hidden absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10">
                                <div class="py-1" role="menu" aria-orientation="vertical">
                                    <a href="fee-payment.html?studentId=${student.id}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                                        <i class="fas fa-money-bill-wave mr-2"></i> Make Payment
                                    </a>
                                    <a href="fee-statement.html?studentId=${student.id}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                                        <i class="fas fa-file-invoice-dollar mr-2"></i> View Statement
                                    </a>
                                    <a href="fee-history.html?studentId=${student.id}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                                        <i class="fas fa-history mr-2"></i> Payment History
                                    </a>
                                    <div class="border-t border-gray-100"></div>
                                    <a href="fee-waiver.html?studentId=${student.id}" class="block px-4 py-2 text-sm text-yellow-600 hover:bg-gray-100" role="menuitem">
                                        <i class="fas fa-hand-holding-usd mr-2"></i> Apply Waiver
                                    </a>
                                </div>
                            </div>
                        </div>
                        
                        <a href="student-registration.html?edit=true&admissionNumber=${encodeURIComponent(student.admissionNumber || '')}" class="btn btn-edit">
                            <i class="fas fa-edit"></i>
                        </a>
                        <button class="btn btn-delete" onclick="deleteStudent('${student.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            return card;
        }

        // Search and filter functionality
        searchInput.addEventListener('input', () => {
            fetchStudents().catch(console.error);
        });

        classFilter.addEventListener('change', () => {
            fetchStudents().catch(console.error);
        });
        
        termFilter.addEventListener('change', () => {
            fetchStudents().catch(console.error);
        });

        // Toggle billing menu
        window.toggleBillingMenu = (studentId) => {
            const menu = document.getElementById(`billing-menu-${studentId}`);
            if (menu) {
                menu.classList.toggle('hidden');
                // Close other open menus
                document.querySelectorAll('.billing-menu').forEach(otherMenu => {
                    if (otherMenu.id !== `billing-menu-${studentId}`) {
                        otherMenu.classList.add('hidden');
                    }
                });
            }
        };

        // Close billing menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-billing') && !e.target.closest('.billing-menu')) {
                document.querySelectorAll('.billing-menu').forEach(menu => {
                    menu.classList.add('hidden');
                });
            }
        });

        // Global functions for button actions
        window.editStudent = (studentId) => {
            console.log('Edit student:', studentId);
            // Redirect to edit page with student ID
            window.location.href = `edit-student.html?id=${studentId}`;
        };

        window.deleteStudent = async (studentId) => {
            if (confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
                try {
                    await db.collection('students').doc(studentId).delete();
                    showNotification('Student deleted successfully', 'success');
                    await fetchStudents();
                } catch (error) {
                    console.error('Error deleting student:', error);
                    showNotification('Error deleting student. Please try again.', 'error');
                }
            }
        };

        // Initial fetch
        await fetchStudents();

        // Set up real-time listener
        db.collection('students').onSnapshot(snapshot => {
            console.log('Real-time update received');
            fetchStudents().catch(console.error);
        }, error => {
            console.error('Error setting up real-time listener:', error);
        });

    } catch (error) {
        console.error('Initialization error:', error);
        const errorMessage = error.message || 'Failed to initialize the application';
        document.getElementById('studentsContainer').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${errorMessage}</p>
                <p class="text-sm mt-2">Please check your internet connection and refresh the page.</p>
                <button onclick="window.location.reload()" class="retry-btn">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
    }
});
