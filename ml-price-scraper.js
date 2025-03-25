const getProductId = () => {
    const match = window.location.href.match(/MLB-(\d+)/);
    return match ? match[0] : null;
};

const extractPrice = () => {
    const metaPrice = document.querySelector('meta[itemprop="price"]');
    if (metaPrice?.content) return parseFloat(metaPrice.content);

    const priceElement = document.querySelector('.andes-money-amount__fraction');
    const centsElement = document.querySelector('.andes-money-amount__cents');
    if (priceElement) {
        let price = priceElement.innerText.replace(/\D/g, '');
        if (centsElement) price += `.${centsElement.innerText.padEnd(2, '0')}`;
        return parseFloat(price);
    }
    return null;
};

const sendPriceToExtension = () => {
    const price = extractPrice();
    const productId = getProductId();
    
    // Adicione uma verificação de segurança
    if (price && !isNaN(price) && productId) {
        chrome.runtime.sendMessage({
            action: "ML_PRICE_UPDATE",
            price: price.toFixed(2),
            productId: productId
        });
    }
};

// Monitorar alterações na página
const observer = new MutationObserver(sendPriceToExtension);
observer.observe(document.body, { childList: true, subtree: true });

// Captura inicial
sendPriceToExtension();