# Overview

This is a personal institutional website for Vic Duarte, a consultant, speaker, and agile methodology specialist. The website serves as a professional portfolio and business card, showcasing her expertise in agile leadership and project management. Built with Flask (Python web framework) and Bootstrap 5, the site aims to present Vic's work, areas of expertise, portfolio, certifications, and facilitate professional connections through LinkedIn and email contact.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Template Engine**: Jinja2 templates with Flask, using a single-page layout structure
- **CSS Framework**: Bootstrap 5 for responsive design and component styling
- **Custom Styling**: CSS custom properties (variables) for consistent color theming
- **JavaScript**: Vanilla JavaScript for interactive features including smooth scrolling, scroll animations, navbar effects, and portfolio hover interactions
- **Typography**: Inter font family from Google Fonts for modern, readable text
- **Icons**: Font Awesome 6 for consistent iconography

## Backend Architecture
- **Web Framework**: Flask (Python) with minimal configuration
- **Application Structure**: Simple single-file Flask app with modular entry points
- **Session Management**: Flask sessions with configurable secret key from environment variables
- **Development Setup**: Debug mode enabled for development with host binding to 0.0.0.0

## Static Asset Management
- **CSS**: Organized in static/css/ directory with custom variables for brand colors
- **JavaScript**: Modular JavaScript in static/js/ with feature-specific initialization functions
- **Images**: Placeholder system in static/images/ directory for portfolio and profile images

## Design System
- **Color Palette**: 
  - Background: Light cream (#f6f0df)
  - Primary: Dark blue (#495471)
  - Secondary: Muted purple (#6b5a6c)
  - Accent colors: Warm tones (#8d6067, #b06662)
- **Responsive Design**: Mobile-first approach using Bootstrap's grid system
- **Animation Strategy**: CSS transitions and JavaScript-driven scroll animations for enhanced user experience

# External Dependencies

## Frontend Libraries
- **Bootstrap 5.3.0**: CSS framework for responsive layout and components
- **Font Awesome 6.4.0**: Icon library for social media and UI icons
- **Google Fonts (Inter)**: Typography with multiple font weights (300-700)

## Backend Dependencies
- **Flask**: Python web framework for server-side rendering
- **Python Standard Library**: OS module for environment variable management

## External Integrations
- **LinkedIn**: Direct linking to professional profile (https://www.linkedin.com/in/vic-duarte/)
- **CDN Services**: 
  - jsDelivr for Bootstrap CSS
  - Cloudflare for Font Awesome
  - Google Fonts API for typography

## Development Environment
- **Host Configuration**: Configured for containerized deployment (0.0.0.0 binding)
- **Port Configuration**: Standard development port 5000
- **Environment Variables**: SESSION_SECRET for production security configuration