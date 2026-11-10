import axios from "axios";
import { apiBaseUrl } from '../lib/apiBaseUrl';

const api = axios.create({
    baseURL: apiBaseUrl(import.meta.env.VITE_API_URL, import.meta.env.DEV),
    withCredentials: true
});

export default api;
