import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiUrl = "https://aeroapi.flightaware.com/aeroapi/flights/search/count";
  const apiKey = "VoLm55mkAHC8IhNaFLLmaGDjeG1HOkXt";

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "x-apikey": apiKey,
      },
    });

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    console.error("Error in proxy:", error);
    res.status(500).send("Internal Server Error");
  }
}
