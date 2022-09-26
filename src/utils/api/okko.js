import Reguest from '../reguest'
import Status from '../status'
import Favorite from '../../utils/favorite'
import Lang from '../lang'

let prox      = 'http://proxy.cub.watch/img/'
let baseurl   = 'https://ctx.playfamily.ru/screenapi/v1/noauth/'
let network   = new Reguest()
let menu_list = []


function img(element, need = 'PORTRAIT', size){
    if(element.basicCovers && element.basicCovers.items.length){
        for (let index = 0; index < element.basicCovers.items.length; index++) {
            const img = element.basicCovers.items[index]
            
            if(img.imageType == need) return prox + img.url + '?width='+(size ? size : (need == 'COVER' ? 800 : 300))+'&scale=1&quality=80&mediaType=jpeg'
        }

        return prox + element.basicCovers.items[0].url + '?width=500&scale=1&quality=80&mediaType=jpeg'
    }

    return ''
}

function tocard(element){
    return {
        url: element.alias,
        id: element.id,
        title: element.name,
        original_title: element.originalName,
        release_date: '0000',
        vote_average: element.kinopoiskRating || element.okkoRating || 0,
        poster: img(element),
        cover: img(element,'COVER'),
        promo: element.promoText,
        description: element.description
    }
}

function collections(params, oncomplite, onerror){
    let frm = 20 * (params.page - 1)
    let uri = baseurl + 'collection/web/1?elementAlias='+(params.url || 'collections_web')+'&elementType=COLLECTION&limit=20&offset='+frm+'&withInnerCollections=true&includeProductsForUpsale=false&filter=%7B%22sortType%22%3A%22RANK%22%2C%22sortOrder%22%3A%22ASC%22%2C%22useSvodFilter%22%3Afalse%2C%22genres%22%3A%5B%5D%2C%22yearsRange%22%3Anull%2C%22rating%22%3Anull%7D'
        
    network.native(uri,(json)=>{
        let result = {
            results: [],
            total_pages: 0,
            page: params.page
        }

        if(json.element){
            json.element.collectionItems.items.forEach(elem => {
                let element = elem.element
                let item = {
                    url: element.alias,
                    id: element.id,
                    title: element.name,
                    poster: prox + (element.basicCovers && element.basicCovers.items.length ? element.basicCovers.items[0].url + '?width=300&scale=1&quality=80&mediaType=jpeg' : 'https://www.ivi.ru/images/stubs/collection_preview_stub.jpeg')
                }

                if(params.url)  item = tocard(element)

                result.results.push(item)
            })

            result.total_pages = Math.round(json.element.collectionItems.totalSize / 20)
        }

        oncomplite(result)
    }, onerror)
}

function persons(element){
    let data = []

    if(element.actors){
        element.actors.items.forEach(elem => {
            let item = elem.element
            
            data.push({
                url: item.alias,
                name: item.name,
                character: item.originalName
            })
        })
    }

    return data.length ? {cast: data} : false
}

function genres(element){
    return element.genres.items.map(elem => {
        elem.element.url = elem.element.alias

        return elem.element
    })
}

function countries(element){
    return element.countries.items.map(elem => {
        return elem.element
    })
}

function date(element){
    let d = new Date(element.worldReleaseDate || element || 0)
    
    return d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2)  + '-' + ('0' + d.getDate()).slice(-2)
}

function seasonsCount(element){
    let data = {
        seasons: 0,
        episodes: 0
    }

    if(element.children){
        data.seasons = element.children.totalSize

        element.children.items.forEach(elem => {
            data.episodes += elem.element.children ? elem.element.children.totalSize : 0
        })
    }

    return data
}

function seasonsDetails(element){
    let data = {}

    if(element.children){
        element.children.items.forEach((elem,sn) => {
            let episodes = []

            if(elem.element.children){
                elem.element.children.items.forEach((episode, en)=>{
                    episodes.push({
                        name: episode.element.name,
                        img: img(episode.element,'COVER'),
                        air_date: date(episode.element.releaseSaleDate || 0),
                        episode_number: en + 1
                    })
                })
            }

            data[''+(sn+1)] = {
                name: elem.element.name,
                air_date: date(elem.element.worldReleaseDate || 0),
                episodes: episodes
            }
        })

        return data
    }
}

