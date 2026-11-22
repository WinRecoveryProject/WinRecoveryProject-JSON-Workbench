document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.getElementById('darkmode-toggle');
  
  function getThemePreference() {
    return chrome.storage.sync.get(['theme']).then(result => {
      if (result.theme) {
        return result.theme;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    chrome.storage.sync.set({ theme: theme });
    themeToggle.checked = theme === 'dark';
  }

  getThemePreference().then(theme => {
    setTheme(theme);
  });

  themeToggle.addEventListener('change', () => {
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    setTheme(newTheme);
  });

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', e => {
        chrome.storage.sync.get(['theme']).then(result => {
          if (!result.theme) {
            setTheme(e.matches ? 'dark' : 'light');
          }
        });
      });
  }
});
