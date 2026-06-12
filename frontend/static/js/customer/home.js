// API Configuration
const API_BASE_URL = 'http://localhost:8080/api/menu'; // API Gateway URL

// Default image for menu items
const DEFAULT_MENU_IMAGE = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedMenu();
    initializeNavigation();
    initializeScrollEffects();
});

// Load featured menu items from API
async function loadFeaturedMenu() {
    try {
        const res = await fetch(`${API_BASE_URL}/menu`);
        if (!res.ok) {
            throw new Error('Failed to fetch menu items');
        }
        
        const data = await res.json();
        const menuItems = data.data || data.menu_items || [];
        
        // Get 3 random items for featured section (static selection per page load)
        const shuffled = menuItems.sort(() => 0.5 - Math.random());
        const featuredItems = shuffled.slice(0, 3);
        
        if (featuredItems.length > 0) {
            renderFeaturedMenu(featuredItems);
        } else {
            console.log('No menu items available, keeping static content');
        }
    } catch (error) {
        console.error('Error loading menu:', error);
        console.log('Keeping static menu content as fallback');
    }
}

// Render featured menu items
function renderFeaturedMenu(items) {
    const container = document.getElementById('featured-menu-container');
    if (!container) return;
    
    container.innerHTML = items.map(item => createMenuCard(item)).join('');
    
    // Re-apply hover animations
    initializeCardAnimations();
}

// Create menu card HTML
function createMenuCard(item) {
    const price = formatPrice(item.price);
    const description = item.description || 'Món ăn đặc biệt của Pizza 4P\'s';
    const tags = getItemTags(item);
    const imageUrl = item.image_url || DEFAULT_MENU_IMAGE;
    
    return `
        <div class="bg-white rounded-xl overflow-hidden shadow-ambient hover:-translate-y-2 transition-all duration-300 group">
            <div class="h-64 bg-cover bg-center" style="background-image: url('${imageUrl}')">
            </div>
            <div class="p-stack-md">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-headline-md text-headline-md text-primary">${escapeHtml(item.name)}</h3>
                    <span class="font-bold text-primary">${price}</span>
                </div>
                <p class="font-body-md text-body-md text-on-surface-variant mb-stack-md">${escapeHtml(description)}</p>
                <div class="flex gap-2 flex-wrap">
                    ${tags.map(tag => `
                        <span class="bg-surface-container text-label-sm font-label-sm px-3 py-1 rounded-full text-on-surface-variant">${tag}</span>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Get tags for menu item
function getItemTags(item) {
    const tags = [];
    
    // Check category
    if (item.category) {
        const categoryMap = {
            'pizza': 'PIZZA',
            'appetizer': 'KHAI VỊ',
            'dessert': 'TRÁNG MIỆNG',
            'beverage': 'ĐỒ UỐNG',
            'pasta': 'PASTA'
        };
        const categoryTag = categoryMap[item.category.toLowerCase()] || item.category.toUpperCase();
        tags.push(categoryTag);
    }
    
    // Check availability
    if (item.is_available === false) {
        tags.push('HẾT HÀNG');
    } else {
        // Add special tags for available items
        if (item.is_featured) {
            tags.push('ĐẶC TRƯNG');
        }
        if (item.is_new) {
            tags.push('MÓN MỚI');
        }
        if (item.is_vegetarian) {
            tags.push('MÓN CHAY');
        }
    }
    
    return tags;
}

// Format price
function formatPrice(price) {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(price);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize card animations
function initializeCardAnimations() {
    const cards = document.querySelectorAll('.group');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Initialize navigation
function initializeNavigation() {
    // Menu button
    const menuButtons = document.querySelectorAll('[href*="menu"]');
    menuButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'menu.html';
        });
    });
    
    // Login/Register buttons
    const authButtons = document.querySelectorAll('.auth-button');
    authButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'login.html';
        });
    });
}

// Initialize scroll effects
function initializeScrollEffects() {
    // Navigation bar scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('nav');
        if (window.scrollY > 50) {
            nav.classList.add('h-16', 'bg-white/95');
            nav.classList.remove('h-20', 'bg-white/90');
        } else {
            nav.classList.add('h-20', 'bg-white/90');
            nav.classList.remove('h-16', 'bg-white/95');
        }
    });

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in', 'fade-in', 'duration-1000');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}

// Utility function to show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 ${
        type === 'error' ? 'bg-error text-on-error' : 'bg-secondary text-primary'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
