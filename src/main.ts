import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { app } from '$lib/store/app.svelte';
import { registerServiceWorker } from '$lib/sw-client';

app.watchEnvironment();

const instance = mount(App, { target: document.getElementById('app') as HTMLElement });
registerServiceWorker();

export default instance;
