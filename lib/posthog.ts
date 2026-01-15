import posthog from 'posthog-js';

interface TelegramUser {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
}

export const initPostHog = () => {
    const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
    const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

    if (!posthogKey) {
        console.warn('PostHog key not found in environment variables (VITE_POSTHOG_KEY)');
        return;
    }

    posthog.init(posthogKey, {
        api_host: posthogHost,
        // person_profiles: 'identified_only', // Commented out to allow anonymous users during testing
        capture_pageview: true, // Enabled to see visits immediately
        debug: true, // Enable debug logs
    });

    // Identify user from Telegram
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user as TelegramUser | undefined;

        if (user?.id) {
            console.log('PostHog: Identifying user', user.id);
            posthog.identify(user.id.toString(), {
                telegram_id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
            });
        } else {
            console.log('PostHog: No Telegram user data found');
        }
    } else {
        console.log('PostHog: Not in Telegram WebApp');
    }
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    posthog.capture(eventName, properties);
};

export { posthog };
