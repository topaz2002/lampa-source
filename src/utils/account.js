import Utils from './math'
import Storage from './storage'
import Settings from '../components/settings'
import Reguest from './reguest'
import Select from '../interaction/select'
import Noty from '../interaction/noty'
import Controller from '../interaction/controller'
import Favorite from './favorite'
import Arrays from './arrays'
import Socket from './socket'
import Lang from './lang'
import Subscribe from './subscribe'
import Modal from '../interaction/modal'
import Template from '../interaction/template'
import Workers from './storage_workers'
import Head from '../components/head'
import Loading from '../interaction/loading'

let body
let network   = new Reguest()
let api       = Utils.protocol() + 'cub.watch/api/'
let listener  = Subscribe()

let notice_load = {
    time: 0,
    data: []
}

let bookmarks = []


/**
 * Запуск
 */
function init(){
    Settings.listener.follow('open',(e)=>{
        body = null

        if(e.name == 'account'){
            body = e.body

            renderPanel()

            check()
        }
    })

    Storage.listener.follow('change',(e)=>{
        if(e.name == 'account_email' || e.name == 'account_password'){
            signin()

            if(e.name == 'account_password') Storage.set('account_password','',true)
        }

        if(e.name == 'account') updateProfileIcon()
    })

    Favorite.listener.follow('add,added',(e)=>{
        save('add', e.where, e.card)
    })

    Favorite.listener.follow('remove',(e)=>{
        if(e.method == 'id') save('remove', e.where, e.card)
    })

    Head.render().find('.head__body .open--profile').on('hover:enter',()=>{
        showProfiles('head')
    })

    updateBookmarks(Storage.get('account_bookmarks','[]'))

    update()

    timelines()

    storage()

    getUser()

    updateProfileIcon()
}

function updateProfileIcon(){
    let account = Storage.get('account','{}')
    let button  = Head.render().find('.head__body .open--profile').toggleClass('hide', !Boolean(account.token))

    if(account.token){
        let img = button.find('img')[0]

        img.onerror = ()=>{
            img.src = './img/img_load.svg'
        }

        img.src = 'https://cub.watch/img/profiles/' + (account.profile.icon || 'f_1') + '.png'
    }
}

function getUser(){
    let account = Storage.get('account','{}')

    if(account.token && Storage.field('account_use')){
        network.silent(api + 'users/get',(result)=>{
            Storage.set('account_user',JSON.stringify(result.user))
        },false,false,{
            headers: {
                token: account.token
            }
        })
    }
}

function hasPremium(){
    let user = Storage.get('account_user','{}')

    return user.id ? Utils.countDays(Date.now(), user.premium) : 0
}

function timelines(){
    let account = Storage.get('account','{}')

    if(account.token && Storage.field('account_use')){
        network.silent(api + 'timeline/all',(result)=>{
            let viewed = Storage.cache('file_view',10000,{})

            for(let i in result.timelines){
                let time = result.timelines[i]

                viewed[i] = time

                Arrays.extend(viewed[i],{
                    duration: 0,
                    time: 0,
                    percent: 0
                })

                delete viewed[i].hash
            }

            Storage.set('file_view', viewed)
        },false,false,{
            headers: {
                token: account.token,
                profile: account.profile.id
            }
        })
    }
}

function storage(){
    for(let key in Workers){
        let worker = new Workers[key](key)
        
        worker.init()
    }
}

function save(method, type, card){
    let account = Storage.get('account','{}')

    if(account.token && Storage.field('account_use')){
        let list = Storage.get('account_bookmarks', '[]')
        let find = list.find((elem)=>elem.card_id == card.id && elem.type == type)

        network.clear()

        network.silent(api + 'bookmarks/'+method,update,false,{
            type: type,
            data: JSON.stringify(card),
            card_id: card.id,
            id: find ? find.id : 0
        },{
            headers: {
                token: account.token,
                profile: account.profile.id
            }
        })

        if(method == 'remove'){
            if(find) Arrays.remove(list, find)
        }
        else{
            list.push({
                id: 0,
                card_id: card.id,
                type: type,
                data: JSON.stringify(card),
                profile: account.profile.id
            })
        }

        Socket.send('bookmarks',{})

        updateBookmarks(list)
    }
}

function clear(where){
    let account = Storage.get('account','{}')

    if(account.token){
        network.silent(api + 'bookmarks/clear',(result)=>{
            if(result.secuses) update()
        },false,{
            type: 'group',
            group: where
        },{
            headers: {
                token: account.token,
                profile: account.profile.id
            }
        })
    }
}

