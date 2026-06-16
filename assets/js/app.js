(function () {
  const state = {
    items: [],
    genres: []
  };

  function qs(id) {
    return document.getElementById(id);
  }

  function isInPagesDir() {
    return /\/pages\//.test(window.location.pathname.replace(/\\/g, '/'));
  }

  function pageHref(pageName, params) {
    const base = isInPagesDir() ? `./${pageName}.html` : `./pages/${pageName}.html`;
    if (!params) return base;

    const search = new URLSearchParams(params);
    return `${base}?${search.toString()}`;
  }

  function getPoster(item) {
    const episodeThumb = item?.episodes?.[0]?.thumbnail;
    const chapterImage = item?.chapters?.[0]?.images?.[0];
    return episodeThumb || chapterImage || 'https://picsum.photos/800/450?random=77';
  }

  async function loadCatalogData() {
    if (state.items.length) return;

    try {
      const response = await fetch('/api/catalog');
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const payload = await response.json();
      state.items = Array.isArray(payload.items) ? payload.items : [];
      state.genres = Array.isArray(payload.genres) ? payload.genres : [];
    } catch (error) {
      console.error('Failed to load catalog API data:', error);
      state.items = [];
      state.genres = ['All'];

      const apiError = qs('apiError');
      if (apiError) {
        apiError.classList.remove('hidden');
      }
    }
  }

  function safeItems() {
    return state.items;
  }

  function fallbackGenresFromItems() {
    const tags = safeItems().flatMap((item) => item.tags || []);
    const unique = [...new Set(tags)].sort((a, b) => a.localeCompare(b));
    return ['All', ...unique];
  }

  function createCard(item, showLink) {
    const detailsHref = pageHref('details', { id: item.id });
    const watchReadHref = pageHref('watch-read', {
      id: item.id,
      mode: item.defaultMode || 'watch'
    });
    const tags = (item.tags || [])
      .slice(0, 2)
      .map((tag) => `<span class="px-2 py-1 rounded-full bg-slate-900/85 border border-white/15">${tag}</span>`)
      .join('');
    const modeMeta = item.defaultMode === 'read'
      ? `${item.chapters?.length || 0} chapters`
      : `${item.episodes?.length || 0} eps`;
    const poster = getPoster(item);

    return `
      <article class="poster-card fade-up" style="animation-delay:120ms;">
        <div class="relative">
          <img class="poster-thumb" src="${poster}" alt="${item.title} poster" loading="lazy">
          <div class="poster-overlay"></div>
          <div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <span class="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-white/20 bg-slate-950/70 text-rose-100">${item.type}</span>
            <span class="episode-badge">${modeMeta}</span>
          </div>
          <div class="absolute left-3 right-3 bottom-3">
            <h3 class="font-display text-lg font-semibold leading-tight text-white drop-shadow-md">${item.title}</h3>
            <p class="text-xs text-slate-200 mt-1">${item.year} • ${item.rating} ★</p>
          </div>
        </div>
        <div class="px-3 pt-3 pb-4">
          <p class="text-sm text-slate-300 mt-2 line-clamp-2 min-h-[2.6rem]">${item.description}</p>
          <div class="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">${tags}</div>
          <div class="mt-4 flex items-center gap-2">
            ${showLink ? `<a href="${detailsHref}" class="flex-1 text-center rounded-lg bg-slate-900/70 border border-white/10 py-2 text-sm hover:bg-white/10 transition">Details</a>` : ''}
            <a href="${watchReadHref}" class="flex-1 text-center rounded-lg bg-gradient-to-r from-rose-400 to-red-400 text-slate-950 font-semibold py-2 text-sm hover:brightness-110 transition">Watch / Read</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderFeatured() {
    const grid = qs('featuredGrid');
    if (!grid) return;

    const picks = safeItems().slice(0, 8);
    grid.innerHTML = picks.map((item) => createCard(item, true)).join('');
  }

  function renderLatestEpisodes() {
    const grid = qs('latestEpisodesGrid');
    if (!grid) return;

    const episodeEntries = safeItems()
      .filter((item) => item.defaultMode === 'watch' && Array.isArray(item.episodes) && item.episodes.length > 0)
      .flatMap((item) => item.episodes.slice(0, 2).map((episode) => ({ item, episode })))
      .slice(0, 6);

    if (!episodeEntries.length) {
      grid.innerHTML = '<p class="text-slate-300 text-sm">No episode drops yet.</p>';
      return;
    }

    grid.innerHTML = episodeEntries
      .map(({ item, episode }) => {
        const poster = episode.thumbnail || getPoster(item);
        return `
          <article class="poster-card">
            <img class="poster-thumb" src="${poster}" alt="${item.title} ${episode.title}" loading="lazy">
            <div class="poster-overlay"></div>
            <div class="absolute top-3 left-3">
              <span class="episode-badge">${episode.number || 'EP'} • NEW</span>
            </div>
            <div class="absolute left-3 right-3 bottom-3">
              <p class="text-xs text-rose-100">${item.title}</p>
              <h3 class="font-display text-lg font-semibold text-white leading-tight">${episode.title}</h3>
              <a href="${pageHref('watch-read', { id: item.id, mode: 'watch', episode: episode.number || '' })}" class="inline-flex mt-3 rounded-lg bg-gradient-to-r from-rose-400 to-red-400 text-slate-950 font-semibold px-3 py-1.5 text-xs">Play Episode</a>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function renderTrendingList() {
    const list = qs('trendingNowList');
    if (!list) return;

    const trending = [...safeItems()]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);

    if (!trending.length) {
      list.innerHTML = '<p class="text-slate-300 text-sm">No trends found.</p>';
      return;
    }

    list.innerHTML = trending
      .map(
        (item, idx) => `
          <a href="${pageHref('details', { id: item.id })}" class="trend-item flex items-center gap-3 p-3 hover:bg-white/10 transition">
            <span class="trend-rank">${idx + 1}</span>
            <div class="min-w-0">
              <p class="font-semibold text-sm truncate">${item.title}</p>
              <p class="text-xs text-slate-300 truncate">${item.type} • ${item.rating} ★</p>
            </div>
          </a>
        `
      )
      .join('');
  }

  function renderHomeHero() {
    const heroTitle = qs('homeHeroTitle');
    if (!heroTitle) return;

    const hero = safeItems().find((item) => item.defaultMode === 'watch') || safeItems()[0];
    if (!hero) return;

    const heroMeta = qs('homeHeroMeta');
    const heroDesc = qs('homeHeroDesc');
    const heroWatchRead = qs('homeHeroWatchRead');
    const heroDetails = qs('homeHeroDetails');
    const heroBackdrop = qs('homeHeroBackdrop');

    heroTitle.textContent = hero.title;
    if (heroMeta) {
      const count = hero.defaultMode === 'read' ? `${hero.chapters?.length || 0} chapters` : `${hero.episodes?.length || 0} episodes`;
      heroMeta.textContent = `${hero.type} • ${hero.year} • ${count}`;
    }
    if (heroDesc) heroDesc.textContent = hero.description;
    if (heroWatchRead) {
      heroWatchRead.href = pageHref('watch-read', { id: hero.id, mode: hero.defaultMode || 'watch' });
      heroWatchRead.textContent = hero.defaultMode === 'read' ? 'Read Now' : 'Watch Now';
    }
    if (heroDetails) {
      heroDetails.href = pageHref('details', { id: hero.id });
    }
    if (heroBackdrop) {
      heroBackdrop.style.backgroundImage = `url('${getPoster(hero)}')`;
    }
  }

  function renderCatalog() {
    const grid = qs('catalogGrid');
    const search = qs('catalogSearch');
    if (!grid || !search) return;

    let activeGenre = 'All';

    function draw() {
      const keyword = search.value.trim().toLowerCase();
      const filtered = safeItems().filter((item) => {
        const tags = item.tags || [];
        const byGenre =
          activeGenre === 'All' ||
          tags.some((tag) => tag.toLowerCase() === activeGenre.toLowerCase()) ||
          item.type.toLowerCase() === activeGenre.toLowerCase();

        const byText =
          !keyword ||
          item.title.toLowerCase().includes(keyword) ||
          item.type.toLowerCase().includes(keyword) ||
          tags.join(' ').toLowerCase().includes(keyword);

        return byGenre && byText;
      });

      if (!filtered.length) {
        grid.innerHTML = '<p class="text-slate-300">No titles match this filter.</p>';
        return;
      }

      grid.innerHTML = filtered.map((item) => createCard(item, true)).join('');
    }

    search.addEventListener('input', draw);

    document.addEventListener('genreChanged', (event) => {
      activeGenre = event.detail.genre || 'All';
      draw();
    });

    draw();
  }

  function renderGenres() {
    const wrap = qs('genreWrap');
    if (!wrap) return;

    const genres = state.genres.length ? state.genres : fallbackGenresFromItems();

    wrap.innerHTML = genres
      .map(
        (genre, index) =>
          `<button class="genre-chip ${index === 0 ? 'active' : ''} px-4 py-2 rounded-full bg-white/10 border border-white/15 whitespace-nowrap transition" data-genre="${genre}">${genre}</button>`
      )
      .join('');
  }

  function bindGenreFilters() {
    const chips = document.querySelectorAll('.genre-chip');
    if (!chips.length) return;

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((node) => node.classList.remove('active'));
        chip.classList.add('active');

        document.dispatchEvent(
          new CustomEvent('genreChanged', {
            detail: { genre: chip.dataset.genre || 'All' }
          })
        );
      });
    });
  }

  function setApiStatusMessage() {
    const apiStatus = qs('apiStatus');
    if (!apiStatus) return;

    apiStatus.textContent = `Connected to local API endpoint: /api/catalog (${safeItems().length} titles)`;
  }

  function setTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('yomite-bg', isDark);
    document.body.classList.toggle('yomite-bg-light', !isDark);
    localStorage.setItem('yomite-theme', isDark ? 'dark' : 'light');
  }

  function initTheme() {
    const saved = localStorage.getItem('yomite-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(saved ? saved === 'dark' : prefersDark);

    const toggle = qs('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        setTheme(!document.documentElement.classList.contains('dark'));
      });
    }
  }

  function initAuthModal() {
    const modal = qs('authModal');
    if (!modal) return;

    const openButtons = document.querySelectorAll('[data-open-auth]');
    const closeButton = qs('closeAuthModal');

    function closeModal() {
      modal.classList.add('hidden');
    }

    openButtons.forEach((button) => {
      button.addEventListener('click', () => {
        modal.classList.remove('hidden');
      });
    });

    if (closeButton) {
      closeButton.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
  }

  function initDetailsPage() {
    const titleNode = qs('detailTitle');
    if (!titleNode) return;

    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('id');
    const item = safeItems().find((entry) => entry.id === itemId) || safeItems()[0];
    if (!item) return;

    qs('detailTitle').textContent = item.title;
    qs('detailMeta').textContent = `${item.type} • ${item.year} • Rating ${item.rating}`;
    qs('detailDescription').textContent = item.description;
    qs('detailStatus').textContent = item.status;
    qs('detailPoster').classList.add(...item.coverGradient.split(' '));

    const watchReadLink = qs('watchReadLink');
    if (watchReadLink) {
      watchReadLink.href = pageHref('watch-read', {
        id: item.id,
        mode: item.defaultMode || 'watch'
      });
    }

    const tagWrap = qs('detailTags');
    if (tagWrap) {
      tagWrap.innerHTML = (item.tags || [])
        .map(
          (tag) =>
            `<span class="px-3 py-1 rounded-full text-xs bg-white/10 border border-white/15">${tag}</span>`
        )
        .join('');
    }
  }

  function initWatchReadPage() {
    const titleNode = qs('watchReadTitle');
    if (!titleNode) return;

    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('id');
    const modeParam = params.get('mode');
    const item = safeItems().find((entry) => entry.id === itemId) || safeItems()[0];
    if (!item) return;

    const episodes = Array.isArray(item.episodes) ? item.episodes : [];
    const chapters = Array.isArray(item.chapters) ? item.chapters : [];
    let mode = modeParam || item.defaultMode || (episodes.length ? 'watch' : 'read');

    const watchBtn = qs('watchModeBtn');
    const readBtn = qs('readModeBtn');
    const watchPanel = qs('watchPanel');
    const readPanel = qs('readPanel');
    const episodeList = qs('episodeList');
    const chapterList = qs('chapterList');
    const watchPlayer = qs('watchPlayer');
    const readerImage = qs('readerImage');
    const readerPageInfo = qs('readerPageInfo');
    const prevPageBtn = qs('prevPageBtn');
    const nextPageBtn = qs('nextPageBtn');

    let chapterImages = [];
    let pageIndex = 0;

    qs('watchReadTitle').textContent = item.title;
    qs('watchReadMeta').textContent = `${item.type} • ${item.year} • ${item.status}`;
    qs('watchReadDescription').textContent = item.description;

    function setActiveMode(nextMode) {
      mode = nextMode;
      watchBtn.classList.toggle('bg-cyan-300/20', mode === 'watch');
      watchBtn.classList.toggle('border-cyan-300/70', mode === 'watch');
      readBtn.classList.toggle('bg-cyan-300/20', mode === 'read');
      readBtn.classList.toggle('border-cyan-300/70', mode === 'read');
      watchPanel.classList.toggle('hidden', mode !== 'watch');
      readPanel.classList.toggle('hidden', mode !== 'read');
    }

    function renderReaderPage() {
      if (!readerImage || !readerPageInfo || !chapterImages.length) {
        return;
      }

      readerImage.src = chapterImages[pageIndex];
      readerPageInfo.textContent = `Page ${pageIndex + 1} / ${chapterImages.length}`;

      if (prevPageBtn) {
        prevPageBtn.disabled = pageIndex === 0;
        prevPageBtn.classList.toggle('opacity-50', pageIndex === 0);
      }

      if (nextPageBtn) {
        nextPageBtn.disabled = pageIndex >= chapterImages.length - 1;
        nextPageBtn.classList.toggle('opacity-50', pageIndex >= chapterImages.length - 1);
      }
    }

    function renderEpisodes() {
      if (!episodeList) return;

      if (!episodes.length) {
        episodeList.innerHTML = '<p class="text-slate-300 text-sm">No episodes available for this title.</p>';
        return;
      }

      episodeList.innerHTML = episodes
        .map(
          (episode, index) => `
          <button data-episode-index="${index}" class="episode-item w-full text-left glass-soft rounded-xl p-3 border border-white/15 hover:bg-white/10 transition">
            <p class="text-sm font-semibold">Episode ${episode.number}: ${episode.title}</p>
            <p class="text-xs text-slate-300 mt-1">${episode.duration} • ${episode.airDate}</p>
          </button>
        `
        )
        .join('');

      const items = document.querySelectorAll('.episode-item');
      const playerTitle = qs('playerTitle');
      const playerMeta = qs('playerMeta');

      function selectEpisode(index) {
        const picked = episodes[index];
        if (!picked) return;

        items.forEach((node, idx) => {
          node.classList.toggle('border-cyan-300/70', idx === index);
        });

        playerTitle.textContent = `Episode ${picked.number}: ${picked.title}`;
        playerMeta.textContent = `${picked.duration} • Released ${picked.airDate}`;

        if (watchPlayer && picked.videoUrl) {
          watchPlayer.pause();
          watchPlayer.src = picked.videoUrl;
          if (picked.thumbnail) {
            watchPlayer.poster = picked.thumbnail;
          }
          watchPlayer.load();
        }
      }

      items.forEach((button) => {
        button.addEventListener('click', () => {
          const index = Number(button.dataset.episodeIndex || 0);
          selectEpisode(index);
        });
      });

      selectEpisode(0);
    }

    function renderChapters() {
      if (!chapterList) return;

      if (!chapters.length) {
        chapterList.innerHTML = '<p class="text-slate-300 text-sm">No chapters available for this title.</p>';
        return;
      }

      chapterList.innerHTML = chapters
        .map(
          (chapter, index) => `
          <button data-chapter-index="${index}" class="chapter-item w-full text-left glass-soft rounded-xl p-3 border border-white/15 hover:bg-white/10 transition">
            <p class="text-sm font-semibold">Chapter ${chapter.number}: ${chapter.title}</p>
            <p class="text-xs text-slate-300 mt-1">${chapter.pages} pages</p>
          </button>
        `
        )
        .join('');

      const items = document.querySelectorAll('.chapter-item');
      const chapterTitle = qs('chapterTitle');
      const chapterMeta = qs('chapterMeta');
      const chapterSummary = qs('chapterSummary');

      function selectChapter(index) {
        const picked = chapters[index];
        if (!picked) return;

        items.forEach((node, idx) => {
          node.classList.toggle('border-cyan-300/70', idx === index);
        });

        chapterTitle.textContent = `Chapter ${picked.number}: ${picked.title}`;
        chapterMeta.textContent = `${picked.pages} pages`;
        chapterSummary.textContent = picked.summary;

        const imageSet = Array.isArray(picked.images) ? picked.images : [];
        chapterImages = imageSet.length
          ? imageSet
          : [
            `https://placehold.co/1200x1800/111827/e2e8f0?text=${encodeURIComponent(
              item.title + ' - Chapter ' + picked.number
            )}`
          ];
        pageIndex = 0;
        renderReaderPage();
      }

      items.forEach((button) => {
        button.addEventListener('click', () => {
          const index = Number(button.dataset.chapterIndex || 0);
          selectChapter(index);
        });
      });

      selectChapter(0);
    }

    if (watchBtn && readBtn) {
      watchBtn.addEventListener('click', () => setActiveMode('watch'));
      readBtn.addEventListener('click', () => setActiveMode('read'));
    }

    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (pageIndex > 0) {
          pageIndex -= 1;
          renderReaderPage();
        }
      });
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        if (pageIndex < chapterImages.length - 1) {
          pageIndex += 1;
          renderReaderPage();
        }
      });
    }

    renderEpisodes();
    renderChapters();

    if (mode === 'watch' && !episodes.length && chapters.length) {
      mode = 'read';
    }

    if (mode === 'read' && !chapters.length && episodes.length) {
      mode = 'watch';
    }

    setActiveMode(mode);
  }
  // ==========================================
  // AI CHATBOT SYSTEM (DYNAMIC INJECTION)
  // ==========================================
  function initChatbot() {
    // 1. Define and inject the glassmorphic layout directly into the document body
    const chatbotHTML = `
      <div id="aiChatWidget" class="fixed bottom-6 right-6 z-50 flex flex-col items-end font-body">
        <div id="chatWindow" class="hidden mb-4 w-80 sm:w-96 max-h-[500px] glass rounded-2xl flex-col overflow-hidden transition-all origin-bottom-right shadow-2xl">
          <div class="px-4 py-3 border-b border-white/10 bg-slate-900/40 flex justify-between items-center">
            <div class="flex items-center gap-2">
              <div class="h-6 w-6 rounded-md bg-gradient-to-br from-cyan-300 to-rose-400"></div>
              <h3 class="font-display font-bold text-sm text-slate-100">Otaku Assistant</h3>
            </div>
            <button id="closeChatBtn" class="text-slate-400 hover:text-white transition">✕</button>
          </div>

          <div id="chatMessages" class="flex-1 p-4 overflow-y-auto space-y-3 min-h-[300px] max-h-[300px] text-sm flex flex-col bg-slate-950/20">
            <div class="self-start bg-white/10 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%] text-slate-200">
              <p>Hey! I'm the Otaku Assistant. Looking for an anime recommendation, or got a question about a series?</p>
            </div>
          </div>

          <div class="p-3 border-t border-white/10 bg-slate-900/60">
            <form id="chatForm" class="flex gap-2">
              <input 
                type="text" 
                id="chatInput" 
                placeholder="Ask me anything..." 
                class="flex-1 px-3 py-2 rounded-xl bg-slate-950/60 border border-white/20 focus:outline-none focus:border-cyan-400 text-sm text-slate-100 transition"
                autocomplete="off"
              />
              <button 
                type="submit" 
                class="px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-900 hover:brightness-110 transition flex-shrink-0"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        <button id="chatToggleBtn" class="h-14 w-14 rounded-full glass border border-white/20 shadow-lg shadow-cyan-500/20 flex items-center justify-center hover:scale-105 transition-transform bg-slate-900/40">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);

    // 2. Select DOM elements after insertion
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatWindow = document.getElementById('chatWindow');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    if (!chatToggleBtn || !chatWindow || !chatForm) return;

    // Toggle Chat Window View
    const toggleChat = () => {
      chatWindow.classList.toggle('hidden');
      chatWindow.classList.toggle('flex');
    };

    chatToggleBtn.addEventListener('click', toggleChat);
    closeChatBtn.addEventListener('click', toggleChat);

    // Append message elements to UI
    const appendMessage = (text, sender) => {
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('px-4', 'py-2', 'max-w-[85%]', 'text-sm', 'rounded-2xl', 'fade-up');

      if (sender === 'user') {
        msgDiv.classList.add('self-end', 'bg-cyan-500/20', 'border', 'border-cyan-400/30', 'text-cyan-50', 'rounded-tr-sm');
      } else {
        msgDiv.classList.add('self-start', 'bg-white/10', 'border', 'border-white/10', 'text-slate-200', 'rounded-tl-sm');
      }

      msgDiv.innerHTML = `<p>${text}</p>`;
      chatMessages.appendChild(msgDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    // Form submission processing
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;

      appendMessage(message, 'user');
      chatInput.value = '';

      const loadingId = 'loading-' + Date.now();
      const loadingDiv = document.createElement('div');
      loadingDiv.id = loadingId;
      loadingDiv.className = 'self-start bg-white/5 text-slate-400 text-xs px-3 py-1 rounded-full italic animate-pulse';
      loadingDiv.innerText = 'Otaku Assistant is thinking...';
      chatMessages.appendChild(loadingDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });

        const data = await response.json();
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        if (data.reply) {
          appendMessage(data.reply, 'bot');
        } else {
          appendMessage("Sorry, I'm having trouble connecting right now.", 'bot');
        }
      } catch (error) {
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        appendMessage("Network error. Please make sure the local server is running.", 'bot');
      }
    });
  }

  function initMobileMenu() {
    const menuButton = qs('mobileMenuButton');
    const panel = qs('mobileMenuPanel');
    if (!menuButton || !panel) return;

    menuButton.addEventListener('click', () => {
      panel.classList.toggle('hidden');
    });
  }

  // Unified application setup block
  document.addEventListener('DOMContentLoaded', async function () {
    await loadCatalogData();

    renderHomeHero();
    renderTrendingList();
    renderLatestEpisodes();
    renderGenres();
    bindGenreFilters();
    renderFeatured();
    renderCatalog();
    initDetailsPage();
    initWatchReadPage();
    setApiStatusMessage();
    initTheme();
    initAuthModal();
    initMobileMenu();
    
    // Fire up the chatbot widget injection across pages
    initChatbot();
  });
})();