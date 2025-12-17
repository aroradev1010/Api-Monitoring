// backend/src/services/testStream.ts
import { Request, Response } from "express";

type TestEvent = { type: string; payload: any };

let clients: Response[] = [];

export function registerTestClient(req: Request, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // send a comment to establish connection in some proxies
  res.write(":ok\n\n");

  clients.push(res);

  req.on("close", () => {
    clients = clients.filter((c) => c !== res);
  });
}

export function publishTestEvent(event: TestEvent) {
  const data = JSON.stringify(event.payload ?? {});
  clients.forEach((res) => {
    try {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${data}\n\n`);
    } catch (err) {
      // ignore
    }
  });
}
