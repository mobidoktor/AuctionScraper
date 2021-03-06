'use strict'

const { ipcRenderer } = require('electron')
const request = require('request-promise')
const cheerio = require('cheerio')
const { BrowserWindow } = require('electron').remote

/**
 * Object used to contain all the search data
 * @property {string} searchVal A String typed into the text box
 * @property {Object} amazon Object that holds amazon search data
 * @property {Object} ebay Object that holds ebay search data
 * @property {Boolean} checked Is the checkbox 'checked'
 * @property {Array} list Holds all list items
 */
const searchObj = {
    searchVal: '',
    amazon: { checked: true, list: [] },
    ebay: { checked: true, list: [] }
}


document.getElementById('version').innerHTML = 'v ' + require('electron').remote.app.getVersion();

document.addEventListener('keydown', (event) => {
    const keyName = event.key;
    if (keyName === 'Enter') {
        if (document.getElementById('content-wrapper').classList.contains('hidden')) { firstSearch() }
        else { anotherSearch() }
    }
}, false)

/**
 * Function invoked on the Enter keydown event when the first screen is printed
 * initiates a chain of functions to perform the search
 */
function firstSearch() {
    searchObj.searchVal = document.getElementById('txt_box').value;
    searchObj.amazon.checked = document.getElementById('amazonCheck').checked;
    searchObj.ebay.checked = document.getElementById('ebayCheck').checked;

    if (!searchObj.amazon.checked && !searchObj.ebay.checked) { errorHandler('nothingChecked'); }
    else if (searchObj.searchVal) {
        fadeOutSearchScreen()
            .then((response) => {
                console.log(response);
                return loadingScreen();
            })
            .then((response) => {
                console.log(response);
                if (!searchObj.ebay.checked) return Promise.resolve('skip');
                const options = {
                    method: 'GET',
                    uri: `http://www.ebay.com/sch/i.html?_nkw=${searchObj.searchVal}`,
                    resolveWithFullResponse: true,
                    transform: body => cheerio.load(body)
                }
                return request(options)
            })
            .then((response) => {
                if (response !== 'skip') scrapeEbay(response);
                if (!searchObj.amazon.checked) return Promise.resolve('skip');
                const options = {
                    method: 'GET',
                    uri: `https://www.amazon.com/s/field-keywords=${searchObj.searchVal}`,
                    headers: {
                        'User-Agent': 'request-promise'
                    },
                    resolveWithFullResponse: true,
                    transform: body => cheerio.load(body)
                }
                return request(options)
            })
            .then((response) => {
                if (response !== 'skip') scrapeAmazon(response);
                buildList()
                loadingScreen();
                return fadeInContentScreen();
            })
            .catch((error) => {
                console.log('Rejection: ' + error);
            });
    }
    else { errorHandler('emptyvalue') }
}

/**
 * Function invoked on the Enter keydown event when the first screen is printed
 * initiates a chain of functions to perform the search
 */
function anotherSearch() {
    searchObj.searchVal = document.getElementById('fixed_txt_box').value;

    if (searchObj.searchVal) {
        fadeOutContentScreen()
            .then((response) => {
                console.log(response);
                return loadingScreen();
            })
            .then((response) => {
                console.log(response);
                if (!searchObj.ebay.checked) return Promise.resolve('skip');
                const options = {
                    method: 'GET',
                    uri: `http://www.ebay.com/sch/i.html?_nkw=${searchObj.searchVal}`,
                    resolveWithFullResponse: true,
                    transform: body => cheerio.load(body)
                }
                return request(options)
            })
            .then((response) => {
                if (response !== 'skip') scrapeEbay(response);
                if (!searchObj.amazon.checked) return Promise.resolve('skip');
                const options = {
                    method: 'GET',
                    uri: `https://www.amazon.com/s/field-keywords=${searchObj.searchVal}`,
                    headers: {
                        'User-Agent': 'request-promise'
                    },
                    resolveWithFullResponse: true,
                    transform: body => cheerio.load(body)
                }
                return request(options)
            })
            .then((response) => {
                if (response !== 'skip') scrapeAmazon(response);
                buildList()
                loadingScreen();
                return fadeInContentScreen();
            })
            .catch((error) => {
                console.log('Rejection: ' + error);
            });
    }
    else { errorHandler('emptyvalue') }
}

/**
 * Function for fading out the first search screen
 * @returns {Promise} -for chaining purposes
 */
function fadeOutSearchScreen() {
    return new Promise((resolve, reject) => {
        const searchGroup = document.getElementById('search-group-wrapper');
        searchGroup.className = 'fadeout';
        setTimeout(() => {
            searchGroup.className = 'hidden'
            resolve('search screen faded out');
        }, 500);
    })
}

/**
 * Function for fading in the content screen
 * ContentScreen contains fixed search panel and returned search list from scraper functions
 * @returns {Promise} -for chaining purposes
 */
