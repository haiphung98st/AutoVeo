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
// Listen for screenshot data message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	// Received screenshot image and name
	if (request.message === 'screenshot-data') {
		const { image, name } = request;

		// Put them on window to have them ready for upload
		window.__mq_image = image;
		window.__mq_name = name;

		const taken = document.getElementById('screenshotTaken');
		const loader = document.getElementById('loader');
		const screenshotNameInput = document.getElementById('screenshotNameInput');

		taken.src = image;
		// Hide loader
		loader.classList.add('hidden');
		// Show image
		taken.classList.remove('hidden');

		screenshotNameInput.value = name;
		// Autoselect input after load
		screenshotNameInput.focus();
		screenshotNameInput.select();
	}
});

window.onload = function () {
	const discardButton = document.getElementById('discardButton');

	const goToMoqupsButton = document.getElementById('goToMoqupsButton');
	goToMoqupsButton.onclick = function (event) {
		event.preventDefault();
		chrome.runtime
			.sendMessage({ message: 'open-moqups-tab', imageData: window.__mq_imageData })
			.then(r => {
				if (r.done) {
					window.close();
					return Promise.resolve();
				}
			});
	};

	// Upload screenshot to Moqups
	const uploadButton = document.getElementById('uploadButton');
	uploadButton.onclick = function (event) {
		chrome.storage.local.get('teams').then(data => {
			// If there's only one team, upload to that
			if (data.teams.length === 1) {
				getTeamId(data.teams[0].uniqueId);
			} else {
				showOptions(data.teams);
			}
		});
	};

	function getTeamId(teamId) {
		chrome.runtime.sendMessage({ message: 'get-team-id', teamId: teamId }).then(r => {
			if (r.done) {
				uploadScreenshot();
			}
		});
	}

	function uploadScreenshot() {
		// Show what's happening but disable upload
		uploadButton.textContent = 'Uploading...';
		uploadButton.disabled = true;
		uploadButton.classList.remove('btn-primary');
		uploadButton.classList.add('text-white');
		uploadButton.classList.add('bg-transparent');
		uploadButton.classList.add('cursor-default');
		uploadButton.classList.add('text-left');
		uploadButton.classList.add('w-8em');

		let animateUploadingMessage = setInterval(function () {
			if (uploadButton.textContent === 'Uploading...') {
				uploadButton.textContent = 'Uploading.';
			} else if (uploadButton.textContent === 'Uploading.') {
				uploadButton.textContent = 'Uploading..';
			} else if (uploadButton.textContent === 'Uploading..') {
				uploadButton.textContent = 'Uploading...';
			}
		}, 600);

		chrome.runtime
			.sendMessage({
				message: 'upload-image-data',
				imageData: window.__mq_image,
				name: window.__mq_name
			})
			.then(resp => {
				if (resp.done) {
					const imageData = resp.imageData;
					window.__mq_imageData = imageData;

					// Stop animating
					clearInterval(animateUploadingMessage);
					// Show done
					uploadButton.classList.add('hidden');
					// Show Go to Moqups button
					goToMoqupsButton.classList.remove('hidden');
					discardButton.textContent = 'Close';
				} else {
					// Stop animating
					clearInterval(animateUploadingMessage);
					// Show done
					uploadButton.classList.add('hidden');
					// Show Go to Moqups button
					const errorButton = document.getElementById('errorButton');
					errorButton.classList.remove('hidden');
					discardButton.textContent = 'Close';
				}
			});
	}

	function showOptions(teams) {
		// Populate modal with options

		const modalOptions = document.getElementById('modalOptions');
		modalOptions.replaceChildren;

		for (let i = 0; i < teams.length; i++) {
			const button = document.createElement('button');
			button.classList.add('modal-option');
			button.id = teams[i].uniqueId;
			button.textContent = teams[i].name;
			modalOptions.appendChild(button);
		}

		// Get the modal
		var modal = document.getElementById('pickTeamModal');
		// Show modal
		modal.style.display = 'block';
		// Get the <span> element that closes the modal
		var span = document.getElementsByClassName('close')[0];
		// When the user clicks on <span> (x), close the modal
		span.onclick = function () {
			modal.style.display = 'none';
		};

		// When user selects stuff, close the mopdal and proceed
		var teamsEl = document.getElementsByClassName('modal-option');
		for (let i = 0; i < teamsEl.length; i++) {
			teamsEl[i].addEventListener('click', selectTeam);
		}

		function selectTeam(e) {
			modal.style.display = 'none';
			getTeamId(e.target.id);
		}
	}

	// Discard screenshot
	discardButton.onclick = function (event) {
		window.close();
	};

	const screenshotNameInput = document.getElementById('screenshotNameInput');
	screenshotNameInput.onchange = function (event) {
		let name = screenshotNameInput.value;
		if (name.trim() === '') {
			name = 'Untitled Screen Shot';
		}
		// Sanitize dots as they confuse the API
		name = name.replace(/\./g, '_');

		// Show the user the final name
		screenshotNameInput.value = name;

		// Save data in window object
		window.__mq_name = name;
	};
};

/******/ })()
;