import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import 'leaflet/dist/leaflet.css'


const app = createApp(App)

app.use(createPinia())
app.mount('#app')
