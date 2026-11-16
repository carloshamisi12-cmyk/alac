// Initialize Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const totalStudentsEl = document.getElementById('totalStudents');
const totalFeesEl = document.getElementById('totalFees');
const recentActivityEl = document.getElementById('recentActivity');
const currentDateEl = document.getElementById('currentDate');
const dbStatusEl = document.getElementById('dbStatus');

// Set current date
const today = new Date();
currentDateEl.textContent = today.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
});

// Toggle sidebar on mobile
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.querySelector('.sidebar');

if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
    });
}

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        loadDashboardData();
    } else {
        // No user is signed in
        window.location.href = 'index.html';
    }
});

// Load dashboard data
async function loadDashboardData() {
    try {
        // Get total students count
        const studentsSnapshot = await db.collection('students').get();
        const totalStudents = studentsSnapshot.size;
        totalStudentsEl.textContent = totalStudents.toLocaleString();
        
        // Update the students badge in the sidebar if it exists
        const studentsBadge = document.querySelector('#students-link .ml-auto');
        if (studentsBadge) {
            studentsBadge.textContent = totalStudents;
        }

        // Get total fees collected
        let totalFees = 0;
        let totalPayments = 0;
        
        const paymentsSnapshot = await db.collection('payments').get();
        paymentsSnapshot.forEach(doc => {
            const amount = parseFloat(doc.data().amount) || 0;
            totalFees += amount;
            totalPayments++;
        });
        
        // Format the amount with thousands separators
        totalFeesEl.textContent = `Ksh ${totalFees.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        // Update the payments badge if it exists
        const paymentsBadge = document.querySelector('#payments-link .ml-auto');
        if (!paymentsBadge && totalPayments > 0) {
            const paymentsLink = document.getElementById('payments-link');
            if (paymentsLink) {
                const badge = document.createElement('span');
                badge.className = 'ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800';
                badge.textContent = totalPayments;
                paymentsLink.appendChild(badge);
            }
        } else if (paymentsBadge) {
            paymentsBadge.textContent = totalPayments;
        }

        // Update the dashboard stats card
        updateStatsCard('students', totalStudents, 'bg-blue-100 text-blue-800');
        updateStatsCard('fees', totalFees, 'bg-green-100 text-green-800', 'Ksh ');
        
        // Load recent activities
        loadRecentActivities();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

// Update stats card with animation
function updateStatsCard(type, value, badgeClasses, prefix = '') {
    const card = document.querySelector(`#${type}Card`);
    if (!card) return;
    
    const valueEl = card.querySelector('.stat-value');
    const badge = card.querySelector('.stat-badge');
    
    if (valueEl) {
        // Animate the number
        animateValue(valueEl, 0, value, 1000, prefix);
    }
    
    // Add pulse animation to badge if value increased
    if (badge) {
        badge.classList.add('animate-pulse');
        setTimeout(() => {
            badge.classList.remove('animate-pulse');
        }, 1000);
    }
}

// Animate number counting
function animateValue(element, start, end, duration, prefix = '') {
    const range = end - start;
    const minFrameTime = 50; // 50ms per frame
    const totalFrames = Math.ceil(duration / minFrameTime);
    let current = start;
    const increment = range / totalFrames;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        
        // Format the number based on its type
        let displayValue;
        if (prefix === 'Ksh ') {
            displayValue = prefix + Math.round(current).toLocaleString('en-US');
        } else {
            displayValue = Math.round(current).toLocaleString('en-US');
        }
        
        element.textContent = displayValue;
    }, minFrameTime);
}

// Load recent activities
async function loadRecentActivities() {
    try {
        const activities = [];
        
        // Get recent payments
        const paymentsQuery = await db.collection('payments')
            .orderBy('paymentDate', 'desc')
            .limit(5)
            .get();

        paymentsQuery.forEach(doc => {
            const data = doc.data();
            activities.push({
                type: 'payment',
                id: doc.id,
                ...data,
                timestamp: data.paymentDate?.toDate() || new Date()
            });
        });

        // Sort activities by timestamp
        activities.sort((a, b) => b.timestamp - a.timestamp);

        // Display activities
        displayActivities(activities);
        
    } catch (error) {
        console.error('Error loading activities:', error);
        recentActivityEl.innerHTML = `
            <div class="text-red-500 text-sm">
                <i class="fas fa-exclamation-circle mr-1"></i>
                Failed to load recent activities
            </div>
        `;
    }
}

// Display activities in the UI
function displayActivities(activities) {
    if (activities.length === 0) {
        recentActivityEl.innerHTML = `
            <div class="text-gray-500 text-center py-4">
                No recent activities found
            </div>
        `;
        return;
    }

    const activityHtml = activities.map(activity => {
        const timeAgo = getTimeAgo(activity.timestamp);
        
        if (activity.type === 'payment') {
            return `
                <div class="flex items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div class="bg-green-100 p-2 rounded-full mr-3">
                        <i class="fas fa-money-bill-wave text-green-600"></i>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between">
                            <p class="font-medium text-gray-800">Payment Received</p>
                            <span class="text-xs text-gray-500">${timeAgo}</span>
                        </div>
                        <p class="text-sm text-gray-600">
                            Ksh ${activity.amount?.toLocaleString()} paid by ${activity.studentName || 'a student'}
                        </p>
                        <div class="text-xs text-gray-500 mt-1">
                            <span class="inline-block bg-gray-100 px-2 py-0.5 rounded">${activity.paymentMethod || 'N/A'}</span>
                            <span class="inline-block bg-gray-100 px-2 py-0.5 rounded ml-1">${activity.receiptNumber || ''}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return '';
    }).join('');

    recentActivityEl.innerHTML = activityHtml || `
        <div class="text-gray-500 text-center py-4">
            No recent activities to display
        </div>
    `;
}

// Helper function to format time ago
function getTimeAgo(timestamp) {
    if (!(timestamp instanceof Date)) {
        timestamp = timestamp.toDate();
    }
    
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }
    
    return 'just now';
}

// Show notification function
function showNotification(message, type = 'success') {
    // You can implement a toast notification system here
    // For now, we'll use a simple alert
    alert(`${type.toUpperCase()}: ${message}`);
}

// Logout function
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
        showNotification('Failed to sign out', 'error');
    });
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add any additional event listeners here
    
    // Example: Add logout button click handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});
