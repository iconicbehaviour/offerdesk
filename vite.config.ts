import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{outDir:'dist'},server:{host:'127.0.0.1',port:5173,proxy:{'/api':'http://127.0.0.1:3000','/mcp':'http://127.0.0.1:3000'}},preview:{host:'127.0.0.1'}});
