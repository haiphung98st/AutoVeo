var currentHostName = '',
	detectedApps = {};
(function() {
	$(document).ready(function() {
		var d = document;
		var techInfoEl = $('#tech-info');
		var evenEl = $('#even');
		var oddEl = $('#odd');
		var siteEl = $(".current-site-name");
		var popup = {
			self: '',
			init: function() {
				self = popup;
				this.setEvents();
				this.initForceRefreshEvent()
			},
			initForceRefreshEvent: function () {
				$('.btn-force-refresh').click(function (e) {
					self.getSiteDataWoChecks();
				});
				window.addEventListener('keydown', (e) => {
					if (e.shiftKey && e.code === 'Backquote') {
						document.getElementById('forceRefreshApps').classList.toggle('active');
					}
				});
			},
			adjustIframeHeight: function() {
				setTimeout(function() {
					let height = $(".slideDown").height() + 80
					window.parent.postMessage({
						type: 'adjustHeight',
						height: height,
						iframeContent: height
					}, '*');
				}, 50);
			},
			tabQuery: function(callback) {
				try {
					browser.tabs.query({
						active: true,
						currentWindow: true
					}).then(callback);
				} catch (e) {
					console.log(e);
				}
			},
			setEvents: function() {
				var sendMessage = function(tabs) {
					BROWSER.runtime.sendMessage({
						id: GET_DETECTED_APPS,
						tab: tabs[0]
					}, function(res) {
						if (typeof res != "undefined" && typeof res.tabTechs != "undefined" && typeof res.tabTechs.response != "undefined") {
							self.processResponse(res);
						} else {
							self.getAppsByDomainName(tabs);
						}
					});
				};

				self.tabQuery(sendMessage);

			},
			getAppsByDomainName: function(tabs) {
				try {
					var sendMessage = function(tabs) {
						BROWSER.runtime.sendMessage({
							id: GET_HOST_NAME,
							tab: tabs[0]
						}, function(res) {
							if (typeof res.hostname != "undefined" && res.hostname != null) {
								if (res.hostname == "newtab") {
									self.showContent();
								} else if (invalidDomains.indexOf(res.hostname) >= 0) {
									self.showInvalidAddressContent();
								} else {
									res.type = "ajax";
									if (typeof res.subdomain != "undefined") res.hostname = res.rawhostname;
									self.getAppsFromHost(GET_SITE_APPS, res.hostname, res);
								}
							} else self.showContent();
						});
					};
				} catch (e) {

				}
				self.tabQuery(sendMessage);
			},
			getAppsFromHost: function(serverUrl, hostname, data) {

				try {
					var xmlhttp = new XMLHttpRequest();

					xmlhttp.open('POST', serverUrl, true);

					xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

					xmlhttp.onreadystatechange = function(e) {
						if (xmlhttp.readyState == 4) {
							if (xmlhttp.status == 200) {
								try {
									var res = JSON.parse(xmlhttp.responseText) || {};
									if (typeof res.apps != "undefined") {
										var response = {
											"response": JSON.parse(res.apps) || {},
											hostname: hostname
										}
										var data = {
											tabTechs: response
										}
										self.processResponse(data);
									} else {
										self.getSiteData();
									}
								} catch (e) {
									console.log(e);
									self.showContent();
								}
							} else {
								// Need to say server issue
								self.showServerErrorMessage(hostname);
							}
						}
					};
					xmlhttp.send('data=' + encodeURIComponent(JSON.stringify(data)));
				} catch (e) {
					self.showContent();
				}
			},
			showServerErrorMessage: function(hostname) {
				try {
					$('#current-site-name').text(hostname);
					var randomNumber = self.getRandomNumber(0, 4);
					if (randomNumber == 4) randomNumber = 3;
					var imgEl = $('<img>', {
						'src': "images/" + (randomNumber + 1) + ".png"
					});
					var imgDivEl = $('<div>', {
						'class': 'server-error-img-div'
					});
					$(imgDivEl).append($(imgEl));
					var msgEl = $('<div>', {
						'class': 'server-error-msg',
						'data-i18n': `serverError${randomNumber}`
					});
					$('.current-app-info').empty();
					//$('.current-app-info').addClass("newtab-text");
					$('.current-app-info').append($(imgDivEl)).append($(msgEl));
					self.showContent();
					this.adjustIframeHeight();
				} catch (e) {
					console.log(e);
				}

			},
			getServerErrorMessages: function(number) {
				var messages = [];
				messages.push("Uh oh! Caught in the act 🙈  &nbsp;We've been secretly doing a server upgrade. Leave us alone for a few minutes, will you?");
				messages.push("What runs WhatRuns is going through a server maintenance 💁‍♀️ &nbsp;Can you try again in a minute or two?");
				messages.push("We believe you are addicted to WhatRuns 🤒  &nbsp;We care about your health and we want to give you a few hours of break. Please check back later. (Seriously? Server upgrade). ");
				messages.push("Give it a rest! 😾 <br/> Just joking. Our bad. We’re updating services that is required to keep this supercool extension running.");
				return (typeof messages[number] === "undefined") ? messages[0] : messages[number];
			},
			getRandomNumber: function(lower, upper) {
				try {
					return Math.floor(Math.random() * upper) + lower;
				} catch (e) {
					console.log(e);
				}
				return 0;

			},
			getSiteData: function() {
				try {
					var sendMessage = function(tabs) {
						BROWSER.runtime.sendMessage({
							id: GET_SITE_DATA,
							tab: tabs[0]
						}, function(res) {
							if (typeof res.data != "undefined" && res.data != null) {
								self.analyseSiteData(res.data);
							} else {
								self.setNoAppsFoundText();
							}
						});
					};
				} catch (e) {

				}
				self.tabQuery(sendMessage);
			},
			/**
			 * This function is used to get the site data without any checks.
			 * It is used when the user clicks on the icon in the popup
			 * @returns {void}
			 */
			getSiteDataWoChecks: function() {
				try {
					var sendMessage = function(tabs) {
						BROWSER.runtime.sendMessage({
							id: GET_SITE_DATA,
							tab: tabs[0]
						}, function(res) {
							self.analyseSiteData(res.data);
						});
					};
				} catch (e) {
					console.log("Error [getSiteDataWoChecks]: ", e);
				}
				self.tabQuery(sendMessage);
			},
			analyseSiteData: function(data) {

				try {
					if (typeof data.hostname != "undefined") currentHostName = data.hostname;
					if (typeof data.subdomain != "undefined") {
						currentHostName = data.rawhostname;
					}

					var xmlhttp = new XMLHttpRequest();

					xmlhttp.open('POST', GET_SITE_APPS_BY_DATA, true);

					xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

					xmlhttp.onreadystatechange = function(e) {
						if (xmlhttp.readyState == 4) {
							if (xmlhttp.status == 200) {
								try {
									var response = xmlhttp.responseText,
										res = {};
									if (typeof response != "object") var res = JSON.parse(response) || {};
									else res = response;
									if (typeof res.apps != "undefined") {
										var newFormat = {
											"response": JSON.parse(res.apps) || {},
											hostname: data.hostname
										}
										Object.keys(data).forEach(function(key) {
											newFormat[key] = data[key];
										});
										if (typeof data.subdomain != "undefined") newFormat.hostname = data.rawhostname;
										var finalData = {
											tabTechs: newFormat
										}
										self.processResponse(finalData);
									} else {
										self.setNoAppsFoundText(data);
									}
								} catch (e) {
									console.log(e);
									self.setNoAppsFoundText(data);
								}
							} else {
								self.showServerErrorMessage(currentHostName);
							}
						}
					};
					xmlhttp.send('data=' + encodeURIComponent(JSON.stringify(data)));
				} catch (e) {
					console.log(e);
					self.showContent();
				}
			},
			setNoAppsFoundText: function(data) {

				try {
					self.removeAppsDiv();
					$('.current-app-info').addClass("newtab-text");
					$('.current-app-info').text(NO_APPS_FOUND);
					$('.user-follow, .share-url').removeClass("active");
					var response = {
						hostname: data?.hostname
					}
					var newData = {
						tabTechs: response
					}
					self.processResponse(newData);
				} catch (e) {
					console.log(e);
				}
			},
			processResponse: async function(res) {
				try {
					currentHostName = self.getCurrentHostName(res);

					if (currentHostName.length > 24) currentHostName = currentHostName.substring(0, 21) + "..";
					$(siteEl).text(currentHostName);
					await popup.displayApps(res, self);
					self.showContent();

				} catch (e) {
					console.log(e);
				}
			},
			ucFirstAllWords: function(str) {
				var pieces = str.split(" ");
				for (var i = 0; i < pieces.length; i++) {
					var j = pieces[i].charAt(0).toUpperCase();
					pieces[i] = j + pieces[i].substr(1).toLowerCase();
				}
				return pieces.join(" ");
			},
			getCurrentHostName: function(data) {
				try {
					if (typeof data.rawhostname != "undefined") return data.rawhostname;
					else if (typeof data.tabTechs.rawhostname != "undefined") return data.tabTechs.rawhostname;
					else if (typeof data.hostname != "undefined") return data.hostname;
					else if (typeof data.tabTechs.hostname != "undefined") return data.tabTechs.hostname;
				} catch (e) {
					console.log(e);
				}
				return "";
			},
			showContent: function() {
				$('.loading').hide();
				$('.content').addClass("slideDown");
				// $('.share-url-header-icon').attr("title", "Share what runs " + currentHostName);
				$('.share-url-header-icon').attr("title", "Share");
				$('.footer').addClass("active")

				if (currentHostName.trim().length <= 0) {
					$('.user-follow, .share-url-header-icon').hide();
					$('.current-app-info').addClass("newtab-text");
					$('.current-app-info').text("We couldn't grab any data, please refresh the page.");
				}
			},
			showInvalidAddressContent: function() {
				try {
					$('.content').addClass("slideDown");
					$('.current-app-info').addClass("newtab-text invalid-domain");
					$('.current-app-info').text("Please enter a valid domain name or IP address on your browser address bar.");
					$('.user-follow, .share-url').removeClass("active")

				} catch (e) {}
			},
			displayApps: async function(response, self) {
				try {
					detectedApps = response.tabTechs.response;
					var endDisplayFramework = {};
					var list = 0;
					for (var time in detectedApps) {
						var apps = detectedApps[time];
						let categs = Object.keys(apps)
						const order = ['eCommerce', 'CMS'];
						categs = categs.sort((a, b) => order.indexOf(b) - order.indexOf(a));
						for (const categoryName of categs) {
							var el = oddEl;
							if (list % 2 == 0) el = evenEl;
							var categoryClass = self.getCategoryClass(categoryName);
							if (categoryClass == "javascriptframeworks") {
								endDisplayFramework[categoryName] = apps[categoryName];
								continue;
								// return true;
							}
							await self.appendAppDiv(el, categoryName, apps[categoryName], categoryClass);
							list++;
						}
					}
					if (Object.keys(endDisplayFramework).length > 0) {
						var el = oddEl;
						if (list % 2 == 0) el = evenEl;
						let endFrameWorks = Object.keys(endDisplayFramework)
						for (const categoryName of endFrameWorks) {
							var categoryClass = self.getCategoryClass(categoryName);
							await self.appendAppDiv(el, categoryName, endDisplayFramework[categoryName], categoryClass);
						}
					}

					if (typeof response.tabTechs.fontFamily != "undefined") {
						var fontFamily = response.tabTechs.fontFamily.replace(/"/g, '');
						var font = fontFamily.split(",")[0];
						font = self.ucFirstAllWords(font.replace(/[-_]/gi, ' ').toString());
						fontFamily = self.ucFirstAllWords(fontFamily.replace(/[-_]/gi, ' ').toString());
						fontFamily = fontFamily.split(',').join(', ');
						try {
							$(oddEl).append(
								$('<div>', {
									"class": "techs-list"
								})
								.append(
									$('<div>', {
										"class": "category-name-wrap"
									}).append(
										$("<div>",{
											"class": "category-name"
										}).text("Font")
									)
								)
								.append(
									$('<div>', {
										"class": "border"
									})
								)
								.append(
									$('<div>', {
										"class": "current-tech-info sub-element capitalize"
									})
									.append(
										$('<span>', {
											"class": "label label-default"
										}).text("Font")
									)
									.append(
										$('<span>', {
											"class": "themes-list"
										}).text(font)
									)
								)
								.append(
									$('<div>', {
										"class": "current-tech-info sub-element capitalize"
									})
									.append(
										$('<span>', {
											"class": "label label-default"
										}).text("Font Family")
									)
									.append(
										$('<span>', {
											"class": "themes-list"
										}).text(fontFamily)
									)
								)
							);

						} catch (e) {
							console.log(e);
						}
					} else if (list <= 0) {
						self.removeAppsDiv();
						this.adjustIframeHeight();
						$(techInfoEl).append(
							$('<div>', {
								"class": "techs-list text-center no-apps"
							})
							.append($('<div>', {
								"class": "category-name no-apps"
							})).text(NO_APPS_FOUND)
						);
					}
					this.adjustIframeHeight();
				} catch (e) {

				}
				self.showSubElement();
			},
			appendAppDiv: async function(el, categoryName, appsArr, categoryClass) {
				const filteredApps = appsArr.filter(app => !app.parentElement); 
				const wrapEl = $('<div>', { class: 'category-wrapper' }).appendTo(el);
				$(wrapEl).append(
					$('<div>', {
						"class": "techs-list " + categoryClass
					})
					.append(
						$('<div>', { class: 'category-name-wrap' }).append([
							$('<div>', {
								class: 'category-name',
								'data-i18n': categoryName.replace(/\s+/g, '')
							})
						])
					)
					.append($('<div>', {
						"class": "border"
					}))
				);
				try {
					// keep wordpress and shopify at the end of the list
					if (appsArr.length > 0) {
						appsArr.sort((a, b) => {
							if (a.name === "WordPress") return 1;   // move 'a' down
							if (b.name === "WordPress") return -1;  // move 'b' down
							if (a.name === "Shopify") return 1;   // move 'a' down
							if (b.name === "Shopify") return -1;  // move 'b' down
							return 0; // keep original order otherwise
						});
					}
					var arr = appsArr;
					var themes = '',
						plugins = '';
					var techListEl = '';
					var length = 0;
					var techsListArr = [],
						isWordPressDisabled = false;

					function handleImageError(img, categoryName) {
						let imageUrl = "images/default-generic.svg"
						const categMap = {
							"web": { icon: "default-web.svg", categs: ["AI and Machine Learning", "Website Optimization", "No Code Platforms", "Blogs", "Message Board", "Wiki", "Comments and Reviews", "Chat Widgets", "Communication", "Video", "Gallery", "UI and Graphics", "Rich Text Editors", "Fonts", "Maps", "Programming Language", "Dev Tools", "Build CI Systems", "Control Systems", "Security", "Captcha", "Browser Fingerprinting", "Cookie and Consent", "Hosting", "CDN", "Cloud Storage", "Cache", "Network Device", "Media Server", "Remote Access", "Database", "Databases", "Network Storage", "Web Framework", "HTML Framework", "Web Server", "Web Server Extensions"]},
							"javascript": { icon: "default-js.svg", categs:["Javascript Libraries"]},
							"cms": { icon: "default-cms.svg", categs:["Document Management Systems", "CMS", "Page Builders", "Website Builder"]},
							"analytics": { icon: "default-analytics.svg", categs:["Analytics", "Monitoring", "Tag Managers"]},
							"ads": { icon: "default-ads.svg", categs:["Sales and Marketing", "Affiliate Marketing", "Affiliate Networks", "Advertising"]},
							"sales": { icon: "default-sales.svg", categs:["CRM", "Finance and Accounting", "LMS", "Booking Management", "Logistics"]},
							"generic": { icon: "default-generic.svg", categs:["Operating System", "Search Engine", "Web Mail", "Printers", "Webcams", "Miscellaneous", "Status Pages"]},
						}
						let fillColors = [
							"#10B981", "#BF8FFF", "#1C76DE", "#82B2FF", "#9257A2", "#5B58FF", "#FF2E48",
							"#FF4406", "#89E3FF", "#FAA04C", "#E16565", "#F3E050", "#FFCD00", "#00D28C"
						]
						let mainCategs = Object.keys(categMap);
						for (const main of mainCategs) {
							let categObj = categMap[main]
							if (categObj.categs.includes(categoryName.trim())) {
								imageUrl = `images/${categObj.icon}`;
								break
							}
						}
						fetch(imageUrl) // Load the SVG file
							.then(response => response.text())
							.then(svg => {
							const parser = new DOMParser();
							const doc = parser.parseFromString(svg, 'image/svg+xml');
							const rect = doc.querySelector('rect');
							let randFillClr = fillColors[Math.floor(Math.random() * fillColors.length)]
							if (rect) {
								rect.setAttribute('fill', randFillClr); // Change color dynamically
							}
							const updatedSvg = new XMLSerializer().serializeToString(doc);
							img.src = `data:image/svg+xml;base64,${btoa(updatedSvg)}`;
							});
					}

					for (var i in arr) {
						length = arr.length;
						var techJson = arr[i];
						let imageUrl = CDN_DOMAIN_NAME + "imgs/" + techJson.icon;
						if (typeof techJson.parentElement == "undefined") {
							if (techJson.enabled == "false") {
								if (techJson.name.toLowerCase() == "wordpress") isWordPressDisabled = true;
								if (length <= 1) $(el).find('.' + categoryClass).remove();
								continue;
							} else {
								techsListArr.push(techJson.name);
							}
							var href = "#";
							if (typeof techJson.website != "undefined") {
								href = techJson.website;
								try {
									const websiteUrl = new URL(techJson.website);
									let techDomain = websiteUrl.searchParams.get("target");
									techDomain = decodeURIComponent(techDomain).replace("http://", "");
									techDomain = techDomain.replace("https://", "");
									websiteUrl.searchParams.set("target", encodeURIComponent(techDomain));
									href = websiteUrl.toString();
								} catch(_) {}
							}
							var siteListUrl = "#";
							if (typeof techJson.siteListUrl != "undefined") {
								siteListUrl = techJson.siteListUrl;
							}
							var techName = techJson.name + " ";
							if (typeof techJson.version !== "undefined") techName += techJson.version;
							techListEl = $('<div>', {
								"class": "current-tech-info"
							}).append(
								$("<div>",{
									"class": "current-tech-info-title"
								}).append(
									$('<img>', {
										"class": "icon",
										"src": imageUrl,
									}).on('error', function() {
										handleImageError(this, categoryName.trim());
									})
								).append(
									$('<div>', {
										"class": "tech-name",
										"data-toggle": "tooltip",
										"data-placement": "top",
										"title": `${techName}`
									}).text(techName)
								)
							)
							.append(
								$('<div>',{
									"class": "current-tech-info-icon"
								}).append(
									$('<a>', {
										"href": siteListUrl,
										"target": "_blank",
										"class": "techs-list-url",
										"data-toggle": "tooltip",
										"data-placement": "bottom",
										"title": "Know More"
									})
									.append($(`<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11" fill="none">
									<path d="M5.77344 4.88761L9.41788 1.24316" stroke="#0A0A0A" stroke-width="0.992593" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M9.77396 3.02103V0.887695H7.64062" stroke="#0A0A0A" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M4.88281 0.887695H3.99392C1.7717 0.887695 0.882812 1.77658 0.882812 3.99881V6.66547C0.882812 8.88769 1.7717 9.77658 3.99392 9.77658H6.66059C8.88281 9.77658 9.7717 8.88769 9.7717 6.66547V5.77658" stroke="#0A0A0A" stroke-width="0.992593" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>`
									))
								).append(
									$('<a>', {
										"href": href,
										"target": "_blank",
										"class": "original-site",
										"data-toggle": "tooltip",
										"data-placement": "bottom",
										"title": "Website"
									})
									.append($(`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
									<path d="M6 11C8.75 11 11 8.75 11 6C11 3.25 8.75 1 6 1C3.25 1 1 3.25 1 6C1 8.75 3.25 11 6 11Z" stroke="#0A0A0A" stroke-width="1.06667" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M6 4V6.5" stroke="#0A0A0A" stroke-width="1.06667" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M5.99219 8H5.99668" stroke="#0A0A0A" stroke-width="1.06667" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>`))
								)
							)
						} else {
							if (typeof techJson.theme !== "undefined" && techJson.theme == true) 
								themes += self.capitalizeFirstLetter(techJson.name) + ", ";
							else if (typeof techJson.plugin !== "undefined") 
								plugins += self.capitalizeFirstLetter(techJson.name) + ", ";
						}
						$(wrapEl).append($(techListEl));
					}
					if(filteredApps.length > 4) {
						const visibleCount = 4;
						const hiddenCount = filteredApps.length - visibleCount;

						$(wrapEl).find('.current-tech-info').slice(visibleCount).hide();

						const toggle = $("<div>", {"class": "show-tech"}).append([
							$(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" viewBox="0 0 10 6" fill="none">
								<path d="M0.664062 0.666992L4.66406 4.66699L8.66406 0.666992" stroke="#A1A1A1" style="stroke:#A1A1A1;stroke:color(display-p3 0.6315 0.6315 0.6315);stroke-opacity:1;" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>`),
							$("<p>").text(`Show ${hiddenCount} more`)
						])

						$(wrapEl).append(toggle)

						toggle.on("click", function () {
							const isExpanded = $(this).hasClass("expanded");
							if (isExpanded) {
								$(wrapEl).find('.current-tech-info').slice(visibleCount).slideUp(200);
								$(this).removeClass("expanded");
								$(this).find("p").text(`Show ${hiddenCount} more`);
								$(this).find("svg").css({ transform: "rotate(0deg)" });
							} else {
								$(wrapEl).find('.current-tech-info').slice(visibleCount).slideDown(200);
								$(this).addClass("expanded");
								$(this).find("p").text("Show less");
								$(this).find("svg").css({ transform: "rotate(180deg)" });
							}
						});
					}
					if (techsListArr.length <= 0) {
						$(el).find('.' + categoryClass).remove();
					}
					if (!isWordPressDisabled) {
						if (themes.split(",").length > 1) {
							$(el).append(
								$('<div>', {
									"class": "current-tech-info sub-element"
								})
								.append(
									$('<span>', {
										"class": "label label-default"
									}).text("Theme")
								)
								.append(
									$('<span>', {
										"class": "themes-list break-word"
									}).text(self.removeLastComma(themes))
								)
							);
						}
						if (plugins.split(",").length > 1) {
							$(el).append(
								$('<div>', {
									"class": "current-tech-info sub-element"
								})
								.append(
									$('<span>', {
										"class": "label label-default"
									}).text("Plugins")
								)
								.append(
									$('<span>', {
										"class": "plugins-list break-word"
									}).text(self.removeLastComma(plugins))
								)
							);
						}
					}
				} catch (e) {
					console.log(e);
				}

			},
			getCategoryClass: function(categoryName) {
				try {
					return categoryName.replace(/[^0-9a-zA-Z]/gi, '').toLowerCase();
				} catch (e) {
					console.log(e);
				}
				return '';
			},
			removeAppsDiv: function() {
				try {
					$(oddEl).remove();
					$(evenEl).remove();
				} catch (e) {
					console.log(e);
				}
			},
			beautifyName: function(name) {
				try {
					return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
				} catch (e) {}
				return name;
			},
			capitalizeFirstLetter: function(str) {
				try {
					return str.replace(/\w\S*/g, function(txt) {
						return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
					});
				} catch (e) {
					console.log(e);
				}
				return str;
			},
			removeLastComma: function(str) {
				try {
					return str.replace(/,\s*$/, "");
				} catch (e) {
					console.log(e);
				}
				return str;
			},
			getNoAppDetectedMsg: function() {
				return '<div class="empty">' + chrome.i18n.getMessage('noScriptsDetected') + '</div>';
			},
			getDefaultMsg: function() {
				return '<div class="empty">' + chrome.i18n.getMessage('defaultMsg') + '</div>';
			},
			showSubElement: function() {
				try {
					var techListArr = document.getElementsByClassName("techs-list");
					for (var i = 0; i < techListArr.length; i++) {
						techListArr[i].onclick = function() {
							var element = this.querySelectorAll('.sub-element');
							for (var j = 0; j < element.length; j++) {
								element[j].className += ' active';
							}
						}
					}
				} catch (e) {}
			},
			emptyScriptsListEl: function() {
				scriptsListEl.innerHTML = '';
			}
		}
		popup.init();
	});
}());