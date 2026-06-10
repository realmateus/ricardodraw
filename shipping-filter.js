(function exposeCorreiosFilter(root) {
    function normalize(value) {
        return String(value || "").trim().toLocaleLowerCase("pt-BR");
    }

    function isCorreiosShippingOption(option) {
        const company = normalize(option?.company?.name);
        const service = normalize(option?.name);
        const isAcceptedService = /\b(?:pac|sedex)\b/.test(service);
        return company.includes("correios") && isAcceptedService;
    }

    root.isCorreiosShippingOption = isCorreiosShippingOption;
    root.filterCorreiosShippingOptions = function filterCorreiosShippingOptions(options) {
        return Array.isArray(options) ? options.filter(isCorreiosShippingOption) : [];
    };
}(typeof window === "undefined" ? globalThis : window));
