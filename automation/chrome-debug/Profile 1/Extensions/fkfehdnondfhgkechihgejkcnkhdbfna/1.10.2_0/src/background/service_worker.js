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
// On loading background.js, check if user is logged in
// and set the state in local storage
isLoggedIn();

/*
	WHOLE PAGE SCREENSHOT
*/

// ID of current tab
let tabId = null;

// Canvas element
let screenshotCanvas = null;

// 2D context of screenshotCanvas element
let screenshotContext = null;

// Number of pixels by which to move the screen
let scrollBy = 0;

// Size of page
let size = {
	width: 0,
	height: 0
};

// For high density pixels displays
let devicePixelRatio = 1;

// Keep original params of page
let originalParams = {
	overflow: '',
	scrollTop: 0
};

// Listen for messages from content script(s)
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.message === 'close-present-tab') {
		chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(tabs => {
			chrome.tabs.remove(tabs[0].id).then(() => {
				sendResponse({ done: true });
			});
		});
	}
	if (request.message === 'check-logged-in') {
		isLoggedIn(function (resp) {
			sendResponse(resp);
		});
	}
	if (request.message === 'get-team-id') {
		getUniqueId(request.teamId, function (resp) {
			sendResponse(resp);
		});
	}
	if (request.message === 'open-moqups-tab') {
		goToMoqups(request.imageData).then(function (resp) {
			if (resp.done) {
				sendResponse({ done: true });
			}
		});
	}
	if (request.message === 'open-screenshot-taken-tab') {
		goToScreenshotTaken(request.image, request.name, function (resp) {
			if (resp.done) {
				sendResponse({ done: true });
			}
		});
	}
	if (request.message === 'upload-image-data') {
		uploadImageData(request, resp => {
			if (resp.done) {
				sendResponse({ done: true, imageData: resp.imageData });
			} else {
				sendResponse({ done: false });
			}
		});
	}
	if (request.message === 'capture-visible-tab-colorpicker') {
		chrome.tabs
			.captureVisibleTab(null, { format: 'png' })
			.then(image => {
				sendResponse({ imageData: image });
			})
			.catch(handleError('Capture visible tab for colorpicker'));
	}
	if (request.message === 'capture-visible-tab') {
		chrome.tabs
			.captureVisibleTab(null, { format: 'png' })
			.then(async image => {
				const name = await getImageNameFromActiveTabHostname();
				sendResponse({ imageData: image, name: name });
			})
			.catch(handleError('Capture visible tab'));
	}

	// Fullscreen screenshot
	if (request.message === 'begin-page-screenshotting') {
		// Init
		initialize();

		//scriptRequestingScreenshot = sender;
		tabId = request.tabId;

		chrome.tabs.sendMessage(request.tabId, {
			message: 'get-page-details'
		});
		sendResponse({ done: true });
	}
	if (request.message === 'set-page-details') {
		size = request.size;
		scrollBy = request.scrollBy;
		originalParams = request.originalParams;
		devicePixelRatio = request.devicePixelRatio;

		// Set actual size in memory (scaled to account for extra pixel density).
		screenshotCanvas.width = size.width * parseFloat(devicePixelRatio);
		screenshotCanvas.height = size.height * parseFloat(devicePixelRatio);

		scrollTo(0);
		sendResponse({ done: true });
	}
	if (request.message === 'capture-page') {
		capturePage(request.position, request.lastCapture).then(resp => {
			if (!resp?.done) {
				sendResponse({ done: false });
				return;
			}

			chrome.runtime.sendMessage({
				message: 'capture-page-completed'
			});
			sendResponse({ done: true, image: resp.image, name: resp.name });
		});
	}
	return true;
});

async function getImageNameFromActiveTabHostname() {
	// Get active tab to get url
	const [tab] = await chrome.tabs
		.query({ active: true, lastFocusedWindow: true })
		.catch(handleError('Get active tab'));
	if (!tab) {
		return;
	}

	// Create image name
	const newUrl = new URL(tab.url);
	const hostname = newUrl.host.replace('www.', '').replace(/\./g, '_');
	const name = `${hostname} Screen Shot ${getCurrentDayAndHour()}`;
	return name;
}

function getUniqueId(teamId, callback) {
	const opts = { method: 'GET' };
	fetch('https://api.moqups.com/api/v1/teams/' + teamId + '/rootAsset', opts)
		.then(function (response) {
			return response.json();
		})
		.then(function (response) {
			chrome.storage.local.set({ parentId: response.uniqueId }).then(() => {
				if (callback) {
					callback({ done: true });
				}
			});
			return response;
		})
		.catch(function (error) {
			// Nullify Id
			chrome.storage.local.set({ parentId: null });
		});
}

