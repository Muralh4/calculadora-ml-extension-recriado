let currentContext = { productId: null, price: null };

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ML_PRICE_UPDATE") {
        currentContext = {
            productId: message.productId,
            price: message.price
        };
        chrome.storage.local.set({ mlContext: currentContext });
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && !changeInfo.url.includes(currentContext.productId)) {
        currentContext = { productId: null, price: null };
        chrome.storage.local.remove("mlContext");
    }
});