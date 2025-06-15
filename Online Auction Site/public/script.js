// Utility functions for the Online Auction Website

// Get current user from localStorage
function getCurrentUser() {
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
}

// Update navigation based on login status
function updateNavigation() {
    const currentUser = getCurrentUser();
    const loginLink = document.getElementById('loginLink');
    
    if (loginLink) {
        if (currentUser) {
            loginLink.textContent = currentUser.username;
            loginLink.href = 'login.html';
        } else {
            loginLink.textContent = 'Login';
            loginLink.href = 'login.html';
        }
    }
}

// Format time left for auction
function getTimeLeft(endDateString) {
    const endDate = new Date(endDateString);
    const now = new Date();
    
    if (now >= endDate) {
        return 'Auction ended';
    }
    
    const timeLeftMs = endDate - now;
    const days = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeftMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        return `${days} day${days !== 1 ? 's' : ''} ${hours} hr left`;
    } else if (hours > 0) {
        return `${hours} hr ${minutes} min left`;
    } else {
        return `${minutes} min left`;
    }
}

// Get human-readable status text
function getStatusText(item) {
    if (item.status === 'active') {
        return 'Active';
    } else if (item.status === 'ended') {
        if (item.highestBidderId) {
            return 'Auction ended - Awaiting payment';
        } else {
            return 'Auction ended - No bids';
        }
    } else if (item.status === 'paid') {
        return 'Sold';
    }
    return item.status;
}

// Format currency
function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toFixed(2);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Validate form input
function validateInput(input, type) {
    if (type === 'number') {
        return !isNaN(parseFloat(input)) && parseFloat(input) > 0;
    } else if (type === 'text') {
        return input.trim().length > 0;
    }
    return true;
}

// Show error message
function showError(message) {
    alert(message);
}

// Show success message
function showSuccess(message) {
    alert(message);
}