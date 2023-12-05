'use strict';
const { PageInterface } = require('../../../interface/modus/page_interface');
const Util = require('../../../../provider/util')

class Page extends PageInterface {
    browser
    options = {}

    async init(browser,options) {
        this.activePage = null;
        this.options = options
        this.browser = browser
        this.browser.on('targetchanged', async (target) => {
            this.stopFindActivePage()
            const page = await target.page();
            if (page && target.type() === 'page') {
                // let url = await page.mainFrame().url();
                page.on('focus', async () => {
                    this.activePage = page;
                });
            }
        });
        this.browser.on('targetdestroyed', async (target) => {
            this.findActivePage()
        });
        this.browser.on('close', async (target) => {
            this.findActivePage()
        });
        this.browser.on('targetcreated', async (target) => {
            this.stopFindActivePage()
            const page = await target.page();
            if (page && target.type() === 'page') {
                this.activePage = page;
            }
        });

        const methods = Object.getOwnPropertyNames(Page.prototype)
            .filter(name => typeof Page.prototype[name] === 'function' && name !== 'constructor');
        // console.log('Methods:', methods);
        console.log('Total Page of methods:', methods.length);
        return this.getPages()
    }

    async createPage(conf = {}) {
        this.options = Util.json.deepUpdate(this.options, conf)
        const page = await this.browser.newPage();
        await this.browser.newPage();
        return page
    }

    async openOnly(url, options = {}) {
        this.options = Util.json.deepUpdate(this.options, options)
        const urlStrict = options.urlStrict !== undefined ? options.urlStrict : this.options.urlStrict
        const pageIndex = await this.findNormalizedUrlIndex(url, urlStrict);
        if (pageIndex !== -1) {
            await this.switchToPageByIndex(pageIndex);
        } else {
            await this.toPage(url);
        }
    }

    async open(url, options = {}) {
        this.options = Util.json.deepUpdate(this.options, options)
        const {
            only = true,
        } = this.options;
        let page
        if (only) {
            console.log(`openOnly`, url)
            page = await this.openOnly(url, options)
        } else {
            console.log(`toPage`, url)
            page = await this.toPage(url, options)
        }
        return page
    }

    async redirect(url, options = { urlStrict: true, only: false }) {
        await this.redirectOnly(url, options);
    }

    async redirectOnly(url, options = { urlStrict: true, only: true }) {
        const mainUrl = await this.getCurrentUrl()
        url = Util.url.joinPathname(mainUrl, url)
        console.log(`redirectOnly-url`, url)
        console.log(`options.only`, options.only)
        if (options.only) {
            await this.switchOnly(url, options);
            // const pageIndex = await this.findNormalizedUrlIndex(url, options.urlStrict);

            // console.log(`redirectOnly-pageIndex`,pageIndex)
            // if (pageIndex !== -1) {
            //     await this.switchToPageByIndex(pageIndex);
            // } else {
            //     await this.toPage(url);
            // }
        } else {
            await this.switch(url, options);
        }
    }

    async toPage(url, options = {}) {
        this.options = Util.json.deepUpdate(this.options, options)
        const {
            waitForComplete = true,
            timeout = 120000,
            logging = false,
            showImages = false,
            showStyle = true,
        } = this.options;
        let page;
        const blankPageIndex = await this.findBlankPageIndex();
        const pages = await this.browser.pages();
        if (blankPageIndex !== -1) {
            console.log(`toPage is the old page`)
            page = pages[blankPageIndex];
        } else {
            console.log(`toPage is the new page`, url)
            console.log(url)
            page = await this.createPage(options);
            await this.interceptPageRequests(page, showImages, showStyle)
            await this.setDownloadDirectory(page)
        }
        if (!waitForComplete) {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
        } else {
            await page.goto(url, { timeout });
        }
        if (logging) {
            const client = await page.target().createCDPSession();
            await client.send('Network.enable');
            client.on('Network.responseReceived', async ({ response }) => {
                console.log(`Received ${response.url} ${response.status} ${response.statusText}`);
            });
        }
    }

