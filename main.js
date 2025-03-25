let calculationHistory = [];
let currentProductId = null;

const elements = {
    salePrice: document.getElementById('sale-price'),
    costPrice: document.getElementById('cost-price'),
    commissionRate: document.getElementById('commission-rate'),
    shippingCost: document.getElementById('shipping-cost'),
    otherCosts: document.getElementById('other-costs'),
    saveButton: document.getElementById('save-calculation'),
    historyTableBody: document.getElementById('history-table-body'),
    netProfitResult: document.getElementById('net-profit-result'),
    salePriceResult: document.getElementById('sale-price-result'),
    costPriceResult: document.getElementById('cost-price-result'),
    commissionResult: document.getElementById('commission-result'),
    shippingCostResult: document.getElementById('shipping-cost-result'),
    otherCostsResult: document.getElementById('other-costs-result'),
    totalFeesResult: document.getElementById('total-fees-result')
};

// Inicialização segura dentro do DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    if (!chrome.runtime?.id) {
        console.log("Extensão não está disponível.");
        return;
    }

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentProductId = tab.url.match(/MLB-(\d+)/)?.[0];

        chrome.storage.local.get(['mlContext', 'calculationHistory', 'productData'], (result) => {
            // Preencher preço da página SEMPRE que o popup abre
            if (result.mlContext?.productId === currentProductId && result.mlContext?.price) {
                elements.salePrice.value = result.mlContext.price; // Prioriza o preço atual da página
            }

            // Restaurar outros campos, exceto salePrice
            if (currentProductId && result.productData?.[currentProductId]) {
                const savedData = result.productData[currentProductId];
                elements.costPrice.value = savedData.costPrice || '';
                elements.commissionRate.value = savedData.commissionRate || '16';
                elements.shippingCost.value = savedData.shippingCost || '';
                elements.otherCosts.value = savedData.otherCosts || '';
            }

            calculationHistory = result.calculationHistory || [];
            updateHistoryTable();
        });

        elements.saveButton.addEventListener('click', calculateAndSave);
        document.getElementById('calculator-form').addEventListener('input', updateLivePreview);

    } catch (error) {
        console.error("Erro na inicialização:", error);
    }
});

// Funções de Cálculo (inalteradas)
function calculateAndSave() {
    const values = getInputValues();
    if (!values.salePrice || !values.costPrice) {
        alert("Preencha Preço de Venda e Custo!");
        return;
    }

    const results = calculateValues(values);
    saveCalculation(values, results);
    updateFullResults(values, results);
    updateHistoryTable();
}

function getInputValues() {
    return {
        salePrice: parseFloat(elements.salePrice.value) || 0,
        costPrice: parseFloat(elements.costPrice.value) || 0,
        commissionRate: parseFloat(elements.commissionRate.value) || 0,
        shippingCost: parseFloat(elements.shippingCost.value) || 0,
        otherCosts: parseFloat(elements.otherCosts.value) || 0
    };
}

function calculateValues(values) {
    const commission = (values.salePrice * values.commissionRate) / 100;
    const totalFees = commission + values.shippingCost + values.otherCosts;
    const netProfit = values.salePrice - totalFees - values.costPrice;
    const profitMargin = ((netProfit / values.costPrice) * 100) || 0;
    return { totalFees, netProfit, profitMargin };
}

// Funções de Atualização (com verificações de null)
function updateLivePreview() {
    const values = getInputValues();
    const results = calculateValues(values);
    
    if (elements.netProfitResult) {
        elements.netProfitResult.textContent = `R$ ${results.netProfit.toFixed(2)}`;
        elements.netProfitResult.className = `result-value ${results.netProfit >= 0 ? 'positive' : 'negative'}`;
    }
}

function updateFullResults(values, results) {
    if (!elements.salePriceResult || !elements.costPriceResult) return;

    elements.salePriceResult.textContent = `R$ ${values.salePrice.toFixed(2)}`;
    elements.costPriceResult.textContent = `R$ ${values.costPrice.toFixed(2)}`;
    elements.commissionResult.textContent = `R$ ${(values.salePrice * values.commissionRate / 100).toFixed(2)}`;
    elements.shippingCostResult.textContent = `R$ ${values.shippingCost.toFixed(2)}`;
    elements.otherCostsResult.textContent = `R$ ${values.otherCosts.toFixed(2)}`;
    elements.totalFeesResult.textContent = `R$ ${results.totalFees.toFixed(2)}`;

    if (elements.netProfitResult) {
        elements.netProfitResult.innerHTML = `
            R$ ${results.netProfit.toFixed(2)}<br>
            <small class="${results.netProfit >= 0 ? 'positive' : 'negative'}">(${results.profitMargin.toFixed(1)}% ${results.netProfit >= 0 ? 'Lucro' : 'Prejuízo'})</small>
        `;
    }
}

// Histórico e Exportação (modificado para não salvar salePrice)
function saveCalculation(values, results) {
    const lastEntry = calculationHistory[0];
    if (lastEntry) {
        const isDuplicate = 
            lastEntry.salePrice === values.salePrice &&
            lastEntry.costPrice === values.costPrice &&
            lastEntry.commissionRate === values.commissionRate &&
            lastEntry.shippingCost === values.shippingCost &&
            lastEntry.otherCosts === values.otherCosts;
        
        if (isDuplicate) return;
    }

    calculationHistory.unshift({
        date: new Date().toISOString(),
        ...values,
        ...results
    });

    if (calculationHistory.length > 10) calculationHistory.pop();
    
    chrome.storage.local.set({ calculationHistory }, () => {
        updateHistoryTable();
    });

    // Salvar apenas outros campos, excluindo salePrice
    chrome.storage.local.get(['productData'], (result) => {
        const productData = result.productData || {};
        productData[currentProductId] = {
            costPrice: values.costPrice,
            commissionRate: values.commissionRate,
            shippingCost: values.shippingCost,
            otherCosts: values.otherCosts
        };
        chrome.storage.local.set({ productData });
    });
}

function updateHistoryTable() {
    if (!elements.historyTableBody) return;

    elements.historyTableBody.innerHTML = calculationHistory
        .slice(0, 10)
        .map(calc => `
            <tr>
                <td>${new Date(calc.date).toLocaleDateString()}</td>
                <td>R$ ${calc.salePrice.toFixed(2)}</td>
                <td class="${calc.netProfit >= 0 ? 'positive' : 'negative'}">
                    R$ ${calc.netProfit.toFixed(2)}
                </td>
                <td class="${calc.profitMargin >= 0 ? 'positive' : 'negative'}">
                    ${calc.profitMargin.toFixed(1)}%
                </td>
            </tr>
        `).join('');
}

document.getElementById('export-csv').addEventListener('click', () => {
    if (calculationHistory.length === 0) return alert("Nenhum dado para exportar!");
    
    const csvContent = [
        "Data,Preço Venda,Custo,Comissão,Frete,Outros Custos,Lucro,Margem",
        ...calculationHistory.map(calc => 
            `${new Date(calc.date).toLocaleDateString()},${calc.salePrice},${calc.costPrice},${calc.commissionRate},${calc.shippingCost},${calc.otherCosts},${calc.netProfit},${calc.profitMargin.toFixed(1)}%`
        )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "historico_ml.csv";
    link.click();
});