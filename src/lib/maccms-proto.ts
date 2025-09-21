
// src/lib/maccms-proto.ts
import protobuf from 'protobufjs';
import { promises as fs } from 'fs';
import path from 'path';

let protoRoot: protobuf.Root | null = null;

/**
 * Reads and parses the maccms.proto file.
 * Implements a singleton pattern to avoid re-reading the file on every call.
 * @returns A promise that resolves to the parsed protobuf.Root object.
 */
export async function getProtoRoot(): Promise<protobuf.Root> {
  if (protoRoot) {
    return protoRoot;
  }

  try {
    const protoPath = path.join(process.cwd(), 'src', 'lib', 'protos', 'maccms.proto');
    const protoDefinition = await fs.readFile(protoPath, 'utf-8');
    protoRoot = protobuf.parse(protoDefinition).root;
    return protoRoot;
  } catch (error) {
    console.error("Failed to load or parse maccms.proto:", error);
    throw new Error("Could not initialize protobuf definitions.");
  }
}