    async setDownloadDirectory(page) {
        try {
            const defaultDownloadPath = Util.file.getDefaultDownloadPath();
            if (page && page._client && typeof page._client.send === 'function') {
                await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: defaultDownloadPath });
            } else {
                console.error('Page or page._client or page._client.send is not properly defined.');
            }
        } catch (error) {
            console.error('Error setting download directory:', error);
        }
    }

    async interceptPageRequests(page, showImages, showStyle) {
        const skipResourceType = []
        if (showImages) {
            skipResourceType.push('image')
        }
        if (showStyle) {
            skipResourceType.push('stylesheet')
            skipResourceType.push('font')
        }

        const shouldInterceptRequest = (resourceType) => {
            return skipResourceType.includes(resourceType);
        };

        if (!showImages || !showStyle) {
            await page.setRequestInterception(true);
        }

        page.on('request', (request) => {
            if (shouldInterceptRequest(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });
    }

    async setUserAgent(userAgent, index = 0) {
        const page = this.getPages()[index]
        await page.setUserAgent(userAgent);
    }

    async switch(urlOrIndex) {
        if (typeof urlOrIndex === "number") {
            await this.switchToPageByIndex(urlOrIndex);
        } else if (typeof urlOrIndex === "string" && (urlOrIndex.startsWith('http://') || urlOrIndex.startsWith('https://'))) {
            await this.switchToPageByUrl(urlOrIndex);
        } else {
            console.log("Invalid argument. It should be either a URL or an index.");
        }
    }

    async getCurrentPageIndex() {
        const pages = await this.getPages();
        const current = await this.browser.page(); // 获取当前页面
        return pages.indexOf(current);
    }

    async getActivePage() {
        if (!this.activePage) {
            const pages = await this.getPages()
            this.activePage = pages[0]
        }
        return this.activePage;
    }

    async findActivePage(timeout = 30000) {
        if (this.findActivePageEvent) {
            return
        }
        // const activePage = pages.find(async (page) => {
        //     return page === (await this.browser.target().page());
        // });
        this.stopFindActivePageEvent = false
        this.findActivePageEvent = true
        let start = new Date().getTime();
        let index = 0
        while (new Date().getTime() - start < timeout && this.stopFindActivePageEvent) {
            const pages = await this.getPages();
            let arr = [];
            let pindex = 0
            for (const p of pages) {
                let visible = await p.evaluate(() => { return document.visibilityState == 'visible' })
                if (visible == true) {
                    arr.push(p);
                }
                pindex++
            }
            index++
            if (arr.length) {
                this.findActivePageEvent = false
                this.activePage = arr[0];
                return;
            }
        }
        this.findActivePageEvent = false
    }

    stopFindActivePage() {
        this.findActivePageEvent = false
        this.stopFindActivePageEvent = true
    }

    async getCurrentPage(page = null) {
        if (typeof page === 'number') {
            return await this.getPageByIndex(page);
        } else if (typeof page === 'string' && page.startsWith('http')) {
            return await this.findPageByUrl(page);
        } else {
            return await this.getActivePage();
        }
    }

    async getCookies() {
        const page = await this.getCurrentPage();
        const cookies = await page.cookies();
        return cookies;
    }

    async getLocalStorageData() {
        const page = await this.getCurrentPage();
        let localStorageData = {}
        try {
            localStorageData = await page.evaluate(() => {
                return JSON.parse(JSON.stringify(localStorage));
            });
        }catch(e){
            console.log(e)
        }
        return localStorageData;
    }

    async evaluate(fn, ...arg) {
        const page = await this.getCurrentPage();
        return page.evaluate(fn, arg)
    }

    async getSessionStorageData() {
        const page = await this.getCurrentPage();
        let sessionStorageData = {}
        try {
            sessionStorageData = await page.evaluate(() => {
                return JSON.parse(JSON.stringify(sessionStorage));
            });
        } catch (e) {
            console.log(e)
        }
        return sessionStorageData;
    }

    async getIndexedDBData(databaseName, objectStoreName) {
        const page = await this.getCurrentPage();
        const indexedDBData = await page.evaluate(async (db, store) => {
            return new Promise((resolve, reject) => {
                const dbRequest = indexedDB.open(db);
                dbRequest.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction([store], 'readonly');
                    const objectStore = transaction.objectStore(store);
                    const getAllRequest = objectStore.getAll();
                    getAllRequest.onsuccess = () => {
                        resolve(getAllRequest.result);
                    };
                };
                dbRequest.onerror = reject;
            });
        }, databaseName, objectStoreName);
        return indexedDBData;
    }

    async setCookies(cookies) {
        const page = await this.getCurrentPage();
        await page.setCookie(...cookies);
    }

    async clearCookies() {
        const page = await this.getCurrentPage();
        await page.deleteCookie();
    }

    async setLocalStorageData(data, claer = false) {
        const page = await this.getCurrentPage();
        if (claer) {
            await page.evaluate((data) => {
                localStorage.clear();
                for (const key in data) {
                    localStorage.setItem(key, data[key]);
                }
            }, data);
        } else {
            await page.evaluate((data) => {
                for (const key in data) {
                    localStorage.setItem(key, data[key]);
                }
            }, data);
        }
    }

    async setSessionStorageData(data, claer = false) {
        const page = await this.getCurrentPage();
        if (claer) {
            await page.evaluate((data) => {
                sessionStorage.clear();
                for (const key in data) {
                    sessionStorage.setItem(key, data[key]);
                }
            }, data);
        } else {
            await page.evaluate((data) => {
                for (const key in data) {
                    sessionStorage.setItem(key, data[key]);
                }
            }, data);
        }
    }

    async setIndexedDBData(databaseName, objectStoreName, data) {
        const page = await this.getCurrentPage();
        await page.evaluate((db, store, data) => {
            return new Promise((resolve, reject) => {
                const dbRequest = indexedDB.open(db);
                dbRequest.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    db.createObjectStore(store);
                };
                dbRequest.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction([store], 'readwrite');
                    const objectStore = transaction.objectStore(store);
                    objectStore.clear();  // Clear existing data
                    for (const item of data) {
                        objectStore.add(item);
                    }
                    transaction.oncomplete = resolve;
                };
                dbRequest.onerror = reject;
            });
        }, databaseName, objectStoreName, data);
    }

    async switchToPageByIndex(index, options) {
        const page = await this.getPageByIndex(index, options);
        if (page) {
            await page.bringToFront();
        }
    }

    async switchToPageByUrl(url, options) {
        const index = await this.findPageIndexByUrl(url, options);
        if (index !== -1) {
            await this.switchToPageByIndex(index);
        }
    }

    async getPageByIndex(index, options) {
        const pages = await this.getPages();
        if (index >= pages.length) {
            return pages[pages.length - 1];
        } else if (index >= 0 && index < pages.length) {
            return pages[index];
        }
    }

    async closeWindow() {
        const pages = await this.getPages();
        for (const page of pages) {
            await page.close();
        }
        await this.browser.close();
        this.activePage = null
    }

    async closePages() {
        const pages = await this.getPages();
        this.activePage = null
        for (const page of pages) {
            await page.close();
        }
    }

    async closeNonBlankPages() {
        this.activePage = null
        let pages = await this.getPages()
        let blankPageIndex = await this.findBlankPageIndex();
        if (blankPageIndex != -1 && pages.length == 1) {
            return
        }
        await this.browser.newPage();
        pages = await this.getPages();
        for (let i = 0; i < pages.length - 1; i++) {
            await pages[i].close();
        }
        pages = await this.getPages();
        console.log(`closeNonBlankPages`, pages.length)
    }

    isConnected() {
        return this.browser ? this.browser.isConnected() : false;
    }

    async closePage(url = null, safe = true) {
        if (typeof url === 'string') {
            this.switchTo(url);
        }
        if (safe === true) {
            const handlength = this.getWindowHandlesLength();
            if (handlength <= 1) {
                return true;
            }
        }
        const jsCode = 'window.close()';
        this.executeJsCode(jsCode);
    }

    async getCurrentUrl(full = false) {
        const page = await this.getCurrentPage();
        let url = await page.mainFrame().url();
        if (!full) {
            const urlObject = new URL(url);
            url = urlObject.origin + urlObject.pathname;
        }
        return url;
    }

    async getCurrentUrls(full = false) {
        const page = await this.getPages();
        let url = await page.mainFrame().url();
        if (!full) {
            const urlObject = new URL(url);
            url = urlObject.origin + urlObject.pathname;
        }
        return url;
    }

    async isUrlByCurrentPage(eurl) {
        let url = await this.getCurrentUrl();
        return Util.url.equalDomain(url, eurl)
    }

    async hasUrl(eUrl) {
        const pages = await this.getPages();
        for (const page of pages) {
            const url = await page.mainFrame().url();;
            if (Util.url.equalDomain(url, eUrl)) {
                return true;
            }
        }
        return false;
    }

    async hasPathnameFull(ePath) {
        const pages = await this.getPages();
        for (const page of pages) {
            const url = await page.mainFrame().url();
            const urlObject = new URL(url);
            const pathname = urlObject.pathname;

            if (pathname == ePath) {
                return true;
            }
        }
        return false;
    }

    async hasPathname(ePath) {
        const pages = await this.getPages();
        for (const page of pages) {
            const url = await page.mainFrame().url();
            const urlObject = new URL(url);
            let pathname = urlObject.pathname;
            pathname = pathname.replace(/^\//, '').toLowerCase();
            ePath = ePath.replace(/^\//, '').toLowerCase();
            if (pathname == ePath) {
                return true;
            }
        }
        return false;
    }

    async isNullUrl() {
        let currentUrl = await this.getCurrentUrl()
        return Util.url.isNullBackUrl(currentUrl)
    }

    async isBackUrl() {
        return await this.isNullUrl()
    }

    async getPagesLen() {
        const pages = await this.getPages();
        return pages.length;
    }

    async getPages() {
        const pages = await this.browser.pages()
        return pages
    }

    async findPageByUrl(url) {
        const pages = await this.getPages();
        for (let i = 0; i < pages.length; i++) {
            const pageUrl = await pages[i].mainFrame().url();
            if (Util.url.equalDomainFull(pageUrl, url)) {
                return pages[i];
            }
        }
        return null;
    }

    async findPageIndexByUrl(url, options) {
        const pages = await this.getPages();
        for (let i = 0; i < pages.length; i++) {
            const pageUrl = await pages[i].url();
            if (pageUrl === url) {
                return i;
            }
        }
        return -1;
    }

    async closePageByIndex(index) {
        const page = await this.getPageByIndex(index);
        await page.close();
    }

    async closePageByUrl(url) {
        const index = await this.findPageIndexByUrl(url);
        if (index !== -1) {
            await this.closePageByIndex(index);
        }
    }

    async closeBrowserWindow() {
        const pages = await this.getPages();
        for (const page of pages) {
            await page.close();
        }
    }

    async quitBrowser() {
        await this.browser.close();
    }

    async findBlankPageIndex() {
        const pages = await this.getPages();
        for (let i = 0; i < pages.length; i++) {
            const pageUrl = await pages[i].mainFrame().url();
            if (Util.url.isNullBackUrl(pageUrl)) {
                return i;
            }
        }
        return -1;
    }

    async findNormalizedUrlIndex(url, urlStrict) {
        // const normalizedTargetUrl = Util.url.normalizeUrl(url);
        const pages = await this.getPages();
        for (let i = 0; i < pages.length; i++) {
            const curUrl = await pages[i].mainFrame().url();
            // const oldPage = Util.url.normalizeUrl(curUrl)
            if (urlStrict) {
                // console.log(`equalDomainFull`,curUrl)
                // console.log(`equalDomainFull`,url)
                if (Util.url.equalDomainFull(curUrl, url)) {
                    return i;
                }
            } else {
                // console.log(`equalDomain`)
                if (Util.url.equalDomain(curUrl, url)) {
                    return i;
                }
            }
        }
        return -1;
    }

    async switchOnly(url, options = { urlStrict: false }) {
        const pageIndex = await this.findNormalizedUrlIndex(url, options.urlStrict);
        if (pageIndex !== -1) {
            await this.switchToPageByIndex(pageIndex, options);
        } else {
            await this.open(url, options);
        }
    }
}

Page.toString = () => '[class Page]';
module.exports = Page;

