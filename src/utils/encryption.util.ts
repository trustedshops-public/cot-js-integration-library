import {createCipheriv, createDecipheriv, createHash, randomBytes} from "node:crypto";

const getHashedKey = (key: string): string => {
  return createHash("sha256")
    .update(key)
    .digest("base64")
    .substring(0, 32);
};

const encryptValue = (key: string, value: string): string => {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", getHashedKey(key), iv);
  let encrypted = cipher.update(value, "utf8", "hex");
  encrypted += cipher.final("hex");
  return Buffer.from(`${encrypted}::${iv.toString("hex")}`).toString("base64");
};

const decryptValue = (key: string, value: string): string => {
  const [encryptedData, iv] = Buffer.from(value, "base64")
    .toString()
    .split("::");
  const decipher = createDecipheriv(
    "aes-256-cbc",
    getHashedKey(key),
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

export { encryptValue, decryptValue };
