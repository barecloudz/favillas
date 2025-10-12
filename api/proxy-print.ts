import type { Handler, HandlerEvent } from "@netlify/functions";

export const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { printerServerUrl, receipt } = JSON.parse(event.body || "{}");

    if (!printerServerUrl || !receipt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing printerServerUrl or receipt data" }),
      };
    }

    console.log(`🖨️ Proxying print request to: ${printerServerUrl}`);

    // Forward the request to the printer server
    const response = await fetch(`${printerServerUrl}/print`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ receipt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Printer server error: ${errorText}`);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Printer server error",
          details: errorText
        }),
      };
    }

    const result = await response.json();
    console.log(`✅ Print successful`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error(`❌ Proxy print error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to proxy print request",
        message: error.message
      }),
    };
  }
};
