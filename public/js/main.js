class AccountScopedRouting {
    constructor() {
        this.prefix = AccountScopedRouting.getPrefix();
    }

    static getPrefix() {
        const match = window.location.pathname.match(/^\/u\/\d+(?=\/|$)/);
        return match ? match[0] : '';
    }

    scoped(url) {
        if (!this.prefix || typeof url !== 'string') return url;
        if (!url.startsWith('/') || url.startsWith('//')) return url;
        if (url === this.prefix || url.startsWith(this.prefix + '/')) return url;
        return this.prefix + url;
    }

    patchFetch() {
        const self = this;
        const originalFetch = window.fetch.bind(window);
        window.fetch = (input, init) => {
            if (typeof input === 'string') {
                input = self.scoped(input);
            } else if (input instanceof Request) {
                input = new Request(self.scoped(input.url), input);
            }
            return originalFetch(input, init);
        };
    }

    rewriteLinks() {
        if (!this.prefix) return;
        document.querySelectorAll('a[href^="/"]').forEach((a) => {
            const href = a.getAttribute('href');
            const scopedHref = this.scoped(href);
            if (scopedHref !== href) a.setAttribute('href', scopedHref);
        });
        document.querySelectorAll('form[action^="/"]').forEach((f) => {
            const action = f.getAttribute('action');
            const scopedAction = this.scoped(action);
            if (scopedAction !== action) f.setAttribute('action', scopedAction);
        });
    }
}

const accountScopedRouting = new AccountScopedRouting();
accountScopedRouting.patchFetch();

class ArtworkModal {
    constructor() {
        this.modal = document.getElementById('artworkModal');
        this.currentArtworkId = null;
        this.init();
    }

    getPageArtworks() {
        const dataEl = document.getElementById('artworks-data');
        if (!dataEl) return [];
        try {
            return JSON.parse(dataEl.textContent);
        } catch (err) {
            console.error('Could not parse embedded artwork data:', err);
            return [];
        }
    }

    getArtworkById(artworkId) {
        return this.getPageArtworks().find((a) => String(a.id) === String(artworkId));
    }

    open(artworkId) {
        const artwork = this.getArtworkById(artworkId);
        if (!artwork) {
            console.error('Artwork not found:', artworkId);
            return;
        }
        this.currentArtworkId = artworkId;

        document.getElementById('modalImage').src = artwork.image_url;
        document.getElementById('modalImage').alt = artwork.title;
        document.getElementById('modalTitle').textContent = artwork.title;
        document.getElementById('modalArtist').textContent = `By ${artwork.artist_name}`;
        document.getElementById('modalDescription').textContent = artwork.description;

        this.modal.classList.add('open');
        document.body.classList.add('no-scroll');
    }

    close() {
        this.modal.classList.remove('open');
        document.body.classList.remove('no-scroll');
    }

    goToShowroom() {
        if (!this.currentArtworkId) return;
        const artwork = this.getArtworkById(this.currentArtworkId);
        const destination = artwork && artwork.showroom_id
            ? `/single-showroom?room=${artwork.showroom_id}`
            : `/artwork-details?id=${this.currentArtworkId}`;
        window.location.href = accountScopedRouting.scoped(destination);
        this.close();
    }

    init() {
        if (!this.modal) return;

        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) this.close();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') this.close();
        });

        document.querySelectorAll('.carousel-item[data-artwork-id]').forEach((item) => {
            item.addEventListener('click', () => this.open(item.dataset.artworkId));
        });

        document.addEventListener('click', (event) => {
            if (event.target.closest('[data-close-modal]')) this.close();
            if (event.target.closest('[data-go-showroom]')) this.goToShowroom();
        });
    }
}

class SiteNavigation {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('click', (event) => {
            const navEl = event.target.closest('[data-nav]');
            if (navEl) {
                window.location.href = accountScopedRouting.scoped(navEl.dataset.nav);
                return;
            }
            if (event.target.closest('[data-back]')) {
                window.history.back();
            }
            const toggleBtn = event.target.closest('[data-toggle-password]');
            if (toggleBtn) {
                const input = document.getElementById(toggleBtn.dataset.togglePassword);
                if (!input) return;
                const showing = input.type === 'text';
                input.type = showing ? 'password' : 'text';
                toggleBtn.querySelector('i').className = showing ? 'bi bi-eye' : 'bi bi-eye-slash';
                toggleBtn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
            }
        });

        document.addEventListener('submit', (event) => {
            const form = event.target.closest('[data-confirm]');
            if (form && !confirm(form.dataset.confirm)) {
                event.preventDefault();
            }
        });
    }
}

