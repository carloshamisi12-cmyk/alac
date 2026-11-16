// This script should be included in all pages to check portal access

// Portal IDs (should match those in portal-management.js)
const PORTAL_IDS = {
    STUDENT: 'student',
    FEE: 'fee',
    EXAM: 'exam',
    ATTENDANCE: 'attendance',
    LIBRARY: 'library'
};

// Check if current page is accessible
async function checkPortalAccess() {
    // Skip check on admin pages
    if (window.location.pathname.includes('admin.html')) {
        return true;
    }

    // Get portal ID from the current page
    const portalId = getPortalIdFromPath();
    if (!portalId) return true; // If no specific portal, allow access

    try {
        const isEnabled = await isPortalEnabled(portalId);
        if (!isEnabled) {
            showPortalDisabledMessage(portalId);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error checking portal access:', error);
        return true; // Default to allowing access if there's an error
    }
}

// Get portal ID from current URL path
function getPortalIdFromPath() {
    const path = window.location.pathname.toLowerCase();
    
    if (path.includes('student')) return PORTAL_IDS.STUDENT;
    if (path.includes('fee')) return PORTAL_IDS.FEE;
    if (path.includes('exam')) return PORTAL_IDS.EXAM;
    if (path.includes('attendance')) return PORTAL_IDS.ATTENDANCE;
    if (path.includes('library')) return PORTAL_IDS.LIBRARY;
    
    return null;
}

// Show message when a portal is disabled
function showPortalDisabledMessage(portalId) {
    // Remove any existing messages
    const existingMessage = document.getElementById('portal-disabled-message');
    if (existingMessage) return;

    const portalName = getPortalName(portalId);
    
    const message = document.createElement('div');
    message.id = 'portal-disabled-message';
    message.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    message.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div class="flex items-center mb-4">
                <div class="flex-shrink-0 bg-red-100 p-3 rounded-full">
                    <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 class="ml-3 text-lg font-medium text-gray-900">Portal Unavailable</h3>
            </div>
            <div class="mt-4">
                <p class="text-gray-600">
                    The ${portalName} is currently disabled. Please contact the administrator for assistance.
                </p>
            </div>
            <div class="mt-6 flex justify-end">
                <button type="button" onclick="this.closest('#portal-disabled-message').remove()" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    OK
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(message);
    document.body.style.overflow = 'hidden';
}

// Get user-friendly portal name
function getPortalName(portalId) {
    const names = {
        [PORTAL_IDS.STUDENT]: 'Student Portal',
        [PORTAL_IDS.FEE]: 'Fee Portal',
        [PORTAL_IDS.EXAM]: 'Exam Portal',
        [PORTAL_IDS.ATTENDANCE]: 'Attendance Portal',
        [PORTAL_IDS.LIBRARY]: 'Library Portal'
    };
    
    return names[portalId] || 'This portal';
}

// Check portal access when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Only run on non-admin pages
    if (!window.location.pathname.includes('admin.html')) {
        checkPortalAccess().then(hasAccess => {
            if (!hasAccess) {
                // Optionally redirect to home page or show a message
                // window.location.href = 'index.html';
            }
        });
    }
});
