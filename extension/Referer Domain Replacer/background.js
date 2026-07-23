// Функция для обновления правил фильтрации сети
async function updateNetRequestRules() {
  // Получаем текущие настройки доменов из хранилища
  const data = await chrome.storage.local.get(['sourceDomain', 'targetDomain']);
  const source = data.sourceDomain;
  const target = data.targetDomain;

  const ruleId = 1; // Используем фиксированный ID для перезаписи правила

  // Если настройки пустые — удаляем старое правило и ничего не создаем
  if (!source || !target) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId]
    });
    return;
  }

  // Формируем новое динамическое правило
  const newRule = {
    id: ruleId,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        {
          header: "referer",
          operation: "set",
          // Важно: значение должно быть полноценным URL, 
          // поэтому мы берем целевой домен и подставляем протокол (например, https)
          value: `https://${target}/` 
        }
      ]
    },
    condition: {
      // Правило сработает, если в исходном Referer содержится старый домен
      // *://* или ://example.com*
      initiatorDomains: [source], 
      resourceTypes: [
        "main_frame", "sub_frame", "stylesheet", "script", 
        "image", "font", "object", "xmlhttprequest", "ping", 
        "csp_report", "media", "websocket", "other"
      ]
    }
  };

  // Удаляем старое правило с ID=1 и добавляем обновленное
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId],
    addRules: [newRule]
  });
}

// Обновляем правила при старте расширения или его установке
chrome.runtime.onInstalled.addListener(updateNetRequestRules);
chrome.runtime.onStartup.addListener(updateNetRequestRules);

// Слушаем сообщения из popup.js о том, что пользователь нажал кнопку "Сохранить"
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateRules') {
    updateNetRequestRules();
  }
});
