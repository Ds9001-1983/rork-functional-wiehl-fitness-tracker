import { publicProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default publicProcedure
  .query(() => {
    const clients = storage.clients.getAll();
    console.log('[Server] Fetching clients:', clients.length);
    clients.forEach(client => {
      console.log(`[Server] Client: ${client.email} - Password: ${client.starterPassword}`);
    });
    return clients;
  });