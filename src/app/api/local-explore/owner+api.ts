import { localRoute } from "../../../server/local-explore/http";
import { deleteLocalOwner } from "../../../server/local-explore/session";
export const DELETE = (request: Request) => localRoute(request, () => deleteLocalOwner(request), true);