function fadeInContentScreen() {
    return new Promise((resolve, reject) => {
        const content = document.getElementById('content-wrapper');
        content.className = 'fadein content-wrapper';
        setTimeout(() => {
            content.classList.add('visible');
            resolve('content screen loaded');
        }, 500);
    })
}

/**
 * Function for fading out the content screen
 * ContentScreen contains fixed search panel and returned search list from scraper functions
 * @returns {Promise} -for chaining purposes
 */
function fadeOutContentScreen() {
    return new Promise((resolve, reject) => {
        const content = document.getElementById('content-wrapper');
        content.className = 'fadeout content-wrapper';
        setTimeout(() => {
            content.className = 'hidden content-wrapper';
            resolve('content screen hidden');
        }, 500);
    })
}

/**
 * Function for fading in and fading out the loading screen
 * @returns {Promise} -for chaining purposes
 */
function loadingScreen() {
    return new Promise((resolve, reject) => {
        const loadingDiv = document.getElementById('loading-container');
        if (loadingDiv.classList.contains('hidden')) {
            loadingDiv.classList.remove('hidden');
            loadingDiv.classList.add('visible');
            resolve('loading screen loaded');
        }
        else if (loadingDiv.classList.contains('visible')) {
            loadingDiv.classList.remove('visible');
            loadingDiv.classList.add('hidden');
            resolve('loading screen hidden');
        }
    })
}

/**
 * Function for scraping Ebay
 * @param {cheerio Object} $ Gets the returned cheerio object to use it with a-jQuery-like style of DOM manipulation
 * Creates an item object and fills it with scraped information
 * The item object is then pushed to the searchObject list
 */
function scrapeEbay($) {
    searchObj.ebay.list = [];
    $('#ListViewInner').children('li').each((index, element) => {
        const item = {
            link: '',
            img: '',
            title: '',
            price: ''
        }
        item.link = $('.vip', element).attr('href');
        item.img = $('img', element).attr('src');
        item.title = $('.lvtitle', element).text();
        item.price = $('.lvprice', element).text();

        searchObj.ebay.list.push(item);
    })
}

/**
 * Function for scraping Amazon
 * @param {cheerio Object} $ Gets the returned cheerio object to use it with a-jQuery-like style of DOM manipulation
 * Creates an item object and fills it with scraped information
 * The item object is then pushed to the searchObject list
 */
function scrapeAmazon($) {
    searchObj.amazon.list = [];
    $('#s-results-list-atf').children('li').each((index, element) => {
        const item = {
            link: '',
            img: '',
            title: '',
            price: ''
        }
        item.link = $('.a-link-normal', element).attr('href');
        item.img = $('img', element).attr('src');
        item.title = $('h2', element).data('attribute');
        item.price += $('.sx-price-currency', element).first().text();
        item.price += $('.sx-price-whole', element).first().text();
        item.price += '.';
        item.price += $('.sx-price-fractional', element).first().text();

        searchObj.amazon.list.push(item);
    })
}

/**
 * Builds HTML elements based on the information from searchObject lists
 * Adds an event listener for every list item to open a new window on click with item's real auction link.
 */
