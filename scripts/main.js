const navigationEntry = performance.getEntriesByType?.('navigation')?.[0];
const pageWasReloaded = navigationEntry?.type === 'reload'
    || performance.navigation?.type === 1;

if (pageWasReloaded) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#inicio`);
    window.scrollTo(0, 0);
    window.addEventListener('pageshow', () => window.scrollTo(0, 0), { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.documentElement.classList.add('hero-ready');

    initHeroMenu();
    initHeroParallax(prefersReducedMotion);
    initServicesReveal(prefersReducedMotion);
    initServiceCardTilt(prefersReducedMotion);
    initNavigationState();
    initPortfolioReveal(prefersReducedMotion);
    initAboutCampaign(prefersReducedMotion);
    initProcessCampaign(prefersReducedMotion);
    initFinalCtaCampaign(prefersReducedMotion);
    initPortfolioParallax(prefersReducedMotion);
    initLightbox();
    initFaq(prefersReducedMotion);
    initCampaignFooter(prefersReducedMotion);
    initBackToTop();

    if (window.location.hash) {
        requestAnimationFrame(() => document.querySelector(window.location.hash)?.scrollIntoView());
    }
});

function initAboutCampaign(prefersReducedMotion) {
    const campaign = document.querySelector('[data-about-campaign]');
    const visual = campaign?.querySelector('.about-campaign-visual');
    if (!campaign || !visual) return;

    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
        campaign.classList.add('is-visible');
    } else {
        document.documentElement.classList.add('about-campaign-observe-ready');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.08 });
        observer.observe(campaign);
    }

    if (prefersReducedMotion.matches || !window.matchMedia('(min-width: 1101px) and (pointer: fine)').matches) return;

    let animationFrame = 0;
    const renderDepth = (x, y) => {
        visual.style.setProperty('--about-art-x', `${x * 5}px`);
        visual.style.setProperty('--about-art-y', `${y * 4}px`);
        visual.style.setProperty('--about-plate-x', `${x * -2.5}px`);
        visual.style.setProperty('--about-plate-y', `${y * -2}px`);
        visual.style.setProperty('--about-glow-x', `${x * 2}px`);
    };

    visual.addEventListener('pointermove', (event) => {
        const bounds = visual.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(() => renderDepth(x, y));
    });

    visual.addEventListener('pointerleave', () => {
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(() => renderDepth(0, 0));
    });
}

