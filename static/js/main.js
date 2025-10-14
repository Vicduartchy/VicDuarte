// Main JavaScript file for Vic Duarte Website

document.addEventListener('DOMContentLoaded', function () {
    // Initialize smooth scrolling for anchor links
    initSmoothScrolling();

    // Initialize scroll animations
    initScrollAnimations();

    // Initialize navbar scroll effect
    initNavbarScrollEffect();

    // Initialize portfolio hover effects
    initPortfolioEffects();

    // Initialize form handlers
    initFormHandlers();

    // Initialize lazy loading
    initLazyLoading();

    // Add loading states
    addLoadingStates();

    // Initialize analytics
    initAnalytics();

    // Optional: Typing effect (comment out if not wanted)
    initTypingEffect();

    // Initialize back-to-top button
    initBackToTop();
});

/**
 * Initialize smooth scrolling for anchor links - Improved with Focus and ARIA
 */
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    links.forEach(link => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                e.preventDefault();

                const offsetTop = targetElement.offsetTop - 100; // Account for fixed header

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });

                // Focus no target para acessibilidade
                setTimeout(() => targetElement.focus({ preventScroll: true }), 500);

                // ARIA para nav active
                navLinks.forEach(l => l.removeAttribute('aria-current'));
                this.setAttribute('aria-current', 'page');
            }
        });
    });
}

/**
 * Initialize scroll animations - Improved for Reduced Motion and Mobile
 */
function initScrollAnimations() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return; // Early exit se reduced

    const threshold = window.innerWidth < 768 ? 0.2 : 0.1; // Maior em mobile
    const observerOptions = {
        threshold: threshold,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // One-time para perf
            }
        });
    }, observerOptions);

    // Add fade-in class to elements that should animate
    const animateElements = document.querySelectorAll('.card, .portfolio-item, .cert-item, .professional-moment-large, .professional-moment-medium, .professional-moment-small, .quote-section');
    animateElements.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
}

/**
 * Initialize navbar scroll effect and active section highlighting
 */
function initNavbarScrollEffect() {
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const sections = document.querySelectorAll('section[id]');

    window.addEventListener('scroll', function () {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Add scrolled class to navbar
        if (scrollTop > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Highlight active section in navigation
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 150;
            const sectionHeight = section.clientHeight;
            if (scrollTop >= sectionTop && scrollTop < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        // Update active nav link
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}` || link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

/**
 * Initialize portfolio hover effects
 */
function initPortfolioEffects() {
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    portfolioItems.forEach(item => {
        item.addEventListener('mouseenter', function () {
            this.style.transform = 'scale(1.02)';
        });

        item.addEventListener('mouseleave', function () {
            this.style.transform = 'scale(1)';
        });
    });
}

/**
 * Utility function to debounce function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Handle responsive iframe resizing for LinkedIn posts
 */
function handleResponsiveIframes() {
    const iframes = document.querySelectorAll('.linkedin-post iframe');

    function resizeIframes() {
        const screenWidth = window.innerWidth;

        iframes.forEach(iframe => {
            if (screenWidth <= 576) {
                iframe.style.height = '350px';
            } else if (screenWidth <= 768) {
                iframe.style.height = '400px';
            } else {
                iframe.style.height = '500px';
            }
        });
    }

    // Initial resize
    resizeIframes();

    // Resize on window resize with debouncing
    window.addEventListener('resize', debounce(resizeIframes, 250));
}

// Initialize responsive iframe handling
document.addEventListener('DOMContentLoaded', handleResponsiveIframes);

/**
 * Add parallax effect to hero section - Debounced
 */
function initParallaxEffect() {
    const hero = document.querySelector('.hero-section');

    if (hero) {
        const debouncedParallax = debounce(function () {
            const scrolled = window.pageYOffset;
            const parallax = scrolled * 0.5;

            hero.style.transform = `translateY(${parallax}px)`;
        }, 16); // ~60fps

        window.addEventListener('scroll', debouncedParallax, { passive: true });
    }
}

/**
 * Initialize typing effect for hero title (optional enhancement)
 */
function initTypingEffect() {
    const titleElement = document.querySelector('.hero-section h2'); // Changed to h2 if h1 not present

    if (titleElement) {
        const originalText = titleElement.textContent;
        titleElement.textContent = '';

        let i = 0;
        const typeWriter = () => {
            if (i < originalText.length) {
                titleElement.textContent += originalText.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };

        // Start typing effect after a small delay
        setTimeout(typeWriter, 500);
    }
}

/**
 * Handle form submissions - Improved Validation and Feedback
 */
function initFormHandlers() {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;

            // Validação simples
            const email = form.querySelector('input[type="email"]').value;
            if (!email || !email.includes('@')) {
                alert('Por favor, insira um email válido.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }

            try {
                // Substitua por fetch para Formspree/Netlify
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form)
                });

                if (response.ok) {
                    alert('Obrigada! Entrarei em contato em breve.');
                    form.reset();
                    bootstrap.Modal.getInstance(document.getElementById('contactModal')).hide();
                } else {
                    throw new Error('Erro no envio');
                }
            } catch (error) {
                alert('Erro ao enviar. Tente novamente.');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    });
}

/**
 * Initialize lazy loading for images - Blur-Up
 */
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                img.onload = () => img.classList.add('loaded'); // Trigger blur remove
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

/**
 * Add loading state for external content - With Timeout/Error
 */
function addLoadingStates() {
    const iframes = document.querySelectorAll('iframe');

    iframes.forEach(iframe => {
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        loader.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
        iframe.parentNode.insertBefore(loader, iframe);

        const timeout = setTimeout(() => {
            loader.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Conteúdo indisponível';
        }, 5000); // 5s timeout

        iframe.addEventListener('load', function () {
            clearTimeout(timeout);
            loader.remove();
        });

        iframe.addEventListener('error', function () {
            clearTimeout(timeout);
            loader.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro ao carregar';
        });
    });
}

/**
 * Initialize Analytics - Basic Tracking
 */
function initAnalytics() {
    // Track CTA clicks
    document.querySelectorAll('.btn-linkedin').forEach(btn => {
        btn.addEventListener('click', function () {
            console.log('CTA clicked:', this.textContent); // Substitua por gtag('event', 'click', { ... })
        });
    });

    // Track section views
    const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                console.log('Section viewed:', entry.target.id);
            }
        });
    });
    document.querySelectorAll('section[id]').forEach(sec => sectionObserver.observe(sec));
}

/**
 * Initialize Back-to-Top button
 */
function initBackToTop() {
    const backToTopBtn = document.querySelector('.back-to-top-btn');

    if (backToTopBtn) {
        const debouncedScroll = debounce(function () {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        }, 50);

        window.addEventListener('scroll', debouncedScroll, { passive: true });

        backToTopBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Export functions for external use if needed
window.VicDuarteWebsite = {
    initSmoothScrolling,
    initScrollAnimations,
    initParallaxEffect,
    initTypingEffect,
    handleResponsiveIframes,
    initBackToTop
};