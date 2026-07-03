import mongoose from 'mongoose';
import { config } from './index';

let connected = false;

export async function connectMongo(): Promise<typeof mongoose> {
  if (connected || mongoose.connection.readyState === 1) return mongoose;

  await mongoose.connect(config.mongo.uri);

  connected = true;
  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  if (!connected && mongoose.connection.readyState === 0) return;

  await mongoose.disconnect();
  connected = false;
}