function initProcessCampaign(prefersReducedMotion) {
    const campaign = document.querySelector('[data-process-campaign]');
    const grid = campaign?.querySelector('.process-campaign-grid');
    const cards = [...(campaign?.querySelectorAll('[data-process-card]') || [])];
    if (!campaign || !grid || cards.length !== 4) return;

    const canAnimate = 'animate' in Element.prototype;
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let sequenceRunning = false;
    let gridInView = false;
    let loopTimer = 0;
    const setFinalState = () => {
        cards.forEach((card) => {
            card.getAnimations().forEach((animation) => animation.cancel());
            card.style.removeProperty('opacity');
            card.style.removeProperty('transform');
            card.style.removeProperty('transform-origin');
            card.style.removeProperty('z-index');
            card.style.removeProperty('box-shadow');
        });
        grid.classList.remove('is-card-impacting');
        campaign.classList.remove('is-card-sequence-running', 'is-card-sequence-locked');
        campaign.classList.add('is-visible', 'is-animation-complete');
        campaign.dataset.cardSequencePhase = 'complete';
    };

    if (prefersReducedMotion.matches || !canAnimate) {
        setFinalState();
    } else {
        document.documentElement.classList.add('process-campaign-observe-ready');
        campaign.classList.add('is-card-sequence-ready');

        const dealOrigins = [
            { x: -90, y: 45, rotate: -5 },
            { x: -65, y: 60, rotate: 4 },
            { x: 70, y: 50, rotate: -3 },
            { x: 100, y: 40, rotate: 5 }
        ];

        cards.forEach((card, index) => {
            const mobileFactor = window.innerWidth <= 700 ? 0.28 : window.innerWidth <= 1100 ? 0.62 : 1;
            const origin = dealOrigins[index];
            card.style.opacity = '0';
            card.style.transformOrigin = '50% 72%';
            card.style.transform = `perspective(1400px) translate3d(${origin.x * mobileFactor}px, ${origin.y}px, 0) rotateX(${index % 2 ? 1.5 : -1.5}deg) rotateZ(${origin.rotate}deg) scale(.94)`;
        });

        const transformCard = ({ x = 0, y = 0, rotate = 0, rotateX = 0, scale = 1 }) =>
            `perspective(1400px) translate3d(${x}px, ${y}px, 0) rotateX(${rotateX}deg) rotateZ(${rotate}deg) scale(${scale})`;
        const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
        const finishAnimations = (animations) => Promise.all(animations.map((animation) => animation.finished));

        const scheduleNextSequence = (delay = 4000) => {
            window.clearTimeout(loopTimer);
            loopTimer = 0;
            if (!gridInView || sequenceRunning || document.visibilityState !== 'visible') return;
            campaign.dataset.cardSequencePhase = 'pause';
            loopTimer = window.setTimeout(() => {
                loopTimer = 0;
                if (gridInView && document.visibilityState === 'visible') playCardSequence();
            }, delay);
        };

        const playCardSequence = async () => {
            if (sequenceRunning || !gridInView) return;
            sequenceRunning = true;
            window.clearTimeout(loopTimer);
            loopTimer = 0;
            campaign.dataset.cardSequencePlayed = 'true';
            campaign.dataset.cardSequencePhase = 'deal';
            campaign.classList.remove('is-animation-complete');
            campaign.classList.add('is-visible', 'is-card-sequence-running');

            try {
                const horizontalFactor = window.innerWidth <= 700 ? 0.28 : window.innerWidth <= 1100 ? 0.62 : 1;
                const dealAnimations = cards.map((card, index) => {
                    const origin = dealOrigins[index];
                    return card.animate([
                        {
                            opacity: 0,
                            transform: transformCard({
                                x: origin.x * horizontalFactor,
                                y: origin.y,
                                rotate: origin.rotate,
                                rotateX: index % 2 ? 1.5 : -1.5,
                                scale: .94
                            })
                        },
                        { opacity: 1, offset: .84, transform: transformCard({ scale: 1.015 }) },
                        { opacity: 1, transform: transformCard({ scale: 1 }) }
                    ], {
                        duration: 590,
                        delay: index * 220,
                        easing: 'cubic-bezier(.16,1,.3,1)',
                        fill: 'both'
                    });
                });
                await finishAnimations(dealAnimations);
                dealAnimations.forEach((animation) => animation.cancel());
                cards.forEach((card) => {
                    card.style.opacity = '1';
                    card.style.transform = 'none';
                });

                await wait(500);

                const gridRect = grid.getBoundingClientRect();
                const cardRects = cards.map((card) => card.getBoundingClientRect());
                const cardWidth = cardRects[0].width;
                const cardHeight = cardRects[0].height;
                const isMobile = gridRect.width < cardWidth * 1.45;
                const isTablet = !isMobile && gridRect.width < cardWidth * 3;
                const stageCenterX = gridRect.left + gridRect.width / 2;
                const visibleStageY = Math.min(
                    window.innerHeight - cardHeight * .55,
                    Math.max(cardHeight * .55, window.innerHeight * .66)
                );
                const stageCenterY = isMobile || isTablet
                    ? visibleStageY
                    : gridRect.top + gridRect.height / 2;
                const stackOffsets = [
                    { x: -7, y: 4, rotate: -4 },
                    { x: -3, y: 2, rotate: -1.5 },
                    { x: 3, y: -1, rotate: 2 },
                    { x: 7, y: 2, rotate: 4 }
                ];
                const stackScale = isMobile ? .82 : isTablet ? .9 : .92;
                const centers = cardRects.map((rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }));
                const stackStates = centers.map((center, index) => ({
                    x: stageCenterX - center.x + stackOffsets[index].x,
                    y: stageCenterY - center.y + stackOffsets[index].y,
                    rotate: stackOffsets[index].rotate,
                    rotateX: index % 2 ? 1 : -1,
                    scale: stackScale
                }));

                campaign.classList.add('is-card-sequence-locked');
                campaign.dataset.cardSequencePhase = 'gather';
                cards.forEach((card, index) => { card.style.zIndex = String(index + 4); });
                const gatherAnimations = cards.map((card, index) => card.animate([
                    { transform: transformCard({ scale: 1 }), boxShadow: '0 18px 50px rgba(0,0,0,.38)' },
                    { transform: transformCard(stackStates[index]), boxShadow: '0 32px 68px rgba(0,0,0,.5)' }
                ], {
                    duration: 580,
                    easing: 'cubic-bezier(.16,1,.3,1)',
                    fill: 'both'
                }));
                await finishAnimations(gatherAnimations);
                campaign.dataset.cardSequencePhase = 'stack';

                const pulseAnimations = cards.map((card, index) => card.animate([
                    { transform: transformCard(stackStates[index]) },
                    { transform: transformCard({ ...stackStates[index], scale: stackScale + .02 }), offset: .5 },
                    { transform: transformCard(stackStates[index]) }
                ], { duration: 215, easing: 'ease-in-out', fill: 'both' }));
                await finishAnimations(pulseAnimations);
                await wait(190);

                const liftStates = stackStates.map((state, index) => ({
                    ...state,
                    y: state.y - 27,
                    rotateX: index % 2 ? 2 : -2,
                    scale: stackScale + .03
                }));
                campaign.dataset.cardSequencePhase = 'throw';
                const liftAnimations = cards.map((card, index) => card.animate([
                    { transform: transformCard(stackStates[index]), boxShadow: '0 30px 66px rgba(0,0,0,.5)' },
                    { transform: transformCard(liftStates[index]), boxShadow: '0 42px 78px rgba(0,0,0,.58)' }
                ], { duration: 160, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' }));
                await finishAnimations(liftAnimations);

                const safeHorizontal = Math.max(8, Math.min(135, (window.innerWidth - cardWidth) / 2 - 8));
                const scatterXPattern = isMobile ? [-1, -.35, .4, 1] : isTablet ? [-1, -.32, .36, 1] : [-.93, -.34, .41, 1];
                const scatterYPattern = isMobile ? [42, 62, 48, 68] : [55, 78, 62, 82];
                const scatterRotations = [-11, 7, -6, 10];
                const scatterStates = centers.map((center, index) => ({
                    x: stageCenterX - center.x + scatterXPattern[index] * safeHorizontal,
                    y: stageCenterY - center.y + scatterYPattern[index],
                    rotate: scatterRotations[index],
                    rotateX: index % 2 ? 2.5 : -2,
                    scale: isMobile ? (index % 2 ? .77 : .76) : isTablet ? (index % 2 ? .93 : .92) : (index % 2 ? .97 : .96)
                }));

                grid.classList.add('is-card-impacting');
                const throwAnimations = cards.map((card, index) => card.animate([
                    { transform: transformCard(liftStates[index]), boxShadow: '0 42px 78px rgba(0,0,0,.58)' },
                    { transform: transformCard(scatterStates[index]), boxShadow: '0 22px 46px rgba(0,0,0,.43)' }
                ], { duration: 320, easing: 'cubic-bezier(.58,.05,.72,.28)', fill: 'both' }));
                await finishAnimations(throwAnimations);

                const settledStates = scatterStates.map((state, index) => ({
                    ...state,
                    y: state.y - (index % 2 ? 5 : 7),
                    scale: state.scale + .01
                }));
                const impactAnimations = cards.map((card, index) => card.animate([
                    { transform: transformCard(scatterStates[index]), boxShadow: '0 22px 46px rgba(0,0,0,.43)' },
                    { transform: transformCard({ ...settledStates[index], scale: Math.min(1.01, settledStates[index].scale + .025) }), offset: .48, boxShadow: '0 16px 38px rgba(0,0,0,.38)' },
                    { transform: transformCard(settledStates[index]), boxShadow: '0 18px 42px rgba(0,0,0,.4)' }
                ], { duration: 155, easing: 'ease-out', fill: 'both' }));
                await finishAnimations(impactAnimations);
                grid.classList.remove('is-card-impacting');
                campaign.dataset.cardSequencePhase = 'scatter';
                await wait(500);

                campaign.dataset.cardSequencePhase = 'reorder';
                const reorderAnimations = cards.map((card, index) => card.animate([
                    { transform: transformCard(settledStates[index]), boxShadow: '0 18px 42px rgba(0,0,0,.4)' },
                    { transform: transformCard({ scale: 1.008 }), offset: .88, boxShadow: '0 20px 48px rgba(0,0,0,.4)' },
                    { transform: transformCard({ scale: 1 }), boxShadow: '0 18px 50px rgba(0,0,0,.38)' }
                ], {
                    duration: 500,
                    delay: index * 100,
                    easing: 'cubic-bezier(.16,1,.3,1)',
                    fill: 'both'
                }));
                await finishAnimations(reorderAnimations);

                const settleAnimations = cards.map((card) => card.animate([
                    { transform: transformCard({ y: 0 }) },
                    { transform: transformCard({ y: -2 }), offset: .5 },
                    { transform: transformCard({ y: 0 }) }
                ], { duration: 240, easing: 'ease-in-out' }));
                await finishAnimations(settleAnimations);
            } catch (error) {
                console.warn('A animação dos cards foi concluída no estado seguro.', error);
            } finally {
                setFinalState();
                sequenceRunning = false;
                scheduleNextSequence();
            }
        };

        if ('IntersectionObserver' in window) {
            const visibilityObserver = new IntersectionObserver((entries) => {
                gridInView = entries.some((entry) => entry.isIntersecting);
                if (!gridInView) {
                    window.clearTimeout(loopTimer);
                    loopTimer = 0;
                    return;
                }
                if (campaign.dataset.cardSequencePlayed === 'true' && !sequenceRunning) scheduleNextSequence(450);
            }, { threshold: .05 });
            visibilityObserver.observe(grid);

            const startObserver = new IntersectionObserver((entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                gridInView = true;
                startObserver.disconnect();
                playCardSequence();
            }, { threshold: .3 });
            startObserver.observe(cards[0]);

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState !== 'visible') {
                    window.clearTimeout(loopTimer);
                    loopTimer = 0;
                    return;
                }
                if (gridInView && !sequenceRunning && campaign.dataset.cardSequencePlayed === 'true') scheduleNextSequence(450);
            });
        } else {
            gridInView = true;
            playCardSequence();
        }
    }

    if (!hasFinePointer || prefersReducedMotion.matches) return;

    cards.forEach((card) => {
        let animationFrame = 0;
        const renderTilt = (x, y) => {
            if (!campaign.classList.contains('is-animation-complete')) return;
            card.style.setProperty('--process-card-tilt-x', `${y * -1.5}deg`);
            card.style.setProperty('--process-card-tilt-y', `${x * 1.5}deg`);
        };

        card.addEventListener('pointermove', (event) => {
            const bounds = card.getBoundingClientRect();
            const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
            const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(() => renderTilt(x, y));
        });

        card.addEventListener('pointerleave', () => {
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(() => renderTilt(0, 0));
        });
    });
}

