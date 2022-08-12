import Template from './template'
import Storage from '../utils/storage'

function create(params = {}){

    let html    = Template.get('scroll')
    let body    = html.find('.scroll__body')
    let content = html.find('.scroll__content')
    
    html.toggleClass('scroll--horizontal',params.horizontal ? true : false)
    html.toggleClass('scroll--mask',params.mask ? true : false)
    html.toggleClass('scroll--over',params.over ? true : false)
    html.toggleClass('scroll--nopadding',params.nopadding ? true : false)

    body.data('scroll',0)

    let scroll_time = 0,
        scroll_step = params.step || 150

    html.on('mousewheel',(e)=>{
        let parent = $(e.target).parents('.scroll')
        let inner  = onTheRightSide(e, true)

        if(!params.horizontal && html.is(parent[0])) inner = true

        if(Storage.field('navigation_type') == 'mouse' && Date.now() - scroll_time > 100 && inner){
            scroll_time = Date.now()

            if(e.originalEvent.wheelDelta / 120 > 0) {
                if(this.onWheel) this.onWheel(-scroll_step)

                this.wheel(-scroll_step)
            }
            else{
                if(this.onWheel) this.onWheel(scroll_step)

                this.wheel(scroll_step)
            }
        }
    }).on('mousemove',(e)=>{
        html.toggleClass('scroll--horizontal-scroll',Boolean(onTheRightSide(e)))
    })

    function onTheRightSide(e, inleft = false){
        let offset   = content.offset().left
        let width    = window.innerWidth - offset
        let position = e.clientX - offset

        return params.horizontal ? position > width / 2 : inleft ? position < width / 2 : false
    }

    function maxOffset(offset){
        let w = params.horizontal ? html.width() : html.height()
        let p = parseInt(content.css('padding-'+(params.horizontal ? 'left' : 'top')))
        let s = body[0][params.horizontal ? 'scrollWidth' : 'scrollHeight']
        
        offset = Math.min(0,offset)
        offset = Math.max(-((Math.max(s + p * 2,w) - w)),offset)

        return offset
    }

    this.wheel = function(size){
        html.toggleClass('scroll--wheel',true)

        let direct = params.horizontal ? 'left' : 'top'

        let scrl         = body.data('scroll'),
            scrl_offset  = html.offset()[direct],
            scrl_padding = parseInt(content.css('padding-' + direct))

        if(params.scroll_by_item){
            let pos = body.data('scroll-position')
                pos = pos || 0

            let items = $('>*',body)

            pos += size > 0 ? 1 : -1

            pos = Math.max(0,Math.min(items.length - 1, pos))

            body.data('scroll-position',pos)

            let item = items.eq(pos),
                ofst = item.offset()[direct]

            size = ofst - scrl_offset - scrl_padding
        }

        let max  = params.horizontal ? 10000 : body.height()
            max -= params.horizontal ? html.width() : html.height()
            max += scrl_padding * 2

        scrl -= size
        scrl = Math.min(0,Math.max(-max,scrl))
        scrl = maxOffset(scrl)
        

        this.reset()

        if(Storage.field('scroll_type') == 'css'){
            body.css('transform','translate3d('+(params.horizontal ? scrl : 0)+'px, '+(params.horizontal ? 0 : scrl)+'px, 0px)')
        }
        else{
            body.css('margin-left',(params.horizontal ? scrl : 0)+'px')
            body.css('margin-top',(params.horizontal ? 0 : scrl)+'px')
        }

        body.data('scroll', scrl)
    }

    this.update = function(elem, tocenter){
        if(elem.data('ismouse')) return

        html.toggleClass('scroll--wheel',false)

        let dir = params.horizontal ? 'left' : 'top',
            siz = params.horizontal ? 'width' : 'height'

        let toh = Lampa.Utils.isTouchDevice()

        let ofs_elm = elem.offset()[dir],
            ofs_box = body.offset()[dir],
            vieport = html[siz](),
            center  = ofs_box + (tocenter ? (content[siz]() / 2) - elem[siz]() / 2 : 0),
            size    = body[siz](),
            scrl    = Math.min(0,center - ofs_elm)
            scrl    = maxOffset(scrl)

            this.reset()

            if(toh){
                if(params.horizontal) html.stop().animate({ scrollLeft: -scrl }, 200)
                else html.stop().animate({ scrollTop: -scrl }, 200)
            }
            else{
                if(Storage.field('scroll_type') == 'css'){
                    body.css('transform','translate3d('+(params.horizontal ? scrl : 0)+'px, '+(params.horizontal ? 0 : scrl)+'px, 0px)')
                }
                else{
                    body.css('margin-left',(params.horizontal ? scrl : 0)+'px')
                    body.css('margin-top',(params.horizontal ? 0 : scrl)+'px')
                }
            }

            body.data('scroll', scrl)

            if(this.onScroll) this.onScroll({
                position: scrl,
                direstion: dir,
                size: size,
                vieport: vieport
            })

            if(this.onEnd && this.isEnd()) this.onEnd()
    }

    this.isEnd = function(){
        if($('body').hasClass('touch-device')){
            let scrl    = html.scrollTop(),
                size    = body[0][params.horizontal ? 'scrollWidth' : 'scrollHeight'],
                vieport = html[params.horizontal ? 'width' : 'height']()

            return size - (vieport * Math.max(1,params.end_ratio || 1)) < Math.abs(scrl) 
        }
        else{
            let scrl    = body.data('scroll'),
                size    = body[params.horizontal ? 'width' : 'height'](),
                vieport = html[params.horizontal ? 'width' : 'height']()

            return size - (vieport * Math.max(1,params.end_ratio || 1)) < Math.abs(scrl)
        }
    }

    this.append = function(object){
        body.append(object)
    }

    this.minus = function(minus){
        html.addClass('layer--wheight')
        
        html.data('mheight',minus)
    }

    this.height = function(minus){
        html.addClass('layer--height')

        html.data('mheight',minus)
    }

    this.body = function(){
        return body
    }

    this.render = function(object){
        if(object) body.append(object)

        return html
    }

    this.clear = function(){
        body.empty()
    }

    this.reset = function(){
        body.css('transform','translate3d(0px, 0px, 0px)')
        body.css('margin','0px')
        
        body.data('scroll', 0)
        //body.data('scroll-position',0)
    }

    this.destroy = function(){
        html.remove()
    }
}

export default create