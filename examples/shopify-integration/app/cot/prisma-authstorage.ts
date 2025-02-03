import type {
  AuthStorageInterface,
  CotToken,
} from "@trustedshops-public/cot-integration-library";
import db from "../db.server";

export default class PrismaAuthStorage implements AuthStorageInterface {
  async get(ctcId: string): Promise<CotToken | null> {
    const session = await db.cotAuthSession.findFirst({
      where: {
        ctcId,
      },
    });
    if (!session) return null;
    const { idToken, accessToken, refreshToken } = session;
    return {
      idToken: idToken,
      accessToken: accessToken ?? undefined,
      refreshToken: refreshToken,
    };
  }
  async set(ctcId: string, token: CotToken): Promise<void> {
    await db.cotAuthSession.upsert({
      where: { ctcId },
      update: {
        idToken: token.idToken,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
      },
      create: {
        ctcId,
        idToken: token.idToken,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
      },
    });
  }
  async remove(ctcId: string): Promise<void> {
    await db.cotAuthSession.deleteMany({
      where: {
        ctcId,
      },
    });
  }
}