function initHeroMenu() {
    const toggle = document.querySelector('.hero-menu-toggle');
    const menu = document.querySelector('.hero-menu');
    if (!toggle || !menu) return;

    const closeMenu = () => {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menu');
    };

    toggle.addEventListener('click', () => {
        const willOpen = !menu.classList.contains('is-open');
        menu.classList.toggle('is-open', willOpen);
        toggle.setAttribute('aria-expanded', String(willOpen));
        toggle.setAttribute('aria-label', willOpen ? 'Fechar menu' : 'Abrir menu');
    });

    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('click', (event) => {
        if (!menu.contains(event.target) && !toggle.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMenu();
    });
}

function initServicesReveal(prefersReducedMotion) {
    const section = document.querySelector('.services-stage');
    if (!section || prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
        section?.classList.add('is-visible');
        return;
    }

    document.documentElement.classList.add('services-observe-ready');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12 });
    observer.observe(section);
}

function initServiceCardTilt(prefersReducedMotion) {
    if (prefersReducedMotion.matches || !window.matchMedia('(pointer: fine)').matches) return;

    document.querySelectorAll('[data-service-card]').forEach((card) => {
        card.addEventListener('pointermove', (event) => {
            const bounds = card.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width - 0.5;
            const y = (event.clientY - bounds.top) / bounds.height - 0.5;
            card.style.setProperty('--tilt-x', `${y * -2}deg`);
            card.style.setProperty('--tilt-y', `${x * 2}deg`);
        });
        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--tilt-x', '0deg');
            card.style.setProperty('--tilt-y', '0deg');
        });
    });
}

