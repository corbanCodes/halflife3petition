exports.handler = async () => {
  try {
    const apiKey = process.env.NETLIFY_API_KEY;

    if (!apiKey) {
      // Local/dev fallback so you can test before enabling Forms/API key
      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify([
          { data: { name: "Dev Tester", story: "Testing locally without Forms.", imgur: "", video: "" } }
        ])
      };
    }

    const formsRes = await fetch(`https://api.netlify.com/api/v1/forms?access_token=${apiKey}`);
    if (!formsRes.ok) throw new Error("Failed to list forms");
    const forms = await formsRes.json();
    const form = forms.find(f => f.name === "hl3-submissions");
    if (!form) {
      return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify([]) };
    }

    const subsRes = await fetch(`https://api.netlify.com/api/v1/forms/${form.id}/submissions?access_token=${apiKey}`);
    if (!subsRes.ok) throw new Error("Failed to get submissions");
    const submissions = await subsRes.json();

    // Normalize: ensure we only expose the .data payload per submission
    const sanitized = submissions.map(s => ({ data: s.data || {} }));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify(sanitized)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
