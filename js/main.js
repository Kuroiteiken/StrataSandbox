// Composition root: config, simulation, renderer ve uygulama katmanını bağlar.
import { APP_NAME } from './config.js';

document.title = APP_NAME;
for (const el of document.querySelectorAll('[data-app-name]')) el.textContent = APP_NAME;