function initNavigationState() {
    const navLinks = Array.from(document.querySelectorAll('.hero-menu a[href^="#"]'));
    const sections = navLinks
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);
    if (!navLinks.length || !sections.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            navLinks.forEach((link) => {
                link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
            });
        });
    }, { rootMargin: '-28% 0px -62% 0px', threshold: 0 });

    sections.forEach((section) => observer.observe(section));
}

function initHeroParallax(prefersReducedMotion) {
    const stage = document.querySelector('.home-stage');
    const campaign = document.querySelector('.hero-campaign');
    if (!stage || !campaign || prefersReducedMotion.matches || !window.matchMedia('(pointer: fine)').matches) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;

    const render = () => {
        current.x += (target.x - current.x) * 0.075;
        current.y += (target.y - current.y) * 0.075;
        campaign.style.setProperty('--parallax-x', `${current.x * 9}px`);
        campaign.style.setProperty('--parallax-y', `${current.y * 8}px`);
        campaign.style.setProperty('--parallax-rx', `${current.y * -1.5}deg`);
        campaign.style.setProperty('--parallax-ry', `${current.x * 2.2}deg`);

        if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) {
            frame = requestAnimationFrame(render);
        } else {
            frame = 0;
        }
    };

    const schedule = () => {
        if (!frame) frame = requestAnimationFrame(render);
    };

    stage.addEventListener('pointermove', (event) => {
        const bounds = stage.getBoundingClientRect();
        target.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        target.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
        schedule();
    });

    stage.addEventListener('pointerleave', () => {
        target.x = 0;
        target.y = 0;
        schedule();
    });
}

