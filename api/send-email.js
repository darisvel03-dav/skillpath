export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { to, userName, pathGoal, videoCount } = req.body;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'LevelingPath <hello@levelingpath.com>',
        to: [to],
        subject: `🏆 You just completed "${pathGoal}"!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0;padding:0;background:#f8f9fa;font-family:Inter,-apple-system,sans-serif;">
            <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              
              <!-- Top bar -->
              <div style="height:4px;background:linear-gradient(90deg,#2563eb,#7c3aed);"></div>
              
              <!-- Header -->
              <div style="padding:40px 40px 0;text-align:center;">
                <div style="display:inline-block;width:64px;height:64px;background:#fef9c3;border:2px solid #fbbf24;border-radius:50%;font-size:32px;line-height:64px;text-align:center;">🏆</div>
                <p style="font-size:12px;font-weight:700;letter-spacing:2px;color:#7c3aed;margin:16px 0 8px;">SKILL COMPLETED</p>
                <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;line-height:1.3;">${pathGoal}</h1>
                <p style="font-size:15px;color:#6b7280;margin:0;">Completed by <strong style="color:#0f172a;">${userName}</strong></p>
              </div>

              <!-- Divider -->
              <div style="height:1px;background:#f1f5f9;margin:28px 40px;"></div>

              <!-- Stats -->
              <div style="padding:0 40px;display:flex;justify-content:center;gap:40px;text-align:center;">
                <div>
                  <p style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 4px;">${videoCount}</p>
                  <p style="font-size:12px;color:#9ca3af;margin:0;">Videos watched</p>
                </div>
                <div>
                  <p style="font-size:20px;font-weight:800;color:#059669;margin:0 0 4px;">100%</p>
                  <p style="font-size:12px;color:#9ca3af;margin:0;">Completed</p>
                </div>
              </div>

              <!-- CTA -->
              <div style="padding:32px 40px;text-align:center;">
                <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
                  Amazing work! You've mastered this skill. Ready to keep leveling up?
                </p>
                <a href="https://levelingpath.com" style="display:inline-block;padding:13px 32px;background:#2563eb;color:white;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;">
                  Build your next path →
                </a>
              </div>

              <!-- Footer -->
              <div style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
                <p style="font-size:12px;color:#9ca3af;margin:0;">
                  <strong style="color:#0f172a;">LevelingPath</strong> · levelingpath.com · Free forever
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to send email');
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}