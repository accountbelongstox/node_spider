const Conf = require('ee-core/config');
const Browser = require('./main/main');
const path = require('path');
const Util = require('../provider/util');
const practical = require('../provider/practical');
const { app } = require('electron');

const findElectronAppDir = Util.file.findRootDirectory(__dirname)
const appRoot = path.resolve(findElectronAppDir ? findElectronAppDir : app.getAppPath());

let config = Conf.getValue(`addons.climber`)
let executablePath = config.executablePath
if(executablePath){
  executablePath = path.join(appRoot, executablePath)
  config.executablePath = executablePath
}else{
  const systemChromePath = practical.src.getBrowserPath()
  console.log(`systemChromePath`,systemChromePath)
}

const {opt} = require('../provider/practical');
opt.setBaseDir(appRoot)

class SpiderAddon {

  constructor() {
    this.broswerInstance = new Browser()
  }

  async createBrowser(options = { headless: false }) {
    config = Util.json.merge(config, options)
    const broswer = await this.broswerInstance.createDriver(config)
    return broswer
  }

  async getUtil() {
    return { Util }
  }

  getInstance() {
    return this.broswerInstance
  }
}

SpiderAddon.toString = () => '[class SpiderAddon]';
module.exports = SpiderAddon;