function initPortfolioReveal(prefersReducedMotion) {
    const section = document.querySelector('.portfolio-section');
    if (!section) return;

    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
        section.classList.add('is-visible');
        return;
    }

    document.documentElement.classList.add('portfolio-observe-ready');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            section.classList.add('is-visible');
            observer.disconnect();
        });
    }, { threshold: 0.1 });
    observer.observe(section);
}

function initInstagramShowcaseReveal(prefersReducedMotion) {
    const showcase = document.querySelector('.portfolio-instagram');
    if (!showcase) return;

    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
        showcase.classList.add('is-visible');
        return;
    }

    document.documentElement.classList.add('instagram-observe-ready');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            showcase.classList.add('is-visible');
            observer.disconnect();
        });
    }, { threshold: 0.16 });
    observer.observe(showcase);
}

function initPortfolioParallax(prefersReducedMotion) {
    const section = document.querySelector('.portfolio-section');
    if (!section || prefersReducedMotion.matches || !window.matchMedia('(pointer: fine)').matches) return;

    section.addEventListener('pointermove', (event) => {
        const bounds = section.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 8;
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
        section.style.setProperty('--decor-x', `${x.toFixed(2)}px`);
        section.style.setProperty('--decor-y', `${y.toFixed(2)}px`);
    });
    section.addEventListener('pointerleave', () => {
        section.style.setProperty('--decor-x', '0px');
        section.style.setProperty('--decor-y', '0px');
    });
}

