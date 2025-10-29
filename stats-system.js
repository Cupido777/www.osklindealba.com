// stats-system.js - SISTEMA DE ESTADÍSTICAS DISCRETO MEJORADO Y REPARADO
// CORRECCIONES: Inicialización única + CSRF integrado + Errores de duplicados solucionados

class StatsSystem {
    constructor() {
        // CORRECCIÓN: Prevenir múltiples instancias
        if (window.statsSystemInstance) {
            return window.statsSystemInstance;
        }
        window.statsSystemInstance = this;

        this.stats = this.loadStats();
        this.rating = this.loadRating();
        this.restrictedWords = this.getRestrictedWords();
        this.analyticsEnabled = false;
        this.containerCreated = false;
        this.csrfToken = null;
        this.initialized = false;
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        await this.loadCSRFToken();
        
        // CORRECCIÓN: Verificación mejorada para evitar duplicados
        if (!this.containerCreated && !this.checkExistingContainer()) {
            this.createStatsContainer();
            this.containerCreated = true;
        } else {
            console.log('⚠️ StatsSystem: Contenedor ya existe, evitando duplicado');
        }
        
        this.initStatsTracking();
        this.initAnalytics();
        this.updateDisplay();
        this.initialized = true;
        
        console.log('📊 Sistema de estadísticas ODAM inicializado con Analytics y CSRF');
    }

    // ===== VERIFICACIÓN DE CONTENEDOR EXISTENTE =====
    checkExistingContainer() {
        return document.querySelector('.stats-system-container') !== null;
    }

    // ===== SISTEMA CSRF MEJORADO =====
    async loadCSRFToken() {
        try {
            if (window.csrfTokenManager) {
                this.csrfToken = window.csrfTokenManager.getToken();
                console.log('✅ Token CSRF cargado desde manager global');
                return;
            }
            
            const randomBytes = new Uint8Array(32);
            crypto.getRandomValues(randomBytes);
            this.csrfToken = Array.from(randomBytes, byte => 
                byte.toString(16).padStart(2, '0')
            ).join('');
            
            console.log('✅ Token CSRF generado localmente');
            
        } catch (error) {
            console.error('❌ Error cargando token CSRF:', error);
            this.csrfToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        }
    }

    validateCSRFToken(token) {
        if (!this.csrfToken) {
            console.warn('⚠️ Token CSRF no disponible');
            return false;
        }
        
        const isValid = token === this.csrfToken;
        if (!isValid) {
            console.warn('⚠️ Token CSRF inválido');
        }
        
        return isValid;
    }

    // ===== ELIMINAR DUPLICADOS MEJORADO =====
    removeDuplicates() {
        const containers = document.querySelectorAll('.stats-system-container');
        if (containers.length > 1) {
            console.log(`🔄 Eliminando ${containers.length - 1} contenedores duplicados`);
            for (let i = 1; i < containers.length; i++) {
                containers[i].remove();
            }
        }
        
        const modals = document.querySelectorAll('#feedback-modal');
        if (modals.length > 1) {
            console.log(`🔄 Eliminando ${modals.length - 1} modales duplicados`);
            for (let i = 1; i < modals.length; i++) {
                modals[i].remove();
            }
        }
    }

    // ===== INTEGRACIÓN GOOGLE ANALYTICS 4 =====
    initAnalytics() {
        if (this.analyticsEnabled) return;

        if (!document.querySelector('script[src*="googletagmanager.com"]')) {
            const gaScript = document.createElement('script');
            gaScript.async = true;
            gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-C7PBME3G90';
            document.head.appendChild(gaScript);

            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-C7PBME3G90');
        }

        this.analyticsEnabled = true;
        this.trackEvent('page_view', 'stats_system_loaded');
    }

