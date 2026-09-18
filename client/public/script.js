// Live life-member count on the homepage hero, pulled from the backend
const lifeMemberCountEl = document.getElementById('life-member-count');
if (lifeMemberCountEl) {
  fetch('/api/members/stats/public')
    .then(res => res.ok ? res.json() : Promise.reject(res.status))
    .then(data => {
      if (typeof data.lifeMembers === 'number') {
        lifeMemberCountEl.textContent = data.lifeMembers.toLocaleString('en-IN');
      }
    })
    .catch(() => {
      // Keep the static fallback already in the page markup.
    });
}

// Highlight the current page in the primary nav
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.site-nav a, .footer-nav a').forEach(link => {
  const linkPage = link.getAttribute('href').split('/').pop() || 'index.html';
  if (linkPage === currentPage) link.classList.add('active');
});

// Accessible mobile navigation
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');

if (navToggle && siteNav) {
  const closeMenu = () => {
    siteNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  document.addEventListener('click', event => {
    if (siteNav.classList.contains('open') &&
        !siteNav.contains(event.target) &&
        !navToggle.contains(event.target)) {
      closeMenu();
    }
  });
}
