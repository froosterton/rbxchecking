exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { title, description, color } = JSON.parse(event.body);
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Webhook URL not configured' }) };
    }
    
    const embed = {
      embeds: [{
        title: title,
        description: description,
        color: color,
        footer: { text: `Logger System • ${new Date().toLocaleString()}` }
      }]
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};