import { localRoute } from "../../../../server/local-explore/http";
import { createAvatar, readAvatarJob } from "../../../../server/avatar/handler";
export const POST = (request: Request) => localRoute(request, () => createAvatar(request));
export const GET = (request: Request) => localRoute(request, () => readAvatarJob(request));
export const DELETE = (request: Request) => localRoute(request, () => readAvatarJob(request, true));