function buildList() {
    const listContainer = document.getElementById('list-container');
    listContainer.innerHTML = '';

    if (searchObj.amazon.checked) {
        searchObj.amazon.list.forEach((value, index) => {
            const listItemContainer = document.createElement('div');
            listItemContainer.setAttribute('class', `amazon-list-item-container list-item-container`);

            const listItemWrapper = document.createElement('div');
            listItemWrapper.setAttribute('id', `amazon-list-item-${index}`);
            listItemWrapper.setAttribute('class', `amazon-list-item-wrapper list-item-wrapper`);

            const listitemImgWrapper = document.createElement('div');
            listitemImgWrapper.setAttribute('class', 'list-item-img-wrapper');

            const listitemImg = document.createElement('img');
            listitemImg.setAttribute('class', 'list-item-img');
            listitemImg.setAttribute('src', value.img);
            listitemImgWrapper.appendChild(listitemImg);

            const listItemTitlePriceWrapper = document.createElement('div');
            listItemTitlePriceWrapper.setAttribute('class', 'list-item-title-price-wrapper ')

            const listItemPriceWrapper = document.createElement('div');
            listItemPriceWrapper.setAttribute('class', 'list-item-price-wrapper amazon-list-item-price-wrapper');
            const listItemPrice = document.createElement('span');
            listItemPrice.setAttribute('class', 'list-item-price');
            listItemPrice.appendChild(document.createTextNode(value.price.trim()));
            listItemPriceWrapper.appendChild(listItemPrice);

            const listItemTitleWrapper = document.createElement('div');
            listItemTitleWrapper.setAttribute('class', 'list-item-title-wrapper');
            const listItemTitle = document.createElement('span');
            listItemTitle.setAttribute('class', 'list-item-title');
            listItemTitle.appendChild(document.createTextNode(value.title));
            listItemTitleWrapper.appendChild(listItemTitle);

            const listitemLogoWrapper = document.createElement('div');
            listitemLogoWrapper.setAttribute('class', 'list-item-logo-wrapper list-item-amazon-logo-wrapper');
            const listitemLogo = document.createElement('img');
            listitemLogo.setAttribute('class', 'list-item-logo list-item-amazon-logo');
            listitemLogo.setAttribute('src', 'assets/amazon-logo.svg');
            listitemLogoWrapper.appendChild(listitemLogo);

            listItemTitlePriceWrapper.appendChild(listItemTitleWrapper);
            listItemTitlePriceWrapper.appendChild(listItemPriceWrapper);
            listItemWrapper.appendChild(listitemImgWrapper);
            listItemWrapper.appendChild(listItemTitlePriceWrapper);
            listItemWrapper.appendChild(listitemLogoWrapper);

            listItemContainer.appendChild(listItemWrapper);
            listContainer.appendChild(listItemContainer);

            document.getElementById(`amazon-list-item-${index}`).addEventListener('click', (e) => {
                e.preventDefault();
                let win = new BrowserWindow({
                    minWidth: 800,
                    width: 800,
                    height: 600,
                    backgroundColor: '#FFFFFF',
                    webPreferences: {
                        devTools: true
                    },
                    autoHideMenuBar: true
                })

                win.loadURL(value.link);

                win.on('closed', () => {
                    win = null
                })

                win.once('ready-to-show', () => {
                    win.show()
                })
            })
        })
    }
    if (searchObj.ebay.checked) {
        searchObj.ebay.list.forEach((value, index) => {
            const listItemContainer = document.createElement('div');
            listItemContainer.setAttribute('id', `ebay-list-item-${index}`);
            listItemContainer.setAttribute('class', `ebay-list-item-container list-item-container`);

            const listItemWrapper = document.createElement('div');
            listItemWrapper.setAttribute('id', `ebay-list-item-${index}`);
            listItemWrapper.setAttribute('class', `ebay-list-item-wrapper list-item-wrapper`);

            const listitemImgWrapper = document.createElement('div');
            listitemImgWrapper.setAttribute('class', 'list-item-img-wrapper');

            const listitemImg = document.createElement('img');
            listitemImg.setAttribute('class', 'list-item-img');
            listitemImg.setAttribute('src', value.img);
            listitemImgWrapper.appendChild(listitemImg);

            const listItemTitlePriceWrapper = document.createElement('div');
            listItemTitlePriceWrapper.setAttribute('class', 'list-item-title-price-wrapper')

            const listItemPriceWrapper = document.createElement('div');
            listItemPriceWrapper.setAttribute('class', 'list-item-price-wrapper ebay-list-item-price-wrapper');
            const listItemPrice = document.createElement('span');
            listItemPrice.setAttribute('class', 'list-item-price');
            listItemPrice.appendChild(document.createTextNode(value.price.trim()));
            listItemPriceWrapper.appendChild(listItemPrice);

            const listItemTitleWrapper = document.createElement('div');
            listItemTitleWrapper.setAttribute('class', 'list-item-title-wrapper');
            const listItemTitle = document.createElement('span');
            listItemTitle.setAttribute('class', 'list-item-title');
            listItemTitle.appendChild(document.createTextNode(value.title));
            listItemTitleWrapper.appendChild(listItemTitle);

            const listitemLogoWrapper = document.createElement('div');
            listitemLogoWrapper.setAttribute('class', 'list-item-logo-wrapper list-item-ebay-logo-wrapper');
            const listitemLogo = document.createElement('img');
            listitemLogo.setAttribute('class', 'list-item-logo list-item-ebay-logo');
            listitemLogo.setAttribute('src', 'assets/ebay-logo.svg');
            listitemLogoWrapper.appendChild(listitemLogo);

            listItemTitlePriceWrapper.appendChild(listItemTitleWrapper);
            listItemTitlePriceWrapper.appendChild(listItemPriceWrapper);
            listItemWrapper.appendChild(listitemImgWrapper);
            listItemWrapper.appendChild(listItemTitlePriceWrapper);
            listItemWrapper.appendChild(listitemLogoWrapper);

            listItemContainer.appendChild(listItemWrapper);
            listContainer.appendChild(listItemContainer);

            document.getElementById(`ebay-list-item-${index}`).addEventListener('click', (e) => {
                e.preventDefault();
                let win = new BrowserWindow({
                    minWidth: 800,
                    width: 800,
                    height: 600,
                    backgroundColor: '#FFFFFF',
                    webPreferences: {
                        devTools: true
                    },
                    autoHideMenuBar: true
                })
                win.loadURL(value.link);

                win.on('closed', () => {
                    win = null
                })

                win.once('ready-to-show', () => {
                    win.show()
                })
            })
        })
    }
}

/**
 * Function for handling errors in code
 * supposed to be doing more but now it just prints error msg to the console
 * @param {string} error 
 */
function errorHandler(error) {
    //handle errors
    console.log(`ERROR: ${error}`);
}