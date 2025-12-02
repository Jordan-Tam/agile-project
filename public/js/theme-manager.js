// Theme Manager - Handles dark/light mode switching across all pages

(function() {
    'use strict';

    // Check if we're on login, register, or signout page (should always be light mode)
    function isAuthPage() {
        const path = window.location.pathname;
        return path === '/login' || path === '/register' || path === '/signout' || 
               path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/signout');
    }

    // Get user theme preference from server (set in main.handlebars) or localStorage
    function getUserTheme() {
        // Force light mode on login/register pages
        if (isAuthPage()) {
            return 'light';
        }
        
        // First check if server set window.userTheme
        if (typeof window.userTheme !== 'undefined' && window.userTheme !== null) {
            return window.userTheme;
        }
        // Fallback to localStorage (for pages that don't pass user object, but not on auth pages)
        const stored = localStorage.getItem('userTheme');
        if (stored === 'dark' || stored === 'light') {
            return stored;
        }
        return null;
    }

    // Get the theme to apply (user preference or default to light)
    function getThemeToApply() {
        const userTheme = getUserTheme();
        if (userTheme !== null && (userTheme === 'light' || userTheme === 'dark')) {
            // Store in localStorage as backup (but not on auth pages)
            if (!isAuthPage()) {
                localStorage.setItem('userTheme', userTheme);
            }
            return userTheme;
        }
        // Default to light mode if no user preference
        return 'light';
    }

    // Apply theme on page load
    function applyTheme() {
        const theme = getThemeToApply();
        setTheme(theme, false); // false = don't save to database (only save when user explicitly changes)
    }

    // Set theme function
    function setTheme(theme, saveToDatabase = false) {
        const body = document.body;
        const html = document.documentElement;

        if (theme === 'dark') {
            body.classList.add('dark-mode');
            html.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
            html.classList.remove('dark-mode');
        }

        // Save to database if requested (from settings page)
        if (saveToDatabase) {
            fetch('/api/settings/theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ theme })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Failed to save theme');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Update window.userTheme so it persists on this page
                    window.userTheme = theme;
                    // Also store in localStorage as backup
                    localStorage.setItem('userTheme', theme);
                }
            })
            .catch(error => {
                console.error('Error saving theme:', error);
            });
        }

        // Dispatch custom event for other scripts that might need to react
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    // Initialize theme - apply immediately and keep trying
    function initializeTheme() {
        // If window.userTheme is not yet set, wait a bit
        if (typeof window.userTheme === 'undefined') {
            setTimeout(initializeTheme, 10);
            return;
        }
        applyTheme();
    }

    // Apply immediately - don't wait
    applyTheme();
    
    // Also apply when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initializeTheme();
            // Apply again after a short delay
            setTimeout(applyTheme, 50);
        });
    } else {
        initializeTheme();
        setTimeout(applyTheme, 50);
    }
    
    // Also try applying on window load as a fallback
    window.addEventListener('load', function() {
        applyTheme();
    });
    
    // Apply theme on any navigation (for SPA-like behavior)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(applyTheme, 100);
        }
    }).observe(document, { subtree: true, childList: true });

    // Expose setTheme globally so it can be called from settings page
    window.setTheme = setTheme;
    window.getTheme = function() {
        return getThemeToApply();
    };
    window.getUserTheme = getUserTheme;
})();

