import Reguest from '../reguest'
import Arrays from '../arrays'
import Status from '../status'
import Favorite from '../../utils/favorite'
import Lang from '../lang'

let baseurl    = 'https://api.ivi.ru/mobileapi/'
let network    = new Reguest()
let menu_list  = []
let prox       = 'http://proxy.cub.watch/img/'

function tocard(element){
    return {
        url: element.hru,
        id: element.id,
        title: element.title,
        original_title: element.orig_title,
        release_date: element.release_date || element.ivi_pseudo_release_date || element.ivi_release_date || (element.year ? element.year + '' : element.years ? element.years[0] + '' : '0000'),
        vote_average: element.ivi_rating_10 || 0,
        poster: img(element),
        year: element.year,
        years: element.years
    }
}

function entities(url, oncomplite, onerror){
    network.native('https://www.ivi.ru/' + url,(str)=>{
        let parse = parse = str.match(/window.__INITIAL_STATE__ = (\{.*?\});<\/script>/)
        let json  = {}

        try{
            json = parse && eval('('+parse[1]+')')
        }
        catch(e){}

        if(json.entities){
            if(!menu_list.length){
                for(let i in json.entities.genres){
                    let item = json.entities.genres[i]

                    menu_list.push({
                        title: item.title + ' (' + item.catalogue_count + ')',
                        id: item.id
                    })
                }
            }

            oncomplite(json.entities, json)
        }
        else onerror()
    }, onerror, false, {dataType: 'text'})
}

function find(json, id){
    let found

    for(var i in json.content){
        if(i == id) found = json.content[i]
    }

    return found
}

function img(element){
    let posters = element.poster_originals || element.posters

    return posters && posters[0] ? prox + (posters[0].path || posters[0].url)  + '/300x456/' : ''
}

function genres(element, json){
    let data = []

    element.genres.forEach(id=>{
        let genre = json.genres[id]

        if(genre){
            data.push({
                id: genre.id,
                name: genre.title
            })
        }
    })

    return data
}

function countries(element, json){
    let data = []

    if(element.country && json.countries[element.country]){
        data.push({
            name: json.countries[element.country].title
        })
    }

    return data
}

function persons(json){
    let data = []

    if(json.persons && json.persons.info){
        for(let i in json.persons.info){
            let person = json.persons.info[i],
                images = Arrays.getValues(person.images || {})

            if(person.profession_types[0] == 6){
                data.push({
                    name: person.name,
                    character: Lang.translate('title_actor'),
                    id: person.id,
                    img: images.length ? prox + images[0].path : ''
                })
            }
        }
    }

    return data.length ? {cast: data} : false
}

function similar(element, json){
    let data = []

    if(json.content){
        for(let i in json.content){
            let item = json.content[i]

            if(element !== item) data.push(tocard(item))
        }

        data.sort((a,b) => {
            let ay = a.year || (a.years ? a.years[0] : 0)
            let by = b.year || (b.years ? b.years[0] : 0)
            
            return by - ay
        })
    }

    return data.length ? {results: data} : false
}

function videos(element){
    let data = []
    
    if(element.additional_data){
        element.additional_data.forEach(atach=>{
            if(atach.data_type == 'trailer' && atach.files){
                atach.files.forEach(file=>{
                    if(file.content_format == 'MP4-HD1080'){
                        data.push({
                            name: atach.title,
                            url: file.url,
                            player: true
                        })
                    }
                })
            }
        })
    }

    return data.length ? {results: data} : false
}

function seasonsCount(element){
    let data = {
        seasons: 0,
        episodes: 0
    }

    if(element.seasons){
        data.seasons = element.seasons.length

        for(let i in element.seasons_content_total){
            data.episodes += element.seasons_content_total[i]
        }
    }

    return data
}

