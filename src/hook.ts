const apiKey = "YOUR_API_KEY_HERE"; // Replace with your actual API key
const apiUrl = "https://aeroapi.flightaware.com/aeroapi/";

// Exit early if no API key provided
if (!apiKey) {
  console.error("API Key is required");
  throw new Error("API Key is required");
}

// const airport = "KSFO";
// const payload = { max_pages: "2" };
const authHeader = { "x-apikey": apiKey };

// Append query parameters to URL
//const queryParams = new URLSearchParams(payload).toString();
const url = `${apiUrl}flights/search/count`;

fetch(url, {
  method: "GET",
  headers: authHeader,
})
  .then((response) => {
    if (response.status === 200) {
      return response.json();
    } else {
      throw new Error("Error executing request");
    }
  })
  .then((data) => console.log(data))
  .catch((error) => console.error(error));