function update(call){
    let account = Storage.get('account','{}')

    if(account.token){
        network.silent(api + 'bookmarks/all?full=1',(result)=>{
            if(result.secuses){
                updateBookmarks(result.bookmarks)

                if(call && typeof call == 'function') call()
            }
        },()=>{
            if(call && typeof call == 'function') call()
        },false,{
            headers: {
                token: account.token,
                profile: account.profile.id
            }
        })
    }
    else{
        updateBookmarks([])
    }
}

function plugins(call){
    let account = Storage.get('account','{}')

    if(account.token){
        network.timeout(3000)
        network.silent(api + 'plugins/all',(result)=>{
            if(result.secuses){
                Storage.set('account_plugins',result.plugins)

                call(result.plugins)
            }
            else{
                call(Storage.get('account_plugins','[]'))
            }
        },()=>{
            call(Storage.get('account_plugins','[]'))
        },false,{
            headers: {
                token: account.token,
                profile: account.profile.id
            }
        })
    }
    else{
        call([])
    }
}

function extensions(call){
    let account = Storage.get('account','{}')

    let headers = {}

    if(account.token){
        headers = {
            headers: {
                token: account.token,
                profile: account.profile.id
            }
        }
    }
    
    network.timeout(5000)
    network.silent(api + 'extensions/list',(result)=>{
        if(result.secuses){
            Storage.set('account_extensions',result)

            call(result)
        }
        else{
            call(Storage.get('account_extensions','{}'))
        }
    },()=>{
        call(Storage.get('account_extensions','{}'))
    },false,headers)
    
}

function pluginsStatus(plugin, status){
    let account = Storage.get('account','{}')

    if(account.token){
        network.silent(api + 'plugins/status',false,false,{
            id: plugin.id,
            status: status
        },{
            headers: {
                token: account.token,
                profile: account.profile.id
            }
        })
    }
}

/**
 * Статус
 */
function renderStatus(name, value = ''){
    if(body){
        body.find('.settings--account-status .settings-param__value').text(name)
        body.find('.settings--account-status .settings-param__descr').text(value)
    }
}

function renderPanel(){
    if(body){
        let account = Storage.get('account','{}')
        let signed  = account.token ? true : false
        
        body.find('.settings--account-signin').toggleClass('hide',signed)
        body.find('.settings--account-user').toggleClass('hide',!signed)
        body.find('.settings--account-premium').toggleClass('selectbox-item--checked',Boolean(hasPremium()))
        body.find('.settings-param__label').toggleClass('hide',!Boolean(hasPremium()))

        if(!hasPremium()){
            body.find('.selectbox-item').on('hover:enter',showCubPremium)
        }

        if(account.token){
            body.find('.settings--account-user-info .settings-param__value').text(account.email)
            body.find('.settings--account-user-profile .settings-param__value').text(account.profile.name)

            body.find('.settings--account-user-out').on('hover:enter',()=>{
                Storage.set('account',{})

                Settings.update()

                update()
            })

            body.find('.settings--account-user-sync').on('hover:enter',()=>{
                account = Storage.get('account','{}')

                Select.show({
                    title: Lang.translate('settings_cub_sync'),
                    items: [
                        {
                            title: Lang.translate('confirm'),
                            subtitle: Lang.translate('account_sync_to_profile') + ' ('+account.profile.name+')',
                            confirm: true
                        },
                        {
                            title: Lang.translate('cancel')
                        }
                    ],
                    onSelect: (a)=>{
                        if(a.confirm){
                            let file = new File([localStorage.getItem('favorite') || '{}'], "bookmarks.json", {
                                type: "text/plain",
                            })

                            var formData = new FormData($('<form></form>')[0])
                                formData.append("file", file, "bookmarks.json")

                            let loader = $('<div class="broadcast__scan" style="margin: 1em 0 0 0"><div></div></div>')

                            body.find('.settings--account-user-sync').append(loader)

                            $.ajax({
                                url: api + 'bookmarks/sync',
                                type: 'POST',
                                data: formData,
                                async: true,
                                cache: false,
                                contentType: false,
                                enctype: 'multipart/form-data',
                                processData: false,
                                headers: {
                                    token: account.token,
                                    profile: account.profile.id
                                },
                                success: function (j) {
                                    if(j.secuses){
                                        Noty.show(Lang.translate('account_sync_secuses'))

                                        update()

                                        loader.remove()
                                    } 
                                },
                                error: function(){
                                    Noty.show(Lang.translate('account_export_fail'))

                                    loader.remove()
                                }
                            })
                        }

                        Controller.toggle('settings_component')
                    },
                    onBack: ()=>{
                        Controller.toggle('settings_component')
                    }
                })
            })

            body.find('.settings--account-user-backup').on('hover:enter',backup)

            profile()
        }
        else check()
    }
}

function profile(){
    let account = Storage.get('account','{}')

    body.find('.settings--account-user-profile .settings-param__value').text(account.profile.name)

    body.find('.settings--account-user-profile').on('hover:enter',()=>{
        showProfiles('settings_component')
    })
}

