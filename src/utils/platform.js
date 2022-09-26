import Storage from './storage'
import Manifest from './manifest'

function init(){
    if(typeof webOS !== 'undefined' && webOS.platform.tv === true){
        Storage.set('platform','webos')

        webOS.deviceInfo((e)=>{
            webOS.sdk_version = parseFloat(e.sdkVersion)
        })
    }
    else if(typeof webapis !== 'undefined' && typeof tizen !== 'undefined'){
        Storage.set('platform','tizen')

        tizen.tvinputdevice.registerKey("MediaPlayPause");
        tizen.tvinputdevice.registerKey("MediaPlay");
        tizen.tvinputdevice.registerKey("MediaStop");
        tizen.tvinputdevice.registerKey("MediaPause");
        tizen.tvinputdevice.registerKey("MediaRewind");
        tizen.tvinputdevice.registerKey("MediaFastForward");
    }
    else if(navigator.userAgent.toLowerCase().indexOf("lampa_client") > -1){
        Storage.set('platform', 'android')
    }
    else if(typeof nw !== 'undefined') {
        Storage.set('platform', 'nw')
    }
    else if(navigator.userAgent.toLowerCase().indexOf("electron") > -1) {
        Storage.set('platform', 'electron')
    }
    else if(navigator.userAgent.toLowerCase().indexOf("netcast") > -1) {
        Storage.set('platform', 'netcast')
    }
    else if(navigator.userAgent.toLowerCase().indexOf("windows nt") > -1) {
        Storage.set('platform', 'browser')
    }
    else if(navigator.userAgent.toLowerCase().indexOf("maple") > -1) {
        Storage.set('platform', 'orsay')
    }
    else{
        Storage.set('platform','')
    }
    
    Storage.set('native',Storage.get('platform') ? true : false)
}

/**
 * Какая платформа
 * @returns String
 */
function get(){
    return Storage.get('platform','')
}

/**
 * Если это платформа
 * @param {String} need - какая нужна? tizen, webos, android, orsay
 * @returns Boolean
 */
function is(need){
    return get() == need ? true : false
}

/**
 * Если хоть одна из платформ tizen, webos, android
 * @returns Boolean
 */
function any(){
    return is('tizen') || is('webos') || is('android') || is('netcast') || desktop() ? true : false
}

/**
 * Если это именно телек
 * @returns Boolean
 */
function tv(){
    return is('tizen') || is('webos') || is('orsay') || is('netcast') ? true : false
}

/**
 * Если это NW.js или Electron
 * @returns Boolean
 */
function desktop() {
    return is('nw') || is('electron')
}

function version(name){
    if (name == 'app') {
        return Manifest.app_version
    } else if (name == 'android') {
        return AndroidJS.appVersion()
    } else {
        return ''
    }
}

export default {
    init,
    get,
    any,
    is,
    tv,
    desktop,
    version
}
