$(function () {
	$('ul li').click(function () {
		var height = $(this).attr('height');
		var width = $(this).attr('width');

		chrome.tabs.query({
			active: true,
		}).then(tabs => {
			const tab = tabs[0];
			if (!tab) { return; }

			var url = tab.url;
			var title = tab.title;

			if (!url || !title) { return; }

			window.open(url, title, "menubar=1,resizable=1,width=" + width + ",height=" + height + "");
		});
	});
});