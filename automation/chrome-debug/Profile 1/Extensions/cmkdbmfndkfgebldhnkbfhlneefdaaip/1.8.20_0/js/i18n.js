function applyI18n(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        const translation = chrome.i18n.getMessage(key);
        if (!translation) return;

        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.placeholder = translation;
        } else if (el.tagName === "TITLE") {
        document.title = translation;
        } else {
        el.textContent = translation;
        }
    });
}


document.addEventListener("DOMContentLoaded", () => {
    applyI18n();

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
            if (node.hasAttribute && node.hasAttribute("data-i18n")) {
                applyI18n(node.parentNode);
            } else {
                applyI18n(node);
            }
            }
        });
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
