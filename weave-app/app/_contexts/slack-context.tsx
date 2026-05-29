"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import {
  fetchSlackStatus,
  connectSlack as connectSlackService,
  disconnectSlack as disconnectSlackService,
  updateSlackDefaultChannel as updateSlackDefaultChannelService,
  type SlackStatus,
} from "../_services/slack-service/slack-service";

type SlackContextType = {
  slackStatus: SlackStatus;
  loadingSlack: boolean;
  updatingChannel: boolean;
  loadSlackStatus: () => Promise<void>;
  connectSlack: () => void;
  disconnectSlack: () => Promise<void>;
  updateDefaultChannel: (channelId: string) => Promise<void>;
};

const SlackContext = createContext<SlackContextType | undefined>(undefined);

export const SlackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authenticated } = useAuth();
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({
    connected: false,
    default_channel_id: null,
    default_channel_name: null,
    scopes: null,
    slack_team_id: null,
    slack_team_name: null,
  });
  const [loadingSlack, setLoadingSlack] = useState(false);
  const [updatingChannel, setUpdatingChannel] = useState(false);

  const loadSlackStatus = useCallback(async () => {
    if (!authenticated) return;
    setLoadingSlack(true);
    try {
      const status = await fetchSlackStatus();
      setSlackStatus(status);
    } catch (error) {
      console.error("Erro ao carregar status do Slack:", error);
    } finally {
      setLoadingSlack(false);
    }
  }, [authenticated]);

  const connectSlack = useCallback(() => {
    connectSlackService();
  }, []);

  const disconnectSlack = useCallback(async () => {
    setLoadingSlack(true);
    try {
      await disconnectSlackService();
      setSlackStatus({
        connected: false,
        default_channel_id: null,
        default_channel_name: null,
        scopes: null,
        slack_team_id: null,
        slack_team_name: null,
      });
    } catch (error) {
      console.error("Erro ao desconectar Slack:", error);
      throw error;
    } finally {
      setLoadingSlack(false);
    }
  }, []);

  const updateDefaultChannel = useCallback(async (channelId: string) => {
    setUpdatingChannel(true);
    try {
      const res = await updateSlackDefaultChannelService(channelId);
      setSlackStatus((prev) => ({
        ...prev,
        default_channel_id: res.default_channel_id,
        default_channel_name: res.default_channel_name,
      }));
    } catch (error) {
      console.error("Erro ao atualizar canal padrão do Slack:", error);
      throw error;
    } finally {
      setUpdatingChannel(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadSlackStatus();
    } else {
      setSlackStatus({
        connected: false,
        default_channel_id: null,
        default_channel_name: null,
        scopes: null,
        slack_team_id: null,
        slack_team_name: null,
      });
    }
  }, [authenticated, loadSlackStatus]);

  return (
    <SlackContext.Provider
      value={{
        slackStatus,
        loadingSlack,
        updatingChannel,
        loadSlackStatus,
        connectSlack,
        disconnectSlack,
        updateDefaultChannel,
      }}
    >
      {children}
    </SlackContext.Provider>
  );
};

export const useSlack = () => {
  const ctx = useContext(SlackContext);
  if (!ctx) throw new Error("useSlack must be used within SlackProvider");
  return ctx;
};

export default SlackContext;