function seasons(tv, from, oncomplite, onerror){
    let status = new Status(from.length)
        status.onComplite = oncomplite

    from.forEach(season => {
        network.native(baseurl + 'videofromcompilation/v5/?id='+tv.id+'&season='+season+'&from=0&to=60&fake=1&mark_as_purchased=1&app_version=870&session=66674cdb8528557407669760_1650471651-0EALRgbYRksN8Hfc5UthGeg',(json)=>{
            if(json.result){
                let episodes = []

                json.result.forEach((elem)=>{
                    episodes.push({
                        name: elem.title,
                        img: elem.promo_images && elem.promo_images.length ? prox + elem.promo_images[0].url + '/300x240/'  : '',
                        air_date: elem.release_date || elem.ivi_pseudo_release_date || elem.ivi_release_date || (elem.year ? elem.year + '' : elem.years ? elem.years[0] + '' : '0000'),
                        episode_number: elem.episode
                    })
                })

                status.append(''+season, {
                    episodes: episodes
                })
            }
            else status.error()
            
        }, status.error.bind(status))
    })
}

function comments(json){
    let data = []

    if(json.comments){
        for(let i in json.comments){
            let com = json.comments[i]

                com.text = com.text.replace(/\\[n|r|t]/g,'')

            data.push(com)
        } 
    }

    return data.length ? data : false
}

function menu(params, oncomplite){
    if(!menu_list.length){
        network.timeout(1000)

        entities('',()=>{
            oncomplite(menu_list)
        })
    }
    else oncomplite(menu_list)
}

function full(params, oncomplite, onerror){
    entities('watch/'+(params.url || params.id),(json, all)=>{
        let data = {}
        let element = find(json, params.id)

        console.log(json,all)

        if(element){
            data.persons   = persons(json)
            data.simular  = similar(element, json)
            data.videos   = videos(element)
            data.comments = comments(json)

            data.movie = {
                id: element.id,
                url: element.hru,
                source: 'ivi',
                title: element.title,
                original_title: element.orig_title,
                name: element.seasons ? element.title : '',
                original_name: element.seasons ? element.orig_title : '',
                overview: element.description.replace(/\\[n|r|t]/g,''),
                img: img(element),
                runtime: element.duration_minutes,
                genres: genres(element, json),
                vote_average: parseFloat(element.ivi_rating_10 || element.imdb_rating || element.kp_rating || '0'),
                production_companies: [],
                production_countries: countries(element, json),
                budget: element.budget || 0,
                release_date: element.release_date || element.ivi_pseudo_release_date || element.ivi_release_date || '0000',
                number_of_seasons: seasonsCount(element).seasons,
                number_of_episodes: seasonsCount(element).episodes,
                first_air_date: element.seasons ? element.release_date || element.ivi_pseudo_release_date || element.ivi_release_date || '0000' : ''
            }
        }

        oncomplite(data)
    },onerror)
}

function person(params, oncomplite, onerror){
    entities('person/'+(params.url || params.id),(json,all)=>{
        let data = {}

        if(all.pages && all.pages.personPage){
            let element = all.pages.personPage.person.info,
                images  = Arrays.getValues(element.images || {})

            data.person = {
                name: element.name,
                biography: element.bio,
                img: images.length ? prox + images[0].path : '',
                place_of_birth: element.eng_title,
                birthday: '----'
            }

            data.movie = similar(element, json)
        }

        oncomplite(data)
    },onerror)
}

function list(params, oncomplite, onerror){
    let fr = 20 * (params.page - 1),
        to = fr + 19

    let url = baseurl + 'catalogue/v5/?genre='+params.genres+'&from='+fr+'&to='+to+'&withpreorderable=true'

    if(!params.genres) url = baseurl + 'collection/catalog/v5/?id='+params.url+'&withpreorderable=true&fake=false&from='+fr+'&to='+to+'&sort=priority_in_collection&fields=id%2Civi_pseudo_release_date%2Crelease_date%2Corig_title%2Ctitle%2Cfake%2Cpreorderable%2Cavailable_in_countries%2Chru%2Cposter_originals%2Crating%2Ccontent_paid_types%2Ccompilation_hru%2Ckind%2Cadditional_data%2Crestrict%2Chd_available%2Chd_available_all%2C3d_available%2C3d_available_all%2Cuhd_available%2Cuhd_available_all%2Chdr10_available%2Chdr10_available_all%2Cdv_available%2Cdv_available_all%2Cfullhd_available%2Cfullhd_available_all%2Chdr10plus_available%2Chdr10plus_available_all%2Chas_5_1%2Cshields%2Cseasons_count%2Cseasons_content_total%2Cseasons%2Cepisodes%2Cseasons_description%2Civi_rating_10_count%2Cseasons_extra_info%2Ccount%2Cgenres%2Cyears%2Civi_rating_10%2Crating%2Ccountry%2Cduration_minutes%2Cyear&app_version=870'

    network.native(url,(json)=>{
        let items = []

        if(json.result){
            json.result.forEach(element => {
                items.push(tocard(element))
            })
        }

        oncomplite({results: items,total_pages: Math.round(json.count / 20)})
    }, onerror)
}

