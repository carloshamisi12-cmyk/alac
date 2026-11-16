// Initialize Firebase
db = firebase.firestore();

// Portal configuration
const PORTALS = {
    'student': {
        name: 'Student Portal',
        description: 'Student management and information',
        default: true
    },
    'fee': {
        name: 'Fee Portal',
        description: 'Fee payments and management',
        default: true
    },
    'exam': {
        name: 'Exam Portal',
        description: 'Exam results and management',
        default: false
    },
    'attendance': {
        name: 'Attendance Portal',
        description: 'Student attendance tracking',
        default: false
    },
    'library': {
        name: 'Library Portal',
        description: 'Library book management',
        default: false
    }
};

// Initialize portal statuses
async function initializePortals() {
    const portalRef = db.collection('system').doc('portals');
    
    try {
        const doc = await portalRef.get();
        if (!doc.exists) {
            // Initialize with default values
            const defaultPortals = {};
            Object.keys(PORTALS).forEach(portalId => {
                defaultPortals[portalId] = PORTALS[portalId].default;
            });
            
            await portalRef.set({
                status: defaultPortals,
                lastUpdated: new Date(),
                updatedBy: firebase.auth().currentUser?.uid || 'system'
            });
        }
    } catch (error) {
        console.error('Error initializing portals:', error);
    }
}

// Get portal status
async function getPortalStatus(portalId) {
    try {
        const doc = await db.collection('system').doc('portals').get();
        if (doc.exists) {
            const data = doc.data();
            return data.status[portalId] ?? PORTALS[portalId]?.default ?? false;
        }
        return PORTALS[portalId]?.default ?? false;
    } catch (error) {
        console.error('Error getting portal status:', error);
        return PORTALS[portalId]?.default ?? false;
    }
}

// Update portal status
async function updatePortalStatus(portalId, isEnabled) {
    try {
        const portalRef = db.collection('system').doc('portals');
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(portalRef);
            const data = doc.exists ? doc.data() : { status: {} };
            
            transaction.set(portalRef, {
                status: {
                    ...(data.status || {}),
                    [portalId]: isEnabled
                },
                lastUpdated: new Date(),
                updatedBy: firebase.auth().currentUser?.uid || 'admin'
            }, { merge: true });
        });
        
        return true;
    } catch (error) {
        console.error('Error updating portal status:', error);
        return false;
    }
}

// Render portal management UI
async function renderPortalManagement() {
    const container = document.getElementById('portalManagement');
    if (!container) return;
    
    try {
        const doc = await db.collection('system').doc('portals').get();
        const portalStatus = doc.exists ? doc.data().status : {};
        
        let html = `
            <div class="bg-white rounded-lg shadow overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="text-lg font-medium text-gray-900">Portal Management</h3>
                    <p class="mt-1 text-sm text-gray-500">Enable or disable access to different system portals</p>
                </div>
                <div class="divide-y divide-gray-200">
        `;
        
        for (const [portalId, portal] of Object.entries(PORTALS)) {
            const isEnabled = portalStatus[portalId] ?? portal.default;
            
            html += `
                <div class="px-6 py-4 flex items-center justify-between">
                    <div>
                        <h4 class="font-medium text-gray-900">${portal.name}</h4>
                        <p class="text-sm text-gray-500">${portal.description}</p>
                    </div>
                    <button 
                        type="button"
                        data-portal="${portalId}"
                        class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isEnabled ? 'bg-blue-600' : 'bg-gray-200'}"
                        role="switch"
                        aria-checked="${isEnabled}"
                        onclick="togglePortal('${portalId}', ${!isEnabled})"
                    >
                        <span 
                            aria-hidden="true"
                            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'}"
                        ></span>
                    </button>
                </div>
            `;
        }
        
        html += `
                </div>
                <div class="px-6 py-4 bg-gray-50 text-right">
                    <button 
                        type="button"
                        onclick="savePortalChanges()"
                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error rendering portal management:', error);
        container.innerHTML = `
            <div class="rounded-md bg-red-50 p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-800">
                            Failed to load portal settings
                        </h3>
                        <div class="mt-2 text-sm text-red-700">
                            <p>${error.message}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Toggle portal status
async function togglePortal(portalId, isEnabled) {
    const success = await updatePortalStatus(portalId, isEnabled);
    if (success) {
        // Update UI immediately for better UX
        const button = document.querySelector(`button[data-portal="${portalId}"]`);
        if (button) {
            button.classList.toggle('bg-blue-600', isEnabled);
            button.classList.toggle('bg-gray-200', !isEnabled);
            const indicator = button.querySelector('span');
            if (indicator) {
                indicator.classList.toggle('translate-x-5', isEnabled);
                indicator.classList.toggle('translate-x-0', !isEnabled);
            }
        }
    }
    return success;
}

// Save all portal changes
async function savePortalChanges() {
    // This function is a placeholder in case we want to add additional save logic
    // Currently, changes are saved immediately when toggling
    showNotification('Portal settings updated successfully', 'success');
}

// Check if portal is enabled (for use in other pages)
async function isPortalEnabled(portalId) {
    // If we're not in a browser environment, return true
    if (typeof window === 'undefined') return true;
    
    // In development, always return true
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return true;
    }
    
    return await getPortalStatus(portalId);
}

// Show notification
function showNotification(message, type = 'success') {
    // You can implement a better notification system here
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-md shadow-lg text-white ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('portalManagement')) {
        initializePortals().then(() => {
            renderPortalManagement();
        });
    }
});
