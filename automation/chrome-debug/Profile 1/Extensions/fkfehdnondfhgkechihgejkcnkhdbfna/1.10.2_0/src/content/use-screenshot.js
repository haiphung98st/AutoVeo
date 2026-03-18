/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
__webpack_require__.r(__webpack_exports__);
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.message === 'use-uploaded-screenshot') {
		const imageData = request.imageData;
		if (!imageData) {
			return sendResponse({ done: false });
		}
		const { name, width, height, path, signedUrl } = imageData;
		if (!name || !width || !height || !path || !signedUrl) {
			return sendResponse({ done: false });
		}
		setTimeout(() => {
			window.postMessage(
				{
					message: 'use-uploaded-screenshot',
					name: name,
					width: width,
					height: height,
					path: path,
					signedUrl: signedUrl
				},
				'https://app.moqups.com'
			);
			sendResponse({ done: true });
		}, 100);
	}
	return true;
});

/******/ })()
;