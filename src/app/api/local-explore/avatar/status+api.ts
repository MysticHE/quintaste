import { localRoute } from "../../../../server/local-explore/http";
import { avatarStatus } from "../../../../server/avatar/handler";
export const GET = (request: Request) => localRoute(request, () => avatarStatus(request));
