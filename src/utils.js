export async function req(url, { method = "GET", headers = {}, body = null } = {}) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  };

  if (body && method !== "GET") options.body = JSON.stringify(body);
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    return contentType && contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch (error) {
    console.error("API Request Failed:", error);
    return null;
  }
}
