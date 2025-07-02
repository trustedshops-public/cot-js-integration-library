import type {
  AuthStorageInterface,
  CotToken,
} from "@trustedshops-public/cot-integration-library";
import db from "../db.server";

export default class PrismaAuthStorage implements AuthStorageInterface {
  async get(sub: string): Promise<CotToken | null> {
    const session = await db.cotAuthSession.findFirst({
      where: {
        sub,
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
  async set(sub: string, token: CotToken): Promise<void> {
    await db.cotAuthSession.upsert({
      where: { sub },
      update: {
        idToken: token.idToken,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
      },
      create: {
        sub,
        idToken: token.idToken,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
      },
    });
  }
  async remove(sub: string): Promise<void> {
    await db.cotAuthSession.deleteMany({
      where: {
        sub,
      },
    });
  }
}