function similar(element){
    let data = []

    element.similar.items.forEach(elem => {
        data.push(tocard(elem.element))
    })

    return data.length ? {results: data} : false
}

function seasons(tv, from, oncomplite, onerror){
    oncomplite(tv.seasons || {})
}

function menu(params, oncomplite){
    if(!menu_list.length){
        network.timeout(1000)

        network.native(baseurl + 'collection/web/1?elementAlias=action&elementType=GENRE&limit=20&offset=0&withInnerCollections=false&includeProductsForUpsale=false&filter=null',(json)=>{
            if(json.uiScreenInfo && json.uiScreenInfo.webMain){
                json.uiScreenInfo.webMain.forEach((element)=>{
                    menu_list.push({
                        title: element.name,
                        id: element.alias
                    })
                })

                oncomplite(menu_list)
            }
        })
    }
    else{
        oncomplite(menu_list)
    }
}

function videos(element){
    let data = []
    let qa   = 0

    element.trailers.items.forEach(item => {
        let media = item.media

        if(media.width > qa && media.mimeType == 'mp4/ts'){
            qa = media.width

            data.push({
                name: (data.length + 1) + ' / ' + item.language,
                url: item.url,
                player: true
            })
        }
    })

    return data.length ? {results: data} : false
}

function list(params, oncomplite, onerror){
    let frm = 20 * (params.page - 1)

    network.native(baseurl + 'collection/web/1?elementAlias='+(params.url || params.id)+'&elementType='+(params.type || 'GENRE')+'&limit=20&offset='+frm+'&withInnerCollections=false&includeProductsForUpsale=false&filter=null',(json)=>{
        let items = []

        if(json.element && json.element.collectionItems){

            json.element.collectionItems.items.forEach(elem => {
                items.push(tocard(elem.element))
            })

            oncomplite({results: items,total_pages: Math.round(json.element.collectionItems.totalSize / 20)})
        }
        else{
            onerror()
        }
        
    }, onerror)
}

function person(params, oncomplite, onerror){
    network.native(baseurl + 'collection/web/1?elementAlias='+params.url+'&elementType=PERSON&limit=60&offset=0&withInnerCollections=false&includeProductsForUpsale=false&filter=null',(json)=>{
        let data = {
            movie: {
                results: []
            }
        }

        if(json.element && json.element.collectionItems){
            json.element.collectionItems.items.forEach(elem => {
                data.movie.results.push(tocard(elem.element))
            })

            data.person = {
                name: json.element.name,
                biography: '',
                img: '',
                place_of_birth: '',
                birthday: '----'
            }

            oncomplite(data)
        }
        else{
            onerror()
        }
    }, onerror)
}

function main(params, oncomplite, onerror){
    network.native(baseurl + 'mainpage/web/1',(json)=>{
        let element  = json.element
        let fulldata = []

        if(element){
            let blocks = json.element.collectionItems.items

            if(blocks){
                blocks.forEach(el=>{
                    if(el.element && el.element.alias === "web_featured"){
                        let slides = {
                            title: Lang.translate('title_new'),
                            results:[],
                            wide: true,
                            nomore: true
                        }

                        el.element.collectionItems.items.forEach((elem)=>{
                            slides.results.push(tocard(elem.element))
                        })

                        fulldata.push(slides)
                    } 
                    else if(el.element && el.element.alias && el.element.name && el.element.description){
                        let line = {
                            title: el.element.name,
                            url: el.element.alias,
                            results: [],
                            more: true
                        }

                        if(el.element.collectionItems){
                            el.element.collectionItems.items.forEach((elem)=>{
                                line.results.push(tocard(elem.element))
                            })

                            fulldata.push(line)
                        }
                    }
                })
            }
        }

        if(fulldata.length) oncomplite(fulldata)
        else onerror()
    }, onerror)
}