function initLightbox() {
    const sourceGroups = Array.from(document.querySelectorAll('.portfolio-marquee-group:not([data-marquee-clone])'));
    const sourceCards = sourceGroups.flatMap((group) => Array.from(group.querySelectorAll('.portfolio-card')));

    sourceCards.forEach((card, index) => { card.dataset.portfolioIndex = String(index); });
    sourceGroups.forEach((group) => {
        const track = group.parentElement;
        if (!track || track.querySelector('[data-marquee-clone]')) return;
        const clone = group.cloneNode(true);
        clone.dataset.marqueeClone = '';
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('.portfolio-card').forEach((card) => { card.tabIndex = -1; });
        track.appendChild(clone);
    });

    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImg');
    const closeButton = document.querySelector('.modal-close');
    const previousButton = document.querySelector('.modal-nav.prev');
    const nextButton = document.querySelector('.modal-nav.next');
    const modalMedia = modal?.querySelector('.modal-content');
    const portfolioCards = Array.from(document.querySelectorAll('.portfolio-card'));
    const showcase = document.querySelector('.portfolio-showcase');
    const featured = document.querySelector('.portfolio-featured');
    const featuredImg = featured?.querySelector('.portfolio-featured-img');
    const featuredClose = featured?.querySelector('.portfolio-featured-close');
    const featuredPrevious = featured?.querySelector('.portfolio-featured-nav.prev');
    const featuredNext = featured?.querySelector('.portfolio-featured-nav.next');
    const desktopPreview = window.matchMedia('(min-width: 1181px)');
    if (!modal || !modalImg || !closeButton || !previousButton || !nextButton || !sourceCards.length) return;

    const images = sourceCards.map((card) => {
        const image = card.querySelector('.portfolio-img');
        return {
            src: image?.currentSrc || image?.src || '',
            alt: image?.alt || 'Trabalho real de nail design'
        };
    });
    let currentIndex = 0;
    let featuredIndex = 0;
    let lastFocus = null;
    let swipeStartX = null;

    const showImage = (index) => {
        currentIndex = (index + images.length) % images.length;
        const image = images[currentIndex];
        modalImg.src = image.src;
        modalImg.alt = image.alt;
    };
    const closeModal = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        lastFocus?.focus();
    };

    const openModalAt = (index) => {
        currentIndex = (index + images.length) % images.length;
        lastFocus = document.activeElement;
        showImage(currentIndex);
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        closeButton.focus();
    };

    const showFeatured = (index) => {
        if (!featured || !featuredImg) return;
        featuredIndex = (index + images.length) % images.length;
        const image = images[featuredIndex];
        featured.hidden = false;
        showcase?.classList.remove('is-preview-closed');
        portfolioCards.forEach((card) => card.classList.toggle('is-selected', Number(card.dataset.portfolioIndex) === featuredIndex));
        featured.classList.add('is-changing');
        featuredImg.src = image.src;
        featuredImg.alt = image.alt;
        requestAnimationFrame(() => requestAnimationFrame(() => featured.classList.remove('is-changing')));
    };

    portfolioCards.forEach((card) => {
        card.addEventListener('click', () => {
            const index = Number(card.dataset.portfolioIndex);
            if (!Number.isInteger(index)) return;
            if (desktopPreview.matches && featured) {
                showFeatured(index);
                return;
            }
            openModalAt(index);
        });
    });

    if (desktopPreview.matches) showFeatured(0);
    desktopPreview.addEventListener?.('change', (event) => {
        if (event.matches) {
            showFeatured(featuredIndex);
            return;
        }
        portfolioCards.forEach((card) => card.classList.remove('is-selected'));
    });
    featuredPrevious?.addEventListener('click', () => showFeatured(featuredIndex - 1));
    featuredNext?.addEventListener('click', () => showFeatured(featuredIndex + 1));
    featuredClose?.addEventListener('click', () => {
        if (!featured) return;
        featured.hidden = true;
        showcase?.classList.add('is-preview-closed');
        portfolioCards.forEach((card) => card.classList.remove('is-selected'));
    });
    featuredImg?.addEventListener('click', () => openModalAt(featuredIndex));

    closeButton?.addEventListener('click', closeModal);
    previousButton?.addEventListener('click', () => showImage(currentIndex - 1));
    nextButton?.addEventListener('click', () => showImage(currentIndex + 1));
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });
    modalMedia?.addEventListener('pointerdown', (event) => {
        swipeStartX = event.clientX;
        modalMedia.setPointerCapture?.(event.pointerId);
    });
    modalMedia?.addEventListener('pointerup', (event) => {
        if (swipeStartX === null) return;
        const distance = event.clientX - swipeStartX;
        swipeStartX = null;
        if (Math.abs(distance) < 45) return;
        showImage(currentIndex + (distance < 0 ? 1 : -1));
    });
    modalMedia?.addEventListener('pointercancel', () => { swipeStartX = null; });
    document.addEventListener('keydown', (event) => {
        if (!modal.classList.contains('is-open')) return;
        if (event.key === 'Escape') closeModal();
        if (event.key === 'ArrowLeft') showImage(currentIndex - 1);
        if (event.key === 'ArrowRight') showImage(currentIndex + 1);
        if (event.key === 'Tab') {
            const controls = Array.from(modal.querySelectorAll('button:not([disabled])'));
            if (!controls.length) return;
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });
}