class NavMenu {
    constructor() {
        this.toggle = document.getElementById('navToggle');
        this.links = document.querySelector('.nav-links');
        this.init();
    }

    init() {
        if (!this.toggle || !this.links) return;

        this.toggle.addEventListener('click', () => {
            this.links.classList.toggle('open');
        });

        document.addEventListener('click', (event) => {
            if (!this.links.contains(event.target) && !this.toggle.contains(event.target)) {
                this.links.classList.remove('open');
            }
        });
    }
}

class AuthForms {
    constructor() {
        this.init();
    }

    showFormError(formEl, message) {
        let errorEl = formEl.querySelector('.form-error');
        if (!errorEl) {
            errorEl = document.createElement('p');
            errorEl.className = 'form-error';
            formEl.appendChild(errorEl);
        }
        errorEl.textContent = message;
        errorEl.classList.add('visible');
    }

    async handleLogin(event) {
        event.preventDefault();
        const form = event.target;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            this.showFormError(form, 'Please fill in all fields');
            return;
        }

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (!response.ok) {
                this.showFormError(form, data.error || 'Login failed');
                return;
            }
            window.location.href = data.redirect;
        } catch (err) {
            this.showFormError(form, 'Something went wrong. Please try again.');
        }
    }

    async handleSignup(event) {
        event.preventDefault();
        const form = event.target;
        const fullname = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm').value;
        const bio = document.getElementById('bio').value;
        const role = document.querySelector('input[name="role"]:checked')?.value || 'visitor';

        if (!fullname || !email || !password || !confirmPassword) {
            this.showFormError(form, 'Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            this.showFormError(form, 'Passwords do not match');
            return;
        }
        if (password.length < 8) {
            this.showFormError(form, 'Password must be at least 8 characters long');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showFormError(form, 'Please enter a valid email address');
            return;
        }

        const payload = { fullname, email, password, confirm: confirmPassword, role, bio };
        if (role === 'artist') {
            payload.portfolioUrl = document.getElementById('portfolioUrl')?.value || '';
            payload.artMedium = document.getElementById('artMedium')?.value || '';
            payload.yearsActive = document.getElementById('yearsActive')?.value || '';
        } else if (role === 'curator') {
            payload.institution = document.getElementById('institution')?.value || '';
            payload.institutionUrl = document.getElementById('institutionUrl')?.value || '';
            payload.pastExhibitions = document.getElementById('pastExhibitions')?.value || '';
            payload.curationThemes = document.getElementById('curationThemes')?.value || '';
        }

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (!response.ok) {
                this.showFormError(form, data.error || 'Registration failed');
                return;
            }
            window.location.href = data.redirect;
        } catch (err) {
            this.showFormError(form, 'Something went wrong. Please try again.');
        }
    }

    initRememberedEmail() {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        const emailInput = document.getElementById('email');
        if (rememberedEmail && emailInput) {
            emailInput.value = rememberedEmail;
            const rememberCheckbox = document.getElementById('remember');
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }

    init() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        const signupForm = document.getElementById('signupForm');
        if (signupForm) signupForm.addEventListener('submit', (e) => this.handleSignup(e));

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initRememberedEmail());
        } else {
            this.initRememberedEmail();
        }
    }
}

class NotificationPanel {
    constructor() {
        this.bell = document.getElementById('notificationBell');
        this.panel = document.getElementById('notificationPanel');
        this.muteBtn = document.getElementById('muteAllBtn');
        this.list = document.getElementById('notificationList');
        this.empty = document.getElementById('notificationEmpty');
        this.init();
    }

    applyMuted() {
        if (this.list) this.list.hidden = true;
        if (this.muteBtn) this.muteBtn.hidden = true;
        if (this.empty) this.empty.hidden = false;
    }

    init() {
        if (!this.bell || !this.panel) return;

        if (localStorage.getItem('notificationsMuted') === 'true') this.applyMuted();

        this.bell.addEventListener('click', () => {
            this.panel.classList.toggle('open');
        });

        document.addEventListener('click', (event) => {
            if (!this.panel.contains(event.target) && !this.bell.contains(event.target)) {
                this.panel.classList.remove('open');
            }
        });

        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', () => {
                localStorage.setItem('notificationsMuted', 'true');
                this.applyMuted();
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    accountScopedRouting.rewriteLinks();
    new ArtworkModal();
    new SiteNavigation();
    new NavMenu();
    new AuthForms();
    new NotificationPanel();
});
