'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const urlBar = $('url-bar');
  const statusText = $('status-text');
  const throbber = $('throbber');
  const bookmarksList = $('bookmarks-list');
  const tabsList = $('tabs-list');
  const viewportsContainer = $('viewports-container');

  const HOME_URL = new URL('welcome.html', window.location.href).href;
  const HOME_ALIAS = 'mabruenia://welcome';
  const BOOKMARK_KEY = 'mabruenia_bookmarks';

  const defaultBookmarks = [
    { title: '🏛️ Mabruenia Portal', url: HOME_ALIAS },
    { title: '🔍 Google', url: 'https://google.com' },
    { title: '🕰️ The Old Net', url: 'https://theoldnet.com' },
    { title: "🏀 Space Jam '96", url: 'https://spacejam.com' },
    { title: '📂 Wiby', url: 'https://wiby.me' }
  ];

  let bookmarks;
  try {
    const stored = JSON.parse(localStorage.getItem(BOOKMARK_KEY));
    bookmarks = Array.isArray(stored) ? stored : defaultBookmarks.slice();
  } catch {
    bookmarks = defaultBookmarks.slice();
  }

  let tabs = [];
  let activeTabId = null;
  let nextTabId = 1;

  function resolveUrl(rawInput) {
    const input = String(rawInput || '').trim();
    if (!input || input === HOME_ALIAS || input === 'welcome.html') return HOME_URL;

    if (/^(https?|file):\/\//i.test(input)) return input;
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(input)) return `https://${input}`;

    return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
  }

  function getActiveTab() {
    return tabs.find((tab) => tab.id === activeTabId) || null;
  }

  function setStatus(message) {
    statusText.textContent = message;
  }

  function saveBookmarks() {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
  }

  function renderBookmarks() {
    bookmarksList.replaceChildren();

    bookmarks.forEach((bookmark, index) => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';

      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'bookmark-btn';
      openButton.textContent = bookmark.title;
      openButton.title = bookmark.url;
      openButton.addEventListener('click', () => navigate(bookmark.url));

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'del-bookmark-btn';
      removeButton.textContent = '×';
      removeButton.title = 'Remove bookmark';
      removeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        bookmarks.splice(index, 1);
        saveBookmarks();
        renderBookmarks();
      });

      item.append(openButton, removeButton);
      bookmarksList.appendChild(item);
    });
  }

  function renderTabs() {
    tabsList.replaceChildren();

    tabs.forEach((tab) => {
      const tabElement = document.createElement('div');
      tabElement.className = 'retro-tab' + (tab.id === activeTabId ? ' active' : '');
      tabElement.addEventListener('click', () => switchTab(tab.id));

      const title = document.createElement('span');
      title.className = 'tab-title';
      title.textContent = tab.title || 'New Tab';
      title.title = title.textContent;

      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'tab-close-btn';
      close.textContent = '×';
      close.title = 'Close tab';
      close.addEventListener('click', (event) => {
        event.stopPropagation();
        closeTab(tab.id);
      });

      tabElement.append(title, close);
      tabsList.appendChild(tabElement);
    });
  }

  function attachWebviewEvents(tab) {
    const webview = tab.webview;

    webview.addEventListener('did-start-loading', () => {
      tab.isLoading = true;
      if (tab.id === activeTabId) {
        setStatus('Mabruenia Online is connecting...');
        throbber.classList.add('spinning');
      }
    });

    webview.addEventListener('did-stop-loading', () => {
      tab.isLoading = false;
      try {
        tab.url = webview.getURL() || tab.url;
        tab.title = webview.getTitle() || tab.title;
      } catch (error) {
        console.warn('Could not read webview details:', error);
      }
      renderTabs();

      if (tab.id === activeTabId) {
        urlBar.value = tab.url === HOME_URL ? HOME_ALIAS : tab.url;
        setStatus('Done');
        throbber.classList.remove('spinning');
      }
    });

    webview.addEventListener('page-title-updated', (event) => {
      tab.title = event.title || 'Untitled';
      renderTabs();
    });

    webview.addEventListener('did-fail-load', (event) => {
      if (event.errorCode === -3) return; // aborted navigation
      if (tab.id === activeTabId) {
        setStatus(`Could not load page (${event.errorCode})`);
        throbber.classList.remove('spinning');
      }
    });

    webview.addEventListener('update-target-url', (event) => {
      if (tab.id === activeTabId) setStatus(event.url || 'Done');
    });
  }

  function createTab(initialAddress = HOME_ALIAS) {
    const id = nextTabId++;
    const initialUrl = resolveUrl(initialAddress);
    const webview = document.createElement('webview');

    webview.className = 'tab-webview';
    webview.setAttribute('src', initialUrl);
    webview.setAttribute('partition', 'persist:mabruenia');
    viewportsContainer.appendChild(webview);

    const tab = {
      id,
      title: 'Welcome to Mabruenia Online',
      url: initialUrl,
      isLoading: true,
      webview
    };

    attachWebviewEvents(tab);
    tabs.push(tab);
    switchTab(id);
  }

  function switchTab(id) {
    const selected = tabs.find((tab) => tab.id === id);
    if (!selected) return;

    activeTabId = id;
    tabs.forEach((tab) => {
      tab.webview.classList.toggle('active', tab.id === id);
    });

    urlBar.value = selected.url === HOME_URL ? HOME_ALIAS : selected.url;
    setStatus(selected.isLoading ? 'Mabruenia Online is connecting...' : 'Done');
    throbber.classList.toggle('spinning', selected.isLoading);
    renderTabs();
  }

  function closeTab(id) {
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index < 0) return;

    const wasActive = activeTabId === id;
    const [removed] = tabs.splice(index, 1);
    removed.webview.remove();

    if (tabs.length === 0) {
      createTab(HOME_ALIAS);
      return;
    }

    if (wasActive) {
      const next = tabs[Math.max(0, index - 1)] || tabs[0];
      switchTab(next.id);
    } else {
      renderTabs();
    }
  }

  function navigate(address) {
    const active = getActiveTab();
    if (!active) return;

    const destination = resolveUrl(address || urlBar.value);
    active.url = destination;
    active.title = destination === HOME_URL ? 'Welcome to Mabruenia Online' : destination;
    active.isLoading = true;
    urlBar.value = destination === HOME_URL ? HOME_ALIAS : destination;
    setStatus('Mabruenia Online is connecting...');
    throbber.classList.add('spinning');
    renderTabs();

    active.webview.loadURL(destination).catch((error) => {
      console.error('Navigation failed:', error);
      active.isLoading = false;
      if (active.id === activeTabId) {
        setStatus('Navigation failed. Check the address and try again.');
        throbber.classList.remove('spinning');
      }
    });
  }

  $('min-btn').addEventListener('click', () => window.mabruenia.windowControl('minimize'));
  $('max-btn').addEventListener('click', () => window.mabruenia.windowControl('maximize'));
  $('close-btn').addEventListener('click', () => window.mabruenia.windowControl('close'));

  $('go-btn').addEventListener('click', () => navigate(urlBar.value));
  urlBar.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') navigate(urlBar.value);
  });

  $('back-btn').addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.webview.canGoBack()) tab.webview.goBack();
  });

  $('fwd-btn').addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.webview.canGoForward()) tab.webview.goForward();
  });

  $('reload-btn').addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab) tab.webview.reload();
  });

  $('home-btn').addEventListener('click', () => navigate(HOME_ALIAS));
  $('new-tab-btn').addEventListener('click', () => createTab(HOME_ALIAS));

  $('add-bookmark-btn').addEventListener('click', () => {
    const tab = getActiveTab();
    if (!tab) return;

    const currentUrl = tab.url === HOME_URL ? HOME_ALIAS : tab.url;
    const title = window.prompt('Name this bookmark:', tab.title || currentUrl);
    if (title === null) return;

    bookmarks.push({ title: title.trim() || currentUrl, url: currentUrl });
    saveBookmarks();
    renderBookmarks();
  });

  renderBookmarks();
  createTab(HOME_ALIAS);
});
