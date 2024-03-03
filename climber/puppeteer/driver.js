'use strict';
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const { DriverInterface } = require('../../interface/driver_interface');
const Page = require('./modus/page')
const Handle = require('./modus/handle')
const Download = require('./modus/download')
const Screen = require('./modus/screen')
const Content = require('./modus/content');
const Util = require('../../../node_provider/utils');
const {opt} = require('../../../node_provider/practicals');
const config = opt.initConfig()

class PuppeteerDriver extends DriverInterface {

    bypass() {
        puppeteer.use(StealthPlugin())
    }

    async documentInitialised() {
        const driver = this.getDriver();
        const outerHTML = await driver.executeScript("return document.documentElement.outerHTML");
        if (outerHTML != null && outerHTML.length > 0) {
            console.log(`outerHTML${outerHTML.length}`);
        }
        return driver;
    }

    async createChromeDriver(options = {headless: true}) {
        const customConfig = Util.json.merge(config, options)
        this.bypass()
        const {
            devtools,
            mobile,
            userAgent,
            mute,
            width,
            height,
            deviceScaleFactor,
            executablePath,
            headless
        } = customConfig;

        // let args = [];

        const args = await Options.iniOptions(customConfig,`puppeteer`)

        const defaultViewport = {
            width,
            height,
            deviceScaleFactor,
            isMobile: mobile,
            userAgent: mobile ? Options.getMobileUserAgent() : userAgent,
        };

        console.log(`puppeteer. launch by headless:${headless}`)
        const browser = await puppeteer.launch({
            headless,
            args,
            defaultViewport,
            devtools,
            executablePath,
            ignoreDefaultArgs: mute ? ['--mute-audio'] : []
        });

        const page = new Page()
        await page.init(browser,config)

        const handle = new Handle()
        await handle.init(browser, page)

        const content = new Content()
        await content.init(browser, page)

        const download = new Download()
        await download.init(browser, page)

        const screen = new Screen()
        await screen.init(browser, page)

        return {
            browser,
            driver: browser,
            page,
            content,
            handle,
            download,
            screen,
            close: page.closeWindow,
            util: Util,
            // content:new Content(browser,options),
        };
    }

    async customBrowser() {
        let prefs = {
            'profile.managed_default_content_settings.images': 1,
        };

        if (this.flashUrls && this.flashUrls.length > 0) {
            prefs['profile.managed_plugins_allowed_for_urls'] = this.flashUrls;
        }

        this.options.setChromeOptions(this.options);
        this.options.setUserPreferences(prefs);
        this.options.setExperimentalOption('w3c', false);

        logging.installConsoleHandler();

        const driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(this.options)
            .setLoggingPrefs({ 'performance': 'ALL' })
            .build();

        return driver;
    }

}

PuppeteerDriver.toString = () => '[class PuppeteerDriver]';
module.exports = PuppeteerDriver;