function category(params, oncomplite, onerror){
    let status = new Status(params.url == 'movie' ? 4 : 5)
    let books  = Favorite.continues(params.url)

    status.onComplite = ()=>{
        let fulldata = []

        if(books.length) fulldata.push({results: books,title: params.url == 'tv' ? Lang.translate('title_continue') : Lang.translate('title_watched')})

        if(status.data.new && status.data.new.results.length)           fulldata.push(status.data.new)
        if(status.data.best && status.data.best.results.length)         fulldata.push(status.data.best)
        if(status.data.rus && status.data.rus.results.length)           fulldata.push(status.data.rus)
        if(status.data.popular && status.data.popular.results.length)   fulldata.push(status.data.popular)
        if(status.data.ivi && status.data.ivi.results.length)           fulldata.push(status.data.ivi)

        if(fulldata.length) oncomplite(fulldata)
        else onerror()
    }
    
    let append = function(title, name, id, json){
        json.title = title
        json.url    = id

        if(json.results.results){
            json.results = json.results.results
        }

        status.append(name, json)
    }

    if(params.url == 'movie'){
        collections({id:'8258'},(json)=>{
            append(Lang.translate('ivi_premieres'), 'new', '8258', {results:json})
        },status.error.bind(status))

        collections({id:'942'},(json)=>{
            append(Lang.translate('ivi_best'), 'best', '942', {results:json})
        },status.error.bind(status))
        
        collections({id:'11512'},(json)=>{
            append(Lang.translate('ivi_popular'), 'popular', '11512', {results:json})
        },status.error.bind(status))

        collections({id:'8448'},(json)=>{
            append(Lang.translate('ivi_choice'), 'ivi', '8448', {results:json})
        },status.error.bind(status))
    }
    else{
        collections({id:'1984'},(json)=>{
            append(Lang.translate('ivi_new'), 'new', '1984', {results:json})
        },status.error.bind(status))

        collections({id:'1712'},(json)=>{
            append(Lang.translate('ivi_foreign'), 'best', '1712', {results:json})
        },status.error.bind(status))

        collections({id:'935'},(json)=>{
            append(Lang.translate('ivi_ru'), 'rus', '935', {results:json})
        },status.error.bind(status))

        collections({id:'12839'},(json)=>{
            append(Lang.translate('ivi_popular'), 'popular', '12839', {results:json})
        },status.error.bind(status))

        collections({id:'1057'},(json)=>{
            append(Lang.translate('ivi_choice'), 'ivi', '1057', {results:json})
        },status.error.bind(status))
    }
}

