import { photoRequest, requestPhoto } from "../../server/google-photo";
import { allowProviderRequest } from "../../server/provider-rate";
import { AllowanceError } from "../../server/google-allowance";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request) {
  try {
    const photo = photoRequest(new URL(request.url).searchParams.get("token") ?? "", Date.now());
    if (!photo) return Response.json({ error: "Refresh this place to load its photo." }, { status: 400, headers });
    if (!allowProviderRequest("photos")) return Response.json({ error: "Please wait a moment before loading more photos." }, { status: 429, headers });
    const image = await requestPhoto(photo.name, photo.development);
    return new Response(new Uint8Array(image.bytes), { headers: { ...headers, "Content-Type": image.type } });
  } catch (error) { return Response.json({ error: error instanceof AllowanceError ? error.message : "Photo unavailable." },
    { status: error instanceof AllowanceError ? 503 : 502, headers }); }
}