function initFaq(prefersReducedMotion) {
    const section = document.querySelector('[data-faq-experience]');
    const cardList = section?.querySelector('[data-faq-list]');
    const cards = Array.from(section?.querySelectorAll('[data-faq-card]') || []);
    if (!section || !cardList || !cards.length) return;

    let currentCard = null;

    const closeCard = (card, restoreFocus = false) => {
        if (!card) return;
        const button = card.querySelector('.faq-premium-question');
        const answer = card.querySelector('.faq-premium-answer');
        card.classList.remove('is-open');
        button?.setAttribute('aria-expanded', 'false');
        answer?.setAttribute('aria-hidden', 'true');
        if (currentCard === card) currentCard = null;
        cardList.classList.toggle('has-open-card', Boolean(currentCard));
        if (restoreFocus) button?.focus({ preventScroll: true });
    };

    const openCard = (card) => {
        if (currentCard && currentCard !== card) closeCard(currentCard);
        const button = card.querySelector('.faq-premium-question');
        const answer = card.querySelector('.faq-premium-answer');
        currentCard = card;
        card.classList.add('is-open');
        button?.setAttribute('aria-expanded', 'true');
        answer?.setAttribute('aria-hidden', 'false');
        cardList.classList.add('has-open-card');

        if (window.matchMedia('(max-width: 700px)').matches) {
            requestAnimationFrame(() => card.scrollIntoView({
                behavior: prefersReducedMotion?.matches ? 'auto' : 'smooth',
                block: 'nearest'
            }));
        }
    };

    cards.forEach((card) => {
        const button = card.querySelector('.faq-premium-question');
        const answer = card.querySelector('.faq-premium-answer');
        if (!button || !answer) return;

        button.addEventListener('click', () => {
            if (currentCard === card) closeCard(card);
            else openCard(card);
        });
    });

    document.addEventListener('click', (event) => {
        if (currentCard && !event.target.closest('[data-faq-card]')) closeCard(currentCard);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !currentCard) return;
        const cardToClose = currentCard;
        closeCard(cardToClose, true);
    });

    const showSection = () => {
        section.classList.add('is-visible');
    };

    if (prefersReducedMotion?.matches || !('IntersectionObserver' in window)) {
        showSection();
    } else {
        document.documentElement.classList.add('faq-observe-ready');
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            showSection();
            observer.disconnect();
        }, { threshold: .12 });
        observer.observe(section);
    }

}

