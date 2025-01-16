import { encryptValue, decryptValue } from "./encryption.util";

describe("encryptValue", () => {
  const key = "testkey";
  const value = "testvalue";

  test("should return a non-empty string", () => {
    const encrypted = encryptValue(key, value);
    expect(encrypted).toBeDefined();
    expect(encrypted.length).toBeGreaterThan(0);
  });

  test("should return different encrypted values for the same input with different keys", () => {
    const key1 = "testkey1";
    const key2 = "testkey2";
    const encrypted1 = encryptValue(key1, value);
    const encrypted2 = encryptValue(key2, value);
    expect(encrypted1).not.toBe(encrypted2);
  });

  test("should return different encrypted values for different inputs with the same key", () => {
    const value1 = "testvalue1";
    const value2 = "testvalue2";
    const encrypted1 = encryptValue(key, value1);
    const encrypted2 = encryptValue(key, value2);
    expect(encrypted1).not.toBe(encrypted2);
  });

  test("should return different encrypted values for different inputs with different keys", () => {
    const key1 = "testkey1";
    const key2 = "testkey2";
    const value1 = "testvalue1";
    const value2 = "testvalue2";
    const encrypted1 = encryptValue(key1, value1);
    const encrypted2 = encryptValue(key2, value2);
    expect(encrypted1).not.toBe(encrypted2);
  });

  test("should return the same value when decrypted", () => {
    const encrypted = encryptValue(key, value);
    const decrypted = decryptValue(key, encrypted);
    expect(decrypted).toBe(value);
  });
});
