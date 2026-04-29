import axios from "axios";

export const apiClient = axios.create({
  baseURL: "",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || "An error occurred";
    console.error("[API Error]", message);
    return Promise.reject(error);
  }
);
