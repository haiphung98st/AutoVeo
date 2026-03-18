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
window.onload = function () {
	chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(async ([tab]) => {
		await chrome.scripting
			.insertCSS({
				files: ['/css/screenshot.css'],
				target: {
					tabId: tab.id
				}
			})
			.catch(error => console.error('failed inserting css', error));

		await chrome.scripting
			.executeScript({
				files: ['/src/content/content.js'],
				target: {
					tabId: tab.id
				}
			})
			.catch(error => console.error('failed executing content script', error));

		const loader = document.getElementById('loader');
		const loggedOutContainer = document.getElementById('loggedOutContainer');
		const loggedInContainer = document.getElementById('loggedInContainer');

		chrome.storage.local.get(['loggedIn'], result => {
			loader.classList.add('hidden');
			if (result['loggedIn']) {
				loggedOutContainer.classList.add('hidden');
				loggedInContainer.classList.remove('hidden');
			} else {
				loggedInContainer.classList.add('hidden');
				loggedOutContainer.classList.remove('hidden');
			}
		});

		// Lazily check if logged in
		chrome.runtime.sendMessage({ message: 'check-logged-in' }, response => {
			if (response.loggedIn) {
				loggedOutContainer.classList.add('hidden');
				loggedInContainer.classList.remove('hidden');
			} else {
				loggedInContainer.classList.add('hidden');
				loggedOutContainer.classList.remove('hidden');
			}
			return Promise.resolve();
		});

		// Capture visible part of the screen
		const visibleAreaButton = document.getElementById('visibleAreaButton');
		visibleAreaButton.onclick = function (event) {
			event.preventDefault();
			// Take screenshot
			chrome.runtime.sendMessage({ message: 'capture-visible-tab' }, async response => {
				// Send image to screenshot preview
				sendMessageToBackground(
					{
						message: 'open-screenshot-taken-tab',
						image: response.imageData,
						name: response.name
					},
					response => {
						if (response.done) {
							window.close();
						} else {
							console.error('Problem opening screenshot tab');
						}
						return Promise.resolve();
					}
				);
			});
		};

		// Message the content script to begin selection
		const selectedAreaButton = document.getElementById('selectedAreaButton');

		selectedAreaButton.onclick = function (event) {
			event.preventDefault();

			sendMessageToContent({ message: 'start-selecting' });
			window.close();
		};

		// Message the content script to begins screenshotting the whole page
		const wholePageButton = document.getElementById('wholePageButton');
		wholePageButton.onclick = function (event) {
			event.preventDefault();

			// Show loader
			const loader = document.getElementById('loader');
			loader.classList.remove('hidden');
			const loggedInContainer = document.getElementById('loggedInContainer');
			loggedInContainer.classList.add('hidden');
			const loaderMessage = document.getElementById('loaderMessage');
			loaderMessage.textContent = 'Taking screenshot...';

			chrome.tabs.query({ currentWindow: true, active: true }, tabs => {
				sendMessageToBackground(
					{
						message: 'begin-page-screenshotting',
						tabId: tabs[0].id
					},
					() => {
						return Promise.resolve();
					}
				);
			});
		};

		// Listen for capture page complete so we can tell the user
		chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
			if (request.message === 'capture-page-completed') {
				// Change loader message
				const loaderMessage = document.getElementById('loaderMessage');
				loaderMessage.textContent = 'Done!';
				setTimeout(function () {
					window.close();
				}, 500);
			}
		});

		// Helper function to send messages to content script(s)
		function sendMessageToContent(message) {
			chrome.tabs.query({ currentWindow: true, active: true }, tabs => {
				const activeTab = tabs[0];
				chrome.tabs.sendMessage(activeTab.id, message);
			});
		}

		// Send message to background script(s)
		function sendMessageToBackground(message, callback) {
			// Send message to background:
			chrome.runtime.sendMessage(message, response => {
				callback(response);
			});
		}

		// See if we need to disable some links - content scripts don't work on extension pages
		function disableUnavailable() {
			chrome.tabs.query({ currentWindow: true, active: true }, tabs => {
				if (
					!tabs[0].url ||
					tabs[0].url.indexOf('chrome-extension://') > -1 ||
					tabs[0].url.indexOf('https://chrome.google.com/') > -1 ||
					tabs[0].url.indexOf('chrome://') > -1
				) {
					const selectedAreaButton = document.getElementById('selectedAreaButton');
					selectedAreaButton.classList.remove('btn-secondary');
					selectedAreaButton.classList.add('text-secondary');
					selectedAreaButton.classList.add('cursor-default');
					selectedAreaButton.onclick = null;

					const wholePageButton = document.getElementById('wholePageButton');
					wholePageButton.classList.remove('btn-secondary');
					wholePageButton.classList.add('text-secondary');
					wholePageButton.classList.add('cursor-default');
					wholePageButton.onclick = null;
				}
			});
		}
		disableUnavailable();
	});
};

/******/ })()
;