/**
 * Main JavaScript for Vic Duarte Website (Multi-page Version)
 * Optimized for multiple pages architecture
 */

(function() {
    'use strict';

    // ==========================================
    // Navbar Scroll Effect
    // ==========================================
    const navbar = document.querySelector('.navbar');
    
    function handleNavbarScroll() {
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    }

    window.addEventListener('scroll', handleNavbarScroll);
    
    // Initial check
    handleNavbarScroll();

    // ==========================================
    // Smooth Scroll for Anchor Links
    // ==========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            
            // Ignore empty anchors and modal triggers
            if (href === '#' || this.hasAttribute('data-bs-toggle')) {
                return;
            }
            
            e.preventDefault();
            const target = document.querySelector(href);
            
            if (target) {
                const navbarHeight = navbar.offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ==========================================
    // Scroll Animations (Intersection Observer)
    // ==========================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                // Unobserve after animation to improve performance
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all sections and cards
    document.querySelectorAll('section, .card, .timeline-item').forEach(el => {
        observer.observe(el);
    });

    // ==========================================
    // Lazy Loading Images
    // ==========================================
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                
                if (src) {
                    img.src = src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });

    // ==========================================
    // Moments Carousel Auto-rotation (if exists)
    // ==========================================
    const momentsCarousel = document.getElementById('momentsCarousel');
    if (momentsCarousel) {
        const carousel = new bootstrap.Carousel(momentsCarousel, {
            interval: 4000,
            ride: 'carousel',
            pause: 'hover'
        });
    }

    // ==========================================
    // Filter Functionality for Publications Page
    // ==========================================
    const filterButtons = document.querySelectorAll('[data-filter]');
    const publicationItems = document.querySelectorAll('[data-category]');
    
    if (filterButtons.length > 0 && publicationItems.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                const filterValue = this.getAttribute('data-filter');
                
                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Filter items
                publicationItems.forEach(item => {
                    if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                        item.style.display = 'block';
                        setTimeout(() => {
                            item.classList.add('animate-in');
                        }, 10);
                    } else {
                        item.style.display = 'none';
                        item.classList.remove('animate-in');
                    }
                });
            });
        });
    }

    // ==========================================
    // Performance: Reduce Motion for Accessibility
    // ==========================================
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (prefersReducedMotion.matches) {
        // Disable smooth scroll
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href !== '#' && !this.hasAttribute('data-bs-toggle')) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView();
                    }
                }
            });
        });
    }

    // ==========================================
    // Console Log (Development)
    // ==========================================
    console.log('🚀 Vic Duarte Website v2.0 - Multi-page architecture loaded successfully!');

})();