function isLoggedIn(callback) {
	const opts = { method: 'GET' };
	fetch('https://api.moqups.com/api/v1/session', opts)
		.then(function (response) {
			return response.json();
		})
		.then(function (response) {
			// Set new Id and then callback
			chrome.storage.local.set({ teamId: response.teamId, loggedIn: true }).then(() => {
				// Get and set into localstorage the teams - needed for upload
				getTeams();
				if (callback) {
					// Let extension know the user is logged In
					callback({ loggedIn: true });
				}
			});
			return response;
		})
		.catch(function (error) {
			// Nullify Id
			chrome.storage.local.set({ teamId: null, loggedIn: false }).then(() => {
				if (callback) {
					callback({ loggedIn: false });
				}
			});
		});
}

function getTeams(callback) {
	const opts = { method: 'GET' };
	fetch('https://api.moqups.com/api/v1/teams/meta', opts)
		.then(function (response) {
			return response.json();
		})
		.then(function (response) {
			// Set teams to localstore
			chrome.storage.local.set({ teams: response });
			return response;
		})
		.catch(function (error) {
			// Nullify Id
			chrome.storage.local.set({ teamId: null, loggedIn: false }).then(() => {
				if (callback) {
					callback({ loggedIn: false });
				}
			});
		});
}

async function goToMoqups(imageData) {
	const editorURL = 'https://app.moqups.com';
	const [tab] = await chrome.tabs
		.query({ url: `*://app.moqups.com/*` })
		.catch(handleError('Query for editor tab'));

	// Select and reload if it's there
	if (tab) {
		await chrome.tabs
			.update(tab.id, { active: true, highlighted: true })
			.catch(handleError('Updating active tab'));
		await chrome.tabs
			.sendMessage(tab.id, { message: 'use-uploaded-screenshot', imageData: imageData })
			.catch(handleError('Send message to editor tab'));
	} else {
		const newtab = await chrome.tabs.create({ url: editorURL });
		await new Promise(resolve => {
			const tabListener = async (tabId, info) => {
				if (tabId === newtab.id && info?.status === 'complete') {
					chrome.tabs.onUpdated.removeListener(tabListener);
					// Give the new tab some time to load before sending message
					setTimeout(async () => {
						await chrome.tabs
							.sendMessage(newtab.id, {
								message: 'use-uploaded-screenshot',
								imageData: imageData
							})
							.catch(handleError('Send message to new editor tab'));
						resolve();
					}, 500);
				}
			};
			chrome.tabs.onUpdated.addListener(tabListener);
		});
	}
	return { done: true };
}

async function goToScreenshotTaken(image, name, callback) {
	const screenshotTakenUrl = chrome.runtime.getURL('src/page/captured.html');
	let targetId = null;

	const listener = (tabId, changedProps) => {
		// Not the tab we're interested in
		if (tabId !== targetId || changedProps.status != 'complete') {
			return;
		}
		//Send screenshotUrl to the tab.
		chrome.tabs.sendMessage(tabId, { message: 'screenshot-data', image: image, name: name });
		chrome.tabs.onUpdated.removeListener(listener);
		callback({ done: true });
	};

	chrome.tabs.onUpdated.addListener(listener);

	const tab = await chrome.tabs.create({ url: screenshotTakenUrl });
	targetId = tab.id;
}

// Helper function for default naming of files
function getCurrentDayAndHour() {
	const today = new Date();
	let dd = today.getDate();
	let mm = today.getMonth() + 1; //As January is 0.
	const yyyy = today.getFullYear();
	const hh = today.getHours();
	let min = today.getMinutes();

	if (dd < 10) dd = '0' + dd;
	if (mm < 10) mm = '0' + mm;
	if (min < 10) min = '0' + min;
	return dd + '-' + mm + '-' + yyyy + ' at ' + hh + ':' + min;
}

function uploadImageData(request, callback) {
	chrome.storage.local.get('parentId').then(resp => {
		const parentId = resp['parentId'];
		if (!parentId) {
			return;
		}

		// Send to API
		const data = new FormData();
		data.append('image', imageToBlob(request.imageData), request.name + '.png');
		const opts = {
			method: 'POST',
			body: data
		};
		fetch('https://api.moqups.com/api/v1/assets/upload?parent=' + parentId, opts)
			.then(response => {
				if (!response['ok']) {
					callback({ done: false });
				}
				return response.json();
			})
			.then(response => {
				const [image] = response;
				const imageData = image
					? {
							name: image.name,
							width: image.width,
							height: image.height,
							path: image.path,
							signedUrl: image.signedUrl
					  }
					: {};

				callback({ done: true, imageData: imageData });
				return response;
			})
			.catch(error => {
				console.error(error);
			});
	});
}

