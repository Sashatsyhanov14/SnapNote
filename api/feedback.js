export default async function handler(request, response) {
    const { message } = JSON.parse(request.body);

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const adminId = process.env.ADMIN_CHAT_ID;

    if (!token || !adminId) {
        return response.status(500).json({ error: 'Server configuration error: Missing Bot Token or Admin ID' });
    }

    try {
        const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: adminId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        if (!telegramResponse.ok) {
            const errorText = await telegramResponse.text();
            return response.status(telegramResponse.status).json({ error: errorText });
        }

        return response.status(200).json({ success: true });

    } catch (error) {
        return response.status(500).json({ error: 'Error sending feedback' });
    }
}