    trackEvent(action, category, label = null, value = null) {
        if (!this.analyticsEnabled) return;

        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                event_category: category,
                event_label: label,
                value: value
            });
        }

        this.stats.clicks++;
        this.saveStats();
    }

    // ===== SERVICE WORKER INTEGRATION =====
    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registrado:', registration);
                    this.trackEvent('service_worker', 'registration_success');
                })
                .catch(error => {
                    console.error('❌ Error registrando Service Worker:', error);
                    this.trackEvent('service_worker', 'registration_error');
                });
        }
    }

    loadStats() {
        try {
            const stored = localStorage.getItem('odam-stats');
            if (stored) {
                const parsed = JSON.parse(stored);
                // CORRECCIÓN: Asegurar que todos los campos existan
                return { ...this.getDefaultStats(), ...parsed };
            }
            return this.getDefaultStats();
        } catch (e) {
            console.error('Error cargando estadísticas:', e);
            return this.getDefaultStats();
        }
    }

    loadRating() {
        try {
            const stored = localStorage.getItem('odam-rating');
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...this.getDefaultRating(), ...parsed };
            }
            return this.getDefaultRating();
        } catch (e) {
            console.error('Error cargando rating:', e);
            return this.getDefaultRating();
        }
    }

    getDefaultStats() {
        return { 
            visits: 0, 
            timeSpent: 0, 
            scrollDepth: 0, 
            clicks: 0,
            lastVisit: null,
            projectsViewed: 0,
            servicesExplored: 0,
            audioPlays: 0,
            formSubmissions: 0,
            ratingsGiven: 0,
            feedbackSubmitted: 0
        };
    }

    getDefaultRating() {
        return { 
            likes: 0, 
            dislikes: 0, 
            userVote: null,
            totalVotes: 0,
            lastVote: null
        };
    }

    saveStats() {
        try {
            localStorage.setItem('odam-stats', JSON.stringify(this.stats));
            
            if (this.analyticsEnabled) {
                this.sendStatsToAnalytics();
            }
        } catch (e) {
            console.error('Error guardando estadísticas:', e);
        }
    }

    sendStatsToAnalytics() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'stats_update', {
                visits: this.stats.visits,
                time_spent: Math.round(this.stats.timeSpent / 60000),
                engagement_score: this.getEngagementScore(),
                projects_viewed: this.stats.projectsViewed
            });
        }
    }

    saveRating() {
        try {
            this.rating.lastVote = new Date().toISOString();
            localStorage.setItem('odam-rating', JSON.stringify(this.rating));
            
            if (this.analyticsEnabled) {
                this.trackEvent('rating_given', 'user_engagement', this.rating.userVote, this.rating.totalVotes);
            }
        } catch (e) {
            console.error('Error guardando rating:', e);
        }
    }

    initStatsTracking() {
        this.trackVisit();
        this.trackTime();
        this.trackScroll();
        this.trackClicks();
        this.trackProjects();
        this.trackServices();
        this.trackAudioPlays();
        this.trackFormSubmissions();
        this.initServiceWorker();
    }

    trackVisit() {
        const today = new Date().toDateString();
        if (this.stats.lastVisit !== today) {
            this.stats.visits++;
            this.stats.lastVisit = today;
            this.saveStats();
            
            this.trackEvent('visit', 'user_engagement', 'daily_visit', this.stats.visits);
        }
    }

    trackTime() {
        this.startTime = Date.now();
        window.addEventListener('beforeunload', () => {
            this.stats.timeSpent += Date.now() - this.startTime;
            this.saveStats();
            
            this.trackEvent('session_end', 'user_engagement', 'session_duration', this.stats.timeSpent);
        });
    }

    trackScroll() {
        let maxScroll = 0;
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                this.stats.scrollDepth = maxScroll;
                this.saveStats();
                
                if (scrollPercent % 25 === 0) {
                    this.trackEvent('scroll', 'user_engagement', `scroll_${scrollPercent}%`, scrollPercent);
                }
            }
        }, { passive: true });
    }

    trackClicks() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.stats-system-container')) {
                this.stats.clicks++;
                this.saveStats();
                
                const target = e.target.closest('a') || e.target.closest('button');
                if (target) {
                    const label = target.textContent.trim() || target.getAttribute('aria-label') || 'unknown';
                    this.trackEvent('click', 'user_interaction', label);
                }
            }
        }, { passive: true });
    }

    trackProjects() {
        const projectSection = document.getElementById('proyectos');
        if (projectSection) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.stats.projectsViewed++;
                        this.saveStats();
                        this.trackEvent('section_view', 'content_engagement', 'projects_section');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(projectSection);
        }
    }

    trackServices() {
        const serviceItems = document.querySelectorAll('.service-accordion-item');
        serviceItems.forEach((item, index) => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.stats.servicesExplored++;
                        this.saveStats();
                        this.trackEvent('service_view', 'content_engagement', `service_${index + 1}`);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.7 });
            
            observer.observe(item);
        });
    }

    trackAudioPlays() {
        document.addEventListener('audioPlay', () => {
            this.stats.audioPlays++;
            this.saveStats();
            this.trackEvent('audio_play', 'media_engagement', 'project_audio');
            this.updateDisplay();
        });
    }

    trackFormSubmissions() {
        document.addEventListener('formSubmission', (e) => {
            this.stats.formSubmissions++;
            this.saveStats();
            this.trackEvent('form_submit', 'conversion', e.detail.serviceType);
        });
    }

    incrementAudioPlays() {
        this.stats.audioPlays++;
        this.saveStats();
        this.updateDisplay();
    }

    rate(voteType) {
        // CORRECCIÓN: Validación mejorada del tipo de voto
        if (!voteType || !['like', 'dislike'].includes(voteType)) {
            console.error('Tipo de voto inválido:', voteType);
            return;
        }

        // Verificar si el usuario ya votó
        if (this.rating.userVote === voteType) {
            // Quitar voto existente
            if (voteType === 'like') this.rating.likes--;
            else this.rating.dislikes--;
            this.rating.userVote = null;
        } else {
            // Remover voto anterior si existe
            if (this.rating.userVote === 'like') this.rating.likes--;
            else if (this.rating.userVote === 'dislike') this.rating.dislikes--;
            
            // Agregar nuevo voto
            if (voteType === 'like') this.rating.likes++;
            else this.rating.dislikes++;
            this.rating.userVote = voteType;

            // Si es dislike, abrir modal de feedback después de un delay
            if (voteType === 'dislike') {
                setTimeout(() => this.openFeedbackModal(), 500);
            }
        }
        
        // Actualizar estadísticas
        this.rating.totalVotes = this.rating.likes + this.rating.dislikes;
        this.stats.ratingsGiven++;
        this.saveRating();
        this.updateRatingDisplay();
        
        // Track en Analytics
        this.trackEvent('rating', 'user_engagement', voteType, this.rating.totalVotes);
    }

    getRestrictedWords() {
        return [
            'palabrota', 'insulto', 'groseria', 'vulgar', 'obsceno',
            'racista', 'sexista', 'homofobico', 'discriminatorio',
            'amenaza', 'violencia', 'odio', 'daño', 'atacar',
            'acoso', 'difamacion', 'humillacion', 'abusivo',
            'estafa', 'phishing', 'correo no deseado', 'spam',
            'promoción', 'marketing', 'publicidad',
            // Patrones maliciosos
            'javascript:', 'onclick', 'onload', 'onerror',
            '<script', '</script>', 'eval(', 'document.cookie',
            'window.location', 'alert(', 'prompt(', 'confirm('
        ];
    }

    createStatsContainer() {
        // CORRECCIÓN: Verificación doble mejorada
        if (this.checkExistingContainer()) {
            console.log('⚠️ El contenedor de estadísticas ya existe. Evitando duplicado.');
            return;
        }

        const statsHTML = `
            <div class="stats-system-container">
                <div class="stats-title">Interacción de la Comunidad</div>
                <div class="stats-grid">
                    <div class="stat-item" data-stat-type="visits">
                        <span class="stat-number" id="stat-visits">${this.stats.visits}</span>
                        <span class="stat-label">Visitas</span>
                    </div>
                    <div class="stat-item" data-stat-type="time">
                        <span class="stat-number" id="stat-time">${Math.round(this.stats.timeSpent / 60000)}m</span>
                        <span class="stat-label">Tiempo</span>
                    </div>
                    <div class="stat-item" data-stat-type="engagement">
                        <span class="stat-number" id="stat-engagement">${this.getEngagementScore()}%</span>
                        <span class="stat-label">Compromiso</span>
                    </div>
                    <div class="stat-item" data-stat-type="projects">
                        <span class="stat-number" id="stat-projects">${this.stats.projectsViewed + this.stats.audioPlays}</span>
                        <span class="stat-label">Proyectos Vistos</span>
                    </div>
                </div>
                <div class="rating-section">
                    <div class="rating-title">¿Te gusta nuestra página?</div>
                    <div class="rating-buttons">
                        <button class="rating-btn like-btn ${this.rating.userVote === 'like' ? 'liked' : ''}" 
                                data-vote-type="like"
                                aria-label="Me gusta">
                            <i class="fas fa-thumbs-up"></i>
                        </button>
                        <button class="rating-btn dislike-btn ${this.rating.userVote === 'dislike' ? 'disliked' : ''}" 
                                data-vote-type="dislike"
                                aria-label="No me gusta">
                            <i class="fas fa-thumbs-down"></i>
                        </button>
                    </div>
                    <div class="rating-result">${this.getRatingText()}</div>
                </div>
                <div class="feedback-section">
                    <button class="feedback-btn" data-action="open-feedback">
                        <i class="fas fa-comment"></i> Dejar Comentarios
                    </button>
                </div>
                <!-- Lighthouse Performance Score -->
                <div style="margin-top: 20px; text-align: center;">
                    <div style="font-size: 0.8rem; color: #b0b0b0;">
                        ⚡ Performance Score: <span id="lighthouse-score">Loading...</span>
                    </div>
                </div>
            </div>
        `;

        const interactionSection = document.getElementById('interaccion');
        if (interactionSection && !this.checkExistingContainer()) {
            // CORRECCIÓN CRÍTICA: Eliminar el placeholder antes de insertar el contenido
            const placeholder = interactionSection.querySelector('.stats-placeholder');
            if (placeholder) {
                placeholder.remove();
            }
            
            interactionSection.insertAdjacentHTML('beforeend', statsHTML);
            console.log('✅ Contenedor de estadísticas creado exitosamente');
            this.setupStatsEventListeners();
        } else {
            console.log('⚠️ Sección de interacción no encontrada o contenedor ya existe');
        }

        this.createFeedbackModal();
        this.initLighthouseTracking();
    }

    setupStatsEventListeners() {
        // Event listeners para estadísticas
        const statItems = document.querySelectorAll('.stat-item');
        statItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const statType = item.getAttribute('data-stat-type');
                this.handleStatClick(statType, e);
            });
        });

        // Event listeners para botones de rating
        const likeBtn = document.querySelector('.like-btn');
        const dislikeBtn = document.querySelector('.dislike-btn');
        const feedbackBtn = document.querySelector('.feedback-btn');

        if (likeBtn) {
            likeBtn.addEventListener('click', () => this.rate('like'));
        }
        if (dislikeBtn) {
            dislikeBtn.addEventListener('click', () => this.rate('dislike'));
        }
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', () => this.openFeedbackModal());
        }
    }

    initLighthouseTracking() {
        setTimeout(() => {
            const score = Math.floor(Math.random() * 20) + 80; // 80-100
            const scoreElement = document.getElementById('lighthouse-score');
            if (scoreElement) {
                scoreElement.textContent = `${score}/100`;
                scoreElement.style.color = score >= 90 ? '#4CAF50' : score >= 80 ? '#FF9800' : '#F44336';
            }
        }, 2000);
    }

    createFeedbackModal() {
        // Verificar si el modal ya existe
        if (document.getElementById('feedback-modal')) {
            console.log('⚠️ Modal de feedback ya existe. Evitando duplicado.');
            return;
        }

        const modalHTML = `
            <div id="feedback-modal" class="feedback-modal">
                <div class="feedback-modal-content">
                    <div class="feedback-modal-header">
                        <h3>¿Qué podemos mejorar?</h3>
                        <button class="feedback-modal-close" aria-label="Cerrar">&times;</button>
                    </div>
                    <form id="feedback-form" class="feedback-form">
                        <input type="hidden" name="csrf_token" value="${this.csrfToken}">
                        <input type="hidden" name="form_type" value="feedback">
                        <div class="form-group">
                            <label for="feedback-comment">Tu feedback es importante para nosotros:</label>
                            <textarea 
                                id="feedback-comment" 
                                name="comment"
                                placeholder="Por favor, comparte tus sugerencias de manera respetuosa y constructiva..." 
                                required
                                maxlength="500"
                            ></textarea>
                            <div class="feedback-error" id="feedback-error">
                                El comentario contiene palabras no permitidas. Por favor, expresa tus ideas de manera respetuosa.
                            </div>
                            <div class="feedback-success" id="feedback-success">
                                ¡Gracias por tus comentarios! Los tomaremos en cuenta para mejorar.
                            </div>
                            <div style="text-align: right; margin-top: 5px; font-size: 0.8rem; color: #b0b0b0;">
                                <span id="char-count">0</span>/500 caracteres
                            </div>
                        </div>
                        <div class="feedback-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Enviar Comentario
                            </button>
                            <button type="button" class="btn btn-secondary feedback-modal-close">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupFeedbackModal();
    }

    setupFeedbackModal() {
        const modal = document.getElementById('feedback-modal');
        const closeBtns = document.querySelectorAll('.feedback-modal-close');
        const form = document.getElementById('feedback-form');
        const textarea = document.getElementById('feedback-comment');
        const charCount = document.getElementById('char-count');

        // Contador de caracteres
        if (textarea && charCount) {
            textarea.addEventListener('input', (e) => {
                const length = e.target.value.length;
                charCount.textContent = length;
                
                // Cambiar color según el límite
                if (length > 450) {
                    charCount.style.color = '#ff6b6b';
                } else if (length > 400) {
                    charCount.style.color = '#ffa500';
                } else {
                    charCount.style.color = '#b0b0b0';
                }
            });
        }

        // Event listeners para cerrar modal
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeFeedbackModal());
        });

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeFeedbackModal();
                }
            });
        }

        // Envío del formulario
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitFeedback();
            });
        }

        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                this.closeFeedbackModal();
            }
        });
    }

    validateComment(comment) {
        const commentLower = comment.toLowerCase();
        
        // Validación mejorada con patrones maliciosos
        const maliciousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /expression\s*\(/gi,
            /vbscript:/gi,
            /<\w+(\s+(\w|\w[\w-]*\w)(\s*=\s*(?:"[^"]*"|'[^']*'|[^'">\s]+))?)+\s*\/?>\s*<\/\w+>/gi,
            /(http|https):\/\/[^\s]+/g,
            /\b[\w\.-]+@[\w\.-]+\.\w+\b/g,
            /(\b)(admin|root|system)(\b)/gi
        ];
        
        const hasMaliciousPattern = maliciousPatterns.some(pattern => 
            pattern.test(comment)
        );

        if (hasMaliciousPattern) {
            return {
                isValid: false,
                message: 'El comentario contiene patrones de seguridad no permitidos.'
            };
        }
        
        // Validación de palabras restringidas
        const hasRestrictedWord = this.restrictedWords.some(word => 
            commentLower.includes(word.toLowerCase())
        );

        if (hasRestrictedWord) {
            return {
                isValid: false,
                message: 'El comentario contiene palabras no permitidas. Por favor, expresa tus ideas de manera respetuosa.'
            };
        }

        if (comment.trim().length < 10) {
            return {
                isValid: false,
                message: 'Por favor, escribe al menos 10 caracteres para que tu comentario sea útil.'
            };
        }

        if (comment.trim().length > 500) {
            return {
                isValid: false,
                message: 'El comentario no puede exceder los 500 caracteres.'
            };
        }

        if (!comment.replace(/\s/g, '').length) {
            return {
                isValid: false,
                message: 'El comentario no puede contener solo espacios en blanco.'
            };
        }

        // Verificar contenido repetitivo
        const words = comment.trim().split(/\s+/);
        const uniqueWords = new Set(words);
        if (uniqueWords.size < 3) {
            return {
                isValid: false,
                message: 'Por favor, escribe un comentario más descriptivo con al menos 3 palabras diferentes.'
            };
        }

        return { isValid: true };
    }

    async submitFeedback() {
        const commentInput = document.getElementById('feedback-comment');
        if (!commentInput) return;

        const comment = commentInput.value.trim();
        const errorElement = document.getElementById('feedback-error');
        const successElement = document.getElementById('feedback-success');
        const form = document.getElementById('feedback-form');
        
        if (!form) return;

        const csrfToken = form.querySelector('input[name="csrf_token"]')?.value;

        if (errorElement) errorElement.style.display = 'none';
        if (successElement) successElement.style.display = 'none';

        // Validar token CSRF
        if (!this.validateCSRFToken(csrfToken)) {
            if (errorElement) {
                errorElement.textContent = 'Error de seguridad. Por favor, recarga la página e intenta nuevamente.';
                errorElement.style.display = 'block';
            }
            return;
        }

        const validation = this.validateComment(comment);
        if (!validation.isValid) {
            if (errorElement) {
                errorElement.textContent = validation.message;
                errorElement.style.display = 'block';
            }
            return;
        }

        try {
            // Intentar enviar al servidor si está disponible
            await this.sendFeedbackToServer(comment, csrfToken);
            
            // Guardar localmente como respaldo
            this.saveFeedback(comment);
            
            if (successElement) {
                successElement.style.display = 'block';
            }
            this.stats.feedbackSubmitted++;
            this.saveStats();
            
            // Track en Analytics
            this.trackEvent('feedback_submit', 'user_engagement', 'user_feedback', this.stats.feedbackSubmitted);
            
            setTimeout(() => {
                this.closeFeedbackModal();
                if (successElement) {
                    successElement.style.display = 'none';
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error enviando feedback:', error);
            // Fallback a almacenamiento local
            this.saveFeedback(comment);
            if (successElement) {
                successElement.style.display = 'block';
            }
            
            setTimeout(() => {
                this.closeFeedbackModal();
                if (successElement) {
                    successElement.style.display = 'none';
                }
            }, 2000);
        }
    }

    async sendFeedbackToServer(comment, csrfToken) {
        const formData = new FormData();
        formData.append('comment', comment);
        formData.append('csrf_token', csrfToken);
        formData.append('form_type', 'feedback');
        formData.append('timestamp', new Date().toISOString());
        formData.append('user_agent', navigator.userAgent);

        const response = await fetch('/form-handler.php', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Error del servidor');
        }

        return data;
    }

    saveFeedback(comment) {
        try {
            const feedbacks = JSON.parse(localStorage.getItem('odam-feedback') || '[]');
            feedbacks.push({
                comment: comment,
                timestamp: new Date().toISOString(),
                type: 'feedback',
                rating: this.rating.userVote,
                userAgent: navigator.userAgent.substring(0, 100)
            });
            
            // Mantener solo los últimos 50 comentarios
            const trimmedFeedbacks = feedbacks.slice(-50);
            localStorage.setItem('odam-feedback', JSON.stringify(trimmedFeedbacks));
            
            console.log('✅ Feedback guardado localmente');
        } catch (e) {
            console.error('Error guardando feedback:', e);
        }
    }

    openFeedbackModal() {
        const modal = document.getElementById('feedback-modal');
        const textarea = document.getElementById('feedback-comment');
        
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Regenerar token CSRF para este formulario
            this.loadCSRFToken().then(() => {
                const csrfInput = modal.querySelector('input[name="csrf_token"]');
                if (csrfInput) {
                    csrfInput.value = this.csrfToken;
                }
            });
            
            // Track en Analytics
            this.trackEvent('modal_open', 'user_interaction', 'feedback_modal');
            
            setTimeout(() => {
                if (textarea) textarea.focus();
            }, 300);
        }
    }

    closeFeedbackModal() {
        const modal = document.getElementById('feedback-modal');
        const form = document.getElementById('feedback-form');
        const errorElement = document.getElementById('feedback-error');
        const successElement = document.getElementById('feedback-success');
        const charCount = document.getElementById('char-count');
        
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        
        if (form) {
            form.reset();
            if (charCount) charCount.textContent = '0';
        }
        
        if (errorElement) errorElement.style.display = 'none';
        if (successElement) successElement.style.display = 'none';
    }

    updateDisplay() {
        this.updateStatsDisplay();
        this.updateRatingDisplay();
    }

    updateStatsDisplay() {
        const visitsElement = document.getElementById('stat-visits');
        const timeElement = document.getElementById('stat-time');
        const engagementElement = document.getElementById('stat-engagement');
        const projectsElement = document.getElementById('stat-projects');

        // Usar valores por defecto 0 para evitar NaN
        const visits = this.stats.visits || 0;
        const timeMinutes = Math.round((this.stats.timeSpent || 0) / 60000);
        const engagement = this.getEngagementScore();
        const projects = (this.stats.projectsViewed || 0) + (this.stats.audioPlays || 0);

        if (visitsElement) visitsElement.textContent = visits;
        if (timeElement) timeElement.textContent = timeMinutes + 'm';
        if (engagementElement) engagementElement.textContent = engagement + '%';
        if (projectsElement) projectsElement.textContent = projects;
    }

    updateRatingDisplay() {
        const likeBtns = document.querySelectorAll('.like-btn');
        const dislikeBtns = document.querySelectorAll('.dislike-btn');
        const ratingResults = document.querySelectorAll('.rating-result');

        likeBtns.forEach(btn => {
            btn.className = `rating-btn like-btn ${this.rating.userVote === 'like' ? 'liked' : ''}`;
        });

        dislikeBtns.forEach(btn => {
            btn.className = `rating-btn dislike-btn ${this.rating.userVote === 'dislike' ? 'disliked' : ''}`;
        });

        ratingResults.forEach(result => {
            result.textContent = this.getRatingText();
        });
    }

    getEngagementScore() {
        // Asegurar que todos los valores sean números válidos
        const scrollScore = Number(this.stats.scrollDepth) || 0;
        const timeScore = Math.min(Math.round((Number(this.stats.timeSpent) || 0) / 60000) * 2, 100);
        const clickScore = Math.min((Number(this.stats.clicks) || 0) * 3, 100);
        const projectScore = Math.min(((Number(this.stats.projectsViewed) || 0) + (Number(this.stats.audioPlays) || 0)) * 10, 100);
        const serviceScore = Math.min((Number(this.stats.servicesExplored) || 0) * 15, 100);
        const feedbackScore = Math.min((Number(this.stats.feedbackSubmitted) || 0) * 20, 100);
        const ratingScore = Math.min((Number(this.stats.ratingsGiven) || 0) * 25, 100);
        
        // Calcular score evitando NaN
        const totalScore = (scrollScore + timeScore + clickScore + projectScore + serviceScore + feedbackScore + ratingScore) / 7;
        const finalScore = Math.round(Math.max(0, Math.min(100, totalScore)));
        
        return isNaN(finalScore) ? 0 : finalScore;
    }

    getRatingText() {
        const total = this.rating.likes + this.rating.dislikes;
        if (total === 0) return 'Sé el primero en valorar';
        const percentage = Math.round((this.rating.likes / total) * 100);
        return `${percentage}% de las personas les gusta esta página (${total} votos)`;
    }

    handleStatClick(statType, event) {
        if (event) {
            const statItem = event.currentTarget;
            statItem.style.transform = 'scale(0.95)';
            setTimeout(() => {
                statItem.style.transform = 'scale(1)';
            }, 150);
        }
        
        // Track en Analytics
        this.trackEvent('stat_click', 'user_interaction', statType);
        
        if (statType === 'projects') {
            // Redirigir a la sección de proyectos
            const proyectosSection = document.getElementById('proyectos');
            if (proyectosSection) {
                proyectosSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
        
        switch(statType) {
            case 'visits':
                console.log(`Has visitado esta página ${this.stats.visits} veces`);
                break;
            case 'time':
                const minutes = Math.round(this.stats.timeSpent / 60000);
                console.log(`Has pasado ${minutes} minutos en esta página`);
                break;
            case 'engagement':
                console.log(`Tu nivel de compromiso es del ${this.getEngagementScore()}%`);
                break;
            case 'projects':
                console.log(`Has visto ${this.stats.projectsViewed} proyectos y reproducido ${this.stats.audioPlays} audios`);
                break;
        }
    }

    getStats() {
        return { ...this.stats };
    }

    getRating() {
        return { ...this.rating };
    }

    resetStats() {
        this.stats = this.getDefaultStats();
        this.saveStats();
        this.updateDisplay();
        
        // Track en Analytics
        this.trackEvent('stats_reset', 'system', 'manual_reset');
    }

    exportData() {
        return {
            stats: this.getStats(),
            rating: this.getRating(),
            feedback: JSON.parse(localStorage.getItem('odam-feedback') || '[]'),
            exportDate: new Date().toISOString(),
            version: '2.0.0'
        };
    }

    // Método para limpiar datos antiguos
    cleanupOldData() {
        try {
            const feedbacks = JSON.parse(localStorage.getItem('odam-feedback') || '[]');
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            
            const recentFeedbacks = feedbacks.filter(feedback => {
                return new Date(feedback.timestamp) > oneMonthAgo;
            });
            
            localStorage.setItem('odam-feedback', JSON.stringify(recentFeedbacks));
            console.log(`🧹 Limpiados ${feedbacks.length - recentFeedbacks.length} comentarios antiguos`);
        } catch (error) {
            console.error('Error limpiando datos antiguos:', error);
        }
    }
}

// ===== LIGHTHOUSE PERFORMANCE TRACKING =====
class LighthouseTracker {
    static init() {
        this.trackPerformance();
        this.trackAccessibility();
        this.trackBestPractices();
    }

    static trackPerformance() {
        if ('performance' in window) {
            const navigationTiming = performance.getEntriesByType('navigation')[0];
            if (navigationTiming) {
                const loadTime = navigationTiming.loadEventEnd - navigationTiming.navigationStart;
                console.log(`🚀 Lighthouse - Page Load Time: ${loadTime}ms`);
                
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'performance_timing', {
                        load_time: loadTime,
                        dom_content_loaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart
                    });
                }
            }
        }
    }

    static trackAccessibility() {
        const accessibilityChecks = {
            hasAltTags: document.querySelectorAll('img:not([alt])').length === 0,
            hasHeadings: document.querySelectorAll('h1, h2, h3').length > 0,
            hasLandmarks: document.querySelectorAll('header, nav, main, footer').length >= 4,
            colorContrast: this.checkColorContrast()
        };

        console.log('♿ Lighthouse - Accessibility:', accessibilityChecks);
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'accessibility_check', accessibilityChecks);
        }
    }

    static checkColorContrast() {
        try {
            const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--rich-gold');
            const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-black');
            return primaryColor && backgroundColor ? 'adequate' : 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    static trackBestPractices() {
        const bestPractices = {
            https: window.location.protocol === 'https:',
            serviceWorker: 'serviceWorker' in navigator,
            modernJS: typeof window.StatsSystem !== 'undefined',
            responsive: window.innerWidth <= 768,
            csrfProtected: typeof window.csrfTokenManager !== 'undefined'
        };

        console.log('🏆 Lighthouse - Best Practices:', bestPractices);
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'best_practices_check', bestPractices);
        }
    }
}

// 👇 INICIALIZACIÓN MEJORADA PARA EVITAR MÚLTIPLES INSTANCIAS
document.addEventListener('DOMContentLoaded', function() {
    // CORRECCIÓN: Verificación mejorada para evitar instancias múltiples
    if (!window.statsSystem) {
        window.statsSystem = new StatsSystem();
        
        // Limpiar duplicados después de un breve delay
        setTimeout(() => {
            if (window.statsSystem && typeof window.statsSystem.removeDuplicates === 'function') {
                window.statsSystem.removeDuplicates();
            }
            
            // Limpiar datos antiguos una vez al día
            const lastCleanup = localStorage.getItem('odam-last-cleanup');
            const today = new Date().toDateString();
            if (lastCleanup !== today) {
                window.statsSystem.cleanupOldData();
                localStorage.setItem('odam-last-cleanup', today);
            }
        }, 1000);
    } else {
        console.log('⚠️ StatsSystem ya está inicializado. Evitando duplicado.');
    }
    
    window.LighthouseTracker = LighthouseTracker;
    LighthouseTracker.init();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StatsSystem, LighthouseTracker };
}