// Make image into multipart functions
function b64ToBlob(b64Data, contentType, sliceSize) {
	contentType = contentType || '';
	sliceSize = sliceSize || 512;

	const byteCharacters = atob(b64Data);
	let byteArrays = [];

	for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
		const slice = byteCharacters.slice(offset, offset + sliceSize);

		let byteNumbers = new Array(slice.length);
		for (let i = 0; i < slice.length; i++) {
			byteNumbers[i] = slice.charCodeAt(i);
		}

		let byteArray = new Uint8Array(byteNumbers);
		byteArrays.push(byteArray);
	}

	const blob = new Blob(byteArrays, { type: contentType });
	return blob;
}

function imageToBlob(imageData) {
	// Split the base64 string in data and contentType
	const block = imageData.split(';');
	// Get the content type of the image
	const contentType = block[0].split(':')[1]; // In this case "image/png"
	// Get the real base64 content of the file
	const realData = block[1].split(',')[1]; // In this case "R0lGODlhPQBEAPeoAJosM...."

	// Convert it to a blob to upload
	return b64ToBlob(realData, contentType);
}

// Init canvas
function initialize() {
	screenshotCanvas = new OffscreenCanvas(100, 100);
	screenshotContext = screenshotCanvas.getContext('2d');
}

function dataUrItoBlob(dataUri) {
	var binary = atob(dataUri.split(',')[1]);
	var mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
	var array = [];
	for (var i = 0; i < binary.length; i++) {
		array.push(binary.charCodeAt(i));
	}
	return new Blob([new Uint8Array(array)], { type: mimeString });
}

function blobToDataUri(blob) {
	return new Promise(resolve => {
		let reader = new FileReader();
		reader.readAsDataURL(blob);
		reader.onload = function () {
			resolve(reader.result);
		};
	});
}

// Send request to scroll page on given position
function scrollTo(position) {
	chrome.tabs.sendMessage(tabId, {
		message: 'scroll-page',
		size: size,
		scrollBy: scrollBy,
		scrollTo: position
	});
}
// Send request to set original params of page
function resetPage() {
	chrome.tabs.sendMessage(tabId, {
		message: 'reset-page',
		originalParams: originalParams
	});
}

function handleError(message) {
	return function (error) {
		console.error(`Error while ${message}`, error);
	};
}

// Takes screenshot of visible area and merges it
async function capturePage(position, lastCapture) {
	return new Promise(async resolve => {
		setTimeout(async () => {
			// 1. Capture visible tab
			const dataURI = await chrome.tabs
				.captureVisibleTab(null, { format: 'png' })
				.catch(handleError('Capture visible tab'));

			if (!dataURI) {
				await chrome.tabs.sendMessage(tabId, {
					message: 'show-error',
					originalParams: originalParams
				});
				return resolve({ done: false });
			}

			// 2. transform dataURI into image
			const image = await self
				.createImageBitmap(dataUrItoBlob(dataURI))
				.catch(handleError('Create image bitmap'));

			if (!image) {
				chrome.tabs.sendMessage(tabId, {
					message: 'show-error',
					originalParams: originalParams
				});
				return resolve({ done: false });
			}

			// 3.  Draw image
			screenshotContext.drawImage(image, 0, position * parseFloat(devicePixelRatio));

			// 4. Decide if last capture and finish up image
			if (lastCapture) {
				resetPage();

				// 4.1 get active tab
				const [tab] = await chrome.tabs
					.query({ active: true, lastFocusedWindow: true })
					.catch(handleError('Get active tab'));
				if (!tab) {
					chrome.tabs.sendMessage(tabId, {
						message: 'show-error',
						originalParams: originalParams
					});
					return resolve({ done: false });
				}

				// 4.2 Get Hostname  and name
				const name = await getImageNameFromActiveTabHostname();

				//4.3 Extract image as dataUri
				const blob = await screenshotCanvas
					.convertToBlob()
					.catch(handleError('Convert offscreen canvas to blob'));
				const imageData = await blobToDataUri(blob);

				return resolve({ done: true, image: imageData, name: name });
			} else {
				scrollTo(position + scrollBy);
				return resolve({ done: false });
			}
		}, 500);
	});
}

/******/ })()
;