import Storage from '../utils/storage'
import Utils from '../utils/math'
import Reguest from '../utils/reguest'
import Template from './template'
import Controller from './controller'
import Modal from './modal'
import Lang from '../utils/lang'

let network = new Reguest()

function url(){
    let u = ip()

    return u ? Utils.checkHttp(u) : u
}

function ip(){
    return Storage.get(Storage.field('torrserver_use_link') == 'two' ? 'torrserver_url_two' : 'torrserver_url')
}

function my(success, fail){
    let data = JSON.stringify({
        action: 'list'
    })

    clear()

    network.silent(url()+'/torrents', (result)=>{
        if(result.length) success(result)
        else fail()
    }, fail, data)
}

function add(object, success, fail){
    let data = JSON.stringify({
        action: 'add',
        link: object.link,
        title: '[LAMPA] ' + ((object.title)+'').replace('??', '?'),
        poster: object.poster,
        data: object.data ? JSON.stringify(object.data) : '',
        save_to_db: true,
    })

    clear()

    network.silent(url()+'/torrents', success, fail, data)
}

function hash(object, success, fail){
    let data = JSON.stringify({
        action: 'add',
        link: object.link,
        title: '[LAMPA] ' + ((object.title)+'').replace('??', '?'),
        poster: object.poster,
        data: object.data ? JSON.stringify(object.data) : '',
        save_to_db: Storage.get('torrserver_savedb','false'),
    })

    clear()

    network.silent(url()+'/torrents', success, (a,c)=>{
        fail(network.errorDecode(a,c))
    }, data)
}

function files(hash, success, fail){
    let data = JSON.stringify({
        action: 'get',
        hash: hash
    })

    clear()

    network.timeout(2000)

    network.silent(url()+'/torrents',(json)=>{
        if(json.file_stats){
            success(json)
        }
    }, fail, data)
}

function connected(success, fail){
    clear()

    network.timeout(5000)

    network.silent(url()+'/settings',(json)=>{
        if(typeof json.CacheSize == 'undefined'){
            fail(Lang.translate('torrent_error_nomatrix'))
        }
        else{
            success(json)
        }
    },(a,c)=>{
        fail(network.errorDecode(a,c))
    },JSON.stringify({action: 'get'}))
}

function stream(path, hash, id){
    return url() + '/stream/'+ encodeURIComponent(path.split('\\').pop().split('/').pop()) +'?link=' + hash + '&index=' + id + '&' + (Storage.field('torrserver_preload') ? 'preload' : 'play')
}

function drop(hash, success, fail){
    let data = JSON.stringify({
        action: 'drop',
        hash: hash
    })

    clear()

    network.silent(url()+'/torrents', success, fail, data, {dataType: 'text'})
}

function remove(hash, success, fail){
    let data = JSON.stringify({
        action: 'rem',
        hash: hash
    })

    clear()

    network.silent(url()+'/torrents', success, fail, data, {dataType: 'text'})
}

function parse(file_path, movie, is_file){
    let path = file_path.toLowerCase()
    let data = {
        hash: '',
        season: 0,
        episode: 0,
        serial: movie.number_of_seasons ? true : false
    }

    let math = path.match(/s([0-9]+)\.?ep?([0-9]+)/)

    if(!math) math = path.match(/s([0-9]{2})([0-9]+)/)
    if(!math) math = path.match(/[ |\[|(]([0-9]{1,2})x([0-9]+)/)
    if(!math){
        math = path.match(/[ |\[|(]([0-9]{1,3}) of ([0-9]+)/)

        if(math)  math = [0,1,math[1]]
    } 

    if(!math){
        math = path.match(/ep?([0-9]+)/)

        if(math) math = [0,0,math[1]]
    } 

    if(is_file){
        data.hash = Utils.hash(file_path)
    }
    else if(math && movie.number_of_seasons){
        
        data.season  = parseInt(math[1])
        data.episode = parseInt(math[2])
        
        if(data.season === 0){
            math = path.match(/s([0-9]+)/)

            if(math) data.season = parseInt(math[1])
        }

        if(data.episode === 0){
            math = path.match(/ep?([0-9]+)/)

            if(math) data.episode = parseInt(math[1])
        }

        if(isNaN(data.season))  data.season  = 0
        if(isNaN(data.episode)) data.episode = 0

        if(data.season && data.episode){
            data.hash = Utils.hash([data.season, data.episode, movie.original_title].join(''))
        }
        else if(data.episode){
            data.season = 1

            data.hash = Utils.hash([data.season, data.episode, movie.original_title].join(''))
        }
        else{
            hash = Utils.hash(file_path)
        }
    } 
    else if(movie.original_title && !data.serial){
        data.hash = Utils.hash(movie.original_title)
    }
    else{
        data.hash = Utils.hash(file_path)
    }

    return data
}

function clear(){
    network.clear()
}

function error(){
    let temp = Template.get('torrent_error',{ip: ip()})
    let list = temp.find('.torrent-checklist__list > li')
    let info = temp.find('.torrent-checklist__info > div')
    let next = temp.find('.torrent-checklist__next-step')
    let prog = temp.find('.torrent-checklist__progress-bar > div')
    let comp = temp.find('.torrent-checklist__progress-steps')
    let btn  = temp.find('.selector')

    let position = -2

    function makeStep(){
        position++

        list.slice(0, position+1).addClass('wait')

        let total = list.length

        comp.text(Lang.translate('torrent_error_made') + ' ' + Math.max(0,position) + ' '+Lang.translate('torrent_error_from')+' ' + total)

        if(position > list.length){
            Modal.close()

            Controller.toggle('content')
        }
        else if(position >= 0){
            info.addClass('hide')
            info.eq(position).removeClass('hide')

            let next_step = list.eq(position+1)

            prog.css('width', Math.round(position / total * 100) + '%')

            list.slice(0, position).addClass('check')

            btn.text(position < total ? Lang.translate('torrent_error_next')  : Lang.translate('torrent_error_complite'))

            next.text(next_step.length ? '- '+next_step.text() : '')
        }
    }

    makeStep()

    btn.on('hover:enter',()=>{
        makeStep()
    })

    Modal.title(Lang.translate('torrent_error_connect'))
    Modal.update(temp)

    Controller.add('modal',{
        invisible: true,
        toggle: ()=>{
            Controller.collectionSet(temp)
            Controller.collectionFocus(false,temp)
        },
        back: ()=>{
            Modal.close()

            Controller.toggle('content')
        }
    })

    Controller.toggle('modal')
}

export default {
    ip,
    my,
    add,
    url,
    hash,
    files,
    clear,
    drop,
    stream,
    remove,
    connected,
    parse,
    error
}
