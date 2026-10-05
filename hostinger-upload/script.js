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

// About page sections, managed from the admin "Brochure Website" page.
// The built-in markup stays as the fallback until sections are saved.
const aboutPlaceholder = document.querySelector('main > section.section .about-grid')?.closest('section');
if (aboutPlaceholder) {
  fetch('/api/site/about')
    .then(res => res.ok ? res.json() : null)
    .then(content => {
      if (content?.sections?.length) renderAboutSections(content.sections, aboutPlaceholder);
    })
    .catch(() => {
      // Keep the built-in content.
    });
}

function renderAboutSections(sections, placeholder) {
  const fragment = document.createDocumentFragment();

  sections.forEach(section => {
    const wrap = document.createElement('div');
    wrap.className = 'wrap about-grid' + (section.image_url ? '' : ' about-grid--text');

    if (section.image_url) {
      const figure = document.createElement('figure');
      figure.className = 'about-photo';
      const img = document.createElement('img');
      img.src = section.image_url;
      img.alt = section.image_alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      figure.appendChild(img);
      if (section.caption) {
        const caption = document.createElement('figcaption');
        caption.textContent = section.caption;
        figure.appendChild(caption);
      }
      wrap.appendChild(figure);
    }

    const body = document.createElement('div');
    body.className = 'about-body';
    (section.description || '')
      .split(/\n\s*\n/)
      .map(text => text.trim())
      .filter(Boolean)
      .forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        body.appendChild(p);
      });
    if (body.children.length) wrap.appendChild(body);
    if (!wrap.children.length) return;

    const sectionEl = document.createElement('section');
    sectionEl.className = 'section section--about';
    sectionEl.appendChild(wrap);
    fragment.appendChild(sectionEl);
  });

  const cta = document.createElement('section');
  cta.className = 'section section--about';
  cta.innerHTML = '<div class="wrap"><p><a class="btn btn-primary" href="/bearers">Meet the office bearers</a></p></div>';
  fragment.appendChild(cta);

  placeholder.replaceWith(fragment);
}

// Leaders page, managed from the admin "Brochure Website" page.
// The built-in cards stay as the fallback until the list is saved.
const leadersGrid = document.querySelector('.people-grid');
if (leadersGrid && document.querySelector('.page-hero')) {
  fetch('/api/site/leaders')
    .then(res => res.ok ? res.json() : null)
    .then(content => {
      if (content?.leaders?.length) renderLeaders(content, leadersGrid);
    })
    .catch(() => {
      // Keep the built-in content.
    });
}

function renderLeaders(content, grid) {
  const title = document.querySelector('.page-hero h1');
  const subtitle = document.querySelector('.page-hero .wrap > p:not(.breadcrumb)');
  if (title && content.heading) title.textContent = content.heading;
  if (subtitle && content.subtitle) subtitle.textContent = content.subtitle;

  const cards = content.leaders.map(leader => {
    const card = document.createElement('figure');
    card.className = 'person-card' + (leader.highlight ? ' lead' : '');

    if (leader.photo_url) {
      const img = document.createElement('img');
      img.src = leader.photo_url;
      img.alt = leader.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      card.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'person-card__placeholder';
      placeholder.textContent = leader.name
        .replace(/^(Sri|Dr\.?|Smt\.?)\s+/i, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase();
      card.appendChild(placeholder);
    }

    const caption = document.createElement('figcaption');
    const name = document.createElement('span');
    name.className = 'p-name';
    name.textContent = leader.name;
    caption.appendChild(name);

    if (leader.designation) {
      const role = document.createElement('span');
      role.className = 'p-role';
      role.textContent = leader.designation;
      caption.appendChild(role);
    }
    if (leader.phone) {
      const phone = document.createElement('span');
      phone.className = 'p-contact';
      phone.textContent = leader.phone;
      caption.appendChild(phone);
    }
    if (leader.email) {
      const email = document.createElement('span');
      email.className = 'p-contact';
      email.textContent = leader.email;
      caption.appendChild(email);
    }

    card.appendChild(caption);
    return card;
  });

  grid.replaceChildren(...cards);
}
