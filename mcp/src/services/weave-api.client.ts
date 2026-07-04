import axios from "axios";
import { env } from "../config/env";

export const weaveApiClient = axios.create({
  baseURL: env.WEAVE_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.INTERNAL_API_TOKEN}`,
  },
});

// Response interceptor to handle and log API errors gracefully to stderr
weaveApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
    };
    
    // Log to stderr to avoid disrupting standard stdio JSON-RPC protocol
    console.error("API Request Failed:", JSON.stringify(errorDetails, null, 2));
    
    return Promise.reject(error);
  }
);
