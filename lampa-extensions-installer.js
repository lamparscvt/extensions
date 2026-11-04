(function () {
    'use strict';

    // Точный резервный путь к вашему файлу на GitHub Pages
    var DEFAULT_JSON_URL = 'https://github.io';

    function init() {
        // 1. Создаем пункт в настройках Lampa
        Lampa.SettingsApi.addComponent({
            component: 'my_extensions_installer',
            name: 'Мой Сборник Плагинов',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'
        });

        // 2. Исправленное автоопределение пути (ищет новое имя файла)
        var jsonUrl = DEFAULT_JSON_URL;
        
        try {
            var currentScript = document.currentScript || document.querySelector('script[src*="lampa-extensions-installer.js"]');
            if (currentScript && currentScript.src) {
                jsonUrl = currentScript.src.substring(0, currentScript.src.lastIndexOf('/')) + '/plugins.json';
            }
        } catch (e) {
            console.error('Installer:', 'Ошибка автоопределения пути, используется резервный адрес.', e);
        }

        console.log('Installer:', 'Запрос конфигурации по адресу:', jsonUrl);

        // 3. Скачиваем JSON файл с GitHub
        var request = new Lampa.Reguest();
        request.native(jsonUrl, function (pluginsToInstall) {
            
            if (!Array.isArray(pluginsToInstall)) {
                console.error('Installer:', 'Неверный формат JSON. Ожидался массив.');
                return;
            }

            // 4. Отрисовываем кнопки для установки расширений
            pluginsToInstall.forEach(function (plugin) {
                if (!plugin.url || !plugin.name) return;

                Lampa.SettingsApi.addParam({
                    component: 'my_extensions_installer',
                    param: {
                        name: 'install_' + btoa(plugin.url).replace(/[^a-zA-Z0-9]/g, ''),
                        type: 'button'
                    },
                    field: {
                        name: plugin.name,
                        description: plugin.description || plugin.url
                    },
                    onChange: function onChange() {
                        // Используем стандартный плагинный менеджер Lampa для безопасности данных
                        var currentPlugins = Lampa.Storage.get('plugins', '[]');
                        if (typeof currentPlugins === 'string') {
                            try { currentPlugins = JSON.parse(currentPlugins); } catch(e) { currentPlugins = []; }
                        }
                        
                        var exists = currentPlugins.some(function (p) {
                            return p.url === plugin.url;
                        });

                        if (!exists) {
                            currentPlugins.push({
                                url: plugin.url,
                                status: 1, // Включен
                                name: plugin.name
                            });
                            Lampa.Storage.set('plugins', currentPlugins);
                            Lampa.Noty.show('Добавлено! Полностью перезапустите Lampa (Удерживайте Назад -> Выход).');
                        } else {
                            Lampa.Noty.show('Этот плагин уже установлен.');
                        }
                    }
                });
            });

            // Обновляем окно настроек Lampa, если пользователь уже находится в этом меню
            if (Lampa.Settings.main && Lampa.Settings.main().update) {
                Lampa.Settings.main().update();
            }

        }, function (error) {
            console.error('Installer:', 'Не удалось загрузить JSON', error);
            Lampa.SettingsApi.addParam({
                component: 'my_extensions_installer',
                param: { name: 'error_log', type: 'static' },
                field: { name: 'Ошибка сети', description: 'Не удалось прочесть plugins.json по адресу: ' + jsonUrl }
            });
        });
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();
