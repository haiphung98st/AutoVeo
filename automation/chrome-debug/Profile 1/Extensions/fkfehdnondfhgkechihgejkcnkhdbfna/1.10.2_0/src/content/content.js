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
// Don't execute script more than once
if (!window._mq_contentScriptsLoaded) {
	window._mq_contentScriptsLoaded = true;

	let wWidth = Math.max(
		document.documentElement.clientWidth,
		document.body.offsetWidth,
		document.documentElement.offsetWidth
	);

	// Selection w/h
	let sWidth = 0;
	let sHeight = 0;

	const MAX_SCROLL_HEIGHT = 20000;

	chrome.runtime.onMessage.addListener(function onMessageListener(request, sender, sendResponse) {
		if (request.message === 'start-selecting') {
			startSelecting();
			sendResponse({ done: true });
		}
		if (request.message === 'get-page-details') {
			const size = {
				width: Math.max(
					document.documentElement.clientWidth,
					document.body.offsetWidth,
					document.documentElement.offsetWidth
				),
				height: Math.min(
					MAX_SCROLL_HEIGHT,
					Math.max(
						document.documentElement.clientHeight,
						document.body.scrollHeight,
						document.documentElement.scrollHeight,
						document.body.offsetHeight,
						document.documentElement.offsetHeight
					)
				)
			};

			sendMessageToBackground(
				{
					message: 'set-page-details',
					size: size,
					scrollBy: window.innerHeight,
					originalParams: {
						overflow: document.querySelector('html').style.overflow,
						scrollTop: document.documentElement.scrollTop
					},
					devicePixelRatio: window.devicePixelRatio
				},
				() => {
					sendResponse({ done: true });
					return Promise.resolve();
				}
			);
		}
		if (request.message === 'scroll-page') {
			let lastCapture = false;

			window.scrollTo(0, request.scrollTo);

			removeFixedPositions(request.scrollTo);

			// First scrolling
			if (request.scrollTo === 0) {
				document.querySelector('html').style.overflow = 'hidden';
			}

			// Last scrolling
			if (
				Math.max(
					document.documentElement.clientHeight,
					document.body.scrollHeight,
					document.documentElement.scrollHeight,
					document.body.offsetHeight,
					document.documentElement.offsetHeight
				) <= Math.round(window.scrollY + request.scrollBy) ||
				window.scrollY >= MAX_SCROLL_HEIGHT
			) {
				lastCapture = true;
				request.scrollTo = request.size.height - request.scrollBy;
			}

			sendMessageToBackground(
				{
					message: 'capture-page',
					position: request.scrollTo,
					lastCapture: lastCapture
				},
				resp => {
					if (resp?.done) {
						// Let user know
						sendMessageToBackground({ message: 'screenshot-done' });
						// Redirect to result
						sendMessageToBackground({
							message: 'open-screenshot-taken-tab',
							image: resp.image,
							name: resp.name
						});
					}
					sendResponse({ done: true });
					return Promise.resolve();
				}
			);
		}
		if (request.message === 'reset-page') {
			resetPage(request.originalParams);
			sendResponse({ done: true });
		}
		if (request.message === 'show-error') {
			const errorEl = document.createElement('div');
			const errorMessage = document.createElement('div');
			// Add styles
			Object.assign(errorMessage.style, {
				position: 'absolute',
				top: '20px',
				left: '20px',
				zIndex: 9999,
				padding: '8px',
				backgroundColor: '#fff2f2',
				border: '1px solid #f03e3e',
				borderRadius: '2px',
				fontSize: '20px',
				fontWeight: 'bold',
				lineHeight: '24px',
				transition: 'opacity .3s linear'
			});

			errorMessage.textContent =
				'An internal error occurred while trying to capture the page. Please try again';
			errorEl.appendChild(errorMessage);

			document.body.appendChild(errorEl);

			setTimeout(function () {
				errorEl.firstChild.style.opacity = 0;
			}, 10000);

			resetPage(request.originalParams);
			sendResponse({ done: true });
		}
		return true;
	});

	// Container
	const sDiv = document.createElement('div');
	sDiv.classList.add('mq-screenshot-container');

	// Overlay
	const oDiv = document.createElement('div');
	oDiv.classList.add('mq-screenshot-overlay');
	oDiv.id = 'mq-screenshot-overlay';
	sDiv.appendChild(oDiv);

	// Guidance
	const gDiv = document.createElement('div');
	gDiv.classList.add('mq-screenshot-guidance');
	const escKeySpan = document.createElement('span');
	escKeySpan.classList.add('mq-key-format');
	escKeySpan.textContent = 'Esc';
	gDiv.appendChild(
		document.createTextNode('Click and drag to select the area to screenshot. Press the ')
	);
	gDiv.appendChild(escKeySpan);
	gDiv.appendChild(document.createTextNode(' key to cancel.'));
	sDiv.appendChild(gDiv);

	// Selection
	const cDiv = document.createElement('div');
	cDiv.classList.add('mq-screenshot-selection');
	cDiv.id = 'mq-screenshot-selection';
	sDiv.appendChild(cDiv);

	// Tooltip
	const tDiv = document.createElement('div');
	tDiv.classList.add('mq-screenshot-tooltip');
	tDiv.id = 'mq-screenshot-tooltip';
	sDiv.appendChild(tDiv);

	// State
	let start = {};
	let end = {};
	let isSelecting = false;
	let isScreenshot = false;

	// Event listeners
	function onMouseDown(event) {
		// Hide guidance
		gDiv.classList.add('mq-screenshot-hidden');

		// Update our state
		isSelecting = true;
		isScreenshot = false;

		start.x = event.pageX;
		start.y = event.pageY;

		// Show visible selection
		cDiv.style.width = '0px';
		cDiv.style.height = '0px';
		cDiv.style.left = event.pageX + 'px ';
		cDiv.style.top = event.pageY + 'px';
		cDiv.style.opacity = 1;

		// Show tooltip with default text and follow mouse
		tDiv.style.left = event.pageX + 'px';
		tDiv.style.top = event.pageY + 'px';
		tDiv.textContent = '0:0';
	}

	function onMouseMove(event) {
		if (!isSelecting) {
			// Update tooltip position
			if (
				event.pageX + 120 > wWidth &&
				event.pageY + 45 > document.documentElement.clientHeight
			) {
				// The tooltip would bleed off the right of the screen OR to the bottom, invisible
				tDiv.style.left = event.pageX - 120 + 'px';
				tDiv.style.top = event.pageY - 45 + 'px';
			} else if (event.pageX + 120 > wWidth) {
				// The tooltip would bleed off the right of the screen, invisible for the user
				tDiv.style.left = event.pageX - 120 + 'px';
				tDiv.style.top = event.pageY + 'px';
			} else if (event.pageY + 45 > document.documentElement.clientHeight) {
				// The tooltip would bleed off the bottom of the screen, invisible for the user
				tDiv.style.left = event.pageX + 'px';
				tDiv.style.top = event.pageY - 45 + 'px';
			} else {
				// The default
				tDiv.style.left = event.pageX + 'px';
				tDiv.style.top = event.pageY + 'px';
			}

			// Update tooltip text
			tDiv.textContent = event.pageX + ':' + event.pageY;
			return;
		}

		// Update state
		isScreenshot = true;
		end.x = event.pageX;
		end.y = event.pageY;

		// Move & resize selection to reflect mouse position
		if (end.x >= start.x && end.y >= start.y) {
			// Calculate selection w/h
			sWidth = end.x - start.x;
			sHeight = end.y - start.y;
			// Update tooltip position
			tDiv.style.left = event.pageX + 'px';
			tDiv.style.top = event.pageY + 'px';
		}

		if (end.x <= start.x && end.y <= start.y) {
			// Calculate selection w/h
			sWidth = start.x - end.x - 1;
			sHeight = start.y - end.y - 1;

			// Update selection
			cDiv.style.top = end.y + 1 + 'px';
			cDiv.style.left = end.x + 1 + 'px';

			// Update tooltip position
			tDiv.style.left = event.pageX - 115 + 'px';
			tDiv.style.top = event.pageY - 40 + 'px';
		}

		if (end.x >= start.x && end.y <= start.y) {
			// Calculate selection w/h
			sWidth = end.x - start.x;
			sHeight = start.y - end.y;

			// Update selection
			cDiv.style.top = end.y + 'px';

			// Update tooltip position
			tDiv.style.left = event.pageX + 'px';
			tDiv.style.top = event.pageY - 40 + 'px';
		}

		if (end.x <= start.x && end.y >= start.y) {
			// Calculate selection w/h
			sWidth = start.x - end.x;
			sHeight = end.y - start.y;

			// Update selection
			cDiv.style.left = end.x + 'px';

			// Update tooltip position
			tDiv.style.left = event.pageX - 115 + 'px';
			tDiv.style.top = event.pageY + 'px';
		}

		// Update selection
		cDiv.style.width = sWidth + 'px';
		cDiv.style.height = sHeight + 'px';

		// Update tooltip text
		tDiv.textContent = sWidth + ' × ' + sHeight;
	}

	function onMouseUp(event) {
		// Update our state
		isSelecting = false;

		// Hide selection so the screenshot doesn't show it
		cDiv.style.opacity = 0;

		// Distance from selection start
		const distance = Math.floor(Math.sqrt(Math.pow(sHeight, 2) + Math.pow(sWidth, 2)));

		// If the user moved less than 5 pixels away from the selection start, stop
		// If the selection width or height is zero pixels, stop
		if (distance <= 5 || sWidth === 0 || sHeight === 0) {
			// Stop screenshotting
			doneScreenshotting(event);
			return;
		}

		// Screenshot
		if (isScreenshot) {
			const rect = cDiv.getBoundingClientRect();

			// Stop screenshotting
			doneScreenshotting(event);

			// Give the browser some time to properly apply opacity = 0 for the selection
			setTimeout(function () {
				// We get the actual screenshot of the visible tab by sending a message to background.js
				// (screenshotting is not available in content scripts as of May 2019)
				chrome.runtime.sendMessage({ message: 'capture-visible-tab' }).then(response => {
					// Resize visible tab to selection
					cutImage(response.imageData, rect, imageFromCanvas => {
						sendMessageToBackground(
							{
								message: 'open-screenshot-taken-tab',
								image: imageFromCanvas,
								name: response.name
							},
							response => {
								if (!response.done) {
									console.error('Problem opening screenshot tab');
								}
								return Promise.resolve();
							}
						);
					});
					return Promise.resolve();
				});
			}, 200);
		}
	}

	function onKeyDownScreenshoting(e) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			// Stop screenshotting
			doneScreenshotting(e);
		}
	}

	// Start a selection
	function startSelecting() {
		// Append the selecting divs
		document.body.appendChild(sDiv);

		// Show guiding if it was hidden before
		if (gDiv.classList.contains('mq-screenshot-hidden')) {
			gDiv.classList.remove('mq-screenshot-hidden');
		}

		// Add listeners
		window.addEventListener('mousedown', onMouseDown, false);
		window.addEventListener('mousemove', onMouseMove, false);
		window.addEventListener('mouseup', onMouseUp, false);
		window.addEventListener('keydown', onKeyDownScreenshoting, true);
	}

	// Cleanup
	function stopSelecting() {
		// Hide helping divs
		oDiv.style.width = '100%';
		oDiv.style.height = '100%';

		// Move back offscreen and reset dimensions
		cDiv.style.top = '-100px';
		cDiv.style.left = '-100px';
		cDiv.style.width = '0px';
		cDiv.style.height = '0px';

		// Move tooltip off viewport
		tDiv.style.left = '-100px';
		tDiv.style.top = '-100px';

		// Remove the selecting div
		document.body.removeChild(sDiv);

		// Remove listeners
		window.removeEventListener('mousedown', onMouseDown, false);
		window.removeEventListener('mousemove', onMouseMove, false);
		window.removeEventListener('mouseup', onMouseUp, false);
		window.removeEventListener('keydown', onKeyDownScreenshoting, true);

		// Reset state
		isSelecting = false;
		isScreenshot = false;
	}

	// Cut image to dimensions
	function cutImage(imageData, rect, callback) {
		// Prepare the canvas
		const canvas = document.createElement('canvas');
		canvas.width = sWidth * window.devicePixelRatio;
		canvas.height = sHeight * window.devicePixelRatio;

		// Retina displays
		canvas.style.width = sWidth + 'px';
		canvas.style.height = sHeight + 'px';
		const context = canvas.getContext('2d');

		// This will hold the screenshot
		const img = new Image();

		// When the image is loaded, execute the following
		img.addEventListener(
			'load',
			() => {
				// + 1 accounts for border
				context.drawImage(
					img,
					rect.x * window.devicePixelRatio + 1,
					rect.y * window.devicePixelRatio + 1,
					sWidth * window.devicePixelRatio,
					sHeight * window.devicePixelRatio,
					0,
					0,
					sWidth * window.devicePixelRatio,
					sHeight * window.devicePixelRatio
				);

				const imageFromCanvas = canvas.toDataURL();
				callback(imageFromCanvas);
			},
			false
		);

		// Set image source so it can begin loading
		img.src = imageData;
	}

	// Helper function to communicate with background.js
	function sendMessageToBackground(message, callback) {
		chrome.runtime.sendMessage(message).then(response => {
			if (callback) {
				callback(response);
			}
		});
	}

	function resetPage(originalParams) {
		window.scrollTo(0, originalParams.scrollTop);
		document.querySelector('html').style.overflow = originalParams.overflow;
		// Reset fixed positions based on the 'data-position' attribute
		const elems = document.body.getElementsByTagName('*');
		for (let i = 0; i < elems.length; i++) {
			if (elems[i].getAttribute('data-position') == 'fixed') {
				elems[i].style.position = 'fixed';
				elems[i].removeAttribute('data-position');
			}
			if (elems[i].getAttribute('data-position') == 'sticky') {
				elems[i].style.position = 'sticky';
				elems[i].removeAttribute('data-position');
			}

			// for Google
			const element = document.getElementById('searchform');
			if (element) {
				element.style.cssText += 'opacity: 1 !important;';
			}
			// For Moqups.com
			const headers = document.getElementsByTagName('header');
			if (headers[0]) {
				headers[0].style.cssText += 'opacity: 1 !important;';
			}
		}
	}

	function removeFixedPositions(scrollTo) {
		const elems = document.body.getElementsByTagName('*');
		for (let i = 0; i < elems.length; i++) {
			const elemStyle = window.getComputedStyle(elems[i]);
			if (elemStyle.getPropertyValue('position') == 'fixed') {
				// Set a 'data-position' attribute so we can reset this later
				elems[i].setAttribute('data-position', 'fixed');
				elems[i].style.cssText += 'position: static !important;';
			}
			if (elemStyle.getPropertyValue('position') == 'sticky') {
				// Set a 'data-position' attribute so we can reset this later
				elems[i].setAttribute('data-position', 'sticky');
				elems[i].style.cssText += 'position: static !important;';
			}

			// For Google
			// Apparently the startegy used for ading position static is not working on the first scroll
			// when in Google so the quickest thing is this dirty hack that hides the header and restores it
			// on resetPage();
			if (scrollTo !== 0) {
				const element = document.getElementById('searchform');
				if (element) {
					element.style.cssText += 'opacity: 0 !important;';
				}
			}

			// For Moqups.com
			// the header stickyness is applied after the extension tries to remove it so we opacity = 0 it
			if (scrollTo !== 0) {
				const headers = document.getElementsByTagName('header');
				if (headers[0]) {
					headers[0].style.cssText += 'opacity: 0 !important;';
				}
			}
		}
	}

	function doneScreenshotting(event) {
		event.preventDefault();
		event.stopPropagation();
		// Stop selecting
		stopSelecting();
	}
}

/******/ })()
;