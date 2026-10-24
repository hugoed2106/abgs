(function () {
    const MOBILE_BREAKPOINT = 768;

    function updateOrientationClass() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isMobilePortrait = width <= MOBILE_BREAKPOINT && height > width;
        document.body.classList.toggle('is-mobile-portrait', isMobilePortrait);
    }

    window.addEventListener('resize', updateOrientationClass);
    window.addEventListener('orientationchange', updateOrientationClass);
    document.addEventListener('DOMContentLoaded', updateOrientationClass);
    updateOrientationClass();
})();

(function () {
    const bar = document.getElementById("bar");
    const home = document.getElementById("home");

    if (!bar || !home) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            bar.classList.toggle("hidden", entry.isIntersecting);
        });
    }, {
        threshold: 0.2
    });

    observer.observe(home);
})();