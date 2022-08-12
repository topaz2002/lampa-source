let html = `<div>
    <div class="settings-folder selector" data-component="account">
        <div class="settings-folder__icon">
            <svg height="169" viewBox="0 0 172 169" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="85.765" cy="47.5683" r="15.5683" stroke="white" stroke-width="12"/>
                <path d="M121.53 112C121.53 92.2474 105.518 76.2349 85.7651 76.2349C66.0126 76.2349 50 92.2474 50 112" stroke="white" stroke-width="12"/>
                <rect x="44" y="125" width="84" height="16" rx="8" fill="white"/>
                <rect x="6" y="6" width="160" height="157" rx="21" stroke="white" stroke-width="12"/>
            </svg>
        </div>
        <div class="settings-folder__name">#{settings_main_account}</div>
    </div>
    <div class="settings-folder selector" data-component="interface">
        <div class="settings-folder__icon">
            <img src="./img/icons/settings/panel.svg" />
        </div>
        <div class="settings-folder__name">#{settings_main_interface}</div>
    </div>
    <div class="settings-folder selector" data-component="player">
        <div class="settings-folder__icon">
            <img src="./img/icons/settings/player.svg" />
        </div>
        <div class="settings-folder__name">#{settings_main_player}</div>
    </div>
    <div class="settings-folder selector" data-component="parser">
        <div class="settings-folder__icon">
            <img src="./img/icons/settings/parser.svg" />
        </div>
        <div class="settings-folder__name">#{settings_main_parser}</div>
    </div>
    <div class="settings-folder selector" data-component="server">
        <div class="settings-folder__icon">
            <img src="./img/icons/settings/server.svg" />
        </div>
        <div class="settings-folder__name">#{settings_main_torrserver}</div>
    </div>
    <div class="settings-folder selector" data-component="plugins" data-static="true">
        <div class="settings-folder__icon">
            <svg height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="21" height="21" rx="2" fill="white"/>
            <mask id="path-2-inside-1_154:24" fill="white">
            <rect x="2" y="27" width="17" height="17" rx="2"/>
            </mask>
            <rect x="2" y="27" width="17" height="17" rx="2" stroke="white" stroke-width="6" mask="url(#path-2-inside-1_154:24)"/>
            <rect x="27" y="2" width="17" height="17" rx="2" fill="white"/>
            <rect x="27" y="34" width="17" height="3" fill="white"/>
            <rect x="34" y="44" width="17" height="3" transform="rotate(-90 34 44)" fill="white"/>
            </svg>
        </div>
        <div class="settings-folder__name">#{settings_main_plugins}</div>
    </div>
    <div class="settings-folder selector" data-component="more">
        <div class="settings-folder__icon">
            <img src="./img/icons/settings/more.svg" />
        </div>
        <div class="settings-folder__name">#{settings_main_rest}</div>
    </div>
    
</div>`

export default html