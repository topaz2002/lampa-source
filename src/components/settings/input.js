import Template from '../../interaction/template'
import Keybord from '../../interaction/keyboard'
import Controller from '../../interaction/controller'
import Select from '../../interaction/select'
import Storage from '../../utils/storage'
import Arrays from '../../utils/arrays'
import Noty from '../../interaction/noty'
import Helper from '../../interaction/helper'

let html,keyboard,input

/**
 * Заустить редактор
 * @param {{title:string, value:string, free:boolean, nosave:boolean}} params 
 * @param {function} call 
 */
function edit(params, call){
    html = Template.get('settings_input')

    input = html.find('.settings-input__input')

    if(Storage.field('keyboard_type') !== 'lampa') input.hide()

    $('body').append(html)

    keyboard = new Keybord()

    keyboard.listener.follow('change',(event)=>{
        input.text(event.value.trim())
    })

    keyboard.listener.follow('enter',(event)=>{
        let val = input.text()

        back()

        call(val)
    })

    html.toggleClass('settings-input--free',params.free ? true : false)

    $('.settings-input__links', html).toggleClass('hide', params.nosave ? true : false)

    if(params.title) html.find('.settings-input__content').prepend('<div class="settings-input__title">'+params.title+'</div>')
    
    keyboard.listener.follow('down',(event)=>{
        if(params.nosave) return

        let members = Storage.get('setting_member',[])
        let links   = []

        links.push({
            title: (members.indexOf(input.text()) == -1 ? 'Добавить' : 'Удалить') + ' текущее значение',
            subtitle: input.text(),
            add: true
        })

        members.forEach(link => {
            links.push({
                title: link,
                subtitle: 'Пользовательская ссылка',
                url: link,
                member: true
            })
        })

        links = links.concat([
            {
                title: 'jac.red',
                subtitle: 'Для торрентов, Api ключ - пустой',
                url: 'jac.red'
            },
            {
                title: '127.0.0.1:8090',
                subtitle: 'Для локального TorrServer',
                url: '127.0.0.1:8090'
            }
        ])

        Select.show({
            title: 'Ссылки',
            items: links,
            onSelect: (a)=>{
                if(a.add){
                    if(members.indexOf(a.subtitle) == -1){
                        Arrays.insert(members,0,a.subtitle)

                        Noty.show('Добавлено ('+a.subtitle+')')
                    }
                    else{
                        Arrays.remove(members, a.subtitle)

                        Noty.show('Удалено ('+a.subtitle+')')
                    }

                    Storage.set('setting_member',members)
                }
                else{
                    keyboard.value(a.url)
                }

                keyboard.toggle()
            },
            onLong: (a, elem)=>{
                if(a.member){
                    Arrays.remove(members, a.url)

                    Noty.show('Удалено ('+a.url+')')

                    Storage.set('setting_member',members)

                    $(elem).css({opacity: 0.4})
                }
            },
            onBack: ()=>{
                keyboard.toggle()
            }
        })
    })

    keyboard.listener.follow('back',()=>{
        let val = input.text()

        back()

        call(val)
    })

    keyboard.create()

    keyboard.value(params.value)

    keyboard.toggle()

    Helper.show('keyboard','После ввода значения нажмите кнопку «Назад» для сохранения')
}

/**
 * Назад
 */
function back(){
    destroy()

    Controller.toggle('settings_component')
}

/**
 * Уничтожить
 */
function destroy(){
    keyboard.destroy()

    html.remove()

    html = null
    keyboard = null
    input = null
}

export default {
    edit
}