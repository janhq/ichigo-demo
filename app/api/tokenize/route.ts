import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Fetch the form data directly from the incoming request

    const formData = await req.formData();

    // Set up the fetch request to forward the file to the external API

    const response = await fetch(process.env.TOKENIZE_BASE_URL + "/tokenize/wav", {
      method: "POST",
      body: formData, // Forward the formData body directly
    });

    // Check if the external API responded with a success status
    if (!response.ok) {
      // You can log the response body here to debug
      return new NextResponse("Failed to communicate with external API", {
        status: response.status,
      });
    }

    // Parse the response from the external API
    const data = await response.json();

    // Return the tokens data back to the client
    return NextResponse.json(data);
  } catch (error) {
    return new NextResponse("Failed to handle the request", { status: 500 });
  }
}
