exports.handler = async (event) => {
  try {
    const apiKey = process.env.NETLIFY_API_KEY;
    const siteId = process.env.SITE_ID; // Optional: scope forms to one site

    if (!apiKey) {
      return {
        statusCode: 401,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
        body: JSON.stringify({
          error: "Missing NETLIFY_API_KEY env var",
          hint: "Add NETLIFY_API_KEY in Site settings → Environment variables and redeploy."
        })
      };
    }

    const params = event?.queryStringParameters || {};
    const targetFormName = (params.form || "hl3-submissions").toString();
    const limit = Math.min(parseInt(params.limit || params.per_page || "100", 10), 100) || 100;
    const page = Math.max(parseInt(params.page || "1", 10), 1);

    // Build forms list URL; optionally scope to specific site
    const base = siteId
      ? `https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}/forms`
      : `https://api.netlify.com/api/v1/forms`;

    const formsRes = await fetch(`${base}?access_token=${apiKey}`);
    if (!formsRes.ok) {
      const txt = await formsRes.text();
      throw new Error(`Failed to list forms: ${formsRes.status} ${txt}`);
    }
    const forms = await formsRes.json();
    const form = forms.find(f => f.name === targetFormName);

    if (!form) {
      return {
        statusCode: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
        body: JSON.stringify([])
      };
    }

    const subsUrl = `https://api.netlify.com/api/v1/forms/${form.id}/submissions?access_token=${apiKey}&per_page=${limit}&page=${page}`;
    const subsRes = await fetch(subsUrl);
    if (!subsRes.ok) {
      const txt = await subsRes.text();
      throw new Error(`Failed to get submissions: ${subsRes.status} ${txt}`);
    }
    const submissions = await subsRes.json();

    const sanitized = submissions.map(s => ({ data: s.data || {} }));

    // Netlify includes pagination via Link headers. We can forward minimal hints.
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
        "x-page": String(page),
        "x-per-page": String(limit)
      },
      body: JSON.stringify(sanitized)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