function initFinalCtaCampaign(prefersReducedMotion) {
    const section = document.querySelector('[data-final-campaign]');
    const card = section?.querySelector('[data-final-campaign-card]');
    const button = section?.querySelector('.final-campaign-whatsapp');
    if (!section || !card) return;

    const reveal = () => section.classList.add('is-visible');

    if (prefersReducedMotion?.matches || !('IntersectionObserver' in window)) {
        reveal();
    } else {
        document.documentElement.classList.add('final-campaign-observe-ready');
        const revealObserver = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            reveal();
            revealObserver.disconnect();
        }, { threshold: .14 });
        revealObserver.observe(section);
    }

    if ('IntersectionObserver' in window) {
        const visibilityObserver = new IntersectionObserver(([entry]) => {
            document.body.classList.toggle('final-campaign-in-view', entry.isIntersecting);
        }, { threshold: .08 });
        visibilityObserver.observe(section);
    }

    const precisePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (prefersReducedMotion?.matches || !precisePointer.matches) return;

    let pointerFrame = 0;
    const updateScene = (event) => {
        if (window.innerWidth <= 1100) return;
        window.cancelAnimationFrame(pointerFrame);
        pointerFrame = window.requestAnimationFrame(() => {
            const bounds = card.getBoundingClientRect();
            const unitX = (event.clientX - bounds.left) / bounds.width;
            const unitY = (event.clientY - bounds.top) / bounds.height;
            const x = (unitX - .5) * 2;
            const y = (unitY - .5) * 2;
            card.style.setProperty('--final-image-x', `${x * -5}px`);
            card.style.setProperty('--final-image-y', `${y * -4}px`);
            card.style.setProperty('--final-spot-x', `${x * 2.5}px`);
            card.style.setProperty('--final-spot-y', `${y * 2}px`);
            card.style.setProperty('--final-light-x', `${Math.max(0, Math.min(100, unitX * 100))}%`);
            card.style.setProperty('--final-light-y', `${Math.max(0, Math.min(100, unitY * 100))}%`);
        });
    };

    const resetScene = () => {
        card.style.setProperty('--final-image-x', '0px');
        card.style.setProperty('--final-image-y', '0px');
        card.style.setProperty('--final-spot-x', '0px');
        card.style.setProperty('--final-spot-y', '0px');
        card.style.setProperty('--final-light-x', '74%');
        card.style.setProperty('--final-light-y', '18%');
    };

    card.addEventListener('pointermove', updateScene, { passive: true });
    card.addEventListener('pointerleave', resetScene);

    button?.addEventListener('pointermove', (event) => {
        const bounds = button.getBoundingClientRect();
        button.style.setProperty('--final-cta-x', `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
        button.style.setProperty('--final-cta-y', `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
    }, { passive: true });
}

function initBackToTop() {
    document.getElementById('backToTop')?.addEventListener('click', () => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
}

function initCampaignFooter(prefersReducedMotion) {
    const footer = document.querySelector('[data-site-footer]');
    if (!footer) return;

    const accordions = [...footer.querySelectorAll('[data-footer-accordion]')];
    const mobileQuery = window.matchMedia('(max-width: 700px)');
    let wasMobile = null;

    const syncAccordions = () => {
        if (mobileQuery.matches && wasMobile !== true) {
            accordions.forEach((accordion) => { accordion.open = false; });
        } else if (!mobileQuery.matches) {
            accordions.forEach((accordion) => { accordion.open = true; });
        }
        wasMobile = mobileQuery.matches;
    };

    accordions.forEach((accordion) => {
        accordion.querySelector('summary')?.addEventListener('click', (event) => {
            if (!mobileQuery.matches) {
                event.preventDefault();
                return;
            }

            if (!accordion.open) {
                accordions.forEach((other) => {
                    if (other !== accordion) other.open = false;
                });
            }
        });
    });

    syncAccordions();
    mobileQuery.addEventListener?.('change', syncAccordions);

    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
        footer.classList.add('is-visible');
    } else {
        document.documentElement.classList.add('site-footer-observe-ready');
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                footer.classList.add('is-visible');
                observer.unobserve(footer);
            });
        }, { threshold: .12 });
        revealObserver.observe(footer);
    }

    if ('IntersectionObserver' in window) {
        const visibilityObserver = new IntersectionObserver(([entry]) => {
            document.body.classList.toggle('site-footer-in-view', entry.isIntersecting);
        }, { threshold: .08 });
        visibilityObserver.observe(footer);
    }
}
