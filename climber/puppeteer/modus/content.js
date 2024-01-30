'use strict';
const { ContentInterface } = require('../../../interface/modus/content_interface');
const Util = require('../../../../node_provider/utils')

class Content extends ContentInterface {

    async init(browser, page) {
        this.browser = browser
        this.pageModus = page
        const methods = Object.getOwnPropertyNames(Content.prototype)
            .filter(name => typeof Content.prototype[name] === 'function' && name !== 'constructor');
        // console.log('Methods:', methods);
        console.log('Total Content of methods:', methods.length);
    }

    async getCurrentPage(page) {
        page = await this.pageModus.getCurrentPage(page)
        return page
    }

    async getFullPageOuterHTMLAndWait(page = null) {
        const currentPage = await this.getCurrentPage(page);
        await currentPage.waitForFunction('document.readyState === "complete"');
        return await currentPage.evaluate(() => {
            return document.documentElement.outerHTML;
        });
    }

    async getFullPageOuterHTML(page = null) {
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.evaluate(() => {
            return document.documentElement.outerHTML;
        });
    }

    async getAllAnchorHrefs(completeURL = false, page = null) {
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$$eval('a', (anchors, completeURL) => {
            return anchors.map(a => completeURL && a.href ? new URL(a.href).toString() : a.getAttribute('href'));
        }, completeURL);
    }

    async getAllImageSrcs(completeURL = false, page = null) {
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$$eval('img', (images, completeURL) => {
            return images.map(img => completeURL && img.src ? new URL(img.src).toString() : img.getAttribute('src'));
        }, completeURL);
    }

    async getAllCssResourcePaths(completeURL = false, page = null) {
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$$eval('link[rel="stylesheet"]', (links, completeURL) => {
            return links.map(link => completeURL && link.href ? new URL(link.href).toString() : link.getAttribute('href'));
        }, completeURL);
    }

    async getAllJsResourcePaths(completeURL = false, page = null) {
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$$eval('script', (scripts, completeURL) => {
            return scripts.map(script => completeURL && script.src ? new URL(script.src).toString() : script.getAttribute('src'));
        }, completeURL);
    }

    async queryAllElements(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$$eval(selector, elements => {
            return elements;
        });
    }