function showProfiles(controller){
    let account = Storage.get('account','{}')

    Loading.start(()=>{
        network.clear()

        Loading.stop()
    })

    network.clear()

    network.silent(api + 'profiles/all',(result)=>{
        Loading.stop()

        if(result.secuses){
            let items = Arrays.clone(result.profiles)

            Select.show({
                title: Lang.translate('account_profiles'),
                items: items.map((elem, index)=>{
                    elem.title    = elem.name
                    elem.template = 'selectbox_icon'
                    elem.icon     = '<img src="https://cub.watch/img/profiles/'+elem.icon+'.png" />'
                    elem.index    = index

                    elem.selected = account.profile.id == elem.id

                    return elem
                }),
                onSelect: (a)=>{
                    account.profile = result.profiles[a.index]

                    Storage.set('account',account)

                    if(body) body.find('.settings--account-user-profile .settings-param__value').text(a.name)

                    notice_load.time = 0

                    Controller.toggle(controller)

                    update()
                },
                onBack: ()=>{
                    Controller.toggle(controller)
                }
            })
        }
        else{
            Noty.show(result.text)
        }
    },()=>{
        Loading.stop()
        
        Noty.show(Lang.translate('account_profiles_empty'))
    },false,{
        headers: {
            token: account.token
        }
    })
}

function check(){
    let account = Storage.get('account','{}')

    if(account.token){
        renderStatus(Lang.translate('account_authorized'),Lang.translate('account_logged_in') + ' ' + account.email)
    }
    else{
        renderStatus(Lang.translate('account_login_failed'),Lang.translate('account_login_wait'))
    }
}

function working(){
    return Storage.get('account','{}').token && Storage.field('account_use')
}

function canSync(){
    return working() ? Storage.get('account','{}') : false
}

function get(params){
    return bookmarks.filter(elem=>elem.type == params.type).map((elem)=>{
        return elem.data
    })
}

function all(){
    return bookmarks.map((elem)=>{
        return elem.data
    })
}

function updateBookmarks(rows){
    Storage.set('account_bookmarks', rows)

    bookmarks = rows.reverse().map((elem)=>{
        elem.data = JSON.parse(elem.data)

        return elem
    })

    listener.send('update_bookmarks',{rows, bookmarks})
}

/**
 * Проверка авторизации
 */
function signin(){
    let email    = (Storage.value('account_email','') + '').trim()
    let password = (Storage.value('account_password','') + '').trim()

    if(email && password){
        network.clear()

        network.silent(api + 'users/signin',(result)=>{
            if(result.secuses){
                Storage.set('account',{
                    email: email,
                    token: result.user.token,
                    id: result.user.id,
                    profile: {
                        name: Lang.translate('account_profile_main'),
                        id: 0
                    }
                })

                Settings.update()

                update()

                getUser()
            }
            else{
                renderStatus(Lang.translate('title_error'),result.text)
            }
        },()=>{
            renderStatus(Lang.translate('title_error'),Lang.translate('network_noconnect'))
        },{
            email: email,
            password: password
        })
    }
}

function notice(call){
    let account = Storage.get('account','{}')

    if(account.token){
        if(notice_load.time + 1000*60*10 < Date.now()){
            network.timeout(1000)

            network.silent(api + 'notice/all',(result)=>{
                if(result.secuses){
                    notice_load.time = Date.now()
                    notice_load.data = result.notice

                    Storage.set('account_notice',result.notice)

                    call(result.notice)
                }
                else call([])
            },()=>{
                call([])
            },false,{
                headers: {
                    token: account.token,
                    profile: account.profile.id
                }
            })
        }
        else call(notice_load.data)
    }
    else call([])
}

function torrentViewed(data){
    network.timeout(5000)

    network.silent(api + 'torrent/viewing',false,false,data)
}

function torrentPopular(data, secuses, error){
    network.timeout(5000)

    network.silent(api + 'torrent/popular',secuses,error,data)
}