function category(params, oncomplite, onerror){
    let status = new Status(7)
    let books  = Favorite.continues(params.url)

    status.onComplite = ()=>{
        let fulldata = []

        if(books.length) fulldata.push({results: books,title: params.url == 'tv' ? Lang.translate('title_continue') : Lang.translate('title_watched')})

        if(status.data.new && status.data.new.results.length)     fulldata.push(status.data.new)
        if(status.data.top && status.data.top.results.length)     fulldata.push(status.data.top)
        if(status.data.three && status.data.three.results.length) fulldata.push(status.data.three)
        if(status.data.four && status.data.four.results.length)   fulldata.push(status.data.four)
        if(status.data.five && status.data.five.results.length)   fulldata.push(status.data.five)
        if(status.data.six && status.data.six.results.length)     fulldata.push(status.data.six)
        if(status.data.seven && status.data.seven.results.length) fulldata.push(status.data.seven)

        if(fulldata.length) oncomplite(fulldata)
        else onerror()
    }
    
    let append = function(title, name, id, json){
        json.title = title
        json.url   = id

        status.append(name, json)
    }

    if(params.url == 'movie'){
        list({url: 'Novelty',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('title_new'),'new','Novelty',json)
        },status.error.bind(status))
    
        list({url: 'topfilms',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('okko_top_new'),'top','topfilms',json)
        },status.error.bind(status))

        list({url: 'comedy-plus-horror-movies',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('okko_comedy_horror'),'three','comedy-plus-horror-movies',json)
        },status.error.bind(status))

        list({url: 'collection_maniacs',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('okko_collection_maniacs'),'four','collection_maniacs',json)
        },status.error.bind(status))
        
        list({url: 'witches',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('okko_witches'),'five','witches',json)
        },status.error.bind(status))
        
        list({url: 'zombies',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('okko_zombies'),'six','zombies',json)
        },status.error.bind(status))

        list({url: 'Russian-17490',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('okko_ru'),'seven','Russian-17490',json)
        },status.error.bind(status))
    }
    else{
        list({url: 'Serials',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('title_new'),'new','Serials',json)
        },status.error.bind(status))

        list({url: 'horror-serial-all-svod',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('okko_horror_serial'),'top','horror-serial-all-svod',json)
        },status.error.bind(status))

        list({url: 'series-about-serial-killers',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('okko_serial_killers'),'three','series-about-serial-killers',json)
        },status.error.bind(status))

        list({url: 'black-humor-serial-all-svod',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('okko_humor_serial'),'four','black-humor-serial-all-svod',json)
        },status.error.bind(status))

        list({url: 'legkiye-serialy-all-svod',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('okko_legkiye_serialy'),'five','legkiye-serialy-all-svod',json)
        },status.error.bind(status))

        list({url: 'comedy-serial-all-svod',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('okko_comedy_serial'),'six','comedy-serial-all-svod',json)
        },status.error.bind(status))

        list({url: 'russian_tvseries',type: 'COLLECTION',page: 1},(json)=>{
            append(Lang.translate('okko_ru_tv'),'seven','russian_tvseries',json)
        },status.error.bind(status))

    }

}

function full(params, oncomplite, onerror){
    let data = {}

    network.native(baseurl + 'moviecard/web/1?elementAlias='+params.url+'&elementType=MOVIE',(json)=>{
        let element = json.element

        if(element){
            data.persons  = persons(element)
            data.simular = similar(element)
            data.videos  = videos(element)

            data.movie = {
                id: element.id,
                url: element.alias,
                source: 'okko',
                title: element.name,
                original_title: element.originalName,
                name: element.type == 'SERIAL' ? element.name : '',
                original_name: element.type == 'SERIAL' ? element.originalName : '',
                overview: element.description,
                img: img(element),
                runtime: (element.duration || 0) / 1000 / 60,
                genres: genres(element),
                vote_average: element.imdbRating || element.kinopoiskRating || 0,
                production_companies: [],
                production_countries: countries(element),
                budget: element.budget && element.budget.value ? element.budget.value : 0,
                release_date: date(element),
                number_of_seasons: seasonsCount(element).seasons,
                number_of_episodes: seasonsCount(element).episodes,
                seasons: seasonsDetails(element),
                first_air_date: element.type == 'SERIAL' ? date(element) : '',
                restrict: parseInt(element.ageAccessType || '0'),
                background_image: img(element,'COVER',1200)
            }
        }

        oncomplite(data)
    }, onerror)
}

export default {
    main,
    full,
    collections,
    seasons,
    list,
    person,
    menu,
    category,
    clear: network.clear
}