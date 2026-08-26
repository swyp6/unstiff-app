import Constants from "expo-constants";
import axios from "axios";
import { Platform } from "react-native";

import { useAuthStore } from "@/store/auth-store";

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Jpd-Client-Platform": Platform.OS,
    "Jpd-App-Version": Constants.expoConfig?.version ?? "unknown",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// The server silently reissues a token when the one we sent is close to
// expiry, returned via this response header — pick it up transparently so
// the caller never has to think about refresh.
apiClient.interceptors.response.use((response) => {
  const renewedToken = response.headers["jpd-renewed-auth-token"];
  if (renewedToken) {
    useAuthStore.getState().setAccessToken(renewedToken);
  }
  return response;
});