function backup(){
    let account = Storage.get('account','{}')

    if(account.token){
        Select.show({
            title: Lang.translate('settings_cub_backup'),
            items: [
                {
                    title: Lang.translate('settings_cub_backup_export'),
                    export: true,
                    selected: true
                },
                {
                    title: Lang.translate('settings_cub_backup_import'),
                    import: true
                },
                {
                    title: Lang.translate('cancel')
                }
            ],
            onSelect: (a)=>{
                if(a.export){
                    Select.show({
                        title: Lang.translate('sure'),
                        items: [
                            {
                                title: Lang.translate('confirm'),
                                export: true,
                                selected: true
                            },
                            {
                                title: Lang.translate('cancel')
                            }
                        ],
                        onSelect: (a)=>{
                            if(a.export){
                                let file = new File([JSON.stringify(localStorage)], "backup.json", {
                                    type: "text/plain",
                                })

                                var formData = new FormData($('<form></form>')[0])
                                    formData.append("file", file, "backup.json")

                                let loader = $('<div class="broadcast__scan" style="margin: 1em 0 0 0"><div></div></div>')

                                body.find('.settings--account-user-backup').append(loader)

                                $.ajax({
                                    url: api + 'users/backup/export',
                                    type: 'POST',
                                    data: formData,
                                    async: true,
                                    cache: false,
                                    contentType: false,
                                    enctype: 'multipart/form-data',
                                    processData: false,
                                    headers: {
                                        token: account.token
                                    },
                                    success: function (j) {
                                        if(j.secuses){
                                            if(j.limited) showLimitedAccount()
                                            else Noty.show(Lang.translate('account_export_secuses'))
                                        }
                                        else Noty.show(Lang.translate('account_export_fail'))

                                        loader.remove()
                                    },
                                    error: function(){
                                        Noty.show(Lang.translate('account_export_fail'))

                                        loader.remove()
                                    }
                                })
                            }

                            Controller.toggle('settings_component')
                        },
                        onBack: ()=>{
                            Controller.toggle('settings_component')
                        }
                    })
                }
                else if(a.import){
                    network.silent(api + 'users/backup/import',(data)=>{
                        
                        if(data.data){
                            let keys = Arrays.getKeys(data.data)

                            for(let i in data.data){
                                localStorage.setItem(i, data.data[i])
                            }

                            Noty.show(Lang.translate('account_import_secuses') + ' - '+Lang.translate('account_imported')+' ('+keys.length+') - ' + Lang.translate('account_reload_after'))

                            setTimeout(()=>{
                                window.location.reload()
                            },5000)
                        }
                        else Noty.show(Lang.translate('nodata'))
                    },()=>{
                        Noty.show(Lang.translate('account_import_fail'))
                    },false,{
                        headers: {
                            token: account.token
                        }
                    })

                    Controller.toggle('settings_component')
                }
                else{
                    Controller.toggle('settings_component')
                }
            },
            onBack: ()=>{
                Controller.toggle('settings_component')
            }
        })
    }
}

function subscribes(params, secuses, error){
    let account = canSync()

    if(account){
        network.silent(api + 'notifications/all',(result)=>{
            secuses({
                results: result.notifications.map(r=> Arrays.decodeJson(r.card,{}))
            })
        },error,false,{
            headers: {
                token: account.token,
                profile: account.profile.id
            }
        })
    }
    else error()
}

function showModal(template_name){
    let enabled = Controller.enabled().name

    Modal.open({
        title: '',
        html: Template.get(template_name),
        onBack: ()=>{
            Modal.close()

            Controller.toggle(enabled)
        }
    })
}

function showNoAccount(){
    showModal('account')
}

function showLimitedAccount(){
    showModal('account_limited')
}

function showCubPremium(){
    let enabled = Controller.enabled().name

    Modal.open({
        title: '',
        html: Template.get('cub_premium'),
        onBack: ()=>{
            Modal.close()

            Controller.toggle(enabled)
        }
    })

    Modal.render().addClass('modal--cub-premium').find('.modal__content').before('<div class="modal__icon"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 32 32"><path d="m2.837 20.977q-.912-5.931-1.825-11.862a.99.99 0 0 1 1.572-.942l5.686 4.264a1.358 1.358 0 0 0 1.945-.333l4.734-7.104a1.263 1.263 0 0 1 2.1 0l4.734 7.1a1.358 1.358 0 0 0 1.945.333l5.686-4.264a.99.99 0 0 1 1.572.942q-.913 5.931-1.825 11.862z" fill="#D8C39A"></svg></div>')
}

function subscribeToTranslation(params = {}, call, error){
    let account = canSync()

    if(account && params.voice){
        network.timeout(5000)

        network.silent(api + 'notifications/add',(result)=>{
            if(result.limited) showLimitedAccount()
            else if(call) call()
        },()=>{
            if(error) error()
        },{
            voice: params.voice,
            data: JSON.stringify(params.card),
            episode: params.episode,
            season: params.season
        },{
            headers: {
                token: account.token
            }
        })
    }
    else if(error) error()
}

export default {
    listener,
    init,
    working,
    canSync,
    get,
    all,
    plugins,
    notice,
    pluginsStatus,
    showProfiles,
    torrentViewed,
    torrentPopular,
    clear,
    update,
    network,
    backup,
    extensions,
    subscribeToTranslation,
    subscribes,
    showNoAccount,
    showCubPremium,
    showLimitedAccount,
    hasPremium
}