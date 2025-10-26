// src/services/pubsub.ts
import { EventEmitter } from "events";

export type PubSubEvents = {
  metric: any; // metric object saved (lean/plain object)
  alert: any; // alert object saved
};

class TypedEmitter extends EventEmitter {
  emit<K extends keyof PubSubEvents>(evt: K, payload: PubSubEvents[K]) {
    return super.emit(evt as string, payload);
  }
  on<K extends keyof PubSubEvents>(
    evt: K,
    listener: (payload: PubSubEvents[K]) => void
  ) {
    return super.on(evt as string, listener);
  }
  off<K extends keyof PubSubEvents>(
    evt: K,
    listener: (payload: PubSubEvents[K]) => void
  ) {
    return super.off(evt as string, listener);
  }
}

export const pubsub = new TypedEmitter();
export default pubsub;
