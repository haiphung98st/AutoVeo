var INITIATE_DATA_SDK = "initiateDataSDK";
var PROCESS_DATA_SDK_CAPTIFY = "processDataSDKCaptify";
var PROCESS_DATA_SDK = "processDataSDK";
var SEND_DATA_SDK = "sendDataFromSDK";
var SEND_CHECKOUT_DATA_SDK = "sendCheckoutDataFromSDK";
var SEND_PROMPT_DATA_SDK = "sendPromptDataFromSDK";
var BROWSER = (chrome || browser);
(function() {
	var dataSDK = {
    self: '',
    pollInterval: 8000,
    pollTimeout: 30000,
		init: function() {
      self = dataSDK;
       // 8 seconds
			this.addEventListener();
		},
		addEventListener: function() {
      this.initiateGrabPageData();
      // Listen for messages from the background script
      chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        // Access the data sent from the background script
        const { id, data } = message;
        if (id === PROCESS_DATA_SDK_CAPTIFY) {
          self.processDataAndSendCaptify(data).then(() => sendResponse({ success: true }));
          return true;
        } else if (id === PROCESS_DATA_SDK) {
          self.processDataAndSend(data).then(() => sendResponse({ success: true }));
          return true;
        }
      });
    },
    processDataAndSend: async function(params) {
      try {
        const pagePath = window.location.href;
        const { matchPage, doms: domFields = [], isPromptDom  =false } = params;
        // check if the page is a prompt dom
        if (isPromptDom === true) return self.processPromptDataAndSend(params)
        const domData = [
          { name: "title", value: document ? document.title : "" },
          { name: "referrer", value: document ? document.referrer : "" },
          { name: "language", value: navigator ? navigator.language : "" },
        ]
        for (const dom of domFields) {
          if (dom.is_parent === true) {
            let dataToPush = this.getXpathElementForChildDoms(dom);
            domData.push({ name: dom?.slug, child_data: dataToPush })
          } else {
            let matchingString = ""
            if (dom.source === "dom") {
              if(dom.collect_all_matches===true){
                matchingString=this.getAllElementValues(dom);
              } else if(dom.collect_html===true){
                matchingString=this.getElementHTML(dom,dom.collect_all_matches);
              } else {
                matchingString=this.getElementStringValue(dom);
              }
            }
            else if (dom.source === "url") {
              const newRegex = new RegExp(dom?.regex);
              const match = pagePath.match(newRegex);
              if (match) matchingString = match[1];
            }
            // prepare data
            if (matchingString) domData.push({ name: dom?.slug, value: matchingString })
          }
        }
        // prepare page data
        const pageData = { 
          entry_type: matchPage, 
          url: pagePath, 
          data: domData,
          uuid: await this.getUUID(), // generate uuid for installation and send
          plugin_version: chrome.runtime.getManifest().version
        }
        var message = { id: SEND_CHECKOUT_DATA_SDK, data: pageData };
        this.sendMessageToChrome(message, response => { });
      } catch (error) {
        console.log(error)
      }
    },
    processDataAndSendCaptify: async function() {
      try {
        const pagePath = window.location.href;
        const pageData = { 
          url: pagePath, 
          title: document ? document.title : "",
          referrer: document.referrer || "",
          uuid: await this.getUUID(), // generate uuid for installation and send
          plugin_version: chrome.runtime.getManifest().version
        }
        var message = { id: SEND_DATA_SDK, data: pageData };
        this.sendMessageToChrome(message, response => { });
      } catch (error) {
        console.log(error)
      }
    },
    debounceInputChange(input, callback, delay = this.pollInterval) {
      if (!input) return;
      let timeoutId;
      input.addEventListener("keydown", (t) => {
        if (t.key === "Enter") {
          callback(); // if enter is pressed, call the callback immediately
          if (timeoutId) clearInterval(timeoutId);
          timeoutId = setInterval(() => {
            callback();
          }, delay);
          // Stop the interval after 20 seconds
          setTimeout(() => {
            clearInterval(timeoutId);
          }, this.pollTimeout);
        }
      });
    },
    debounceSubmitClick(submit, callback, delay = this.pollInterval) {
      if (!submit) return;
      let timeoutId;
      submit.addEventListener("click", () => {
        if (timeoutId) clearInterval(timeoutId);
        timeoutId = setInterval(() => {
          callback();
        }, delay);
        // Stop the interval after 20 seconds
        setTimeout(() => {
          clearInterval(timeoutId);
        }, this.pollTimeout);
      });
    },
    collectPromptAndSend: async function(params) {
      const pagePath = window.location.href;
      const { matchPage, doms: domFields = [], promptVendor } = params;
      const domData = [
        { name: "title", value: document ? document.title : "" },
        { name: "referrer", value: document ? document.referrer : "" },
        { name: "language", value: navigator ? navigator.language : "" },
      ]
      for (const dom of domFields) {
        if (dom.is_parent === true) {
          let dataToPush = this.getXpathElementForChildDoms(dom);
          domData.push({ name: dom?.slug, child_data: dataToPush })
        } else {
          let matchingString = ""
          if (dom.source === "dom") {
            if(dom.collect_all_matches===true){
              matchingString=this.getAllElementValues(dom);
            } else if(dom.collect_html===true){
              matchingString=this.getElementHTML(dom,dom.collect_all_matches);
            } else {
              matchingString=this.getElementStringValue(dom);
            }
          }
          else if (dom.source === "url") {
            const newRegex = new RegExp(dom?.regex);
            const match = pagePath.match(newRegex);
            if (match) matchingString = match[1];
          }
          // prepare data
          if (matchingString) domData.push({ name: dom?.slug, value: matchingString })
        }
      }
      // prepare page data
      const pageData = {
        entry_type: matchPage,
        vendor: promptVendor,
        url: pagePath, 
        data: domData,
        uuid: await this.getUUID(), // generate uuid for installation and send
        plugin_version: chrome.runtime.getManifest().version
      }
      var message = { id: SEND_PROMPT_DATA_SDK, data: pageData };
      this.sendMessageToChrome(message, response => { });
    },
    processPromptDataAndSend: async function(params) {
      try {        
        // check for input dom
        const { doms: domFields = [] } = params;
        let inputDom = domFields.find(dom => dom.slug === "input");
        let submitBtnDom = domFields.find(dom => dom.slug === "submit_button");
        // observe input and submit button
        if (inputDom) {
          let inputElement = this.getXpathElement(inputDom.xpath);
          console.log("inputElement: ", inputElement)
          if (inputElement) {
            self.debounceInputChange(inputElement, () => {
              self.collectPromptAndSend(params)
            });
          }
        }
        if (submitBtnDom) {
          let submitElement = this.getXpathElement(submitBtnDom.xpath);
          if (submitElement) {
            self.debounceSubmitClick(submitElement, () => {
              self.collectPromptAndSend(params)
            });
          }
        }
      } catch (error) {
        console.log(error)
      }
    },
    getElementStringValue: function (obj, sourceNode = null) {
      var val = null;
      try {
        if (obj.extract_text === true) {
          if (obj.xpath) val = this.getElementTextValue(obj.xpath, sourceNode);
        } else if (obj.xpath) {
          var el = this.getXpathElement(obj.xpath, sourceNode);
          if (el) {
            if (obj.attribute) val = el.getAttribute(obj.attribute);
            else val = this.getElementValue($(el));
          } else if (obj.attr_source === "parent" && sourceNode && sourceNode.getAttribute) {
            val = sourceNode.getAttribute(obj.attribute)
          }
        } else if (obj.element) {
          if (obj.attribute) val = $(obj.element).attr(obj.attribute);
          else val = this.getElementValue($(obj.element));
        }
        // check for value map before returning
        val = val ? val.trim() : null;
        if (obj.value_map && obj.value_map.length > 0) {
          let fromObj = obj.value_map.find(item => item.from === val);
          if (fromObj && fromObj.to) val = fromObj.to;
        }
      } catch (e) {
        console.log(e);
      }
      return val;
    },
    getElementTextValue: function (str, sourceNode = null) {
      let fullText = '';
      try {
        if (sourceNode !== null && !str.startsWith(".") && !str.startsWith("(")) {
          str = "." + str; // only prepend . for relative xpaths
        }
        let query = document.evaluate(
          str,
          sourceNode || document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        for (let i = 0; i < query.snapshotLength; i++) {
          fullText += query.snapshotItem(i).textContent;
        }
      } catch (e) {
        console.log(e);
      }
      return fullText;
    },
    getXpathElement: function (str, sourceNode) {
      try {
        if (sourceNode !== null && !str.startsWith(".") && !str.startsWith("(")) {
          str = "." + str; // only prepend . for relative xpaths
        }
        let query = document.evaluate(
          str,
          sourceNode || document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        let results = [];
        for (let i = 0, length = query.snapshotLength; i < length; ++i) {
          results.push(query.snapshotItem(i));
        }
        return results.length > 0 ? results[0] : null;
      } catch (e) {
        console.log(e);
      }
      return null;
    },
    getElementValue: function (el) {
      let val = null;
      try {
        val = el.__proto__.constructor === window.HTMLInputElement
          ? el.val().trim()
          : el.text().trim();
      } catch (e) {
        console.log(e);
      }
      return val;
    },
    getXpathElementForChildDoms: function (dom) {
      let childData = []
      try {
        let query = document.evaluate(
          dom.xpath,
          null || document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        for (let i = 0, length = query.snapshotLength; i < length; ++i) {
          let sourceNode = query.snapshotItem(i);
          if (sourceNode) {
            let childItems = {}
            for (const childDom of dom.child_doms) {
              let matchingString;
              if (childDom.collect_all_matches === true) {
                matchingString = this.getAllElementValues(childDom, sourceNode);
              } else if (childDom.collect_html === true) {
                matchingString = this.getElementHTML(childDom, childDom.collect_all_matches, sourceNode);
              } else {
                matchingString = this.getElementStringValue(childDom, sourceNode);
              }
              childItems[childDom?.slug || "key"] = matchingString;
            }
            childData.push(childItems)
          }
        }
      } catch (e) {
        console.log(e);
      }
      return childData;
    },
    getAllElementValues: function (obj, sourceNode = null) {
      let values = [];
      try {
        if (!obj.xpath) return values;
        let str = obj.xpath;
        if (sourceNode !== null && !str.startsWith(".") && !str.startsWith("("))
          str = "." + str; // only prepend . for relative xpaths
        let query = document.evaluate(
          str,
          sourceNode || document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        for (let i = 0; i < query.snapshotLength; i++) {
          const node = query.snapshotItem(i);
          if (!node) continue;
          let val = "";
          if (obj.extract_text === true) val = node.textContent || "";
          else if (obj.attribute) val = node.getAttribute(obj.attribute);
          else val = this.getElementValue($(node));
          val = val ? val.trim() : "";
          if (val) values.push(val);
        }
      } catch (e) {
        console.log(e);
      }
      // set limit to 100 values
      return values && values.length > 100 ? values.slice(0, 100) : values;
    },
    getElementHTML: function (obj, collectAll = false, sourceNode = null) {
      let result = null;
      try {
        if (!obj.xpath) return null;
        let str = obj.xpath;
        if (sourceNode !== null && !str.startsWith(".") && !str.startsWith("("))
          str = "." + str; // only prepend . for relative xpaths
        let query = document.evaluate(
          str,
          sourceNode || document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        if (collectAll === true) {
          let htmls = [];
          for (let i = 0; i < query.snapshotLength; i++) {
            const node = query.snapshotItem(i);
            if (node && node.outerHTML) htmls.push(node.outerHTML);
          }
          result = htmls;
        } else {
          let node = query.snapshotItem(0);
          if (node && node.outerHTML) result = node.outerHTML;
        }
      } catch (e) {
        console.log(e);
      }
      return result;
    },
    initiateGrabPageData: async function() {
      try {
        var message = { id: INITIATE_DATA_SDK };
        let __self = this;
        setTimeout(function () {
          __self.sendMessageToChrome(message, response => {});
        }, 2000);
      } catch (error) {
        console.log("data_sdk [initiateGrabPageData] error: ", error);
      }
    },
    sendMessageToChrome: function (message, callback) {
      BROWSER.runtime.sendMessage(message, function (response) {
        if (callback) callback(response);
      });
    },
    setLocalStorageItem: function(key, value) {
      return BROWSER.storage.local.set({[key]: value});
    },
    getLocalStorageItem: function(key) {
      return new Promise((resolve) => {
        return BROWSER.storage.local.get(key, data => {
          return resolve(data[key]||null);
        });
      });
    },
    getUUID: async function() {
      let uuid = await this.getLocalStorageItem("wrs_session_uuid");
      if (uuid) return uuid
      let newUUID = this.generateUUID();
      this.setLocalStorageItem("wrs_session_uuid", newUUID);
      return newUUID
    },
    generateUUID: function () {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
  
      array[6] = (array[6] & 0x0f) | 0x40;
      array[8] = (array[8] & 0x3f) | 0x80;
  
      return [...array].map((b, i) => 
        (i === 4 || i === 6 || i === 8 || i === 10 ? '' : '') + b.toString(16).padStart(2, '0')
      ).join('');
    }
	}
  dataSDK.init();
}());
