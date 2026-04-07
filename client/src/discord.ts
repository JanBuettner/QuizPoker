import { DiscordSDK } from '@discord/embedded-app-sdk';

const DISCORD_CLIENT_ID = '1491207085646413984';

export let discordSdk: DiscordSDK | null = null;
export let isDiscordEmbed = false;

// Detect if running inside Discord iframe
try {
  if (window.parent !== window && new URLSearchParams(window.location.search).has('frame_id')) {
    isDiscordEmbed = true;
  }
} catch {
  // cross-origin frame access blocked = we're in an iframe
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

    // Authorize with Discord
    const { code } = await discordSdk.commands.authorize({
      client_id: DISCORD_CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify'],
    });

    // Exchange code for token via our server
    const response = await fetch('/api/discord/token', {
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

    // Get user info
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResponse.ok) return null;

    const user = await userResponse.json();
    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
      globalName: user.global_name || null,
    };
  } catch (err) {
    console.error('Discord SDK init failed:', err);
    return null;
  }
}
