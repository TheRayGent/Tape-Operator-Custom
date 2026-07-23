document.addEventListener('DOMContentLoaded', () => {
  const sourceInput = document.getElementById('sourceDomain');
  const targetInput = document.getElementById('targetDomain');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  const tabReferer = document.getElementById('tabReferer');
  const tabStorage = document.getElementById('tabStorage');
  const refererTab = document.getElementById('refererTab');
  const storageTab = document.getElementById('storageTab');
  const saveLsBtn = document.getElementById('saveLsBtn');
  const restoreLsBtn = document.getElementById('restoreLsBtn');
  const savedSourceDomainLabel = document.getElementById('savedSourceDomain');
  const currentDomainLabel = document.getElementById('currentDomain');

  const setStatus = (text, isError = false) => {
    statusDiv.textContent = text;
    statusDiv.classList.toggle('error', isError);
  };

  const switchTab = (tabName) => {
    if (tabName === 'referer') {
      tabReferer.classList.add('active');
      tabStorage.classList.remove('active');
      refererTab.classList.add('active');
      storageTab.classList.remove('active');
    } else {
      tabReferer.classList.remove('active');
      tabStorage.classList.add('active');
      refererTab.classList.remove('active');
      storageTab.classList.add('active');
      updateCurrentDomainLabel();
    }
    setStatus('', false);
  };

  const updateCurrentDomainLabel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url) {
        currentDomainLabel.textContent = 'Текущий домен: не определён';
        return;
      }
      try {
        const url = new URL(tab.url);
        currentDomainLabel.textContent = `Текущий домен: ${url.hostname}`;
      } catch (error) {
        currentDomainLabel.textContent = 'Текущий домен: не определён';
      }
    });
  };

  const getActiveTab = (callback) => {
    if (!chrome.tabs || !chrome.tabs.query) {
      setStatus('API chrome.tabs недоступен. Проверьте разрешения расширения.', true);
      callback(null);
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = Array.isArray(tabs) && tabs.length ? tabs[0] : null;
      callback(tab);
    });
  };

  const executeScriptInTab = (tabId, details, callback) => {
    if (chrome.scripting && typeof chrome.scripting.executeScript === 'function') {
      chrome.scripting.executeScript(details, callback);
    } else if (chrome.tabs && typeof chrome.tabs.executeScript === 'function') {
      chrome.tabs.executeScript(tabId, details, callback);
    } else {
      setStatus('API executeScript недоступен. Проверьте manifest permissions.', true);
      if (callback) callback(null);
    }
  };

  const getDomainFromTab = (tab) => {
    if (!tab || !tab.url) return null;
    try {
      return new URL(tab.url).hostname;
    } catch (error) {
      return null;
    }
  };

  const saveLocalStorageForCurrentDomain = () => {
    getActiveTab((tab) => {
      const sourceDomain = getDomainFromTab(tab);
      if (!tab || !sourceDomain) {
        setStatus('Нельзя определить домен текущей вкладки.', true);
        return;
      }

      executeScriptInTab(tab.id,
        {
          target: { tabId: tab.id },
          func: () => {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              data[key] = localStorage.getItem(key);
            }
            return data;
          }
        },
        (results) => {
          if (chrome.runtime.lastError || !results || !results[0] || results[0].result === undefined) {
            setStatus('Не удалось прочитать localStorage со страницы.', true);
            return;
          }

          chrome.storage.local.set({
            lsSnapshotData: results[0].result,
            lsSnapshotSource: sourceDomain
          }, () => {
            savedSourceDomainLabel.textContent = `Сохранённый домен-источник: ${sourceDomain}`;
            setStatus(`LocalStorage сохранён с ${sourceDomain}.`);
          });
        }
      );
    });
  };

  const restoreLocalStorageForCurrentDomain = () => {
    getActiveTab((tab) => {
      const destinationDomain = getDomainFromTab(tab);
      if (!tab || !destinationDomain) {
        setStatus('Нельзя определить домен текущей вкладки.', true);
        return;
      }

      chrome.storage.local.get(['lsSnapshotData', 'lsSnapshotSource'], (result) => {
        const snapshot = result.lsSnapshotData;
        const sourceDomain = result.lsSnapshotSource;

        if (!snapshot || !sourceDomain) {
          setStatus('Сохранённый localStorage не найден. Сначала сохраните его на первом сайте.', true);
          return;
        }

        executeScriptInTab(tab.id,
          {
            target: { tabId: tab.id },
            func: (items) => {
              for (const itemKey in items) {
                if (localStorage.getItem(itemKey) === null) {
                  localStorage.setItem(itemKey, items[itemKey]);
                }
              }
              return true;
            },
            args: [snapshot]
          },
          (results) => {
            if (chrome.runtime.lastError || !results) {
              setStatus('Не удалось записать localStorage на страницу.', true);
              return;
            }
            setStatus(`LocalStorage из ${sourceDomain} дополнен в ${destinationDomain}. Перезагружаю страницу...`);
            if (chrome.tabs && chrome.tabs.reload) {
              chrome.tabs.reload(tab.id);
            } else {
              setStatus('LocalStorage вставлено, но не удалось перезагрузить вкладку.', true);
            }
          }
        );
      });
    });
  };

  tabReferer.addEventListener('click', () => switchTab('referer'));
  tabStorage.addEventListener('click', () => switchTab('storage'));

  // 1. Загружаем ранее сохраненные домены и последний сохранённый источник localStorage
  chrome.storage.local.get(['sourceDomain', 'targetDomain', 'lsSnapshotSource'], (result) => {
    sourceInput.value = result.sourceDomain || 'trgtapeop.mooo.com';
    targetInput.value = result.targetDomain || 'tapeop.dev';
    if (result.lsSnapshotSource) {
      savedSourceDomainLabel.textContent = `Сохранённый домен-источник: ${result.lsSnapshotSource}`;
    }
  });

  // 2. Сохраняем новые домены по клику
  saveBtn.addEventListener('click', () => {
    const sourceDomain = sourceInput.value.trim().toLowerCase();
    const targetDomain = targetInput.value.trim().toLowerCase();

    chrome.storage.local.set({ sourceDomain, targetDomain }, () => {
      setStatus('Сохранено! Правила обновлены.');
      chrome.runtime.sendMessage({ action: 'updateRules' });
      setTimeout(() => { setStatus(''); }, 2000);
    });
  });

  saveLsBtn.addEventListener('click', saveLocalStorageForCurrentDomain);
  restoreLsBtn.addEventListener('click', restoreLocalStorageForCurrentDomain);

  updateCurrentDomainLabel();
});