function main(params, oncomplite, onerror){
    let status = new Status(13)

    status.onComplite = ()=>{
        let fulldata = []

        for(let i = 1; i <= 13; i++){
            let n = i + ''

            if(status.data[n] && status.data[n].results.length) fulldata.push(status.data[n])
        }

        console.log(fulldata, status)

        if(fulldata.length) oncomplite(fulldata)
        else onerror()
    }
    
    let append = function(title, name, id, json){
        json.title = title
        json.url    = id
        
        if(json.results.results){
            json.results = json.results.results
        }

        status.append(name, json)
    }

    collections({id:'4655'},(json)=>{
        append(Lang.translate('ivi_recomend'), '1', '4655', {results:json})
    },status.error.bind(status))

    collections({id:'2460'},(json)=>{
        append(Lang.translate('ivi_for_famaly'), '2', '2460', {results:json})
    },status.error.bind(status))
    
    collections({id:'917'},(json)=>{
        append(Lang.translate('ivi_triller'), '3', '917', {results:json})
    },status.error.bind(status))

    collections({id:'1327'},(json)=>{
        append(Lang.translate('ivi_advance'), '4', '1327', {results:json})
    },status.error.bind(status))

    collections({id:'1246'},(json)=>{
        append(Lang.translate('ivi_detective'), '5', '1246', {results:json})
    },status.error.bind(status))

    collections({id:'1335'},(json)=>{
        append(Lang.translate('ivi_crime_comedy'), '6', '1335', {results:json})
    },status.error.bind(status))

    collections({id:'1411'},(json)=>{
        append(Lang.translate('ivi_romantic'), '7', '1411', {results:json})
    },status.error.bind(status))

    collections({id:'73'},(json)=>{
        append(Lang.translate('ivi_crime_dramas'), '8', '73', {results:json})
    },status.error.bind(status))

    collections({id:'1413'},(json)=>{
        append(Lang.translate('ivi_fantastic_dramas'), '9', '1413', {results:json})
    },status.error.bind(status))

    collections({id:'62'},(json)=>{
        append(Lang.translate('ivi_military_dramas'), '10', '62', {results:json})
    },status.error.bind(status))

    collections({id:'1418'},(json)=>{
        append(Lang.translate('ivi_mistic'), '11', '1418', {results:json})
    },status.error.bind(status))

    collections({id:'4495'},(json)=>{
        append(Lang.translate('ivi_foreign_series'), '12', '4495', {results:json})
    },status.error.bind(status))
    
    collections({id:'217'},(json)=>{
        append(Lang.translate('ivi_historical_series'), '13', '217', {results:json})
    },status.error.bind(status))
}


function collections(params, oncomplite, onerror){
    let fr = 20 * (params.page - 1),
        to   = fr + 19

    let uri = baseurl + 'collections/v5/?app_version=870&from='+fr+'&tags_exclude=goodmovies&to='+to

    if(params.id) uri = baseurl + 'collection/catalog/v5/?id='+params.id+'&withpreorderable=true&fake=false&from='+fr+'&to='+to+'&sort=priority_in_collection&fields=id%2Civi_pseudo_release_date%2Crelease_date%2Corig_title%2Ctitle%2Cfake%2Cpreorderable%2Cavailable_in_countries%2Chru%2Cposter_originals%2Crating%2Ccontent_paid_types%2Ccompilation_hru%2Ckind%2Cadditional_data%2Crestrict%2Chd_available%2Chd_available_all%2C3d_available%2C3d_available_all%2Cuhd_available%2Cuhd_available_all%2Chdr10_available%2Chdr10_available_all%2Cdv_available%2Cdv_available_all%2Cfullhd_available%2Cfullhd_available_all%2Chdr10plus_available%2Chdr10plus_available_all%2Chas_5_1%2Cshields%2Cseasons_count%2Cseasons_content_total%2Cseasons%2Cepisodes%2Cseasons_description%2Civi_rating_10_count%2Cseasons_extra_info%2Ccount%2Cgenres%2Cyears%2Civi_rating_10%2Crating%2Ccountry%2Cduration_minutes%2Cyear&app_version=870'

    network.timeout(15000)

    network.native(uri,(json)=>{
        let result = {
            results: [],
            total_pages: 0,
            page: params.page
        }

        if(json.result){
            json.result.forEach(element => {
                let item = {
                    id: element.id,
                    url: element.hru,
                    title: element.title,
                    poster: prox + (element.images && element.images.length ? element.images[0].path : 'https://www.ivi.ru/images/stubs/collection_preview_stub.jpeg')
                }

                if(params.id) item = tocard(element)

                result.results.push(item)
            })

            result.total_pages = Math.round(json.count / 20)
        }

        oncomplite(result)
    }, onerror)
}

export default {
    collections,
    full,
    main,
    person,
    list,
    category,
    menu,
    seasons,
    clear: network.clear
}