import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import 'leaflet/dist/leaflet.css'


createApp(App)
    .use(createPinia())
    .mount('#app')
