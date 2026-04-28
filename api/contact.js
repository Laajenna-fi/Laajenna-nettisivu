function escHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Kaikki kentät ovat pakollisia.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Tarkista sähköpostiosoite.' });
  }

  const safeName    = escHtml(name);
  const safeEmail   = escHtml(email);
  const safeMessage = escHtml(message);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Change to noreply@laajenna.fi once domain is verified in Resend dashboard
        from: 'Laajenna <onboarding@resend.dev>',
        to: 'hei@laajenna.fi',
        reply_to: email,
        subject: `Uusi yhteydenotto — ${safeName}`,
        html: `
          <h2 style="font-family:sans-serif">Uusi yhteydenotto</h2>
          <p style="font-family:sans-serif"><strong>Nimi:</strong> ${safeName}</p>
          <p style="font-family:sans-serif"><strong>Sähköposti:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
          <p style="font-family:sans-serif"><strong>Viesti:</strong></p>
          <p style="font-family:sans-serif;white-space:pre-wrap">${safeMessage}</p>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Viestin lähetys epäonnistui.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: 'Palvelinvirhe.' });
  }
}
