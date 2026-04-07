import { DiscordSDK } from '@discord/embedded-app-sdk';

const DISCORD_CLIENT_ID = '1491207085646413984';

export let discordSdk: DiscordSDK | null = null;
export let isDiscordEmbed = false;

// Detect if running inside Discord iframe
try {
  if (window.parent !== window) {
    const params = new URLSearchParams(window.location.search);
    if (params.has('frame_id') || params.has('instance_id') || params.has('platform')) {
      isDiscordEmbed = true;
    }
  }
} catch {
  isDiscordEmbed = true;
}

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  globalName: string | null;
}

export async function initDiscord(): Promise<DiscordUser | null> {
  if (!isDiscordEmbed) return null;

  try {
    discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
    await discordSdk.ready();

    // Authorize
    const { code } = await discordSdk.commands.authorize({
      client_id: DISCORD_CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify'],
    });

    // Exchange code for token via our server
    // Inside Discord, requests to /.proxy/ go through Discord's proxy to our server
    const tokenUrl = '/.proxy/api/discord/token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      console.error('Discord token exchange failed');
      return null;
    }

    const { access_token } = await response.json();

    // Authenticate with Discord SDK
    await discordSdk.commands.authenticate({ access_token });

    // Get user info via Discord proxy (can't call discord.com directly from iframe)
    const userResponse = await fetch('/.proxy/api/discord/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResponse.ok) return null;

    const user = await userResponse.json();
    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      globalName: user.globalName,
    };
  } catch (err) {
    console.error('Discord SDK init failed:', err);
    return null;
  }
}
