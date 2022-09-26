import Controller from '../interaction/controller'
import Lang from '../utils/lang'

let callback_cancel,
    controller_enabled,
    loader,
    timer

function start(on_cancel){
    callback_cancel = on_cancel

    controller_enabled = Controller.enabled().name

    loader = $(`<div class="loading-layer">
        <div class="loading-layer__box">
            <div class="loading-layer__text">${Lang.translate('loading')}</div>
            <div class="loading-layer__ico"></div>
        </div>
    </div>`)

    loader.on('click',cancel)

    clearTimeout(timer)

    timer = setTimeout(()=>{
        $('body').append(loader)
    },500)
    

    toggle()
}


function toggle(){
    Controller.add('loading',{
        invisible: true,
        toggle: ()=>{},
        back: cancel,
        up: cancel,
        down: cancel,
        left: cancel,
        right: cancel
    })
    
    Controller.toggle('loading')
}

function cancel(){
    if(callback_cancel) callback_cancel()
}

function stop(){
    if(loader) loader.remove()

    clearTimeout(timer)

    if(controller_enabled) Controller.toggle(controller_enabled)
}

export default {
    start,
    stop
}