    async isImageElement(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return false;
        }
        const currentPage = await this.getCurrentPage(page);
        const element = await currentPage.$(selector);
        return element && (await (await element.getProperty('tagName')).jsonValue()) === 'IMG';
    }

    async isAnchorElement(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return false;
        }
        const currentPage = await this.getCurrentPage(page);
        const element = await currentPage.$(selector);
        if (!element) return false;
        const tagName = await element.evaluate(el => el.tagName);
        return tagName.toLowerCase() === 'a';
    }

    async isJsElement(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return false;
        }
        const currentPage = await this.getCurrentPage(page);
        const element = await currentPage.$(selector);
        if (!element) return false;
        const tagName = await element.evaluate(el => el.tagName);
        return tagName.toLowerCase() === 'script';
    }

    async isCssElement(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return false;
        }
        const currentPage = await this.getCurrentPage(page);
        const element = await currentPage.$(selector);
        if (!element) return false;
        const rel = await element.evaluate(el => el.getAttribute('rel'));
        return rel && rel.toLowerCase() === 'stylesheet';
    }

    async getElementBySelector(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$(selector);
    }
    async getElementBySelectorAndWait(selector, waitDuration = 50000, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        await currentPage.waitForSelector(selector, { timeout: waitDuration });
        return await currentPage.$(selector);
    }

    async getElementsBySelectorAndWait(selector, waitDuration = 50000, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return [];
        }
        const currentPage = await this.getCurrentPage(page);
        await currentPage.waitForSelector(selector, { timeout: waitDuration });
        return await currentPage.$$(selector);
    }

    async getTextBySelector(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$eval(selector, el => el.textContent);
    }

    async getAllTextsBySelector(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return [];
        }
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$$eval(selector, elements => elements.map(el => el.textContent));
    }

    async getHTMLBySelector(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$eval(selector, el => el.innerHTML);
    }

    async getTextBySelectorAndWait(selector, waitDuration = 50000, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        await currentPage.waitForSelector(selector, { timeout: waitDuration });
        return await currentPage.$eval(selector, el => el.textContent.trim());
    }

    async getHTMLBySelectorAndWait(selector, waitDuration = 50000, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        await currentPage.waitForSelector(selector, { timeout: waitDuration });
        return await currentPage.$eval(selector, el => el.innerHTML.trim());
    }

    async getElementsByTag(tag, page = null) {
        return await this.queryAllElements(tag, page);
    }

    async getElementByXpath(xpath, page = null) {
        const currentPage = await this.getCurrentPage(page);
        const elements = await currentPage.$x(xpath);
        return elements[0];
    }

    async getSiblingBeforeText(selector, n = 0, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return '';
        }
        const currentPage = await this.getCurrentPage(page);
        const element = await currentPage.$(selector);
        const text = await element.evaluate((el, n) => {
            let current = el;
            for (let i = 0; i <= n && current; i++) {
                current = current.previousElementSibling;
            }
            return current ? current.textContent.trim() : '';
        }, n);
        return text;
    }

    async getSiblingAfterText(selector, n = 0, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return '';
        }
        const currentPage = await this.getCurrentPage(page);
        const element = await currentPage.$(selector);
        const text = await element.evaluate((el, n) => {
            let current = el;
            for (let i = 0; i <= n && current; i++) {
                current = current.nextElementSibling;
            }
            return current ? current.textContent.trim() : '';
        }, n);
        return text;
    }

    async getDataAttributeBySelector(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$eval(selector, el => el.dataset);
    }

    async getAllDataAttributesBySelector(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        const datasets = await currentPage.$$eval(selector, elements => elements.map(el => el.dataset));
        return datasets;
    }

    async countElementsBySelector(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return 0;
        }
        const currentPage = await this.getCurrentPage(page);
        const elements = await currentPage.$$(selector);
        return elements.length;
    }

    async getTextBySelectorAndIndex(selector, index = 0, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        const elements = await currentPage.$$(selector);
        if (index >= elements.length) return null;
        return await currentPage.evaluate(el => el.textContent.trim(), elements[index]);
    }

    async getHTMLBySelectorAndIndex(selector, index = 0, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        const elements = await currentPage.$$(selector);
        if (index >= elements.length) return null;
        return await currentPage.evaluate(el => el.innerHTML, elements[index]);
    }

    async getDataBySelectorAndIndex(selector, index = 0, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        const elements = await currentPage.$$(selector);
        if (index >= elements.length) return null;
        return await currentPage.evaluate(el => el.dataset, elements[index]);
    }

    async getValueBySelectorAndIndex(selector, index = 0, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return null;
        }
        const currentPage = await this.getCurrentPage(page);
        const elements = await currentPage.$$(selector);
        if (index >= elements.length) return null;
        return await currentPage.evaluate(el => el.value, elements[index]);
    }

    async getElementByText(text, page = null) {
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$x(`//*[text()="${text}"]`);
    }

    async getBrowserLogValues(page = null) {
        const currentPage = await this.getCurrentPage(page);
        const logs = [];
        currentPage.on('console', message => logs.push(message.text()));
        return logs;
    }

    async replaceClassBySelector(selector, newClass, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return;
        }
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$$eval(selector, (elements, newClass) => {
            elements.forEach(el => {
                el.className = newClass;
            });
        }, newClass);
    }

    async addClassBySelector(selector, newClass, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return;
        }
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$$eval(selector, (elements, newClass) => {
            elements.forEach(el => {
                if (!el.classList.contains(newClass)) {
                    el.classList.add(newClass);
                }
            });
        }, newClass);
    }

    async removeClassBySelector(selector, className, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return;
        }
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$$eval(selector, (elements, className) => {
            elements.forEach(el => {
                el.classList.remove(className);
            });
        }, className);
    }

    async setStyleBySelector(selector, style, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return;
        }
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.$$eval(selector, (elements, style) => {
            elements.forEach(el => {
                Object.assign(el.style, style);
            });
        }, style);
    }

    async waitFor(str, page = null) {
        const currentPage = await this.getCurrentPage(page);
        let url = await currentPage.mainFrame().url();
        console.log(`waitFor ${url}`)
        return await currentPage.waitFor(str);
    }

    async waitForElement(selector, page = null) {
        const currentPage = await this.getCurrentPage(page);
        return await currentPage.waitForSelector(selector, { visible: true });
    }

    async waitForCallback(selector, callback, timeout = 2000, page = null) {
        const currentPage = await this.getCurrentPage(page);
        let isElement = await currentPage.evaluate(selector => {
            return !!document.querySelector(selector);
        }, selector);

        if (isElement) {
            return callback(isElement);
        } else {
            return new Promise(resolve => {
                const timer = setTimeout(() => {
                    resolve(callback(null)); // Timeout, return null
                }, timeout);

                const observer = new MutationObserver(mutations => {
                    const isElementNow = mutations.some(mutation =>
                        Array.from(mutation.addedNodes).some(node =>
                            node.matches && node.matches(selector)
                        )
                    );

                    if (isElementNow) {
                        clearTimeout(timer);
                        observer.disconnect();
                        resolve(callback(true));
                    }
                });

                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
            });
        }
    }

    async findIPsInHTML(page = null) {
        const currentPage = await this.getCurrentPage(page);
        const html = await currentPage.content();
        const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
        return html.match(ipRegex) || [];
    }

    async getLastIPInHTML(page = null) {
        const ips = await this.findIPsInHTML(page);
        return ips[ips.length - 1];
    }

    async searchContentInFullHTML(content, page = null) {
        const currentPage = await this.getCurrentPage(page);
        const html = await currentPage.content();
        const regex = new RegExp(content, 'g');
        const matches = html.match(regex);
        return matches || [];
    }

    async getChildElementsMatchingSelector(parentSelector, childSelector, page = null) {
        const currentPage = await this.getCurrentPage(page);
        try {
            await currentPage.waitForSelector(parentSelector);
            const parentElement = await currentPage.$(parentSelector);
            if (!parentElement) {
                console.log(`Parent element with selector ${parentSelector} not found.`);
            }
            await parentElement.waitForSelector(childSelector);
            const childElements = await parentElement.$$(childSelector);
            const childElementData = [];
            for (const childElement of childElements) {
                const tagName = await (await childElement.getProperty('tagName')).jsonValue();
                const textContent = await (await childElement.getProperty('textContent')).jsonValue();
                childElementData.push({ tagName, textContent });
            }
            return childElementData;
        } catch (error) {
            console.log(`Error selecting child elements matching selector: ${childSelector}`);
        }
    }

    async getHeightBySelector(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return;
        }
        const currentPage = await this.getCurrentPage(page);
        const element = await currentPage.$(selector);

        if (!element) {
            return null;
        }

        const box = await element.boundingBox();
        return box ? box.height : null;
    }

    async getWidthBySelector(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return;
        }
        const currentPage = await this.getCurrentPage(page);
        const element = await currentPage.$(selector);

        if (!element) {
            return null;
        }

        const box = await element.boundingBox();
        return box ? box.width : null;
    }

    async getSubElementsBase64BySelector(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return;
        }
        const currentPage = await this.getCurrentPage(page);
        const imagesData = await currentPage.evaluate((selector) => {
            let images = document.querySelectorAll(`${selector} img`);
            return Array.from(images).map(imgElement => ({
                src: imgElement.src,
                data: imgElement.dataset,
                class: imgElement.className,
                id: imgElement.id
            }));
        }, selector);
        for (let imgData of imagesData) {
            imgData.base64 = await currentPage.evaluate(async (src) => {
                return new Promise((resolve) => {
                    let img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = function () {
                        let canvas = document.createElement('canvas');
                        let ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        let base64 = canvas.toDataURL();
                        canvas.remove();
                        resolve(base64);
                    };
                    img.onerror = function () {
                        resolve('');
                    };
                    img.src = src;
                });
            }, imgData.src);
        }
        return imagesData;
    }

    async getElementsMatchingSelector(selector, page = null) {
        const currentPage = await this.getCurrentPage(page);
        try {
            await currentPage.waitForSelector(selector);
            const elements = await currentPage.$$(selector);
            const elementData = [];
            for (const element of elements) {
                const tagName = await (await element.getProperty('tagName')).jsonValue();
                const textContent = await (await element.getProperty('textContent')).jsonValue();
                elementData.push({ tagName, textContent });
            }
            return elementData;
        } catch (error) {
            console.log(`Error selecting elements matching selector: ${selector}`);
            return null;
        }
    }

    async getImagesMatchingSelector(selector, page = null) {
        const currentPage = await this.getCurrentPage(page);
        try {
            await currentPage.waitForSelector(selector);
            const imageElements = await currentPage.$$(`${selector} img`);

            return imageElements;
        } catch (error) {
            console.log(`Error selecting image elements matching selector: ${selector}`);
            return null;
        }
    }

    async getImgAttributesMatchingSelector(selector, page = null) {
        const currentPage = await this.getCurrentPage(page);
        try {
            await currentPage.waitForSelector(selector);
            const imgElements = await currentPage.$$(`${selector} img`);
            const imgAttributes = [];
            for (const imgElement of imgElements) {
                const src = await imgElement.evaluate((element) => element.getAttribute('src'));
                const className = await imgElement.evaluate((element) => element.getAttribute('class'));
                const dataAttributes = await imgElement.evaluate((element) => {
                    const data = {};
                    for (const [key, value] of Object.entries(element.dataset)) {
                        data[`data-${key}`] = value;
                    }
                    return data;
                });

                const id = await imgElement.evaluate((element) => element.getAttribute('id'));
                const alt = await imgElement.evaluate((element) => element.getAttribute('alt'));

                imgAttributes.push({ src, className, ...dataAttributes, id, alt });
            }

            return imgAttributes;
        } catch (error) {
            console.log(`Error selecting img element attributes matching selector: ${selector}`);
            return null; // Handle error by returning null or appropriate value
        }
    }

    async getBase64BySrcs(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return;
        }
        const currentPage = await this.getCurrentPage(page);
        const imagesData = await currentPage.evaluate((selector) => {
            let images = document.querySelectorAll(`${selector} img`);
            return Array.from(images).map(imgElement => ({
                src: imgElement.src,
                data: imgElement.dataset,
                class: imgElement.className,
                id: imgElement.id
            }));
        }, selector);
        for (let imgData of imagesData) {
            imgData.base64 = await currentPage.evaluate(async (src) => {
                return new Promise((resolve) => {
                    let img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = function () {
                        let canvas = document.createElement('canvas');
                        let ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        let base64 = canvas.toDataURL();
                        canvas.remove();
                        resolve(base64);
                    };
                    img.onerror = function () {
                        resolve('');
                    };
                    img.src = src;
                });
            }, imgData.src);
        }
        return imagesData;
    }

    async getLinkAttributesMatchingSelector(selector, page = null) {
        if (!(await this.doesElementExist(selector, page))) {
            return;
        }
        const currentPage = await this.getCurrentPage(page);
        try {
            await currentPage.waitForSelector(selector);
            const linkElements = await currentPage.$$(`${selector} a`);
            const linkAttributes = [];
            for (const linkElement of linkElements) {
                const href = await linkElement.evaluate((element) => element.getAttribute('href'));
                const className = await linkElement.evaluate((element) => element.getAttribute('class'));
                const dataAttr = await linkElement.evaluate((element) => element.getAttribute('data-attr'));
                const id = await linkElement.evaluate((element) => element.getAttribute('id'));
                const textInner = await linkElement.evaluate((element) => element.textContent);
                linkAttributes.push({ href, className, dataAttr, id, textInner });
            }
            return linkAttributes;
        } catch (error) {
            console.log(`Error selecting link element attributes matching selector: ${selector}`);
        }
    }


}

Content.toString = () => '[class Content]';
module.exports = Content;

